import assert from 'node:assert/strict';
import {isAbsolute,resolve} from 'node:path';

// Mirror the actual CoreConfig surface. Model routes belong to native DSH,
// and binding selection belongs to the saved workspace preferences.
const fields=Object.freeze(['dataDir','companionId','scopeId','ownerActorId','displayName','character','conversation','memory']);

/** Combine trusted setup layers without reviving retired Core driver fields. */
export function prepareCoreConfiguration(...layers) {
  const result={};
  for(const layer of layers) {
    if(layer===undefined)continue;
    assert.ok(layer&&typeof layer==='object'&&!Array.isArray(layer),'Core configuration must be an object');
    for(const key of fields)if(Object.hasOwn(layer,key)&&layer[key]!==undefined)result[key]=structuredClone(layer[key]);
  }
  if(result.conversation&&typeof result.conversation==='object'&&!Array.isArray(result.conversation))
    delete result.conversation.maxHistoryMessages;
  return result;
}

/** Trusted setup supplies verified bundled entry paths. An unproven inherited
 * host program is neither silently executed nor silently replaced. */
export function prepareMemoryServiceEntry(memory,{choice,managedEntries=[]}={}) {
  if(!memory) {
    assert.ok(choice===undefined || choice==='bundled','Configure Memory before selecting a custom service entry');
    return undefined;
  }
  const next=structuredClone(memory),entry=next.serviceEntry;
  if(choice!==undefined) {
    assert.ok(typeof choice==='string' && choice,'Provide --memory-service-entry bundled or an absolute custom entry');
    if(choice==='bundled')delete next.serviceEntry;
    else {assert.ok(isAbsolute(choice),'Memory service entry must be an absolute custom path or bundled');next.serviceEntry=resolve(choice);}
    return next;
  }
  if(entry===undefined || entry===null || entry==='') {delete next.serviceEntry;return next;}
  assert.ok(typeof entry==='string' && isAbsolute(entry),'Inherited Memory service entry must be absolute; select --memory-service-entry explicitly');
  assert.ok(managedEntries.some(path=>resolve(path)===resolve(entry)),
    `Inherited Memory service entry is not a verified bundled program: ${entry}; select --memory-service-entry bundled or an absolute custom entry explicitly`);
  delete next.serviceEntry;
  return next;
}
