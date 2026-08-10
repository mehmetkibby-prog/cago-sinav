import fs from "node:fs";
import path from "node:path";

const [textDirectory, outputFile] = process.argv.slice(2);
if (!textDirectory || !outputFile) {
  throw new Error("Kullanım: node scripts/build-education-library-manifest.mjs <metin-klasoru> <cikti-json>");
}

const summaries = [
  {
    id: "program-gelistirme",
    title: "Program Geliştirme",
    icon: "🧭",
    accent: "#f59e0b",
    pages: 1,
    sourceFile: "Program geliştirme özet.pdf",
  },
  {
    id: "gelisim-psikolojisi",
    title: "Gelişim Psikolojisi",
    icon: "🌱",
    accent: "#22c55e",
    pages: 2,
    sourceFile: "Gelişim Psikolojisi özet.pdf",
  },
  {
    id: "ogrenme-psikolojisi",
    title: "Öğrenme Psikolojisi",
    icon: "🧠",
    accent: "#8b5cf6",
    pages: 2,
    sourceFile: "Öğrenme Psikolojisi özet.pdf",
  },
  {
    id: "ogretim-yontem-teknikleri",
    title: "Öğretim Yöntem ve Teknikleri",
    icon: "🧩",
    accent: "#38bdf8",
    pages: 1,
    sourceFile: "Öğretim yöntem ve teknikleri özet.pdf",
  },
  {
    id: "rehberlik",
    title: "Rehberlik",
    icon: "🧭",
    accent: "#ec4899",
    pages: 1,
    sourceFile: "Rehberlik özet.pdf",
  },
  {
    id: "olcme-degerlendirme",
    title: "Ölçme ve Değerlendirme",
    icon: "📊",
    accent: "#14b8a6",
    pages: 1,
    sourceFile: "Ölçme ve değerlendirme özet.pdf",
  },
];

function cleanPdfText(value) {
  return String(value || "")
    .normalize("NFKC")
    .replace(/\uFFFD/g, "")
    .replace(/\r/g, "")
    .replace(/-\n(?=\p{Ll})/gu, "")
    .split(/\n\s*\n+/)
    .map(paragraph => paragraph
      .split("\n")
      .map(line => line.replace(/[\t ]+/g, " ").trim())
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim())
    .filter(Boolean)
    .join("\n\n")
    .trim();
}

const enriched = summaries.map(summary => {
  const textPath = path.join(textDirectory, `${summary.id}.txt`);
  const aiText = cleanPdfText(fs.readFileSync(textPath, "utf8"));
  if (aiText.length < 4000) throw new Error(`${summary.title} metni beklenenden kısa: ${aiText.length}`);
  return {
    ...summary,
    aiText,
    characterCount: aiText.length,
    imagePattern: `education-library/summaries/${summary.id}/page-{page}.webp`,
  };
});

const manifest = {
  version: "26.32",
  summaries: enriched,
  book: {
    id: "kpss-egitim-bilimleri",
    title: "KPSS Eğitim Bilimleri Test Kitabı",
    subtitle: "208 sayfa · çevrimdışı yaprak test okuyucusu",
    pages: 208,
    sourceFile: "KPSS-EĞİTİM-BİLİMLERİ.pdf",
    imagePattern: "education-library/kpss-pages/page-{page}.webp",
  },
};

fs.mkdirSync(path.dirname(outputFile), { recursive: true });
fs.writeFileSync(outputFile, `${JSON.stringify(manifest)}\n`, "utf8");
console.log(`Eğitim Bilimleri manifestosu hazır: ${enriched.length} özet, ${manifest.book.pages} kitap sayfası.`);
