// Validate a complete, prebuilt GitHub-installable release. No host startup.
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {parse} from 'yaml';
import semver from 'semver';

const manifest=JSON.parse(readFileSync('package.json','utf8'));
assert.equal(manifest.name,'her-world');
assert.ok(semver.valid(manifest.version),'Release version must be exact SemVer');
assert.notEqual(manifest.private,true);
for(const hook of ['prepare','preinstall','install','postinstall'])
  assert.ok(!manifest.scripts?.[hook],'GitHub consumers must not need build/install hooks: '+hook);
assert.equal(manifest.repository.url,'https://github.com/hyyino7/her-world.git');
assert.ok(manifest.dsh.bundle.patch);
for(const path of ['src/core/index.ts','tests/core.test.ts','scripts/doctor.mjs','tsconfig.build.json','pnpm-lock.yaml'])
  assert.ok(existsSync(path),'Incomplete source checkout: '+path);
for(const value of Object.values(manifest.exports)) {
  if(typeof value==='string'&&!value.includes('*')) assert.ok(existsSync(resolve(value)),'Missing exported runtime: '+value);
}
const rows=parse(readFileSync(manifest.dsh.bundle.patch,'utf8')).flatMap(patch=>patch.insert??[]);
assert.equal(rows.find(row=>row.id==='00-Core').name,'her-world/00-Core');
assert.ok(!rows.find(row=>row.id==='00-Core').config,'Public bundles must not contain device binding');
assert.ok(rows.every(row=>!row.name.startsWith('dsh-Chatpet')),'Legacy module name in bundle');
const policy=JSON.parse(readFileSync('docs/release/status.json','utf8'));
if(!policy.stableReady) assert.ok(semver.prerelease(manifest.version),'Stable release blocked: '+policy.reason);
console.log('Release metadata, complete source, prebuilt exports and hook-free GitHub install passed.');
