import React from "react";
import {
  Save,
  Eye,
  Printer,
  FileDown,
  Upload,
  FileText,
  ChevronLeft,
  ArrowRight,
  Home,
  Sparkles,
  Settings,
  Sun,
  Moon,
  LogOut,
  CheckCircle2,
  MoreHorizontal,
  BookOpen,
} from "lucide-react";

interface TopBarProps {
  subjectName: string;
  unitName: string;
  lessonName: string;
  lastSaved?: string;
  status?: string;
  onChangeStatus?: (newStatus: "draft" | "review" | "approved") => void;
  onSave: () => void;
  onPreview: () => void;
  onPrint: () => void;
  onExportPdf: () => void;
  onExportWord: () => void;
  onImportWord: () => void;
  isSaving?: boolean;
  isDirty?: boolean;
  saveError?: string | null;
  onToggleMediaLibrary?: () => void;
  isMediaLibraryOpen?: boolean;
  onBack?: () => void;
  onOpenAiSettings?: () => void;
  onToggleTheme?: () => void;
  onOpenSettings?: () => void;
  onLogout?: () => void;
  themeMode?: string;
}

export const TopBar: React.FC<TopBarProps> = ({
  subjectName,
  unitName,
  lessonName,
  lastSaved,
  status = "draft",
  onChangeStatus,
  onSave,
  onPreview,
  onPrint,
  onExportPdf,
  onExportWord,
  onImportWord,
  isSaving,
  isDirty = false,
  saveError,
  onBack,
  onOpenAiSettings,
  onToggleTheme,
  onOpenSettings,
  onLogout,
  themeMode = "light",
}) => {
  const currentStatus = status === "published" || status === "completed" ? "approved" : status;
  const saveState = saveError
    ? "error"
    : isSaving
      ? "saving"
      : isDirty
        ? "dirty"
        : "saved";
  const saveStateLabel =
    saveState === "error"
      ? saveError
      : saveState === "saving"
        ? "جارٍ الحفظ..."
        : saveState === "dirty"
          ? "تغييرات غير محفوظة"
          : `تم الحفظ • ${lastSaved || "لم يُحفظ بعد"}`;

  return (
    <div
      dir="rtl"
      className="flex min-h-[68px] shrink-0 select-none items-center justify-between border-b border-slate-200 bg-white px-4 py-2 text-xs text-slate-800 shadow-2xs z-30 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
    >
      {/* Right: Back + Breadcrumb + Status Selector */}
      <div dir="rtl" className="flex min-w-0 items-center gap-2">
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-extrabold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 bg-white dark:bg-slate-800/90 rounded-xl transition-all border border-slate-200 dark:border-slate-700 shadow-2xs cursor-pointer shrink-0"
            title="العودة إلى شجرة المناهج والقائمة الرئيسية"
          >
            <ArrowRight className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            <span className="hidden sm:inline">العودة إلى المنهاج</span>
          </button>
        )}

        <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-slate-600 dark:text-slate-300 font-bold truncate max-w-md sm:max-w-lg">
          <span className="text-slate-500 dark:text-slate-400 truncate">{subjectName || "المادة"}</span>
          <ChevronLeft className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="text-slate-500 dark:text-slate-400 truncate">{unitName || "الوحدة"}</span>
          <ChevronLeft className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="text-blue-600 dark:text-blue-400 font-extrabold truncate">{lessonName || "عنوان الدرس"}</span>
        </div>

        {/* Status Dropdown Selector */}
        {onChangeStatus && (
          <div className="relative flex items-center shrink-0">
            <select
              value={currentStatus}
              onChange={(e) => onChangeStatus(e.target.value as "draft" | "review" | "approved")}
              className={`text-xs font-black px-3 py-1.5 rounded-xl border appearance-none pr-7 pl-2 cursor-pointer transition-all focus:outline-none shadow-2xs ${
                currentStatus === "approved"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800"
                  : currentStatus === "review"
                  ? "bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800"
                  : "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800"
              }`}
              title="تغيير حالة الدرس في شجرة المناهج"
            >
              <option value="draft" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">📝 مسودة (قيد الإعداد)</option>
              <option value="review" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">🔍 قيد المراجعة</option>
              <option value="approved" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">✅ معتمد ومنشور</option>
            </select>
            <div className="absolute right-2 pointer-events-none text-slate-400">
              <ChevronLeft className="w-3.5 h-3.5 -rotate-90" />
            </div>
          </div>
        )}
      </div>

      {/* Middle: Save status badge */}
      <div dir="rtl" className="hidden items-center gap-2 lg:flex">
        <div
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-extrabold shadow-2xs ${
            saveState === "error"
              ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
              : saveState === "dirty"
                ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
                : saveState === "saving"
                  ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800"
                  : "bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/80"
          }`}
          role="status"
          aria-live="polite"
        >
          <div
            className={`w-2 h-2 rounded-full ${
              saveState === "error"
                ? "bg-rose-500"
                : saveState === "dirty"
                  ? "bg-amber-500"
                  : saveState === "saving"
                    ? "bg-blue-500 animate-pulse"
                    : "bg-emerald-500"
            }`}
          ></div>
          <span>{saveStateLabel}</span>
        </div>
      </div>

      {/* Left: System & Utility Action Icons */}
      <div dir="rtl" className="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          onClick={onPreview}
          className="hidden h-10 items-center gap-2 rounded-lg border border-blue-300 bg-white px-4 text-sm font-extrabold text-blue-700 transition hover:bg-blue-50 sm:inline-flex dark:border-blue-700 dark:bg-slate-900 dark:text-blue-300 dark:hover:bg-blue-950/40"
          title="معاينة الدرس"
        >
          <Eye className="h-4 w-4" />
          <span>معاينة الدرس</span>
        </button>

        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-extrabold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
          title="حفظ التغييرات"
        >
          <Save className="h-4 w-4" />
          <span>{isSaving ? "جارٍ الحفظ…" : "حفظ"}</span>
        </button>

        {onOpenAiSettings && (
          <button
            onClick={onOpenAiSettings}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-extrabold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/60 border border-purple-200 dark:border-purple-800/80 rounded-xl transition-all cursor-pointer"
            title="مساعد الذكاء الاصطناعي"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            <span className="hidden md:inline">الذكاء الاصطناعي</span>
          </button>
        )}

        {onToggleTheme && (
          <button
            onClick={onToggleTheme}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
            title="تغيير المظهر"
          >
            {themeMode === "dark" ? (
              <Moon className="w-4 h-4 text-amber-400" />
            ) : (
              <Sun className="w-4 h-4 text-amber-500" />
            )}
          </button>
        )}

        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
            title="الإعدادات"
          >
            <Settings className="w-4 h-4" />
          </button>
        )}

        {onLogout && (
          <button
            onClick={onLogout}
            className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
            title="المزيد / تسجيل الخروج"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        )}

        <div className="mx-1 hidden h-8 w-px bg-slate-200 xl:block dark:bg-slate-700" />
        <div dir="ltr" className="hidden items-center gap-2 pl-1 xl:flex" aria-label="EduTech">
          <span className="text-lg font-black tracking-tight text-blue-700 dark:text-blue-300">EduTech</span>
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
            <BookOpen className="h-5 w-5" />
          </span>
        </div>
      </div>
    </div>
  );
};
