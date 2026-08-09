(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  root.Real2026Quality=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";

  const LETTERS=["A","B","C","D","E"];
  const STOP_WORDS=new Set([
    "acaba","aciklama","adli","ait","asagidaki","biri","bir","bu","da","de","daha","degil","den","icin","ile","ise","olarak","olan","olup","sonra","soru","soruda","tarafindan","ve","veya","hangi","hangisi","ifade","eder","etmektedir","gibi","gore","verilen","muzik","muzigin","muziksel","eser","eseri","terim","terimi","besteci","bestecilerden"
  ]);
  const SHORT_TOKENS=new Set(["do","fa","mi","la","si","rit","noh"]);
  const SOURCE_BLOCKLIST=[
    "wikipedia.org","reddit.com","quora.com","facebook.com","instagram.com","tiktok.com","x.com","twitter.com","youtube.com","youtu.be","blogspot.com","wordpress.com","medium.com","pinterest.com","quizlet.com","salamuzik.com","yurtrenkleri.com","sinavtime.com","onlinesoru.com","sorumarket.com","sinavcoz.com"
  ];
  const TRUSTED_HOST_PARTS=[
    "ktb.gov.tr","kulturportali.gov.tr","operabale.gov.tr","trt.net.tr","dergipark.org.tr","tez.yok.gov.tr","islamansiklopedisi.org.tr","aa.com.tr","britannica.com","oxfordmusiconline.com","metmuseum.org","moma.org","carnegiehall.org","nyphil.org","laphil.com","berliner-philharmoniker.de","wienerphilharmoniker.at","metopera.org","royalballetandopera.org.uk","ballet.org.uk","operadeparis.fr","bnf.fr","loc.gov","si.edu","unesco.org","jstor.org","cambridge.org","oup.com","sagepub.com","springer.com","tandfonline.com","sciencedirect.com","ncbi.nlm.nih.gov","nih.gov"
  ];
  const ANCHOR_PATTERNS=[
    ["poco-a-poco-crescendo",/poco\s+a\s+poco\s+crescendo/],
    ["ritardando",/\britardando\b|\brit\.?\b/],
    ["accelerando",/\baccelerando\b/],
    ["cantabile",/\bcantabile\b/],
    ["amusia",/\bamusia\b|\bamuz[ıi]a?\b|\bamüzi\b/],
    ["divan-sazi",/divan\s+saz[ıi]|divan\s+ba[gğ]lama/],
    ["cura",/\bcura\b/],
    ["selpe",/[şs]elpe/],
    ["rameau-traite",/rameau|trait[eé]\s+de\s+l.?harmonie/],
    ["arap-ali-destani",/arap\s+ali\s+destan[ıi]/],
    ["noh-tiyatrosu",/\bnoh?\b.*tiyatro|japon.*\bnoh?\b/],
    ["piyano-beslisi",/piyano\s+be[şs]lisi|piano\s+quintet/],
    ["quintet",/\bquintet\b|\bkentet\b|be[şs]li\s*\(quintet\)/],
    ["rast-makami",/rast\s+makam[ıi]/],
    ["schubert-romantik",/schubert.*romantik|romantik.*schubert/],
    ["brandenburg-koncertolari",/brandenburg\s+kon[cç]erto/],
    ["matthaus-passion",/matth[aä]us\s*passion|matta\s+passion/]
  ];

  const REFERENCE_EXCLUSIONS=[
    {blueprintArea:"Müzik terimleri ve nüanslar",focusKey:"terms:cantabile",conceptFamily:"ifade-terimi",targetEntity:"Cantabile",testedFact:"Cantabile şarkı söyler gibi, ezgili bir icrayı belirtir.",question:"Cantabile terimi neyi ifade eder?",correctAnswer:"Şarkı söyler gibi"},
    {blueprintArea:"Müzik terimleri ve nüanslar",focusKey:"terms:poco-a-poco-crescendo",conceptFamily:"nüans-degisimi",targetEntity:"Poco a poco crescendo",testedFact:"Poco a poco crescendo ses gürlüğünün azar azar artırılmasını belirtir.",question:"Poco a poco crescendo ifadesinin anlamı nedir?",correctAnswer:"Ses gürlüğünü azar azar artırmak"},
    {blueprintArea:"Dönem, besteci ve eser",focusKey:"period:schubert-romantic",conceptFamily:"besteci-donem",targetEntity:"Franz Schubert",testedFact:"Franz Schubert erken Romantik dönemin önemli temsilcilerindendir.",question:"Aşağıdaki bestecilerden hangisi Romantik dönemin önemli temsilcilerindendir?",correctAnswer:"Franz Schubert"},
    {blueprintArea:"Müzik terimleri ve nüanslar",focusKey:"terms:ritardando",conceptFamily:"tempo-degisimi",targetEntity:"Ritardando",testedFact:"Ritardando temponun giderek yavaşlatılmasıdır.",question:"Aşağıdaki terimlerden hangisi müziğin giderek yavaşlamasını ifade eder?",correctAnswer:"Ritardando"},
    {blueprintArea:"Türk halk müziği ve bağlama",focusKey:"folk:cura",conceptFamily:"baglama-ailesi",targetEntity:"Cura",testedFact:"Cura bağlama ailesinin küçük ve ince sesli üyesidir.",question:"Bağlama ailesinin en küçük üyesi hangisidir?",correctAnswer:"Cura"},
    {blueprintArea:"Armoni tarihi ve müzik kuramı kaynakları",focusKey:"harmony:rameau-traite",conceptFamily:"kuramci-eser",targetEntity:"Rameau - Traité de l'harmonie",testedFact:"Rameau'nun 1722 tarihli Traité de l'harmonie eseri armoni kuramının sistematik kaynaklarındandır ve temel bas kavramını işler.",question:"Rameau'nun 1722 tarihli Traité de l'harmonie adlı eseri hangi konuyu kapsar?",correctAnswer:"Armoni teorisi"},
    {blueprintArea:"Müzik terimleri ve nüanslar",focusKey:"terms:tempo",conceptFamily:"temel-muzik-terimi",targetEntity:"Tempo",testedFact:"Tempo müziğin icra hızını belirtir.",question:"Aşağıdaki terimlerden hangisi müziğin hızını ifade eder?",correctAnswer:"Tempo"},
    {blueprintArea:"Müzik algısı ve müzik psikolojisi",focusKey:"perception:amusia-definition",conceptFamily:"muzik-algisi-bozuklugu",targetEntity:"Amusia",testedFact:"Amusia müziksel sesleri, ezgileri veya ritimleri algılama ve tanımada görülen bozukluktur.",question:"Müzikal sesleri ayırt etme ve tanıma güçlüğüne yol açan bozukluk hangisidir?",correctAnswer:"Amusia"},
    {blueprintArea:"Müzik algısı ve müzik psikolojisi",focusKey:"perception:oliver-sacks",conceptFamily:"kisi-muzik-norolojisi",targetEntity:"Oliver Sacks",testedFact:"Oliver Sacks müzik ve nöroloji üzerine vaka anlatılarıyla tanınır; bu bilgi araştırmacı-ilk çalışmayı kanıtlamaz.",question:"Amusia üzerine önemli çalışmaları yapan besteci kimdir?",correctAnswer:"Oliver Sacks"},
    {blueprintArea:"Türk müziği makam ve değiştirici işaretleri",focusKey:"makam:rast-absolute-do",conceptFamily:"makam-karar-perdesi",targetEntity:"Rast makamı",testedFact:"Rast makamının kararını bağlam ve notasyon sistemi vermeden mutlak Do notası diye belirtmek güvenilir değildir.",question:"Hangi makam karar perdesi olarak Do notasını kullanır?",correctAnswer:"Rast makamı",unsafe:true},
    {blueprintArea:"Türk halk müziği ve bağlama",focusKey:"folk:selpe-definition",conceptFamily:"baglama-calim-teknigi",targetEntity:"Şelpe",testedFact:"Şelpe tezene kullanmadan parmaklarla uygulanan bağlama çalım tekniğidir.",question:"Şelpe tekniği bağlama çalımında hangi özelliği ifade eder?",correctAnswer:"Tezene kullanmadan parmaklarla çalmak"},
    {blueprintArea:"Dönem, besteci ve eser",focusKey:"period:bach-matthaus",conceptFamily:"eser-donem",targetEntity:"Bach - Matthäus-Passion",testedFact:"Bach'ın Matthäus-Passion eseri Barok dönemdendir.",question:"Aşağıdaki eserlerden hangisi Barok dönemin önemli bir örneğidir?",correctAnswer:"Bach'ın Matthäus-Passion eseri"},
    {blueprintArea:"Dönem, besteci ve eser",focusKey:"period:bach-brandenburg",conceptFamily:"eser-donem",targetEntity:"Bach - Brandenburg Konçertoları",testedFact:"Bach'ın Brandenburg Konçertoları Barok dönemdendir.",question:"Aşağıdaki eserlerden hangisi Barok dönemin önemli eserlerinden biridir?",correctAnswer:"Bach'ın Brandenburg Konçertoları"},
    {blueprintArea:"Biçimler ve oda müziği toplulukları",focusKey:"forms:quintet-five",conceptFamily:"oda-muzigi-toplulugu",targetEntity:"Quintet",testedFact:"Quintet beş icracıdan oluşan topluluk veya beş icracı için eserdir.",question:"Beş çalgıcıdan oluşan oda müziği topluluğu hangisidir?",correctAnswer:"Quintet"},
    {blueprintArea:"Biçimler ve oda müziği toplulukları",focusKey:"forms:piano-quintet",conceptFamily:"oda-muzigi-toplulugu",targetEntity:"Piyano beşlisi",testedFact:"Piyano beşlisi piyano ile dört yaylı çalgıdan oluşan yaygın beşli düzenidir.",question:"Beş çalgıcıdan oluşan oda müziği topluluğu hangisidir?",correctAnswer:"Piyano Beşlisi"},
    {blueprintArea:"Müzik terimleri ve nüanslar",focusKey:"terms:accelerando",conceptFamily:"tempo-degisimi",targetEntity:"Accelerando",testedFact:"Accelerando temponun giderek hızlandırılmasıdır.",question:"Aşağıdaki terimlerden hangisi müziğin giderek hızlanmasını ifade eder?",correctAnswer:"Accelerando"},
    {blueprintArea:"Biçimler ve oda müziği toplulukları",focusKey:"forms:concerto-cycle",conceptFamily:"koncerto-bolum-plani",targetEntity:"Klasik konçerto",testedFact:"Klasik konçertonun yaygın üç bölümlü planı hızlı-yavaş-hızlıdır.",question:"Hızlı-yavaş-hızlı bölüm düzeni hangi türün yaygın planıdır?",correctAnswer:"Klasik konçerto"},
    {blueprintArea:"Kıbrıs Türk müziği ve sahne eserleri",focusKey:"cyprus:arap-ali-composer",conceptFamily:"eser-besteci",targetEntity:"Arap Ali Destanı - Ali Hoca",testedFact:"Arap Ali Destanı'nın bestecisi Ali Hoca'dır.",question:"Arap Ali Destanı'nın bestecisi kimdir?",correctAnswer:"Ali Hoca"},
    {blueprintArea:"Dünya müzik kültürleri",focusKey:"world:noh",conceptFamily:"geleneksel-tiyatro",targetEntity:"Noh tiyatrosu",testedFact:"Noh Japonya'nın maske, müzik ve dans içeren geleneksel tiyatro biçimidir.",question:"Noh nedir?",correctAnswer:"Japon geleneksel tiyatrosu"},
    {blueprintArea:"Opera, bale ve sahne sanatları",focusKey:"stage:ballet-five-positions",conceptFamily:"bale-temel-pozisyon",targetEntity:"Balenin beş temel ayak pozisyonu",testedFact:"Klasik balede beş temel ayak pozisyonu bulunur.",question:"Klasik balede kaç temel ayak pozisyonu vardır?",correctAnswer:"Beş"}
  ];

  function normalize(value){
    return String(value||"")
      .toLocaleLowerCase("tr-TR")
      .replace(/[’‘`´]/g,"'")
      .normalize("NFKD").replace(/[\u0300-\u036f]/g,"")
      .replace(/ç/g,"c").replace(/ğ/g,"g").replace(/ı/g,"i").replace(/ö/g,"o").replace(/ş/g,"s").replace(/ü/g,"u")
      .replace(/[^a-z0-9]+/g," ").replace(/\s+/g," ").trim();
  }
  function compact(value){return normalize(value).replace(/\s+/g,"")}
  function tokens(value){
    return normalize(value).split(" ").filter(token=>token&&(token.length>2||SHORT_TOKENS.has(token))&&!STOP_WORDS.has(token));
  }
  function tokenSet(value){return new Set(tokens(value))}
  function jaccard(a,b){
    const left=a instanceof Set?a:tokenSet(a),right=b instanceof Set?b:tokenSet(b);
    if(!left.size||!right.size)return 0;
    let overlap=0;left.forEach(token=>{if(right.has(token))overlap++});
    return overlap/(left.size+right.size-overlap);
  }
  function bigrams(value){
    const text=compact(value);if(text.length<2)return new Set(text?[text]:[]);
    const out=new Set();for(let i=0;i<text.length-1;i++)out.add(text.slice(i,i+2));return out;
  }
  function dice(a,b){
    const left=bigrams(a),right=bigrams(b);if(!left.size||!right.size)return 0;
    let overlap=0;left.forEach(token=>{if(right.has(token))overlap++});
    return 2*overlap/(left.size+right.size);
  }
  function inferAnchor(value){
    const text=normalize(value);
    const hit=ANCHOR_PATTERNS.find(([,pattern])=>pattern.test(text));
    return hit?hit[0]:"";
  }
  function makeRecord(question,extra={}){
    const choices=question?.choices||{},answer=String(question?.answer||"").toUpperCase();
    const correct=String(question?.correctAnswer||choices[answer]||extra.correctAnswer||"").trim();
    const questionText=String(question?.question||extra.question||"").trim();
    const explanation=String(question?.explanation||extra.explanation||question?.testedFact||extra.testedFact||"").trim();
    const combined=[questionText,correct,explanation,question?.targetEntity,question?.conceptFamily].filter(Boolean).join(" ");
    const inferred=inferAnchor(combined);
    const target=String(question?.targetEntity||extra.targetEntity||inferred||correct).trim();
    const fact=String(question?.testedFact||extra.testedFact||explanation).trim();
    const family=String(question?.conceptFamily||extra.conceptFamily||inferred||question?.topic||extra.topic||"").trim();
    return {
      question:questionText,
      correctAnswer:correct,
      explanation,
      blueprintArea:String(question?.blueprintArea||extra.blueprintArea||"").trim(),
      focusKey:String(question?.focusKey||extra.focusKey||"").trim(),
      angleKey:String(question?.angleKey||extra.angleKey||"").trim(),
      conceptFamily:family,
      targetEntity:target,
      testedFact:fact,
      anchor:inferred,
      topic:String(question?.topic||extra.topic||"").trim(),
      generatedAt:question?.generatedAt||extra.generatedAt||new Date().toISOString(),
      unsafe:Boolean(question?.unsafe||extra.unsafe)
    };
  }
  function areaComparable(a,b){
    const left=normalize(a.blueprintArea||a.topic),right=normalize(b.blueprintArea||b.topic);
    return !left||!right||left===right||jaccard(left,right)>=0.45;
  }
  function duplicateReason(aInput,bInput,options={}){
    const a=makeRecord(aInput),b=makeRecord(bInput),sameArea=areaComparable(a,b);
    if(a.question&&b.question&&compact(a.question)===compact(b.question))return "aynı soru kökü";
    if(options.withinExam&&a.focusKey&&b.focusKey&&normalize(a.focusKey)===normalize(b.focusKey))return "aynı odak konusu";
    if(a.anchor&&b.anchor&&a.anchor===b.anchor&&sameArea)return `aynı çekirdek kavram (${a.anchor})`;
    const targetA=normalize(a.targetEntity),targetB=normalize(b.targetEntity);
    const familyA=normalize(a.conceptFamily),familyB=normalize(b.conceptFamily);
    const factSimilarity=Math.max(jaccard(a.testedFact,b.testedFact),dice(a.testedFact,b.testedFact));
    if(targetA&&targetB&&targetA===targetB&&sameArea)return `aynı hedef bilgi (${a.targetEntity})`;
    if(targetA&&targetB&&dice(targetA,targetB)>=0.9&&sameArea&&factSimilarity>=0.35)return `aynı hedef ve benzer bilgi (${a.targetEntity})`;
    if(familyA&&familyB&&familyA===familyB&&targetA&&targetB&&dice(targetA,targetB)>=0.72&&sameArea)return "aynı kavram ailesi ve hedef";
    if(a.testedFact&&b.testedFact&&factSimilarity>=0.76&&sameArea)return "aynı bilgi farklı cümleyle sorulmuş";
    const rootJaccard=jaccard(a.question,b.question),rootDice=dice(a.question,b.question);
    if(rootJaccard>=0.62||rootDice>=0.86)return "anlamca çok benzer soru kökü";
    const correctA=normalize(a.correctAnswer),correctB=normalize(b.correctAnswer);
    if(correctA&&correctB&&correctA===correctB&&sameArea&&(rootJaccard>=0.36||factSimilarity>=0.42))return `aynı doğru cevap ve aynı kazanım (${a.correctAnswer})`;
    return "";
  }
  function auditNovelty(questions,history=[],options={}){
    const candidates=(questions||[]).map(q=>makeRecord(q)),prior=(history||[]).map(q=>makeRecord(q)),duplicates=[];
    for(let i=0;i<candidates.length;i++){
      for(let j=0;j<i;j++){
        const reason=duplicateReason(candidates[i],candidates[j],{withinExam:true});
        if(reason)duplicates.push({index:i,againstIndex:j,source:"current",reason});
      }
      for(let j=0;j<prior.length;j++){
        const reason=duplicateReason(candidates[i],prior[j],{withinExam:false});
        if(reason){duplicates.push({index:i,againstIndex:j,source:"history",reason});break}
      }
    }
    return {ok:duplicates.length===0,duplicates,records:candidates};
  }
  function hostName(url){
    try{return new URL(url).hostname.toLowerCase().replace(/^www\./,"")}catch{return ""}
  }
  function isBlockedHost(host){return SOURCE_BLOCKLIST.some(item=>host===item||host.endsWith(`.${item}`))}
  function isTrustedHost(host){
    if(!host||isBlockedHost(host))return false;
    if(/\.(gov|edu)$/.test(host)||/\.(gov|edu)\.tr$/.test(host)||/\.ac\.[a-z]{2}$/.test(host)||/\.go\.[a-z]{2}$/.test(host))return true;
    return TRUSTED_HOST_PARTS.some(item=>host===item||host.endsWith(`.${item}`));
  }
  function validateSources(sources){
    const list=Array.isArray(sources)?sources:[],valid=[],errors=[];
    list.forEach((source,index)=>{
      const name=String(source?.name||"").trim(),raw=String(source?.url||"").trim();
      try{
        const parsed=new URL(raw),host=hostName(raw);
        if(!/^https?:$/.test(parsed.protocol))throw new Error("http(s) değil");
        if(!name||name.length<4)throw new Error("kaynak adı eksik");
        if(isBlockedHost(host))throw new Error("güvenilir olmayan kaynak türü");
        if([...parsed.searchParams.keys()].some(key=>/^utm_/i.test(key)))throw new Error("izleme parametreli/tahmini bağlantı");
        if(/\/(search|arama)(\/|$)/i.test(parsed.pathname))throw new Error("arama sonucu bağlantısı");
        if((parsed.pathname==="/"||parsed.pathname==="")&&!/^(doi\.org|jstor\.org)$/.test(host))throw new Error("doğrudan bilgi sayfası yerine ana sayfa");
        valid.push({name,url:raw,host,trusted:isTrustedHost(host)});
      }catch(error){errors.push(`${index+1}. kaynak: ${error.message}`)}
    });
    const uniqueHosts=new Set(valid.map(item=>item.host));
    if(valid.length<2)errors.push("en az iki geçerli kaynak yok");
    if(uniqueHosts.size<2)errors.push("kaynaklar birbirinden bağımsız iki alan adından gelmiyor");
    if(!valid.some(item=>item.trusted))errors.push("en az bir resmî, akademik veya kurumsal kaynak yok");
    return {ok:errors.length===0,errors,sources:valid.map(({name,url})=>({name,url}))};
  }
  function seededRandom(seed){
    let value=(Number(seed)||1)>>>0;
    return ()=>{value=(value*1664525+1013904223)>>>0;return value/4294967296};
  }
  function shuffled(values,random=Math.random){
    const out=[...values];for(let i=out.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[out[i],out[j]]=[out[j],out[i]]}return out;
  }
  function balanceAnswers(questions,seed=Date.now()){
    const random=seededRandom(seed),targets=shuffled(questions.map((_,index)=>LETTERS[index%LETTERS.length]),random);
    return questions.map((question,index)=>{
      const correctValue=String(question.choices?.[question.answer]||""),wrongValues=shuffled(LETTERS.filter(letter=>letter!==question.answer).map(letter=>String(question.choices?.[letter]||"")),random);
      const desired=targets[index],choices={},wrongIterator=wrongValues[Symbol.iterator]();
      LETTERS.forEach(letter=>choices[letter]=letter===desired?correctValue:wrongIterator.next().value);
      return {...question,choices,answer:desired};
    });
  }
  function selectLeastUsedFocuses(focuses,count,history=[],rotation=0){
    const usage=new Map(),lastSeen=new Map();
    history.forEach((item,index)=>{const key=String(item?.focusKey||"");if(!key)return;usage.set(key,(usage.get(key)||0)+1);if(!lastSeen.has(key))lastSeen.set(key,index)});
    const rotated=focuses.map((focus,index)=>({...focus,_order:(index+rotation)%Math.max(1,focuses.length)}));
    rotated.sort((a,b)=>(usage.get(a.key)||0)-(usage.get(b.key)||0)||(lastSeen.get(b.key)??1e9)-(lastSeen.get(a.key)??1e9)||a._order-b._order);
    if(count>rotated.length)throw new Error(`Odak havuzu yetersiz: ${count}/${rotated.length}`);
    return rotated.slice(0,count).map(({_order,...focus})=>focus);
  }
  function referenceExclusions(){return REFERENCE_EXCLUSIONS.map(item=>makeRecord(item,item))}

  return Object.freeze({
    VERSION:"26.28",LETTERS,normalize,compact,tokens,jaccard,dice,inferAnchor,makeRecord,duplicateReason,auditNovelty,
    validateSources,isTrustedHost,balanceAnswers,selectLeastUsedFocuses,referenceExclusions
  });
});
