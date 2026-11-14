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

/** Native scoped restrictions have exact disposers; ordinary turns are restored. */
export function restrictLifeTools(
  scoped:{restrict(filter:{allow:readonly string[]}):()=>void}, globalNames:readonly string[], review=false,
):()=>void {
  return scoped.restrict({allow:globalNames.filter(name=>lifeToolAllowed(name,review))});
}
