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
const memory=new Map();
const context={
  console,Real2026Quality:quality,globalThis:null,window:null,
  document:{querySelector(){return element},querySelectorAll(){return []},createElement(){return {...element,click(){}}}},
  localStorage:{getItem(key){return memory.has(key)?memory.get(key):null},setItem(key,value){memory.set(key,value)}},
  fetch(){return new Promise(()=>{})},navigator:{},URL,Blob,confirm(){return true},
  setTimeout(){},clearTimeout(){},setInterval(){},clearInterval(){},Date,Math,Promise,Map,Set,Array,Object,String,Number,Boolean,JSON,RegExp,Error
};
context.globalThis=context;context.window=context;vm.createContext(context);
vm.runInContext(fs.readFileSync(require.resolve("../www/app.js"),"utf8"),context);

function evaluate(source){return vm.runInContext(source,context)}
function plan(count,history,generation){
  context.__history=history;
  return JSON.parse(evaluate(`JSON.stringify(scaledReal2026Blueprint(${count},__history,${generation}).map(group=>({area:group.area,count:group.count,focuses:group.focuses})))`));
}

const first=plan(10,quality.referenceExclusions(),0);
assert.equal(first.reduce((sum,group)=>sum+group.count,0),10);
assert.ok(first.some(group=>group.area==="Kıbrıs Türk müziği ve sahne eserleri"),"Küçük denemelerde son alanlar sürekli dışarıda kalmamalı");
assert.ok(first.some(group=>group.area==="Dünya müzik kültürleri"),"Dünya müzik kültürleri rotasyona katılmalı");

const firstRecords=first.flatMap(group=>group.focuses.map(focus=>({
  question:`${focus.label} hakkında soru`,correctAnswer:`${focus.label} cevabı`,explanation:`${focus.label} hakkında doğrulanmış açıklama`,
  blueprintArea:group.area,focusKey:focus.key,targetEntity:`${focus.key} hedefi`,testedFact:`${focus.key} için ölçülen farklı bilgi`,conceptFamily:`${focus.key} ailesi`
})));
const second=plan(10,firstRecords,1),firstKeys=new Set(firstRecords.map(item=>item.focusKey));
assert.equal(second.reduce((sum,group)=>sum+group.count,0),10);
assert.equal(second.flatMap(group=>group.focuses).filter(focus=>firstKeys.has(focus.key)).length,0,"Arka arkaya 10 soruluk plan aynı odakları seçmemeli");

assert.equal(evaluate("REAL_2026_BATCH_SIZE"),10,"5-10 soru tek hızlı çağrıda hazırlanmalı");
assert.equal(evaluate("REAL_2026_WORKERS"),2,"Büyük denemelerde iki hızlı paket paralel çalışmalı");
assert.equal(evaluate("REAL_2026_REQUEST_TIMEOUT_MS"),45000,"Yanıt vermeyen paket 45 saniyede kesilmeli");
context.__fastHistory=quality.referenceExclusions();
const fiftyJobs=JSON.parse(evaluate("JSON.stringify(buildReal2026Jobs(50,__fastHistory,2).map(job=>job.count))"));
assert.equal(fiftyJobs.reduce((sum,count)=>sum+count,0),50,"50 soruluk plan hiçbir soruyu kaybetmemeli");
assert.equal(fiftyJobs.length,5,"50 soru yalnız beş hızlı pakete ayrılmalı");
assert.ok(fiftyJobs.every(count=>count===10),"50 soruluk üretim onarlı paketlerden oluşmalı");

const hundred=plan(100,quality.referenceExclusions(),0);
assert.equal(hundred.reduce((sum,group)=>sum+group.count,0),100);
hundred.forEach(group=>assert.equal(new Set(group.focuses.map(focus=>focus.key)).size,group.focuses.length,"100 soruluk planda aynı odak iki kez kullanılmamalı"));

context.__history=quality.referenceExclusions();
const packed=JSON.parse(evaluate(`JSON.stringify(buildReal2026Jobs(10,__history,0,4).map(job=>({count:job.count,focuses:job.focuses})))`));
assert.equal(packed.length,3,"10 soru sekiz ayrı ağır çağrı yerine üç karma pakete ayrılmalı");
assert.deepEqual(packed.map(job=>job.count),[4,4,2],"Paketler 4+4+2 biçiminde hazırlanmalı");
assert.equal(packed.flatMap(job=>job.focuses).length,10,"Paketleme hiçbir odağı kaybetmemeli");
assert.equal(new Set(packed.flatMap(job=>job.focuses).map(focus=>focus.planIndex)).size,10,"Her soru plan konumunu yalnız bir kez taşımalı");
assert.ok(new Set(packed[0].focuses.map(focus=>focus.area)).size>1,"İlk paket farklı alanları karıştırarak tek konu çağrısı yığılmasını önlemeli");
context.__job=packed[0];
const split=JSON.parse(evaluate(`JSON.stringify(splitReal2026Job(__job).map(job=>job.focuses.map(focus=>focus.planIndex)))`));
assert.deepEqual(split.map(part=>part.length),[2,2],"Denetimden geçmeyen dört soruluk paket iki küçük pakete ayrılmalı");

async function testRecoveryQueue(){
  context.__jobs=packed;
  const recovered=JSON.parse(await evaluate(`(async()=>{
    let largeFailures=0;const callSizes=[],stages=[],facts=["Kuzey rüzgârı çam dallarını eğdi","Bakır kazan müze vitrininde sergilendi","Mor menekşe ilkbaharda yeniden açtı","Sessiz kütüphane gece yarısı kapandı","Taş köprü vadinin iki yakasını birleştirdi","Gümüş pusula denizcinin yönünü gösterdi","Sarı uçurtma bulutların üzerine yükseldi","Eski saat öğle vaktinde üç kez çaldı","Yeşil fener limanın girişini aydınlattı","Karlı zirve sabah güneşinde parladı"];
    const result=await runReal2026Jobs(__jobs,10,[],async job=>{
      callSizes.push(job.count);
      if(job.count===4&&largeFailures++<2)throw new Error("örnek içerik denetimi hatası");
      return job.focuses.map(focus=>({
        question:facts[focus.planIndex]+" Hangisi bu ayrı senaryoya aittir?",
        choices:{A:"Doğru "+focus.planIndex,B:"B seçeneği "+focus.planIndex,C:"C seçeneği "+focus.planIndex,D:"D seçeneği "+focus.planIndex,E:"E seçeneği "+focus.planIndex},answer:"A",
        explanation:facts[focus.planIndex]+" Bu senaryonun ayrı açıklamasıdır.",blueprintArea:focus.area,focusKey:focus.key,angleKey:focus.angleKey,
        conceptFamily:"aile-"+focus.planIndex,targetEntity:"hedef-"+focus.planIndex,testedFact:facts[focus.planIndex],_planIndex:focus.planIndex
      }));
    },event=>stages.push(event.stage),1);
    return JSON.stringify({done:result.done,count:result.questions.length,requestCount:result.requestCount,callSizes,stages});
  })()`));
  assert.equal(recovered.done,10,"Küçültme sonrasında hedeflenen 10 sorunun tamamı bitmeli");
  assert.equal(recovered.count,10,"Eksik paket denemeye dönüşmemeli");
  assert.deepEqual(recovered.callSizes,[4,2,2,4,2,2,2],"Başarısız paketler yalnız bir kez küçültülerek tamamlanmalı");
  assert.ok(recovered.stages.includes("split"),"Kurtarma kuyruğu paket küçültme aşamasını bildirmeli");

  context.__seed=recovered;
  const resumed=JSON.parse(await evaluate(`(async()=>{
    const seed=__jobs.flatMap(job=>job.focuses).slice(0,3).map(focus=>({question:"Korunan soru "+focus.planIndex,choices:{A:"Doğru",B:"B",C:"C",D:"D",E:"E"},answer:"A",explanation:"Korunan sorunun yeterince uzun ve açık açıklaması.",blueprintArea:focus.area,focusKey:focus.key,angleKey:focus.angleKey,conceptFamily:"korunan-aile",targetEntity:"korunan hedef",testedFact:"Korunan soru için ölçülen ayrı bilgi",_planIndex:focus.planIndex}));
    const facts=["Kuzey rüzgârı çam dallarını eğdi","Bakır kazan müze vitrininde sergilendi","Mor menekşe ilkbaharda yeniden açtı","Sessiz kütüphane gece yarısı kapandı","Taş köprü vadinin iki yakasını birleştirdi","Gümüş pusula denizcinin yönünü gösterdi","Sarı uçurtma bulutların üzerine yükseldi","Eski saat öğle vaktinde üç kez çaldı","Yeşil fener limanın girişini aydınlattı","Karlı zirve sabah güneşinde parladı"];
    const requested=[];const result=await runReal2026Jobs(__jobs,10,[],async job=>{requested.push(...job.focuses.map(x=>x.planIndex));return job.focuses.map(focus=>({question:facts[focus.planIndex]+" Hangisi bu ayrı senaryoya aittir?",choices:{A:"Doğru "+focus.planIndex,B:"B "+focus.planIndex,C:"C "+focus.planIndex,D:"D "+focus.planIndex,E:"E "+focus.planIndex},answer:"A",explanation:facts[focus.planIndex]+" Bu senaryonun ayrı ve yeterli açıklamasıdır.",blueprintArea:focus.area,focusKey:focus.key,angleKey:focus.angleKey,conceptFamily:"yeni-aile-"+focus.planIndex,targetEntity:"yeni hedef "+focus.planIndex,testedFact:facts[focus.planIndex],_planIndex:focus.planIndex}))},()=>{},1,seed);return JSON.stringify({count:result.questions.length,requested});})()`));
  assert.equal(resumed.count,10,"Taslakla devam edildiğinde deneme tamamlanmalı");
  assert.ok(!resumed.requested.some(index=>index<3),"Kaydedilmiş ilk üç soru yeniden istenmemeli");

  context.__referenceHistory=quality.referenceExclusions();
  context.__duplicateSingleton=[{area:"Kıbrıs Türk müziği ve sahne eserleri",count:1,focuses:[{key:"cyprus:arap-ali-libretto",label:"Arap Ali Destanı'nın librettosu",area:"Kıbrıs Türk müziği ve sahne eserleri",angleKey:"matching",angleLabel:"doğru eşleştirmeyi bulma",planIndex:0}],nonce:"duplicate-singleton"}];
  const reassigned=JSON.parse(await evaluate(`(async()=>{
    const requested=[],stages=[];
    const result=await runReal2026Jobs(__duplicateSingleton,1,__referenceHistory,async job=>{
      const focus=job.focuses[0];requested.push({key:focus.key,planIndex:focus.planIndex});
      if(focus.key==="cyprus:arap-ali-libretto"){const error=new Error("Tekrar denetimi soruyu reddetti: aynı çekirdek kavram");error.real2026ContentFailure=true;throw error}
      return [{question:"Kıbrıs Türk müziği arşiv çalışmalarıyla ilgili doğru bilgi hangisidir?",choices:{A:"Nota katalogları tarihsel repertuvarı belgeleyebilir",B:"Arşivler yalnız sahne dekorlarını saklar",C:"Nota katalogları çalgıların akordunu değiştirir",D:"Arşiv çalışmaları yalnız güncel konserleri kapsar",E:"Kataloglar müzik yazısını ortadan kaldırır"},answer:"A",explanation:"Nota katalogları eserleri ve repertuvarı belgeleyerek müzik tarihi çalışmalarına kaynak sağlar.",blueprintArea:focus.area,topic:focus.area,focusKey:focus.key,angleKey:focus.angleKey,conceptFamily:"müzik-arşivi",targetEntity:"Kıbrıs Türk müziği nota kataloğu",testedFact:"Nota katalogları tarihsel repertuvarın belgelenmesine katkı sağlar.",_planIndex:focus.planIndex}];
    },event=>stages.push(event.stage),1);
    return JSON.stringify({count:result.questions.length,requested,stages,planIndex:result.questions[0]._planIndex});
  })()`));
  assert.equal(reassigned.count,1,"Tekrar filtresine takılan son soru farklı konuyla tamamlanmalı");
  assert.equal(reassigned.requested[0].key,"cyprus:arap-ali-libretto","İlk deneme mevcut konu planını kullanmalı");
  assert.notEqual(reassigned.requested[1].key,reassigned.requested[0].key,"Reddedilen tek soru aynı konuya yeniden dönmemeli");
  assert.equal(reassigned.planIndex,0,"Yeni konu eksik sorunun plan konumunu korumalı");
  assert.ok(reassigned.stages.includes("reassigned"),"Konu değiştirme aşaması arayüze bildirilmelidir");

  context.__singleJob=[packed[0]];
  await assert.rejects(evaluate(`runReal2026Jobs(__singleJob,4,[],async()=>{const error=new Error("ağ yanıt vermiyor");error.retryable=true;throw error},()=>{},1)`),error=>error.completed===0&&/ağ yanıt/.test(error.message),"Sürekli ağ hatası sınırsız döngüye girmeden kapanmalı");
}

function guardrailShouldReject(question,focus){
  context.__question=question;context.__focus=focus;
  assert.throws(()=>evaluate("validateReal2026Question(__question,'test',false,__focus)"));
}
guardrailShouldReject({
  question:"Rast makamının karar perdesi hangi Batı notasıdır?",choices:{A:"Do",B:"Re",C:"Mi",D:"Fa",E:"La"},answer:"A",
  explanation:"Rast makamının karar perdesi Do notasıdır.",focusKey:"makam:rast",angleKey:"matching",conceptFamily:"makam-karar",targetEntity:"Rast makamı",testedFact:"Rast makamının karar perdesi Do notasıdır."
},{key:"makam:rast",angleKey:"matching"});
guardrailShouldReject({
  question:"Divan sazının ayırt edici çalım özelliği hangisidir?",choices:{A:"Yalnız parmakla çalınır",B:"Yayla çalınır",C:"Üflenerek çalınır",D:"Tokmakla çalınır",E:"Tuşludur"},answer:"A",
  explanation:"Divan sazı yalnız parmakla çalınır.",focusKey:"folk:divan-sazi",angleKey:"term-to-feature",conceptFamily:"baglama-ailesi",targetEntity:"Divan sazı",testedFact:"Divan sazı yalnız parmakla çalınır."
},{key:"folk:divan-sazi",angleKey:"term-to-feature"});

testRecoveryQueue().then(()=>console.log("V26.26 hızlı üretim, taslaktan devam ve otomatik konu değiştirme testleri geçti.")).catch(error=>{console.error(error);process.exitCode=1});
