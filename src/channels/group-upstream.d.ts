declare module '#feiyu-room/affinity' {
  interface Relationship {groupId:string;userId:string;name:string;score:number;atCount:number}
  export function recordAffinity(input:{groupId:string;userId:string;name?:string;text:string;hasMedia:boolean;quoteTargetIsSelf:boolean}, file:string): {record:Relationship;card:string};
  export function loadAffinity(file:string):Record<string,Relationship>;
  export function formatAffinityCard(row:Relationship):string;
}
declare module '#feiyu-room/slang-learner' {
  export interface Slang {id:string;content:string;meaning:string;usage:string;status:'confirmed'|'candidate'|'rejected';count:number;evidence:{sender:string;text:string;time:number}[]}
  export function loadSlang(file:string):Slang[];
  export function saveSlang(file:string, entries:Slang[]):{entries:Slang[]};
  export function upsertSlangEntry(entries:Slang[], content:string, patch:Partial<Slang>&{countIncrement?:number;source?:string}):{entries:Slang[];entry:Slang};
  export function buildSlangContext(entries:Slang[], max?:number):string;
  export function buildExtractionPrompt(messages:{sender:string;text:string}[]):string;
}
declare module '#feiyu-room/role-card' {
  export function selectRoleText(text:string, mode:'v1'|'v2'):string;
  export function roleSectionReport(text:string, mode:'v1'|'v2'):{heading:string;mode:string;injected:boolean;chars:number}[];
}
declare module '#feiyu-room/sticker-lib' {
  export interface Sticker {id:string;resId:string;desc:string;localNote:string;usage:string;tags:string[];useCount:number}
  export function loadStickerStore(file:string):Sticker[];
  export function saveStickerStore(file:string, entries:Sticker[]):void;
  export function findSticker(entries:Sticker[], query:string):Sticker|null;
  export function mergeStickerLibrary(entries:Sticker[], fetched:{emoji_id:string;desc:string}[], opts:{complete:boolean}):Sticker[];
  export function formatStickerList(entries:Sticker[], query?:string, limit?:number):{stickers:Sticker[]};
  export function applyStickerNote(entries:Sticker[], id:string, patch:{note?:string;usage?:string;tags?:string[]}):{entries:Sticker[];entry:Sticker|null};
  export function markStickerUsed(entries:Sticker[], id:string, context:string):{entries:Sticker[];entry:Sticker|null};
  export function buildStickerContext(entries:Sticker[], max:number, options:{key:string}):string;
}
declare module '#feiyu-room/forward' {
  export function extractForwardIds(segments:unknown):string[];
  export function sanitizeForwardId(id:unknown):string;
  export function formatForwardResponse(raw:unknown):{total:number;truncated:boolean;messages:{sender:string;text:string;nestedForwardIds:string[]}[]};
}
declare module '#feiyu-room/qzone' {
  export function normalizeQzoneConfig(raw?:object):Record<string,unknown>;
  export function checkContent(text:string, options:{cfg:object;recentTexts?:readonly string[]}):{ok:boolean;message?:string;text?:string};
  export function checkQuota(options:{state:object;cfg:object;now:number}):{ok:boolean;message?:string;todayCount:number;remaining:number};
  export function shouldForceWake(options:{state:object;cfg:object;now:number}):{due:boolean};
}
declare module '#feiyu-room/group-wake' {
  export function isSilentMarker(text: string):boolean;
  export function evaluateWakeTriggerV2(st:object,event:object,plain:string,quoted:boolean,nickname:string):string|null;
  export function noteModelMessagesV2(st:object,messages:readonly object[]):number;
  export function requestedReadThroughSeqV2(st:object,body:{throughSeq:number},isAgent:boolean):number;
  export function acknowledgeMessagesV2(st:object,through:number):number;
}
declare module '#feiyu-room/sensitive' {
  export const SENSITIVE_RE: RegExp;
}
