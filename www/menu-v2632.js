(function () {
  "use strict";

  const icons = {
    music: "♫",
    education: "🎓",
    study: "✦",
    progress: "✓",
  };

  function menuCard({ action, title, description, icon = "•", tone = "blue", badge = "" }) {
    return `<button class="menu-action-card tone-${tone}" data-menu-action="${action}">
      <span class="menu-card-icon" aria-hidden="true">${icon}</span>
      <span class="menu-card-copy"><b>${esc(title)}</b><small>${esc(description)}</small></span>
      ${badge ? `<span class="menu-card-badge">${esc(badge)}</span>` : ""}
      <span class="menu-card-arrow" aria-hidden="true">›</span>
    </button>`;
  }

  function section(title, description, cards) {
    return `<section class="menu-cluster">
      <header class="menu-cluster-heading"><div><h3>${esc(title)}</h3><p>${esc(description)}</p></div></header>
      <div class="menu-action-grid">${cards.map(menuCard).join("")}</div>
    </section>`;
  }

  function musicQuestions() {
    return state.data?.sections?.reduce((total, item) => total + item.questions.length, 0) || 0;
  }

  function educationWrongCount() {
    return savedWrongQuestions("wrongEducationQuestions").length;
  }

  function musicWrongCount() {
    return savedWrongQuestions("wrongMusicQuestions").length;
  }

  function actionHandlers() {
    return {
      "menu-music": renderMusicAndExamMenu,
      "menu-education": renderEducationLibraryHub,
      "menu-study": renderStudyToolsMenu,
      "menu-progress": renderProgressMenu,
      "real-2026": renderRealMusic2026Generator,
      "khk-2025": renderKhkMusic2025Generator,
      simulation: renderSimulationSetup,
      mixed: () => startExam(shuffle(allQuestions()).slice(0, Math.min(50, allQuestions().length)), "Karışık Deneme"),
      custom: renderCustomExamBuilder,
      "music-ai": renderMusicQuestionGenerator,
      "opera-ballet": renderOperaBallet,
      teacher: renderTeacher,
      "ai-center": renderAiStudyCenter,
      voice: () => nav("voice"),
      cards: renderFlashcards,
      memory: renderMemoryCenter,
      study: renderStudy,
      sentences: renderSavedSentences,
      hard: renderHard,
      saved: renderSavedTests,
      wrong: () => nav("wrong"),
      stats: () => nav("stats"),
      "music-wrong-ai": renderMusicWrongAnalysis,
      workbook: renderPersonalWorkbook,
      "wrong-voice": renderWrongVoiceLesson,
      forgetting: renderForgettingRisk,
      profile: renderProfile,
      settings: renderSettings,
    };
  }

  function bindMenuActions(root = app) {
    root.querySelectorAll("[data-menu-action]").forEach(button => {
      button.addEventListener("click", () => {
        const handler = actionHandlers()[button.dataset.menuAction];
        if (handler) handler();
      });
    });
  }

  function renderV2632Home() {
    const profile = store.get("profile", { name: "Çağlar" });
    const savedCount = savedTests().length;
    const totalWrong = musicWrongCount() + educationWrongCount();
    setTitle("Çalışma Merkezi", profile.name ? `Hoş geldin, ${profile.name}` : "V26.32 · Android Tablet");
    app.innerHTML = `<div class="home-dashboard">
      <section class="home-welcome">
        <div><span class="home-eyebrow">V26.32 · ANDROID TABLET</span><h2>Bugün ne çalışacağız?</h2><p>Tüm özellikler dört düzenli merkezde. İçeriklerin ve kayıtların aynen korunuyor.</p></div>
        <div class="home-stat-row" aria-label="Çalışma özeti">
          <span><b>${musicQuestions()}</b><small>Müzik sorusu</small></span>
          <span><b>${offlineEducationQuestions().length}</b><small>Eğitim sorusu</small></span>
          <span><b>${savedCount}</b><small>Kayıtlı test</small></span>
          <span><b>${totalWrong}</b><small>Takipte yanlış</small></span>
        </div>
      </section>
      <div class="home-center-grid">
        <button class="home-center-card music" data-menu-action="menu-music">
          <span class="home-center-icon">${icons.music}</span><span><small>SINAVLAR</small><b>Müzik ve Sınavlar</b><em>2026 · 2025 · Simülasyon · AI Müzik</em></span><i>›</i>
        </button>
        <button class="home-center-card education" data-menu-action="menu-education">
          <span class="home-center-icon">${icons.education}</span><span><small>KÜTÜPHANE</small><b>Eğitim Bilimleri</b><em>6 özet · Özet AI testi · AGS · KPSS kitabı</em></span><i>›</i>
        </button>
        <button class="home-center-card study" data-menu-action="menu-study">
          <span class="home-center-icon">${icons.study}</span><span><small>ÖĞRENME</small><b>AI ve Çalışma Araçları</b><em>AI öğretmen · Ses · Kartlar · Notlar</em></span><i>›</i>
        </button>
        <button class="home-center-card progress" data-menu-action="menu-progress">
          <span class="home-center-icon">${icons.progress}</span><span><small>TAKİP</small><b>Kayıtlar ve Gelişim</b><em>Yanlışlar · Başarı · Kayıtlı testler · Tekrar</em></span><i>›</i>
        </button>
      </div>
      ${savedCount ? `<button class="continue-strip" data-menu-action="saved"><span>💾</span><span><b>Kaldığın teste devam et</b><small>${savedCount} kayıtlı testin var</small></span><i>›</i></button>` : ""}
    </div>`;
    bindMenuActions();
  }

  function renderMusicAndExamMenu() {
    setTitle("Müzik ve Sınavlar", "2025–2026, denemeler ve müzik AI", true);
    const examCards = [
      { action: "real-2026", title: "2026 Gerçek Müzik Sınavı Tarzı", description: "Ana konu dağılımına ve kaynak doğrulamasına dayalı yeni sınav", icon: "🏆", tone: "gold" },
      { action: "khk-2025", title: "2025 Müzik Alanı Tarzı", description: "70 soruluk KHK profiline uygun özgün deneme", icon: "🎯", tone: "orange" },
      { action: "simulation", title: "Gerçek Sınav Simülasyonu", description: "Süre, soru haritası ve geri bildirimsiz sınav modu", icon: "⏱", tone: "teal" },
      { action: "mixed", title: "Karışık Deneme", description: "Müzik ve çevrimdışı Eğitim Bilimleri bankasından 50 soru", icon: "🔀", tone: "blue" },
      { action: "custom", title: "Özel Deneme Oluştur", description: "Bölümleri ve soru sayılarını kendin birleştir", icon: "🧩", tone: "amber" },
    ];
    const aiCards = [
      { action: "music-ai", title: "AI Müzik Soru Oluşturucu", description: "Dönem, Türk müziği, çalgı, teori ve formları seç", icon: "🎼", tone: "violet" },
      { action: "opera-ballet", title: "AI Opera ve Bale", description: "Eser, besteci ve dönem odaklı sade sorular", icon: "🎭", tone: "pink" },
    ];
    const bankCards = state.data.sections.map(item => ({
      action: `music-section:${item.id}`,
      title: item.title,
      description: "Çevrimdışı müzik soru bankası",
      icon: "♪",
      tone: "slate",
      badge: `${item.questions.length} soru`,
    }));
    app.innerHTML = `<section class="category-hero category-music"><span>♫</span><div><small>MÜZİK MERKEZİ</small><h2>Sınavları, AI üretimini ve soru bankasını tek yerde kullan.</h2></div></section>
      ${section("Sınavlar", "2025 ve 2026 sınavları aynı başlık altında düzenlendi.", examCards)}
      ${section("AI Müzik", "Müzik alanına özel üretim ve öğretim araçları.", aiCards)}
      ${section("Müzik Soru Bankası", `${musicQuestions()} çevrimdışı soru`, bankCards)}`;
    bindMenuActions();
    document.querySelectorAll('[data-menu-action^="music-section:"]').forEach(button => {
      button.addEventListener("click", () => renderSection(button.dataset.menuAction.split(":")[1]));
    });
  }

  function renderStudyToolsMenu() {
    setTitle("AI ve Çalışma Araçları", "Öğrenme, ezber ve kişisel notlar", true);
    app.innerHTML = `<section class="category-hero category-study"><span>✦</span><div><small>ÇALIŞMA MERKEZİ</small><h2>Öğren, tekrar et, dinle ve kendi notlarını biriktir.</h2></div></section>
      ${section("AI ile Çalış", "Yazılı veya sesli öğretmen araçları.", [
        { action: "teacher", title: "AI Öğretmen", description: "Konu sor, açıklama iste veya mini sınav yap", icon: "🤖", tone: "blue" },
        { action: "ai-center", title: "AI Destekli Çalışma Merkezi", description: "Çalışma modu ve AI modelini kendin seç", icon: "✨", tone: "violet" },
        { action: "voice", title: "Realtime AI Sesli Öğretmen", description: "Mikrofonla kesintisiz Türkçe konuş", icon: "🎙", tone: "pink" },
      ])}
      ${section("Ezber ve Not", "Çevrimdışı tekrar ve kişisel çalışma alanları.", [
        { action: "cards", title: "Ezber Kartları", description: "Kart çevirerek soru ve cevapları tekrar et", icon: "🗂", tone: "teal" },
        { action: "memory", title: "Yoğun Ezber Soruları", description: "Eser–besteci, dönem ve ağır bilgi tekrarı", icon: "🧠", tone: "gold" },
        { action: "study", title: "Konu Çalışma Köşesi", description: "Planlarını ve çalışma notlarını cihazda tut", icon: "📚", tone: "blue" },
        { action: "sentences", title: "Kaydettiğim Cümleler", description: "Konu anlatımlarından seçip sakladığın cümleler", icon: "📌", tone: "cyan", badge: `${typeof savedLessonSentences === "function" ? savedLessonSentences().length : 0} kayıt` },
      ])}`;
    bindMenuActions();
  }

  function renderProgressMenu() {
    setTitle("Kayıtlar ve Gelişim", "Yanlışlar, sonuçlar ve kişisel tekrar", true);
    app.innerHTML = `<section class="category-hero category-progress"><span>✓</span><div><small>GELİŞİM MERKEZİ</small><h2>Kaldığın yer, yanlışların ve tekrar planın burada.</h2></div></section>
      ${section("Kayıtlar", "Testlerin ve işaretlediğin sorular.", [
        { action: "saved", title: "Kayıtlı Testler", description: "Kaydettiğin testlere kaldığın yerden devam et", icon: "💾", tone: "blue", badge: `${savedTests().length} kayıt` },
        { action: "hard", title: "Zor Sorular", description: "Yıldızladığın sorulardan yeni test oluştur", icon: "★", tone: "gold", badge: `${savedHardQuestions().length} soru` },
        { action: "wrong", title: "Yanlış Sorular", description: "Müzik ve Eğitim Bilimleri yanlışlarını ayrı çöz", icon: "✕", tone: "red", badge: `${musicWrongCount() + educationWrongCount()} soru` },
        { action: "stats", title: "Başarı Analizi", description: "Bitirdiğin denemelerin puanlarını incele", icon: "▥", tone: "teal" },
      ])}
      ${section("Kişisel Tekrar", "Yanlışlarından yeni çalışma materyali üret.", [
        { action: "music-wrong-ai", title: "AI Müzik Yanlış Analizi", description: "Yanlışlarından kişisel özet ve PDF hazırla", icon: "🧬", tone: "pink" },
        { action: "workbook", title: "Kişisel Çalışma Kitabı", description: "Konu özeti, etkinlik ve yazdırılabilir kitapçık", icon: "📕", tone: "amber" },
        { action: "wrong-voice", title: "Yanlışlardan Sesli Ders", description: "Yazma molalı ve hız ayarlı Türkçe ders", icon: "🎧", tone: "green" },
        { action: "forgetting", title: "Unutma Riski", description: "Bugün tekrar etmen gereken bilgileri göster", icon: "⏳", tone: "orange" },
        { action: "profile", title: "Kişisel Bilgi Köşesi", description: "Hedefini, sınav tarihini ve günlük soru sayını düzenle", icon: "👤", tone: "slate" },
      ])}`;
    bindMenuActions();
  }

  function renderV2632More() {
    setTitle("Tüm Merkezler", "Düzenlenmiş uygulama menüsü");
    app.innerHTML = `<section class="more-menu-intro"><h2>Çalışma alanı seç</h2><p>Ana özellikler konu ve amacına göre dört merkezde toplandı.</p></section>
      <div class="more-center-list">
        ${menuCard({ action: "menu-music", title: "Müzik ve Sınavlar", description: "2026, 2025, simülasyon ve müzik AI", icon: icons.music, tone: "gold" })}
        ${menuCard({ action: "menu-education", title: "Eğitim Bilimleri", description: "Özetler, AI testleri, AGS ve KPSS kitabı", icon: icons.education, tone: "cyan" })}
        ${menuCard({ action: "menu-study", title: "AI ve Çalışma Araçları", description: "Öğretmen, ses, ezber ve notlar", icon: icons.study, tone: "violet" })}
        ${menuCard({ action: "menu-progress", title: "Kayıtlar ve Gelişim", description: "Yanlışlar, sonuçlar ve kişisel tekrar", icon: icons.progress, tone: "green" })}
        ${menuCard({ action: "settings", title: "Ayarlar", description: "OpenAI anahtarı, model ve Realtime bağlantısı", icon: "⚙", tone: "slate" })}
      </div>`;
    bindMenuActions();
  }

  globalThis.renderV2632Home = renderV2632Home;
  globalThis.renderV2632More = renderV2632More;
  globalThis.renderMusicAndExamMenu = renderMusicAndExamMenu;
  globalThis.renderStudyToolsMenu = renderStudyToolsMenu;
  globalThis.renderProgressMenu = renderProgressMenu;
})();
