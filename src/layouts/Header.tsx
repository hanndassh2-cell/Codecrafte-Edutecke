import React from "react";
import {
  Search,
  Sparkles,
  Settings,
  Sun,
  Moon,
  Monitor,
  LogOut,
  User,
  ShieldCheck,
} from "lucide-react";
import { SystemSettings } from "../types/index";

interface HeaderProps {
  settings: SystemSettings;
  activeTab: string;
  onNavigate: (tab: string) => void;
  onToggleTheme: () => void;
  onOpenQuickAddQuestion: () => void;
  onOpenAiSettings: () => void;
  onOpenCentralGovernance?: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  activeTab,
  onNavigate,
  onToggleTheme,
  onOpenQuickAddQuestion,
  onOpenAiSettings,
  onOpenCentralGovernance,
  onLogout,
}) => {

  return (
    <header className="app-header sticky top-0 z-30 px-5 py-2.5 flex items-center justify-between transition-colors shadow-2xs">
      {/* Right (RTL Start) Branding & Academy Title */}
      <div className="flex items-center gap-2.5 min-w-[200px]">
        {settings.logoUrl ? (
          <img
            src={settings.logoUrl}
            alt="Logo"
            className="w-8 h-8 object-contain rounded-md"
          />
        ) : (
          <div className="w-8 h-8 rounded-md bg-primary-600 text-white flex items-center justify-center font-black text-sm shadow-2xs">
            أ
          </div>
        )}
        <div className="flex flex-col">
          <h2 className="text-xs sm:text-sm font-extrabold text-[var(--text-main)] leading-snug">
            {settings.academyName || "معهد المثنى لطلاب الهندسة"}
          </h2>
          <span className="text-[10px] text-[var(--text-muted)] font-semibold">
            نظام إدارة الاختبارات والمناهج
          </span>
        </div>
      </div>

      {/* Middle Search Input */}
      <div className="hidden md:flex items-center flex-1 max-w-md mx-6 relative">
        <Search className="w-4 h-4 absolute right-3 text-[var(--text-muted)] pointer-events-none" />
        <input
          type="text"
          placeholder="بحث شامل (الدروس، الأسئلة، الاختبارات، والمحتوى)..."
          className="w-full pl-3 pr-9 py-1.5 text-xs rounded-lg bg-[var(--surface-card-subtle)] text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-primary-600/30 focus:bg-[var(--surface-card)] border border-[var(--border-default)] focus:border-primary-600 transition-all placeholder:text-[var(--text-muted)]"
          onKeyDown={(e) => {
            if (e.key === "Enter") onNavigate("questions");
          }}
        />
      </div>

      {/* Left Controls (Visually Left in RTL) */}
      <div className="flex items-center gap-1.5 justify-end">
        {/* Central Governance & Integrity */}
        <button
          onClick={onOpenCentralGovernance}
          className="px-2.5 py-1.5 rounded-lg text-success-700 dark:text-success-300 bg-success-50 dark:bg-success-950/50 hover:bg-success-100 dark:hover:bg-success-800/60 border border-success-200 dark:border-success-800 transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer shadow-2xs"
          title="نظام الحوكمة وسلامة البيانات المركزي"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-success-600 dark:text-success-400" />
          <span className="hidden xl:inline text-[11px]">الحوكمة وسلامة البيانات</span>
        </button>

        {/* Quick AI Settings */}
        <button
          onClick={onOpenAiSettings}
          className="px-2.5 py-1.5 rounded-lg text-primary-600 dark:text-primary-400 bg-[var(--primary-subtle-bg)] hover:bg-[var(--primary-100-hex)] border border-[var(--primary-subtle-border)] transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer"
          title="إعدادات الذكاء الاصطناعي"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span className="hidden lg:inline text-[11px]">الذكاء الاصطناعي</span>
        </button>

        {/* Theme Mode Toggle */}
        <button
          onClick={onToggleTheme}
          className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:bg-[var(--sidebar-item-hover)] transition-colors cursor-pointer border border-transparent hover:border-[var(--border-default)]"
          title="تغيير المظهر (فاتح / داكن / نظام)"
        >
          {settings.themeMode === "dark" ? (
            <Moon className="w-4 h-4 text-warning-400" />
          ) : settings.themeMode === "light" ? (
            <Sun className="w-4 h-4 text-warning-500" />
          ) : (
            <Monitor className="w-4 h-4 text-primary-600" />
          )}
        </button>

        {/* System Settings Button */}
        <button
          onClick={() => onNavigate("settings")}
          className={`px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer border ${
            activeTab === "settings"
              ? "bg-primary-600 text-white border-primary-600 shadow-2xs"
              : "text-[var(--text-main)] bg-[var(--surface-card)] border-[var(--border-default)] hover:bg-[var(--sidebar-item-hover)]"
          }`}
          title="إعدادات النظام والترخيص"
        >
          <Settings className="w-4 h-4" />
          <span className="hidden sm:inline">الإعدادات</span>
        </button>

        {/* Logout Button */}
        <button
          onClick={onLogout}
          className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-900/40 border border-transparent hover:border-danger-200 dark:hover:border-danger-900 transition-colors cursor-pointer"
          title="تسجيل الخروج"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
