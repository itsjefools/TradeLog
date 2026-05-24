/* eslint-disable no-console */
// 翻訳ファイル (ja/en/pt/es) の葉キーが一致しているか検査する。
// 使い方: node scripts/check-translations.js
// 不一致があれば終了コード 1。

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const LANGS = ['ja', 'en', 'pt', 'es'];
const DIR = path.join(__dirname, '..', 'lib', 'translations');

function load(lang) {
  const src = fs.readFileSync(path.join(DIR, `${lang}.ts`), 'utf8');
  const js = ts.transpileModule(src, {
    compilerOptions: { module: 'commonjs', target: 'es2019' },
  }).outputText;
  const mod = { exports: {} };
  // eslint-disable-next-line no-new-func
  new Function('module', 'exports', 'require', js)(mod, mod.exports, require);
  return mod.exports.default;
}

function leaves(obj, prefix = '') {
  const out = [];
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      out.push(...leaves(v, key));
    } else {
      out.push(key);
    }
  }
  return out;
}

const data = {};
for (const lang of LANGS) data[lang] = new Set(leaves(load(lang)));

// 全言語の葉キーの和集合
const union = new Set();
for (const lang of LANGS) for (const k of data[lang]) union.add(k);

let hasError = false;
for (const lang of LANGS) {
  const missing = [...union].filter((k) => !data[lang].has(k)).sort();
  console.log(`[${lang}] ${data[lang].size} keys` + (missing.length ? ` — ${missing.length} 件欠落` : ' — OK'));
  if (missing.length) {
    hasError = true;
    for (const k of missing) console.log(`    欠落: ${k}`);
  }
}

if (hasError) {
  console.error('\n翻訳キーに不一致があります。');
  process.exit(1);
} else {
  console.log('\n全言語の翻訳キーが一致しています。');
}
