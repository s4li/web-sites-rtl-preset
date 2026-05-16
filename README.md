# RTL Preset — monorepo

این ریپو دو تا ابزار مرتبط برای راست‌به‌چپ کردن (RTL) محیط‌های LTR رو نگه می‌داره.
هر دو یک هدف دارن ولی در دو **runtime کاملاً جدا** اجرا می‌شن، برای همین یک
آرتیفکتِ واحدِ قابل‌نصب نمی‌تونن باشن — ولی منطق اصلی‌شون مشترکه.

## ساختار

```
/ (ریشه)                  → اکستنشن کروم «RTL Preset» (Manifest V3, v2.0.0)
  manifest.json, content.js, background.js, popup.*  ← دست‌نخورده، پایدار
vscode-claude-patch/      → پچ‌های RTL برای webview اکستنشن Claude Code در VS Code
  PROBLEM_STATEMENT.md, CLAUDE.md, reference_working_version/
```

## چرا تو یه ریپو ولی جدا؟

| | اکستنشن کروم (ریشه) | vscode-claude-patch/ |
|---|---|---|
| محیط اجرا | تب مرورگر کروم، روی هر سایت | webview ایزوله‌ی اکستنشن VS Code |
| روش | content script که کروم تزریق می‌کنه | append شدن CSS/JS به فایل‌های باندل اکستنشن |

یه content script کروم نمی‌تونه به webview اکستنشن VS Code دسترسی پیدا کنه،
پس این دو نمی‌تونن یک اکستنشن واحد بشن. ولی در سطح کد قابل اشتراک‌گذاری‌ان.

## TODO — هسته‌ی مشترک (برای بعد، نه الان)

کد تکراری شناخته‌شده: فیچر **Alt+Click toggle** هم در `content.js` (ریشه)
و هم در `vscode-claude-patch/CLAUDE.md` → `PATCH 2` تقریباً یکیه. همینطور منطق
اصلاح UI و تزریق فونت محیط‌مستقله.

نقشه‌ی آینده: استخراج یک `core/rtl-core.js` (منطق Alt+Click + UI-fix + فونت)
و دو آداپتور نازک روش (اکستنشن کروم / اسنیپت VS Code). این یک ریفکتورِ پرریسکه
و **عمداً به تعویق افتاده** تا اکستنشن پایدارِ فعلی وسط کار نشکنه.

## ریپو

https://github.com/s4li/web-sites-rtl-preset
