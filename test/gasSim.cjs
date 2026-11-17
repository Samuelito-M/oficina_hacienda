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
 Utilities:{getUuid:()=>crypto.randomUUID(),computeHmacSha256Signature:(t,k)=>Array.from(crypto.createHmac('sha256',k).update(t).digest()),base64EncodeWebSafe:b=>Buffer.from(b).toString('base64').replace(/\+/g,'-').replace(/\//g,'_')},
 LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock(){}})},
 SpreadsheetApp:{getActiveSpreadsheet:()=>({getId:()=>'LIBRO',getSheetByName:n=>sheets[n]||null,insertSheet:n=>mkSheet(n)})},
 DriveApp:{getFileById:id=>({makeCopy:(n,c)=>{const f={n,creado:new Date(Date.now()+drive.files.length),borrado:false,getDateCreated(){return this.creado},setTrashed(v){this.borrado=v}};c.files.push(f);drive.files.push(f);return f}}),
  getFoldersByName:n=>{const l=drive.folders.filter(f=>f.n===n);let i=0;return{hasNext:()=>i<l.length,next:()=>l[i++]}},
  createFolder:n=>{const f={n,files:[],getFiles(){const l=this.files.filter(x=>!x.borrado);let i=0;return{hasNext:()=>i<l.length,next:()=>l[i++]}}};drive.folders.push(f);return f}},
 ScriptApp:{WeekDay:{SUNDAY:'SUNDAY'},getProjectTriggers:()=>drive.triggers.slice(),deleteTrigger:t=>{drive.triggers.splice(drive.triggers.indexOf(t),1)},
  newTrigger:h=>{const b={timeBased:()=>b,everyWeeks:()=>b,onWeekDay:()=>b,atHour:()=>b,create:()=>{const t={getHandlerFunction:()=>h};drive.triggers.push(t);return t}};return b}},
 Date:class extends Date{static now(){return now??super.now()}},JSON,String,Number,Array,Error,Math,Object};
vm.createContext(ctx);vm.runInContext(fs.readFileSync(codigo,'utf8'),ctx);
return {ctx,props,cache,sheets,drive,mkSheet,setNow:v=>{now=v},call:d=>JSON.parse(ctx.doPost({postData:{contents:typeof d==='string'?d:JSON.stringify(d)}}).t)};
};
