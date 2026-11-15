/** Read-only model projections. Full views and all domain/runtime state stay
 * unchanged; navigation IDs, needs, restrictions and operation outcomes survive. */
type View = Record<string, any>;
const omit=(value:View,keys:string[])=>Object.fromEntries(Object.entries(value).filter(([key])=>!keys.includes(key)));
export const stateViewParameter = {type:'string',enum:['overview','full'],description:'Autonomous turns default to overview; full returns the original complete state.'} as const;
export const factIdsParameter = {type:'array',items:{type:'string'},description:'Read 1–16 original committed interaction receipts by their exact fact IDs, including before/after values.'} as const;

export function roomOverview(state:View) {
  if(state.ok===false)return state;
  return {...omit(state,['layout','her','events','room']),view:'overview',
    layout:{rooms:(state.layout?.rooms??[]).map(({id,name}:View)=>({id,name})),
      spots:Object.fromEntries(Object.entries(state.layout?.spots??{}).map(([room,spots])=>[room,
        Object.fromEntries(Object.entries(spots as View).map(([id,spot])=>[id,{label:(spot as View).label}]))]))},
    her:state.her?omit(state.her,['pos','facing','elev','runStyle','speed','route']):state.her,
    room:state.room?omit(state.room,['events']):state.room,
    details:{tool:'room_state',view:'full'}};
}

export function gardenOverview(state:View) {
  if(state.ok===false||!state.garden)return state;
  const garden=state.garden,care=garden.care;
  return {...state,view:'overview',garden:{...omit(garden,['plots','care','log']),
    economyConfig:garden.economyConfig?{...garden.economyConfig,crops:garden.economyConfig.crops?.map((crop:View)=>omit(crop,['icon','color','type']))}:garden.economyConfig,
    emptyPlotDefaults:{progress:0,moisture:0,fertilized:false,plantedAt:null,mature:false,stage:0,remainingMs:0,waterRemainingMs:0,needsWater:false,expectedYield:0},
    plots:(garden.plots??[]).map((plot:View)=>plot.cropId?plot:Object.fromEntries(Object.entries(plot).filter(([key,value])=>{
      const defaults:View={progress:0,moisture:0,fertilized:false,plantedAt:null,mature:false,stage:0,remainingMs:0,waterRemainingMs:0,needsWater:false,expectedYield:0};
      return !(key in defaults)||value!==defaults[key];
    }))),
    care:care?{...omit(care,['receipts','recent','character','nextId','rotation']),
      // Preserve every failed result and its identity; successful history is
      // available in the complete view rather than repeated in every query.
      failures:(care.receipts??[]).filter((row:View)=>row.status!=='completed').map((row:View)=>omit(row,['fingerprint'])),
      lastReceipt:care.receipts?.at(-1)??null}:care},details:{tool:'room_garden',type:'state',view:'full'}};
}
