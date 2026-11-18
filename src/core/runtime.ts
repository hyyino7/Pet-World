import {CONTRACT_VERSION} from '../contracts/version.js';
import type {CapabilityStatus, ServiceCall} from '../contracts/common.js';
import type {AttentionPolicy, CompanionIdentity, CoreService} from '../contracts/core.js';
import type {CapabilityRegistration} from '../contracts/tables.js';
import {CoreAuthority} from './authority.js';
import {conversationOptions, type ConversationOptions} from './options.js';
import {canonical, check, CoreStore, id, reject, Rejection, revision, text, timestamp} from './storage.js';
import {CapabilityTable} from './tables/capabilities.js';

export interface CoreConfig {
  dataDir:string; companionId:string; scopeId:string; ownerActorId:string;
  displayName:string; character:string; conversation?:Partial<ConversationOptions>;
  memory?:import('../memory/client.js').MemoryConfig;
}

/** Companion configuration and native integration storage. DSH owns execution. */
export class CoreRuntime {
  readonly store:CoreStore;
  private readonly authority:CoreAuthority;
  readonly owner:ReturnType<CoreAuthority['client']>;
  readonly core:CoreService;
  readonly bootId=id('boot');
  readonly defaultConversation:Readonly<ConversationOptions>;
  files?:import('./workspace.js').CoreWorkspace;
  fileEffect=false;
  private stopped=false;
  onChange:(operation:string,value:unknown)=>void=()=>{};
  readonly capabilityTable=new CapabilityTable();
  // Core supplies live status for its initial registrations.
  readonly capabilityStatuses:Partial<Record<CapabilityStatus['id'],()=>ReturnType<CapabilityRegistration['status']>|undefined>>={};
  capabilities=():CapabilityStatus[]=>this.capabilityTable.list().map(({id,owner,contractVersion,status})=>({
    id,owner,contractVersion,...status(),
  }));

  constructor(readonly config:CoreConfig) {
    this.defaultConversation=conversationOptions(config.conversation);
    for(const key of ['companionId','scopeId','ownerActorId'])text(config[key as keyof CoreConfig],key);
    this.validateIdentity(config);
    this.store=new CoreStore(config.dataDir);
    this.authority=new CoreAuthority(config.companionId,config.scopeId);
    this.owner=this.authority.client({module:'core',actor:{kind:'owner',id:config.ownerActorId},operations:['*']});
    try {
      this.store.transaction(()=>{
        const identity=this.store.get<CompanionIdentity>('identity','current');
        if(identity&&(identity.companionId!==config.companionId||identity.ownerActorId!==config.ownerActorId||this.store.meta('scope')!==config.scopeId))
          reject('INCOMPATIBLE','Stored identity/scope does not match host configuration');
        if(!identity) {
          this.store.put('identity','current',{companionId:config.companionId,revision:1,displayName:config.displayName,character:config.character,ownerActorId:config.ownerActorId});
          this.store.setMeta('scope',config.scopeId);
        }
        if(!this.store.get('policy','current'))this.store.put('policy','current',{revision:1,quiet:false});
        // Retired activity/execution/contact rows remain untouched historical data.
        // Opening the companion never reconciles, runs or mutates those records.
      });
      this.registerBaseCapabilities();
      this.core={
        getIdentity:this.call('getIdentity',false,()=>this.identity()),
        reviseIdentity:this.call('reviseIdentity',true,input=>{
          check(this.files,'Workspace binding service is unavailable');this.files.assertEditScope(input.expectedScope);
          const before=this.identity();revision(before.revision,input.expectedRevision);this.validateIdentity(input);
          const next={...before,revision:before.revision+1,displayName:input.displayName,character:input.character};
          this.files?.write('identity',next);this.store.put('identity','current',next);return next;
        }),
        getPolicy:this.call('getPolicy',false,()=>this.policy()),
        listCapabilities:this.call('listCapabilities',false,()=>this.capabilities()),
      };
    } catch(error){this.store.close();throw error;}
  }
  private validateIdentity(input:{displayName:string;character:string}) {
    check(typeof input.displayName==='string'&&input.displayName.length<=256&&!/[\r\n]/.test(input.displayName),'Invalid displayName');
    check(typeof input.character==='string'&&input.character.length<=32_768,'Invalid character');
  }
  identity():CompanionIdentity{return this.store.require('identity','current');}
  policy():AttentionPolicy {
    const saved=this.store.require<AttentionPolicy>('policy','current');
    return {revision:saved.revision,quiet:saved.quiet};
  }
  get conversation():Readonly<ConversationOptions> {
    return conversationOptions(this.store.get<import('./preferences.js').CorePreferences>('preferences','current')?.conversation??this.defaultConversation);
  }
  /** Configuration API authority, compare-and-set and request deduplication. */
  call<I,O>(name:string,write:boolean,fn:(input:I)=>O):ServiceCall<I,O> {
    return async(context,input,options)=>{
      this.fileEffect=false;
      try {
        if(this.stopped)reject('DISABLED','Core has stopped');
        const principal=this.authority.owner(context,name,this.config.ownerActorId);
        if(options?.signal?.aborted)throw new Rejection({code:'CANCELLED',message:'Call cancelled before admission',effect:'none',retry:'never'});
        if(options?.deadline){timestamp(options.deadline);if(Date.parse(options.deadline)<=Date.now())throw new Rejection({code:'TIMED_OUT',message:'Call deadline expired',effect:'none',retry:'never'});}
        if(name==='workspace.initialize')await this.store.ensurePersisted();
        this.files?.synchronize(name);this.fileEffect=false;canonical(input);
        check(input!==null&&typeof input==='object'&&!Array.isArray(input),'Expected request object');
        const run=()=>{const value=fn(input);if(write)this.store.setMeta('stateRevision',(this.store.meta<number>('stateRevision')??0)+1);return value;};
        const value=write?this.store.mutate(`${principal.module}:${principal.actor.kind}:${principal.actor.id}`,name,context.requestId,input,run):run();
        if(write)try{this.onChange(name,{bootId:this.bootId,revision:this.store.meta('stateRevision')});}catch{/* Committed configuration remains authoritative. */}
        return {ok:true,value:structuredClone(value)};
      } catch(error){
        return {ok:false,error:this.fileEffect?{code:'OUTCOME_UNKNOWN',message:'Workspace file changed; refresh to reconcile the acknowledged state',effect:'unknown',retry:'reconcile'}:error instanceof Rejection?error.detail:error instanceof TypeError
          ?{code:'INVALID_ARGUMENT',message:'Malformed request object',effect:'none',retry:'never'}
          :{code:'INTERNAL',message:'Core operation failed; inspect local diagnostics',effect:'none',retry:'never'}};
      }
    };
  }
  private registerBaseCapabilities() {
    const rows:[number,CapabilityStatus['id'],CapabilityStatus['owner']][]=[
      [1,'core.conversation','core'],
      [2,'memory.lifecycle','memory'],
      [3,'life.pursuits','life'],
      [4,'desktop.presentation','desktop'],
      [5,'desktop.body','desktop'],
      [6,'desktop.room','desktop'],
      [7,'channel.qq','qq'],
      [8,'voice.speech','voice'],
      [9,'console.operations','console'],
    ];
    for(const [order,id,owner] of rows) {
      this.capabilityTable.register({
        id,owner,contractVersion:CONTRACT_VERSION,order,
        status:()=>this.capabilityStatuses[id]?.()??{state:'unavailable',reason:'Native component is not available',supportedOperations:[]},
      });
    }
  }
  close(){if(this.stopped)return;this.stopped=true;this.store.close();}
}
