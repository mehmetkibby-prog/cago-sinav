"use strict";

const assert=require("node:assert/strict");
const quality=require("../www/real2026-quality.js");

function question(text,correct,explanation,extra={}){
  return {question:text,choices:{A:correct,B:"Çeldirici 1",C:"Çeldirici 2",D:"Çeldirici 3",E:"Çeldirici 4"},answer:"A",explanation,...extra};
}

const firstPdf=[
  question("Aşağıdaki bestecilerden hangisi Romantik dönemin önemli temsilcilerindendir?","Franz Schubert","Franz Schubert erken Romantik dönemin önemli temsilcilerindendir."),
  question("Aşağıdaki terimlerden hangisi müziğin giderek yavaşlamasını ifade eder?","Ritardando","Ritardando tempoyu giderek yavaşlatır."),
  question("Bağlama ailesinin en küçük üyesi hangisidir?","Cura","Cura bağlama ailesinin en küçük ve ince sesli üyesidir."),
  question("Rameau'nun Traité de l'harmonie adlı eseri hangi kavramı işler?","Temel bas","Rameau bu eserinde temel bas kavramını işler."),
  question("Şelpe tekniği bağlama çalımında hangi özelliği ifade eder?","Tezenesiz parmakla çalım","Şelpe tezene kullanmadan parmaklarla uygulanır.")
];
const secondPdf=[
  question("Aşağıdaki bestecilerden hangisi Romantik dönemin önemli temsilcilerindendir?","Franz Schubert","Schubert Romantik dönemdendir."),
  question("Müziğin giderek yavaşlamasını belirten terim hangisidir?","Ritardando","Ritardando giderek yavaşlamadır."),
  question("Bağlama ailesinin en küçük ve ince sesli türü hangisidir?","Cura","Cura küçük ve ince sesli bağlamadır."),
  question("Traité de l'harmonie hangi teorik alanı kapsar?","Armoni teorisi","Rameau bu eserinde armoni teorisini sistemleştirir."),
  question("Tezene kullanmadan parmaklarla yapılan bağlama tekniği hangisidir?","Şelpe","Şelpe tezenesiz parmakla icra tekniğidir.")
];

secondPdf.forEach((item,index)=>{
  const reason=firstPdf.map(previous=>quality.duplicateReason(item,previous)).find(Boolean);
  assert.ok(reason,`PDF tekrar örneği ${index+1} yakalanmalı`);
});

const baselineAudit=quality.auditNovelty([
  question("İcrada temponun aşamalı biçimde düşürülmesini isteyen terim hangisidir?","Ritardando","Ritardando, tempoyu giderek yavaşlatır.",{blueprintArea:"Müzik terimleri ve nüanslar",focusKey:"terms:ritardando",conceptFamily:"tempo-degisimi",targetEntity:"Ritardando",testedFact:"Ritardando tempoyu giderek yavaşlatır."})
],quality.referenceExclusions());
assert.equal(baselineAudit.ok,false,"Eklenen PDF örnekleri başlangıç geçmişi tarafından engellenmeli");

const reportedRepeatCandidates=[
  question("Bağlama ailesinin en küçük ve ince ses veren üyesi hangisidir?","Cura","Cura bağlama ailesinin küçük ve ince sesli üyesidir.",{blueprintArea:"Türk halk müziği ve bağlama"}),
  question("Traité de l'harmonie hangi teorik alanı kapsar?","Armoni teorisi","Rameau'nun Traité de l'harmonie eseri armoni teorisini kapsar.",{blueprintArea:"Armoni tarihi ve müzik kuramı kaynakları"}),
  question("Tezene kullanılmadan parmaklarla yapılan bağlama tekniği hangisidir?","Şelpe","Şelpe tezenesiz parmakla uygulanan tekniktir.",{blueprintArea:"Türk halk müziği ve bağlama"}),
  question("Beş icracıdan oluşan oda müziği topluluğuna ne ad verilir?","Quintet","Quintet beş icracılı topluluktur.",{blueprintArea:"Biçimler ve oda müziği toplulukları"}),
  question("Müzikal sesleri ayırt etme ve tanıma güçlüğü hangi bozukluktur?","Amusia","Amusia müziksel algı ve tanıma bozukluğudur.",{blueprintArea:"Müzik algısı ve müzik psikolojisi"}),
  question("Rast makamının karar perdesi olarak hangi nota kullanılır?","Do","Rast makamının karar perdesi Do kabul edilir.",{blueprintArea:"Türk müziği makam ve değiştirici işaretleri"})
];
reportedRepeatCandidates.forEach((item,index)=>assert.equal(quality.auditNovelty([item],quality.referenceExclusions()).ok,false,`Bildirilen tekrar ${index+1} başlangıç geçmişinden geçmemeli`));

const freshAudit=quality.auditNovelty([
  question("Dolce terimi icrada nasıl bir anlatım ister?","Tatlı ve yumuşak","Dolce, tatlı ve yumuşak bir anlatım ister.",{blueprintArea:"Müzik terimleri ve nüanslar",focusKey:"terms:dolce",conceptFamily:"ifade-terimi",targetEntity:"Dolce",testedFact:"Dolce tatlı ve yumuşak bir anlatım ister."})
],quality.referenceExclusions());
assert.equal(freshAudit.ok,true,"Aynı kapsam içindeki gerçekten farklı bir bilgi kabul edilmeli");

const rejectedSources=quality.validateSources([
  {name:"Satış blogu",url:"https://salamuzik.com/blogs/news/baglama?utm_source=openai"},
  {name:"Aynı satış blogu",url:"https://salamuzik.com/blogs/news/cura"}
]);
assert.equal(rejectedSources.ok,false,"Satış/blog kaynakları doğrulama kaynağı sayılmamalı");

const acceptedSources=quality.validateSources([
  {name:"The Metropolitan Museum of Art",url:"https://www.metmuseum.org/toah/hd/mind/hd_mind.htm"},
  {name:"Encyclopaedia Britannica",url:"https://www.britannica.com/art/music"}
]);
assert.equal(acceptedSources.ok,true,"İki bağımsız güvenilir kurum kaynağı kabul edilmeli");

const wikipediaWithInstitution=quality.validateSources([
  {name:"Wikipedia - Franz Schubert",url:"https://tr.wikipedia.org/wiki/Franz_Schubert"},
  {name:"Encyclopaedia Britannica - Franz Schubert",url:"https://www.britannica.com/biography/Franz-Schubert"}
]);
assert.equal(wikipediaWithInstitution.ok,true,"Wikipedia, ikinci bir güvenilir kurumsal kaynakla birlikte kabul edilmeli");

const wikipediaOnly=quality.validateSources([
  {name:"Türkçe Wikipedia",url:"https://tr.wikipedia.org/wiki/Franz_Schubert"},
  {name:"İngilizce Wikipedia",url:"https://en.wikipedia.org/wiki/Franz_Schubert"}
]);
assert.equal(wikipediaOnly.ok,false,"Yalnız Wikipedia kaynakları resmî/akademik çapraz doğrulama yerine geçmemeli");

const ten=Array.from({length:10},(_,index)=>question(`Özgün soru ${index+1}`,`Doğru ${index+1}`,`Doğru ${index+1} açıklamasıdır.`));
const balanced=quality.balanceAnswers(ten,2621),counts=Object.fromEntries(quality.LETTERS.map(letter=>[letter,0]));
balanced.forEach(item=>counts[item.answer]++);
quality.LETTERS.forEach(letter=>assert.equal(counts[letter],2,"10 soruda cevap harfleri dengeli olmalı"));

const focusBank=[{key:"terms:ritardando"},{key:"terms:dolce"},{key:"terms:espressivo"}];
const selected=quality.selectLeastUsedFocuses(focusBank,2,[{focusKey:"terms:ritardando"}],0).map(item=>item.key);
assert.deepEqual(new Set(selected),new Set(["terms:dolce","terms:espressivo"]),"Yakın zamanda kullanılan odak yerine kullanılmayan odaklar seçilmeli");

console.log("V26.26 tekrar, kaynak ve cevap dengesi testleri geçti.");
