#!/usr/bin/env node
/*
 * apply_codex_rtl_patch.mjs
 * Applies the Persian/Arabic RTL patch to the LATEST installed Codex (openai.chatgpt-*) VS Code
 * extension. Companion of apply_claude_rtl_patch.mjs.
 *
 * Usage:  node apply_codex_rtl_patch.mjs
 *
 * Codex's webview is a Vite/rolldown build: every update renames the version folder AND the hashed
 * asset files, and 26.908 also renamed the CSS-module classes the patch targets. So nothing here is
 * hardcoded to a version or a hash:
 *  - the JS target is the `<script type="module" src>` entry that webview/index.html loads;
 *  - the CSS target is whichever stylesheet index.html links that holds the message markdown class;
 *  - selectors are substring matches on the class-name stem, listing both the old and new stems.
 *
 * It is idempotent (markers), safe (pre-flight aborts before writing if the selectors are gone),
 * backs up each file once to <file>.bak-rtl, and verifies the result (CSS brace balance, JS parse).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

// CODEX_EXT_ROOT lets the script be dry-run against a copy instead of the live extension.
const EXT_ROOT = process.env.CODEX_EXT_ROOT || path.join(os.homedir(), '.vscode', 'extensions');
const die = (msg) => { console.error('\n✗ ' + msg + '\n'); process.exit(1); };
const ok = (msg) => console.log('  ✓ ' + msg);

/* ----------------------------------------------------------------- locate the extension */
// Folder names look like openai.chatgpt-26.908.40401-darwin-arm64 — compare the numeric version.
const verKey = (d) => (d.match(/^openai\.chatgpt-(\d+)\.(\d+)\.(\d+)/) || []).slice(1, 4).map(Number);
const cmp = (a, b) => { const x = verKey(a), y = verKey(b); return x[0] - y[0] || x[1] - y[1] || x[2] - y[2]; };

if (!fs.existsSync(EXT_ROOT)) die('extensions dir not found: ' + EXT_ROOT);
const dirs = fs.readdirSync(EXT_ROOT).filter((d) => /^openai\.chatgpt-\d+\.\d+\.\d+/.test(d)).sort(cmp);
if (!dirs.length) die('no openai.chatgpt-* (Codex) extension installed');
const verName = dirs[dirs.length - 1];
const WEB = path.join(EXT_ROOT, verName, 'webview');
const ASSETS = path.join(WEB, 'assets');
const html = fs.readFileSync(path.join(WEB, 'index.html'), 'utf8');

console.log('\n▶ Target: ' + verName + '\n');

// Anything that pins file contents would reject a modified asset — refuse rather than break Codex.
if (/\bintegrity\s*=/.test(html)) die('index.html uses Subresource Integrity — patching assets would stop them loading.');

const entryM = html.match(/<script[^>]*type="module"[^>]*src="\.\/assets\/([^"]+\.js)"/);
if (!entryM) die('could not find the <script type="module"> entry in webview/index.html');
const jsF = path.join(ASSETS, entryM[1]);

const linkedCss = [...html.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="\.\/assets\/([^"]+\.css)"/g)].map((m) => m[1]);
if (!linkedCss.length) die('index.html links no stylesheet — the layout changed, re-check before patching.');

/* ----------------------------------------------------------------- selectors */
// Message markdown root: `_markdownContent_` up to 26.6xx, `_MarkdownRoot_` from 26.908. Class
// attribute matching is case-sensitive, so both stems are listed. Same for code blocks.
const MD_STEMS = ['_MarkdownRoot_', '_markdownContent_'];
const CB_STEMS = ['_CodeBlock_', '_codeBlock_'];
const count = (s, needle) => s.split(needle).length - 1;

// CSS target = the linked stylesheet that holds the markdown class (it is loaded at startup).
const scored = linkedCss
  .map((f) => { const c = fs.readFileSync(path.join(ASSETS, f), 'utf8'); return { f, c, n: MD_STEMS.reduce((a, s) => a + count(c, s), 0) }; })
  .sort((a, b) => b.n - a.n);
if (!scored[0].n) die('none of the linked stylesheets contains ' + MD_STEMS.join(' / ')
  + ' — Codex renamed its message class again. Find the new stem before patching.');
const cssF = path.join(ASSETS, scored[0].f);

// Pre-flight: the selectors must still exist somewhere in this build, or the patch would be a no-op.
const allAssets = fs.readdirSync(ASSETS).filter((f) => /\.(css|js)$/.test(f))
  .map((f) => fs.readFileSync(path.join(ASSETS, f), 'utf8')).join('\n');
for (const [label, stems] of [['composer', ['ProseMirror']], ['message', MD_STEMS], ['code block', CB_STEMS]]) {
  if (!stems.some((s) => allAssets.includes(s))) die(`${label} selector (${stems.join(' / ')}) not found in this build.`);
}

const md = (inner) => MD_STEMS.map((s) => `[class*="${s}"]${inner}`).join(',\n');

/* ----------------------------------------------------------------- patches */
const CSS_MARK = 'Codex RTL Patch';
const CSS_PATCH = `

/* ===== ${CSS_MARK} (Persian/Arabic friendly) ===== */
/* Composer: 26.908 dropped the [data-virtualkeyboard] attribute, so target .ProseMirror itself.
   plaintext picks each paragraph's direction from its first strong letter, so English stays LTR. */
.ProseMirror,
.ProseMirror p,
.ProseMirror li,
.ProseMirror blockquote,
.text-size-chat.whitespace-pre-wrap,
${md('')},
${md(' :is(p,li,blockquote,h1,h2,h3,h4,h5,h6)')} {
  direction: rtl !important;
  text-align: right !important;
  unicode-bidi: plaintext !important;
}

.ProseMirror .placeholder,
.ProseMirror .placeholder:after {
  direction: rtl !important;
  text-align: right !important;
}

.ProseMirror :is(pre,code,kbd,samp),
.ProseMirror :is([data-file-reference],[skill-mention-name]),
.text-size-chat.whitespace-pre-wrap :is(pre,code,kbd,samp),
${md(` :is(pre,code,kbd,samp,${CB_STEMS.map((s) => `[class*="${s}"],[class*="${s}"] *`).join(',')})`)} {
  direction: ltr !important;
  text-align: left !important;
  unicode-bidi: isolate !important;
}

.codex-rtl-toggle-hover {
  outline: 1px solid color-mix(in srgb, var(--color-token-focus-border, #8ab4f8) 75%, transparent) !important;
  outline-offset: 2px !important;
  cursor: alias !important;
}
/* ===== End ${CSS_MARK} ===== */
`;

const JS_MARK = 'Codex RTL Toggle Patch';
const TOGGLE_SELECTOR = ['.ProseMirror', ...MD_STEMS.map((s) => `[class*="${s}"]`),
  '.text-size-chat.whitespace-pre-wrap', 'pre', 'code', 'p', 'li', 'blockquote', 'td', 'th'].join(',');
const JS_PATCH = `

/* ===== ${JS_MARK} (Alt+Click) ===== */
(() => {
  if (globalThis.__codexRtlTogglePatch) return;
  globalThis.__codexRtlTogglePatch = true;

  const HOVER_CLASS = "codex-rtl-toggle-hover";
  const SELECTOR = ${JSON.stringify(TOGGLE_SELECTOR)};
  let altDown = false;
  let hovered = null;
  let lastX = 0;
  let lastY = 0;

  const isElement = (value) => value && value.nodeType === 1;
  const pick = (target) => isElement(target) ? target.closest(SELECTOR) : null;

  const clearHover = () => {
    if (hovered) hovered.classList.remove(HOVER_CLASS);
    hovered = null;
  };

  const setHover = (element) => {
    if (hovered === element) return;
    clearHover();
    hovered = element;
    if (hovered) hovered.classList.add(HOVER_CLASS);
  };

  const applyDirection = (element, rtl) => {
    element.setAttribute("dir", rtl ? "rtl" : "ltr");
    element.style.direction = rtl ? "rtl" : "ltr";
    element.style.textAlign = rtl ? "right" : "left";
    element.style.unicodeBidi = rtl ? "plaintext" : "isolate";
  };

  const toggleDirection = (element) => {
    const current = (element.getAttribute("dir") || getComputedStyle(element).direction || "").toLowerCase();
    applyDirection(element, current !== "rtl");
  };

  const moveToParent = () => {
    if (!hovered) return;
    let parent = hovered.parentElement;
    while (parent && !parent.matches(SELECTOR)) parent = parent.parentElement;
    if (parent) setHover(parent);
  };

  const moveToChild = () => {
    if (!hovered) return;
    const child = hovered.querySelector(SELECTOR);
    if (child) setHover(child);
  };

  document.addEventListener("mousemove", (event) => {
    lastX = event.clientX;
    lastY = event.clientY;
    if (altDown) setHover(pick(event.target));
  }, true);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Alt") {
      altDown = true;
      setHover(pick(document.elementFromPoint(lastX, lastY)) || pick(document.activeElement));
      return;
    }
    if (!altDown) return;
    if (event.key === "ArrowUp") {
      event.preventDefault();
      moveToParent();
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      moveToChild();
    }
  }, true);

  document.addEventListener("keyup", (event) => {
    if (event.key === "Alt") {
      altDown = false;
      clearHover();
    }
  }, true);

  document.addEventListener("click", (event) => {
    if (!event.altKey) return;
    const element = hovered || pick(event.target);
    if (!element) return;
    event.preventDefault();
    event.stopPropagation();
    toggleDirection(element);
    setHover(element);
  }, true);

  window.addEventListener("blur", () => {
    altDown = false;
    clearHover();
  }, true);
})();
/* ===== End ${JS_MARK} ===== */
`;

/* ----------------------------------------------------------------- apply */
function checkCss(file) {
  const s = fs.readFileSync(file, 'utf8');
  const o = count(s, '{'), c = count(s, '}');
  if (o !== c) die(`CSS braces unbalanced after patch (${o}/${c}) in ${path.basename(file)}`);
}
function checkJs(file) {
  // The entry is an ES module with top-level await, so `new Function` cannot parse it: check it as
  // a module from a scratch copy (the extension folder has no package.json "type" to rely on).
  const tmp = path.join(os.tmpdir(), `codex-entry-check-${process.pid}.mjs`);
  fs.copyFileSync(file, tmp);
  const r = spawnSync(process.execPath, ['--check', tmp], { encoding: 'utf8' });
  fs.rmSync(tmp, { force: true });
  if (r.status !== 0) die(`JS no longer parses after patch (${path.basename(file)}):\n${r.stderr}`);
}

for (const [file, mark, patch, verify, label] of [
  [cssF, CSS_MARK, CSS_PATCH, checkCss, 'CSS'],
  [jsF, JS_MARK, JS_PATCH, checkJs, 'JS toggle'],
]) {
  const src = fs.readFileSync(file, 'utf8');
  if (src.includes(mark)) { ok(`${label} already present — skipped (${path.basename(file)})`); continue; }
  const bak = file + '.bak-rtl';
  if (!fs.existsSync(bak)) fs.copyFileSync(file, bak);
  fs.appendFileSync(file, patch, 'utf8');
  verify(file);
  ok(`${label} patched → ${path.basename(file)}  (backup: ${path.basename(bak)})`);
}

console.log('\n✅ Done patching ' + verName + '.  Run "Reload Window" in VS Code.\n');
