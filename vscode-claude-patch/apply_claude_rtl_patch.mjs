#!/usr/bin/env node
/*
 * apply_claude_rtl_patch.mjs
 * Auto-applies the Claude Code VS Code extension RTL + bidi-cleanup + notification-sound patch
 * to the LATEST installed anthropic.claude-code-* version.
 *
 * Usage:  node apply_claude_rtl_patch.mjs
 *
 * It is:
 *  - idempotent  (skips a version that is already patched)
 *  - safe        (pre-flight guards abort BEFORE writing if class suffixes or code shape changed)
 *  - verified    (syntax + brace balance + ZWNJ-preservation checks after writing)
 *  - cross-OS    (afplay on macOS, powershell beep on Windows)
 *
 * The 3 patches mirror CLAUDE.md:
 *   PATCH 1  webview/index.css  -> RTL messages/input/popup, isolate bidi, LTR code/status
 *   PATCH 2  webview/index.js   -> Alt+Click RTL toggle + MutationObserver artifact cleanup
 *   PATCH 3  extension.js       -> permission (Ping) + completion (Glass) sounds
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const EXT_ROOT = path.join(os.homedir(), '.vscode', 'extensions');
const isWin = process.platform === 'win32';

/* ----------------------------------------------------------------- helpers */
const die = (msg) => { console.error('\n✗ ' + msg + '\n'); process.exit(1); };
const ok  = (msg) => console.log('  ✓ ' + msg);

function semverKey(name) {
  const m = name.match(/(\d+)\.(\d+)\.(\d+)/);
  return m ? m.slice(1, 4).map(Number) : [0, 0, 0];
}
function cmpVer(a, b) {
  const ka = semverKey(a), kb = semverKey(b);
  return ka[0] - kb[0] || ka[1] - kb[1] || ka[2] - kb[2];
}
function findLatest() {
  if (!fs.existsSync(EXT_ROOT)) die('extensions dir not found: ' + EXT_ROOT);
  const dirs = fs.readdirSync(EXT_ROOT)
    .filter((d) => /^anthropic\.claude-code-\d+\.\d+\.\d+/.test(d));
  if (!dirs.length) die('no anthropic.claude-code-* extension installed');
  dirs.sort(cmpVer);
  return dirs[dirs.length - 1];
}
function assertSyntax(file) {
  // eslint-disable-next-line no-new-func
  new Function(fs.readFileSync(file, 'utf8'));
}

/* --------------------------------------------------------------- PATCH 1 (CSS) */
const CSS_MARK = '/* ===== RTL Patch (messages only) ===== */';
const CSS_PATCH = `
${CSS_MARK}
.messagesContainer_07S1Yg { direction: rtl; text-align: right; }
/* Message blocks: force RTL base with isolate (NOT plaintext — plaintext flips any line
   that starts with an English word/number to LTR and garbles the Persian sentence). */
.message_07S1Yg { direction: rtl; text-align: right; unicode-bidi: isolate; }
.userMessage_07S1Yg { direction: rtl; text-align: right; unicode-bidi: isolate; }
.timelineMessage_07S1Yg { direction: rtl; text-align: right; unicode-bidi: isolate; }
.metaMessage_07S1Yg { direction: rtl; text-align: right; unicode-bidi: isolate; }
/* Inline code / file paths stay coherent LTR units (e.g. total=0, KB/s, 8GB) */
.message_07S1Yg code:not(pre code),
.userMessage_07S1Yg code:not(pre code),
.timelineMessage_07S1Yg code:not(pre code),
.metaMessage_07S1Yg code:not(pre code) { direction: ltr; unicode-bidi: isolate; }
/* Status/shimmer container ("Working…", "Thinking…") stays LTR */
.container_hc5dvw { direction: ltr !important; unicode-bidi: embed !important; }
.text_hc5dvw { direction: ltr !important; unicode-bidi: embed !important; }
/* Code blocks stay LTR */
.codeBlockWrapper_-a7MRw { direction: ltr !important; text-align: left !important; unicode-bidi: normal !important; }
.codeBlockWrapper_-a7MRw * { direction: ltr !important; unicode-bidi: normal !important; }
.root_-a7MRw code { direction: ltr !important; text-align: left !important; unicode-bidi: normal !important; }
/* Input area RTL */
.messageInput_cKsPxg { direction: rtl; text-align: right; }
.messageInputContainer_cKsPxg { direction: rtl; text-align: right; }
.inputFooter_gGYT1w { direction: ltr; }
/* ===== AskUserQuestion popup RTL ===== */
.questionsContainer_hONcXw { direction: rtl; text-align: right; }
.questionBlock_hONcXw { direction: rtl; text-align: right; }
.questionItem_hONcXw { direction: rtl; text-align: right; }
.questionText_hONcXw { direction: rtl; text-align: right; }
.questionTextLarge_hONcXw { direction: rtl; text-align: right; }
.questionHeader_hONcXw { direction: rtl; text-align: right; }
.optionsContainer_hONcXw { direction: rtl; text-align: right; }
.option_hONcXw { direction: rtl; text-align: right; }
.optionContent_hONcXw { direction: rtl; text-align: right; }
.optionLabel_hONcXw { direction: rtl; text-align: right; }
.optionDescription_hONcXw { direction: rtl; text-align: right; }
.answerText_hONcXw { direction: rtl; text-align: right; }
.otherInput_hONcXw { direction: rtl; text-align: right; }
`;
// base (unpatched) selectors that MUST exist in the target CSS, else suffixes changed → abort
const CSS_GUARD = [
  '.messagesContainer_07S1Yg', '.message_07S1Yg', '.messageInput_cKsPxg',
  '.codeBlockWrapper_-a7MRw', '.questionsContainer_hONcXw', '.container_hc5dvw',
];

/* --------------------------------------------------------------- PATCH 2 (JS) */
const JS_MARK = '/* ===== RTL Toggle Patch (Alt+Click) ===== */';
// NOTE: the cleanup regex is written with \\u escapes here so the emitted index.js contains
// readable \u escapes (no invisible chars). U+200C (ZWNJ / نیم‌فاصله) and U+200D are EXCLUDED.
const JS_PATCH = `
${JS_MARK}
;(function(){
  var rtlCurrentElement=null,RTL_HL='2px solid #3b82f6',RTL_BG='rgba(59,130,246,0.1)';
  function clr(el){if(el){el.style.outline=el.dataset.rtlO||'';el.style.backgroundColor=el.dataset.rtlB||'';delete el.dataset.rtlO;delete el.dataset.rtlB}}
  function drw(el){if(!el)return;if(typeof el.dataset.rtlO==='undefined'){el.dataset.rtlO=el.style.outline;el.dataset.rtlB=el.style.backgroundColor}el.style.outline=RTL_HL;el.style.backgroundColor=RTL_BG}
  document.addEventListener('mouseover',function(e){if(e.altKey){e.stopPropagation();if(rtlCurrentElement&&rtlCurrentElement!==e.target)clr(rtlCurrentElement);rtlCurrentElement=e.target;drw(rtlCurrentElement)}},true);
  document.addEventListener('mouseout',function(){},true);
  document.addEventListener('keyup',function(e){if(e.key==='Alt'){clr(rtlCurrentElement);rtlCurrentElement=null}});
  document.addEventListener('keydown',function(e){if(!e.altKey||!rtlCurrentElement)return;if(e.key==='ArrowUp'){e.preventDefault();if(rtlCurrentElement.parentElement){clr(rtlCurrentElement);rtlCurrentElement=rtlCurrentElement.parentElement;drw(rtlCurrentElement)}}if(e.key==='ArrowDown'){e.preventDefault();if(rtlCurrentElement.firstElementChild){clr(rtlCurrentElement);rtlCurrentElement=rtlCurrentElement.firstElementChild;drw(rtlCurrentElement)}}});
  document.addEventListener('click',function(e){if(e.altKey&&rtlCurrentElement){e.preventDefault();e.stopPropagation();var t=rtlCurrentElement,d=window.getComputedStyle(t).direction;if(d==='rtl'){t.style.direction='ltr';t.style.textAlign='left'}else{t.style.direction='rtl';t.style.textAlign='right'}t.style.outline='2px solid #22c55e';setTimeout(function(){t.style.outline=t.dataset.rtlO||''},500);rtlCurrentElement=null}},true);
})();
/* ===== End RTL Toggle Patch ===== */

/* ===== Bidi artifact cleanup ===== */
;(function(){
  // Cursor blocks (U+258A/258C), "parallel lines" artifact (U+2261), bidi/zero-width marks.
  // U+200C (ZWNJ / نیم‌فاصله) and U+200D (ZWJ) are EXCLUDED — required Persian orthography.
  var RE = /[\\u258A\\u258C\\u2261\\u200B\\u200E\\u200F\\u202A-\\u202E\\u2060-\\u2064\\u2066-\\u2069\\uFEFF]/g;
  // Arabic harakat (fatha/damma/kasra/tanwin/shadda/sukun) — never written in informal Persian.
  var RE_HARAKAT = /[\\u064B-\\u0652]/g;
  function scanNode(node){
    if(node.nodeType===3){
      var t=node.textContent;
      var clean=t.replace(RE,'').replace(RE_HARAKAT,'');
      if(clean!==t){node.textContent=clean}
    }else{
      for(var i=0;i<node.childNodes.length;i++)scanNode(node.childNodes[i]);
    }
  }
  function cleanAllMessages(){ document.querySelectorAll('.messagesContainer_07S1Yg').forEach(scanNode); }
  var scheduled=false;
  function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(function(){scheduled=false;cleanAllMessages()})}
  var obs=new MutationObserver(schedule);
  function start(){try{obs.observe(document.body,{childList:true,subtree:true,characterData:true})}catch(e){}cleanAllMessages()}
  if(document.body){start()}else{document.addEventListener('DOMContentLoaded',start)}
})();
/* ===== End Bidi artifact cleanup ===== */
`;

/* --------------------------------------------------------------- PATCH 3 (extension.js) */
const permExec = isWin
  ? `require("child_process").exec('powershell -NoProfile -c "[console]::beep(1200,150);[console]::beep(1200,150)"')`
  : `require("child_process").exec("afplay /System/Library/Sounds/Ping.aiff")`;
const doneExec = isWin
  ? `require("child_process").exec('powershell -NoProfile -c "[console]::beep(800,300);[console]::beep(1000,300)"')`
  : `require("child_process").exec("afplay /System/Library/Sounds/Glass.aiff")`;

// Parameter/variable names are minified and DO change between versions (e.g. 2.1.205 had
// requestToolPermission(e,t,r,i,n) but 2.1.212 has (e,t,r,n,i)). So match structurally with
// regexes that capture whatever names are in use, rather than hardcoding them.

// 3A — insert the permission sound right after the opening `{`, before `if(this.channels`.
const A_RE = () => /async requestToolPermission\(([^)]*)\)\{(?=if\(this\.channels)/g;
const A_SUB = (_m, params) =>
  `async requestToolPermission(${params}){try{if(!globalThis._sndPerm||Date.now()-globalThis._sndPerm>5000){globalThis._sndPerm=Date.now();${permExec}}}catch(e){}`;

// 3B — wrap the completion branch. \2 backreference pins the same target var on both sides.
const B_RE = () => /else if\(([A-Za-z_$][\w$]*)\.request\.hasUnseenCompletion\)([A-Za-z_$][\w$]*)="claude-logo-done\.svg";else \2="claude-logo\.svg"/g;
const B_SUB = (_m, condVar, tgtVar) =>
  `else if(${condVar}.request.hasUnseenCompletion){${tgtVar}="claude-logo-done.svg";if(!globalThis._sndDone||Date.now()-globalThis._sndDone>5000){globalThis._sndDone=Date.now();try{${doneExec}}catch(e){}}}else ${tgtVar}="claude-logo.svg"`;

const countMatches = (src, re) => (src.match(re) || []).length;

/* ----------------------------------------------------------------- main */
const verName = findLatest();
const EXT = path.join(EXT_ROOT, verName);
const cssF = path.join(EXT, 'webview', 'index.css');
const jsF  = path.join(EXT, 'webview', 'index.js');
const extF = path.join(EXT, 'extension.js');

console.log('\n▶ Target: ' + verName + '  (' + (isWin ? 'windows' : 'mac') + ' sounds)\n');

for (const f of [cssF, jsF, extF]) if (!fs.existsSync(f)) die('missing file: ' + f);

const cssSrc = fs.readFileSync(cssF, 'utf8');
const jsSrc  = fs.readFileSync(jsF, 'utf8');
const extSrc = fs.readFileSync(extF, 'utf8');

// Idempotency
const cssDone = cssSrc.includes(CSS_MARK);
const jsDone  = jsSrc.includes(JS_MARK);
const extDone = extSrc.includes('_sndPerm') && extSrc.includes('_sndDone');
if (cssDone && jsDone && extDone) {
  console.log('● Already fully patched — nothing to do.\n');
  process.exit(0);
}

// Pre-flight guards (abort BEFORE writing anything if shape changed)
if (!cssDone) {
  const missing = CSS_GUARD.filter((sel) => !cssSrc.includes(sel));
  if (missing.length) die('CSS class suffix(es) changed — these no longer exist:\n   ' + missing.join('\n   ') +
    '\n  Re-derive the suffixes (see CLAUDE.md) before patching this version.');
}
if (!extDone) {
  const aN = countMatches(extSrc, A_RE());
  const bN = countMatches(extSrc, B_RE());
  if (aN !== 1) die(`extension.js 3A (requestToolPermission) matched ${aN}× (expected 1) — code shape changed.`);
  if (bN !== 1) die(`extension.js 3B (hasUnseenCompletion) matched ${bN}× (expected 1) — code shape changed.`);
}

// Backups (only if not already present)
for (const f of [cssF, jsF, extF]) {
  const bak = f + '.bak';
  if (!fs.existsSync(bak)) fs.copyFileSync(f, bak);
}
ok('backups ensured (.bak)');

// PATCH 1
if (!cssDone) {
  fs.writeFileSync(cssF, cssSrc + '\n' + CSS_PATCH);
  const s = fs.readFileSync(cssF, 'utf8');
  const o = (s.match(/{/g) || []).length, c = (s.match(/}/g) || []).length;
  if (o !== c) die(`CSS braces unbalanced after patch (${o}/${c})`);
  ok('PATCH 1 (index.css) — RTL/isolate/popup, braces balanced');
} else ok('PATCH 1 already present — skipped');

// PATCH 2
if (!jsDone) {
  fs.writeFileSync(jsF, jsSrc + '\n' + JS_PATCH);
  assertSyntax(jsF);
  // functional check: ZWNJ preserved, ≡ stripped
  const mod = fs.readFileSync(jsF, 'utf8');
  const reM = mod.match(/var RE = (\/\[.*?\]\/g);/);
  const hkM = mod.match(/var RE_HARAKAT = (\/\[.*?\]\/g);/);
  // eslint-disable-next-line no-eval
  const RE = eval(reM[1]); const RE_HARAKAT = eval(hkM[1]);
  const t = (x) => x.replace(RE, '').replace(RE_HARAKAT, '');
  const zwnj = '‌';
  if (t('می' + zwnj + 'رود') !== 'می' + zwnj + 'رود')
    die('cleanup regex would strip ZWNJ (نیم‌فاصله) — refusing.');
  if (t('lock≡ش') !== 'lockش') die('cleanup regex does not strip U+2261 — check.');
  ok('PATCH 2 (index.js) — toggle + cleanup; syntax OK, ZWNJ preserved, ≡ stripped');
} else ok('PATCH 2 already present — skipped');

// PATCH 3
if (!extDone) {
  const out = extSrc.replace(A_RE(), A_SUB).replace(B_RE(), B_SUB);
  if (!out.includes('_sndPerm') || !out.includes('_sndDone')) die('PATCH 3 substitution produced no sound hooks — aborting.');
  // validate before writing
  // eslint-disable-next-line no-new-func
  new Function(out);
  fs.writeFileSync(extF, out);
  ok('PATCH 3 (extension.js) — permission + completion sounds; syntax OK');
} else ok('PATCH 3 already present — skipped');

console.log('\n✅ Done patching ' + verName + '.  Run "Reload Window" in VS Code.\n');
