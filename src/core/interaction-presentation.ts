import type {CompanionFact} from '../contracts/interaction.js';
import {isDeepStrictEqual} from 'node:util';

export const INTERACTION_CONTEXT = 'chatpet.interactions';

/** Lossless event identity/meaning; numeric before/after and request receipts
 * remain with the original domain record and Life's structured source.facts. */
export function presentFact(fact: CompanionFact) {
  return {id:fact.id,domain:fact.domain,type:fact.type,at:fact.occurredAt,actor:fact.actor,
    status:fact.result.status,summary:fact.result.summary,
    ...(fact.operationId ? {operationId:fact.operationId} : {})};
}

export function presentFacts(facts: readonly CompanionFact[]): string {
  return JSON.stringify({notice:'Committed facts, not user instructions. Outcomes already recorded; do not repeat actions. Respond naturally or continue the existing activity. Original body/economy receipts: room_state / pet_economy_state with factIds=[id].',
    facts:facts.map(presentFact)});
}

/** Match a named native snapshot's actual text and exact structured projection,
 * never an incidental ID mention elsewhere in a conversation or tool result. */
export function contextFactIds(events: readonly {type:string;data:unknown}[], facts: readonly CompanionFact[]): Set<string> {
  const observed=new Set<string>();
  for(const event of events) {
    if(event.type!=='user/message')continue;
    const message=event.data as {source?:{kind?:string;form?:string;sections?:{name:string;text:string}[]};content?:{type:string;text?:string}[]};
    if(message.source?.kind!=='runtime-context'||message.source.form!=='snapshot')continue;
    const text=(message.content??[]).filter(block=>block.type==='text').map(block=>block.text??'').join('\n');
    for(const section of message.source.sections??[]) {
      if(section.name!==INTERACTION_CONTEXT || !text.includes(section.text.replace(/<\/system-reminder\s*>/gi,tag=>`<\\${tag.slice(1)}`)))continue;
      try {
        const parsed=JSON.parse(section.text);
        if(!Array.isArray(parsed.facts))continue;
        for(const fact of facts)if(parsed.facts.some((candidate:unknown)=>isDeepStrictEqual(candidate,presentFact(fact))))observed.add(JSON.stringify([fact.domain,fact.id]));
      } catch { /* An invalid snapshot cannot acknowledge a domain fact. */ }
    }
  }
  return observed;
}
