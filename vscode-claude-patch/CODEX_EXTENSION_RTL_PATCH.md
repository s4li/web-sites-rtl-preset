# Codex VS Code RTL Patch Notes

این فایل برای پچ کردن اکستنشن VS Code مربوط به Codex/OpenAI نگه داشته شده است.
بعد از آپدیت اکستنشن، معمولاً فقط نام فولدر نسخه و hash فایل‌های asset عوض می‌شود؛ من باید از روی این راهنما فایل‌های جدید را پیدا کنم، backup بگیرم و همین پچ را دوباره اعمال کنم.

## هدف پچ

- composer اکستنشن Codex برای فارسی/عربی راست‌چین و RTL شود.
- متن پیام‌های user و assistant در markdown راست‌چین شود.
- code blockها، inline code و محتوای فنی LTR باقی بمانند.
- با `Alt + Click` بتوان جهت یک بخش را دستی بین RTL/LTR تغییر داد.

## اکستنشن هدف

اکستنشن نصب‌شده معمولاً این الگو را دارد:

```text
C:\Users\v_rae\.vscode\extensions\openai.chatgpt-<version>-win32-x64
```

نسخه‌ای که اولین بار پچ شد:

```text
C:\Users\v_rae\.vscode\extensions\openai.chatgpt-26.527.31454-win32-x64
```

در `package.json`:

```json
{
  "name": "chatgpt",
  "publisher": "openai",
  "main": "./out/extension.js"
}
```

## ساختار مهم webview

فایل اصلی webview:

```text
webview\index.html
```

در نسخه‌ی قبلی این فایل به این entry اشاره می‌کرد:

```html
<script type="module" crossorigin src="./assets/index-DaxayE40.js"></script>
```

در نسخه‌های جدید، فایل `index-*.js` احتمالاً hash جدید دارد. باید از `webview\index.html` خوانده شود.

فایل CSS اصلی در نسخه‌ی قبلی:

```text
webview\assets\app-main-DGDTSRlh.css
```

در نسخه‌های جدید، اسم `app-main-*.css` احتمالاً عوض می‌شود. می‌توان آن را از dependency map داخل `index-*.js` یا با جستجوی `app-main-*.css` پیدا کرد.

## تفاوت Codex با Claude

در پچ Claude مشکل اصلی این بود که input واقعی شفاف بود و متن قابل‌دیدن در mirror جداگانه می‌آمد:

```text
.messageInput_cKsPxg
.mentionMirror_cKsPxg
```

اما Codex از ProseMirror استفاده می‌کند. input اصلی داخل DOM این selector را دارد:

```css
.ProseMirror[data-virtualkeyboard="true"]
```

پس برای Codex نباید دنبال `mentionMirror` گشت؛ هدف اصلی composer همان `.ProseMirror` است.

## فایل‌هایی که باید پچ شوند

1. CSS اصلی:

```text
webview\assets\app-main-*.css
```

2. JS entry:

```text
webview\assets\index-*.js
```

قبل از تغییر، کنار هر فایل backup ساخته شود:

```text
<filename>.bak-rtl-YYYYMMDD
```

برای جلوگیری از append تکراری، اول markerها را چک کن:

```text
Codex RTL Patch
Codex RTL Toggle Patch
```

## CSS Patch

این قطعه باید به انتهای `app-main-*.css` اضافه شود:

```css
/* ===== Codex RTL Patch (Persian/Arabic friendly) ===== */
.ProseMirror[data-virtualkeyboard="true"],
.ProseMirror[data-virtualkeyboard="true"] p,
.ProseMirror[data-virtualkeyboard="true"] li,
.ProseMirror[data-virtualkeyboard="true"] blockquote,
.text-size-chat.whitespace-pre-wrap,
[class*="_markdownContent_"],
[class*="_markdownContent_"] :is(p,li,blockquote,h1,h2,h3,h4,h5,h6) {
  direction: rtl !important;
  text-align: right !important;
  unicode-bidi: plaintext !important;
}

.ProseMirror[data-virtualkeyboard="true"] .placeholder,
.ProseMirror[data-virtualkeyboard="true"] .placeholder:after {
  direction: rtl !important;
  text-align: right !important;
}

.ProseMirror[data-virtualkeyboard="true"] :is(pre,code,kbd,samp),
.ProseMirror[data-virtualkeyboard="true"] :is([data-file-reference],[skill-mention-name]),
.text-size-chat.whitespace-pre-wrap :is(pre,code,kbd,samp),
[class*="_markdownContent_"] :is(pre,code,kbd,samp,[class*="_codeBlock_"],[class*="_codeBlock_"] *) {
  direction: ltr !important;
  text-align: left !important;
  unicode-bidi: isolate !important;
}

.codex-rtl-toggle-hover {
  outline: 1px solid color-mix(in srgb, var(--color-token-focus-border, #8ab4f8) 75%, transparent) !important;
  outline-offset: 2px !important;
  cursor: alias !important;
}
/* ===== End Codex RTL Patch ===== */
```

## JS Patch

این قطعه باید به انتهای `index-*.js` اضافه شود:

```js

/* ===== Codex RTL Toggle Patch (Alt+Click) ===== */
(() => {
  if (globalThis.__codexRtlTogglePatch) return;
  globalThis.__codexRtlTogglePatch = true;

  const HOVER_CLASS = "codex-rtl-toggle-hover";
  const SELECTOR = '.ProseMirror,[class*="_markdownContent_"],.text-size-chat.whitespace-pre-wrap,pre,code,p,li,blockquote,td,th';
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
/* ===== End Codex RTL Toggle Patch ===== */
```

## مراحل بعد از آپدیت اکستنشن

1. فولدر جدید را پیدا کن:

```powershell
Get-ChildItem "$env:USERPROFILE\.vscode\extensions" | Where-Object { $_.Name -match '^openai\.chatgpt-' } | Sort-Object LastWriteTime -Descending | Select-Object -First 1
```

2. از `webview\index.html` نام `assets\index-*.js` را بخوان.

3. CSS اصلی را پیدا کن:

```powershell
rg -n "app-main-.*\.css|ProseMirror|_markdownContent_" "<extension-root>\webview\assets"
```

4. اگر markerها وجود ندارند، backup بگیر و CSS/JS patch را append کن.

5. VS Code را reload کن:

```text
Ctrl+Shift+P -> Developer: Reload Window
```

## تست سریع

بعد از reload:

- در Codex composer متن فارسی تایپ کن؛ باید از راست شروع شود.
- یک prompt با code block بفرست؛ کد باید LTR بماند.
- روی یک پیام `Alt` را نگه دار؛ hover outline باید دیده شود.
- با `Alt + Click` جهت همان بخش باید toggle شود.

## Rollback

اگر پچ مشکلی ایجاد کرد، فایل‌های backup را جایگزین فایل‌های اصلی کن:

```text
app-main-*.css.bak-rtl-YYYYMMDD
index-*.js.bak-rtl-YYYYMMDD
```

بعد VS Code را reload کن.
