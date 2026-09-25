export type SubjectColor =
  "red" | "green" | "blue" | "purple" | "amber" | "indigo";

export type QuestionType =
  | "intro" // 1. مقدّمة
  | "main_idea" // 2. فكرة رئيسية
  | "note" // 3. ملاحظة
  | "definition" // 4. تعريف
  | "explain" // 5. اشرح / وضّح
  | "reason" // 6. علّل / فسّر
  | "true_false" // 7. صح أو خطأ
  | "mcq" // 8. اختر الإجابة الصحيحة
  | "problem" // 9. مسألة حسابية / تطبيقية
  | "fill_blanks" // 10. أكمل الفراغات
  | "diagram_label" // 11. سمِّ الأرقام/الأجزاء على الشكل
  | "table_query" // 12. إدراج جدول والسؤال عنه
  | "matching" // 13. التوصيل
  | "ordering" // 14. الترتيب التسلسلي
  | "image_choice" // 15. الاختيار من صورة/شكل
  | "equation" // 16. معادلة / موازنة
  | "grammar" // 17. قواعد اللغة والإعراب
  | "listening" // 18. استماع وفهم
  | "essay" // 19. مقالي / إنشائي
  | "custom"; // 20. نوع مخصص

export interface Subject {
  id: string;
  code: string;
  name: string;
  color: string; // e.g. '#2563eb' (Blue), '#059669' (Green), '#dc2626' (Red)
  icon: string;
  description: string;
  status: "active" | "archived";
  progressPercentage?: number;
  totalMarks?: number;
}

export interface Unit {
  id: string;
  subjectId: string;
  code: string;
  title: string;
  description: string;
  orderIndex: number;
  status: "active" | "archived";
}

export interface CardItem {
  id: string;
  title?: string;
  text: string;
  answer?: string;
  duration?: string;
  tools?: string;
  steps?: string;
  type?: string;
  isVisible?: boolean;
  hideAnswer?: boolean;
  [key: string]: any;
}

export interface Lesson {
  lineSpacing?: number;
  id: string;
  unitId: string;
  subjectId: string;
  title: string;
  code?: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  orderIndex: number;
  durationMinutes: number;
  objectives: string[];
  status:
    | "draft"
    | "review"
    | "approved"
    | "archived"
    | "completed"
    | "in_progress"
    | "in-progress";
  defaultTemplateId?: string;
  groupingEnabled?: boolean;
  groupingColumns?: "auto" | "1" | "2" | "3" | "4";
  groupingNumberingStyle?: "isolated" | "continuous" | "none" | "paren-num" | "paren-alpha" | "arabic-abjad";
  groupingDensity?: "compact" | "normal" | "spacious";
  contentParagraphs?: {
    id: string;
    title: string;
    body: string;
    type: string;
    isVisible?: boolean;
    customColor?: string;
    items?: CardItem[];
    style?: {
      fontFamily?: string;
      fontSize?: string;
      color?: string;
      multiColorLines?: boolean;
      bodyFontFamily?: string;
      bodyFontSize?: string;
        };
    [key: string]: any;
  }[];
  questionIds?: string[];
}


export interface BookReference {
  bookSource: string;
  pageNumber: string;
  questionTitle: string;
  exerciseNumber: string;
  showInCard: boolean;
  showInPrint: boolean;
}

export interface Distractor {
  id: string;
  text: string;
  isCorrect: boolean;
  rationale?: string;
}

export interface Question {
  lineSpacing?: number;
  id: string;
  subjectId: string;
  unitId: string;
  lessonId: string;
  subjectName?: string;
  unitTitle?: string;
  lessonTitle?: string;
  type: QuestionType;
  customTypeName?: string;
  text: string;
  answer: string;
  isVisible?: boolean;
  hideAnswer?: boolean;
  score?: number;
  marks?: number;
  grade?: string;
  term?: string;
  difficulty: "easy" | "medium" | "hard";
  importance: 1 | 2 | 3 | 4 | 5; // 1 to 5 scale
  status?: "active" | "archived" | "requires_review" | "uncategorized";
  isArchived?: boolean; // Soft delete flag
  archivedAt?: string; // Soft delete timestamp
  complianceReason?: string; // Reason if requires_review or uncategorized
  originalLessonId?: string;
  tags: string[];
  isPastCycle: boolean;
  pastCyclesInfo?: string; // e.g. "دورة 2024 الفصل الأول"
  occurrencesCount: number; // calculated from archive
  futureProbability: number; // 0 to 100%
  lastUsedDate?: string;
  finalWeightScore: number; // f(importance, recurrence, futureProb, recency)
  cardColor?: string;
  distractors?: Distractor[];
  matchingPairs?: { left: string; right: string }[];
  sequenceItems?: string[];
  imageUrl?: string;
  audioUrl?: string;
  author?: string;
  lessonIds?: string[];
  structuredPayload?: string; // Unified JSON payload for the question
  createdAt: string;
  updatedAt?: string;
  bookReference?: BookReference;
}

export interface MarginsCm {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface PrintTemplate {
  id: string;
  name: string;
  type: "lesson" | "exam" | "report";
  orientation: "portrait" | "landscape";
  marginsCm: MarginsCm;
  headerContent: {
    schoolName: string;
    logoUrl?: string;
    centerLogo?: boolean;
    showHijriDate: boolean;
    showGregorianDate: boolean;
    subjectName: string;
    customText?: string;
    rightText?: string;
    centerText?: string;
    leftText?: string;
    differentFirstPage?: boolean;
  };
  footerContent: {
    teacherName: string;
    showPageNumber: boolean;
    copyrightNotice: string;
    showEndOfQuestionsMarker?: boolean;
    pageNumberSettings?: {
      fontFamily?: string;
      fontSize?: number;
      color?: string;
      align?: "right" | "center" | "left";
      bold?: boolean;
    };
  };
  typography?: {
    fontFamily: string;
    baseFontSize: number;
    headingSize: number;
    studentBoxFontSize?: number;
    questionFontSize?: number;
    optionsFontSize?: number;
    marksFontSize?: number;
    questionSpacing?: number;
    cardSpacing?: number;
    cardPadding?: number;
    lineSpacing?: number;
    lineHeight?: number | string;
    cardDisplayMode?: "normal" | "compact" | "textbook";
    questionBlockSpacing?: number;
    questionOptionSpacing?: number;
    elementSpacing?: number;
  };
  watermark?: {
    enabled: boolean;
    type: "text" | "image";
    text: string;
    opacity: number;
    orientation: "diagonal" | "horizontal";
    color?: string;
    fontFamily?: string;
    fontSize?: number;
    fitToPage?: boolean;
    layer?: "above" | "below";
  };
  sideText?: {
    right?: {
      text: string;
      direction: "top-to-bottom" | "bottom-to-top";
      fontFamily?: string;
      fontSize?: string;
      color?: string;
      margin?: string;
      align?: "start" | "center" | "end";
      enabled?: boolean;
    };
    left?: {
      text: string;
      direction: "top-to-bottom" | "bottom-to-top";
      fontFamily?: string;
      fontSize?: string;
      color?: string;
      margin?: string;
      align?: "start" | "center" | "end";
      enabled?: boolean;
    };
  };
  isDefault: boolean;
}

export interface ExamTemplate {
  id: string;
  name: string;
  subjectId: string;
  headerTitle: string;
  studentFields: {
    name: boolean;
    grade: boolean;
    section: boolean;
    studentId: boolean;
    date: boolean;
    timeAllowed: boolean;
  };
  showGradesTable: boolean;
  instructions: string[];
  sections: {
    id: string;
    title: string;
    questionType: QuestionType;
    weightPercentage: number;
  }[];
}

export interface ExamQuestionEntry {
  id?: string;
  questionId: string;
  allocatedMarks: number;
  sectionId?: string;
  questionOrder: number;
  shuffledDistractors?: string[];
  type?: QuestionType;
  score?: number;
  isVisible?: boolean;
  hideAnswer?: boolean;
}

export interface ExamVersion {
  versionCode: string; // "أ", "ب", "ج"
  questions: ExamQuestionEntry[];
  sections?: any[];
}

export interface ExamScope {
  subjectId: string;
  unitIds?: string[];
  lessonIds?: string[];
  isComprehensive?: boolean; // Comprehensive final exam across all units
}

export interface QuestionSnapshot {
  lineSpacing?: number;
  questionId: string;
  sectionId?: string;
  questionType: QuestionType;
  customTypeName?: string;
  text: string;
  answer: string;
  allocatedMarks: number;
  difficulty: "easy" | "medium" | "hard";
  distractors?: Distractor[];
  matchingPairs?: { left: string; right: string }[];
  sequenceItems?: string[];
  imageUrl?: string;
  audioUrl?: string;
  snapshotTimestamp: string;
  originalBankVersionHash?: string;
  bookReference?: BookReference;
}

export interface ExamLibraryDocument {
  durationMinutes?: number;
  examId: string; // Unique ID in Exams_Library
  title: string;
  scope: ExamScope;
  generationMethod: "auto" | "semi" | "manual";
  usedQuestionIds: string[]; // Set of question IDs included for uniqueness and capacity deduction
  questionSnapshots: QuestionSnapshot[]; // Full frozen snapshot of question data to avoid data corruption
  sections?: any[];
  totalQuestions: number;
  totalMarks: number;
  versionsCount?: number;
  versions?: ExamVersion[];
  status: "draft" | "published" | "archived";
  printTemplate?: PrintTemplate;
  showStudentBox?: boolean;
  showInstructions?: boolean;
  instructionsText?: string;
  showGradingTable?: boolean;
  createdAt: string;
  updatedAt: string;
  createdById: string;
  createdByName?: string;
}

export type QuestionIntegrityStatus = "intact" | "modified" | "archived";

export interface QuestionIntegrityItem {
  questionId: string;
  snapshot: QuestionSnapshot;
  status: QuestionIntegrityStatus;
  currentBankQuestion?: Question;
  diffSummary?: string;
}

export interface ExamIntegrityReport {
  examId: string;
  examTitle: string;
  hasWarnings: boolean;
  intactCount: number;
  modifiedCount: number;
  archivedCount: number;
  items: QuestionIntegrityItem[];
}

export interface Exam {
  durationMinutes?: number;
  id: string;
  title: string;
  subjectId: string;
  educationalLevel?: string;
  semester?: string;
  cycleId?: string;
  unitIds: string[];
  lessonIds: string[];
  totalQuestions: number;
  totalMarks: number;
  difficultyProfile: "easy" | "medium" | "hard" | "balanced";
  generationType: "auto" | "semi_auto" | "manual";
  versions: ExamVersion[];
  pedagogicalRationale?: string;
  createdAt: string;
  createdBy: string;
  status: "draft" | "finalized" | "archived";
  templateId?: string;
  // Link to library document if persisted in Exams_Library
  libraryDoc?: ExamLibraryDocument;
}

export interface Cycle {
  id: string;
  name: string; // e.g. "الفصل الدراسي الأول 2025/2026"
  academicYear: string;
  startDate: string;
  endDate: string;
  status: "active" | "archived";
  examIds: string[];
}

export type UserRole =
  "admin" | "supervisor" | "teacher" | "reviewer" | "viewer";

export interface UserPermissions {
  curriculum: boolean;
  lessons: boolean;
  questions: boolean;
  exams: boolean;
  exports: boolean;
  reports: boolean;
  users: boolean;
  settings: boolean;
}

export interface User {
  id: string;
  name: string;
  username?: string;
  email: string;
  password?: string;
  passwordHash?: string;
  passwordSalt?: string;
  passwordIterations?: number;
  passwordAlgorithm?: string;
  role: UserRole;
  allowedSubjectIds: string[];
  status: "active" | "disabled";
  avatar?: string;
  permissions?: UserPermissions;
  lastLoginAt?: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userRole?: string;
  action: string; // e.g. "إضافة سؤال جديد", "توليد امتحان"
  targetEntity: string; // "الأسئلة", "الامتحانات"
  targetEntityId?: string;
  entityType?: string;
  entityId?: string;
  module?: string;
  timestamp: string;
  result?: "success" | "denied" | "error";
  details?: string;
}

export interface SystemSettings {
  language?: "ar" | "en";
  academyName?: string;
  logoUrl?: string;
  managerName?: string;
  email?: string;
  academyInfo?: string;
  primaryContactNumber?: string;
  additionalContactNumber?: string;
  address?: string;
  currency?: string;
  primaryColorHex: string;
  secondaryColorHex: string;
  accentColorHex: string;
  themeMode: "light" | "dark" | "system";
  themePreset?: "light" | "dark" | "classic_blue" | "emerald_green" | "warm_professional";
  syncWithOs?: boolean;
  licenseKey: string;
  licenseStatus: "active" | "trial" | "expired";
  trialDaysLeft: number;
  autoBackupIntervalDays: number;
  lastBackupDate?: string;
  autoBackupEnabled?: boolean;
  autoBackupFrequency?: "daily" | "weekly" | "monthly";
  autoBackupTime?: string;
  autoBackupFolder?: string;
  subtextBelowLogo?: string;
  reportFooter?: string;
}
