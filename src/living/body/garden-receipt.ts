/** Only program-owned caretaker fields may enter this projection. Historical
 * source bytes, owner text, plan goals and companion dialogue stay unchanged. */
export function gardenReceiptText(text: string): string {
  if(text.startsWith('小蓝鱼：'))return text.slice('小蓝鱼：'.length);
  if(text.startsWith('小蓝鱼正在'))return text.slice('小蓝鱼'.length);
  if(text==='小蓝鱼会自己安排照料菜园')return '将自主安排照料菜园';
  if(text==='自主照料已暂停，你仍可请小蓝鱼完成指定操作')return '自主照料已暂停，仍可明确安排指定操作';
  return text.replace(/^(已记下(?:松土|播种|浇水|施肥|采收|出售收成|购买种子|补充堆肥|巡视菜园))，小蓝鱼会走到现场完成；完成后才会结算$/,
    '$1，将走到现场完成；完成后才会结算');
}

/** Copy only typed garden event/display fields; never normalize the saved Body. */
export function gardenHomeProjection<T extends {activity?:string;eventLog?:{type:string;text:string}[]}>(state:T):T {
  const latest=state.eventLog?.at(-1);
  const activity=state.activity && latest?.type==='garden' && latest.text===state.activity
    ? gardenReceiptText(state.activity) : state.activity;
  return {...state,...(activity!==undefined?{activity}:{}),
    ...(state.eventLog?{eventLog:state.eventLog.map(event=>event.type==='garden'?{...event,text:gardenReceiptText(event.text)}:event)}:{})};
}

/** Garden's current view can retain old receipts after an update. Keep the raw
 * domain archive intact while presenting the same role-neutral result. */
export function gardenReceiptProjection<T extends {care?:{status:string;receipts?:{message:string}[];recent?:{message:string}[]}}>(garden:T):T {
  if(!garden?.care)return garden;
  const care=garden.care;
  return {...garden,care:{...care,status:gardenReceiptText(care.status),
    ...(care.receipts?{receipts:care.receipts.map(receipt=>({...receipt,message:gardenReceiptText(receipt.message)}))}:{}),
    ...(care.recent?{recent:care.recent.map(event=>({...event,message:gardenReceiptText(event.message)}))}:{})}};
}
