# Network Calculator — حاسبة الشبكات

موقع Frontend بالكامل (HTML + CSS + JavaScript ES6) لحساب وتحليل الشبكات داخل المتصفح، بدون خادم أو قاعدة بيانات أو API.

## التشغيل
افتح ملف `index.html` مباشرة في المتصفح

## البنية

index.html
assets/css/styles.css      التصميم، الوضع الداكن/الفاتح، RTL/LTR، Responsive
assets/js/net.js           محرّك الحسابات (IPv4 / IPv6 / VLSM / تحويلات)
assets/js/tools.js         تعريف الأدوات العشر وحقولها ومخرجاتها
assets/js/i18n.js          قاموس الترجمة (عربي / إنجليزي)
assets/js/basics.js        محتوى صفحة أساسيات الشبكات
assets/js/app.js           الواجهة، التوجيه، السجل، التصدير، البحث، الرسم

## الأدوات
IP Calculator · Subnet Calculator · CIDR Calculator · VLSM Calculator · IP Range Calculator ·
Subnet Mask Calculator · Wildcard Calculator · IPv4 Analyzer · IPv6 Calculator · Number Converter

## المزايا
- رسم مخطط الشبكة (SVG + عرض نصي ASCII)
- سجل العمليات عبر LocalStorage (عرض / نسخ / حذف / مسح الكل)
- تصدير: نسخ، CSV، JSON، طباعة
- رابط مشاركة يحمل المدخلات ويعيد الحساب عند فتحه
- تحقق كامل من المدخلات مع رسائل خطأ واضحة
- بحث فوري في الأدوات والمواضيع والمصطلحات (اختصار: /)
- عربي/إنجليزي مع RTL، ووضع داكن/فاتح، وحفظ الإعدادات محليًا
- تصميم Mobile First متجاوب + دعم لوحة المفاتيح وقارئات الشاشة

## ملاحظات فنية
- الشبكات /31 تُعامل كوصلة نقطية و /32 كمضيف واحد (بلا عنوان بث).
- حاسبة الشبكات الفرعية تعرض حتى 512 شبكة في الجدول مع تنبيه عند التجاوز.
- VLSM يرتب المتطلبات تنازليًا ويحاذي الكتل طبيعيًا لمنع التداخل.

## Network Calculator

A fully frontend-based website (HTML + CSS + JavaScript ES6) for calculating and analyzing networks directly in the browser, with no server, database, or API required.

## Running

Open the index.html file directly in your browser

## Structure
index.html

assets/css/styles.css      Styling, dark/light mode, RTL/LTR, Responsive
assets/js/net.js           Calculation engine (IPv4 / IPv6 / VLSM / Conversions)
assets/js/tools.js         Definition of the ten tools, fields, and outputs
assets/js/i18n.js          Translation dictionary (Arabic / English)
assets/js/basics.js        Networking Basics page content
assets/js/app.js           UI, routing, history, export, search, visualization

## Tools

IP Calculator · Subnet Calculator · CIDR Calculator · VLSM Calculator · IP Range Calculator ·
Subnet Mask Calculator · Wildcard Calculator · IPv4 Analyzer · IPv6 Calculator · Number Converter

## Features

- Network diagram visualization (SVG + ASCII text view)
- Operation history using LocalStorage (view / copy / delete / clear all)
- Export options: Copy, CSV, JSON, Print
- Shareable links containing the input values and automatically recalculating when opened
- Full input validation with clear error messages
- Instant search across tools, topics, and terminology (shortcut: /)
- Arabic/English support with RTL, dark/light mode, and locally saved settings
- Responsive Mobile-First design + keyboard navigation and screen reader support

## Technical Notes

- /31 networks are treated as point-to-point links, while /32 is treated as a single host with no broadcast address.
- The Subnet Calculator displays up to 512 networks in the table and shows a warning when this limit is exceeded.
- VLSM sorts requirements in descending order and naturally aligns blocks to prevent overlapping networks.