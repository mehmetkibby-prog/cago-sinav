"use strict";

const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const quality=require("../www/real2026-quality.js");

const element={
  classList:{toggle(){},add(){},remove(){},contains(){return false}},
  setAttribute(){},addEventListener(){},querySelector(){return element},querySelectorAll(){return []},
  style:{},dataset:{},appendChild(){},remove(){},focus(){},textContent:"",innerHTML:"",onclick:null
};
const memory=new Map([["apiKey",JSON.stringify("sk-test-only")]]);let apiCalls=0;
const context={
  console,Real2026Quality:quality,globalThis:null,window:null,
  document:{querySelector(){return element},querySelectorAll(){return []},createElement(){return {...element,click(){}}}},
  localStorage:{getItem(key){return memory.has(key)?memory.get(key):null},setItem(key,value){memory.set(key,value)}},
  fetch(url,options={}){
    if(!String(url).includes("api.openai.com"))return new Promise(()=>{});
    apiCalls++;
    return new Promise((_,reject)=>options.signal?.addEventListener("abort",()=>{const error=new Error("aborted");error.name="AbortError";reject(error)},{once:true}));
  },
  navigator:{},URL,Blob,confirm(){return true},AbortController,
  setTimeout,clearTimeout,setInterval(){},clearInterval(){},Date,Math,Promise,Map,Set,Array,Object,String,Number,Boolean,JSON,RegExp,Error
};
context.globalThis=context;context.window=context;vm.createContext(context);
vm.runInContext(fs.readFileSync(require.resolve("../www/app.js"),"utf8"),context);

function evaluate(source){return vm.runInContext(source,context)}

(async()=>{
  const started=Date.now();
  await assert.rejects(
    evaluate(`openAIWebText("zaman aşımı testi","",{webSearch:false,timeoutMs:60,networkAttempts:1})`),
    /tamamlanamadı/,
    "Yanıt vermeyen API çağrısı sonsuza kadar beklememeli"
  );
  assert.equal(apiCalls,1,"Tek denemelik zaman aşımı yalnız bir API çağrısı yapmalı");
  assert.ok(Date.now()-started<1000,"Zaman aşımı belirlenen süreye yakın sonlanmalı");
  assert.throws(()=>evaluate(`responseOutputText({status:"incomplete",output:[]})`),/tamamlanmadan kesildi/);
  assert.throws(()=>evaluate(`responseOutputText({output:[{content:[{type:"refusal",refusal:"reddedildi"}]}]})`),/reddedildi/);
  console.log("V26.26 zaman aşımı, eksik yanıt ve ret işleme testleri geçti.");
})().catch(error=>{console.error(error);process.exitCode=1});
