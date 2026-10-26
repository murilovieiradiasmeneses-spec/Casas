/* Minimal standards-compliant ZIP store writer; avoids a new runtime dependency.
   Passwords and auth tokens are never included. Uses no compression to preserve exact bytes. */
export interface ZipEntry { path: string; data: Uint8Array | string; }

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let k=0;k<8;k++) crc = (crc>>>1) ^ ((crc&1)?0xedb88320:0);
  }
  return (crc^0xffffffff)>>>0;
}
function dosDateTime(now:Date) {
  const year=Math.max(1980,now.getFullYear());
  const date=((year-1980)<<9)|((now.getMonth()+1)<<5)|now.getDate();
  const time=(now.getHours()<<11)|(now.getMinutes()<<5)|(now.getSeconds()>>1);
  return {date,time};
}
function header(size:number) {
  return new DataView(new ArrayBuffer(size));
}
const asArray=(v:DataView)=>v.buffer as ArrayBuffer;
const utf8 = new TextEncoder();

export function createZip(entries:ZipEntry[]):Blob {
  const parts:BlobPart[]=[];
  const central:BlobPart[]=[];
  const stamp=dosDateTime(new Date());
  let offset=0,centralSize=0;
  const known=new Set<string>();
  if(entries.length>65535)throw Error("Backup excede o limite de arquivos suportado.");
  for(const file of entries){
    const name=file.path.replace(/\\/g,"/");
    if(!name || name.includes("..")||name.startsWith("/")||/[\u0000-\u001f]/.test(name))
      throw Error("Caminho inválido no backup: "+name);
    if(known.has(name))throw Error("Arquivo duplicado no backup: "+name);
    known.add(name);
    const nameBytes=utf8.encode(name);
    if(nameBytes.length>65535)throw Error("Nome de arquivo muito longo.");
    const data=typeof file.data==="string"?utf8.encode(file.data):file.data;
    if(data.length>=0xffffffff)throw Error("Um dos arquivos excede 4 GB.");
    const crc=crc32(data);
    const local=header(30);
    local.setUint32(0,0x04034b50,true);
    local.setUint16(4,20,true);
    local.setUint16(6,0x0800,true); // UTF-8
    local.setUint16(8,0,true); // no compression
    local.setUint16(10,stamp.time,true);local.setUint16(12,stamp.date,true);
    local.setUint32(14,crc,true);
    local.setUint32(18,data.length,true);local.setUint32(22,data.length,true);
    local.setUint16(26,nameBytes.length,true);
    local.setUint16(28,0,true);
    parts.push(asArray(local),nameBytes.slice().buffer as ArrayBuffer,data.slice().buffer as ArrayBuffer);
    const c=header(46);
    c.setUint32(0,0x02014b50,true);
    c.setUint16(4,20,true);c.setUint16(6,20,true);
    c.setUint16(8,0x0800,true);
    c.setUint16(10,0,true);
    c.setUint16(12,stamp.time,true);c.setUint16(14,stamp.date,true);
    c.setUint32(16,crc,true);
    c.setUint32(20,data.length,true);c.setUint32(24,data.length,true);
    c.setUint16(28,nameBytes.length,true);
    c.setUint16(30,0,true);c.setUint16(32,0,true);
    c.setUint16(34,0,true);c.setUint16(36,0,true);
    c.setUint32(38,0,true);
    c.setUint32(42,offset,true);
    central.push(asArray(c),nameBytes.slice().buffer as ArrayBuffer);
    const localSize=30+nameBytes.length+data.length;
    offset+=localSize;
    centralSize+=46+nameBytes.length;
    if(offset>=0xffffffff)throw Error("Backup grande demais para este formato ZIP.");
  }
  if(centralSize>=0xffffffff)throw Error("Diretório ZIP grande demais.");
  const end=header(22);
  end.setUint32(0,0x06054b50,true);
  end.setUint16(4,0,true);end.setUint16(6,0,true);
  end.setUint16(8,entries.length,true);end.setUint16(10,entries.length,true);
  end.setUint32(12,centralSize,true);end.setUint32(16,offset,true);
  end.setUint16(20,0,true);
  return new Blob([...parts,...central,asArray(end)],{type:"application/zip"});
}
