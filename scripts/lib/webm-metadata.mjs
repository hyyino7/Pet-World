// Source-only build metadata reader. It never decodes or inspects frame data.
// EBML IDs, size VINTs and big-endian floats: https://www.rfc-editor.org/rfc/rfc8794.html
// Info/Duration/TimestampScale: https://www.matroska.org/technical/elements.html
const EBML=0x1a45dfa3,SEGMENT=0x18538067,INFO=0x1549a966;
const DURATION=0x4489,TIMESTAMP_SCALE=0x2ad7b1,VOID=0xec,CRC32=0xbf;
const MAX_ELEMENTS=4096;

export function webmDurationMs(bytes,label='buffer') {
  const fail=message=>{throw Error('Invalid WebM metadata ('+label+'): '+message);};
  if(!Buffer.isBuffer(bytes))fail('expected a Buffer');
  let elements=0;
  function vint(at,end,isId) {
    if(at>=end)fail('truncated VINT');
    const first=bytes[at];
    let width=1,marker=0x80;
    while(width<=8&&!(first&marker)){width++;marker>>=1;}
    if(width>(isId?4:8))fail('invalid '+(isId?'ID':'size')+' VINT');
    if(width>end-at)fail('truncated VINT');
    let value=BigInt(first&(marker-1));
    for(let i=1;i<width;i++)value=value*256n+BigInt(bytes[at+i]);
    const maximum=(1n<<BigInt(7*width))-1n;
    if(isId){
      if(value===0n||value===maximum||width>1&&value<((1n<<BigInt(7*(width-1)))-1n))fail('invalid element ID');
      return {width,value:Number(value+(1n<<BigInt(7*width)))};
    }
    return {width,value,unknown:value===maximum};
  }
  function element(at,end,allowUnknownSegment=false) {
    if(++elements>MAX_ELEMENTS)fail('element limit exceeded');
    const id=vint(at,end,true),size=vint(at+id.width,end,false);
    const start=at+id.width+size.width;
    if(size.unknown){
      if(!allowUnknownSegment||id.value!==SEGMENT)fail('unsupported unknown element size');
      return {id:id.value,start,end};
    }
    if(size.value>BigInt(end-start))fail('element exceeds container (truncated data)');
    return {id:id.value,start,end:start+Number(size.value)};
  }
  function duration(info) {
    let ticks,scale=1_000_000,hasScale=false;
    for(let at=info.start;at<info.end;){
      const item=element(at,info.end),size=item.end-item.start;
      if(item.id===DURATION){
        if(ticks!==undefined)fail('duplicate Duration');
        if(size!==4&&size!==8)fail('Duration must contain a 4- or 8-byte float');
        ticks=size===4?bytes.readFloatBE(item.start):bytes.readDoubleBE(item.start);
        if(!Number.isFinite(ticks)||ticks<=0)fail('Duration must be positive and finite');
      }else if(item.id===TIMESTAMP_SCALE){
        if(hasScale)fail('duplicate TimestampScale');
        hasScale=true;
        if(size>8)fail('invalid TimestampScale length');
        // An empty unsigned element uses its schema default (RFC 8794, 7.2).
        if(size){
          let value=0n;
          for(let i=item.start;i<item.end;i++)value=value*256n+BigInt(bytes[i]);
          if(value===0n||value>BigInt(Number.MAX_SAFE_INTEGER))fail('invalid TimestampScale');
          scale=Number(value);
        }
      }
      // Only direct Info children count. Other payloads are opaque, including
      // byte sequences that resemble Info/Duration inside a title or CRC.
      at=item.end;
    }
    if(ticks===undefined)fail('missing Duration in Info');
    const milliseconds=ticks*(scale/1_000_000);
    if(!Number.isFinite(milliseconds)||milliseconds<=0||milliseconds>Number.MAX_SAFE_INTEGER)fail('duration is outside the supported range');
    return milliseconds;
  }
  const header=element(0,bytes.length);
  if(header.id!==EBML)fail('missing EBML header');
  let result,hasSegment=false;
  for(let at=header.end;at<bytes.length;){
    const item=element(at,bytes.length,true);
    if(item.id===SEGMENT){
      if(hasSegment)fail('multiple Segments are unsupported');
      hasSegment=true;
      for(let childAt=item.start;childAt<item.end;){
        const child=element(childAt,item.end);
        if(child.id===INFO){
          if(result!==undefined)fail('duplicate Info');
          result=duration(child);
        }
        // SeekHead, Tracks, Clusters, Cues and all other payloads are skipped
        // by their declared boundary; no frame or fake Info bytes are scanned.
        childAt=child.end;
      }
    }else if(item.id!==VOID&&item.id!==CRC32)fail('unexpected root element');
    at=item.end;
  }
  if(!hasSegment)fail('missing Segment');
  if(result===undefined)fail('missing Info/Duration');
  return result;
}
