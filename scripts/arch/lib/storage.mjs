import {ts,walk,member,key,entry,normalize} from './ast.mjs';
import {moduleOf} from './rules.mjs';

export function scanStorage(project,layers,storage) {
  const reports=[];
  for(const {file,source} of project.sources) {
    const writer=moduleOf(layers,file);if(!writer)continue;
    walk(source,node=>{
      if(!ts.isCallExpression(node))return;
      const op=member(node.expression),names=project.strings(node.arguments[0]);
      const callee=project.pathsOf(node.expression).map(p=>p.split('.').at(-1));
      const fileReads=['readFile','readFileSync','readdir','readdirSync'];
      const fileWrites=['writeFile','writeFileSync','appendFile','appendFileSync','mkdir','mkdirSync','rename','renameSync','copyFile','copyFileSync','unlink','unlinkSync'];
      if(callee.some(p=>[...fileReads,...fileWrites].includes(p))) {
        const operation=callee.find(p=>[...fileReads,...fileWrites].includes(p));
        const access=fileReads.includes(operation)?'读':'写';
        const targets=names??['?'];
        for(const target of targets) {
          const suffix=target.split('*/').at(-1).replace(/^\.\//,'');
          const matches=target==='?'?[]:storage.entries.filter(r=>!r.selector&&r.paths.some(path=>{
            if(path.endsWith('/**')) {
              const prefix=path.slice(0,-3),dataIndex=prefix.indexOf('data/');
              return suffix.startsWith(prefix)||(dataIndex!==-1&&suffix.includes(prefix.slice(dataIndex)));
            }
            return suffix===path||path.endsWith('/'+suffix);
          }));
          const row=matches.length===1?matches[0]:undefined;
          reports.push(entry('R5',file,node,target,{writer,access,container:row?.container??(target==='?'?normalize(node.arguments[0]):target),containerOwner:row?.containerOwner??'?',owner:row?.owner??'?',
            violation:row?writer!==row.owner||row.containerOwner!==row.owner:null,storageId:row?.id,reason:row?'按路径声明核对':'无法静态判定文件拥有者'}));
        }
      }
      if(op==='exec'&&names)for(const sql of names)for(const match of sql.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["`\[]?([\w-]+)/gi)) {
        const table=match[1],row=storage.entries.find(r=>r.selector?.table===table&&r.containerOwner===writer);
        reports.push(entry('R5',file,node,table,{writer,access:'写',container:row?.container??`${writer}:sqlite#${table}`,containerOwner:row?.containerOwner??writer,owner:row?.owner??writer,violation:false,reason:'创建表'}));
      }
      if(!['get','put','all','meta','setMeta','remove','delete'].includes(op)||!names)return;
      const paths=project.pathsOf(node.expression.expression);
      const isCoreStore=paths.some(p=>/\.runtime\.store$|^store$|\.store$|^metadata$/.test(p));
      if(!isCoreStore)return;
      for(const name of names) {
        const table=['meta','setMeta'].includes(op)?'meta':'records';
        const row=storage.entries.find(r=>r.selector?.table===table&&(table==='records'?r.selector.kind===name:r.selector.key&&(r.selector.key.endsWith('*')?name.startsWith(r.selector.key.slice(0,-1)):name===r.selector.key)));
        const owner=row?.owner??'core',containerOwner=row?.containerOwner??'core';
        const access=['put','setMeta','remove','delete'].includes(op)?'写':'读';
        const violation=writer!==owner||containerOwner!==owner;
        reports.push(entry('R5',file,node,name,{writer,access,container:row?.container??`.chatpet/data/core/core.sqlite#${table}`,containerOwner,owner,violation,storageId:row?.id??`core-${table}`,reason:violation?'写入模块或物理容器不属于业务拥有者':'一致'}));
      }
    });
  }
  return reports;
}
