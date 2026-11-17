import {readJson} from './ast.mjs';
import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {dirname} from 'node:path';

export function identity(item) {
  if(item.rule==='R8')return JSON.stringify(item.shape==='bare string'
    ?[item.rule,item.file,item.scope,item.target]
    :[item.rule,item.file,item.scope,item.shape,item.other.file,item.other.scope]);
  return JSON.stringify([item.rule,item.file,item.scope,item.target,item.expression]);
}
export function compareBaseline(current,baseline) {
  const counts=items=>{
    const result=new Map();
    for(const item of items){const id=identity(item);result.set(id,(result.get(id)??0)+1);}
    return result;
  };
  const actual=counts(current),saved=counts(baseline),added=[],removed=[];
  for(const [id,count] of actual)for(let i=saved.get(id)??0;i<count;i++)added.push(JSON.parse(id));
  for(const [id,count] of saved)for(let i=actual.get(id)??0;i<count;i++)removed.push(JSON.parse(id));
  return {added,removed,ok:!added.length&&!removed.length};
}
export function updateBaselines(groups,write=false) {
  // 全部比较完成之后才写；任一新增都会阻止其他文件被部分收紧。
  const results=groups.map(({file,items})=>{
    const baseline=existsSync(file)?readJson(file).entries:[];
    return {file,items,...compareBaseline(items,baseline)};
  });
  if(write && results.some(r=>r.added.length))throw Error('--write-baseline 只能删条目，拒绝新增（缺失基线也不能重新初始化）');
  if(write)for(const {file,items} of results) {
    mkdirSync(dirname(file),{recursive:true});
    writeFileSync(file,JSON.stringify({schemaVersion:1,entries:items},null,2)+'\n');
  }
  return results;
}
