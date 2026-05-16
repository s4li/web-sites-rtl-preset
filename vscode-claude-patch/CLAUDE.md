Apply these 3 patches to the Claude Code VS Code extension files. First find the extension path:

**Windows:**
dir "$env:USERPROFILE\.vscode\extensions\" | findstr claude
Then set: $ext = "$env:USERPROFILE\.vscode\extensions\<THE_FOLDER_NAME>"

**Mac:**
ls -d ~/.vscode/extensions/anthropic.claude-code-\*/ | sort -V | tail -1

Then backup and patch these 3 files:

```
~/.vscode/extensions/anthropic.claude-code-<VERSION>/
├── extension.js          ← patch 3 (sounds)
└── webview/
    ├── index.css          ← patch 1 (RTL CSS)
    └── index.js           ← patch 2 (RTL JS toggle)
```

---

## PATCH 1: webview/index.css — APPEND to end of file

What it does:
- Messages and chat input become RTL
- Code blocks stay LTR
- Menus, buttons, and main UI stay untouched

**IMPORTANT:** The CSS class suffixes (like `_07S1Yg`, `_-a7MRw`, `_cKsPxg`, `_hONcXw`) may change between versions. Before appending, search in the CSS file for these prefixes and use the actual suffixes found there:
- Messages: `messagesContainer_`, `message_`, `userMessage_`, `timelineMessage_`, `metaMessage_`
- Input: `messageInput_`, `messageInputContainer_`, `inputFooter_`
- Code: `codeBlockWrapper_`, `root_`
- AskUserQuestion popup (CRITICAL — don't forget this): `questionsContainer_`, `questionBlock_`, `questionItem_`, `questionText_`, `questionTextLarge_`, `questionHeader_`, `optionsContainer_`, `option_`, `optionContent_`, `optionLabel_`, `optionDescription_`, `answerText_`, `otherInput_`

```css
/* ===== RTL Patch (messages only) ===== */
.messagesContainer_07S1Yg { direction: rtl; text-align: right; }
.message_07S1Yg { direction: rtl; text-align: right; }
.userMessage_07S1Yg { direction: rtl; text-align: right; }
.timelineMessage_07S1Yg { direction: rtl; text-align: right; }
.metaMessage_07S1Yg { direction: rtl; text-align: right; }
/* Code blocks stay LTR */
.codeBlockWrapper_-a7MRw { direction: ltr; text-align: left; }
.codeBlockWrapper_-a7MRw pre { direction: ltr; text-align: left; }
.codeBlockWrapper_-a7MRw code { direction: ltr; text-align: left; }
.root_-a7MRw code { direction: ltr; text-align: left; }
/* Input area RTL */
.messageInput_cKsPxg { direction: rtl; text-align: right; }
.messageInputContainer_cKsPxg { direction: rtl; text-align: right; }
.inputFooter_gGYT1w { direction: ltr; }
/* ===== AskUserQuestion popup RTL (REQUIRED — Persian users) ===== */
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
```

---

## PATCH 2: webview/index.js — APPEND to end of file

What it does: Hold Alt and hover to highlight element (blue). Alt+Click toggles RTL/LTR direction. Alt+ArrowUp/Down navigates parent/child.

```js
/* ===== RTL Toggle Patch (Alt+Click) ===== */
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
/* ===== End RTL Patch ===== */
```

---

## PATCH 3: extension.js — TWO surgical edits for notification sounds

**NOTE:** Parameter names (like K, V, B) change between versions. The important identifiers are the function name `requestToolPermission` and the keyword `hasUnseenCompletion`.

### 3A: Permission sound

Find the function definition `async requestToolPermission(` — the exact parameter names vary between versions but the function name is always `requestToolPermission`.

Right after the opening `{` of this function, BEFORE the first `if(this.channels`, insert:

For Windows:
```js
try{if(!globalThis._sndPerm||Date.now()-globalThis._sndPerm>5000){globalThis._sndPerm=Date.now();require("child_process").exec('powershell -NoProfile -c "[console]::beep(1200,150);[console]::beep(1200,150)"')}}catch(e){}
```

For Mac:
```js
try{if(!globalThis._sndPerm||Date.now()-globalThis._sndPerm>5000){globalThis._sndPerm=Date.now();require("child_process").exec("afplay /System/Library/Sounds/Ping.aiff")}}catch(e){}
```

### 3B: Task completion sound

Find the pattern: `else if(SOMETHING.request.hasUnseenCompletion)VARNAME="claude-logo-done.svg";else VARNAME="claude-logo.svg"`

The variable names change between versions. Replace that entire pattern with:

For Windows (using the actual variable name found):
```js
else if(X.request.hasUnseenCompletion){Y="claude-logo-done.svg";if(!globalThis._sndDone||Date.now()-globalThis._sndDone>5000){globalThis._sndDone=Date.now();try{require("child_process").exec('powershell -NoProfile -c "[console]::beep(800,300);[console]::beep(1000,300)"');}catch(e){}}}else Y="claude-logo.svg"
```

For Mac (using the actual variable name found):
```js
else if(X.request.hasUnseenCompletion){Y="claude-logo-done.svg";if(!globalThis._sndDone||Date.now()-globalThis._sndDone>5000){globalThis._sndDone=Date.now();try{require("child_process").exec("afplay /System/Library/Sounds/Glass.aiff")}catch(e){}}}else Y="claude-logo.svg"
```

(Replace X and Y with the actual variable names found in the code)

### Verify syntax after editing:
```bash
node -e "new Function(require('fs').readFileSync('PATH_TO_FILE','utf8'))"
```

---

## IMPORTANT RULES:

- Create .bak backups BEFORE editing
- Do NOT modify any existing code — only APPEND for patches 1 & 2
- For patch 3, do surgical find-and-replace only
- Detect OS automatically and use the correct sound command
- After all patches, tell the user to run "Reload Window" from VS Code command palette
