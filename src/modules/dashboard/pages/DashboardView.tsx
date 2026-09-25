import React from "react";
import {
  BookOpen,
  Sparkles,
  PlusCircle,
  Download,
  ScanLine,
  FileText,
  Layers,
  Users,
  Settings as SettingsIcon,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ChevronLeft,
  GraduationCap,
  Library,
  HelpCircle,
} from "lucide-react";
import {
  Subject,
  Unit,
  Question,
  Exam,
  Lesson,
  AuditLog,
  SystemSettings,
  Cycle,
  User,
} from "../../../types/index";
import {
  canAccessModule,
  canPerformAction,
  canAccessSubject,
} from "../../../services/rbacEngine";

interface DashboardViewProps {
  currentUser?: User;
  subjects?: Subject[];
  units?: Unit[];
  questions?: Question[];
  exams?: Exam[];
  lessons?: Lesson[];
  auditLogs?: AuditLog[];
  settings?: SystemSettings;
  cycles?: Cycle[];
  users?: User[];
  onNavigate: (tab: string) => void;
  onQuickAddQuestion: () => void;
  onExportBackup: () => void;
  onNavigateToSmartImport?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  currentUser,
  subjects = [],
  units = [],
  questions = [],
  exams = [],
  lessons = [],
  auditLogs = [],
  settings,
  cycles = [],
  users = [],
  onNavigate,
  onQuickAddQuestion,
  onExportBackup,
  onNavigateToSmartImport,
}) => {
  // Determine user role and permissions
  const role = currentUser?.role || "teacher";
  const isAdmin = role === "admin";
  const isSupervisor = role === "supervisor";
  const isTeacher = role === "teacher";

  // Filter entities according to user's allowed subjects (teachers see their subjects only)
  const allowedSubjects = subjects.filter((s) => canAccessSubject(currentUser, s.id));
  const allowedSubjectIds = new Set(allowedSubjects.map((s) => s.id));

  const accessibleQuestions = isAdmin
    ? questions
    : questions.filter((q) => !q.subjectId || allowedSubjectIds.has(q.subjectId));

  const accessibleExams = isAdmin
    ? exams
    : exams.filter((e) => !e.subjectId || allowedSubjectIds.has(e.subjectId));

  const accessibleLessons = isAdmin
    ? lessons
    : lessons.filter((l) => !l.subjectId || allowedSubjectIds.has(l.subjectId));

  const accessibleUnits = isAdmin
    ? units
    : units.filter((u) => !u.subjectId || allowedSubjectIds.has(u.subjectId));

  // Role display label and badge styling
  const roleLabel =
    role === "admin"
      ? "مدير النظام"
      : role === "supervisor"
      ? "مشرف تربوي"
      : role === "reviewer"
      ? "مراجع امتحاني"
      : "معلم مادة";

  const roleBadgeColor =
    role === "admin"
      ? "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800"
      : role === "supervisor"
      ? "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800"
      : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";

  // Greeting title
  const displayName = currentUser?.name || "المستخدم";
  const greetingTitle =
    isAdmin
      ? `مرحباً بك، ${displayName}`
      : `أهلاً بك، أ. ${displayName}`;

  // Filter recent audit logs relevant to the user
  const recentLogs = (auditLogs || [])
    .filter((log) => (isAdmin ? true : log.userName === currentUser?.name || log.userId === currentUser?.id))
    .slice(0, 5);

  return (
    <div
      id="dashboard-root-view"
      className="p-4 md:p-6 lg:p-8 pt-4 space-y-6 max-w-[1600px] mx-auto bg-[var(--app-bg)] min-h-[calc(100vh-80px)] rtl select-none"
    >
      {/* Header / Hero Section */}
      <div
        id="dashboard-header-hero"
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[var(--surface-card)] p-5 md:p-6 rounded-2xl border border-[var(--border-default)] shadow-xs"
      >
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl md:text-2xl font-bold text-[var(--text-main)] flex items-center gap-2 tracking-tight">
              <span>{greetingTitle}</span>
              <Sparkles className="w-5 h-5 text-ai-500 shrink-0" />
            </h1>
            <span
              className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${roleBadgeColor}`}
            >
              {roleLabel}
            </span>
          </div>
          <p className="text-sm text-[var(--text-secondary)] font-medium">
            {isAdmin
              ? "لوحة القيادة والمتابعة الشاملة لإدارة المناهج، الأسئلة، الاختبارات، والمستخدمين."
              : isSupervisor
              ? "متابعة وإشراف على بنوك الأسئلة، مراجعة نماذج الامتحانات، ومتابعة جودة المحتوى."
              : "مساحة عملك لإعداد الدروس، إضافة الأسئلة، وتوليد نماذج الاختبارات الدراسية."}
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto flex-wrap sm:flex-nowrap">
          {canAccessModule(currentUser, "exams-library") && (
            <button
              id="dashboard-btn-exams-library"
              onClick={() => onNavigate("exams-library")}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-[var(--surface-card)] hover:bg-[var(--sidebar-item-hover)] border border-[var(--border-default)] text-[var(--text-main)] rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-2xs"
              title="عرض نماذج الاختبارات المحفوظة"
            >
              <Library className="w-4 h-4 text-primary-600" />
              <span>مكتبة النماذج</span>
            </button>
          )}

          {canPerformAction(currentUser, "export") && (
            <button
              id="dashboard-btn-export-backup"
              onClick={onExportBackup}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs shadow-primary-500/20"
              title="تصدير نسخة احتياطية من بيانات المنظومة"
            >
              <Download className="w-4 h-4" />
              <span>النسخ الاحتياطي</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Accurate Statistics Cards */}
      <section id="dashboard-kpi-stats">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Subjects */}
          <div
            id="kpi-card-subjects"
            onClick={() => canAccessModule(currentUser, "curriculum") && onNavigate("curriculum")}
            className={`p-4 bg-[var(--surface-card)] rounded-2xl border border-[var(--border-default)] shadow-xs transition-all flex flex-col justify-between gap-3 ${
              canAccessModule(currentUser, "curriculum")
                ? "hover:border-primary-500/50 hover:shadow-md cursor-pointer hover:-translate-y-0.5"
                : "opacity-80 cursor-default"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--text-secondary)]">
                {isAdmin ? "المواد الدراسية" : "المواد المصرح بها"}
              </span>
              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <BookOpen className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-black text-[var(--text-main)]">
                {allowedSubjects.length}
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-0.5 font-medium">
                {accessibleUnits.length} وحدة تعليمية مسجلة
              </p>
            </div>
          </div>

          {/* Card 2: Question Bank */}
          <div
            id="kpi-card-questions"
            onClick={() => canAccessModule(currentUser, "questions") && onNavigate("questions")}
            className={`p-4 bg-[var(--surface-card)] rounded-2xl border border-[var(--border-default)] shadow-xs transition-all flex flex-col justify-between gap-3 ${
              canAccessModule(currentUser, "questions")
                ? "hover:border-primary-500/50 hover:shadow-md cursor-pointer hover:-translate-y-0.5"
                : "opacity-80 cursor-default"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--text-secondary)]">
                بنك الأسئلة المعتمد
              </span>
              <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <PlusCircle className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-black text-[var(--text-main)]">
                {accessibleQuestions.length}
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-0.5 font-medium">
                جاهزة للتضمين في النماذج الامتحانية
              </p>
            </div>
          </div>

          {/* Card 3: Exams */}
          <div
            id="kpi-card-exams"
            onClick={() => canAccessModule(currentUser, "exams-library") && onNavigate("exams-library")}
            className={`p-4 bg-[var(--surface-card)] rounded-2xl border border-[var(--border-default)] shadow-xs transition-all flex flex-col justify-between gap-3 ${
              canAccessModule(currentUser, "exams-library")
                ? "hover:border-primary-500/50 hover:shadow-md cursor-pointer hover:-translate-y-0.5"
                : "opacity-80 cursor-default"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--text-secondary)]">
                نماذج الاختبارات الصادرة
              </span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-black text-[var(--text-main)]">
                {accessibleExams.length}
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-0.5 font-medium">
                {cycles.length > 0
                  ? `${cycles.length} دورة امتحانية مفعلة`
                  : "نماذج محفوظة وقابلة للطباعة والتصدير"}
              </p>
            </div>
          </div>

          {/* Card 4: Users (Admin/Supervisor) OR Lessons (Teacher) */}
          {isAdmin || isSupervisor ? (
            <div
              id="kpi-card-users"
              onClick={() => canAccessModule(currentUser, "users") && onNavigate("users")}
              className={`p-4 bg-[var(--surface-card)] rounded-2xl border border-[var(--border-default)] shadow-xs transition-all flex flex-col justify-between gap-3 ${
                canAccessModule(currentUser, "users")
                  ? "hover:border-primary-500/50 hover:shadow-md cursor-pointer hover:-translate-y-0.5"
                  : "opacity-80 cursor-default"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--text-secondary)]">
                  المستخدمون والكادر
                </span>
                <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-black text-[var(--text-main)]">
                  {users.length > 0 ? users.length : 1}
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-0.5 font-medium">
                  {users.filter((u) => u.status === "active").length || 1} حساب نشط ومفعل
                </p>
              </div>
            </div>
          ) : (
            <div
              id="kpi-card-lessons"
              onClick={() => canAccessModule(currentUser, "lessons") && onNavigate("lessons")}
              className={`p-4 bg-[var(--surface-card)] rounded-2xl border border-[var(--border-default)] shadow-xs transition-all flex flex-col justify-between gap-3 ${
                canAccessModule(currentUser, "lessons")
                  ? "hover:border-primary-500/50 hover:shadow-md cursor-pointer hover:-translate-y-0.5"
                  : "opacity-80 cursor-default"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--text-secondary)]">
                  الدروس التعليمية
                </span>
                <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <GraduationCap className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-black text-[var(--text-main)]">
                  {accessibleLessons.length}
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-0.5 font-medium">
                  مرتبطة بالوحدات والمناهج
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Quick Start Zone (Primary User Actions) */}
      <section id="dashboard-quick-actions">
        <h2 className="text-sm font-bold text-[var(--text-secondary)] mb-3 px-1 flex items-center gap-1.5">
          <span>المهام والعمليات السريعة</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Smart Import OCR */}
          {canPerformAction(currentUser, "import", "questions") && (
            <button
              id="quick-btn-smart-ocr"
              onClick={() => {
                if (onNavigateToSmartImport) {
                  onNavigateToSmartImport();
                } else {
                  onNavigate("questions");
                }
              }}
              className="group p-4 bg-[var(--surface-card)] rounded-2xl shadow-xs hover:shadow-md border border-[var(--border-default)] hover:border-ai-500/50 text-right flex flex-col gap-3 transition-all hover:-translate-y-0.5 cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-ai-50 dark:bg-ai-900/40 text-ai-600 dark:text-ai-400 flex items-center justify-center group-hover:scale-110 group-hover:bg-ai-100 dark:group-hover:bg-ai-900/60 transition-all">
                <ScanLine className="w-5 h-5" strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="font-bold text-[var(--text-main)] text-base group-hover:text-ai-600 dark:group-hover:text-ai-400 transition-colors">
                  استيراد ذكي (OCR)
                </h3>
                <p className="text-xs text-[var(--text-muted)] mt-1 font-medium">
                  رقمنة المستندات والصور واستخراج الأسئلة
                </p>
              </div>
            </button>
          )}

          {/* Create Question */}
          {canPerformAction(currentUser, "create", "questions") && (
            <button
              id="quick-btn-add-question"
              onClick={onQuickAddQuestion}
              className="group p-4 bg-[var(--surface-card)] rounded-2xl shadow-xs hover:shadow-md border border-[var(--border-default)] hover:border-primary-500/50 text-right flex flex-col gap-3 transition-all hover:-translate-y-0.5 cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 flex items-center justify-center group-hover:scale-110 group-hover:bg-primary-100 dark:group-hover:bg-primary-900/60 transition-all">
                <PlusCircle className="w-5 h-5" strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="font-bold text-[var(--text-main)] text-base group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                  إنشاء سؤال جديد
                </h3>
                <p className="text-xs text-[var(--text-muted)] mt-1 font-medium">
                  إضافة سؤال مع الإجابات النموذجية والتصنيف
                </p>
              </div>
            </button>
          )}

          {/* Curriculum / Lessons */}
          {canAccessModule(currentUser, "curriculum") && (
            <button
              id="quick-btn-curriculum"
              onClick={() => onNavigate("curriculum")}
              className="group p-4 bg-[var(--surface-card)] rounded-2xl shadow-xs hover:shadow-md border border-[var(--border-default)] hover:border-emerald-500/50 text-right flex flex-col gap-3 transition-all hover:-translate-y-0.5 cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/60 transition-all">
                <BookOpen className="w-5 h-5" strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="font-bold text-[var(--text-main)] text-base group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  شجرة المنهج والدروس
                </h3>
                <p className="text-xs text-[var(--text-muted)] mt-1 font-medium">
                  هيكلة المواد، الوحدات، والمخرجات التعليمية
                </p>
              </div>
            </button>
          )}

          {/* Generate Exam */}
          {canAccessModule(currentUser, "exams") && (
            <button
              id="quick-btn-generate-exam"
              onClick={() => onNavigate("exams")}
              className="group p-4 bg-[var(--surface-card)] rounded-2xl shadow-xs hover:shadow-md border border-[var(--border-default)] hover:border-indigo-500/50 text-right flex flex-col gap-3 transition-all hover:-translate-y-0.5 cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/60 transition-all">
                <FileText className="w-5 h-5" strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="font-bold text-[var(--text-main)] text-base group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  توليد نموذج اختبار
                </h3>
                <p className="text-xs text-[var(--text-muted)] mt-1 font-medium">
                  بناء نماذج متعددة، مصفوفات المواصفات، والطباعة
                </p>
              </div>
            </button>
          )}

          {/* Admin Special: User Management */}
          {canPerformAction(currentUser, "users_manage", "users") && (
            <button
              id="quick-btn-users-manage"
              onClick={() => onNavigate("users")}
              className="group p-4 bg-[var(--surface-card)] rounded-2xl shadow-xs hover:shadow-md border border-[var(--border-default)] hover:border-purple-500/50 text-right flex flex-col gap-3 transition-all hover:-translate-y-0.5 cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center group-hover:scale-110 group-hover:bg-purple-100 dark:group-hover:bg-purple-900/60 transition-all">
                <Users className="w-5 h-5" strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="font-bold text-[var(--text-main)] text-base group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                  المستخدمون والصلاحيات
                </h3>
                <p className="text-xs text-[var(--text-muted)] mt-1 font-medium">
                  إدارة حسابات المعلمين والمشرفين وكلمات المرور
                </p>
              </div>
            </button>
          )}

          {/* Admin Special: System Settings */}
          {canPerformAction(currentUser, "settings_manage", "settings") && (
            <button
              id="quick-btn-system-settings"
              onClick={() => onNavigate("settings")}
              className="group p-4 bg-[var(--surface-card)] rounded-2xl shadow-xs hover:shadow-md border border-[var(--border-default)] hover:border-slate-500/50 text-right flex flex-col gap-3 transition-all hover:-translate-y-0.5 cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center group-hover:scale-110 transition-all">
                <SettingsIcon className="w-5 h-5" strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="font-bold text-[var(--text-main)] text-base group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                  إعدادات المنظومة
                </h3>
                <p className="text-xs text-[var(--text-muted)] mt-1 font-medium">
                  ترويسة الاختبارات، بيانات المدرسة، وقوالب الطباعة
                </p>
              </div>
            </button>
          )}
        </div>
      </section>

      {/* Dual Section: System Status & Recent Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity Log (2 Cols on large screens) */}
        <div
          id="dashboard-recent-activity"
          className="lg:col-span-2 bg-[var(--surface-card)] p-5 rounded-2xl border border-[var(--border-default)] shadow-xs space-y-4"
        >
          <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-3">
            <h3 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary-600" />
              <span>أحدث الأنشطة والعمليات</span>
            </h3>
            {isAdmin && canAccessModule(currentUser, "users") && (
              <button
                type="button"
                onClick={() => onNavigate("users")}
                className="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1 cursor-pointer"
              >
                <span>سجل التدقيق الكامل</span>
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {recentLogs.length > 0 ? (
            <div className="space-y-2.5">
              {recentLogs.map((log) => {
                const isSuccess = log.result !== "denied" && log.result !== "error";
                return (
                  <div
                    key={log.id}
                    className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/70 dark:border-slate-700/60 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          isSuccess ? "bg-emerald-500" : "bg-rose-500"
                        }`}
                      />
                      <div className="truncate">
                        <div className="font-bold text-[var(--text-main)] truncate">
                          {log.action}
                        </div>
                        <div className="text-[11px] text-[var(--text-muted)] truncate">
                          بواسطة: <span className="font-medium text-[var(--text-secondary)]">{log.userName || "النظام"}</span>
                          {log.targetEntity && ` • ${log.targetEntity}`}
                        </div>
                      </div>
                    </div>

                    <div className="text-[11px] text-[var(--text-muted)] font-mono shrink-0" dir="ltr">
                      {log.timestamp
                        ? new Date(log.timestamp).toLocaleTimeString("ar-SA", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "الآن"}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-center text-slate-400 dark:text-slate-500 text-xs">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500/80" />
              <p className="font-bold text-slate-600 dark:text-slate-400">المنظومة جاهزة للعمل</p>
              <p className="text-[11px] mt-0.5">سيتم تسجيل الأنشطة والعمليات هنا تلقائياً عند البدء.</p>
            </div>
          )}
        </div>

        {/* System Readiness & Info Card (1 Col) */}
        <div
          id="dashboard-system-readiness"
          className="bg-[var(--surface-card)] p-5 rounded-2xl border border-[var(--border-default)] shadow-xs space-y-4 flex flex-col justify-between"
        >
          <div>
            <h3 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2 border-b border-[var(--border-default)] pb-3">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>جاهزية المنظومة والبيانات</span>
            </h3>

            <div className="mt-3 space-y-2.5 text-xs text-[var(--text-secondary)]">
              <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-800/40 text-emerald-900 dark:text-emerald-300">
                <span className="font-medium">التخزين المحلي الآمن</span>
                <span className="font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  مفعل ونشط
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <span className="font-medium">المؤسسة / المدرسة</span>
                <span className="font-bold text-[var(--text-main)]">
                  {settings?.academyName || "المنظومة التعليمية"}
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <span className="font-medium">حالة الترخيص</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {settings?.licenseStatus === "active" ? "ترخيص نشط ودائم" : "نسخة مفعلة"}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-[var(--border-default)] flex items-center justify-between">
            <button
              type="button"
              onClick={() => onNavigate("help")}
              className="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1 cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>دليل الاستخدام والمساعدة</span>
            </button>
            <span className="text-[10px] font-mono text-[var(--text-muted)] font-bold">
              v1.2.0
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
