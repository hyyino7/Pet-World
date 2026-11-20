import { existsSync, readFileSync, unlinkSync } from 'node:fs';
export function setSqliteMeta(db, key, jsonText) {
    db.prepare('INSERT INTO meta VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(key, jsonText);
}
export function closeSqliteLease(db, lockPath, lockToken) {
    db.close();
    if (existsSync(lockPath) && readFileSync(lockPath, 'utf8') === lockToken)
        unlinkSync(lockPath);
}
//# sourceMappingURL=sqlite.js.map