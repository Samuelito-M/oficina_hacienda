const fs=require('fs'),vm=require('vm'),crypto=require('crypto');
module.exports=function crear(codigo){
const props={},cache={},sheets={},drive={files:[],folders:[],triggers:[]};let now=null;
function mkSheet(name){const rows=[];const sh={rows,getLastRow:()=>rows.length,getLastColumn:()=>rows.reduce((m,r)=>Math.max(m,r.length),0),getMaxRows:()=>1000,
 getRange(r,c,nr,nc){if(typeof r==='string')return{setNumberFormat(){return this}};nr=nr||1;nc=nc||1;const self={
  setValues(v){v.forEach((row,i)=>{const R=r-1+i;rows[R]=rows[R]||[];row.forEach((x,j)=>{rows[R][c-1+j]=x})});return{setFontWeight(){}}},
  setValue(x){rows[r-1]=rows[r-1]||[];rows[r-1][c-1]=x;return{setFontWeight(){}}},
  setNumberFormat(){return self},setFontWeight(){return self},
  getDisplayValues(){const out=[];for(let i=0;i<nr;i++){const row=rows[r-1+i]||[];const o=[];for(let j=0;j<nc;j++)o.push(row[c-1+j]==null?'':String(row[c-1+j]));out.push(o)}return out}};return self},
 setFrozenRows(){},appendRow(v){rows.push(v.slice())},deleteRow(i){rows.splice(i-1,1)}};sheets[name]=sh;return sh}
const ctx={ContentService:{createTextOutput:t=>({t,setMimeType(){return this}}),MimeType:{JSON:'json'}},
 PropertiesService:{getScriptProperties:()=>({getProperty:k=>props[k]??null,setProperty:(k,v)=>{props[k]=v}})},
 CacheService:{getScriptCache:()=>({get:k=>cache[k]??null,put:(k,v)=>{cache[k]=v}})},
 Utilities:{getUuid:()=>crypto.randomUUID(),newBlob:(bytes,mime,nombre)=>({bytes,mime,nombre}),base64Decode:t=>Array.from(Buffer.from(t,'base64')),base64Encode:b=>Buffer.from(b).toString('base64'),computeHmacSha256Signature:(t,k)=>Array.from(crypto.createHmac('sha256',k).update(t).digest()),base64EncodeWebSafe:b=>Buffer.from(b).toString('base64').replace(/\+/g,'-').replace(/\//g,'_')},
 LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock(){}})},
 SpreadsheetApp:{getActiveSpreadsheet:()=>({getId:()=>'LIBRO',getSheetByName:n=>sheets[n]||null,insertSheet:n=>mkSheet(n)})},
 DriveApp:(()=>{let seq=0;const items=drive.items={};
  const nuevoId=()=>'ID'+String(++seq).padStart(22,'0');
  const hijos=(id,tipo)=>Object.values(items).filter(x=>x.padres.includes(id)&&(!tipo||x.tipo===tipo));
  const iter=l=>{let i=0;return{hasNext:()=>i<l.length,next:()=>l[i++]}};
  const envolver=it=>{if(!it)throw new Error('No se encontró el elemento');const o={getId:()=>it.id,getName:()=>it.n,setName:n=>{it.n=n;return o},isTrashed:()=>it.borrado,setTrashed:v=>{it.borrado=v;return o},getUrl:()=>'https://drive.google.com/drive/folders/'+it.id,
   getDateCreated:()=>it.creado,getParents:()=>iter(it.padres.map(pid=>envolver(items[pid]))),moveTo:dest=>{it.padres=[dest.getId()];return o},
   getBlob:()=>({getBytes:()=>Array.from(it.tipo==='atajo'?items[it.destino].bytes:it.bytes)}),getTargetId:()=>it.destino,
   createFolder:n=>{if(it.soloLectura)throw new Error('Acceso denegado: DriveApp.');return envolver(crear('carpeta',n,[it.id]))},
   getFoldersByName:n=>iter(hijos(it.id,'carpeta').filter(x=>x.n===n).map(envolver)),getFolders:()=>iter(hijos(it.id,'carpeta').filter(x=>!x.borrado).map(envolver)),
   getFiles:()=>iter(hijos(it.id).filter(x=>x.tipo!=='carpeta'&&!x.borrado).map(envolver)),
   createFile:b=>envolver(Object.assign(crear('archivo',b.nombre,[it.id]),{bytes:b.bytes,mime:b.mime})),
   createShortcut:tid=>{if(!items[tid])throw new Error('destino');return envolver(Object.assign(crear('atajo',items[tid].n,[it.id]),{destino:tid}))},
   makeCopy:(n,c)=>{const x=crear('archivo',n,[c.getId()]);x.bytes=[];drive.files.push(envolver(x));return envolver(x)}};return o};
  const crear=(tipo,n,padres)=>{const x={id:nuevoId(),tipo,n,padres,borrado:false,creado:new Date(Date.now()+seq)};items[x.id]=x;return x};
  items.LIBRO={id:'LIBRO',tipo:'archivo',n:'Libro',padres:[],borrado:false,bytes:[],creado:new Date()};
  drive.crearCarpeta=(n,opc)=>Object.assign(crear('carpeta',n,['MIUNIDAD']),opc||{}).id;
  drive.ver=id=>items[id];drive.hijos=hijos;
  return{getFileById:id=>envolver(items[id]&&items[id].tipo!=='carpeta'?items[id]:null),getFolderById:id=>envolver(items[id]&&items[id].tipo==='carpeta'?items[id]:null),
   getFoldersByName:n=>iter(Object.values(items).filter(x=>x.tipo==='carpeta'&&x.padres.includes('MIUNIDAD')&&x.n===n).map(envolver)),
   createFolder:n=>{const x=crear('carpeta',n,['MIUNIDAD']);const w=envolver(x);drive.folders.push(w);return w}}})(),
 ScriptApp:{WeekDay:{SUNDAY:'SUNDAY'},getProjectTriggers:()=>drive.triggers.slice(),deleteTrigger:t=>{drive.triggers.splice(drive.triggers.indexOf(t),1)},
  newTrigger:h=>{const b={timeBased:()=>b,everyWeeks:()=>b,onWeekDay:()=>b,atHour:()=>b,create:()=>{const t={getHandlerFunction:()=>h};drive.triggers.push(t);return t}};return b}},
 Date:class extends Date{static now(){return now??super.now()}},JSON,String,Number,Array,Error,Math,Object};
vm.createContext(ctx);vm.runInContext(fs.readFileSync(codigo,'utf8'),ctx);
return {ctx,props,cache,sheets,drive,mkSheet,setNow:v=>{now=v},call:d=>JSON.parse(ctx.doPost({postData:{contents:typeof d==='string'?d:JSON.stringify(d)}}).t)};
};
