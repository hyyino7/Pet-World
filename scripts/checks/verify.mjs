// Complete model-free release validation. Build and pack once; run every test
// entry file once. Native/window trials remain explicit, isolated owner checks.
import {spawnSync} from 'node:child_process';
import {globSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';

function run(command,args,env=process.env) {
  const result=spawnSync(command,args,{stdio:'inherit',env});
  if(result.error)throw result.error;
  if(result.status!==0)throw Error(`${command} ${args.join(' ')} failed (${result.signal ?? result.status})`);
}
for(const name of ['check:env','check:types','build'])run('pnpm',['run',name]);
const tests=[...new Set([...globSync('dist/tests/**/*.test.js'),...globSync('tests/**/*.test.mjs')])].sort();
if(!tests.length)throw Error('No compiled or JavaScript tests found');
run(process.execPath,['--test','--test-timeout=30000','--test-concurrency=4',...tests]);
run('.venv/bin/python',['tests/memory/memory_provider_test.py']);
run('pnpm',['run','check:release']);
const manifest=JSON.parse(readFileSync('package.json','utf8'));
const directory='.cache/release',archive=join(directory,`${manifest.name}-${manifest.version}.tgz`);
mkdirSync(directory,{recursive:true});
run('pnpm',['pack','--pack-destination',directory],{...process.env,COPYFILE_DISABLE:'1'});
run('pnpm',['run','check:package',archive]);
writeFileSync(join(directory,'SHA256SUMS'),`${createHash('sha256').update(readFileSync(archive)).digest('hex')}  ${manifest.name}-${manifest.version}.tgz\n`);
console.log(JSON.stringify({verified:true,testFiles:tests.length,archive,modelCalls:0,installed:false}));
