# Electron & Prisma (SQLite) Integration

يحتوي هذا المجلد على الملفات اللازمة للربط بين تطبيق Electron و Prisma ORM باستخدام قاعدة بيانات SQLite.

## الملفات المرفقة:
1. **`schema.prisma`**: مخطط قاعدة البيانات المتوافق مع SQLite ويشمل جميع الحقول التي طلبتها، مع تحويل المصفوفات (Arrays) والأوبجكتس إلى حقول نصية `String` لتخزينها كـ (Stringified JSON).
2. **`main.ts`**: الكود الخاص بـ Main Process، ويشمل إعداد Prisma وتحديد مسار حفظ قاعدة البيانات `dev.db` في بيئة الإنتاج (`userData`) لتجنب مسح البيانات عند التحديث، بالإضافة لبعض الأمثلة على `ipcMain.handle`.
3. **`preload.ts`**: كود Preload لإنشاء `contextBridge` يعرض واجهة آمنة `window.api` للواجهة الأمامية (React/Vue/etc..).
4. **`migrate.ts`**: سكربت Node.js لقراءة البيانات من `backup.json` وتمريرها إلى قاعدة بيانات SQLite.

## كيفية الاستخدام (في مشروعك الخاص):
1. انسخ ملف `schema.prisma` إلى مجلد `prisma/` الخاص بك.
2. قم بتنفيذ الأمر `npx prisma db push` (أو `npx prisma migrate dev`) لتوليد الجداول في SQLite.
3. ضع مسار `backup.json` بشكل صحيح في سكربت `migrate.ts`، ثم قم بتشغيله لنقل بياناتك الحالية: `npx tsx migrate.ts`.
4. انسخ محتويات `main.ts` و `preload.ts` إلى مجلد Electron الخاص بك، واربطها مع الـ Renderer Process.
5. في الواجهة الأمامية، يمكنك استدعاء الدوال بأمان، مثل: `await window.api.getSubjects()`.
