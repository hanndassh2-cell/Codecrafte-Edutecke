import {
  Question,
  QuestionType,
  Exam,
  AuditLog,
  Subject,
  Unit,
  Lesson,
  User,
  SystemSettings,
  PrintTemplate,
  ExamTemplate,
  Cycle,
} from "../types";

/**
 * Standard Pagination parameters
 */
export interface PaginationParams {
  page?: number;     // 1-indexed (default: 1)
  pageSize?: number; // Items per page (default: 20)
  limit?: number;    // Alternative to pageSize
  offset?: number;   // Alternative to page/pageSize calculation
}

/**
 * Standard Sorting parameters
 */
export interface SortParams<T = string> {
  field: T;
  order: "asc" | "desc";
}

/**
 * Scale-ready Paginated Query Result
 */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
}

/**
 * Filter parameters for Question querying
 */
export interface QuestionFilterParams {
  subjectId?: string;
  unitId?: string;
  lessonId?: string;
  type?: QuestionType | string;
  difficulty?: "easy" | "medium" | "hard";
  importance?: number;
  status?: "active" | "archived" | "requires_review" | "uncategorized";
  searchQuery?: string;
  isArchived?: boolean;
  allowedSubjectIds?: string[]; // For RBAC filtering at query level
}

/**
 * Aggregated Question Statistics
 */
export interface QuestionStats {
  totalCount: number;
  activeCount: number;
  archivedCount: number;
  requiresReviewCount: number;
  uncategorizedCount: number;
  byType: Record<string, number>;
  byDifficulty: Record<string, number>;
  bySubject: Record<string, number>;
}

/**
 * Question Repository Interface (Contract)
 */
export interface IQuestionRepository {
  getById(id: string): Promise<Question | null>;
  getAll(filters?: QuestionFilterParams): Promise<Question[]>;
  create(question: Omit<Question, "id"> | Question): Promise<Question>;
  update(id: string, partial: Partial<Question>): Promise<Question>;
  delete(id: string): Promise<boolean>;
  query(
    filters?: QuestionFilterParams,
    sort?: SortParams<keyof Question>,
    pagination?: PaginationParams
  ): Promise<PaginatedResult<Question>>;
  count(filters?: QuestionFilterParams): Promise<number>;
  getStats(filters?: QuestionFilterParams): Promise<QuestionStats>;
  batchUpdateImportance(ids: string[], importance: 1 | 2 | 3 | 4 | 5): Promise<number>;
  batchArchive(ids: string[]): Promise<number>;
  batchRestore(ids: string[]): Promise<number>;
  transferQuestions(
    ids: string[],
    targetSubjectId: string,
    targetUnitId: string,
    targetLessonId: string
  ): Promise<number>;
}

/**
 * Filter parameters for Exam querying
 */
export interface ExamFilterParams {
  subjectId?: string;
  term?: string;
  academicYear?: string;
  searchQuery?: string;
  allowedSubjectIds?: string[];
}

/**
 * Exam Repository Interface (Contract)
 */
export interface IExamRepository {
  getById(id: string): Promise<Exam | null>;
  getAll(filters?: ExamFilterParams): Promise<Exam[]>;
  create(exam: Exam): Promise<Exam>;
  update(id: string, partial: Partial<Exam>): Promise<Exam>;
  delete(id: string): Promise<boolean>;
  query(
    filters?: ExamFilterParams,
    sort?: SortParams<keyof Exam>,
    pagination?: PaginationParams
  ): Promise<PaginatedResult<Exam>>;
  count(filters?: ExamFilterParams): Promise<number>;
}

/**
 * Filter parameters for Audit Log querying
 */
export interface AuditLogFilterParams {
  userId?: string;
  userName?: string;
  userRole?: string;
  module?: string;
  result?: "success" | "denied" | "error" | string;
  searchQuery?: string;
  entityType?: string;
}

/**
 * Audit Log Repository Interface (Contract)
 */
export interface IAuditLogRepository {
  getById(id: string): Promise<AuditLog | null>;
  getAll(filters?: AuditLogFilterParams): Promise<AuditLog[]>;
  query(
    filters?: AuditLogFilterParams,
    sort?: SortParams<keyof AuditLog>,
    pagination?: PaginationParams
  ): Promise<PaginatedResult<AuditLog>>;
  count(filters?: AuditLogFilterParams): Promise<number>;
  log(
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
  ): Promise<AuditLog>;
  clear(): Promise<boolean>;
}

/**
 * Generic Entity Repositories
 */
export interface ISubjectRepository {
  getAll(): Promise<Subject[]>;
  getById(id: string): Promise<Subject | null>;
  save(subject: Subject): Promise<Subject>;
  delete(id: string): Promise<boolean>;
}

export interface IUnitRepository {
  getAll(): Promise<Unit[]>;
  getBySubjectId(subjectId: string): Promise<Unit[]>;
  getById(id: string): Promise<Unit | null>;
  save(unit: Unit): Promise<Unit>;
  delete(id: string): Promise<boolean>;
}

export interface ILessonRepository {
  getAll(): Promise<Lesson[]>;
  getByUnitId(unitId: string): Promise<Lesson[]>;
  getBySubjectId(subjectId: string): Promise<Lesson[]>;
  getById(id: string): Promise<Lesson | null>;
  save(lesson: Lesson): Promise<Lesson>;
  delete(id: string): Promise<boolean>;
}

export interface IUserRepository {
  getAll(): Promise<User[]>;
  getById(id: string): Promise<User | null>;
  save(user: User): Promise<User>;
  delete(id: string): Promise<boolean>;
  getCurrentUser(): Promise<User>;
  setCurrentUser(user: User): Promise<void>;
}

export interface ISettingsRepository {
  getSettings(): Promise<SystemSettings>;
  saveSettings(settings: SystemSettings): Promise<SystemSettings>;
}

/**
 * Unified Repositories Registry Interface
 */
export interface IRepositories {
  questions: IQuestionRepository;
  exams: IExamRepository;
  auditLogs: IAuditLogRepository;
  subjects: ISubjectRepository;
  units: IUnitRepository;
  lessons: ILessonRepository;
  users: IUserRepository;
  settings: ISettingsRepository;
}
