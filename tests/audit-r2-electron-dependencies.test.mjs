import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,realpathSync,mkdirSync,writeFileSync,readFileSync,statSync,existsSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {runInNewContext} from 'node:vm';

const manifest=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));
const source=readFileSync(new URL('../vendor/dsh-pet/platform/runtime.mjs',import.meta.url),'utf8');
// Execute the real fallback function with only its two module loads replaced.
// No real module installation, network, archive extraction or process launch.
function fixture(t,{cached=false,failDownload=false}={}) {
  const root=realpathSync(mkdtempSync(join(tmpdir(),'electron-dependency-code-'))),exe=join(root,'runtime/electron'),zip=join(root,'fixture.zip');
  const modules=[],messages=[];let downloadOptions;
  t.after(()=>rmSync(root,{recursive:true,force:true}));
  if(cached){mkdirSync(join(root,'runtime'));writeFileSync(exe,'fixture executable');}
  let body=source.slice(source.indexOf('async function ensureElectronDownload('),source.indexOf('\nfunction defaultLaunch('));
  assert.ok(body.startsWith('async function ensureElectronDownload('));
  for(const name of ['@electron/get','@electron-internal/extract-zip']) {
    const marker=`await import("${name}")`;assert.equal(body.split(marker).length,2);body=body.replace(marker,`await load("${name}")`);
  }
  const load=async name=>{
    assert.ok(manifest.optionalDependencies?.[name],`Undeclared direct download dependency: ${name}`);modules.push(name);
    if(name==='@electron/get')return {downloadArtifact:async options=>{downloadOptions=options;if(failDownload)throw Error('fixture download refused');writeFileSync(zip,'fixture zip');return zip;}};
    return {default:async(path,{dir})=>{assert.equal(path,zip);assert.equal(dir,join(root,'runtime'));writeFileSync(exe,'fixture executable');}};
  };
  const ensure=runInNewContext(body+'\nensureElectronDownload',{process:{env:{},arch:'fixture'},PLAT:'fixture',ELECTRON_REL:'electron',Date,Error,AbortController,setTimeout,clearTimeout,
    electronLandingDir:()=>join(root,'runtime'),defaultElectronExe:()=>exe,
    isNonEmptyFile:path=>existsSync(path)&&statSync(path).isFile()&&statSync(path).size>0,existsSync,mkdirSync,load});
  const logger={info:message=>messages.push(message),warn:message=>messages.push(message)};
  return {ensure:options=>ensure({timeoutMs:1000,logger,...options}),exe,modules,messages,options:()=>downloadOptions};
}

test('R2-6: an uncached Electron fallback uses only declared optional dependencies and preserves download/extract flow',async t=>{
  const f=fixture(t);assert.equal(await f.ensure({version:'43.3.0',mirror:'https://fixture.invalid/'}),f.exe);
  assert.deepEqual(f.modules,['@electron/get','@electron-internal/extract-zip']);assert.equal(f.options().artifactName,'electron');
  assert.equal(f.options().version,'v43.3.0');assert.ok(f.options().downloadOptions.signal instanceof AbortSignal);
});

test('R2-6: an existing runtime requires neither optional module nor a download',async t=>{
  const f=fixture(t,{cached:true});assert.equal(await f.ensure(),f.exe);assert.deepEqual(f.modules,[]);
});

test('R2-6: a failed fallback reports unavailability and never attempts extraction',async t=>{
  const f=fixture(t,{failDownload:true});assert.equal(await f.ensure(),undefined);assert.deepEqual(f.modules,['@electron/get']);
  assert.ok(f.messages.some(message=>message.includes('fixture download refused')));assert.equal(existsSync(f.exe),false);
});

test('R2-6: direct dependency versions are pinned in the manifest and locked for reproducible code preparation',()=>{
  const lock=readFileSync(new URL('../pnpm-lock.yaml',import.meta.url),'utf8');
  for(const name of ['@electron/get','@electron-internal/extract-zip']) {
    const version=manifest.optionalDependencies?.[name];assert.match(version??'',/^\d+\.\d+\.\d+$/);
    assert.ok(lock.includes(`'${name}@${version}':`),`Missing locked package ${name}@${version}`);
  }
});
