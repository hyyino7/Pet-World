import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createOfflineBackup, verifyOfflineBackup } from '../lib/offline-backup.mjs';
import { loadInstallation, manifestComplete, assertOffline } from './context.mjs';
import { acquireLock, appendJournal, hash, readJournal, regular } from './io.mjs';
import { checked, requireMigration } from './errors.mjs';
import manifestStep from './steps/0001-storage-manifest.mjs';

export const steps = [manifestStep];
function validateJournal(context) {
  return checked('journal-invalid', () => {
    const journal = readJournal(context.journalFile), header = journal.rows[0];
    if (!journal.rows.length) return journal;
    assert.ok(header && header.event === 'migration' && typeof header.id === 'string' && typeof header.backup === 'string'
      && /^[a-f0-9]{64}$/.test(header.manifestHash), 'Invalid migration header');
    for (const row of journal.rows.slice(1)) {
      assert.equal(row.migrationId, header.id, 'Mixed migration journal');
      assert.ok(['start','skip','done','failed','lock-takeover','journal-repaired'].includes(row.event), 'Invalid journal event');
      if (['start','skip','done','failed'].includes(row.event)) assert.equal(typeof row.step, 'string');
    }
    return journal;
  });
}
function verifySaved(context, header) {
  requireMigration(header, 'resume-journal-missing');
  checked('backup-invalid', () => {
    const file = resolve(header.backup, 'manifest.json'); regular(file);
    assert.equal(hash(readFileSync(file)), header.manifestHash, 'Backup manifest changed; restore a verified pre-migration backup');
    verifyOfflineBackup(header.backup, context.plan);
  });
}
export function migrationStatus(installation, selected = steps) {
  const context = loadInstallation(installation), journal = validateJournal(context);
  const complete = manifestComplete(context);
  return {steps:selected.map(step => ({id:step.id, state:step.id === manifestStep.id ? complete ? 'complete' : 'pending'
    : journal.rows.filter(row => row.step === step.id).at(-1)?.event ?? 'pending'})), truncated:journal.truncated};
}

/** Steps are the migration contract: complete observes the actual target, apply establishes it. */
export async function runMigration({installation, backup, resume = false}, selected = steps) {
  let context = loadInstallation(installation);
  manifestComplete(context); // Refuse incompatible metadata before lock, backup or journal writes.
  let journal = validateJournal(context);
  if (resume) verifySaved(context, journal.rows[0]);
  else {
    requireMigration(!journal.truncated, 'journal-invalid');
    requireMigration(!journal.rows.length, 'journal-exists');
    requireMigration(backup, 'usage');
  }
  assertOffline(context);
  const lease = acquireLock(context.lockFile);
  try {
    // Re-read all trusted bindings and files inside the exclusive migration lease.
    context = loadInstallation(installation); assertOffline(context); manifestComplete(context);
    journal = validateJournal(context);
    let header;
    if (resume) { header = journal.rows[0]; verifySaved(context, header); }
    else {
      requireMigration(!journal.truncated, 'journal-invalid');
      requireMigration(!journal.rows.length, 'journal-exists');
      backup = resolve(backup);
      checked('backup-invalid', () => {
        createOfflineBackup(context.plan, backup);
        verifyOfflineBackup(backup, context.plan);
      });
      header = {event:'migration', id:randomUUID(), backup, manifestHash:hash(readFileSync(resolve(backup, 'manifest.json')))};
      appendJournal(context.journalFile, header);
    }
    const record = row => appendJournal(context.journalFile, {migrationId:header.id, ...row});
    if (journal.truncated) record({event:'journal-repaired'});
    if (lease.stale) record({event:'lock-takeover'});
    for (const step of selected) {
      try {
        if (await step.complete(context)) { record({event:'skip', step:step.id}); continue; }
        record({event:'start', step:step.id});
        await step.apply(context);
        assert.ok(await step.complete(context), 'Step target is incomplete');
        record({event:'done', step:step.id});
      } catch (error) { record({event:'failed', step:step.id}); throw error; }
    }
    return {steps:selected.map(step => ({id:step.id, state:'complete'}))};
  } finally { lease.release(); }
}
