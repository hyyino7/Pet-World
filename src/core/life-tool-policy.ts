/** Capability names, never phrase matching or command-string filtering. */
const lifeCapabilities = new Set([
  'life_plan_read','life_plan_update','life_plan_keep','life_activity_control',
  'life_read_segment','life_read_confirm','room_state','room_garden','pet_economy_state',
  'pet_memory_read','pet_memory_recall','pet_memory_remember',
  'pet_emotion_update',
  'plan_next','check_alarm','cancel_alarm','reach_out','keep_photo','list_photos','forget_photo',
  'read_review_dialogue',
]);

export function lifeToolAllowed(name:string,review=false):boolean {
  return lifeCapabilities.has(name) || review && (name==='read' || name==='write');
}

/** File tools belong to the native preset, not the global registry. Life only
 * registers its own domain tools locally: never pass those local names to
 * restrict(). Inspect the host service's views, keeping its scope identity. */
export function lifeInheritedToolNames<S>(
  tools:{definitions(scope?:S):readonly {name:string}[]}, agent:S, review=false,
):string[] {
  return [...new Set([
    ...tools.definitions().map(tool=>tool.name),
    ...(review?tools.definitions(agent).filter(tool=>tool.name==='read'||tool.name==='write').map(tool=>tool.name):[]),
  ])];
}

/** Native scoped restrictions have exact disposers; ordinary turns are restored. */
export function restrictLifeTools(
  scoped:{restrict(filter:{allow:readonly string[]}):()=>void}, inheritedNames:readonly string[], review=false,
):()=>void {
  return scoped.restrict({allow:inheritedNames.filter(name=>lifeToolAllowed(name,review))});
}
