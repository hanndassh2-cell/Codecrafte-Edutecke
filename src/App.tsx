import React, { useState, useEffect, useRef, useCallback } from "react";
import { GlobalContextMenu } from "./components/GlobalContextMenu";
import { SelfHealingToast } from "./components/SelfHealingToast";
import { Header } from "./layouts/Header";
import { Sidebar } from "./layouts/Sidebar";

import { DashboardView } from "./modules/dashboard/pages/DashboardView";
import { CurriculumTreeView, CurriculumNavigationState } from "./modules/curriculum/pages/CurriculumTreeView";
import { LessonEditorView } from "./modules/lessons/pages/LessonEditorView";
import { QuestionBankView } from "./modules/questions/pages/QuestionBankView";
import { ExamGeneratorView } from "./modules/exams/pages/ExamGeneratorView";
import { ExamsLibraryView } from "./modules/exams/pages/ExamsLibraryView";
import { UserCredentialsPermissionsView } from "./modules/users/pages/UserCredentialsPermissionsView";
import { SettingsView } from "./modules/settings/pages/SettingsView";
import { HelpSupportView } from "./modules/settings/pages/HelpSupportView";
import { LoginView } from "./modules/users/pages/LoginView";
import { SplashView } from "./layouts/SplashView";
import { AiSettingsModal } from "./modules/ai/components/AiSettingsModal";
import { CentralGovernanceModal } from "./components/CentralGovernanceModal";
import { BackupExportPreviewModal } from "./components/BackupExportPreviewModal";
import {
  inspectExportPayload,
  triggerBackupDownload,
  ArabicExportInspection,
} from "./utils/arabicExportUtils";
import { DiagnosticConsole } from "./components/DiagnosticConsole";
import { AccessDeniedView } from "./components/AccessDeniedView";
import {
  canAccessModule,
  canPerformAction,
  canAccessSubject,
  filterAllowedSubjects,
  filterAllowedItemsBySubject,
} from "./services/rbacEngine";

import { storage } from "./services/storage";
import { repositories } from "./repositories";
import { examLibraryService } from "./services/examLibraryService";
import { validateCurriculumContext } from "./utils/curriculumValidator";
import {
  Subject,
  Unit,
  Lesson,
  Question,
  PrintTemplate,
  ExamTemplate,
  Exam,
  Cycle,
  User,
  AuditLog,
  SystemSettings,
  ExamLibraryDocument,
} from "./types";

import { UIIntegrityMonitor } from "./components/UIIntegrityMonitor";
import { applyGlobalTheme } from "./services/themeEngine";

export function App() {
  // Navigation
  const [isLoaded, setIsLoaded] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const checkSession = useCallback((): boolean => {
    try {
      const sessionStr =
        localStorage.getItem("edutech_session") ||
        sessionStorage.getItem("edutech_session");
      if (sessionStr) {
        const session = JSON.parse(sessionStr);
        if (session.expiresAt && new Date(session.expiresAt) > new Date()) {
          if (session.userId) {
            const allUsers = storage.getUsers();
            const userInDb = allUsers.find((u) => u.id === session.userId);
            if (!userInDb || userInDb.status === "disabled") {
              localStorage.removeItem("edutech_session");
              sessionStorage.removeItem("edutech_session");
              return false;
            }
          }
          return true;
        } else {
          localStorage.removeItem("edutech_session");
          sessionStorage.removeItem("edutech_session");
        }
      }
    } catch (e) {}
    return false;
  }, []);

  const [isAuthenticated, setIsAuthenticated] = useState(checkSession);
  const [currentUser, setCurrentUser] = useState<User>(() =>
    storage.getCurrentUser(),
  );

  // Keep active session and user permissions strictly in sync with storage & session state
  useEffect(() => {
    if (!isAuthenticated) return;

    const syncUserAndSession = () => {
      const isValidSess = checkSession();
      if (!isValidSess) {
        setIsAuthenticated(false);
        localStorage.removeItem("edutech_session");
        sessionStorage.removeItem("edutech_session");
        return;
      }

      const freshUser = storage.getCurrentUser();
      if (!freshUser || freshUser.status === "disabled") {
        setIsAuthenticated(false);
        localStorage.removeItem("edutech_session");
        sessionStorage.removeItem("edutech_session");
        storage.logAction(
          currentUser?.name,
          "إنهاء الجلسة التلقائي",
          "المصادقة",
          currentUser?.id,
          "تم إلغاء الجلسة بسبب تعطيل الحساب أو حذفه",
          { result: "denied" }
        );
        return;
      }

      if (JSON.stringify(freshUser) !== JSON.stringify(currentUser)) {
        setCurrentUser(freshUser);
      }
    };

    syncUserAndSession();
    const timer = setInterval(syncUserAndSession, 1000);
    window.addEventListener("storage", syncUserAndSession);
    return () => {
      clearInterval(timer);
      window.removeEventListener("storage", syncUserAndSession);
    };
  }, [isAuthenticated, currentUser, checkSession]);

  const handleLogin = (rememberMe: boolean, loggedInUser?: User) => {
    setIsAuthenticated(true);
    
    // 2 hours for standard session, 30 days for remember me
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + (rememberMe ? 24 * 30 : 2));
    const sessionObj = JSON.stringify({ token: "token_" + Date.now(), expiresAt: expiresAt.toISOString(), userId: loggedInUser?.id });

    if (loggedInUser) {
      setCurrentUser(loggedInUser);
    }
    if (rememberMe) {
      localStorage.setItem("edutech_session", sessionObj);
    } else {
      sessionStorage.setItem("edutech_session", sessionObj);
    }
  };

  const handleLogout = () => {
    storage.logAction(
      currentUser?.name,
      "تسجيل خروج",
      "المصادقة والمستخدمين",
      currentUser?.id,
      "تسجيل خروج ناجح وإغلاق الجلسة الكامل",
      {
        userId: currentUser?.id,
        userName: currentUser?.name,
        userRole: currentUser?.role,
        result: "success",
        entityType: "المصادقة",
      }
    );
    setIsAuthenticated(false);
    localStorage.removeItem("edutech_session");
    sessionStorage.removeItem("edutech_session");
  };
  const appSavedUi = React.useMemo(() => storage.getUiState("app_shell_ui", {
    activeTab: "dashboard",
    isSidebarCollapsed: false,
  }), []);

  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [tabCounter, setTabCounter] = useState<Record<string, number>>({});
  const [questionBankInitialTab, setQuestionBankInitialTab] = useState<string | null>(null);
  const [questionBankInitialAction, setQuestionBankInitialAction] = useState<string | null>(null);
  const [questionBankFilters, setQuestionBankFilters] = useState<{
    subjectId?: string;
    unitId?: string;
    lessonId?: string;
  } | null>(null);
  const curriculumNavigation = useRef<CurriculumNavigationState>({});
  const [lessonEntryView, setLessonEntryView] = useState<'outline' | 'preview'>('outline');
  const [selectedLessonId, setSelectedLessonId] = useState<
    string | undefined
  >();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(appSavedUi.isSidebarCollapsed ?? false);
  const [showAiSettings, setShowAiSettings] = useState<boolean>(false);
  const [showGovernanceModal, setShowGovernanceModal] = useState<boolean>(false);
  const [backupPreviewData, setBackupPreviewData] = useState<{
    isOpen: boolean;
    jsonString: string;
    inspection: ArabicExportInspection;
  } | null>(null);
  const [examToEdit, setExamToEdit] = useState<ExamLibraryDocument | null>(null);
  const mainContentRef = useRef<HTMLElement>(null);

  // Unified navigation handler to reset transient UI states and scroll positions
  const handleNavigateToTab = useCallback((tab: string) => {
    if (!canAccessModule(currentUser, tab)) {
      alert("عفواً، حسابك الحالي لا يمتلك الصلاحية للوصول إلى هذا التبويب.");
      return;
    }
    setActiveTab((prevTab) => {
      if (prevTab !== tab) {
        // Increment key counter to force fresh clean mount in default UI state
        setTabCounter((prev) => ({ ...prev, [tab]: (prev[tab] || 0) + 1 }));
        
        // Clear transient navigation artifacts when leaving previous views
        if (prevTab === "exams") {
          setExamToEdit(null);
        }
        if (prevTab === "lessons" && tab !== "lessons") {
          setSelectedLessonId(undefined);
        }
      }
      return tab;
    });

    // Reset scroll positions immediately
    if (mainContentRef.current) {
      mainContentRef.current.scrollTop = 0;
    }
    if (typeof window !== "undefined") {
      window.scrollTo(0, 0);
    }
  }, [currentUser]);

  // Scroll reset whenever activeTab changes
  useEffect(() => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTop = 0;
    }
    if (typeof window !== "undefined") {
      window.scrollTo(0, 0);
    }
  }, [activeTab]);

  useEffect(() => {
    storage.saveUiState("app_shell_ui", {
      activeTab,
      isSidebarCollapsed,
    });
  }, [activeTab, isSidebarCollapsed]);

  // Application Dynamic State
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [printTemplates, setPrintTemplates] = useState<PrintTemplate[]>([]);
  const [examTemplates, setExamTemplates] = useState<ExamTemplate[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [settings, setSettings] = useState<SystemSettings>(
    storage.getSettings(),
  );

  const curriculumLoadRequest = useRef(0);
  const [curriculumLoading, setCurriculumLoading] = useState(true);
  const [curriculumError, setCurriculumError] = useState<string | null>(null);

  // Load via Repository Layer
  const refreshAllState = async () => {
    const request = ++curriculumLoadRequest.current;
    setCurriculumLoading(true);
    setCurriculumError(null);
    try {
      const [subs, uns, les, qs, exm, ulist, logs, stg] = await Promise.all([
        repositories.subjects.getAll(),
        repositories.units.getAll(),
        repositories.lessons.getAll(),
        repositories.questions.getAll(),
        repositories.exams.getAll(),
        repositories.users.getAll(),
        repositories.auditLogs.getAll(),
        repositories.settings.getSettings(),
      ]);
      if (request !== curriculumLoadRequest.current) return;
      setSubjects(subs);
      setUnits(uns);
      setLessons(les);
      setQuestions(qs);
      setExams(exm);
      setUsers(ulist);
      setAuditLogs(logs);
      setSettings(stg);
      setPrintTemplates(storage.getPrintTemplates());
      setExamTemplates(storage.getExamTemplates());
      setCycles(storage.getCycles());
      setCurrentUser(storage.getCurrentUser());
    } catch {
      if (request === curriculumLoadRequest.current) setCurriculumError("تعذر تحميل بيانات المناهج. أعد المحاولة.");
    } finally {
      if (request === curriculumLoadRequest.current) setCurriculumLoading(false);
    }
  };

  useEffect(() => {
    storage.initialize();
    refreshAllState();
    setIsLoaded(true);
  }, []);

  // Auto-collapse main sidebar in lesson editor and refresh state when switching tabs
  useEffect(() => {
    refreshAllState();
    if (activeTab === "lessons") {
      setIsSidebarCollapsed(true);
    }
  }, [activeTab]);

  // Theme Mode effect on body HTML tag
  useEffect(() => {
    const handleCustomNav = (e: any) => {
      if (e.detail) handleNavigateToTab(e.detail);
    };
    const handleOpenAiSettings = () => setShowAiSettings(true);
    const handleOpenGovernance = () => setShowGovernanceModal(true);
    const handleRefreshState = () => refreshAllState();
    const handleOpenExamEdit = (e: any) => {
      const examId = typeof e.detail === "string" ? e.detail : e.detail?.examId;
      if (examId) {
        const found = storage.getExams().find((ex) => ex.id === examId) ||
          examLibraryService.getExamById(examId);
        if (found) {
          setExamToEdit(found as any);
          handleNavigateToTab("exams");
          setShowGovernanceModal(false);
        }
      }
    };

    window.addEventListener("navigate-tab", handleCustomNav);
    window.addEventListener("open-ai-settings", handleOpenAiSettings);
    window.addEventListener("open-central-governance", handleOpenGovernance);
    window.addEventListener("open-exam-edit", handleOpenExamEdit);
    window.addEventListener("refresh-data-all", handleRefreshState);
    window.addEventListener("refresh-data-edutech_settings_v1", handleRefreshState);
    window.addEventListener("storage-change", handleRefreshState);

    return () => {
      window.removeEventListener("navigate-tab", handleCustomNav);
      window.removeEventListener("open-ai-settings", handleOpenAiSettings);
      window.removeEventListener("open-central-governance", handleOpenGovernance);
      window.removeEventListener("open-exam-edit", handleOpenExamEdit);
      window.removeEventListener("refresh-data-all", handleRefreshState);
      window.removeEventListener("refresh-data-edutech_settings_v1", handleRefreshState);
      window.removeEventListener("storage-change", handleRefreshState);
    };
  }, [handleNavigateToTab]);

  useEffect(() => {
    applyGlobalTheme(settings);

    if (settings.themeMode === "system" || settings.syncWithOs) {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const listener = () => applyGlobalTheme(settings);
      mediaQuery.addEventListener("change", listener);
      return () => mediaQuery.removeEventListener("change", listener);
    }
  }, [
    settings.themeMode,
    settings.themePreset,
    settings.syncWithOs,
    settings.primaryColorHex,
    settings.secondaryColorHex,
    settings.accentColorHex,
  ]);

  // Handlers
  const handleToggleTheme = () => {
    const nextMode =
      settings.themeMode === "dark"
        ? "light"
        : settings.themeMode === "light"
          ? "system"
          : "dark";
    const nextPreset = nextMode === "dark" ? "dark" : "light";
    const nextSettings = {
      ...settings,
      themeMode: nextMode as any,
      themePreset: nextPreset as any,
      syncWithOs: nextMode === "system",
    };
    storage.saveSettings(nextSettings);
    setSettings(nextSettings);
  };

  const handleOpenLessonEditor = (lessonId: string) => {
    const lesson = lessons.find((item) => item.id === lessonId);
    if (!lesson) {
      alert("تعذر فتح الدرس لأنه لم يعد موجوداً. حدّث البيانات ثم حاول مرة أخرى.");
      return;
    }
    if (!canPerformAction(currentUser, "edit", "lessons") || !canAccessSubject(currentUser, lesson.subjectId)) {
      alert("عفواً، ليس لديك صلاحية لتحرير هذا الدرس.");
      return;
    }
    setLessonEntryView("outline");
    setSelectedLessonId(lessonId);
    setActiveTab("lessons");
  };


  const handleOpenLessonPreview = (lessonId: string) => {
    const lesson = lessons.find(item => item.id === lessonId);
    if (!lesson || !canAccessSubject(currentUser, lesson.subjectId) || !canAccessModule(currentUser, "lessons")) {
      alert("تعذر فتح معاينة هذا الدرس. تحقق من وجوده وصلاحية الوصول إليه."); return;
    }
    setLessonEntryView('preview'); setSelectedLessonId(lessonId); setActiveTab('lessons');
  };

  // CRUD Handlers with RBAC Enforcement
  const handleSaveSubject = (s: Subject) => {
    const isEdit = subjects.some((existing) => existing.id === s.id);
    if (!canPerformAction(currentUser, isEdit ? "edit" : "create", "curriculum") || !canAccessSubject(currentUser, s.id)) {
      alert("عفواً، ليس لديك صلاحية لإضافة أو تعديل هذه المادة الدراسية.");
      return false;
    }
    storage.saveSubject(s);
    void refreshAllState();
    return true;
  };
  const handleDeleteSubject = (id: string) => {
    if (!canPerformAction(currentUser, "delete", "curriculum") || !canAccessSubject(currentUser, id)) {
      alert("عفواً، ليس لديك صلاحية لحذف هذه المادة الدراسية.");
      return false;
    }
    storage.deleteSubject(id);
    void refreshAllState();
    return true;
  };

  const handleSaveUnit = (u: Unit) => {
    const isEdit = units.some((existing) => existing.id === u.id);
    if (!canPerformAction(currentUser, isEdit ? "edit" : "create", "curriculum") || !canAccessSubject(currentUser, u.subjectId)) {
      storage.logAction(currentUser?.name, "محاولة إضافة/تعديل وحدة دراسية", "الوحدات", u.id, "تم رفض العملية بسبب نقص الصلاحيات أو التغطية للمادة", { result: "denied" });
      alert("عفواً، ليس لديك صلاحية لإضافة أو تعديل هذه الوحدة.");
      return false;
    }
    storage.saveUnit(u);
    void refreshAllState();
    return true;
  };
  const handleDeleteUnit = (id: string) => {
    const unit = units.find((existing) => existing.id === id);
    if (!canPerformAction(currentUser, "delete", "curriculum") || (unit && !canAccessSubject(currentUser, unit.subjectId))) {
      storage.logAction(currentUser?.name, "محاولة حذف وحدة دراسية", "الوحدات", id, "تم رفض العملية بسبب نقص الصلاحيات", { result: "denied" });
      alert("عفواً، ليس لديك صلاحية لحذف هذه الوحدة.");
      return false;
    }
    storage.deleteUnit(id);
    void refreshAllState();
    return true;
  };

  const handleSaveLesson = (l: Lesson) => {
    const isEdit = lessons.some((existing) => existing.id === l.id);
    if (!canPerformAction(currentUser, isEdit ? "edit" : "create", "lessons") || !canAccessSubject(currentUser, l.subjectId)) {
      storage.logAction(currentUser?.name, "محاولة إضافة/تعديل درس", "الدروس", l.id, "تم رفض العملية بسبب نقص الصلاحيات أو التغطية للمادة", { result: "denied" });
      alert("عفواً، ليس لديك صلاحية لإضافة أو تعديل هذا الدرس.");
      return false;
    }
    storage.saveLesson(l);
    void refreshAllState();
    return true;
  };
  const handleDeleteLesson = (id: string) => {
    const lesson = lessons.find((existing) => existing.id === id);
    if (!canPerformAction(currentUser, "delete", "lessons") || (lesson && !canAccessSubject(currentUser, lesson.subjectId))) {
      storage.logAction(currentUser?.name, "محاولة حذف درس", "الدروس", id, "تم رفض العملية بسبب نقص الصلاحيات", { result: "denied" });
      alert("عفواً، ليس لديك صلاحية لحذف هذا الدرس.");
      return false;
    }
    storage.deleteLesson(id);
    void refreshAllState();
    return true;
  };

  const handleSaveQuestion = async (q: Question) => {
    if (!q) return;
    const isEdit = questions.some((existing) => existing.id === q.id);
    if (!canPerformAction(currentUser, isEdit ? "edit" : "create", "questions") || !canAccessSubject(currentUser, q.subjectId)) {
      storage.logAction(currentUser?.name, "محاولة إضافة/تعديل سؤال", "الأسئلة", q.id, "تم رفض العملية بسبب نقص الصلاحيات أو التغطية للمادة", { result: "denied" });
      alert("عفواً، ليس لديك صلاحية لإضافة أو تعديل هذا السؤال في هذه المادة.");
      return;
    }
    const validation = validateCurriculumContext(q.subjectId || "", q.unitId || "", q.lessonId || "");
    if (!validation.isValid) {
      alert("فشل التحقق من المنهاج:\n\n" + validation.errors.join("\n"));
      console.error("[DATA-1] App.tsx Curriculum Validation Failed:", validation.errors);
      return;
    }
    await repositories.questions.create(q);
    refreshAllState();
  };
  const handleDeleteQuestion = async (id: string) => {
    const q = questions.find((existing) => existing.id === id);
    if (!canPerformAction(currentUser, "delete", "questions") || (q && !canAccessSubject(currentUser, q.subjectId))) {
      storage.logAction(currentUser?.name, "محاولة حذف سؤال", "الأسئلة", id, "تم رفض العملية بسبب نقص الصلاحيات", { result: "denied" });
      alert("عفواً، ليس لديك صلاحية لحذف هذا السؤال.");
      return;
    }
    await repositories.questions.delete(id);
    refreshAllState();
  };

  const handleSavePrintTemplate = (tmpl: PrintTemplate) => {
    if (!canPerformAction(currentUser, "edit", "exams")) {
      storage.logAction(currentUser?.name, "محاولة تحديث قالب طباعة", "الإعدادات", tmpl.id, "تم رفض العملية بسبب نقص الصلاحيات", { result: "denied" });
      alert("عفواً، ليس لديك صلاحية لتحديث قوالب الطباعة.");
      return;
    }
    storage.savePrintTemplate(tmpl);
    refreshAllState();
  };

  const handleSaveExamTemplate = (tmpl: ExamTemplate) => {
    if (!canPerformAction(currentUser, "edit", "exams")) {
      storage.logAction(currentUser?.name, "محاولة تحديث قالب اختبار", "الامتحانات", tmpl.id, "تم رفض العملية بسبب نقص الصلاحيات", { result: "denied" });
      alert("عفواً، ليس لديك صلاحية لتحديث قوالب الاختبارات.");
      return;
    }
    storage.saveExamTemplate(tmpl);
    refreshAllState();
  };

  const handleSaveExam = (exam: any) => {
    const isEdit = exams.some((existing) => existing.id === exam.id);
    const subjectId = exam.subjectId || exam.scope?.subjectId;
    if (!canPerformAction(currentUser, isEdit ? "edit" : "generate", "exams") || (subjectId && !canAccessSubject(currentUser, subjectId))) {
      storage.logAction(currentUser?.name, "محاولة حفظ امتحان", "الامتحانات", exam.id, "تم رفض العملية بسبب نقص الصلاحيات أو التغطية للمادة", { result: "denied" });
      alert("عفواً، ليس لديك صلاحية لحفظ هذا النموذج في هذه المادة.");
      return;
    }
    storage.saveExam(exam);
    refreshAllState();
  };

  const handleDeleteExam = (id: string) => {
    const exam = exams.find((existing) => existing.id === id);
    const libDoc = examLibraryService.getExamsLibrary().find((e) => (e.examId || (e as any).id) === id);
    const subjectId = exam?.subjectId || libDoc?.scope?.subjectId || (libDoc as any)?.subjectId;

    if (!canPerformAction(currentUser, "delete", "exams") || (subjectId && !canAccessSubject(currentUser, subjectId))) {
      storage.logAction(currentUser?.name, "محاولة حذف امتحان", "الامتحانات", id, "تم رفض العملية بسبب نقص الصلاحيات", { result: "denied" });
      alert("عفواً، ليس لديك صلاحية لحذف هذا النموذج.");
      return;
    }
    examLibraryService.deleteExamFromLibrary(id);
    storage.deleteExam(id);
    if (examToEdit?.examId === id) {
      setExamToEdit(null);
    }
    refreshAllState();
  };

  const handleSaveCycle = (c: Cycle) => {
    if (!canPerformAction(currentUser, "edit", "exams")) {
      storage.logAction(currentUser?.name, "محاولة تعديل دورة امتحانية", "الامتحانات", c.id, "تم رفض العملية بسبب نقص الصلاحيات", { result: "denied" });
      alert("عفواً، ليس لديك صلاحية لتعديل الدورات الامتحانية.");
      return;
    }
    storage.saveCycle(c);
    refreshAllState();
  };

  const handleDeleteCycle = (id: string) => {
    if (!canPerformAction(currentUser, "delete", "exams")) {
      storage.logAction(currentUser?.name, "محاولة حذف دورة امتحانية", "الامتحانات", id, "تم رفض العملية بسبب نقص الصلاحيات", { result: "denied" });
      alert("عفواً، ليس لديك صلاحية لحذف الدورات الامتحانية.");
      return;
    }
    storage.deleteCycle(id);
    refreshAllState();
  };

  const handleSaveUser = (u: User) => {
    if (!canPerformAction(currentUser, "users_manage", "users")) {
      storage.logAction(currentUser?.name, "محاولة حفظ مستخدم", "المستخدمين", u.id, "تم رفض العملية بسبب نقص الصلاحيات", { result: "denied" });
      alert("عفواً، ليس لديك صلاحية لإدارة حسابات المستخدمين.");
      return;
    }
    storage.saveUser(u);
    refreshAllState();
  };

  const handleDeleteUser = (id: string) => {
    if (!canPerformAction(currentUser, "users_manage", "users")) {
      storage.logAction(currentUser?.name, "محاولة حذف مستخدم", "المستخدمين", id, "تم رفض العملية بسبب نقص الصلاحيات", { result: "denied" });
      alert("عفواً، ليس لديك صلاحية لحذف حسابات المستخدمين.");
      return;
    }
    storage.deleteUser(id);
    refreshAllState();
  };

  const handleReorderUsers = (reorderedUsers: User[]) => {
    if (!canPerformAction(currentUser, "users_manage", "users")) {
      alert("عفواً، ليس لديك صلاحية لإعادة ترتيب المستخدمين.");
      return;
    }
    storage.saveUsers(reorderedUsers);
    refreshAllState();
  };

  const handleSaveSettings = (s: SystemSettings) => {
    if (!canPerformAction(currentUser, "settings_manage", "settings")) {
      alert("عفواً، ليس لديك صلاحية لتعديل إعدادات النظام.");
      return;
    }
    storage.saveSettings(s);
    refreshAllState();
  };

  // Backup & Export Handlers with Arabic Preview Modal & UTF-8 BOM
  const handleExportBackup = () => {
    if (!canPerformAction(currentUser, "export")) {
      alert("عفواً، حسابك لا يمتلك صلاحية تصدير النسخة الاحتياطية.");
      return;
    }
    try {
      const jsonStr = storage.exportFullDatabaseJson();
      const parsedDump = JSON.parse(jsonStr);
      const inspection = inspectExportPayload(parsedDump, jsonStr);

      setBackupPreviewData({
        isOpen: true,
        jsonString: jsonStr,
        inspection,
      });
    } catch (err: any) {
      console.error("Failed to prepare backup preview:", err);
      alert("حدث خطأ أثناء تجهيز معاينة النسخة الاحتياطية: " + (err.message || String(err)));
    }
  };

  const handleConfirmBackupDownload = () => {
    if (!backupPreviewData) return;
    try {
      const blob = storage.exportFullDatabaseBlob();
      triggerBackupDownload(blob);
    } catch (err: any) {
      console.error("Failed to download backup blob:", err);
      alert("حدث خطأ أثناء تنزيل النسخة الاحتياطية: " + (err.message || String(err)));
    } finally {
      setBackupPreviewData(null);
    }
  };

  const handleImportBackup = (jsonStr: string) => {
    if (!canPerformAction(currentUser, "settings_manage", "settings")) {
      alert("عفواً، ليس لديك صلاحية لاستيراد بيانات النظام.");
      return;
    }
    try {
      const ok = storage.importDatabaseJson(jsonStr);
      if (ok) refreshAllState();
    } catch (err: any) {
      alert(err.message || String(err));
    }
  };

  const handleResetAllData = (phrase: string) => {
    if (!canPerformAction(currentUser, "settings_manage", "settings")) {
      alert("عفواً، ليس لديك صلاحية لإعادة ضبط النظام.");
      return;
    }
    try {
      storage.resetAllData(phrase);
      refreshAllState();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleEmptyDatabase = (phrase: string) => {
    if (!canPerformAction(currentUser, "settings_manage", "settings")) {
      alert("عفواً، ليس لديك صلاحية لتفريغ قاعدة البيانات.");
      return;
    }
    try {
      storage.emptyDatabase(phrase);
      refreshAllState();
    } catch (e: any) {
      alert(e.message);
    }
  };

  if (showSplash) {
    return <SplashView onFinish={() => setShowSplash(false)} />;
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950">
        <div className="w-8 h-8 rounded-full border-4 border-slate-200 dark:border-slate-800 border-t-blue-600 animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginView onLogin={handleLogin} />;
  }

  return (
    <div
      className="min-h-screen bg-[var(--app-bg)] text-[var(--text-main)] flex flex-col font-sans transition-colors duration-200"
      style={{ direction: "rtl" }}
    >
      <UIIntegrityMonitor />
      {/* Header - Hidden in Lesson Editor view to allow full Microsoft Word-style top bar layout */}
      {activeTab !== "lessons" && (
        <Header
          settings={settings}
          activeTab={activeTab}
          onNavigate={(tab) => setActiveTab(tab)}
          onToggleTheme={handleToggleTheme}
          onOpenQuickAddQuestion={() => setActiveTab("questions")}
          onOpenAiSettings={() => setShowAiSettings(true)}
          onOpenCentralGovernance={() => setShowGovernanceModal(true)}
          onLogout={handleLogout}
        />
      )}

      {/* Main Layout Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Navigation - Hidden in Lesson Editor mode to prevent double sidebars */}
        {activeTab !== "lessons" && (
          <Sidebar
            activeTab={activeTab}
            onNavigate={(tab) => handleNavigateToTab(tab)}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            currentUser={currentUser}
            badgeCounts={{
              questionsCount: questions.length,
              lessonsCount: lessons.length,
              examsCount: exams.length,
              examsLibraryCount: examLibraryService.getExamsLibrary().length,
            }}
          />
        )}

        {/* View Content Area */}
        <main
          ref={mainContentRef}
          className={`flex-1 min-w-0 ${activeTab === "lessons" ? "overflow-hidden" : "overflow-y-auto"}`}
        >
          {!canAccessModule(currentUser, activeTab) ? (
            <AccessDeniedView
              moduleName={
                activeTab === "curriculum"
                  ? "شجرة المنهاج"
                  : activeTab === "lessons"
                    ? "محرّر الدروس"
                    : activeTab === "questions"
                      ? "بنك الأسئلة"
                      : activeTab === "exams"
                        ? "مولد الاختبارات"
                        : activeTab === "exams-library"
                          ? "مكتبة النماذج"
                          : activeTab === "settings"
                            ? "إعدادات النظام"
                            : "هذه الشاشة"
              }
              onReturnToDashboard={() => setActiveTab("dashboard")}
            />
          ) : (
            <>
              {activeTab === "dashboard" && (
            <DashboardView
              key={`dashboard-${tabCounter["dashboard"] || 0}`}
              currentUser={currentUser}
              subjects={subjects}
              units={units}
              questions={questions}
              exams={exams}
              lessons={lessons}
              auditLogs={auditLogs}
              settings={settings}
              cycles={cycles}
              users={users}
              onNavigate={(tab) => handleNavigateToTab(tab)}
              onQuickAddQuestion={() => {
                setQuestionBankInitialAction("create");
                handleNavigateToTab("questions");
              }}
              onNavigateToSmartImport={() => {
                setQuestionBankInitialTab("import");
                handleNavigateToTab("questions");
              }}
              onExportBackup={handleExportBackup}
            />
          )}

          {activeTab === "curriculum" && (
            <CurriculumTreeView
              key={`curriculum-${tabCounter["curriculum"] || 0}`}
              subjects={subjects}
              units={units}
              lessons={lessons}
              questions={questions}
              isLoading={curriculumLoading}
              loadError={curriculumError}
              onRetry={() => void refreshAllState()}
              onSaveSubject={handleSaveSubject}
              onDeleteSubject={handleDeleteSubject}
              onSaveUnit={handleSaveUnit}
              onDeleteUnit={handleDeleteUnit}
              onSaveLesson={handleSaveLesson}
              onDeleteLesson={handleDeleteLesson}
              navigationState={curriculumNavigation}
              onOpenLessonPreview={handleOpenLessonPreview}
              onOpenLessonEditor={handleOpenLessonEditor}
              onOpenLessonQuestions={(subjectId, unitId, lessonId) => {
                setQuestionBankFilters({ subjectId, unitId, lessonId });
                handleNavigateToTab("questions");
              }}
            />
          )}

          {activeTab === "lessons" && (
            <LessonEditorView
              key={`lessons-${selectedLessonId || "default"}-${tabCounter["lessons"] || 0}`}
              initialView={lessonEntryView}
              lessonId={selectedLessonId}
              lessons={lessons}
              subjects={subjects}
              units={units}
              questions={questions}
              printTemplates={printTemplates}
              onSaveLesson={handleSaveLesson}
              onChangeLesson={setSelectedLessonId}
              onSaveUnit={handleSaveUnit}
              onDeleteUnit={handleDeleteUnit}
              onDeleteLesson={handleDeleteLesson}
              onToggleTheme={handleToggleTheme}
              onBack={() => handleNavigateToTab("curriculum")}
            />
          )}

          {activeTab === "questions" && (
            <QuestionBankView
              key={`questions-${tabCounter["questions"] || 0}`}
              questions={questions}
              subjects={subjects}
              units={units}
              lessons={lessons}
              exams={exams}
              onSaveQuestion={handleSaveQuestion}
              onDeleteQuestion={handleDeleteQuestion}
              initialFilters={questionBankFilters}
              onClearInitialFilters={() => setQuestionBankFilters(null)}
              initialTab={questionBankInitialTab}
              onClearInitialTab={() => setQuestionBankInitialTab(null)}
              initialAction={questionBankInitialAction}
              onClearInitialAction={() => setQuestionBankInitialAction(null)}
              onOpenLessonEditor={handleOpenLessonEditor}
            />
          )}

          {activeTab === "exams" && (
            <ExamGeneratorView
              key={`exams-${tabCounter["exams"] || 0}`}
              subjects={subjects}
              units={units}
              lessons={lessons}
              questions={questions}
              exams={exams}
              examTemplates={examTemplates}
              printTemplates={printTemplates}
              onSaveExam={handleSaveExam}
              onSavePrintTemplate={handleSavePrintTemplate}
              onDeleteExam={handleDeleteExam}
              onNavigate={(tab) => handleNavigateToTab(tab)}
              initialExamToEdit={examToEdit}
              onClearExamToEdit={() => setExamToEdit(null)}
            />
          )}

          {activeTab === "exams-library" && (
            <ExamsLibraryView
              key={`exams-library-${tabCounter["exams-library"] || 0}`}
              subjects={subjects}
              questions={questions}
              units={units}
              lessons={lessons}
              exams={exams}
              cycles={cycles}
              currentUser={currentUser}
              onSaveCycle={handleSaveCycle}
              onDeleteCycle={handleDeleteCycle}
              onNavigateToGenerator={() => handleNavigateToTab("exams")}
              onEditExam={(doc) => {
                setExamToEdit(doc);
                handleNavigateToTab("exams");
              }}
              onDeleteExam={handleDeleteExam}
              onSaveExam={handleSaveExam}
            />
          )}

          {activeTab === "settings" && (
            <SettingsView
              key={`settings-${tabCounter["settings"] || 0}`}
              settings={settings}
              users={users}
              auditLogs={auditLogs}
              onSaveSettings={handleSaveSettings}
              onSaveUser={handleSaveUser}
              onDeleteUser={handleDeleteUser}
              onReorderUsers={handleReorderUsers}
              onExportBackup={handleExportBackup}
              onImportBackup={handleImportBackup}
              onResetAllData={handleResetAllData}
              onEmptyDatabase={handleEmptyDatabase}
            />
          )}

          {activeTab === "user-profile" && (
            <UserCredentialsPermissionsView
              key={`user-profile-${tabCounter["user-profile"] || 0}`}
              currentUser={currentUser}
              allUsers={users}
              onSaveUser={handleSaveUser}
              onDeleteUser={handleDeleteUser}
              onReorderUsers={handleReorderUsers}
              onBackToSettings={() => {
                handleNavigateToTab("settings");
                setTimeout(() => {
                  window.dispatchEvent(
                    new CustomEvent("settings-subtab", { detail: "users" }),
                  );
                }, 50);
              }}
            />
          )}

          {activeTab === "help" && <HelpSupportView key={`help-${tabCounter["help"] || 0}`} />}
            </>
          )}
        </main>
      </div>
      {/* Global Modals */}
      <GlobalContextMenu />
      <SelfHealingToast />
      {showAiSettings && (
        <AiSettingsModal onClose={() => setShowAiSettings(false)} />
      )}
      <CentralGovernanceModal
        isOpen={showGovernanceModal}
        onClose={() => setShowGovernanceModal(false)}
        onOpenExam={(examId) => {
          const found = storage.getExams().find((ex) => ex.id === examId) ||
            examLibraryService.getExamById(examId);
          if (found) {
            setExamToEdit(found as any);
            setActiveTab("exams");
            setShowGovernanceModal(false);
          }
        }}
      />
      {backupPreviewData && (
        <BackupExportPreviewModal
          isOpen={backupPreviewData.isOpen}
          onClose={() => setBackupPreviewData(null)}
          onConfirmDownload={handleConfirmBackupDownload}
          jsonString={backupPreviewData.jsonString}
          inspection={backupPreviewData.inspection}
        />
      )}
      <DiagnosticConsole />
    </div>
  );
}

export default App;
