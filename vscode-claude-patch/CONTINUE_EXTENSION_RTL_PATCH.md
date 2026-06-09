# Continue VS Code RTL Patch Notes

این فایل برای پچ کردن اکستنشن Continue در VS Code نگه داشته شده است.
بعد از آپدیت Continue، معمولاً فقط فولدر نسخه عوض می‌شود، ولی فایل‌های UI در همین ساختار باقی می‌مانند.

## هدف پچ

- ورودی chat در Continue برای فارسی/عربی RTL و راست‌چین شود.
- پیام‌های markdown در خروجی راست‌چین شوند.
- code blockها، inline code، KaTeX و Mermaid تا حد ممکن LTR باقی بمانند.
- با `Alt + Click` بتوان جهت یک بخش را دستی بین RTL/LTR تغییر داد.

## اکستنشن هدف

الگوی مسیر نصب:

```text
C:\Users\v_rae\.vscode\extensions\continue.continue-<version>-win32-x64
```

نسخه‌ای که اولین بار پچ شد:

```text
C:\Users\v_rae\.vscode\extensions\continue.continue-1.2.22-win32-x64
```

در `package.json`:

```json
{
  "name": "continue",
  "publisher": "Continue",
  "main": "./out/extension.js"
}
```

## ساختار مهم GUI

فایل webview اصلی:

```text
gui\index.html
```

در نسخه‌ی 1.2.22:

```html
<script type="module" crossorigin src="/assets/index.js"></script>
<link rel="stylesheet" crossorigin href="/assets/index.css">
```

پس فایل‌های patch target:

```text
gui\assets\index.css
gui\assets\index.js
```

## نکته‌ی فنی

Continue برای composer از TipTap/ProseMirror استفاده می‌کند.
selectorهای اصلی:

```css
.tiptap
.ProseMirror
.tiptap p.is-editor-empty:first-child:before
```

برای markdown خروجی از کلاس‌های `wmde-markdown` استفاده می‌شود:

```css
.wmde-markdown
```

در نسخه‌ی 1.2.22 یک بخش مهم‌تر هم وجود دارد: renderer اصلی markdown با styled-components ساخته شده و کلاس ثابت ندارد. باید در `gui\assets\index.js` به `Rnn` یک کلاس ثابت اضافه شود:

```js
y.jsx(Rnn,{fontSize:ua(),whiteSpace:d,bgColor:e.useParentBackgroundColor?"":Go,children:l})
```

تبدیل شود به:

```js
y.jsx(Rnn,{className:"continue-rtl-markdown",fontSize:ua(),whiteSpace:d,bgColor:e.useParentBackgroundColor?"":Go,children:l})
```

## Backup و marker

قبل از تغییر، کنار هر فایل backup بساز:

```text
index.css.bak-rtl-YYYYMMDD
index.js.bak-rtl-YYYYMMDD
```

برای جلوگیری از append تکراری، اول markerها را چک کن:

```text
Continue RTL Patch
Continue RTL Toggle Patch
```

## CSS Patch

این قطعه باید به انتهای `gui\assets\index.css` اضافه شود:

```css
/* ===== Continue RTL Patch (Persian/Arabic friendly) ===== */
.tiptap,
.tiptap.ProseMirror,
.ProseMirror.tiptap,
.tiptap p,
.tiptap li,
.tiptap blockquote,
.wmde-markdown,
.wmde-markdown :is(p,li,blockquote,h1,h2,h3,h4,h5,h6,td,th) {
  direction: rtl !important;
  text-align: right !important;
  unicode-bidi: plaintext !important;
}

.tiptap p.is-editor-empty:first-child:before {
  direction: rtl !important;
  text-align: right !important;
  float: right !important;
  width: 100% !important;
}

.tiptap :is(pre,code,kbd,samp),
.tiptap :is(.mention,.command-suggestion),
.wmde-markdown :is(pre,code,kbd,samp,.hljs,[class*="language-"],[class*="token"]),
.wmde-markdown pre *,
.wmde-markdown .mermaid,
.wmde-markdown .katex,
.wmde-markdown .katex * {
  direction: ltr !important;
  text-align: left !important;
  unicode-bidi: isolate !important;
}

.wmde-markdown .katex-display,
.wmde-markdown .katex-display * {
  text-align: center !important;
}

.continue-rtl-toggle-hover {
  outline: 1px solid color-mix(in srgb, var(--vscode-focusBorder, #8ab4f8) 75%, transparent) !important;
  outline-offset: 2px !important;
  cursor: alias !important;
}
/* ===== End Continue RTL Patch ===== */
```

## CSS Patch v2

اگر خروجی پیام‌ها هنوز از چپ شروع شد، این قطعه هم باید به انتهای `gui\assets\index.css` اضافه شود. این patch روی کلاس `continue-rtl-markdown` می‌نشیند که در JS به renderer اضافه شده است:

```css
/* ===== Continue RTL Patch v2 (Markdown renderer fix) ===== */
.continue-rtl-markdown,
.continue-rtl-markdown :is(p,li,blockquote,h1,h2,h3,h4,h5,h6,td,th),
.whitespace-pre-wrap.break-words {
  direction: rtl !important;
  text-align: right !important;
  unicode-bidi: plaintext !important;
}

.continue-rtl-markdown :is(ul,ol) {
  direction: rtl !important;
  text-align: right !important;
  padding-right: 2em !important;
  padding-left: 0 !important;
  list-style-position: outside !important;
}

.continue-rtl-markdown :is(ul ul,ul ol,ol ul,ol ol) {
  padding-right: 1.5em !important;
  padding-left: 0 !important;
}

.continue-rtl-markdown :is(pre,code,kbd,samp,.hljs,[class*="language-"],[class*="token"]),
.continue-rtl-markdown pre *,
.continue-rtl-markdown .mermaid,
.continue-rtl-markdown .katex,
.continue-rtl-markdown .katex *,
.whitespace-pre-wrap.break-words code {
  direction: ltr !important;
  text-align: left !important;
  unicode-bidi: isolate !important;
}

.continue-rtl-markdown .katex-display,
.continue-rtl-markdown .katex-display * {
  text-align: center !important;
}
/* ===== End Continue RTL Patch v2 ===== */
```

## CSS Patch v3

برای متن‌های mixed bidi مثل `Add Context` یا `Agent Mode` داخل جمله‌ی فارسی و برای markerهای `ul/ol`، این قطعه هم باید به انتهای `gui\assets\index.css` اضافه شود:

```css
/* ===== Continue RTL Patch v3 (Mixed bidi/list fix) ===== */
.continue-rtl-markdown :is(ul,ol) {
  list-style-position: inside !important;
  padding-right: 0 !important;
  padding-left: 0 !important;
  margin-right: 0 !important;
}

.continue-rtl-markdown li {
  direction: rtl !important;
  text-align: right !important;
  unicode-bidi: plaintext !important;
}

.continue-rtl-markdown li::marker {
  direction: rtl !important;
  unicode-bidi: isolate !important;
}

.continue-rtl-markdown .continue-ltr-inline,
.continue-rtl-markdown bdi[dir="ltr"] {
  direction: ltr !important;
  unicode-bidi: isolate !important;
  text-align: left !important;
}

.continue-rtl-markdown :is(strong,b,a,em) code,
.continue-rtl-markdown code.continue-ltr-inline {
  display: inline !important;
}
/* ===== End Continue RTL Patch v3 ===== */
```

## JS Mixed Bidi Patch

این قطعه باید به انتهای `gui\assets\index.js` اضافه شود. کارش این است که inlineهای کوتاه و عمدتاً انگلیسی داخل markdown، مثل `Add Context`، را `dir="ltr"` و `unicode-bidi:isolate` کند:

```js

/* ===== Continue RTL Mixed Bidi Patch ===== */
(() => {
  if (globalThis.__continueRtlMixedBidiPatch) return;
  globalThis.__continueRtlMixedBidiPatch = true;

  const ROOT_SELECTOR = ".continue-rtl-markdown";
  const INLINE_SELECTOR = "strong,b,a,em,span";
  const RTL_RE = /[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/;
  const LATIN_RE = /[A-Za-z]/;

  const shouldIsolateLtr = (element) => {
    if (!element || element.closest("pre,code,kbd,samp,.katex,.mermaid")) return false;
    const text = (element.textContent || "").trim();
    if (!text || text.length > 80) return false;
    if (!LATIN_RE.test(text) || RTL_RE.test(text)) return false;
    const latinCount = (text.match(/[A-Za-z]/g) || []).length;
    const visibleCount = (text.match(/[A-Za-z0-9]/g) || []).length || text.length;
    return latinCount / visibleCount >= 0.45;
  };

  const patchRoot = (root) => {
    if (!(root instanceof Element)) return;
    root.querySelectorAll(INLINE_SELECTOR).forEach((element) => {
      if (shouldIsolateLtr(element)) {
        element.setAttribute("dir", "ltr");
        element.classList.add("continue-ltr-inline");
        element.style.unicodeBidi = "isolate";
      }
    });
  };

  const patchAll = () => document.querySelectorAll(ROOT_SELECTOR).forEach(patchRoot);

  const observer = new MutationObserver((mutations) => {
    let shouldPatch = false;
    for (const mutation of mutations) {
      if (mutation.type === "childList" && mutation.addedNodes.length) {
        shouldPatch = true;
        break;
      }
      if (mutation.type === "characterData") {
        shouldPatch = true;
        break;
      }
    }
    if (shouldPatch) requestAnimationFrame(patchAll);
  });

  const start = () => {
    patchAll();
    observer.observe(document.body, { subtree: true, childList: true, characterData: true });
  };

  if (document.body) start();
  else window.addEventListener("DOMContentLoaded", start, { once: true });
})();
/* ===== End Continue RTL Mixed Bidi Patch ===== */
```

## JS Patch

این قطعه باید به انتهای `gui\assets\index.js` اضافه شود:

```js

/* ===== Continue RTL Toggle Patch (Alt+Click) ===== */
(() => {
  if (globalThis.__continueRtlTogglePatch) return;
  globalThis.__continueRtlTogglePatch = true;

  const HOVER_CLASS = "continue-rtl-toggle-hover";
  const SELECTOR = '.tiptap,.ProseMirror,.continue-rtl-markdown,.wmde-markdown,.whitespace-pre-wrap,pre,code,p,li,blockquote,td,th';
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
/* ===== End Continue RTL Toggle Patch ===== */
```

## مراحل بعد از آپدیت

1. فولدر جدید Continue را پیدا کن:

```powershell
Get-ChildItem "$env:USERPROFILE\.vscode\extensions" | Where-Object { $_.Name -match '^continue\.continue-' } | Sort-Object LastWriteTime -Descending | Select-Object -First 1
```

2. مطمئن شو فایل‌ها وجود دارند:

```text
gui\assets\index.css
gui\assets\index.js
```

3. اگر markerها وجود ندارند، backup بگیر و patchها را append کن. markerهای فعلی:

```text
Continue RTL Patch
Continue RTL Patch v2
Continue RTL Patch v3
Continue RTL Toggle Patch
Continue RTL Mixed Bidi Patch
```

4. VS Code را reload کن:

```text
Ctrl+Shift+P -> Developer: Reload Window
```

## تست سریع

- در Continue chat یک متن فارسی بنویس؛ composer باید از راست شروع شود.
- پیام فارسی و markdown باید راست‌چین شود.
- code block باید LTR بماند.
- با نگه داشتن `Alt` و hover، outline باید دیده شود.
- با `Alt + Click` جهت همان بخش باید toggle شود.

## Rollback

اگر مشکلی ایجاد شد، backupها را جایگزین فایل‌های اصلی کن:

```text
index.css.bak-rtl-YYYYMMDD
index.js.bak-rtl-YYYYMMDD
```

بعد VS Code را reload کن.
