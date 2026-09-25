import { storage } from "../../services/storage";
import {
  Question,
  Exam,
  AuditLog,
  Subject,
  Unit,
  Lesson,
  User,
  SystemSettings,
} from "../../types";
import {
  IQuestionRepository,
  IExamRepository,
  IAuditLogRepository,
  ISubjectRepository,
  IUnitRepository,
  ILessonRepository,
  IUserRepository,
  ISettingsRepository,
  QuestionFilterParams,
  QuestionStats,
  ExamFilterParams,
  AuditLogFilterParams,
  PaginationParams,
  SortParams,
  PaginatedResult,
} from "../types";

/**
 * Helper to compute scale-ready pagination
 */
function applyPagination<T>(
  items: T[],
  pagination?: PaginationParams
): PaginatedResult<T> {
  const page = pagination?.page && pagination.page > 0 ? pagination.page : 1;
  const pageSize =
    pagination?.pageSize && pagination.pageSize > 0
      ? pagination.pageSize
      : pagination?.limit || 20;
  const offset =
    pagination?.offset !== undefined
      ? pagination.offset
      : (page - 1) * pageSize;

  const total = items.length;
  const totalPages = Math.ceil(total / pageSize) || 1;
  const paginatedData = items.slice(offset, offset + pageSize);
  const hasMore = offset + pageSize < total;

  return {
    data: paginatedData,
    total,
    page,
    pageSize,
    totalPages,
    hasMore,
  };
}

/**
 * LocalStorage Adapter for Questions (Wrapping storage.ts)
 */
export class LocalStorageQuestionRepository implements IQuestionRepository {
  async getById(id: string): Promise<Question | null> {
    const list = storage.getQuestions();
    return list.find((q) => q.id === id) || null;
  }

  async getAll(filters?: QuestionFilterParams): Promise<Question[]> {
    let list = storage.getQuestions();
    if (filters) {
      list = this.filterQuestionsList(list, filters);
    }
    return list;
  }

  async create(question: Omit<Question, "id"> | Question): Promise<Question> {
    const qToSave = { ...question } as Question;
    if (!qToSave.id) {
      qToSave.id = `q-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    }
    return storage.saveQuestion(qToSave);
  }

  async update(id: string, partial: Partial<Question>): Promise<Question> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Question not found with id: ${id}`);
    }
    const updated = { ...existing, ...partial, id };
    return storage.saveQuestion(updated);
  }

  async delete(id: string): Promise<boolean> {
    const res = storage.deleteQuestion(id);
    return typeof res === "boolean" ? res : !!res?.success;
  }

  private filterQuestionsList(
    list: Question[],
    filters: QuestionFilterParams
  ): Question[] {
    return list.filter((q) => {
      // 1. Subject filter
      if (filters.subjectId && q.subjectId !== filters.subjectId) {
        return false;
      }
      // 2. Unit filter
      if (filters.unitId && q.unitId !== filters.unitId) {
        return false;
      }
      // 3. Lesson filter
      if (filters.lessonId && q.lessonId !== filters.lessonId) {
        return false;
      }
      // 4. Type filter
      if (filters.type && q.type !== filters.type) {
        return false;
      }
      // 5. Difficulty filter
      if (filters.difficulty && q.difficulty !== filters.difficulty) {
        return false;
      }
      // 6. Importance filter
      if (filters.importance && q.importance !== filters.importance) {
        return false;
      }
      // 7. Status filter
      if (filters.status && q.status !== filters.status) {
        return false;
      }
      // 8. Soft Delete / Archived filter
      if (filters.isArchived !== undefined) {
        const qArchived = !!(q.isArchived || q.status === "archived");
        if (qArchived !== filters.isArchived) return false;
      }
      // 9. RBAC Allowed Subjects filter
      if (filters.allowedSubjectIds && filters.allowedSubjectIds.length > 0) {
        if (!filters.allowedSubjectIds.includes(q.subjectId)) {
          return false;
        }
      }
      // 10. Search query filter
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase().trim();
        const matchesText = q.text && q.text.toLowerCase().includes(query);
        const matchesAnswer =
          q.answer && q.answer.toLowerCase().includes(query);
        const matchesSub =
          q.subjectName && q.subjectName.toLowerCase().includes(query);
        const matchesLesson =
          q.lessonTitle && q.lessonTitle.toLowerCase().includes(query);
        if (
          !matchesText &&
          !matchesAnswer &&
          !matchesSub &&
          !matchesLesson
        ) {
          return false;
        }
      }
      return true;
    });
  }

  async query(
    filters?: QuestionFilterParams,
    sort?: SortParams<keyof Question>,
    pagination?: PaginationParams
  ): Promise<PaginatedResult<Question>> {
    let list = storage.getQuestions();

    if (filters) {
      list = this.filterQuestionsList(list, filters);
    }

    if (sort) {
      list = [...list].sort((a, b) => {
        const valA = a[sort.field] ?? "";
        const valB = b[sort.field] ?? "";
        if (valA < valB) return sort.order === "asc" ? -1 : 1;
        if (valA > valB) return sort.order === "asc" ? 1 : -1;
        return 0;
      });
    }

    return applyPagination(list, pagination);
  }

  async count(filters?: QuestionFilterParams): Promise<number> {
    const filtered = await this.getAll(filters);
    return filtered.length;
  }

  async getStats(filters?: QuestionFilterParams): Promise<QuestionStats> {
    const list = await this.getAll(filters);

    const stats: QuestionStats = {
      totalCount: list.length,
      activeCount: 0,
      archivedCount: 0,
      requiresReviewCount: 0,
      uncategorizedCount: 0,
      byType: {},
      byDifficulty: {},
      bySubject: {},
    };

    list.forEach((q) => {
      // Status counts
      if (q.isArchived || q.status === "archived") {
        stats.archivedCount++;
      } else {
        stats.activeCount++;
      }
      if (q.status === "requires_review") stats.requiresReviewCount++;
      if (q.status === "uncategorized") stats.uncategorizedCount++;

      // Type counts
      const typeKey = q.type || "unknown";
      stats.byType[typeKey] = (stats.byType[typeKey] || 0) + 1;

      // Difficulty counts
      const diffKey = q.difficulty || "medium";
      stats.byDifficulty[diffKey] = (stats.byDifficulty[diffKey] || 0) + 1;

      // Subject counts
      const subKey = q.subjectId || "unknown";
      stats.bySubject[subKey] = (stats.bySubject[subKey] || 0) + 1;
    });

    return stats;
  }

  async batchUpdateImportance(
    ids: string[],
    importance: 1 | 2 | 3 | 4 | 5
  ): Promise<number> {
    return storage.batchUpdateImportance(ids, importance);
  }

  async batchArchive(ids: string[]): Promise<number> {
    return storage.batchArchiveQuestions(ids);
  }

  async batchRestore(ids: string[]): Promise<number> {
    return storage.batchRestoreQuestions(ids);
  }

  async transferQuestions(
    ids: string[],
    targetSubjectId: string,
    targetUnitId: string,
    targetLessonId: string
  ): Promise<number> {
    return storage.transferQuestions(
      ids,
      targetSubjectId,
      targetUnitId,
      targetLessonId
    );
  }
}

/**
 * LocalStorage Adapter for Exams (Wrapping storage.ts)
 */
export class LocalStorageExamRepository implements IExamRepository {
  async getById(id: string): Promise<Exam | null> {
    const list = storage.getExams();
    return list.find((e) => e.id === id || (e as any).examId === id) || null;
  }

  async getAll(filters?: ExamFilterParams): Promise<Exam[]> {
    let list = storage.getExams();
    if (filters) {
      list = list.filter((e) => {
        const subId = e.subjectId || (e as any).scope?.subjectId;
        if (filters.subjectId && subId !== filters.subjectId) return false;
        if (filters.allowedSubjectIds && filters.allowedSubjectIds.length > 0) {
          if (!subId || !filters.allowedSubjectIds.includes(subId)) return false;
        }
        if (filters.searchQuery) {
          const q = filters.searchQuery.toLowerCase().trim();
          const matchesTitle = e.title && e.title.toLowerCase().includes(q);
          if (!matchesTitle) return false;
        }
        return true;
      });
    }
    return list;
  }

  async create(exam: Exam): Promise<Exam> {
    storage.saveExam(exam);
    return exam;
  }

  async update(id: string, partial: Partial<Exam>): Promise<Exam> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Exam not found with id: ${id}`);
    }
    const updated = { ...existing, ...partial, id };
    storage.saveExam(updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    storage.deleteExam(id);
    return true;
  }

  async query(
    filters?: ExamFilterParams,
    sort?: SortParams<keyof Exam>,
    pagination?: PaginationParams
  ): Promise<PaginatedResult<Exam>> {
    let list = await this.getAll(filters);

    if (sort) {
      list = [...list].sort((a, b) => {
        const valA = (a as any)[sort.field] ?? "";
        const valB = (b as any)[sort.field] ?? "";
        if (valA < valB) return sort.order === "asc" ? -1 : 1;
        if (valA > valB) return sort.order === "asc" ? 1 : -1;
        return 0;
      });
    }

    return applyPagination(list, pagination);
  }

  async count(filters?: ExamFilterParams): Promise<number> {
    const list = await this.getAll(filters);
    return list.length;
  }
}

/**
 * LocalStorage Adapter for Audit Logs (Wrapping storage.ts)
 */
export class LocalStorageAuditLogRepository implements IAuditLogRepository {
  async getById(id: string): Promise<AuditLog | null> {
    const list = storage.getAuditLogs();
    return list.find((l) => l.id === id) || null;
  }

  async getAll(filters?: AuditLogFilterParams): Promise<AuditLog[]> {
    let list = storage.getAuditLogs();
    if (filters) {
      list = list.filter((l) => {
        if (filters.userId && l.userId !== filters.userId) return false;
        if (
          filters.userName &&
          !l.userName?.toLowerCase().includes(filters.userName.toLowerCase())
        )
          return false;
        if (filters.module && l.module !== filters.module) return false;
        if (filters.result && l.result !== filters.result) return false;
        if (filters.entityType && l.entityType !== filters.entityType)
          return false;
        if (filters.searchQuery) {
          const q = filters.searchQuery.toLowerCase().trim();
          const matchesAction = l.action && l.action.toLowerCase().includes(q);
          const matchesDetails = l.details && l.details.toLowerCase().includes(q);
          const matchesUser = l.userName && l.userName.toLowerCase().includes(q);
          if (!matchesAction && !matchesDetails && !matchesUser) return false;
        }
        return true;
      });
    }
    return list;
  }

  async query(
    filters?: AuditLogFilterParams,
    sort?: SortParams<keyof AuditLog>,
    pagination?: PaginationParams
  ): Promise<PaginatedResult<AuditLog>> {
    let list = await this.getAll(filters);

    if (sort) {
      list = [...list].sort((a, b) => {
        const valA = (a as any)[sort.field] ?? "";
        const valB = (b as any)[sort.field] ?? "";
        if (valA < valB) return sort.order === "asc" ? -1 : 1;
        if (valA > valB) return sort.order === "asc" ? 1 : -1;
        return 0;
      });
    }

    return applyPagination(list, pagination);
  }

  async count(filters?: AuditLogFilterParams): Promise<number> {
    const list = await this.getAll(filters);
    return list.length;
  }

  async log(
    userName: string | undefined,
    action: string,
    module: string,
    targetId?: string,
    details?: string,
    options?: {
      userId?: string;
      userName?: string;
      userRole?: string;
      result?: "success" | "denied" | "error";
      entityType?: string;
      entityId?: string;
    }
  ): Promise<AuditLog> {
    storage.logAction(userName, action, module, targetId, details, options);
    const logs = storage.getAuditLogs();
    return (
      logs[0] || {
        id: `audit-${Date.now()}`,
        timestamp: new Date().toISOString(),
        userName: userName || "نظام",
        userId: options?.userId || "",
        action,
        module,
        targetEntity: module,
      }
    );
  }

  async clear(): Promise<boolean> {
    storage.clearAuditLogs();
    return true;
  }
}

/**
 * LocalStorage Adapter for Subjects
 */
export class LocalStorageSubjectRepository implements ISubjectRepository {
  async getAll(): Promise<Subject[]> {
    return storage.getSubjects();
  }
  async getById(id: string): Promise<Subject | null> {
    const list = storage.getSubjects();
    return list.find((s) => s.id === id) || null;
  }
  async save(subject: Subject): Promise<Subject> {
    storage.saveSubject(subject);
    return subject;
  }
  async delete(id: string): Promise<boolean> {
    storage.deleteSubject(id);
    return true;
  }
}

/**
 * LocalStorage Adapter for Units
 */
export class LocalStorageUnitRepository implements IUnitRepository {
  async getAll(): Promise<Unit[]> {
    return storage.getUnits();
  }
  async getBySubjectId(subjectId: string): Promise<Unit[]> {
    const list = storage.getUnits();
    return list.filter((u) => u.subjectId === subjectId);
  }
  async getById(id: string): Promise<Unit | null> {
    const list = storage.getUnits();
    return list.find((u) => u.id === id) || null;
  }
  async save(unit: Unit): Promise<Unit> {
    storage.saveUnit(unit);
    return unit;
  }
  async delete(id: string): Promise<boolean> {
    storage.deleteUnit(id);
    return true;
  }
}

/**
 * LocalStorage Adapter for Lessons
 */
export class LocalStorageLessonRepository implements ILessonRepository {
  async getAll(): Promise<Lesson[]> {
    return storage.getLessons();
  }
  async getByUnitId(unitId: string): Promise<Lesson[]> {
    const list = storage.getLessons();
    return list.filter((l) => l.unitId === unitId);
  }
  async getBySubjectId(subjectId: string): Promise<Lesson[]> {
    const list = storage.getLessons();
    return list.filter((l) => l.subjectId === subjectId);
  }
  async getById(id: string): Promise<Lesson | null> {
    const list = storage.getLessons();
    return list.find((l) => l.id === id) || null;
  }
  async save(lesson: Lesson): Promise<Lesson> {
    storage.saveLesson(lesson);
    return lesson;
  }
  async delete(id: string): Promise<boolean> {
    storage.deleteLesson(id);
    return true;
  }
}

/**
 * LocalStorage Adapter for Users
 */
export class LocalStorageUserRepository implements IUserRepository {
  async getAll(): Promise<User[]> {
    return storage.getUsers();
  }
  async getById(id: string): Promise<User | null> {
    const list = storage.getUsers();
    return list.find((u) => u.id === id) || null;
  }
  async save(user: User): Promise<User> {
    storage.saveUser(user);
    return user;
  }
  async delete(id: string): Promise<boolean> {
    storage.deleteUser(id);
    return true;
  }
  async getCurrentUser(): Promise<User> {
    return storage.getCurrentUser();
  }
  async setCurrentUser(user: User): Promise<void> {
    storage.setCurrentUser(user);
  }
}

/**
 * LocalStorage Adapter for Settings
 */
export class LocalStorageSettingsRepository implements ISettingsRepository {
  async getSettings(): Promise<SystemSettings> {
    return storage.getSettings();
  }
  async saveSettings(settings: SystemSettings): Promise<SystemSettings> {
    storage.saveSettings(settings);
    return settings;
  }
}
