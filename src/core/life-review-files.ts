import type {Context} from '@deepseek-ai/cordis';
import type {Agent} from '@deepseek-ai/dsh-agent';
import type {ToolExecution} from '@deepseek-ai/dsh-tools';
import type {RegistrationLease} from '../contracts/tables.js';

interface SourceFileGuardAccess {
  readonly lease?: RegistrationLease;
  key():string|undefined;
  check(tool:string,path:string):void;
}
interface PreparedFile {
  lease?:RegistrationLease;key?:string;path?:string;denial?:string;
}
const changed='自主回顾文件范围已变化，请重新读取当前状态';
const denial=(error:unknown)=>String(error instanceof Error?error.message:error);
const isFileTool=(name:string)=>name==='read'||name==='write';

/** DSH resolves paths. Recheck the registration and access before native dispatch. */
export function installSourceFileGuard(ctx:Context,getAccess:(agent:Agent)=>SourceFileGuardAccess|undefined) {
  const prepared=new Map<ToolExecution['token'],PreparedFile>();
  const native=ctx as unknown as {get(name:string):any};
  const stopPrepare=ctx.on('tools/pre-execute',async(exec,next)=>{
    if(!exec.agent||!isFileTool(exec.name))return next();
    const access=getAccess(exec.agent);if(!access)return next();
    const entry:PreparedFile={lease:access.lease};prepared.set(exec.token,entry);
    const assertCurrent=()=>{
      access.lease?.assertCurrent();
      if(access.key()!==entry.key)throw Error(changed);
    };
    try {
      access.lease?.assertCurrent();
      entry.key=access.key();
      if(entry.key===undefined)throw Error(changed);
      const args=exec.arguments as Record<string,unknown>;
      if(!args||typeof args.file_path!=='string'||!args.file_path)throw Error('自主回顾文件路径缺失');
      const fs=native.get('fs'),working=native.get('workingDirectory');
      if(!fs||!working)throw Error('原生文件路径服务尚未就绪');
      const cwd=await working.ensure(exec.agent,exec.signal);
      assertCurrent();
      const file=await fs.resolve(args.file_path,{cwd,signal:exec.signal});
      assertCurrent();
      entry.path=fs.processPath(file);
      access.check(exec.name,entry.path!);
    } catch(error) {entry.denial=denial(error);}
    return next();
  });
  const stopGuard=ctx.tools.guard(exec=>{
    if(!exec.agent||!isFileTool(exec.name))return;
    const entry=prepared.get(exec.token);
    if(entry?.lease&&!entry.lease.isCurrent())return changed;
    const access=getAccess(exec.agent);if(!access)return;
    try {
      access.lease?.assertCurrent();
      if(!entry||entry.lease?.generation!==access.lease?.generation)return changed;
      if(entry.denial)return entry.denial;
      if(access.key()!==entry.key||!entry.path)return changed;
      access.check(exec.name,entry.path);
    } catch(error) {return denial(error);}
  });
  const stopResult=ctx.on('tools/result',exec=>{prepared.delete(exec.token);});
  return()=>{stopPrepare();stopGuard();stopResult();prepared.clear();};
}
