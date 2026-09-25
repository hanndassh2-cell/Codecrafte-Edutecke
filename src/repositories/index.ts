import {
  LocalStorageQuestionRepository,
  LocalStorageExamRepository,
  LocalStorageAuditLogRepository,
  LocalStorageSubjectRepository,
  LocalStorageUnitRepository,
  LocalStorageLessonRepository,
  LocalStorageUserRepository,
  LocalStorageSettingsRepository,
} from "./adapters/LocalStorageAdapters";
import { IRepositories } from "./types";

export * from "./types";
export * from "./adapters/LocalStorageAdapters";

export const questionRepository = new LocalStorageQuestionRepository();
export const examRepository = new LocalStorageExamRepository();
export const auditLogRepository = new LocalStorageAuditLogRepository();
export const subjectRepository = new LocalStorageSubjectRepository();
export const unitRepository = new LocalStorageUnitRepository();
export const lessonRepository = new LocalStorageLessonRepository();
export const userRepository = new LocalStorageUserRepository();
export const settingsRepository = new LocalStorageSettingsRepository();

/**
 * Scale-Ready Repositories Registry
 */
export const repositories: IRepositories = {
  questions: questionRepository,
  exams: examRepository,
  auditLogs: auditLogRepository,
  subjects: subjectRepository,
  units: unitRepository,
  lessons: lessonRepository,
  users: userRepository,
  settings: settingsRepository,
};
