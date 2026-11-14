// Publish only the already checked release archive; retries must match its integrity.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
import semver from 'semver';

export function npmRelease(manifest,archive,published) {
  assert.equal(manifest.name,'her-world');
  assert.equal(semver.valid(manifest.version),manifest.version);
  const integrity='sha512-'+createHash('sha512').update(archive).digest('base64');
  if(published)assert.equal(published.integrity,integrity,'Published version differs; choose a new version');
  return {integrity,tag:semver.prerelease(manifest.version)?'next':'latest',publish:!published};
}

if(process.argv[1]?.endsWith('/publish-npm.mjs')) {
  const manifest=JSON.parse(readFileSync('package.json'));
  assert.ok(process.argv[2],'Usage: node scripts/publish-npm.mjs CHECKED_ARCHIVE');
  const run=args=>spawnSync('npm',[...args,'--registry=https://registry.npmjs.org/'],{encoding:'utf8'});
  const view=run(['view',`${manifest.name}@${manifest.version}`,'dist','--json']);
  let published;
  if(view.status===0)published=JSON.parse(view.stdout);
  else {
    let error;try{error=JSON.parse(view.stdout).error;}catch{}
    assert.equal(error?.code,'E404','Cannot verify npm version: '+view.stderr);
  }
  const plan=npmRelease(manifest,readFileSync(process.argv[2]),published);
  if(plan.publish) {
    const result=spawnSync('npm',['publish',process.argv[2],'--ignore-scripts','--access=public','--registry=https://registry.npmjs.org/','--tag='+plan.tag],{stdio:'inherit'});
    assert.equal(result.status,0,'npm publish failed');
  }
  const verify=run(['view',`${manifest.name}@${manifest.version}`,'dist.integrity','--json']);
  assert.equal(verify.status,0,verify.stderr);
  assert.equal(JSON.parse(verify.stdout),plan.integrity,'npm archive differs from checked release');
  console.log(`Verified npm ${manifest.name}@${manifest.version} (${plan.tag}).`);
}
