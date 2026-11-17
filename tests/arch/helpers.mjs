import {mkdtempSync,readFileSync,writeFileSync,mkdirSync,rmSync,cpSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {scan} from '../../scripts/arch/lib/scan.mjs';

export const repository=resolve(import.meta.dirname,'../..');
export function workspace(t,contents={},fixture) {
  const root=mkdtempSync(join(tmpdir(),'her-world-arch-'));
  t.after(()=>rmSync(root,{recursive:true,force:true}));
  const write=(file,text)=>{mkdirSync(dirname(join(root,file)),{recursive:true});writeFileSync(join(root,file),text);};
  mkdirSync(join(root,'src'),{recursive:true});
  const layers=JSON.parse(readFileSync(join(repository,'arch/layers.json'),'utf8'));
  for(const module of Object.values(layers.modules))module.generated=[];
  write('arch/layers.json',JSON.stringify(layers));
  write('arch/storage.json',readFileSync(join(repository,'arch/storage.json'),'utf8'));
  write('package.json',JSON.stringify({type:'module',imports:{'#upper/*':'./src/life/*.js'}}));
  if(fixture)cpSync(join(repository,'scripts/arch/fixtures',fixture,'src'),join(root,'src'),{recursive:true});
  for(const [file,content] of Object.entries(contents))write(file,content);
  return {root,write,scan:()=>scan(root)};
}
export function saveBaseline(work) {
  const result=work.scan();
  for(const [name,entries] of [['rules',result.rules],['vocabulary',result.vocabulary]])work.write(`arch/baseline/${name}.json`,JSON.stringify({schemaVersion:1,entries}));
  return result;
}
export function check(root,args=[]) {
  const module=join(repository,'scripts/arch/check.mjs');
  return spawnSync(process.execPath,['--input-type=module','-e',
    `import {main} from ${JSON.stringify(module)};try{process.exitCode=main(JSON.parse(process.argv[1]),process.argv[2]);}catch(e){console.error(e.message);process.exitCode=1;}`,
    JSON.stringify(args),root],{encoding:'utf8'});
}
