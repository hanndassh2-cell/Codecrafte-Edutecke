// electron-integration/migrate.ts
// سكربت هجرة البيانات (Migration) من ملف JSON إلى قاعدة بيانات SQLite

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting data migration...');

  // تحديد مسار ملف النسخ الاحتياطي (Backup JSON)
  const backupPath = path.join(__dirname, 'backup.json'); // تأكد من وجود الملف
  
  if (!fs.existsSync(backupPath)) {
    console.error('Backup file not found at:', backupPath);
    return;
  }

  const dataStr = fs.readFileSync(backupPath, 'utf-8');
  const backup = JSON.parse(dataStr);

  // 1. ترحيل المناهج (Subjects)
  if (backup.subjects && Array.isArray(backup.subjects)) {
    console.log(`Migrating ${backup.subjects.length} subjects...`);
    for (const sub of backup.subjects) {
      await prisma.subject.upsert({
        where: { id: sub.id },
        update: {},
        create: {
          id: sub.id,
          code: sub.code || '',
          name: sub.name,
          color: sub.color || '#000000',
          icon: sub.icon || 'book',
          description: sub.description || '',
          status: sub.status || 'active',
          progressPercentage: sub.progressPercentage || 0,
        },
      });
    }
  }

  // 2. ترحيل الوحدات (Units)
  if (backup.units && Array.isArray(backup.units)) {
    console.log(`Migrating ${backup.units.length} units...`);
    for (const unit of backup.units) {
      await prisma.unit.upsert({
        where: { id: unit.id },
        update: {},
        create: {
          id: unit.id,
          subjectId: unit.subjectId,
          code: unit.code || '',
          title: unit.title,
          description: unit.description || '',
          orderIndex: unit.orderIndex || 0,
          status: unit.status || 'active',
        },
      });
    }
  }

  // 3. ترحيل الدروس (Lessons)
  if (backup.lessons && Array.isArray(backup.lessons)) {
    console.log(`Migrating ${backup.lessons.length} lessons...`);
    for (const lesson of backup.lessons) {
      await prisma.lesson.upsert({
        where: { id: lesson.id },
        update: {},
        create: {
          id: lesson.id,
          subjectId: lesson.subjectId,
          unitId: lesson.unitId,
          title: lesson.title,
          orderIndex: lesson.orderIndex || 0,
          durationMinutes: lesson.durationMinutes || 45,
          status: lesson.status || 'active',
          
          // تحويل المصفوفات إلى Stringified JSON
          objectives: JSON.stringify(lesson.objectives || []),
          contentParagraphs: JSON.stringify(lesson.contentParagraphs || []),
        },
      });
    }
  }

  // 4. ترحيل بنك الأسئلة (Questions)
  if (backup.questions && Array.isArray(backup.questions)) {
    console.log(`Migrating ${backup.questions.length} questions...`);
    for (const q of backup.questions) {
      await prisma.question.upsert({
        where: { id: q.id },
        update: {},
        create: {
          id: q.id,
          subjectId: q.subjectId,
          unitId: q.unitId || null,
          lessonId: q.lessonId || null,
          type: q.type,
          text: q.text,
          answer: q.answer || '',
          
          // تحويل المشتتات والكلمات المفتاحية إلى Stringified JSON
          distractors: JSON.stringify(q.distractors || []),
          tags: JSON.stringify(q.tags || []),
          
          difficulty: q.difficulty || 1,
          importance: q.importance || 1,
          status: q.status || 'active',
          isPastCycle: q.isPastCycle || false,
          occurrencesCount: q.occurrencesCount || 0,
          futureProbability: q.futureProbability || 0,
          finalWeightScore: q.finalWeightScore || 0,
        },
      });
    }
  }

  // 5. ترحيل القوالب والإعدادات إن وجدت (PrintTemplates, ExamTemplates, Settings, Cycles)
  // [يتم إضافتها هنا بنفس النمط السابق - باستخدام JSON.stringify للحقول المتداخلة]

  console.log('Migration completed successfully!');
}

main()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
