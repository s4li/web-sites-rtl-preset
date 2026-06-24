import { copyFile, readFile, appendFile } from "node:fs/promises";

const targets = [
  {
    path: "/Users/salam/.vscode/extensions/openai.chatgpt-26.616.51431-darwin-arm64/webview/assets/app-main-BWYQnX6b.css",
    marker: "Codex RTL Patch",
    patch: String.raw`

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
`,
  },
  {
    path: "/Users/salam/.vscode/extensions/openai.chatgpt-26.616.51431-darwin-arm64/webview/assets/index-DPL_E_ma.js",
    marker: "Codex RTL Toggle Patch",
    patch: String.raw`

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
`,
  },
];

for (const target of targets) {
  const content = await readFile(target.path, "utf8");
  if (content.includes(target.marker)) {
    console.log(`already patched: ${target.path}`);
    continue;
  }

  const backup = `${target.path}.bak-rtl-20260622`;
  await copyFile(target.path, backup);
  await appendFile(target.path, target.patch, "utf8");
  console.log(`patched: ${target.path}`);
  console.log(`backup:  ${backup}`);
}
