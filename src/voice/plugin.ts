import type {Context} from '@deepseek-ai/cordis';
import {lstatSync, mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {digest} from '../core/storage.js';
import type {PetCoreHost} from '../core/index.js';

const upstream = (part: string): Promise<any> => import('../desktop/upstream/host/' + part + '.js');
export interface VoiceRequest {rest: string; method: string; body?: string; signal?: AbortSignal}
type VoiceResponse = {kind:'json'; status:number; obj:unknown} | {kind:'file'; file:string; contentType:string};

export class CompanionVoice {
  private lifetime = new AbortController();
  private scope?: {id:string; workspaceId:string; tools:Promise<{voice:unknown; speech:unknown}>};
  constructor(private host: PetCoreHost, private directory: string, private recognizer: () => unknown) {}
  canTranscribe() {
    const service = this.recognizer() as {transcribe?:unknown}|undefined;
    return typeof service?.transcribe === 'function';
  }
  private binding() {
    const state = this.host.workspace.status();
    return state.state === 'ready' && state.target ? {workspaceId:state.target.id, id:this.host.workspace.storageId()} : undefined;
  }
  refresh() {
    const target = this.binding();
    if (this.scope && (this.scope.id !== target?.id || this.scope.workspaceId !== target?.workspaceId)) this.release();
  }
  release() { this.lifetime.abort(); this.lifetime = new AbortController(); this.scope = undefined; }
  async handle(input: VoiceRequest): Promise<VoiceResponse> {
    this.refresh();
    const bound = this.binding();
    if (!bound?.id || !this.directory) throw Error('语音需要已绑定的工作区');
    if (!['voice/hear','voice/speak','voice/voices'].includes(input.rest)) throw Error('语音操作无效');
    if (input.body && Buffer.byteLength(input.body) > 1_048_576) throw Error('音频过长');
    if (!this.scope) {
      const root = join(this.directory, digest(bound.id));
      for (const path of [this.directory,root,join(root,'voice-cache')]) {
        mkdirSync(path, {recursive:true, mode:0o700});
        if (!lstatSync(path).isDirectory()) throw Error('语音缓存目录无效');
      }
      const tools = Promise.all([upstream('voice/speak'),upstream('voice/hear')])
        .then(([out, mic]) => ({voice:out.createVoiceService({userRoot:root}), speech:mic.createHearService({speechToText:this.recognizer})}));
      this.scope = {id:bound.id, workspaceId:bound.workspaceId, tools};
    }
    const signal = input.signal ? AbortSignal.any([this.lifetime.signal,input.signal]) : this.lifetime.signal;
    const tools = await this.scope.tools;
    const {handleVoiceRoutes} = await upstream('routes/voice');
    signal.throwIfAborted();
    const result = await handleVoiceRoutes(tools, {...input,signal});
    this.refresh();
    signal.throwIfAborted();
    return result;
  }
}
export const name = '70-Voice';
export const inject = ['petCore','profileContext'];
export function apply(ctx: Context, config: {deviceDirectory?:string} = {}) {
  const services = ctx as unknown as {profileContext:{dir:string}; get(key:string):unknown};
  const voice = new CompanionVoice(ctx.petCore, config.deviceDirectory ?? join(services.profileContext.dir,'chatpet-voice'),
    () => services.get('speechToText'));
  ctx.provide('petVoice',voice);
  ctx.on('pet/core.changed',() => voice.refresh());
  ctx.effect(() => () => voice.release());
}
declare module '@deepseek-ai/cordis' {interface Context {petVoice: CompanionVoice}}
