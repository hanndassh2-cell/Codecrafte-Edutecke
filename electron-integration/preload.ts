// electron-integration/preload.ts
// ملف Preload Script لربط Electron بـ React (ContextBridge)

import { contextBridge, ipcRenderer } from 'electron';

// عرض دوال API للـ Renderer Process لكي تستدعى بأمان عبر window.api
contextBridge.exposeInMainWorld('api', {
  // المناهج
  getSubjects: () => ipcRenderer.invoke('get-subjects'),
  createSubject: (data: any) => ipcRenderer.invoke('create-subject', data),
  
  // الأسئلة
  getQuestions: (filters?: any) => ipcRenderer.invoke('get-questions', filters),
  createQuestion: (data: any) => ipcRenderer.invoke('create-question', data),
  
  // يمكنك الاستمرار في إضافة باقي الدوال المطلوبة كالتالي:
  // updateLesson: (id: string, data: any) => ipcRenderer.invoke('update-lesson', { id, data }),
  // deleteUnit: (id: string) => ipcRenderer.invoke('delete-unit', id),
});
