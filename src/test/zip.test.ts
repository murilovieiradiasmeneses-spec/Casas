import { describe,expect,it } from "vitest";
import { createZip } from "@/lib/zip";
describe("CASAS full backup archive",()=>{
  it("builds a valid ZIP archive with manifest and media",async()=>{
    const zip=createZip([{path:"backup.json",data:'{"ok":true}'},{path:"imagens/a.jpg",data:new Uint8Array([1,2,3])}]);
    const bytes=new Uint8Array(await zip.arrayBuffer());
    const v=new DataView(bytes.buffer);
    expect(v.getUint32(0,true)).toBe(0x04034b50);
    expect(v.getUint32(bytes.length-22,true)).toBe(0x06054b50);
    expect(v.getUint16(bytes.length-12,true)).toBe(2);
  });
  it("rejects unsafe or repeated paths",()=>{
    expect(()=>createZip([{path:"../private.txt",data:"bad"}])).toThrow();
    expect(()=>createZip([{path:"a",data:"a"},{path:"a",data:"b"}])).toThrow();
  });
});
