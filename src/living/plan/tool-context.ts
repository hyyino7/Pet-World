/** Keep the complete accepted intent, activity IDs, execution receipt and all
 * remaining steps. Only duplicated storage identity and bookkeeping are omitted. */
export function planOverview<T extends {plan:object|null}>(state:T) {
  if(!state.plan)return {...state,view:'overview'};
  const {version,companionId,storageId,createdAt,updatedAt,...plan}=state.plan as Record<string,unknown>;
  return {...state,plan,view:'overview',details:{tool:'life_plan_read',view:'full'}};
}
