// electron-integration/main.ts
// ملف Main Process لإعداد Prisma والتواصل عبر IPC بشكل آمن

import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';

// تحديد مسار قاعدة البيانات بشكل ديناميكي لتجنب الكتابة فوقها في بيئة الإنتاج
// يتم حفظ dev.db في مجلد userData لضمان بقاء البيانات بعد التحديث
const dbPath = app.isPackaged
  ? path.join(app.getPath('userData'), 'dev.db')
  : path.join(__dirname, '../../prisma/dev.db');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: `file:${dbPath}`,
    },
  },
});

export function registerIpcHandlers() {
  // ---------------------------------------------------------
  // أمثلة لعمليات المناهج (Subjects)
  // ---------------------------------------------------------
  ipcMain.handle('get-subjects', async () => {
    try {
      // إرجاع المواد مع الوحدات والدروس المرتبطة بها
      return await prisma.subject.findMany({
        include: { units: true, lessons: true },
      });
    } catch (error) {
      console.error('Error fetching subjects:', error);
      throw error;
    }
  });

  ipcMain.handle('create-subject', async (event, data) => {
    try {
      return await prisma.subject.create({ data });
    } catch (error) {
      console.error('Error creating subject:', error);
      throw error;
    }
  });

  // ---------------------------------------------------------
  // أمثلة لعمليات بنك الأسئلة (Questions)
  // ---------------------------------------------------------
  ipcMain.handle('get-questions', async (event, filters) => {
    try {
      // يمكن تمرير filters مثل subjectId للفلترة
      return await prisma.question.findMany({
        where: filters || {},
      });
    } catch (error) {
      console.error('Error fetching questions:', error);
      throw error;
    }
  });

  ipcMain.handle('create-question', async (event, data) => {
    try {
      // نضمن تحويل المصفوفات إلى JSON قبل الحفظ في SQLite
      const formattedData = {
        ...data,
        distractors: Array.isArray(data.distractors) ? JSON.stringify(data.distractors) : data.distractors,
        tags: Array.isArray(data.tags) ? JSON.stringify(data.tags) : data.tags,
      };
      
      return await prisma.question.create({ data: formattedData });
    } catch (error) {
      console.error('Error creating question:', error);
      throw error;
    }
  });

  // إضافة المزيد من الدوال لـ (Lessons, Units, Templates)
}

// دالة مبدئية لتهيئة النافذة في Electron
let mainWindow: BrowserWindow | null = null;

app.whenReady().then(() => {
  registerIpcHandlers();
  
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      // ربط ملف preload لضمان العزل الآمن
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // mainWindow.loadFile('index.html'); // أو LoadURL بحسب بيئتك
});

app.on('window-all-closed', async () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
  await prisma.$disconnect();
});
