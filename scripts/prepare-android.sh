#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$project_root"

if [ ! -d android ]; then
  npx cap add android
fi

npx cap sync android

template_root="$project_root/native-android"

copy_native_file() {
  relative_path="$1"
  source_path="$template_root/$relative_path"
  target_path="$project_root/android/$relative_path"

  test -f "$source_path"
  mkdir -p "$(dirname "$target_path")"
  cp "$source_path" "$target_path"
  cmp -s "$source_path" "$target_path"
}

copy_native_file "app/build.gradle"
copy_native_file "app/src/main/AndroidManifest.xml"
copy_native_file "app/src/main/java/com/caglar/muziksinavi/MainActivity.java"
copy_native_file "app/src/main/java/com/caglar/muziksinavi/NativeTtsPlugin.java"
copy_native_file "app/src/main/java/com/caglar/muziksinavi/PdfSaverPlugin.java"
copy_native_file "app/src/main/res/values/strings.xml"
copy_native_file "app/src/main/res/xml/file_paths.xml"

page_count="$(find android/app/src/main/assets/public/ags-workbook-pages -maxdepth 1 -type f -name 'page-*.webp' | wc -l | tr -d ' ')"
test "$page_count" = "40"
test -s android/app/src/main/assets/public/ags-workbook.json
test -s android/app/src/main/assets/public/education-questions.json
test -s android/app/src/main/assets/public/questions.json
test -s android/app/src/main/assets/public/android-study-notes.js
test -s android/app/src/main/assets/public/android-tablet-notes.css
grep -q 'Kaydettiğim Cümleler' android/app/src/main/assets/public/android-study-notes.js
grep -q '.ags-lesson-reader>header{display:block!important}' android/app/src/main/assets/public/android-tablet-notes.css

echo "Tam Android proje kabuğu, PDF/TTS kodları, 40 AGS sayfası ve tablet not sistemi hazır."
