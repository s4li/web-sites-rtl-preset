# Problem: Make Claude Code VS Code Extension Input RTL

## Goal
The input box (where the user types messages) in the Claude Code VS Code extension needs to support RTL (right-to-left) text direction for Persian/Farsi.

## Current Status
- **Messages area (output)**: RTL works correctly via CSS classes like `.messagesContainer_07S1Yg`, `.message_07S1Yg`, etc.
- **Code blocks**: Correctly stay LTR via `.codeBlockWrapper_-a7MRw` overrides.
- **Input box**: Still LTR — this is the problem.

## What Has Been Tried (and failed)

### 1. CSS `direction: rtl` on `.messageInput_cKsPxg`
```css
.messageInput_cKsPxg { direction: rtl; text-align: right; }
```
Did not work. Even with `!important`. No effect on the input.

### 2. JS MutationObserver setting `dir="rtl"` on the element
```js
document.querySelectorAll('.messageInput_cKsPxg').forEach(el => {
  el.setAttribute('dir', 'rtl');
  el.style.direction = 'rtl';
  el.style.textAlign = 'right';
});
new MutationObserver(setRTL).observe(document.body, {childList:true, subtree:true});
```
Did not work.

### 3. Injecting `dir:"rtl"` and `style:{direction:"rtl"}` into React createElement props
Modified the source JS where the contentEditable div is created:
```js
// Original:
className:r8.messageInput,role:"textbox"
// Changed to:
className:r8.messageInput,dir:"rtl",style:{direction:"rtl",textAlign:"right"},role:"textbox"
```
Did not work.

## Technical Details

### Extension Path
```
%USERPROFILE%\.vscode\extensions\anthropic.claude-code-2.1.86-win32-x64
```

### Files
- `webview/index.css` — Minified CSS (367KB)
- `webview/index.js` — Minified React app (4.7MB)
- `extension.js` — Node.js extension host (1.8MB)

### Input Element Structure
The input is a `contentEditable="plaintext-only"` div, NOT a textarea:
```js
L0.default.createElement("div", {
  ref: I,
  contentEditable: "plaintext-only",
  onInput: j2,
  onKeyDown: C5,
  onPaste: U4,
  className: r8.messageInput,  // resolves to "messageInput_cKsPxg"
  role: "textbox",
  "aria-label": "Message input",
  "aria-multiline": "true",
  "data-placeholder": ...
})
```

### CSS Module Mapping
```js
messageInput: "messageInput_cKsPxg"
messageInputContainer: "messageInputContainer_cKsPxg"
inputWrapper: "inputWrapper_cKsPxg"
```

### Existing CSS for messageInput
```css
.messageInput_cKsPxg {
  outline: none;
  overflow-y: auto;
  overflow-wrap: break-word;
  word-break: break-word;
  scrollbar-gutter: stable;
  position: relative;
  user-select: text;
  color: #0000;
  caret-color: var(--app-input-foreground);
  z-index: 1;
  flex: 1;
  align-self: stretch;
  min-height: 1.5em;
  max-height: 200px;
  padding: 10px 14px;
  font-family: inherit;
  line-height: 1.5;
}
```

Note: `color: #0000` (transparent) — the actual text rendering might use a separate overlay/mirror element.

## Key Observation
The CSS has `color: #0000` (fully transparent text color) on the input. This suggests the visible text might be rendered via a **mirror/overlay element**, not the contentEditable div directly. The actual visible text could be in a different element. Check for a "mirror", "overlay", "highlight", or "rendered" sibling/child element that displays the text.

## Reference
A working version (from a previous extension version) is in `reference_working_version/` folder. In that version, the RTL messages and input all worked correctly with only CSS appended and JS appended (no modifications to base code).

## What Needs to Happen
Figure out WHY the CSS `direction: rtl` has no visible effect on the input text, and find the correct element/approach to make typed text flow right-to-left.
