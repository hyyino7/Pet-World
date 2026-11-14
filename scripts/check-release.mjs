// Validate release metadata using DSH's published index contract. No host startup.
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {parse} from 'yaml';
import semver from 'semver';
import {parseMarketIndex, marketInstallTarget} from '@deepseek-ai/dsh-plugin-market-index';

const manifest=JSON.parse(readFileSync('package.json','utf8'));
assert.equal(manifest.name,'her-world');
assert.ok(semver.valid(manifest.version),'Release version must be exact SemVer');
assert.notEqual(manifest.private,true);
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
const indexAt=process.argv.indexOf('--index');
if(indexAt>=0) {
  const index=parseMarketIndex(JSON.parse(readFileSync(process.argv[indexAt+1],'utf8')),
    'https://raw.githubusercontent.com/hyyino7/her-world/market/index.json');
  assert.equal(index.plugins.length,1);
  const plugin=index.plugins[0];
  assert.equal(plugin.name,manifest.name);
  assert.ok(plugin.versions.some(version=>version.version===manifest.version),'Release absent from market index');
  for(const version of plugin.versions) {
    assert.equal(version.source.type,'git');
    assert.equal(version.source.url,'https://github.com/hyyino7/her-world');
    const target=marketInstallTarget(plugin.name,version);
    assert.ok(target.spec.includes(version.source.commit));
    if(version.version===manifest.version)assert.equal(version.engines.dsh,manifest.engines.dsh);
  }
}
console.log('Release metadata, source completeness, runtime exports and DSH index contract passed.');
