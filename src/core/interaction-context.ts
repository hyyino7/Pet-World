import type {CompanionFact,CompanionFactSource} from '../contracts/interaction.js';
import {contextFactIds} from './interaction-presentation.js';

export interface PromptFactSource {service:CompanionFactSource;facts:CompanionFact[]}

/** A completed native turn is not durable until its original session flushes. */
export async function acknowledgePromptFacts(input:{
  turn:number;workspaceId:string;sources:readonly PromptFactSource[];
  events:()=>readonly {type:string;data:unknown}[];
  flush:()=>Promise<unknown>;validate:()=>void;
}):Promise<void> {
  input.validate();
  // The caller supplies the effective native surface, excluding shadowed nodes.
  const context=contextFactIds(input.events(),input.sources.flatMap(source=>source.facts));
  const observed=input.sources.map(source=>({service:source.service,facts:source.facts.filter(fact=>context.has(JSON.stringify([fact.domain,fact.id])))}));
  if(!observed.some(source=>source.facts.length))return;
  const persisted=await input.flush();
  if(persisted!==true)throw Error('Native session has no durable persistence participant; interaction facts retained');
  input.validate();
  for(const source of observed) {
    input.validate();
    if(source.facts.length)await source.service.acknowledgeFacts(input.workspaceId,source.facts.map(fact=>fact.id));
  }
}
