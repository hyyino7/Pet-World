import {existsSync, readFileSync, unlinkSync} from 'node:fs';
import type {DatabaseSync} from 'node:sqlite';

export function setSqliteMeta(db: DatabaseSync, key: string, jsonText: string): void {
  db.prepare('INSERT INTO meta VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(key, jsonText);
}

export function closeSqliteLease(db: DatabaseSync, lockPath: string, lockToken: string): void {
  db.close();
  if (existsSync(lockPath) && readFileSync(lockPath, 'utf8') === lockToken) unlinkSync(lockPath);
}
