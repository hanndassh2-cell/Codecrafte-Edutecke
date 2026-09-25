import React from "react";
import {
  LayoutDashboard,
  FolderTree,
  BookOpenCheck,
  Database,
  Sparkles,
  Library,
  History,
  Settings,
  HelpCircle,
  ChevronRight,
  ChevronLeft,
  UserCheck,
  CheckSquare,
  Play,
} from "lucide-react";

import { User } from "../types/index";

import { canAccessModule } from "../services/rbacEngine";

interface SidebarProps {
  activeTab: string;
  onNavigate: (tab: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  currentUser?: User;
  badgeCounts: {
    questionsCount: number;
    lessonsCount: number;
    examsCount: number;
    examsLibraryCount?: number;
  };
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onNavigate,
  isCollapsed,
  onToggleCollapse,
  currentUser,
  badgeCounts,
}) => {
  const perms = currentUser?.permissions;

  const isTabAllowed = (tabId: string) => {
    return canAccessModule(currentUser, tabId);
  };
  const navGroups = [
    {
      title: "أساسيات النظام",
      items: [
        {
          id: "dashboard",
          label: "لوحة التحكم",
          icon: LayoutDashboard,
          badge: null,
        },
      ],
    },
    {
      title: "المحتوى الأكاديمي",
      items: [
        {
          id: "curriculum",
          label: "شجرة المنهاج",
          icon: FolderTree,
          badge: null,
        },
        {
          id: "lessons",
          label: "إعداد الدروس",
          icon: BookOpenCheck,
          badge: badgeCounts.lessonsCount > 0 ? badgeCounts.lessonsCount : null,
        },
        {
          id: "questions",
          label: "بنك الأسئلة",
          icon: Database,
          badge:
            badgeCounts.questionsCount > 0 ? badgeCounts.questionsCount : null,
        },
      ],
    },
    {
      title: "التقييم والاختبارات",
      items: [
        {
          id: "exams",
          label: "توليد الامتحانات",
          icon: Sparkles,
          badge: badgeCounts.examsCount > 0 ? badgeCounts.examsCount : null,
        },
        {
          id: "exams-library",
          label: "مكتبة النماذج والاختبارات",
          icon: Library,
          badge:
            (badgeCounts.examsLibraryCount ?? 0) > 0
              ? badgeCounts.examsLibraryCount
              : null,
        },
      ],
    },
  ];

  const bottomGroup = {
    title: "النظام والدعم",
    items: [
      {
        id: "settings",
        label: "إعدادات النظام والترخيص",
        icon: Settings,
        badge: null,
      },
      {
        id: "help",
        label: "المساعدة والدعم الفني",
        icon: HelpCircle,
        badge: null,
      },
    ],
  };

  const renderItem = (item: any) => {
    const Icon = item.icon;
    const isActive = activeTab === item.id;
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => onNavigate(item.id)}
        className={`w-full flex items-center gap-2.5 py-2 px-3 text-xs font-bold transition-all relative group cursor-pointer ${
          isActive
            ? "bg-primary-600 text-white rounded-lg mx-1.5 w-[calc(100%-12px)] shadow-2xs"
            : "text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:bg-[var(--sidebar-item-hover)] rounded-lg mx-1.5 w-[calc(100%-12px)]"
        } ${isCollapsed ? "justify-center px-0" : ""}`}
        title={isCollapsed ? item.label : undefined}
      >
        <Icon
          className={`shrink-0 ${isCollapsed ? "w-5 h-5" : "w-4 h-4"} ${
            isActive
              ? "text-white"
              : "text-[var(--text-muted)] group-hover:text-primary-600"
          }`}
        />
        {!isCollapsed && (
          <>
            <span className="flex-1 text-right truncate leading-snug">
              {item.label}
            </span>
            {item.badge !== null && (
              <span
                className={`text-[11px] font-extrabold px-2 py-0.5 rounded-md ${
                  isActive
                    ? "bg-white/20 text-white"
                    : "bg-[var(--surface-card-subtle)] border border-[var(--border-subtle)] text-[var(--text-secondary)]"
                }`}
              >
                {item.badge}
              </span>
            )}
          </>
        )}
      </button>
    );
  };

  return (
    <aside
      className={`app-sidebar flex flex-col transition-all duration-200 z-20 ${
        isCollapsed ? "w-16" : "w-[260px]"
      }`}
    >
      {/* Navigation List */}
      <div className="py-3 pl-2 space-y-3 overflow-y-auto flex-1 custom-scrollbar">
        {navGroups
          .map((group) => ({
            ...group,
            items: group.items.filter((item) => isTabAllowed(item.id)),
          }))
          .filter((group) => group.items.length > 0)
          .map((group, idx) => (
            <div key={idx} className="relative">
              {idx > 0 && (
                <div className="absolute top-0 right-3 left-3 h-px bg-[var(--sidebar-border)]" />
              )}
              <div className={`space-y-0.5 ${idx > 0 ? "pt-2.5" : ""}`}>
                {!isCollapsed && (
                  <div className="px-3 pb-1 text-[11px] font-extrabold text-[var(--text-muted)] uppercase tracking-wider">
                    {group.title}
                  </div>
                )}
                {group.items.map(renderItem)}
              </div>
            </div>
          ))}
      </div>

      {/* Bottom Group */}
      <div className="py-2.5 pl-2 space-y-3 border-t border-[var(--sidebar-border)]">
        <div className="relative">
          <div className="space-y-0.5">
            {!isCollapsed && (
              <div className="px-3 pb-1 text-[11px] font-extrabold text-[var(--text-muted)] uppercase tracking-wider">
                {bottomGroup.title}
              </div>
            )}
            {bottomGroup.items
              .filter((item) => isTabAllowed(item.id))
              .map(renderItem)}
          </div>
        </div>
      </div>

      {/* Collapse Toggle Footer */}
      <div className="p-1.5 border-t border-[var(--sidebar-border)] flex items-center justify-between">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="w-full flex items-center justify-center gap-2 p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:bg-[var(--sidebar-item-hover)] transition-colors text-xs font-bold cursor-pointer"
        >
          {isCollapsed ? (
            <ChevronLeft className="w-4 h-4" />
          ) : (
            <>
              <ChevronRight className="w-4 h-4" />
              <span className="font-bold text-xs">
                طي القائمة الجانبية
              </span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
};
