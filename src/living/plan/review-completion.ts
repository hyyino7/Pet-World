import {readFileSync,lstatSync} from 'node:fs';
import {resolve} from 'node:path';
import type {Session} from '@deepseek-ai/dsh-session';
import type {PetCoreHost} from '../../core/index.js';
import {companionWritingFile,type CompanionWritingScope} from '../../core/companion-writing.js';

/** Verify the original native receipt and the canonical file, never reply text.
 * An already existing dated record closes a stale retry without rewriting it. */
export function reviewDiaryStatus(host:Pick<PetCoreHost,'workspace'>,scope:CompanionWritingScope,day:string,session:Session,messageId:string):'written'|'existing'|'missing' {
  const path=companionWritingFile(host,scope,`diary/${day}.md`);
  const stat=lstatSync(path,{throwIfNoEntry:false});
  if(!stat)return 'missing';
  const content=readFileSync(path,'utf8');
  companionWritingFile(host,scope,`diary/${day}.md`);
  if(!content.trim())return 'missing';
  const events=session.snapshotEvents(),start=events.findIndex(event=>event.type==='user/message'&&event.data.id===messageId);
  if(start<0)return 'existing';
  const calls=new Map<string,string>();
  for(const event of events.slice(start)) {
    if(event.type==='turn/end')break;
    if(event.type==='tool/call'&&event.data.name==='write') {
      try {
        const args=JSON.parse(event.data.arguments);
        if(typeof args.file_path==='string'&&typeof args.content==='string'
          &&resolve(session.header.cwd??scope.directory,args.file_path)===path)calls.set(event.data.callId,args.content);
      }catch { /* Malformed calls cannot establish writing. */ }
    }
    if(event.type==='tool/result'&&!event.data.message.isError
      &&calls.get(event.data.message.toolCallId)===content)return 'written';
  }
  // Missing writes are retried only while the dated file is absent. Existing
  // records may have been completed by the owner or by a crash before receipt.
  return 'existing';
}
