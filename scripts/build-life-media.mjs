// Source-only conversion of reviewed six-frame transparent sprite sheets.
// Normal builds verify shipped output; they never download or run an encoder.
import {readFileSync,writeFileSync,mkdirSync,copyFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const project=resolve(import.meta.dirname,'..');
export const lifeMedia = [
  ['life-drink','生活-捧杯喝水','捧杯、小口喝水'],['life-read','生活-专心阅读','查看已提供正文，轻轻翻页'],
  ['life-garden-till','生活-松土','用小锄松土'],['life-garden-plant','生活-播种','把种子放入土中'],
  ['life-garden-water','生活-浇水','用水壶浇灌幼苗'],['life-garden-fertilize','生活-施肥','用小勺向土壤添加堆肥'],
  ['life-garden-harvest','生活-采收','把成熟蔬菜放入篮中'],['life-trade','生活-整理交易','查看篮中物品与交易钱袋'],
];
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export function verifyLifeMedia(root=project) {
  const metadata=JSON.parse(readFileSync(join(root,'src/desktop/assets/life-animations.json')));
  if(metadata.animations.length!==lifeMedia.length)throw Error('Incomplete life media inventory');
  const catalog=JSON.parse(readFileSync(join(root,'src/desktop/assets/catalog.json')));
  for(const [id,label] of lifeMedia){
    const entry=metadata.animations.find(x=>x.id===id),action=catalog.actions.find(x=>x.id===id);
    if(!entry||entry.label!==label||entry.file!==id+'.webm'||action?.file!==entry.file||action.label!==label||action.group!=='life')throw Error('Life media catalogue mismatch: '+id);
    const data=readFileSync(join(root,'src/desktop/assets',entry.file));
    if(hash(data)!==entry.sha256||data.length!==entry.bytes||data.length>1_000_000||data.readUInt32BE(0)!==0x1a45dfa3)throw Error('Invalid life media: '+id);
    const poster=readFileSync(join(root,'src/desktop/assets',entry.poster.file));
    if(entry.poster.file!==id+'.png'||hash(poster)!==entry.poster.sha256||poster.length!==entry.poster.bytes
      ||poster.readUInt32BE(16)!==640||poster.readUInt32BE(20)!==360||poster[25]!==6)throw Error('Invalid life poster: '+id);
  }
  return metadata;
}
function build() {
  const encoder=process.env.CHATPET_FFMPEG || 'ffmpeg';
  const output=join(project,'src/desktop/assets'),work=join(project,'.cache/life-media-20261114/frames');mkdirSync(work,{recursive:true});
  const run=args=>{const r=spawnSync(encoder,['-hide_banner','-loglevel','error','-y',...args],{encoding:'utf8',timeout:120000});if(r.status!==0)throw Error(r.stderr||String(r.error));};
  // Forward order matters: reverse playback would visually undo planting or
  // harvesting. Brief endpoint holds close the loop without inventing effects.
  const frames=[0,0,1,2,3,4,5,5],animations=[];
  for(const [id,label,description] of lifeMedia){
    const source=join(project,'art/life-animation-sources',id+'.png'),data=readFileSync(source);
    if(data.readUInt32BE(16)!==1536||data.readUInt32BE(20)!==1024||data[25]!==6)throw Error('Expected reviewed RGBA 3x2 sheet: '+id);
    const dir=join(work,id);mkdirSync(dir,{recursive:true});
    for(let i=0;i<6;i++)run(['-i',source,'-vf',`crop=512:512:${i%3*512}:${Math.floor(i/3)*512},scale=300:300:flags=lanczos,pad=640:360:170:50:color=black@0,format=rgba`,'-frames:v','1',join(dir,`pose-${i}.png`)]);
    frames.forEach((pose,i)=>copyFileSync(join(dir,`pose-${pose}.png`),join(dir,`frame-${String(i).padStart(2,'0')}.png`)));
    const file=id+'.webm',target=join(output,file);
    run(['-framerate','4','-i',join(dir,'frame-%02d.png'),'-frames:v',String(frames.length),'-an','-c:v','libvpx-vp9','-pix_fmt','yuva420p','-lossless','1','-b:v','0','-auto-alt-ref','0','-row-mt','1','-threads','2','-metadata:s:v:0','alpha_mode=1',target]);
    const poster=id+'.png';copyFileSync(join(dir,'pose-0.png'),join(output,poster));
    const bytes=readFileSync(target),posterBytes=readFileSync(join(output,poster));
    animations.push({id,label,file,poster:{file:poster,sha256:hash(posterBytes),bytes:posterBytes.length},description,width:640,height:360,fps:4,frames:frames.length,durationMs:2000,alpha:true,sha256:hash(bytes),bytes:bytes.length,sourceSha256:hash(data)});
  }
  writeFileSync(join(output,'life-animations.json'),JSON.stringify({version:1,provenance:'AI-generated with built-in image_gen; existing Xiaoxi cute.png identity reference; original attribution retained.',animations},null,2)+'\n');
  const catalogPath=join(output,'catalog.json'),catalog=JSON.parse(readFileSync(catalogPath));
  for(const entry of animations){const index=catalog.actions.findIndex(x=>x.id===entry.id);
    if(index>=0 && (catalog.actions[index].group!=='life'||catalog.actions[index].file!==entry.file))throw Error('Refuse conflicting life action '+entry.id);
    const next={id:entry.id,label:entry.label,description:entry.description,group:'life',file:entry.file};
    if(index>=0)catalog.actions[index]=next;else catalog.actions.push(next);}
  writeFileSync(catalogPath,JSON.stringify(catalog,null,2)+'\n');verifyLifeMedia();
  console.log(JSON.stringify({animations:animations.length,totalBytes:animations.reduce((n,x)=>n+x.bytes,0)}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  if(process.argv.includes('--verify'))console.log(JSON.stringify({verified:verifyLifeMedia().animations.length}));else build();
}
