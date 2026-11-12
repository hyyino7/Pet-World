import { behaviorPresentation } from '../../behavior/presentation.js';

/** Semantic exclusions from the shipped catalogue; these clips assert a physical activity. */
export const eatingClips = new Set([
  '偷吃零食被抓住','中秋赏月吃月饼','吃Token','吃冰淇淋融化','吃午餐','吃大闸蟹',
  '吃年糕','吃早餐','吃晚餐','吃汤圆','吃白饭','吃粽子','吃糖葫芦','吃腊八粥',
  '吃西瓜','吃重阳糕','吃长寿面','吃青团','吃饭·碗饭','吃饭团','吃饺子','大口吃零食','涮火锅',
]);
export const sleepingClips=new Set(['睡觉-开始','睡觉-循环','原地小憩沉眠']);
export const physicalClips=new Set([...eatingClips,...sleepingClips,'睡觉-起来','打瞌睡被惊醒','晨间刷牙']);
export function activityPresentation(state:any, expression?:string) {
  const semantic=behaviorPresentation(state,expression ? {sessionId:'',turn:0,action:expression} : undefined);
  const actions:Record<string,string>={sleep:'睡觉-循环',walk:'开心小跑',eat:'吃饭·碗饭',react_happy:'点击回应-开心跃动',react_pout:'点击回应-傲娇生气',idle_look:'东张西望',
    'emotion/happy':'点击回应-开心跃动','emotion/anger':'点击回应-傲娇生气','emotion/boredom':'悠闲哼歌'};
  const action=semantic.action==='expression' ? expression ?? semantic.expression?.action : actions[semantic.action];
  return {exclusive:semantic.exclusive,action:action || (semantic.exclusive ? '待机呼吸休闲' : undefined),
    notice:semantic.fallback ? [semantic.activity,semantic.emotionLabel].filter(Boolean).join(' · ') : undefined};
}
/** A renderer-only projection. Never return this from the configuration editor's read endpoint. */
export function projectActivityConfig(config:any,state:any,expression?:string) {
  if(!state)return config;
  const projected=structuredClone(config), presentation=activityPresentation(state,expression);
  for(const [root,entry] of Object.entries(projected) as [string,any][]) {
    if(!entry.animations)continue;
    const animations=entry.animations;
    const selected=root==='main' ? presentation.action : animations.idle[0];
    if(presentation.exclusive && selected) {
      // Unknown packs keep valid local clips and receive the semantic activity as text.
      animations.idle=[selected];animations.turn=[selected];
      animations.clicks=[selected];animations.categories=[];
      animations.moves={...animations.moves,actions:[]};
      animations.events=Object.fromEntries(Object.entries(animations.events ?? {}).map(([key,slots])=>[key,(slots as any[]).map(()=>selected)]));
      if(animations.baifan)animations.baifan=animations.baifan.map(()=>selected);
      entry.animationWeights={idle:100,turn:0,move:0};
      for(const pet of entry.pets ?? [])pet.workStatusEnabled=false;
    } else if(root==='main') {
      // Preserve cosmetic variety and movement while excluding false eating/sleeping facts.
      const safe=(names:string[])=>names.filter(name=>!physicalClips.has(name));
      animations.idle=safe(animations.idle);if(!animations.idle.length)animations.idle=['待机呼吸休闲'];
      animations.turn=safe(animations.turn);animations.clicks=safe(animations.clicks);
      animations.categories=animations.categories.map((category:any)=>({...category,actions:safe(category.actions)})).filter((category:any)=>category.actions.length);
    }
  }
  return projected;
}
