import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {LIFE_STATE_MAX_BYTES} from '#dsh-world/life/lifeStore';
import {HOME_STORAGE_STEP} from '../../../dist/src/core/storage-migration.js';
import {copyDatabase} from '../../lib/repo-storage.mjs';
import {assertOffline} from '../context.mjs';
import {checked, requireMigration} from '../errors.mjs';
import {json, regular} from '../io.mjs';

const invalid = 'home-identity-invalid';
const kind = 'companion-home';
const validId = id => typeof id === 'string' && id.trim().length > 0 && !id.includes('\0');

function legacyHome(context) {
  const file = join(context.data, 'life', 'life.json'), stat = regular(file);
  if (!stat) return;
  requireMigration(stat.size <= LIFE_STATE_MAX_BYTES, invalid);
  const state = json(file);
  requireMigration(state?.version === 1 && (state.homeSessionId === undefined || validId(state.homeSessionId)), invalid);
  return state.homeSessionId;
}

function existingDatabase(context) {
  const file = join(context.plan.coreDirectory, 'core.sqlite');
  requireMigration(regular(file), invalid);
  return file;
}

function coreHome(db, context) {
  const {storageId, workspaceId, repo} = context.plan;
  requireMigration(db.prepare("SELECT value FROM meta WHERE key='schema'").get()?.value === '"1"', invalid);
  const stored = db.prepare('SELECT value FROM records WHERE kind=? AND id=?');
  const binding = JSON.parse(stored.get('workspace-binding', 'current')?.value ?? 'null');
  const chosen = JSON.parse(stored.get('preferences', 'current')?.value ?? 'null')?.workspace;
  requireMigration(binding?.phase === 'ready' && binding.target?.id === workspaceId && binding.target.path === repo
    && chosen?.id === workspaceId && chosen.path === repo, 'binding-changed');
  const row = stored.get(kind, storageId);
  if (!row) return;
  const value = JSON.parse(row.value);
  requireMigration(validId(value?.sessionId) && Object.keys(value).every(key => key === 'sessionId' || key === 'arrivalPending')
    && (value.arrivalPending === undefined || value.arrivalPending === true), invalid);
  return value.sessionId;
}

export default {
  ...HOME_STORAGE_STEP,
  complete(context, {recorded = false, versioned = false} = {}) {
    return checked(invalid, () => {
      const source = existingDatabase(context), scratch = mkdtempSync(join(tmpdir(), 'migration-home-'));
      try {
        const copy = join(scratch, 'core.sqlite');
        copyDatabase(source, copy);
        const db = new DatabaseSync(copy, {readOnly:true});
        try {
          const current = coreHome(db, context);
          return (recorded || versioned) && current !== undefined || current === legacyHome(context);
        } finally { db.close(); }
      } finally { rmSync(scratch, {recursive:true, force:true}); }
    });
  },
  apply(context) {
    assertOffline(context);
    checked(invalid, () => {
      const sessionId = legacyHome(context);
      const db = new DatabaseSync(existingDatabase(context));
      try {
        db.exec('PRAGMA synchronous=FULL');
        db.exec('BEGIN IMMEDIATE');
        try {
          const current = coreHome(db, context);
          requireMigration(current === undefined || sessionId === undefined || current === sessionId, 'home-identity-conflict');
          if (current === undefined && sessionId !== undefined) {
            db.prepare('INSERT INTO records(kind,id,value) VALUES(?,?,?)').run(kind, context.plan.storageId, JSON.stringify({sessionId}));
          }
          db.exec('COMMIT');
        } catch (error) { db.exec('ROLLBACK'); throw error; }
      } finally { db.close(); }
    });
  },
};
