import { CROPS } from '#feiyu-garden';
import { digest } from '../../core/storage.js';
import type { CatalogItem, EconomyConfiguration, ReadingContent } from './types.js';

/** Original texts are products, never preset biography, memories or completed experiences. */
const originalTexts = [
  {itemId:'reading:window-and-rain',title:'窗边的一场雨',text:'雨先落在远处的屋顶上，细细的声音一层层靠近窗边。窗沿的小水珠汇在一起，停了一会儿，终于沿着玻璃滑下去。屋里的杯子还带着一点热气，桌面上留着半页没有读完的文字。\n\n人有时会想把一天安排得满满的，好像只有每一刻都有用处，这一天才算没有白过。可雨从不催促。它把路面洗亮，把叶子的颜色洗深，也给匆忙的行人留下一小段避雨的时间。等待本身，似乎也能成为一天的一部分。\n\n等雨小一些，窗外传来车轮经过积水的声音。书页还停在原处，杯子也还是那只杯子。变化并不总要轰轰烈烈；偶尔，它只是让眼前熟悉的东西，重新有了值得留意的细节。'},
  {itemId:'reading:small-garden-notes',title:'小园观察札记',text:'观察一座小园子，可以从不急着伸手开始。先看看土表的颜色，再看叶片有没有失去精神。相同的植物在不同的位置，接受的光和风也会不同；昨天合适的照料，今天未必需要重复。\n\n水并不是越多越好。土壤需要留出空气的位置，根也需要呼吸。一回恰当的浇水，往往比反复补上一点点更有帮助。不过，具体的植物仍有各自的习性，判断应当回到真实的土壤和叶片。\n\n记录可以很简单：何时观察、看到了什么、做了什么。几天以后再读，才容易把猜测与变化分开。收获固然令人高兴，留心一片新叶慢慢展开，也是一种可以独自拥有的乐趣。'},
];

export const ORIGINAL_READINGS: readonly ReadingContent[] = Object.freeze(originalTexts.map(row => ({
  itemId:row.itemId,title:row.title,text:row.text,version:digest(row.text),source:{kind:'original' as const,name:'大肥鱼项目原创短文'},
})));

export function defaultEconomyConfiguration(): EconomyConfiguration {
  return {version:1,revision:1,dailyNetReference:50,articlePrice:20,bookPrice:20,improvedMealPrice:10,
    // Sowing's existing 0.8 moisture covers one crop cycle at this default;
    // a short watering timer must not force extra visits to meet the income reference.
    compostCost:8,waterDurationFactor:1.25,fertilizerGrowth:1.2,fertilizerYield:2,
    crops:Object.fromEntries((CROPS as any[]).map((crop,index)=>[crop.id,{
      growMs:(12+index)*60*60*1000,seedCost:Math.round(9-50*(12+index)/24/8),sellPrice:3,yield:3,
    }])),itemPrices:{},catalogEnabled:{},foodEffects:{'food:improved-meal':{hunger:-0.52,energy:0.08}}};
}

/** Old owner-entered return values remain in storage until an explicit edit,
 * but only game rules price sales and new crop yields. Existing cropProfile
 * receipts remain in Garden and are deliberately not rewritten here. */
export function effectiveEconomyConfiguration(saved: EconomyConfiguration): EconomyConfiguration {
  const fixed=defaultEconomyConfiguration();
  return {...saved,dailyNetReference:fixed.dailyNetReference,fertilizerYield:fixed.fertilizerYield,
    crops:Object.fromEntries(Object.entries(saved.crops).map(([id,crop])=>[id,{...crop,
      sellPrice:fixed.crops[id]?.sellPrice??crop.sellPrice,yield:fixed.crops[id]?.yield??crop.yield}])),
    itemPrices:Object.fromEntries(Object.entries(saved.itemPrices).filter(([id])=>!id.startsWith('harvest:'))
      .map(([id,price])=>[id,{purchasePrice:price.purchasePrice,sellPrice:null}])),
    catalogEnabled:Object.fromEntries(Object.entries(saved.catalogEnabled).filter(([id])=>!id.startsWith('harvest:')))};
}

export function economyCatalog(configuration: EconomyConfiguration, readings: readonly ReadingContent[] = ORIGINAL_READINGS): CatalogItem[] {
  configuration=effectiveEconomyConfiguration(configuration);
  const rows: CatalogItem[] = (CROPS as any[]).flatMap(crop=>{
    const settings=configuration.crops[crop.id];
    return [{id:`seed:${crop.id}`,kind:'seed' as const,name:`${crop.name}种子`,description:crop.description,
      purchasePrice:settings.seedCost,sellPrice:null,consumable:true,cropId:crop.id,enabled:true},
    {id:`harvest:${crop.id}`,kind:'harvest' as const,name:crop.name,description:'实际收获后进入统一库存的作物。',
      purchasePrice:null,sellPrice:settings.sellPrice,consumable:false,cropId:crop.id,enabled:true}];
  });
  rows.push({id:'compost',kind:'compost',name:'堆肥',description:'用于已有菜园的单茬施肥。',purchasePrice:configuration.compostCost,sellPrice:null,consumable:true,enabled:true},
    {id:'food:improved-meal',kind:'food',name:'改善餐',description:'在免费基础饭水以外自选的一份餐食，使用后由共享身体实际执行进食。',
      purchasePrice:configuration.improvedMealPrice,sellPrice:null,consumable:true,bodyAction:'feed',presentationSlot:'food.lunch',enabled:true,effects:configuration.foodEffects['food:improved-meal']});
  for(const reading of readings)rows.push({id:reading.itemId,kind:'reading',name:reading.title,
    description:reading.source.kind==='original'?'原创短文，购买后可分段阅读并保留书签。':'主人导入的纯文本，购买后可分段阅读并保留书签。',
    purchasePrice:reading.format==='book'?configuration.bookPrice:configuration.articlePrice,sellPrice:null,consumable:false,contentVersion:reading.version,source:reading.source,enabled:true});
  return rows.map(row=>({...row,...configuration.itemPrices[row.id],enabled:configuration.catalogEnabled[row.id]??true}));
}
