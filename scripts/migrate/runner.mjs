import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { acquireMigrationMutex } from '../companion-backup.mjs';
import { createOfflineBackup, verifyOfflineBackup } from '../lib/offline-backup.mjs';
import { loadInstallation, manifestVersion, assertOffline } from './context.mjs';
import { acquireLock, appendJournal, hash, regular } from './io.mjs';
import { checked, MigrationError, requireMigration } from './errors.mjs';
import { contractFor, journalBinding, settled, validateJournal } from './journal.mjs';
import manifestStep, { writeManifest } from './steps/0001-storage-manifest.mjs';

export const steps = [manifestStep];

function verifySaved(context, header) {
  checked('backup-invalid', () => {
    const file = resolve(header.backup, 'manifest.json'); regular(file);
    assert.equal(hash(readFileSync(file)), header.backupHash, 'Backup manifest changed; restore a verified pre-migration backup');
    verifyOfflineBackup(header.backup, context.plan);
  });
}

function targetComplete(step, context) {
  const complete = step.complete(context);
  assert.equal(typeof complete, 'boolean', 'Step completion must synchronously observe its persisted target');
  return complete;
}

export function migrationStatus(installation, selected = steps, { plan = false } = {}) {
  const context = loadInstallation(installation), journal = validateJournal(context);
  const contract = contractFor(selected), previous = journal.last;
  const reported = !plan && previous ? previous.header.steps : contract;
  const version = manifestVersion(context, reported);
  const result = {steps:reported.map((step, index) => {
    const event = previous?.states.get(step.id);
    if (!isDeepStrictEqual(step, contract[index])) return { id:step.id, state:'unverified' };
    const complete = version > index && targetComplete(selected[index], context);
    const recordedComplete = index < journal.settledStepCount || ['done','skip'].includes(event);
    const state = complete ? 'complete' : recordedComplete ? 'inconsistent' : event ?? 'pending';
    return { id:step.id, state };
  }), truncated:journal.truncated};
  if (plan) return result;
  const segment = previous ? settled(previous) ? 'settled' : 'unfinished' : 'none';
  return {...result, segment};
}

function checkAdmission(context, journal, selected, contract, { resume, backup }) {
  const previous = journal.last;
  if (resume) {
    requireMigration(previous, 'resume-journal-missing');
    requireMigration(isDeepStrictEqual(previous.header.steps, contract), 'journal-step-mismatch');
    const version = manifestVersion(context, contract);
    assertPreviousTargets(context, selected, journal.settledStepCount, version);
    if (!settled(previous)) {
      const binding = previous.header.binding;
      if (binding) requireMigration(binding.repoHash === journalBinding(context).repoHash, 'binding-changed');
      verifySaved(context, previous.header);
    }
  } else {
    requireMigration(!journal.truncated, 'journal-invalid');
    const version = manifestVersion(context, contract);
    if (previous) {
      requireMigration(settled(previous), 'journal-exists');
      const prior = previous.header.steps;
      requireMigration(isDeepStrictEqual(prior, contract.slice(0, prior.length)), 'journal-step-mismatch');
      assertPreviousTargets(context, selected, prior.length, version);
      requireMigration(contract.length > prior.length, 'journal-exists');
    }
    requireMigration(backup, 'usage');
  }
}

function assertPreviousTargets(context, selected, count, version) {
  requireMigration(version >= count && selected.slice(0, count).every(step => targetComplete(step, context)), 'migration-inconsistent');
}

function acquireMutex(repo) {
  try { return acquireMigrationMutex(repo); }
  catch (error) { if (['lock-invalid','lock-held'].includes(error.code)) throw new MigrationError(error.code); throw error; }
}

/** Complete observes the actual target. Apply makes it durable before its manifest advances. */
export async function runMigration(options, selected = steps) {
  const { installation, resume = false } = options, contract = contractFor(selected);
  let context = loadInstallation(installation);
  assertOffline(context);
  const repo = context.plan.repo, release = acquireMutex(repo);
  try {
    context = loadInstallation(installation);
    requireMigration(context.plan.repo === repo, 'binding-changed');
    assertOffline(context);
    const journal = validateJournal(context);
    checkAdmission(context, journal, selected, contract, options);
    const lease = acquireLock(context.lockFile);
    try {
      let header = journal.last?.header;
      if (!resume) {
        const backup = resolve(options.backup);
        checked('backup-invalid', () => {
          createOfflineBackup(context.plan, backup);
          verifyOfflineBackup(backup, context.plan);
        });
        header = {event:'migration', schema:2, id:randomUUID(), steps:contract, binding:journalBinding(context),
          backup, backupHash:hash(readFileSync(resolve(backup, 'manifest.json')))};
        appendJournal(context.journalFile, header);
      }
      const record = row => appendJournal(context.journalFile, {migrationId:header.id, ...row});
      if (journal.truncated) record({event:'journal-repaired'});
      if (lease.stale) record({event:'lock-takeover'});
      const alreadySettled = resume && journal.settledStepCount === selected.length;
      for (const [index, step] of (alreadySettled ? [] : selected).entries()) {
        try {
          const complete = index < journal.settledStepCount || targetComplete(step, context);
          if (!complete) {
            record({event:'start', step:step.id});
            await step.apply(context);
            assert.ok(targetComplete(step, context), 'Step target is incomplete');
          }
          const version = manifestVersion(context, contract);
          if (version <= index) {
            assert.equal(version, index, 'Migration must advance its manifest one step at a time');
            writeManifest(context, step.to);
          }
          record({event:complete ? 'skip' : 'done', step:step.id});
        } catch (error) { record({event:'failed', step:step.id}); throw error; }
      }
      return {steps:selected.map(step => ({id:step.id, state:'complete'}))};
    } finally { lease.release(); }
  } finally { release(); }
}
