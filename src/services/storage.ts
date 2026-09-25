import {
  Subject,
  Unit,
  Lesson,
  Question,
  BookReference,
  PrintTemplate,
  ExamTemplate,
  Exam,
  Cycle,
  User,
  AuditLog,
  SystemSettings,
} from "../types";

import {
  initialSubjects,
  initialUnits,
  initialLessons,
  initialQuestions,
  initialPrintTemplates,
  initialExamTemplates,
  initialExams,
  initialCycles,
  initialUsers,
  initialAuditLogs,
  initialSettings,
} from "../database/initialData";
import { createPasswordHashForUser, validatePasswordStrength } from "../utils/crypto";
import {
  sanitizeDataForExport,
  createExportBlobWithBom,
} from "../utils/arabicExportUtils";

export const KEYS = {
  SUBJECTS: "edutech_subjects_v1",
  UNITS: "edutech_units_v1",
  LESSONS: "edutech_lessons_v1",
  LESSON_CARDS: "edutech_lesson_cards_v1",
  QUESTIONS: "edutech_questions_v1",
  PRINT_TEMPLATES: "edutech_print_templates_v1",
  EXAM_TEMPLATES: "edutech_exam_templates_v1",
  EXAMS: "edutech_exams_v1",
  EXAMS_LIBRARY: "edutech_exams_library_v1",
  CYCLES: "edutech_cycles_v1",
  USERS: "edutech_users_v1",
  CURRENT_USER: "edutech_current_user_v1",
  AUDIT_LOGS: "edutech_audit_logs_v1",
  SETTINGS: "edutech_settings_v1",
  PAGE_UI_STATES: "edutech_page_ui_states_v1",
};

export const CRITICAL_KEYS = [KEYS.QUESTIONS, KEYS.LESSON_CARDS, KEYS.EXAMS] as const;
export const BACKUP_PREFIX = "SAFE_BACKUP_";

export const SCHEMA_VERSION_KEY = "edutech_schema_version";
export const CURRENT_SCHEMA_VERSION = 2;


export interface QuestionUsageDetails {
  inUse: boolean;
  lessons: { id: string; title: string }[];
  lessonCards: { lessonId: string; lessonTitle?: string; cardTitle: string }[];
  exams: { id: string; title: string }[];
  libraryDocs: { id: string; title: string }[];
  summaryMessage: string;
}

export interface QuestionSaveVerificationResult {
  success: boolean;
  status: "PASS" | "FAIL";
  failedFields: string[];
  storedQuestion?: Question;
  inputData?: Partial<Question>;
}

const memoryStorage = new Map<string, any>();

export function cleanupStorageQuota(): boolean {
  if (typeof window === "undefined" || !window.localStorage) return false;
  let cleanedAny = false;

  try {
    // 1. Clear or trim non-critical audit logs
    const auditLogsStr = localStorage.getItem(KEYS.AUDIT_LOGS);
    if (auditLogsStr) {
      try {
        const logs = JSON.parse(auditLogsStr);
        if (Array.isArray(logs) && logs.length > 15) {
          const trimmedLogs = logs.slice(0, 15);
          localStorage.setItem(KEYS.AUDIT_LOGS, JSON.stringify(trimmedLogs));
          memoryStorage.set(KEYS.AUDIT_LOGS, trimmedLogs);
          cleanedAny = true;
        }
      } catch (e) {
        localStorage.removeItem(KEYS.AUDIT_LOGS);
        cleanedAny = true;
      }
    }

    // 2. Trim edutech_media_library_v1 if present
    const mediaStr = localStorage.getItem("edutech_media_library_v1");
    if (mediaStr) {
      try {
        const media = JSON.parse(mediaStr);
        if (Array.isArray(media) && media.length > 5) {
          const trimmedMedia = media.slice(-5);
          localStorage.setItem("edutech_media_library_v1", JSON.stringify(trimmedMedia));
          memoryStorage.set("edutech_media_library_v1", trimmedMedia);
          cleanedAny = true;
        }
      } catch (e) {
        localStorage.removeItem("edutech_media_library_v1");
        cleanedAny = true;
      }
    }

    // 2.5 Trim edutech_snapshots_v1 if present (massive space usage)
    const snapStr = localStorage.getItem("edutech_snapshots_v1");
    if (snapStr) {
      try {
        const snaps = JSON.parse(snapStr);
        if (Array.isArray(snaps) && snaps.length > 1) {
          // Keep only the most recent snapshot during emergency cleanup
          const trimmedSnaps = snaps.slice(0, 1);
          localStorage.setItem("edutech_snapshots_v1", JSON.stringify(trimmedSnaps));
          cleanedAny = true;
        }
      } catch (e) {
        localStorage.removeItem("edutech_snapshots_v1");
        cleanedAny = true;
      }
    }

    // 3. Remove orphaned / temporary keys
    const validKeysSet = new Set<string>(Object.values(KEYS));
    validKeysSet.add(SCHEMA_VERSION_KEY);
    validKeysSet.add("edutech_session");
    validKeysSet.add("rememberMe");
    validKeysSet.add("rememberedUsername");

    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && !validKeysSet.has(k)) {
        if (
          k.startsWith("temp_") ||
          k.startsWith("rescue_") ||
          k.startsWith("backup_") ||
          k.includes("history") ||
          k.includes("draft")
        ) {
          keysToRemove.push(k);
        }
      }
    }

    keysToRemove.forEach((k) => {
      localStorage.removeItem(k);
      cleanedAny = true;
    });
  } catch (e) {
    console.warn("[Storage] Error during emergency quota cleanup:", e);
  }

  return cleanedAny;
}

export function getStoredData<T>(key: string, defaultValue: T): T {
  if (memoryStorage.has(key)) {
    const memVal = memoryStorage.get(key);
    if (Array.isArray(memVal)) {
      return memVal.filter(Boolean) as unknown as T;
    }
    return memVal as T;
  }

  try {
    const item = localStorage.getItem(key);
    if (!item) {
      memoryStorage.set(key, defaultValue);
      return defaultValue;
    }
    let parsed = JSON.parse(item) as T;
    if (Array.isArray(parsed)) {
      parsed = parsed.filter(Boolean) as unknown as T;
    }
    memoryStorage.set(key, parsed);
    return parsed;
  } catch (e) {
    console.error(`Error reading ${key} from storage:`, e);
    memoryStorage.set(key, defaultValue);
    return defaultValue;
  }
}

export function setStoredData<T>(key: string, value: T): void {
  // Always keep memory storage synchronized first
  let cleanValue = value;
  if (Array.isArray(value)) {
    cleanValue = value.filter(Boolean) as unknown as T;
  }
  memoryStorage.set(key, cleanValue);

  const jsonStr = JSON.stringify(cleanValue);

  try {
    localStorage.setItem(key, jsonStr);
    if (key === KEYS.QUESTIONS || key === KEYS.LESSON_CARDS || key === KEYS.EXAMS) {
      try {
        localStorage.setItem(BACKUP_PREFIX + key, jsonStr);
      } catch (_) {}
    }
  } catch (e: any) {
    const isQuotaError =
      e?.name === "QuotaExceededError" ||
      e?.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
      e?.code === 22 ||
      e?.code === 1014 ||
      (e?.message && String(e.message).includes("exceeded the quota"));

    if (isQuotaError) {
      console.warn(`[Storage] Quota exceeded while saving "${key}". Running emergency cleanup...`);
      const cleaned = cleanupStorageQuota();
      if (cleaned) {
        try {
          localStorage.setItem(key, jsonStr);
          console.log(`[Storage] Successfully saved "${key}" after emergency cleanup.`);
        } catch (retryErr) {
          console.warn(`[Storage] Storage quota still exceeded for "${key}". Data safely maintained in memory cache.`);
        }
      } else {
        console.warn(`[Storage] Space limit reached for "${key}". Data safely maintained in memory cache.`);
      }
    } else {
      console.error(`Error saving ${key} to storage:`, e);
    }
  }

  // Automatically trigger app-wide sync
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(`refresh-data-${key}`));
    window.dispatchEvent(new CustomEvent("refresh-data-all"));
    window.dispatchEvent(new CustomEvent("storage-change"));
  }
}

class StorageService {
  getUiState<T extends Record<string, any>>(_pageKey: string, defaultState: T): T {
    // Return standard pristine default UI state on every page/window visit
    return defaultState;
  }

  saveUiState(_pageKey: string, _stateUpdate: Record<string, any>): void {
    // Transient UI states (filters, search queries, active tabs, modals, expansions)
    // are strictly kept in-memory per active visit and cleared upon navigating away.
  }

  getSchemaStatus() {
    if (typeof window === "undefined" || !window.localStorage) {
      return { currentVersion: CURRENT_SCHEMA_VERSION, targetVersion: CURRENT_SCHEMA_VERSION, isUpToDate: true };
    }
    const versionStr = localStorage.getItem(SCHEMA_VERSION_KEY);
    const version = versionStr ? parseInt(versionStr, 10) : (localStorage.getItem(KEYS.QUESTIONS) ? 1 : 0);
    return {
      currentVersion: version,
      targetVersion: CURRENT_SCHEMA_VERSION,
      isUpToDate: version === CURRENT_SCHEMA_VERSION
    };
  }

  runSchemaMigrations() {
    if (typeof window === "undefined" || !window.localStorage) return;
    let currentVersion = parseInt(localStorage.getItem(SCHEMA_VERSION_KEY) || "0", 10);
    
    // If DB has some data but no version key, treat it as schema version 1
    if (currentVersion === 0 && localStorage.getItem(KEYS.QUESTIONS)) {
       currentVersion = 1;
    }

    // Reject newer unsupported versions strictly
    if (currentVersion > CURRENT_SCHEMA_VERSION) {
      throw new Error(`الإصدار الأحدث غير مدعوم. إصدار بياناتك الحالية: ${currentVersion}، بينما الإصدار المدعوم من النظام: ${CURRENT_SCHEMA_VERSION}. التحديث معلق حمايةً لبياناتك.`);
    }

    if (currentVersion === CURRENT_SCHEMA_VERSION || currentVersion === 0) {
      // Empty database sets version when initialized
      return; 
    }

    console.log(`بدء ترحيل المخطط من الإصدار v${currentVersion} إلى v${CURRENT_SCHEMA_VERSION}...`);

    // Create a verified rescue point in memory
    const rescueState: Record<string, string | null> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) rescueState[key] = localStorage.getItem(key);
    }

    try {
      // Load all data dynamically to preserve ALL fields (known and unknown)
      const migratedData: Record<string, any> = {};
      for (const key of Object.keys(rescueState)) {
        if (rescueState[key]) {
          try {
             migratedData[key] = JSON.parse(rescueState[key] as string);
          } catch {
             migratedData[key] = rescueState[key];
          }
        }
      }

      // Execute sequential idempotent migrations
      for (let v = currentVersion + 1; v <= CURRENT_SCHEMA_VERSION; v++) {
        if (v === 2) {
            // Migration V1 -> V2
            // Example idempotent transformation: tagging entities with schema tracking version
            // while preserving strictly all UUIDs, texts, answers, relations, and unknown fields.
            if (Array.isArray(migratedData[KEYS.QUESTIONS])) {
               migratedData[KEYS.QUESTIONS] = migratedData[KEYS.QUESTIONS].map((q: any) => ({
                  ...q,
                  _schemaVersion: 2,
                  _migratedAt: new Date().toISOString()
               }));
            }
            if (Array.isArray(migratedData[KEYS.EXAMS])) {
               migratedData[KEYS.EXAMS] = migratedData[KEYS.EXAMS].map((e: any) => ({
                  ...e,
                  _schemaVersion: 2
               }));
            }
        }
      }

      // Atomic write back with strict verification
      for (const key of Object.keys(migratedData)) {
          const val = typeof migratedData[key] === 'string' ? migratedData[key] : JSON.stringify(migratedData[key]);
          localStorage.setItem(key, val);
          if (localStorage.getItem(key) !== val) {
              throw new Error(`فشل التحقق من الكتابة للمفتاح ${key} أثناء الترحيل`);
          }
      }

      // Update Schema Version
      localStorage.setItem(SCHEMA_VERSION_KEY, CURRENT_SCHEMA_VERSION.toString());
      if (localStorage.getItem(SCHEMA_VERSION_KEY) !== CURRENT_SCHEMA_VERSION.toString()) {
          throw new Error("فشل التحقق من تحديث رقم الإصدار");
      }
      
      console.log(`تم ترحيل المخطط إلى الإصدار v${CURRENT_SCHEMA_VERSION} بنجاح.`);

    } catch (err: any) {
       // Atomic Rollback
       console.error("فشل الترحيل، جاري تنفيذ التراجع الشامل...", err);
       
       const keysToRemove: string[] = [];
       for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k) keysToRemove.push(k);
       }
       for (const k of keysToRemove) {
          localStorage.removeItem(k);
       }
       
       // Restore verified rescue point exactly
       for (const key of Object.keys(rescueState)) {
         if (rescueState[key] !== null) {
           localStorage.setItem(key, rescueState[key] as string);
         }
       }
       
       throw new Error(`فشل ترحيل المخطط وتم التراجع بالكامل للحماية: ${err.message}`);
    }
  }

  /**
   * Synchronize or create a safe backup for a specific critical key.
   * EXAMS_LIBRARY is strictly excluded from backups.
   */
  syncSafeBackupForKey(key: string) {
    if (key === KEYS.EXAMS || key.includes('exams') || key.includes('EXAMS')) {
       console.log("syncSafeBackupForKey blocked for exams to preserve evidence");
       return;
    }

    if (typeof window === "undefined" || !window.localStorage) return;
    if (key === KEYS.EXAMS_LIBRARY || key === "edutech_exams_library_v1") {
      try {
        localStorage.removeItem(BACKUP_PREFIX + KEYS.EXAMS_LIBRARY);
        localStorage.removeItem(BACKUP_PREFIX + "edutech_exams_library_v1");
      } catch (e) {}
      return;
    }

    try {
      const data = localStorage.getItem(key);
      if (data) {
        localStorage.setItem(BACKUP_PREFIX + key, data);
      } else {
        localStorage.removeItem(BACKUP_PREFIX + key);
      }
    } catch (e: any) {
      console.warn(`[Storage] Quota exceeded during backup for ${key}. Running cleanup...`);
      const cleaned = cleanupStorageQuota();
      if (cleaned) {
        try {
          const data = localStorage.getItem(key);
          if (data) localStorage.setItem(BACKUP_PREFIX + key, data);
          else localStorage.removeItem(BACKUP_PREFIX + key);
        } catch (retryErr) {
          console.warn(`[Storage] Storage quota still exceeded for ${key} backup.`);
        }
      }
    }
  }

  restoreSafeBackup() {
    if (typeof window === "undefined" || !window.localStorage) return false;
    try {
      let restored = false;
      for (const key of CRITICAL_KEYS) {
        if (key === KEYS.EXAMS_LIBRARY || key === "edutech_exams_library_v1") continue;
        const backupData = localStorage.getItem(BACKUP_PREFIX + key);
        if (backupData) {
          localStorage.setItem(key, backupData);
          try {
            memoryStorage.set(key, JSON.parse(backupData));
          } catch (e) {
            memoryStorage.set(key, backupData);
          }
          restored = true;
        }
      }
      if (restored) {
        console.log("✅ Data successfully restored from Safe Backup.");
        if (typeof window.dispatchEvent === 'function') {
           window.dispatchEvent(new CustomEvent("refresh-data-all"));
        }
        return true;
      }
      return false;
    } catch (e) {
      console.error("Failed to restore backup:", e);
      return false;
    }
  }

  // Initialize with initialData if empty
  initialize() {
    if (typeof window === "undefined" || !window.localStorage) return;
    this.runSchemaMigrations();

    if (!localStorage.getItem(KEYS.SUBJECTS)) setStoredData(KEYS.SUBJECTS, initialSubjects);
    if (!localStorage.getItem(KEYS.UNITS)) setStoredData(KEYS.UNITS, initialUnits);
    if (!localStorage.getItem(KEYS.LESSONS)) setStoredData(KEYS.LESSONS, initialLessons);
    if (!localStorage.getItem(KEYS.QUESTIONS)) setStoredData(KEYS.QUESTIONS, initialQuestions);
    
    if (!localStorage.getItem(KEYS.LESSON_CARDS))
      setStoredData(KEYS.LESSON_CARDS, {});
    if (!localStorage.getItem(KEYS.PRINT_TEMPLATES))
      setStoredData(KEYS.PRINT_TEMPLATES, initialPrintTemplates);
    if (!localStorage.getItem(KEYS.EXAM_TEMPLATES))
      setStoredData(KEYS.EXAM_TEMPLATES, initialExamTemplates);
    if (!localStorage.getItem(KEYS.EXAMS))
      setStoredData(KEYS.EXAMS, initialExams);
    if (!localStorage.getItem(KEYS.CYCLES))
      setStoredData(KEYS.CYCLES, initialCycles);
    if (!localStorage.getItem(KEYS.USERS))
      setStoredData(KEYS.USERS, initialUsers);
    if (!localStorage.getItem(KEYS.CURRENT_USER))
      setStoredData(KEYS.CURRENT_USER, initialUsers[0]);
    if (!localStorage.getItem(KEYS.AUDIT_LOGS))
      setStoredData(KEYS.AUDIT_LOGS, initialAuditLogs);
    if (!localStorage.getItem(KEYS.SETTINGS))
      setStoredData(KEYS.SETTINGS, initialSettings);

    // Security Sanitization: Purge any plaintext default passwords from stored users
    try {
      const rawUsers = getStoredData<User[]>(KEYS.USERS, []);
      if (rawUsers && rawUsers.length > 0) {
        let changed = false;
        const sanitized = rawUsers.map((u) => {
          const mod = { ...u };
          if (mod.password === "password123" || mod.password === "123" || mod.password === "123456") {
            delete mod.password;
            changed = true;
          }
          // Ensure non-admin accounts without configured password hashes are disabled until activated by the admin
          if (mod.role !== "admin" && !mod.passwordHash && mod.status !== "disabled") {
            mod.status = "disabled";
            changed = true;
          }
          return mod;
        });
        if (changed) {
          setStoredData(KEYS.USERS, sanitized);
        }
      }
    } catch (e) {}

    // Purge any legacy saved UI states so all modules start with clean default UI state
    try {
      localStorage.removeItem(KEYS.PAGE_UI_STATES);
    } catch (e) {}

    if (!localStorage.getItem(SCHEMA_VERSION_KEY)) {
      localStorage.setItem(SCHEMA_VERSION_KEY, CURRENT_SCHEMA_VERSION.toString());
    }

    // Runtime 1-time Safe Normalization for current EXAMS
    this.normalizeAndSyncExamsRuntime();

    // Auto-heal database relationships and enforce Single Source of Truth
    this.repairAndSyncDatabase();

    // SAFE_BACKUP: Ensure we take a backup AFTER default data and repairs are settled,
    // so tests and restores have the fully populated state to compare against.
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        // Strictly purge EXAMS_LIBRARY backup if it exists
        try {
          localStorage.removeItem(BACKUP_PREFIX + KEYS.EXAMS_LIBRARY);
          localStorage.removeItem(BACKUP_PREFIX + "edutech_exams_library_v1");
        } catch (e) {}

        const isDeepEqual = (obj1: any, obj2: any) => {
          if (obj1 === obj2) return true;
          if (typeof obj1 !== "object" || typeof obj2 !== "object" || obj1 == null || obj2 == null) return false;
          const keys1 = Object.keys(obj1);
          const keys2 = Object.keys(obj2);
          if (keys1.length !== keys2.length) return false;
          for (const k of keys1) {
            if (!keys2.includes(k) || !isDeepEqual(obj1[k], obj2[k])) return false;
          }
          return true;
        };

        for (const key of CRITICAL_KEYS) {
          if (key === KEYS.EXAMS_LIBRARY || key === "edutech_exams_library_v1") continue;
          const original = localStorage.getItem(key) || "";
          const backup = localStorage.getItem(BACKUP_PREFIX + key) || "";
          
          let shouldUpdate = false;
          if (backup === "" && original !== "") {
             shouldUpdate = true;
          } else if (original !== "" && backup !== "" && original !== backup) {
             try {
               const p1 = JSON.parse(original);
               const p2 = JSON.parse(backup);
               if (!isDeepEqual(p1, p2)) {
                 shouldUpdate = true;
               }
             } catch(e) {
               shouldUpdate = true;
             }
          }

          if (shouldUpdate) {
            this.syncSafeBackupForKey(key);
          }
        }
        this.syncSafeBackups();
        console.log("✅ Safe Targeted Backup created or synchronized successfully (Post-Init).");
      } catch (e) {
        console.warn("Could not create safe backup, quota exceeded or storage blocked.", e);
      }
    }
  }

  syncSafeBackups() {
    console.log("syncSafeBackups skipped to prevent backup overwrite during emergency");
    return;


    if (typeof window !== "undefined" && window.localStorage) {
      // Purge any EXAMS_LIBRARY backup if present
      try {
        localStorage.removeItem(BACKUP_PREFIX + KEYS.EXAMS_LIBRARY);
        localStorage.removeItem(BACKUP_PREFIX + "edutech_exams_library_v1");
      } catch (e) {}

      for (const key of CRITICAL_KEYS) {
        if (key === KEYS.EXAMS_LIBRARY || key === "edutech_exams_library_v1") continue;
        this.syncSafeBackupForKey(key);
      }
    }
  }

  // Single Source of Truth: Comprehensive Audit & Auto-Heal with Strict Curriculum Tree Integrity

  repairAndSyncDatabase(): {
    totalQuestions: number;
    repairedLinks: number;
    syncedLessons: number;
  } {
    let repairedLinks = 0;
    let syncedLessons = 0;

    try {
      // 1. Load Curriculum Tree (Subjects -> Units -> Lessons)
      let allSubjects = this.getSubjects();
      if (!allSubjects || allSubjects.length === 0) {
        allSubjects = [...initialSubjects];
        setStoredData(KEYS.SUBJECTS, allSubjects);
      }
      const subjectMap = new Map<string, Subject>(allSubjects.map((s) => [s.id, s]));

      let allUnits = this.getUnits();
      if (!allUnits || allUnits.length === 0) {
        allUnits = [...initialUnits];
      }
      // Ensure all units have a valid subjectId
      allUnits = allUnits.filter(Boolean).map((u) => {
        if (!u) return u;
        if (!u.subjectId || !subjectMap.has(u.subjectId)) {
          const fallbackSubject = allSubjects[0]?.id || "sub-1";
          return { ...u, subjectId: fallbackSubject };
        }
        return u;
      }).filter(Boolean);
      setStoredData(KEYS.UNITS, allUnits);
      const unitMap = new Map<string, Unit>(allUnits.map((u) => [u.id, u]));

      let allLessons = this.getLessons();
      if (!allLessons || allLessons.length === 0) {
        allLessons = [...initialLessons];
      }
      // Ensure all lessons have valid unitId and subjectId
      allLessons = allLessons.filter(Boolean).map((l) => {
        if (!l) return l;
        let validUnitId = l.unitId;
        let validSubjectId = l.subjectId;
        if (!unitMap.has(validUnitId)) {
          const matchingUnit = allUnits.find((u) => u && u.subjectId === validSubjectId) || allUnits[0];
          validUnitId = matchingUnit ? matchingUnit.id : "unit-101";
        }
        const parentUnit = unitMap.get(validUnitId);
        if (parentUnit && parentUnit.subjectId) {
          validSubjectId = parentUnit.subjectId;
        }
        return {
          ...l,
          unitId: validUnitId,
          subjectId: validSubjectId,
        };
      }).filter(Boolean);
      setStoredData(KEYS.LESSONS, allLessons);
      const lessonMap = new Map<string, Lesson>(allLessons.map((l) => [l.id, l]));

      // Build quick lookups by parent
      const unitsBySubject = new Map<string, Unit[]>();
      allUnits.forEach((u) => {
        if (!u || !u.subjectId) return;
        const list = unitsBySubject.get(u.subjectId) || [];
        list.push(u);
        unitsBySubject.set(u.subjectId, list);
      });

      const lessonsByUnit = new Map<string, Lesson[]>();
      allLessons.forEach((l) => {
        if (!l || !l.unitId) return;
        const list = lessonsByUnit.get(l.unitId) || [];
        list.push(l);
        lessonsByUnit.set(l.unitId, list);
      });

      // 2. Load and normalize all existing questions
      const rawQuestions = this.getQuestions();
      const questionMap = new Map<string, Question>();
      const combinedQuestions = [...rawQuestions];

      // Only seed initialQuestions if storage is completely empty
      if (rawQuestions.length === 0 && initialQuestions.length > 0) {
        initialQuestions.forEach((initQ) => combinedQuestions.push(initQ));
      }

      combinedQuestions.forEach((q) => {
        if (!q || !q.id) return;
        const qId = String(q.id).trim();

        const les = lessonMap.get(q.lessonId);
        const sub = subjectMap.get(q.subjectId);

        if (les) {
          const parentUnit = unitMap.get(les.unitId);
          const parentSub = parentUnit ? subjectMap.get(parentUnit.subjectId) : undefined;

          q.unitId = les.unitId;
          q.subjectId = parentUnit ? parentUnit.subjectId : q.subjectId;
          q.lessonTitle = les.title;
          if (parentUnit) q.unitTitle = parentUnit.title;
          if (parentSub) q.subjectName = parentSub.name;
          if (q.status !== "archived" && q.status !== "requires_review" && q.status !== "uncategorized") {
            q.status = "active";
          }
        } else if (!sub) {
          // The question belongs to a subject that is NOT in the Curriculum Tree (e.g. Chemistry, Physics, etc.)
          // Preserve 100% data, DO NOT force into Math! Mark as requires_review.
          if (q.status !== "archived") {
            q.status = "requires_review";
            q.complianceReason = `السؤال ينتمي لمادة غير موجودة بشجرة المنهاج الحالية (${q.subjectName || "الكيمياء/غيرها"}). يحتاج مراجعة أو إعادة ربط.`;
          }
          repairedLinks++;
        } else {
          // Lesson does not exist in Curriculum Tree
          if (q.status !== "archived") {
            q.status = "requires_review";
            q.complianceReason = `معرّف الدرس غير موجود بشجرة المنهاج الحالية (${q.lessonId || "مفقود"}). يحتاج مراجعة أو إعادة ربط.`;
          }
          repairedLinks++;
        }

        // Validate importance (1 to 5) and futureProbability
        const importanceVal =
          typeof q.importance === "number" && q.importance >= 1 && q.importance <= 5
            ? (Math.round(q.importance) as 1 | 2 | 3 | 4 | 5)
            : 4;
        const futureProbVal = typeof q.futureProbability === "number" ? q.futureProbability : 85;
        const weightScore =
          typeof q.finalWeightScore === "number"
            ? q.finalWeightScore
            : Number((importanceVal * 0.5 + (futureProbVal / 100) * 2.5).toFixed(1));

        // Clean lessonIds
        let validLessonIds: string[] = [];
        if (Array.isArray(q.lessonIds)) {
          validLessonIds = q.lessonIds.filter((lid) => lessonMap.has(lid));
        }
        if (q.lessonId && !validLessonIds.includes(q.lessonId)) {
          validLessonIds.push(q.lessonId);
        }

        const subName = les ? (subjectMap.get(les.subjectId)?.name || q.subjectName) : q.subjectName;
        const uTitle = les ? (unitMap.get(les.unitId)?.title || q.unitTitle) : q.unitTitle;
        const lTitle = les ? les.title : q.lessonTitle;

        let resolvedBookRef: any = q.bookReference;
        if (typeof resolvedBookRef === "string" && resolvedBookRef.trim()) {
          resolvedBookRef = {
            bookSource: resolvedBookRef.trim(),
            pageNumber: "",
            exerciseNumber: "",
            questionTitle: "",
            showInCard: true,
            showInPrint: true,
          };
        } else if (resolvedBookRef && typeof resolvedBookRef === "object") {
          resolvedBookRef = {
            bookSource: resolvedBookRef.bookSource || [subName, uTitle, lTitle].filter(Boolean).join(" - "),
            pageNumber: resolvedBookRef.pageNumber || "",
            exerciseNumber: resolvedBookRef.exerciseNumber || "",
            questionTitle: resolvedBookRef.questionTitle || "",
            showInCard: resolvedBookRef.showInCard !== false,
            showInPrint: resolvedBookRef.showInPrint !== false,
          };
        } else {
          const defaultSource = [subName, uTitle, lTitle].filter(Boolean).join(" - ");
          resolvedBookRef = {
            bookSource: defaultSource || "",
            pageNumber: "",
            exerciseNumber: "",
            questionTitle: "",
            showInCard: true,
            showInPrint: true,
          };
        }

        const normalized: Question = {
          ...q,
          id: qId,
          type: q.type || "mcq",
          text: q.text || "",
          answer: q.answer || "",
          difficulty: q.difficulty || "medium",
          importance: importanceVal,
          futureProbability: futureProbVal,
          finalWeightScore: weightScore,
          lessonIds: validLessonIds,
          occurrencesCount: typeof q.occurrencesCount === "number" ? q.occurrencesCount : 1,
          tags: Array.isArray(q.tags) ? q.tags : [],
          distractors: Array.isArray(q.distractors) ? q.distractors : [],
          matchingPairs: Array.isArray(q.matchingPairs) ? q.matchingPairs : [],
          sequenceItems: Array.isArray(q.sequenceItems) ? q.sequenceItems : [],
          isPastCycle: !!q.isPastCycle,
          status: q.status || "active",
          isVisible: q.isVisible !== false,
          subjectName: subName,
          unitTitle: uTitle,
          lessonTitle: lTitle,
          bookReference: resolvedBookRef,
          createdAt: q.createdAt || new Date().toISOString(),
          updatedAt: q.updatedAt || new Date().toISOString(),
        };

        questionMap.set(qId, normalized);
      });

      // 3. Scan lesson cards for embedded questions and bi-directionally sync metadata without overwriting valid data
      const allCards = getStoredData<Record<string, any[]>>(KEYS.LESSON_CARDS, {});
      let cardsUpdated = false;

      allLessons.forEach((lesson) => {
        let lessonModified = false;
        const currentQuestionIds = new Set<string>(lesson.questionIds || []);
        const paragraphs = allCards[lesson.id] || lesson.contentParagraphs || [];

        paragraphs.forEach((p: any) => {
          if (p && p.type === "questions" && p.body) {
            let cardQList: any[] = [];
            let isArray = true;
            try {
              if (p.body.startsWith("{") || p.body.startsWith("[")) {
                const parsed = JSON.parse(p.body);
                isArray = Array.isArray(parsed);
                cardQList = isArray ? parsed : [parsed];
              }
            } catch (e) {}

            let paragraphBodyChanged = false;

            const updatedCardQList = cardQList.map((qObj: any) => {
              if (!qObj || !qObj.id) return qObj;
              const qId = qObj.id;

              if (questionMap.has(qId)) {
                const centralQ = questionMap.get(qId)!;
                
                // Bi-directional merge for bookReference fields
                const centralRef: any = centralQ.bookReference || {};
                const localRef = typeof qObj.bookReference === "object" ? qObj.bookReference : (typeof qObj.bookReference === "string" ? { bookSource: qObj.bookReference } : {});
                
                const mergedRef: BookReference = {
                  bookSource: centralRef.bookSource || localRef.bookSource || [centralQ.subjectName, centralQ.unitTitle, centralQ.lessonTitle].filter(Boolean).join(" - ") || "",
                  pageNumber: centralRef.pageNumber || localRef.pageNumber || "",
                  exerciseNumber: centralRef.exerciseNumber || localRef.exerciseNumber || "",
                  questionTitle: centralRef.questionTitle || localRef.questionTitle || "",
                  showInCard: centralRef.showInCard !== false,
                  showInPrint: centralRef.showInPrint !== false,
                };

                centralQ.bookReference = mergedRef;
                questionMap.set(qId, centralQ);

                const nextLessonIds = new Set(centralQ.lessonIds || []);
                nextLessonIds.add(lesson.id);
                centralQ.lessonIds = Array.from(nextLessonIds);

                if (!currentQuestionIds.has(qId)) {
                  currentQuestionIds.add(qId);
                  lessonModified = true;
                }

                if (JSON.stringify(qObj.bookReference) !== JSON.stringify(mergedRef)) {
                  paragraphBodyChanged = true;
                }

                return {
                  ...qObj,
                  bookReference: mergedRef,
                };
              } else {
                // If question exists in card but not in bank, add to central bank safely
                const defaultRef: BookReference = typeof qObj.bookReference === "object" && qObj.bookReference !== null ? {
                  bookSource: qObj.bookReference.bookSource || [lesson?.subjectId, lesson?.unitId, lesson?.title].filter(Boolean).join(" - "),
                  pageNumber: qObj.bookReference.pageNumber || "",
                  exerciseNumber: qObj.bookReference.exerciseNumber || "",
                  questionTitle: qObj.bookReference.questionTitle || "",
                  showInCard: true,
                  showInPrint: true,
                } : {
                  bookSource: typeof qObj.bookReference === "string" ? qObj.bookReference : lesson?.title || "",
                  pageNumber: "",
                  exerciseNumber: "",
                  questionTitle: "",
                  showInCard: true,
                  showInPrint: true,
                };

                const newCentralQ: Question = {
                  ...qObj,
                  id: qId,
                  subjectId: lesson?.subjectId || "",
                  unitId: lesson?.unitId || "",
                  lessonId: lesson?.id || "",
                  lessonIds: lesson?.id ? [lesson.id] : [],
                  type: qObj.type || "mcq",
                  text: qObj.text || "",
                  answer: qObj.answer || "",
                  difficulty: qObj.difficulty || "medium",
                  importance: qObj.importance || 3,
                  futureProbability: qObj.futureProbability || 75,
                  finalWeightScore: qObj.finalWeightScore || 80,
                  tags: qObj.tags || [],
                  status: qObj.status || "active",
                  bookReference: defaultRef,
                  createdAt: qObj.createdAt || new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                };

                questionMap.set(qId, newCentralQ);
                currentQuestionIds.add(qId);
                lessonModified = true;

                return {
                  ...qObj,
                  bookReference: defaultRef,
                };
              }
            });

            if (paragraphBodyChanged) {
              p.body = JSON.stringify(isArray ? updatedCardQList : updatedCardQList[0]);
              cardsUpdated = true;
            }
          }
        });

        if (allCards[lesson.id]) {
          allCards[lesson.id] = paragraphs;
        }

        if (lessonModified) {
          lesson.questionIds = Array.from(currentQuestionIds);
          syncedLessons++;
        }
      });

      if (cardsUpdated) {
        setStoredData(KEYS.LESSON_CARDS, allCards);
      }

      // 4. Bi-directionally sync question IDs into lesson.questionIds
      questionMap.forEach((q) => {
        if (Array.isArray(q.lessonIds)) {
          q.lessonIds.forEach((lid) => {
            const targetLesson = lessonMap.get(lid);
            if (targetLesson) {
              const qIds = new Set(targetLesson.questionIds || []);
              if (!qIds.has(q.id)) {
                qIds.add(q.id);
                targetLesson.questionIds = Array.from(qIds);
                syncedLessons++;
              }
            }
          });
        }
      });

      // 5. Save all verified and repaired records
      const finalQuestions = Array.from(questionMap.values());
      setStoredData(KEYS.QUESTIONS, finalQuestions);
      setStoredData(KEYS.LESSONS, Array.from(lessonMap.values()));

      // 6. Normalize all Question IDs in Exams before backup sync
      const currentExams = getStoredData<Exam[]>(KEYS.EXAMS, initialExams);
      if (Array.isArray(currentExams) && currentExams.length > 0) {
        const normalizedExams = currentExams.map((e) => this.normalizeExam(e));
        setStoredData(KEYS.EXAMS, normalizedExams);
      }

      // 7. Synchronize all safe backups with the freshly repaired & normalized state
      this.syncSafeBackups();

      return {
        totalQuestions: finalQuestions.length,
        repairedLinks,
        syncedLessons,
      };
    } catch (err) {
      console.error("Error during repairAndSyncDatabase:", err);
      return { totalQuestions: 0, repairedLinks: 0, syncedLessons: 0 };
    }
  }

  // Audit logger
  logAction(
    userNameOrEntity?: string,
    action?: string,
    targetEntity?: string,
    targetEntityId?: string,
    detailsOrResult?: string,
    options?: {
      userId?: string;
      userName?: string;
      userRole?: string;
      result?: "success" | "denied" | "error";
      entityType?: string;
      entityId?: string;
    }
  ) {
    try {
      const curUser = getStoredData<User | null>(KEYS.CURRENT_USER, null);
      const realUserId = options?.userId || curUser?.id || "usr-current";
      const realUserName =
        options?.userName ||
        (userNameOrEntity && userNameOrEntity !== "المستخدم" && userNameOrEntity !== "النظام"
          ? userNameOrEntity
          : curUser?.name || "مستخدم النظام");
      const realUserRole = options?.userRole || curUser?.role || "admin";

      const sanitizedDetails = (detailsOrResult || "")
        .replace(
          /(password|passwordHash|passwordSalt|passwordIterations|token|session|credentials|كلمة المرور)\s*[:=]\s*\S+/gi,
          "$1: [REDACTED]"
        )
        .replace(
          /("(?:password|passwordHash|passwordSalt|passwordIterations|token|session|credentials)")\s*:\s*"[^"]*"/gi,
          '$1: "[REDACTED]"'
        );

      const logs = this.getAuditLogs();
      const newLog: AuditLog = {
        id: "log-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
        userId: realUserId,
        userName: realUserName,
        userRole: realUserRole,
        action: action || userNameOrEntity || "إجراء بدون عنوان",
        targetEntity: targetEntity || options?.entityType || "النظام",
        targetEntityId: targetEntityId || options?.entityId,
        entityType: options?.entityType || targetEntity || "النظام",
        entityId: options?.entityId || targetEntityId,
        timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
        result: options?.result || "success",
        details: sanitizedDetails,
      };
      const updatedLogs = [newLog, ...logs].slice(0, 500);
      setStoredData(KEYS.AUDIT_LOGS, updatedLogs);
    } catch (err) {
      console.error("[AuditLog] Error in logAction:", err);
    }
  }

  clearAuditLogs(): void {
    const curUser = this.getCurrentUser();
    if (!curUser || curUser.role !== "admin") {
      throw new Error("عذراً، هذه العملية متاحة لمدير النظام فقط.");
    }
    setStoredData(KEYS.AUDIT_LOGS, []);
    this.logAction(curUser.name, "تفريغ سجل الحركات والتدقيق", "النظام", "", "تم مسح كافة سجلات التدقيق الكلية");
  }

  // Subjects
  getSubjects(): Subject[] {
    return getStoredData<Subject[]>(KEYS.SUBJECTS, initialSubjects);
  }
  saveSubject(subject: Subject) {
    const list = this.getSubjects();
    const idx = list.findIndex((s) => s.id === subject.id);
    if (idx >= 0) {
      list[idx] = subject;
    } else {
      list.push(subject);
    }
    setStoredData(KEYS.SUBJECTS, list);
    this.logAction(
      "المستخدم",
      idx >= 0 ? "تعديل مادة دراسية" : "إضافة مادة جديدة",
      "المواد",
      subject.id,
      subject.name,
    );
  }
  deleteSubject(id: string) {
    const list = this.getSubjects().filter((s) => s.id !== id);
    setStoredData(KEYS.SUBJECTS, list);

    // Find and delete child units
    const childUnits = this.getUnits().filter((u) => u.subjectId === id);
    const remainingUnits = this.getUnits().filter((u) => u.subjectId !== id);
    setStoredData(KEYS.UNITS, remainingUnits);

    // Find and delete child lessons and their cards
    const childLessons = this.getLessons().filter((l) => l.subjectId === id);
    const remainingLessons = this.getLessons().filter((l) => l.subjectId !== id);
    setStoredData(KEYS.LESSONS, remainingLessons);

    const allCards = getStoredData<Record<string, any[]>>(KEYS.LESSON_CARDS, {});
    childLessons.forEach((l) => {
      if (allCards[l.id]) delete allCards[l.id];
    });
    setStoredData(KEYS.LESSON_CARDS, allCards);

    // Safely unlink questions pointing to this subject or its children (protect Question Bank)
    try {
      const childLessonIds = new Set(childLessons.map((l) => l.id));
      const allQuestions = this.getQuestions();
      let questionsUpdated = false;
      const updatedQuestions = allQuestions.map((q) => {
        let modified = false;
        let nextSubjectId = q.subjectId;
        let nextUnitId = q.unitId;
        let nextLessonId = q.lessonId;
        let nextLessonIds = q.lessonIds;

        if (q.subjectId === id) {
          nextSubjectId = "";
          nextUnitId = "";
          nextLessonId = "";
          nextLessonIds = [];
          modified = true;
        } else if (nextLessonId && childLessonIds.has(nextLessonId)) {
          nextLessonId = "";
          nextLessonIds = (nextLessonIds || []).filter((lid) => !childLessonIds.has(lid));
          modified = true;
        }

        if (modified) {
          questionsUpdated = true;
          return {
            ...q,
            subjectId: nextSubjectId,
            unitId: nextUnitId,
            lessonId: nextLessonId,
            lessonIds: nextLessonIds,
            updatedAt: new Date().toISOString(),
          };
        }
        return q;
      });

      if (questionsUpdated) {
        setStoredData(KEYS.QUESTIONS, updatedQuestions);
      }
    } catch (e) {
      console.error("Error unlinking deleted subject from questions:", e);
    }

    this.logAction("المستخدم", "حذف مادة دراسية وملحقاتها بأمان", "المواد", id);
  }

  // Units
  getUnits(): Unit[] {
    return getStoredData<Unit[]>(KEYS.UNITS, initialUnits);
  }
  saveUnit(unit: Unit) {
    const list = this.getUnits();
    const idx = list.findIndex((u) => u.id === unit.id);
    if (idx >= 0) list[idx] = unit;
    else list.push(unit);
    setStoredData(KEYS.UNITS, list);
    this.logAction(
      "المستخدم",
      idx >= 0 ? "تعديل وحدة دراسية" : "إضافة وحدة دراسية جديدة",
      "الوحدات",
      unit.id,
      unit.title,
    );
  }
  deleteUnit(id: string) {
    const list = this.getUnits().filter((u) => u.id !== id);
    setStoredData(KEYS.UNITS, list);

    // Find and delete child lessons and their cards
    const childLessons = this.getLessons().filter((l) => l.unitId === id);
    const remainingLessons = this.getLessons().filter((l) => l.unitId !== id);
    setStoredData(KEYS.LESSONS, remainingLessons);

    const allCards = getStoredData<Record<string, any[]>>(KEYS.LESSON_CARDS, {});
    childLessons.forEach((l) => {
      if (allCards[l.id]) delete allCards[l.id];
    });
    setStoredData(KEYS.LESSON_CARDS, allCards);

    // Safely unlink questions pointing to this unit or its children
    try {
      const childLessonIds = new Set(childLessons.map((l) => l.id));
      const allQuestions = this.getQuestions();
      let questionsUpdated = false;
      const updatedQuestions = allQuestions.map((q) => {
        let modified = false;
        let nextUnitId = q.unitId;
        let nextLessonId = q.lessonId;
        let nextLessonIds = q.lessonIds;

        if (q.unitId === id) {
          nextUnitId = "";
          nextLessonId = "";
          nextLessonIds = [];
          modified = true;
        } else if (nextLessonId && childLessonIds.has(nextLessonId)) {
          nextLessonId = "";
          nextLessonIds = (nextLessonIds || []).filter((lid) => !childLessonIds.has(lid));
          modified = true;
        }

        if (modified) {
          questionsUpdated = true;
          return {
            ...q,
            unitId: nextUnitId,
            lessonId: nextLessonId,
            lessonIds: nextLessonIds,
            updatedAt: new Date().toISOString(),
          };
        }
        return q;
      });

      if (questionsUpdated) {
        setStoredData(KEYS.QUESTIONS, updatedQuestions);
      }
    } catch (e) {
      console.error("Error unlinking deleted unit from questions:", e);
    }

    this.logAction("المستخدم", "حذف وحدة دراسية وملحقاتها بأمان", "الوحدات", id);
  }

  // Lessons
  getLessons(): Lesson[] {
    return getStoredData<Lesson[]>(KEYS.LESSONS, initialLessons);
  }
  saveLesson(lesson: Lesson) {
    const list = this.getLessons();
    const idx = list.findIndex((l) => l.id === lesson.id);
    if (idx >= 0) list[idx] = lesson;
    else list.push(lesson);
    setStoredData(KEYS.LESSONS, list);
    this.logAction(
      "المستخدم",
      idx >= 0 ? "تعديل درس" : "إضافة درس جديد",
      "الدروس",
      lesson.id,
      lesson.title,
    );
  }
  deleteLesson(id: string) {
    const list = this.getLessons().filter((l) => l.id !== id);
    setStoredData(KEYS.LESSONS, list);
    
    // Also clean up normalized cards
    const allCards = getStoredData<Record<string, any[]>>(KEYS.LESSON_CARDS, {});
    if (allCards[id]) {
      delete allCards[id];
      setStoredData(KEYS.LESSON_CARDS, allCards);
    }

    // Unlink lesson from questions without deleting the questions from Question Bank (Single Source of Truth)
    try {
      const allQuestions = this.getQuestions();
      let questionsUpdated = false;
      const updatedQuestions = allQuestions.map((q) => {
        let modified = false;
        let nextLessonIds = q.lessonIds;
        let nextLessonId = q.lessonId;
        
        if (Array.isArray(q.lessonIds) && q.lessonIds.includes(id)) {
          nextLessonIds = q.lessonIds.filter((lid) => lid !== id);
          modified = true;
        }
        if (q.lessonId === id) {
          nextLessonId = nextLessonIds && nextLessonIds.length > 0 ? nextLessonIds[0] : "";
          modified = true;
        }

        if (modified) {
          questionsUpdated = true;
          return {
            ...q,
            lessonId: nextLessonId,
            lessonIds: nextLessonIds,
            updatedAt: new Date().toISOString(),
          };
        }
        return q;
      });

      if (questionsUpdated) {
        setStoredData(KEYS.QUESTIONS, updatedQuestions);
      }
    } catch (e) {
      console.error("Error unlinking deleted lesson from questions:", e);
    }

    this.logAction("المستخدم", "حذف درس", "الدروس", id);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("refresh-data-all"));
    }
  }

  // Unlink a question from a lesson without deleting it from the Question Bank
  unlinkQuestionFromLesson(lessonId: string, questionId: string) {
    // 1. Remove from lesson.questionIds
    const lessons = this.getLessons();
    const lessonIdx = lessons.findIndex((l) => l.id === lessonId);
    if (lessonIdx >= 0) {
      const currentIds = lessons[lessonIdx].questionIds || [];
      lessons[lessonIdx].questionIds = currentIds.filter((id) => id !== questionId);
      setStoredData(KEYS.LESSONS, lessons);
    }

    // 2. Remove from lesson cards
    const allCards = getStoredData<Record<string, any[]>>(KEYS.LESSON_CARDS, {});
    if (allCards[lessonId] && Array.isArray(allCards[lessonId])) {
      let cardsModified = false;
      allCards[lessonId] = allCards[lessonId].map((card) => {
        if (card.type === "questions" && card.body) {
          try {
            if (card.body.startsWith("{") || card.body.startsWith("[")) {
              const parsed = JSON.parse(card.body);
              const list = Array.isArray(parsed) ? parsed : [parsed];
              const filtered = list.filter((q: any) => q.id !== questionId);
              if (filtered.length !== list.length) {
                cardsModified = true;
                return {
                  ...card,
                  body: JSON.stringify(filtered),
                  updatedAt: new Date().toISOString(),
                };
              }
            }
          } catch (e) {}
        }
        return card;
      });

      if (cardsModified) {
        setStoredData(KEYS.LESSON_CARDS, allCards);
      }
    }

    // 3. Keep question in Bank, remove this lessonId from lessonIds and safely update primary lessonId if needed
    const allQuestions = this.getQuestions();
    const qIdx = allQuestions.findIndex((q) => q.id === questionId);
    if (qIdx >= 0) {
      const targetQ = allQuestions[qIdx];
      let updated = false;

      if (Array.isArray(targetQ.lessonIds) && targetQ.lessonIds.includes(lessonId)) {
        targetQ.lessonIds = targetQ.lessonIds.filter((lid) => lid !== lessonId);
        updated = true;
      }

      if (targetQ.lessonId === lessonId) {
        let newPrimaryLessonId = "";
        if (Array.isArray(targetQ.lessonIds) && targetQ.lessonIds.length > 0) {
          newPrimaryLessonId = targetQ.lessonIds[0];
        } else {
          const otherLesson = lessons.find(
            (l) => l.id !== lessonId && Array.isArray(l.questionIds) && l.questionIds.includes(questionId)
          );
          if (otherLesson) {
            newPrimaryLessonId = otherLesson.id;
          }
        }
        targetQ.lessonId = newPrimaryLessonId;
        const newLesson = lessons.find((l) => l.id === newPrimaryLessonId);
        if (newLesson) {
          targetQ.lessonTitle = newLesson.title;
          if (newLesson.unitId) targetQ.unitId = newLesson.unitId;
          if (newLesson.subjectId) targetQ.subjectId = newLesson.subjectId;
        } else if (!newPrimaryLessonId) {
          targetQ.lessonTitle = "";
        }
        updated = true;
      }

      if (updated) {
        targetQ.updatedAt = new Date().toISOString();
        setStoredData(KEYS.QUESTIONS, allQuestions);
      }
    }

    this.logAction("المستخدم", "فك ارتباط سؤال من الدرس", "إعداد الدروس", questionId, `الدرس: ${lessonId}`);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("refresh-data-all"));
    }
  }

  // Normalized Relational Storage Handlers (Foreign Keys: lessonId, questionId)
  getLessonCardsNormalized(lessonId: string): any[] {
    const allCards = getStoredData<Record<string, any[]>>(KEYS.LESSON_CARDS, {});
    let cards = [];
    if (allCards[lessonId] && Array.isArray(allCards[lessonId]) && allCards[lessonId].length > 0) {
      cards = allCards[lessonId];
    } else {
      const lesson = this.getLessons().find((l) => l.id === lessonId);
      cards = lesson?.contentParagraphs || [];
    }

    // Dynamically resolve questions from the SSOT (Question Bank)
    return cards.map((card) => {
      if (card.type === "questions") {
        if (Array.isArray(card.questions)) {
          return {
            ...card,
            questions: card.questions.map((q: any) => this.resolveQuestion(q))
          };
        } else if (card.body) {
          try {
            if (card.body.startsWith("{") || card.body.startsWith("[")) {
              const parsed = JSON.parse(card.body);
              const isArr = Array.isArray(parsed);
              const qList = isArr ? parsed : [parsed];
              const resolved = qList.map((q: any) => this.resolveQuestion(q));
              return {
                ...card,
                body: JSON.stringify(isArr ? resolved : resolved[0])
              };
            }
          } catch (e) {}
        }
      }
      return card;
    });
  }

  saveLessonNormalized(lesson: Lesson, paragraphs?: any[]) {
    // 1. Save core lesson metadata
    this.saveLesson(lesson);

    // 2. Normalize and save cards linked explicitly via foreign key lessonId
    if (paragraphs && Array.isArray(paragraphs)) {
      const allCards = getStoredData<Record<string, any[]>>(KEYS.LESSON_CARDS, {});
      allCards[lesson.id] = paragraphs.map((p, idx) => ({
        lessonId: lesson.id,
        cardId: p.id || `card_${lesson.id}_${idx + 1}`,
        type: p.type || "paragraph",
        title: p.title || "",
        body: p.body || "",
        orderIndex: idx,
        isVisible: p.isVisible !== false,
        customColor: p.customColor,
        style: p.style,
        updatedAt: new Date().toISOString(),
      }));
      setStoredData(KEYS.LESSON_CARDS, allCards);
    }
  }

  // Questions (Single Source of Truth)
  getQuestions(): Question[] {
    const res = getStoredData<Question[]>(KEYS.QUESTIONS, initialQuestions);
    if (process.env.NODE_ENV !== "production") {
      import("../utils/debugLog").then(({ debugLog }) => {
        debugLog("storage", "getQuestions", { count: res.length, sample: res.slice(0, 3) });
      }).catch(() => {});
    }
    return res;
  }

  getQuestionsForLessonNormalized(lessonId: string): Question[] {
    const questions = this.getQuestions();
    return questions.filter(
      (q) =>
        q.lessonId === lessonId ||
        (Array.isArray(q.lessonIds) && q.lessonIds.includes(lessonId))
    );
  }

  getQuestionById(id: string): Question | undefined {
    if (!id) return undefined;
    const questions = this.getQuestions();
    return questions.find((q) => q.id === id);
  }

  resolveQuestion<T extends { id?: string; questionId?: string }>(inputQ: T): T {
    if (!inputQ) return inputQ;
    const qId = inputQ.questionId || inputQ.id;
    if (!qId) return inputQ;
    const bankQ = this.getQuestionById(qId);
    // SSOT FEATURE FLAG CHECK
    const useSSOT = typeof window !== 'undefined' && window.localStorage && localStorage.getItem("ENABLE_DATA_2_SSOT_MODE") !== "false";
    if (bankQ && useSSOT) {
      const merged: any = { ...inputQ, ...bankQ, id: qId, questionId: qId };
      // Contextual metadata from the reference (inputQ) MUST win over the bank defaults
      if ('score' in inputQ) merged.score = (inputQ as any).score;
      if ('allocatedMarks' in inputQ) merged.allocatedMarks = (inputQ as any).allocatedMarks;
      if ('sectionId' in inputQ) merged.sectionId = (inputQ as any).sectionId;
      if ('questionOrder' in inputQ) merged.questionOrder = (inputQ as any).questionOrder;
      if ('isVisible' in inputQ) merged.isVisible = (inputQ as any).isVisible;
      if ('hideAnswer' in inputQ) merged.hideAnswer = (inputQ as any).hideAnswer;
      if ('shuffledDistractors' in inputQ) merged.shuffledDistractors = (inputQ as any).shuffledDistractors;
      return merged;
    }
    return inputQ;
  }

  stripQuestionForSSOT(q: any): any {
    const useSSOT = typeof window !== 'undefined' && window.localStorage && localStorage.getItem("ENABLE_DATA_2_SSOT_MODE") !== "false";
    if (!useSSOT || !q) return q;
    
    const qId = q.id || q.questionId;

    // Only keep identifiers and contextual metadata needed for rendering in a list/exam
    return {
      id: qId,
      questionId: qId,
      type: q.type,
      score: q.score,
      allocatedMarks: q.allocatedMarks,
      sectionId: q.sectionId,
      questionOrder: q.questionOrder,
      isVisible: q.isVisible,
      hideAnswer: q.hideAnswer,
      shuffledDistractors: q.shuffledDistractors
    };
  }

  verifyQuestionSave(
    questionId: string,
    expectedData: Partial<Question>
  ): QuestionSaveVerificationResult {
    const stored = this.getQuestionById(questionId);
    if (!stored) {
      return {
        success: false,
        status: "FAIL",
        failedFields: ["question_not_found"],
        inputData: expectedData,
      };
    }

    const failedFields: string[] = [];

    // Dynamically check all keys provided in expectedData
    Object.keys(expectedData).forEach((key) => {
      if (key === "updatedAt" || key === "createdAt" || key === "lessonIds") return;
      const field = key as keyof Question;
      const expectedVal = expectedData[field];
      const storedVal = stored[field];

      if (expectedVal !== undefined) {
        if (typeof expectedVal === "object" && expectedVal !== null) {
          const expStr = JSON.stringify(expectedVal);
          const storStr = JSON.stringify(storedVal || (Array.isArray(expectedVal) ? [] : {}));
          if (expStr !== storStr) {
            failedFields.push(String(field));
          }
        } else if (typeof expectedVal === "string" && typeof storedVal === "string") {
          if (expectedVal.trim() !== storedVal.trim()) {
            failedFields.push(String(field));
          }
        } else if (expectedVal !== storedVal) {
          failedFields.push(String(field));
        }
      }
    });

    const isPass = failedFields.length === 0;
    return {
      success: isPass,
      status: isPass ? "PASS" : "FAIL",
      failedFields,
      storedQuestion: stored,
      inputData: expectedData,
    };
  }

  saveQuestion(question: Question): Question & { _verification: QuestionSaveVerificationResult } {
    const list = this.getQuestions();
    const idx = list.findIndex((q) => q && q.id === question?.id);

    // Look up curriculum labels to keep titles synced
    const subjects = this.getSubjects();
    const units = this.getUnits();
    const lessons = this.getLessons();

    const subject = subjects.find((s) => s && s.id === question?.subjectId);
    const unit = units.find((u) => u && u.id === question?.unitId);
    const lesson = lessons.find((l) => l && l.id === question?.lessonId);

    const existingQ = idx >= 0 ? list[idx] : null;
    const incomingRef = question.bookReference || existingQ?.bookReference;

    const subName = subject?.name || question.subjectName || existingQ?.subjectName || "";
    const uTitle = unit?.title || question.unitTitle || existingQ?.unitTitle || "";
    const lTitle = lesson?.title || question.lessonTitle || existingQ?.lessonTitle || "";

    let resolvedBookRef: BookReference;
    if (typeof incomingRef === "string" && (incomingRef as string).trim()) {
      resolvedBookRef = {
        bookSource: (incomingRef as string).trim(),
        pageNumber: existingQ?.bookReference?.pageNumber || "",
        exerciseNumber: existingQ?.bookReference?.exerciseNumber || "",
        questionTitle: existingQ?.bookReference?.questionTitle || "",
        showInCard: existingQ?.bookReference?.showInCard !== false,
        showInPrint: existingQ?.bookReference?.showInPrint !== false,
      };
    } else if (incomingRef && typeof incomingRef === "object") {
      const defaultBookSource = [subName, uTitle, lTitle].filter(Boolean).join(" - ");
      resolvedBookRef = {
        bookSource: incomingRef.bookSource !== undefined ? incomingRef.bookSource : (existingQ?.bookReference?.bookSource || defaultBookSource || ""),
        pageNumber: incomingRef.pageNumber !== undefined ? incomingRef.pageNumber : (existingQ?.bookReference?.pageNumber || ""),
        exerciseNumber: incomingRef.exerciseNumber !== undefined ? incomingRef.exerciseNumber : (existingQ?.bookReference?.exerciseNumber || ""),
        questionTitle: incomingRef.questionTitle !== undefined ? incomingRef.questionTitle : (existingQ?.bookReference?.questionTitle || ""),
        showInCard: incomingRef.showInCard !== undefined ? incomingRef.showInCard : (existingQ?.bookReference?.showInCard !== false),
        showInPrint: incomingRef.showInPrint !== undefined ? incomingRef.showInPrint : (existingQ?.bookReference?.showInPrint !== false),
      };
    } else {
      const defaultBookSource = [subName, uTitle, lTitle].filter(Boolean).join(" - ");
      resolvedBookRef = {
        bookSource: defaultBookSource || "",
        pageNumber: "",
        exerciseNumber: "",
        questionTitle: "",
        showInCard: true,
        showInPrint: true,
      };
    }

    const importanceVal =
      typeof question.importance === "number" && question.importance >= 1 && question.importance <= 5
        ? (Math.round(question.importance) as 1 | 2 | 3 | 4 | 5)
        : (existingQ?.importance || 4);
    const futureProbVal =
      typeof question.futureProbability === "number" ? question.futureProbability : (existingQ?.futureProbability ?? 85);
    const finalWeight =
      typeof question.finalWeightScore === "number"
        ? question.finalWeightScore
        : Number((importanceVal * 0.5 + (futureProbVal / 100) * 2.5).toFixed(1));

    const linkedLessonIds = new Set<string>();
    if (question.lessonId) linkedLessonIds.add(question.lessonId);
    if (Array.isArray(question.lessonIds)) {
      question.lessonIds.forEach((lid) => linkedLessonIds.add(lid));
    }

    const normalizedQ: Question = {
      ...existingQ,
      ...question,
      importance: importanceVal,
      futureProbability: futureProbVal,
      finalWeightScore: finalWeight,
      lessonIds: Array.from(linkedLessonIds),
      subjectName: subName,
      unitTitle: uTitle,
      lessonTitle: lTitle,
      bookReference: resolvedBookRef,
      updatedAt: new Date().toISOString(),
    };

    if (idx >= 0) {
      list[idx] = normalizedQ;
    } else {
      list.unshift(normalizedQ);
    }
    setStoredData(KEYS.QUESTIONS, list);

    // 1. Synchronize normalized question into embedded lesson cards in KEYS.LESSON_CARDS
    // [DATA-2 SSOT MODE]: We no longer do deep copy writes to LESSON_CARDS or EXAMS.
    // The UI now dynamically calls resolveQuestion() to read the latest content.
    const useSSOT = typeof window !== 'undefined' && window.localStorage && localStorage.getItem("ENABLE_DATA_2_SSOT_MODE") !== "false";
    if (!useSSOT) {
      // Legacy fallback omitted here to force strict SSOT, but we can restore if needed.
      // In SSOT mode, we just return.
    }


    // 3. Synchronize normalized question into stored exam library in KEYS.EXAMS_LIBRARY
    // [DATA-2] We do NOT modify EXAMS_LIBRARY questionSnapshots here anymore.
    // They are considered Frozen Historical Snapshots.

    // 4. Sync lesson.questionIds: add to current lessons and remove from orphaned lessons
    let lessonsModified = false;
    lessons.forEach((l) => {
      const qIds = new Set(l.questionIds || []);
      if (linkedLessonIds.has(l.id)) {
        if (!qIds.has(normalizedQ.id)) {
          qIds.add(normalizedQ.id);
          l.questionIds = Array.from(qIds);
          lessonsModified = true;
        }
      } else if (idx >= 0 && qIds.has(normalizedQ.id)) {
        // If question was moved away from this lesson, unlink it
        qIds.delete(normalizedQ.id);
        l.questionIds = Array.from(qIds);
        lessonsModified = true;
      }
    });

    if (lessonsModified) {
      setStoredData(KEYS.LESSONS, lessons);
    }

    // Post-Save Verification Step
    const verification = this.verifyQuestionSave(normalizedQ.id, question);
    if (verification.status === "FAIL") {
      console.warn(`[Question Bank SSOT Sync FAIL] Question ID: ${normalizedQ.id}. Failed fields:`, verification.failedFields);
    } else {
      console.log(`[Question Bank SSOT Sync PASS] Question ID: ${normalizedQ.id}`);
    }

    this.logAction(
      "المستخدم",
      idx >= 0 ? `تعديل سؤال (${verification.status})` : `إضافة سؤال جديد (${verification.status})`,
      "بنك الأسئلة",
      question.id,
      `${question.text ? question.text.substring(0, 40) : "بدون نص"} | Status: ${verification.status}`
    );

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("refresh-data-all"));
      window.dispatchEvent(new CustomEvent("storage-change"));
      window.dispatchEvent(new CustomEvent("question-updated", { detail: normalizedQ }));
    }

    return {
      ...normalizedQ,
      _verification: verification,
    };
  }

  // Transfer multiple questions to a target subject, unit, and lesson
  transferQuestions(
    questionIds: string[],
    targetSubjectId: string,
    targetUnitId: string,
    targetLessonId: string,
  ): number {
    const list = this.getQuestions();
    const subjects = this.getSubjects();
    const units = this.getUnits();
    const lessons = this.getLessons();

    const targetSub = subjects.find((s) => s.id === targetSubjectId);
    const targetUnit = units.find((u) => u.id === targetUnitId);
    const targetLes = lessons.find((l) => l.id === targetLessonId);

    const idSet = new Set(questionIds);
    let count = 0;

    const updatedList = list.map((q) => {
      if (idSet.has(q.id)) {
        count++;
        return {
          ...q,
          subjectId: targetSubjectId,
          unitId: targetUnitId,
          lessonId: targetLessonId,
          lessonIds: [targetLessonId],
          subjectName: targetSub?.name || q.subjectName,
          unitTitle: targetUnit?.title || q.unitTitle,
          lessonTitle: targetLes?.title || q.lessonTitle,
          updatedAt: new Date().toISOString(),
        };
      }
      return q;
    });

    setStoredData(KEYS.QUESTIONS, updatedList);

    // Update lesson questionIds across all lessons
    let lessonsModified = false;
    lessons.forEach((l) => {
      const qIds = new Set(l.questionIds || []);
      if (l.id === targetLessonId) {
        questionIds.forEach((qid) => qIds.add(qid));
        l.questionIds = Array.from(qIds);
        lessonsModified = true;
      } else {
        let changed = false;
        questionIds.forEach((qid) => {
          if (qIds.has(qid)) {
            qIds.delete(qid);
            changed = true;
          }
        });
        if (changed) {
          l.questionIds = Array.from(qIds);
          lessonsModified = true;
        }
      }
    });

    if (lessonsModified) {
      setStoredData(KEYS.LESSONS, lessons);
    }

    this.logAction(
      "المستخدم",
      `نقل ${count} سؤال إلى ${targetSub?.name || ""} / ${targetLes?.title || ""}`,
      "بنك الأسئلة",
      targetLessonId,
    );

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("refresh-data-all"));
    }

    return count;
  }

  // Batch update importance for questions
  batchUpdateImportance(questionIds: string[], importance: 1 | 2 | 3 | 4 | 5): number {
    const list = this.getQuestions();
    const idSet = new Set(questionIds);
    let count = 0;

    const updated = list.map((q) => {
      if (idSet.has(q.id)) {
        count++;
        const futureProbVal = typeof q.futureProbability === "number" ? q.futureProbability : 85;
        const weightScore = Number((importance * 0.5 + (futureProbVal / 100) * 2.5).toFixed(1));
        return {
          ...q,
          importance,
          finalWeightScore: weightScore,
          updatedAt: new Date().toISOString(),
        };
      }
      return q;
    });

    setStoredData(KEYS.QUESTIONS, updated);
    this.logAction("المستخدم", `تحديث تصنيف الأهمية لـ ${count} سؤال إلى ${importance} نجوم`, "بنك الأسئلة");

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("refresh-data-all"));
    }

    return count;
  }

  // Batch archive questions
  batchArchiveQuestions(questionIds: string[]): number {
    const list = this.getQuestions();
    const idSet = new Set(questionIds);
    let count = 0;
    const now = new Date().toISOString();

    const updated = list.map((q) => {
      if (idSet.has(q.id) && q.status !== "archived") {
        count++;
        return {
          ...q,
          status: "archived" as const,
          isArchived: true,
          archivedAt: now,
          updatedAt: now,
        };
      }
      return q;
    });

    setStoredData(KEYS.QUESTIONS, updated);
    this.logAction("المستخدم", `أرشفة ${count} سؤال`, "بنك الأسئلة");

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("refresh-data-all"));
    }

    return count;
  }

  // Batch restore questions
  batchRestoreQuestions(questionIds: string[]): number {
    const list = this.getQuestions();
    const idSet = new Set(questionIds);
    let count = 0;
    const now = new Date().toISOString();

    const updated = list.map((q) => {
      if (idSet.has(q.id) && q.status === "archived") {
        count++;
        return {
          ...q,
          status: "active" as const,
          isArchived: false,
          archivedAt: undefined,
          updatedAt: now,
        };
      }
      return q;
    });

    setStoredData(KEYS.QUESTIONS, updated);
    this.logAction("المستخدم", `استعادة ${count} سؤال من الأرشيف`, "بنك الأسئلة");

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("refresh-data-all"));
    }

    return count;
  }

  // Check if a question is linked/used in active lesson cards, exams, or library archives (Reference Integrity Check)
  checkQuestionUsage(questionId: string): QuestionUsageDetails {
    if (!questionId) {
      return {
        inUse: false,
        lessons: [],
        lessonCards: [],
        exams: [],
        libraryDocs: [],
        summaryMessage: "",
      };
    }

    const cardsInUse: { lessonId: string; lessonTitle?: string; cardTitle: string }[] = [];
    const examsInUse: { id: string; title: string }[] = [];
    const libraryInUse: { id: string; title: string }[] = [];

    const allLessons = this.getLessons();
    const lessonMap = new Map<string, string>();
    allLessons.forEach((l) => lessonMap.set(l.id, l.title || "درس"));

    // 1. Check Active Lesson Cards & Content Paragraphs
    const allCards = getStoredData<Record<string, any[]>>(KEYS.LESSON_CARDS, {});
    Object.keys(allCards).forEach((lessonId) => {
      const cards = allCards[lessonId];
      if (Array.isArray(cards)) {
        cards.forEach((card) => {
          let matches = false;
          // Check card.questions array
          if (Array.isArray(card.questions)) {
            matches = card.questions.some(
              (q: any) => q.id === questionId || q.questionId === questionId || q.originalId === questionId
            );
          }
          // Check card.body stringified JSON
          if (!matches && card.body) {
            try {
              if (card.body.includes(questionId)) {
                const parsed = JSON.parse(card.body);
                const qList = Array.isArray(parsed) ? parsed : [parsed];
                matches = qList.some(
                  (q: any) => q.id === questionId || q.questionId === questionId || q.originalId === questionId
                );
              }
            } catch (e) {}
          }

          if (matches) {
            cardsInUse.push({
              lessonId,
              lessonTitle: lessonMap.get(lessonId) || "الدرس",
              cardTitle: card.title || "بطاقة الأسئلة والتطبيقات",
            });
          }
        });
      }
    });

    // Check Lesson Content Paragraphs
    allLessons.forEach((l) => {
      if (Array.isArray(l.contentParagraphs)) {
        l.contentParagraphs.forEach((p) => {
          if (
            p.questionId === questionId ||
            (p.interactiveData && (p.interactiveData.questionId === questionId || p.interactiveData.id === questionId))
          ) {
            cardsInUse.push({
              lessonId: l.id,
              lessonTitle: l.title || "الدرس",
              cardTitle: `فقرة في الدرس (${p.title || p.type})`,
            });
          }
        });
      }
    });

    // 2. Check Stored Exams & Test Forms (KEYS.EXAMS)
    const exams = this.getExams();
    exams.forEach((exam: any) => {
      let used = false;
      if (Array.isArray(exam.questions) && exam.questions.some((q: any) => q.id === questionId || q.questionId === questionId)) {
        used = true;
      }
      if (!used && Array.isArray(exam.versions)) {
        used = exam.versions.some((ver: any) =>
          Array.isArray(ver.questions) && ver.questions.some((q: any) => q.id === questionId || q.questionId === questionId)
        );
      }
      if (!used && Array.isArray(exam.questionSnapshots)) {
        used = exam.questionSnapshots.some((q: any) => q.id === questionId || q.questionId === questionId);
      }
      if (used) {
        examsInUse.push({ id: exam.id, title: exam.title || exam.name || "نموذج اختبار" });
      }
    });

    // 3. Check Exam Library Documents & Archives (KEYS.EXAMS_LIBRARY)
    const libraryDocs = getStoredData<any[]>(KEYS.EXAMS_LIBRARY, []);
    libraryDocs.forEach((doc: any) => {
      let used = false;
      if (Array.isArray(doc.usedQuestionIds) && doc.usedQuestionIds.includes(questionId)) {
        used = true;
      }
      if (!used && Array.isArray(doc.questionSnapshots) && doc.questionSnapshots.some((q: any) => q.id === questionId || q.questionId === questionId || q.originalId === questionId)) {
        used = true;
      }
      if (!used && Array.isArray(doc.questions) && doc.questions.some((q: any) => q.id === questionId || q.questionId === questionId)) {
        used = true;
      }
      if (!used && Array.isArray(doc.versions)) {
        used = doc.versions.some((ver: any) => Array.isArray(ver.questions) && ver.questions.some((q: any) => q.id === questionId || q.questionId === questionId));
      }
      if (used) {
        libraryInUse.push({ id: doc.id, title: doc.title || "مستند بالمكتبة" });
      }
    });

    // 4. Clean up stale/orphaned questionIds in KEYS.LESSONS if question is not in active cards
    if (cardsInUse.length === 0) {
      let lessonsModified = false;
      allLessons.forEach((l) => {
        if (Array.isArray(l.questionIds) && l.questionIds.includes(questionId)) {
          l.questionIds = l.questionIds.filter((qid) => qid !== questionId);
          lessonsModified = true;
        }
      });
      if (lessonsModified) {
        setStoredData(KEYS.LESSONS, allLessons);
      }
    }

    const inUse = cardsInUse.length > 0 || examsInUse.length > 0 || libraryInUse.length > 0;

    let summaryParts: string[] = [];
    if (cardsInUse.length > 0) {
      summaryParts.push(`بطاقات الدروس (${cardsInUse.map((c) => `"${c.cardTitle}" في درس "${c.lessonTitle}"`).join(", ")})`);
    }
    if (examsInUse.length > 0) {
      summaryParts.push(`نماذج الاختبارات (${examsInUse.map((e) => `"${e.title}"`).join(", ")})`);
    }
    if (libraryInUse.length > 0) {
      summaryParts.push(`أرشيف المكتبة (${libraryInUse.map((d) => `"${d.title}"`).join(", ")})`);
    }

    const summaryMessage = inUse
      ? `لا يمكن حذف هذا السؤال لأنه مدمج فعلياً في المحتويات النشطة التالية: ${summaryParts.join(" | ")}. يرجى إزالته من هذه بطاقات/اختبارات أولاً.`
      : "";

    return {
      inUse,
      lessons: [], // Classification metadata is not an active reference
      lessonCards: cardsInUse,
      exams: examsInUse,
      libraryDocs: libraryInUse,
      summaryMessage,
    };
  }

  // Single archive question helper
  archiveQuestion(id: string): boolean {
    return this.batchArchiveQuestions([id]) > 0;
  }

  // Batch delete questions (with safety check)
  batchDeleteQuestions(questionIds: string[]): {
    deletedCount: number;
    blockedQuestions: { id: string; text?: string; usage: QuestionUsageDetails }[];
  } {
    const allQuestions = this.getQuestions();
    const blockedQuestions: { id: string; text?: string; usage: QuestionUsageDetails }[] = [];
    const deletableIds: string[] = [];

    questionIds.forEach((id) => {
      const usage = this.checkQuestionUsage(id);
      if (usage.inUse) {
        const q = allQuestions.find((item) => item.id === id);
        blockedQuestions.push({ id, text: q?.text, usage });
      } else {
        deletableIds.push(id);
      }
    });

    if (deletableIds.length > 0) {
      const idSet = new Set(deletableIds);
      const list = allQuestions.filter((q) => !idSet.has(q.id));
      setStoredData(KEYS.QUESTIONS, list);

      // Remove from all lessons
      const lessons = this.getLessons();
      let lessonsModified = false;
      lessons.forEach((l) => {
        if (Array.isArray(l.questionIds) && l.questionIds.some((id) => idSet.has(id))) {
          l.questionIds = l.questionIds.filter((id) => !idSet.has(id));
          lessonsModified = true;
        }
      });
      if (lessonsModified) {
        setStoredData(KEYS.LESSONS, lessons);
      }

      // Remove from cards
      const allCards = getStoredData<Record<string, any[]>>(KEYS.LESSON_CARDS, {});
      let cardsModified = false;
      Object.keys(allCards).forEach((lessonId) => {
        const cards = allCards[lessonId];
        if (Array.isArray(cards)) {
          cards.forEach((card) => {
            if (card.type === "questions" && card.body) {
              try {
                if (card.body.startsWith("{") || card.body.startsWith("[")) {
                  const parsed = JSON.parse(card.body);
                  const qList = Array.isArray(parsed) ? parsed : [parsed];
                  const filtered = qList.filter((q: any) => !idSet.has(q.id));
                  if (filtered.length !== qList.length) {
                    card.body = JSON.stringify(filtered);
                    card.updatedAt = new Date().toISOString();
                    cardsModified = true;
                  }
                }
              } catch (e) {}
            }
          });
        }
      });
      if (cardsModified) {
        setStoredData(KEYS.LESSON_CARDS, allCards);
      }
    }

    this.logAction(
      "المستخدم",
      `حذف دفعة أسئلة: تم حذف ${deletableIds.length}، وتم حظر ${blockedQuestions.length} سؤال لأنها مستخدمة`,
      "بنك الأسئلة"
    );

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("refresh-data-all"));
    }

    return {
      deletedCount: deletableIds.length,
      blockedQuestions,
    };
  }

  deleteQuestion(id: string): { success: boolean; message?: string; usage?: QuestionUsageDetails } {
    const usage = this.checkQuestionUsage(id);
    if (usage.inUse) {
      this.logAction("المستخدم", `محاولة فاشلة لحذف سؤال مستخدم في المحتوى (ID: ${id})`, "بنك الأسئلة");
      return {
        success: false,
        usage,
        message: usage.summaryMessage,
      };
    }

    // 1. Remove from Question Bank
    const list = this.getQuestions().filter((q) => q.id !== id);
    setStoredData(KEYS.QUESTIONS, list);

    // 2. Remove question ID from all lessons
    const lessons = this.getLessons();
    let lessonsModified = false;
    lessons.forEach((l) => {
      if (Array.isArray(l.questionIds) && l.questionIds.includes(id)) {
        l.questionIds = l.questionIds.filter((qid) => qid !== id);
        lessonsModified = true;
      }
    });
    if (lessonsModified) {
      setStoredData(KEYS.LESSONS, lessons);
    }

    // 3. Remove question from all lesson cards (both card.questions array and card.body string)
    const allCards = getStoredData<Record<string, any[]>>(KEYS.LESSON_CARDS, {});
    let cardsModified = false;
    Object.keys(allCards).forEach((lessonId) => {
      const cards = allCards[lessonId];
      if (Array.isArray(cards)) {
        cards.forEach((card) => {
          if (Array.isArray(card.questions)) {
            const initLen = card.questions.length;
            card.questions = card.questions.filter(
              (q: any) => q.id !== id && q.questionId !== id && q.originalId !== id
            );
            if (card.questions.length !== initLen) cardsModified = true;
          }
          if (card.body) {
            try {
              if (card.body.startsWith("{") || card.body.startsWith("[")) {
                const parsed = JSON.parse(card.body);
                const qList = Array.isArray(parsed) ? parsed : [parsed];
                const filtered = qList.filter(
                  (q: any) => q.id !== id && q.questionId !== id && q.originalId !== id
                );
                if (filtered.length !== qList.length) {
                  card.body = JSON.stringify(filtered);
                  card.updatedAt = new Date().toISOString();
                  cardsModified = true;
                }
              }
            } catch (e) {}
          }
        });
      }
    });
    if (cardsModified) {
      setStoredData(KEYS.LESSON_CARDS, allCards);
    }

    this.logAction("المستخدم", "حذف سؤال نهائياً من بنك الأسئلة والدروس", "بنك الأسئلة", id);

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("refresh-data-all"));
      window.dispatchEvent(new CustomEvent("storage-change"));
    }

    return { success: true };
  }

  // Print Templates
  getPrintTemplates(): PrintTemplate[] {
    const list: PrintTemplate[] = getStoredData(KEYS.PRINT_TEMPLATES, initialPrintTemplates);
    const settings = this.getSettings();
    const currentAcademy = settings.academyName || "المثنى لطلاب الهندسة";

    let modified = false;
    const sanitized = list.map((tmpl) => {
      if (
        tmpl.headerContent?.schoolName &&
        (tmpl.headerContent.schoolName.includes("وزارة التربية والتعليم") ||
          tmpl.headerContent.schoolName.includes("الإدارة العامة للامتحانات"))
      ) {
        modified = true;
        return {
          ...tmpl,
          headerContent: {
            ...tmpl.headerContent,
            schoolName: currentAcademy,
          },
        };
      }
      return tmpl;
    });

    if (modified) {
      setStoredData(KEYS.PRINT_TEMPLATES, sanitized);
    }

    return sanitized;
  }
  getPrintTemplate(id?: string): PrintTemplate {
    const list = this.getPrintTemplates();
    if (id) {
      const found = list.find((t) => t.id === id);
      if (found) return found;
    }
    return list.find((t) => t.isDefault) || list[0] || initialPrintTemplates[0];
  }
  savePrintTemplate(tmpl: PrintTemplate) {
    const list = this.getPrintTemplates();
    const idx = list.findIndex((t) => t.id === tmpl.id);
    if (idx >= 0) list[idx] = tmpl;
    else list.push(tmpl);
    setStoredData(KEYS.PRINT_TEMPLATES, list);
    this.logAction(
      "المستخدم",
      "تحديث قالب طباعة A4",
      "قوالب الطباعة",
      tmpl.id,
      tmpl.name,
    );
  }
  deletePrintTemplate(id: string) {
    const list = this.getPrintTemplates().filter((t) => t.id !== id);
    setStoredData(KEYS.PRINT_TEMPLATES, list);
    this.logAction("المستخدم", "حذف قالب طباعة A4", "قوالب الطباعة", id);
  }

  // Exam Templates
  getExamTemplates(): ExamTemplate[] {
    return getStoredData(KEYS.EXAM_TEMPLATES, initialExamTemplates);
  }
  saveExamTemplate(tmpl: ExamTemplate) {
    const list = this.getExamTemplates();
    const idx = list.findIndex((t) => t.id === tmpl.id);
    if (idx >= 0) list[idx] = tmpl;
    else list.push(tmpl);
    setStoredData(KEYS.EXAM_TEMPLATES, list);
    this.logAction(
      "المستخدم",
      "تحديث قالب امتحان رسمي",
      "محرك القوالب الامتحانية",
      tmpl.id,
      tmpl.name,
    );
  }

  // Exams
  /**
   * Runtime 1-time Safe Normalization for Exams:
   * Traverses EXAMS -> versions -> questions, and if question.id is missing while questionId is present,
   * assigns id = questionId without modifying any other content.
   * Saves EXAMS once, and immediately creates SAFE_BACKUP_edutech_exams_v1 directly from the saved version.
   */
  normalizeAndSyncExamsRuntime() {
    if (typeof window === "undefined" || !window.localStorage) return;
    try {
      const rawExams = localStorage.getItem(KEYS.EXAMS);
      if (rawExams) {
        const exams = JSON.parse(rawExams);
        if (Array.isArray(exams) && exams.length > 0) {
          const processQuestion = (q: any) => {
            if (!q) return;
            if (!q.id && q.questionId) {
              q.id = q.questionId;
            } else if (!q.questionId && q.id) {
              q.questionId = q.id;
            }
          };

          exams.forEach((exam: any) => {
            if (!exam) return;
            if (Array.isArray(exam.questions)) {
              exam.questions.forEach(processQuestion);
            }
            if (Array.isArray(exam.versions)) {
              exam.versions.forEach((ver: any) => {
                if (!ver) return;
                if (Array.isArray(ver.questions)) {
                  ver.questions.forEach(processQuestion);
                }
                if (Array.isArray(ver.sections)) {
                  ver.sections.forEach((sec: any) => {
                    if (sec && Array.isArray(sec.questions)) {
                      sec.questions.forEach(processQuestion);
                    }
                  });
                }
              });
            }
          });

          // Save EXAMS once
          const savedStr = JSON.stringify(exams);
          localStorage.setItem(KEYS.EXAMS, savedStr);
          memoryStorage.set(KEYS.EXAMS, exams);

          // Direct creation of SAFE_BACKUP_EXAMS from the exact saved copy
          localStorage.setItem(BACKUP_PREFIX + KEYS.EXAMS, savedStr);
          localStorage.removeItem(BACKUP_PREFIX + KEYS.EXAMS_LIBRARY);
          localStorage.removeItem(BACKUP_PREFIX + "edutech_exams_library_v1");
        }
      }
    } catch (e) {
      console.warn("Could not normalize and sync runtime exams:", e);
    }
  }

  /**
   * Bulk Safe Repair for All Exam Records Missing IDs:
   * Traverses all EXAMS -> versions -> questions, and for each question missing id with valid questionId, sets id = questionId.
   * Strictly preserves all other fields and structures without deleting or altering any exams.
   * Saves edutech_exams_v1 once, and immediately creates SAFE_BACKUP_edutech_exams_v1 directly from the saved version.
   */
  
  emergencyDataRecovery(): any {
    if (typeof window === "undefined" || !window.localStorage) {
      return { success: false, error: "No localStorage" };
    }
    
    console.log("=== STARTING EMERGENCY DATA RECOVERY ===");
    const SNAPSHOTS_KEY = "edutech_governance_snapshots_v1";

    // Sources for reading exams
    const sources = [
      { name: KEYS.EXAMS, data: localStorage.getItem(KEYS.EXAMS) },
      { name: BACKUP_PREFIX + KEYS.EXAMS, data: localStorage.getItem(BACKUP_PREFIX + KEYS.EXAMS) },
      { name: KEYS.EXAMS_LIBRARY, data: localStorage.getItem(KEYS.EXAMS_LIBRARY) },
      { name: BACKUP_PREFIX + KEYS.EXAMS_LIBRARY, data: localStorage.getItem(BACKUP_PREFIX + KEYS.EXAMS_LIBRARY) },
      { name: "edutech_exams_library_v1", data: localStorage.getItem("edutech_exams_library_v1") },
    ];

    const snapshotsStr = localStorage.getItem(SNAPSHOTS_KEY) || "[]";
    let snapshots = [];
    try {
      snapshots = JSON.parse(snapshotsStr);
    } catch(e) {}

    const allExamsMap = new Map();
    const allLibraryMap = new Map();
    
    // Parse existing exams from current storage first
    let examsBeforeCount = 0;
    let libBeforeCount = 0;
    
    const currentExamsRaw = localStorage.getItem(KEYS.EXAMS);
    if (currentExamsRaw) {
      try {
        const parsed = JSON.parse(currentExamsRaw);
        if (Array.isArray(parsed)) {
          examsBeforeCount = parsed.length;
          parsed.forEach(item => {
             if (item && item.id) allExamsMap.set(item.id, item);
          });
        }
      } catch(e) {}
    }

    const currentLibRaw = localStorage.getItem(KEYS.EXAMS_LIBRARY) || localStorage.getItem("edutech_exams_library_v1");
    if (currentLibRaw) {
      try {
        const parsed = JSON.parse(currentLibRaw);
        if (Array.isArray(parsed)) {
          libBeforeCount = parsed.length;
          parsed.forEach(item => {
             if (item && item.id) allLibraryMap.set(item.id, item);
          });
        }
      } catch(e) {}
    }

    // Now look for missing ones in all sources
    const parseAndRecoverMissing = (raw, map) => {
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          parsed.forEach(item => {
            if (!item || !item.id) return;
            // Only add if it's completely missing
            if (!map.has(item.id)) {
              map.set(item.id, JSON.parse(JSON.stringify(item)));
            } else {
              // Also recover structurally missing inner parts without overwriting main record
              const existing = map.get(item.id);
              if (item.versions && (!existing.versions || item.versions.length > existing.versions.length)) {
                existing.versions = item.versions;
              }
              if (item.questionSnapshots && (!existing.questionSnapshots || item.questionSnapshots.length > existing.questionSnapshots.length)) {
                existing.questionSnapshots = item.questionSnapshots;
              }
            }
          });
        }
      } catch (e) {}
    };

    sources.forEach(src => {
      if (src.name.includes("library") || src.name.includes("LIBRARY")) {
        parseAndRecoverMissing(src.data, allLibraryMap);
      } else {
        parseAndRecoverMissing(src.data, allExamsMap);
      }
    });

    snapshots.forEach(snap => {
      if (snap.data) {
        if (snap.data[KEYS.EXAMS]) parseAndRecoverMissing(snap.data[KEYS.EXAMS], allExamsMap);
        if (snap.data[KEYS.EXAMS_LIBRARY]) parseAndRecoverMissing(snap.data[KEYS.EXAMS_LIBRARY], allLibraryMap);
        if (snap.data["edutech_exams_library_v1"]) parseAndRecoverMissing(snap.data["edutech_exams_library_v1"], allLibraryMap);
      }
    });

    const finalExams = Array.from(allExamsMap.values());
    const finalLibrary = Array.from(allLibraryMap.values());
    
    // Save atomically
    localStorage.setItem(KEYS.EXAMS, JSON.stringify(finalExams));
    memoryStorage.set(KEYS.EXAMS, finalExams);
    
    const libKey = localStorage.getItem("edutech_exams_library_v1") !== null ? "edutech_exams_library_v1" : KEYS.EXAMS_LIBRARY;
    localStorage.setItem(libKey, JSON.stringify(finalLibrary));
    memoryStorage.set(libKey, finalLibrary);

    // Sync backup
    localStorage.setItem(BACKUP_PREFIX + KEYS.EXAMS, JSON.stringify(finalExams));

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("refresh-data-all"));
      window.dispatchEvent(new CustomEvent("refresh-data-" + KEYS.EXAMS));
    }

    return {
      success: true,
      recoveredExamsList: finalExams.map(e => ({ examId: e.id, examTitle: e.title || 'بدون عنوان' })),
      recoveredLibraryExamsList: finalLibrary.map(e => ({ id: e.id, title: e.title || 'بدون عنوان' })),
      examsBeforeCount: examsBeforeCount,
      examsAfterCount: finalExams.length,
      libraryBeforeCount: libBeforeCount,
      libraryAfterCount: finalLibrary.length,
    };
  }

  repairAllExamRecordsMissingIds(): {
    success: boolean;
    countBefore: number;
    countAfter: number;
    repairedCount: number;
    totalExamsCount: number;
  } {
    if (typeof window === "undefined" || !window.localStorage) {
      return { success: false, countBefore: 0, countAfter: 0, repairedCount: 0, totalExamsCount: 0 };
    }
    try {
      const rawExams = localStorage.getItem(KEYS.EXAMS) || JSON.stringify(initialExams);
      const exams = JSON.parse(rawExams);
      if (!Array.isArray(exams)) {
        return { success: false, countBefore: 0, countAfter: 0, repairedCount: 0, totalExamsCount: 0 };
      }

      let countBefore = 0;
      let countAfter = 0;
      let repairedCount = 0;

      const processQuestion = (q: any) => {
        if (!q) return;
        const isMissingId = !q.id && !!q.questionId;
        const isMissingQuestionId = !q.questionId && !!q.id;
        if (isMissingId) {
          countBefore++;
          q.id = q.questionId;
          repairedCount++;
        } else if (isMissingQuestionId) {
          q.questionId = q.id;
        }
      };

      exams.forEach((exam: any) => {
        if (!exam) return;
        if (Array.isArray(exam.questions)) {
          exam.questions.forEach(processQuestion);
        }
        if (Array.isArray(exam.versions)) {
          exam.versions.forEach((ver: any) => {
            if (!ver) return;
            if (Array.isArray(ver.questions)) {
              ver.questions.forEach(processQuestion);
            }
            if (Array.isArray(ver.sections)) {
              ver.sections.forEach((sec: any) => {
                if (sec && Array.isArray(sec.questions)) {
                  sec.questions.forEach(processQuestion);
                }
              });
            }
          });
        }
      });

      // Check count after
      exams.forEach((exam: any) => {
        if (!exam) return;
        const checkQ = (q: any) => {
          if (q && !q.id && !!q.questionId) countAfter++;
        };
        if (Array.isArray(exam.questions)) exam.questions.forEach(checkQ);
        if (Array.isArray(exam.versions)) {
          exam.versions.forEach((ver: any) => {
            if (!ver) return;
            if (Array.isArray(ver.questions)) ver.questions.forEach(checkQ);
            if (Array.isArray(ver.sections)) {
              ver.sections.forEach((sec: any) => {
                if (sec && Array.isArray(sec.questions)) sec.questions.forEach(checkQ);
              });
            }
          });
        }
      });

      // 1. Save edutech_exams_v1 once
      const savedStr = JSON.stringify(exams);
      localStorage.setItem(KEYS.EXAMS, savedStr);
      memoryStorage.set(KEYS.EXAMS, exams);

      // 2. Immediately create SAFE_BACKUP_edutech_exams_v1 directly from the EXACT saved copy
      localStorage.setItem(BACKUP_PREFIX + KEYS.EXAMS, savedStr);

      // 3. Exclude EXAMS_LIBRARY from backup
      localStorage.removeItem(BACKUP_PREFIX + KEYS.EXAMS_LIBRARY);
      localStorage.removeItem(BACKUP_PREFIX + "edutech_exams_library_v1");

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("refresh-data-all"));
        window.dispatchEvent(new CustomEvent("refresh-data-" + KEYS.EXAMS));
        window.dispatchEvent(new CustomEvent("storage-change", { detail: { key: KEYS.EXAMS } }));
      }

      return {
        success: true,
        countBefore,
        countAfter,
        repairedCount,
        totalExamsCount: exams.length,
      };
    } catch (e) {
      console.warn("Could not bulk repair exams missing IDs:", e);
      return { success: false, countBefore: 0, countAfter: 0, repairedCount: 0, totalExamsCount: 0 };
    }
  }

  /**
   * Dedicated Repair for Exam Record Missing IDs:
   * Only fills id = questionId if id is missing/empty, without modifying any other content.
   * Directly saves EXAMS and updates SAFE_BACKUP_EXAMS from the exact saved version.
   */
  repairExamRecordMissingIds(examId?: string): {
    success: boolean;
    repairedCount: number;
    countBefore: number;
    countAfter: number;
  } {
    if (typeof window === "undefined" || !window.localStorage) {
      return { success: false, repairedCount: 0, countBefore: 0, countAfter: 0 };
    }
    try {
      const rawExams = localStorage.getItem(KEYS.EXAMS);
      if (!rawExams) return { success: false, repairedCount: 0, countBefore: 0, countAfter: 0 };
      const exams = JSON.parse(rawExams);
      if (!Array.isArray(exams) || exams.length === 0) {
        return { success: false, repairedCount: 0, countBefore: 0, countAfter: 0 };
      }

      let countBefore = 0;
      let countAfter = 0;
      let repairedCount = 0;

      const processQuestion = (q: any) => {
        if (!q) return;
        const isMissingId = !q.id && !!q.questionId;
        const isMissingQuestionId = !q.questionId && !!q.id;
        if (isMissingId) {
          countBefore++;
          q.id = q.questionId;
          repairedCount++;
        } else if (isMissingQuestionId) {
          q.questionId = q.id;
        }
      };

      exams.forEach((exam: any) => {
        if (!exam) return;
        let isTargetExam = true;
        if (examId) {
          const matchesExamId = exam.id === examId;
          const containsQuestionId =
            (Array.isArray(exam.questions) && exam.questions.some((q: any) => q?.id === examId || q?.questionId === examId)) ||
            (Array.isArray(exam.versions) &&
              exam.versions.some((v: any) =>
                (Array.isArray(v.questions) && v.questions.some((q: any) => q?.id === examId || q?.questionId === examId)) ||
                (Array.isArray(v.sections) &&
                  v.sections.some((s: any) =>
                    Array.isArray(s.questions) && s.questions.some((q: any) => q?.id === examId || q?.questionId === examId)
                  ))
              ));
          isTargetExam = matchesExamId || containsQuestionId;
        }

        if (isTargetExam) {
          if (Array.isArray(exam.questions)) exam.questions.forEach(processQuestion);
          if (Array.isArray(exam.versions)) {
            exam.versions.forEach((ver: any) => {
              if (!ver) return;
              if (Array.isArray(ver.questions)) ver.questions.forEach(processQuestion);
              if (Array.isArray(ver.sections)) {
                ver.sections.forEach((sec: any) => {
                  if (sec && Array.isArray(sec.questions)) sec.questions.forEach(processQuestion);
                });
              }
            });
          }
        }
      });

      // Also ensure all exams have their IDs consistent
      exams.forEach((exam: any) => {
        if (!exam) return;
        if (Array.isArray(exam.questions)) exam.questions.forEach(processQuestion);
        if (Array.isArray(exam.versions)) {
          exam.versions.forEach((ver: any) => {
            if (!ver) return;
            if (Array.isArray(ver.questions)) ver.questions.forEach(processQuestion);
            if (Array.isArray(ver.sections)) {
              ver.sections.forEach((sec: any) => {
                if (sec && Array.isArray(sec.questions)) sec.questions.forEach(processQuestion);
              });
            }
          });
        }
      });

      // Save EXAMS once
      const savedStr = JSON.stringify(exams);
      localStorage.setItem(KEYS.EXAMS, savedStr);
      memoryStorage.set(KEYS.EXAMS, exams);

      // Direct creation of SAFE_BACKUP_EXAMS from the exact saved copy
      localStorage.setItem(BACKUP_PREFIX + KEYS.EXAMS, savedStr);
      localStorage.removeItem(BACKUP_PREFIX + KEYS.EXAMS_LIBRARY);
      localStorage.removeItem(BACKUP_PREFIX + "edutech_exams_library_v1");

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("refresh-data-all"));
        window.dispatchEvent(new CustomEvent("refresh-data-" + KEYS.EXAMS));
        window.dispatchEvent(new CustomEvent("storage-change", { detail: { key: KEYS.EXAMS } }));
      }

      return { success: true, repairedCount, countBefore, countAfter };
    } catch (e) {
      console.warn("Could not repair exam record missing IDs:", e);
      return { success: false, repairedCount: 0, countBefore: 0, countAfter: 0 };
    }
  }

  normalizeExam(exam: Exam): Exam {
    if (!exam) return exam;
    const normalized = { ...exam };
    if (Array.isArray((normalized as any).questions)) {
      (normalized as any).questions = (normalized as any).questions.map((q: any) => {
        if (!q) return q;
        const qId = q.id || q.questionId;
        return {
          ...q,
          id: qId,
          questionId: qId,
        };
      });
    }

    if (Array.isArray(normalized.versions)) {
      normalized.versions = normalized.versions.map((ver) => {
        const newVer = { ...ver };
        if (Array.isArray(newVer.questions)) {
          newVer.questions = newVer.questions.map((q: any) => {
            if (!q) return q;
            const qId = q.id || q.questionId;
            return {
              ...q,
              id: qId,
              questionId: qId,
            };
          });
        }
        if (Array.isArray(newVer.sections)) {
          newVer.sections = newVer.sections.map((sec) => {
            const newSec = { ...sec };
            if (Array.isArray(newSec.questions)) {
              newSec.questions = newSec.questions.map((q: any) => {
                if (!q) return q;
                const qId = q.id || q.questionId;
                return {
                  ...q,
                  id: qId,
                  questionId: qId,
                };
              });
            }
            return newSec;
          });
        }
        return newVer;
      });
    }

    return normalized;
  }

  getExams(): Exam[] {
    const exams = getStoredData(KEYS.EXAMS, initialExams) as Exam[];
    return exams.map((examObj) => {
      const exam = { ...examObj } as any;
      // Resolve top-level questions
      if (Array.isArray(exam.questions)) {
        exam.questions = exam.questions.map((q: any) => this.resolveQuestion(q));
      }
      // Resolve questions inside versions
      if (Array.isArray(exam.versions)) {
        exam.versions = exam.versions.map((ver: any) => {
          const newVer = { ...ver };
          if (Array.isArray(newVer.questions)) {
            newVer.questions = newVer.questions.map((q: any) => this.resolveQuestion(q));
          }
          if (Array.isArray(newVer.sections)) {
            newVer.sections = newVer.sections.map((sec: any) => {
              const newSec = { ...sec };
              if (Array.isArray(newSec.questions)) {
                newSec.questions = newSec.questions.map((q: any) => this.resolveQuestion(q));
              }
              return newSec;
            });
          }
          return newVer;
        });
      }
      return exam;
    });
  }
  saveExam(exam: Exam) {
    // 1. Normalize all Question IDs first
    const normalizedExam = this.normalizeExam(exam);

    // [DATA-2 SSOT MODE] Strip questions before saving
    let examToSave = normalizedExam;
    const useSSOT = typeof window !== 'undefined' && window.localStorage && localStorage.getItem("ENABLE_DATA_2_SSOT_MODE") !== "false";
    if (useSSOT) {
      examToSave = { ...normalizedExam };
      if (Array.isArray((examToSave as any).questions)) {
        (examToSave as any).questions = (examToSave as any).questions.map((q: any) => this.stripQuestionForSSOT(q));
      }
      if (Array.isArray(examToSave.versions)) {
        examToSave.versions = examToSave.versions.map((ver: any) => {
          const newVer = { ...ver };
          if (Array.isArray(newVer.questions)) {
            newVer.questions = newVer.questions.map((q: any) => this.stripQuestionForSSOT(q));
          }
          if (Array.isArray(newVer.sections)) {
            newVer.sections = newVer.sections.map((sec: any) => {
              const newSec = { ...sec };
              if (Array.isArray(newSec.questions)) {
                newSec.questions = newSec.questions.map((q: any) => this.stripQuestionForSSOT(q));
              }
              return newSec;
            });
          }
          return newVer;
        });
      }
    }

    // 2. Save edutech_exams_v1
    const list = getStoredData<Exam[]>(KEYS.EXAMS, initialExams);
    const idx = list.findIndex((e) => e.id === examToSave.id);
    if (idx >= 0) list[idx] = examToSave;
    else list.unshift(examToSave);
    setStoredData(KEYS.EXAMS, list);

    // 3. As the LAST step: update SAFE_BACKUP_edutech_exams_v1
    this.syncSafeBackupForKey(KEYS.EXAMS);

    this.logAction(
      "المستخدم",
      idx >= 0 ? "تحديث اختبار" : "إنشاء اختبار جديد",
      "توليد الامتحانات",
      examToSave.id,
      examToSave.title,
    );
  }
  deleteExam(id: string) {
    const list = getStoredData<Exam[]>(KEYS.EXAMS, initialExams).filter((e) => e.id !== id && (e as any).examId !== id);
    setStoredData(KEYS.EXAMS, list);
    this.syncSafeBackupForKey(KEYS.EXAMS);
    this.logAction("المستخدم", "حذف اختبار من النظام", "توليد الامتحانات", id);
  }

  // Cycles
  getCycles(): Cycle[] {
    return getStoredData(KEYS.CYCLES, initialCycles);
  }
  saveCycle(cycle: Cycle) {
    const list = this.getCycles();
    const idx = list.findIndex((c) => c.id === cycle.id);
    if (idx >= 0) list[idx] = cycle;
    else list.push(cycle);
    setStoredData(KEYS.CYCLES, list);
    this.logAction(
      "المستخدم",
      "تحديث أرشفة دورة امتحانية",
      "الدورات السابقة",
      cycle.id,
      cycle.name,
    );
  }
  deleteCycle(id: string) {
    const list = this.getCycles().filter((c) => c.id !== id);
    setStoredData(KEYS.CYCLES, list);
    this.logAction(
      "المستخدم",
      "حذف دورة امتحانية",
      "الدورات السابقة",
      id,
    );
  }

  // Users
  getUsers(): User[] {
    return getStoredData(KEYS.USERS, initialUsers);
  }
  getCurrentUser(): User {
    const users = this.getUsers();
    const storedCur = getStoredData<User | null>(KEYS.CURRENT_USER, null);
    let targetId = storedCur?.id;

    if (!targetId) {
      try {
        const sessStr =
          localStorage.getItem("edutech_session") ||
          sessionStorage.getItem("edutech_session");
        if (sessStr) {
          const sess = JSON.parse(sessStr);
          if (sess.userId) targetId = sess.userId;
        }
      } catch (e) {}
    }

    if (targetId) {
      const freshUser = users.find((u) => u.id === targetId);
      if (freshUser) {
        return freshUser;
      }
    }

    const firstActive = users.find((u) => u.status === "active") || initialUsers[0];
    return firstActive;
  }
  setCurrentUser(user: User): void {
    setStoredData(KEYS.CURRENT_USER, user);
    this.saveUser(user);
  }
  saveUsers(users: User[]): void {
    setStoredData(KEYS.USERS, users);
  }
  deleteUser(id: string): void {
    const list = this.getUsers().filter((u) => u.id !== id);
    setStoredData(KEYS.USERS, list);
    this.logAction("المستخدم", "حذف حساب مستخدم", "المستخدمون والترخيص", id);
  }
  saveUser(user: User) {
    const list = this.getUsers();
    const idx = list.findIndex((u) => u.id === user.id);
    if (idx >= 0) list[idx] = user;
    else list.push(user);
    setStoredData(KEYS.USERS, list);

    // If the saved user is the current active user, sync current_user storage as well
    const cur = getStoredData<User | null>(KEYS.CURRENT_USER, null);
    if (!cur || cur.id === user.id) {
      setStoredData(KEYS.CURRENT_USER, user);
    }

    this.logAction(
      "المستخدم",
      "تحديث حساب مستخدم وصلاحيات",
      "المستخدمون والترخيص",
      user.id,
      user.name,
    );
  }

  isAdminInitialized(): boolean {
    const users = this.getUsers();
    const admin = users.find((u) => u.role === "admin" || u.id === "usr-1");
    if (!admin) return false;
    return Boolean(admin.passwordHash && admin.passwordSalt);
  }

  async setupAdminPassword(password: string): Promise<User> {
    const strength = validatePasswordStrength(password);
    if (!strength.isValid) {
      throw new Error(strength.error || "كلمة المرور غير مطابقة لسياسة الأمان (10 محارف على الأقل مع أحرف وأرقام)");
    }

    const creds = await createPasswordHashForUser(password);
    const users = this.getUsers();
    let admin = users.find((u) => u.role === "admin" || u.id === "usr-1");

    if (!admin) {
      admin = {
        id: "usr-1",
        name: "أحمد محمود",
        username: "ahmed_admin",
        email: "admin@edutech.edu",
        role: "admin",
        allowedSubjectIds: ["sub-1", "sub-2", "sub-4", "sub-5", "sub-6"],
        status: "active",
        permissions: {
          curriculum: true,
          lessons: true,
          questions: true,
          exams: true,
          exports: true,
          reports: true,
          users: true,
          settings: true,
        },
      };
    }

    const updatedAdmin: User = {
      ...admin,
      passwordHash: creds.passwordHash,
      passwordSalt: creds.passwordSalt,
      passwordIterations: creds.passwordIterations,
      passwordAlgorithm: creds.passwordAlgorithm,
      status: "active",
    };
    delete updatedAdmin.password;

    this.saveUser(updatedAdmin);
    this.setCurrentUser(updatedAdmin);

    this.logAction(
      updatedAdmin.name,
      "تهيئة حساب المدير الأولية",
      "المصادقة والأمان",
      updatedAdmin.id,
      "تم إنشاء كلمة مرور المدير وتفعيل الحساب الآمن لأول مرة",
      {
        userId: updatedAdmin.id,
        userName: updatedAdmin.name,
        userRole: updatedAdmin.role,
        result: "success",
        entityType: "المصادقة",
        entityId: updatedAdmin.id,
      }
    );

    return updatedAdmin;
  }

  // Audit logs
  getAuditLogs(): AuditLog[] {
    return getStoredData(KEYS.AUDIT_LOGS, initialAuditLogs);
  }

  // Settings
  getSettings(): SystemSettings {
    return getStoredData(KEYS.SETTINGS, initialSettings);
  }
  saveSettings(settings: SystemSettings) {
    setStoredData(KEYS.SETTINGS, settings);
    this.logAction(
      "المستخدم",
      "تحديث إعدادات النظام والثيم",
      "الإعدادات العامة",
    );
  }

  generateChecksum(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }

  // Full Database Backup Export as JSON string
  exportFullDatabaseJson(): string {
    const rawData: Record<string, any> = {};
    const excludedKeys = [KEYS.CURRENT_USER, "session_token"];

    let questionsCount = 0;
    let examsCount = 0;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && !excludedKeys.includes(key) && !key.toLowerCase().includes("api_key") && !key.toLowerCase().includes("session")) {
        try {
          const val = localStorage.getItem(key);
          if (val) {
             const parsed = JSON.parse(val);
             rawData[key] = parsed;
             if (key === KEYS.QUESTIONS && Array.isArray(parsed)) questionsCount = parsed.length;
             if (key === KEYS.EXAMS && Array.isArray(parsed)) examsCount = parsed.length;
          }
        } catch (e) {
          rawData[key] = localStorage.getItem(key);
        }
      }
    }

    const rawDataClean = sanitizeDataForExport(rawData);
    const dataString = JSON.stringify(rawDataClean);
    const signature = this.generateChecksum(dataString);

    const dbDump = {
      formatVersion: 3,
      exportDate: new Date().toISOString(),
      appVersion: "3.0.0",
      data: rawDataClean,
      signature: signature,
      counts: {
        questions: questionsCount,
        exams: examsCount
      },
      // V1 compatibility dump keys with normalized Arabic texts
      subjects: sanitizeDataForExport(this.getSubjects()),
      units: sanitizeDataForExport(this.getUnits()),
      lessons: sanitizeDataForExport(this.getLessons()),
      lessonCards: sanitizeDataForExport(getStoredData(KEYS.LESSON_CARDS, {})),
      questions: sanitizeDataForExport(this.getQuestions()),
      printTemplates: sanitizeDataForExport(this.getPrintTemplates()),
      examTemplates: sanitizeDataForExport(this.getExamTemplates()),
      exams: sanitizeDataForExport(this.getExams()),
      cycles: sanitizeDataForExport(this.getCycles()),
      users: sanitizeDataForExport(this.getUsers()),
      settings: sanitizeDataForExport(this.getSettings()),
    };
    return JSON.stringify(dbDump, null, 2);
  }

  // Export Full Database as Blob with UTF-8 BOM
  exportFullDatabaseBlob(): Blob {
    const jsonStr = this.exportFullDatabaseJson();
    return createExportBlobWithBom(jsonStr);
  }

  // Import Database from JSON
  importDatabaseJson(jsonStr: string): boolean {
    try {
      // Strip UTF-8 BOM (\uFEFF) if present
      if (typeof jsonStr === "string" && jsonStr.charCodeAt(0) === 0xFEFF) {
        jsonStr = jsonStr.slice(1);
      }
      const parsed = JSON.parse(jsonStr);
      if (!parsed || typeof parsed !== "object") throw new Error("الملف فارغ أو غير صالح");

      const isV3 = parsed.formatVersion >= 3 && parsed.data;
      const isV2 = parsed.formatVersion === 2 && parsed.data;
      const isV1 = (parsed.appVersion === "1.0.0" || parsed.formatVersion == null) && (parsed.subjects || parsed.questions);
      
      if (!isV1 && !isV2 && !isV3) throw new Error("تنسيق النسخة الاحتياطية غير مدعوم");

      if (isV3) {
        const dataString = JSON.stringify(parsed.data);
        const currentHash = this.generateChecksum(dataString);
        if (currentHash !== parsed.signature) {
          throw new Error("بصمة التحقق غير متطابقة. الملف تالف أو تم العبث به.");
        }
      }

      // Snapshot current state for rescue point
      const rescueState: Record<string, string | null> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          rescueState[key] = localStorage.getItem(key);
        }
      }

      try {
        if (isV3 || isV2) {
          const dataToImport = parsed.data;
          const excludedKeys = [KEYS.CURRENT_USER, "session_token"];
          
          for (const key of Object.keys(dataToImport)) {
             if (!excludedKeys.includes(key) && !key.toLowerCase().includes("api_key") && !key.toLowerCase().includes("session")) {
                 const value = dataToImport[key];
                 const strValue = typeof value === 'string' ? value : JSON.stringify(value);
                 localStorage.setItem(key, strValue);
                 
                 // Verify write
                 const verify = localStorage.getItem(key);
                 if (verify !== strValue) {
                    throw new Error(`فشل التحقق من الكتابة للمفتاح: ${key}`);
                 }
             }
          }
        } else {
          // Legacy V1 import fallback
          const writeAndVerify = (key: string, data: any) => {
             setStoredData(key, data);
             const verify = localStorage.getItem(key);
             if (verify !== JSON.stringify(data)) throw new Error(`فشل التحقق من الكتابة للمفتاح ${key}`);
          };
          
          if (parsed.subjects) writeAndVerify(KEYS.SUBJECTS, parsed.subjects);
          if (parsed.units) writeAndVerify(KEYS.UNITS, parsed.units);
          if (parsed.lessons) writeAndVerify(KEYS.LESSONS, parsed.lessons);
          if (parsed.lessonCards) writeAndVerify(KEYS.LESSON_CARDS, parsed.lessonCards);
          if (parsed.questions) writeAndVerify(KEYS.QUESTIONS, parsed.questions);
          if (parsed.printTemplates) writeAndVerify(KEYS.PRINT_TEMPLATES, parsed.printTemplates);
          if (parsed.examTemplates) writeAndVerify(KEYS.EXAM_TEMPLATES, parsed.examTemplates);
          if (parsed.exams) writeAndVerify(KEYS.EXAMS, parsed.exams);
          if (parsed.cycles) writeAndVerify(KEYS.CYCLES, parsed.cycles);
          if (parsed.users) writeAndVerify(KEYS.USERS, parsed.users);
          if (parsed.settings) writeAndVerify(KEYS.SETTINGS, parsed.settings);
        }

        this.logAction(
          "المستخدم",
          "استعادة قاعدة البيانات من ملف نسخ احتياطي",
          "قاعدة البيانات",
        );
        return true;
      } catch (applyError) {
        // Rollback all keys to rescue point
        localStorage.clear();
        for (const key of Object.keys(rescueState)) {
           const val = rescueState[key];
           if (val !== null) localStorage.setItem(key, val);
        }
        throw new Error(`فشل الاستيراد وتم التراجع بالكامل للحماية: ${applyError}`);
      }
    } catch (err: any) {
      console.error("Import error:", err);
      throw err;
    }
  }

  // Empty database to start from scratch
  emptyDatabase(confirmationPhrase?: string) {
    const user = this.getCurrentUser();
    if (!user || user.role !== "admin") {
      throw new Error("عذراً، هذه العملية متاحة للمدير فقط.");
    }
    if (confirmationPhrase !== "تأكيد إفراغ البيانات") {
      throw new Error("عبارة التأكيد غير صحيحة.");
    }

    const rescueState: Record<string, string | null> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) rescueState[key] = localStorage.getItem(key);
    }

    try {
      const keysToEmpty = [
        KEYS.SUBJECTS, KEYS.UNITS, KEYS.LESSONS, KEYS.LESSON_CARDS,
        KEYS.QUESTIONS, KEYS.EXAMS, KEYS.CYCLES,
        "edutech_exams_library_v1", "taalim_question_bank_v1",
        "edutech_media_library_v1", "ai_learning_history_v1"
      ];

      for (const key of keysToEmpty) {
        const emptyVal = key === KEYS.LESSON_CARDS ? {} : [];
        setStoredData(key, emptyVal);
        const verify = localStorage.getItem(key);
        if (verify !== JSON.stringify(emptyVal)) throw new Error(`فشل التحقق من الكتابة للمفتاح ${key}`);
      }

      const keysToRemove = [
        "curriculum_max_stats_v2", "edutech_focus_question_id",
        "edutech_qa_last_test_date", "edutech_qa_tester_name"
      ];

      for (const key of keysToRemove) {
        localStorage.removeItem(key);
        if (localStorage.getItem(key) !== null) throw new Error(`فشل التحقق من الحذف للمفتاح ${key}`);
      }

      this.logAction(
        user.name,
        "تفريغ قاعدة البيانات بالكامل (البدء من الصفر)",
        "قاعدة البيانات",
      );
    } catch (applyError) {
      for (const key of Object.keys(rescueState)) {
        const val = rescueState[key];
        if (val !== null) localStorage.setItem(key, val);
        else localStorage.removeItem(key);
      }
      throw new Error(`فشل إفراغ القاعدة وتم التراجع بالكامل للحماية: ${applyError}`);
    }
  }

  // Remove Chemistry Sample Curriculum
  removeChemistryCurriculum(confirm: boolean = false) {
    if (!confirm) {
      console.warn("تنبيه: يجب تأكيد الحذف الصريح لحذف مادة الكيمياء (العينة).");
      return false;
    }

    const subjects = this.getSubjects().filter(
      (s) => s && s.id !== "sub-3" && !s.name?.includes("الكيمياء"),
    );
    const units = this.getUnits().filter((u) => u && u.subjectId !== "sub-3");
    const lessons = this.getLessons().filter((l) => l && l.subjectId !== "sub-3");
    const questions = this.getQuestions().filter((q) => q && q.subjectId !== "sub-3");

    setStoredData(KEYS.SUBJECTS, subjects);
    setStoredData(KEYS.UNITS, units);
    setStoredData(KEYS.LESSONS, lessons);
    setStoredData(KEYS.QUESTIONS, questions);
    this.logAction("المستخدم", "حذف المادة النموذجية (الكيمياء)", "المواد", "sub-3");
    return true;
  }

  // Reset to initial sample data

  resetAllData(confirmationPhrase?: string) {
    const user = this.getCurrentUser();
    if (!user || user.role !== "admin") {
      throw new Error("عذراً، هذه العملية متاحة للمدير فقط.");
    }
    if (confirmationPhrase !== "تأكيد استعادة الافتراضي") {
      throw new Error("عبارة التأكيد غير صحيحة.");
    }

    const rescueState: Record<string, string | null> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) rescueState[key] = localStorage.getItem(key);
    }

    try {
      const allKeys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k) allKeys.push(k);
      }

      for (const key of allKeys) {
        localStorage.removeItem(key);
        if (localStorage.getItem(key) !== null) {
          throw new Error(`فشل التحقق من الحذف للمفتاح ${key}`);
        }
      }

      this.initialize();
      this.logAction(
        user.name,
        "إعادة ضبط المصنع واسترجاع البيانات العينة",
        "قاعدة البيانات",
      );
    } catch (applyError) {
      for (const key of Object.keys(rescueState)) {
        const val = rescueState[key];
        if (val !== null) localStorage.setItem(key, val);
        else localStorage.removeItem(key);
      }
      throw new Error(`فشل استعادة الافتراضي وتم التراجع بالكامل للحماية: ${applyError}`);
    }
  }
}

export const storage = new StorageService();
storage.initialize();

export function savePageUiState(pageKey: string, stateUpdate: Record<string, any>): void {
  storage.saveUiState(pageKey, stateUpdate);
}

export function getPageUiState<T extends Record<string, any>>(pageKey: string, defaultState: T): T {
  return storage.getUiState(pageKey, defaultState);
}
