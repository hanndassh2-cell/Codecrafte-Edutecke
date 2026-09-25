import fs from "fs";
import path from "path";

const root = process.cwd();
const explorer = fs.readFileSync(
  path.join(root, "src/modules/curriculum/pages/CurriculumTreeView.tsx"),
  "utf8",
);
const app = fs.readFileSync(path.join(root, "src/App.tsx"), "utf8");

const checks = [
  ["Curriculum uses one full-width explorer instead of a permanent duplicate tree", !explorer.includes("<ResizableSidebar") && !explorer.includes("<UnifiedCurriculumTree")],
  ["Explorer follows the material, unit, lesson hierarchy", explorer.includes("مستكشف المناهج") && explorer.includes("انتقل خطوة واحدة في كل مرة: مادة، ثم وحدة، ثم درس")],
  ["Each hierarchy level exposes one contextual creation action", explorer.includes(">إضافة مادة<") && explorer.includes(">إضافة وحدة<") && explorer.includes(">إضافة درس<")],
  ["Arabic search normalizes common spelling variants", explorer.includes("normalizeArabicSearch") && explorer.includes(".replace(/[أإآ]/g, \"ا\")")],
  ["Subject cards expose visible unit, lesson, and question counts", explorer.includes(">وحدات<") && explorer.includes(">دروس<") && explorer.includes(">أسئلة<")],
  ["Lesson actions use one clear label", !explorer.includes("تحرير وتأليف") && explorer.includes("تحرير الدرس")],
  ["Opening the lesson editor validates existence and authorization", app.includes("تعذر فتح الدرس لأنه لم يعد موجوداً") && app.includes("ليس لديك صلاحية لتحرير هذا الدرس")],
];

let failed = 0;
for (const [label, passed] of checks) {
  if (passed) {
    console.log(`[PASS] ${label}`);
  } else {
    failed += 1;
    console.error(`[FAIL] ${label}`);
  }
}

if (failed) process.exit(1);
