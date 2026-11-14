import {existsSync, lstatSync, mkdirSync, readdirSync} from 'node:fs';
import {join} from 'node:path';

/** Inventory only. Legacy payloads are never copied, parsed or discarded here. */
export function legacyChannelFiles(deviceDirectory:string): {path:string;bytes:number}[] {
  if(!existsSync(deviceDirectory))return [];
  const inventory:{path:string;bytes:number}[]=[];
  function visit(directory:string) {
    for(const entry of readdirSync(directory,{withFileTypes:true})) {
      const path=join(directory,entry.name), stat=lstatSync(path);
      if(stat.isSymbolicLink())throw Error('旧渠道资料包含链接，请先核对迁移清单：'+path);
      if(stat.isDirectory())visit(path);
      else if(stat.isFile())inventory.push({path,bytes:stat.size});
    }
  }
  for(const entry of readdirSync(deviceDirectory,{withFileTypes:true})) {
    if(entry.name==='group-material' || entry.name==='conversations' || /^qzone-/.test(entry.name)) {
      const path=join(deviceDirectory,entry.name);
      if(entry.isDirectory()) {
        if(entry.name==='conversations')for(const child of readdirSync(path,{withFileTypes:true})) {
          if(child.isDirectory())inventory.push({path:join(path,child.name),bytes:0});
        }
        visit(path);
      }
      else inventory.push({path,bytes:lstatSync(path).size});
    } else if(/^wechat-/.test(entry.name) && entry.isDirectory()) {
      const directory=join(deviceDirectory,entry.name);
      // Discovery JSON carries the device token. Outbox and received media are
      // companion records; only the former stays in the device directory.
      for(const child of readdirSync(directory,{withFileTypes:true})) {
        if(child.name==='wechat.json')continue;
        const path=join(directory,child.name),stat=lstatSync(path);
        if(stat.isDirectory())visit(path);
        else inventory.push({path,bytes:stat.size});
      }
    }
  }
  return inventory;
}

export function companionChannelDirectory(root:string, deviceDirectory:string) {
  const legacy=legacyChannelFiles(deviceDirectory);
  if(legacy.length)throw Object.assign(Error('旧渠道资料需要迁移后才能继续；原文件保留，未创建第二份资料。'),
    {code:'CHANNEL_MIGRATION_REQUIRED',inventory:legacy});
  let directory=root;
  for(const part of ['.chatpet','data','channels']) {
    directory=join(directory,part);
    if(!existsSync(directory))mkdirSync(directory,{mode:0o700});
    const stat=lstatSync(directory);
    if(!stat.isDirectory() || stat.isSymbolicLink())throw Error('渠道资料必须保存在已绑定工作区内');
  }
  return directory;
}
