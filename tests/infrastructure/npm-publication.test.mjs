import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {parse} from 'yaml';
import {waitForNpmArchive} from '../../scripts/lib/npm-publication.mjs';

const name='her-world',version='0.1.4',bytes=Buffer.from('A checked, synthetic release archive.');
const integrity=`sha512-${createHash('sha512').update(bytes).digest('base64')}`;
const metadataURL=`https://registry.npmjs.org/${name}/${version}`;
const archiveURL=`https://registry.npmjs.org/${name}/-/${name}-${version}.tgz`;
const metadata=()=>Response.json({name,version,dist:{integrity,tarball:archiveURL}});
function fixture(respond,timeoutMs=60_000) {
  let clock=0;const calls=[],retries=[];
  return {calls,retries,run:()=>waitForNpmArchive({name,version,integrity,timeoutMs,now:()=>clock,
    sleep:async ms=>{clock+=ms;},onRetry:message=>retries.push(message),
    fetchImpl:async(url,options)=>{calls.push(url);assert.equal(options.headers['Cache-Control'],'no-cache');return respond(url,calls.length);}})};
}

test('publication waits through async metadata and cached canonical archive 404s',async()=>{
  let metadataReads=0,downloads=0;
  const f=fixture(url=>{
    if(url===metadataURL)return ++metadataReads===1?new Response(null,{status:404}):metadata();
    assert.equal(url,archiveURL,'Only the ordinary install URL establishes readiness');
    return ++downloads===1?new Response(null,{status:404}):new Response(bytes);
  });
  const result=await f.run();assert.equal(result.verified,true);assert.equal(result.downloadedBytes,bytes.length);
  assert.equal(result.integrity,integrity);assert.equal(f.retries.length,2);
  assert.ok(f.calls.every(url=>!url.includes('?')),'A cache-busting download cannot complete publication');
});

for(const field of ['integrity','tarball','version'])test(`published ${field} conflicts fail immediately without downloading or retrying`,async()=>{
  const f=fixture(()=>Response.json({name,version:field==='version'?'0.1.5':version,
    dist:{integrity:field==='integrity'?'sha512-conflicting':integrity,tarball:field==='tarball'?'https://other.invalid/package.tgz':archiveURL}}));
  await assert.rejects(f.run(),/conflicts/);assert.deepEqual(f.calls,[metadataURL]);assert.deepEqual(f.retries,[]);
});

test('HTTP success with wrong archive bytes cannot complete publication',async()=>{
  const f=fixture(url=>url===metadataURL?metadata():new Response('wrong archive'));
  await assert.rejects(f.run(),/Downloaded npm archive integrity conflicts/);
  assert.deepEqual(f.calls,[metadataURL,archiveURL]);assert.deepEqual(f.retries,[]);
});

test('transient network failure and interrupted download retry the entire checked archive',async()=>{
  let downloads=0;
  const f=fixture((url,call)=>{
    if(call===1)throw new TypeError('temporary network failure');
    if(url===metadataURL)return metadata();
    if(++downloads===1)return new Response(new ReadableStream({start(controller){controller.error(new TypeError('interrupted stream'));}}));
    return new Response(bytes);
  });
  assert.equal((await f.run()).verified,true);assert.equal(downloads,2);assert.equal(f.retries.length,2);
});

test('metadata transport interruption retries without accepting incomplete metadata',async()=>{
  const f=fixture((url,call)=>call===1
    ? new Response(new ReadableStream({start(controller){controller.error(new TypeError('metadata interrupted'));}}))
    : url===metadataURL?metadata():new Response(bytes));
  assert.equal((await f.run()).verified,true);assert.equal(f.retries.length,1);
});

for(const status of [429,503])test(`transient HTTP ${status} retries and then verifies the canonical archive`,async()=>{
  const f=fixture((url,call)=>call===1?new Response(null,{status}):url===metadataURL?metadata():new Response(bytes));
  assert.equal((await f.run()).verified,true);assert.equal(f.retries.length,1);
});

test('a permanently unavailable release stops at its deadline and never reports success',async()=>{
  const f=fixture(()=>new Response(null,{status:404}),45_000);
  await assert.rejects(f.run(),/did not become downloadable within 45000ms/);
  assert.equal(f.calls.length,3);assert.ok(f.calls.every(url=>url===metadataURL));
});

test('authorization errors stop immediately rather than retrying a publication',async()=>{
  const f=fixture(()=>new Response(null,{status:403}));
  await assert.rejects(f.run(),/HTTP 403/);assert.equal(f.calls.length,1);assert.deepEqual(f.retries,[]);
});

test('release and PR workflows share verification; promotion follows the public download gate',()=>{
  const release=parse(readFileSync('.github/workflows/release.yml','utf8'));
  assert.deepEqual(Object.keys(release.on),['workflow_dispatch'],'Tag pushes cannot start a second publication route');
  const steps=release.jobs.release.steps;
  const verify=steps.findIndex(step=>step.run?.includes('pnpm run verify'));
  const publish=steps.findIndex(step=>step.run?.includes('npm publish'));
  const promote=steps.findIndex(step=>step.name?.startsWith('Promote verified'));
  const github=steps.findIndex(step=>step.run?.includes('gh release create'));
  assert.ok(verify>=0&&verify<publish&&publish<promote&&promote<github);
  assert.ok(steps[publish].run.includes('pnpm run check:published -- "$archive"'));
  assert.ok(steps[0].with['fetch-depth']===0,'Existing tags remain recoverable without overwriting them');
  for(const workflow of [release,parse(readFileSync('.github/workflows/ci.yml','utf8'))])
    for(const job of Object.values(workflow.jobs))for(const step of job.steps)if(step.run)
      assert.equal(spawnSync('bash',['-n'],{input:step.run,encoding:'utf8'}).status,0,step.name);
  const ci=parse(readFileSync('.github/workflows/ci.yml','utf8'));
  assert.ok(ci.on.pull_request!==undefined);assert.equal(ci.on.push,undefined);
  assert.ok(ci.jobs.verify.steps.some(step=>step.run?.includes('pnpm run verify')));
});
