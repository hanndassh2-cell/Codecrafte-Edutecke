import React from "react";

interface SplitWorkspaceLayoutProps {
  header?: React.ReactNode;
  leftContent: React.ReactNode;
  rightContent: React.ReactNode;
  bottomBarContent?: React.ReactNode;
  leftTitle?: React.ReactNode;
  rightTitle?: React.ReactNode;
}

/**
 * A unified split-screen layout for the main workspace views (Question Bank, Lesson Editor, Exam Generator).
 * - Left (45%): Preview or static content area.
 * - Right (55%): Workspace or active editing area.
 * - Bottom Bar: Sticky action bar for the workspace.
 */
export const SplitWorkspaceLayout: React.FC<SplitWorkspaceLayoutProps> = ({
  header,
  leftContent,
  rightContent,
  bottomBarContent,
  leftTitle,
  rightTitle,
}) => {
  return (
    <div className="flex flex-col h-full min-h-[calc(100vh-64px)] bg-slate-100 dark:bg-slate-900 w-full relative">
      {header && <div className="shrink-0 z-30">{header}</div>}

      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden relative">
        {/* Right Side: Workspace (55%) */}
        <div className="w-full lg:w-[55%] flex flex-col bg-white dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800 relative z-10 overflow-hidden">
          {rightTitle && (
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0 bg-white dark:bg-slate-950">
              {rightTitle}
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {rightContent}
          </div>

          {/* Sticky Bottom Action Bar */}
          {bottomBarContent && (
            <div className="sticky bottom-0 left-0 right-0 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 p-4 shrink-0 flex items-center justify-between gap-4 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
              {bottomBarContent}
            </div>
          )}
        </div>

        {/* Left Side: Live Preview (45%) */}
        <div className="w-full lg:w-[45%] flex flex-col bg-slate-50 dark:bg-slate-900 relative overflow-hidden">
          {leftTitle && (
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0 bg-slate-50 dark:bg-slate-900">
              {leftTitle}
            </div>
          )}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">{leftContent}</div>
        </div>
      </div>
    </div>
  );
};

// Reusable UI Classes for the Unified Design System
export const uiClasses = {
  // Navigation (Tabs & Steppers)
  navContainer:
    "flex items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-900/50 rounded-xl overflow-x-auto",
  navItem:
    "flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-bold transition-all whitespace-nowrap",
  navItemActive:
    "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200/50 dark:border-slate-700",
  navItemInactive:
    "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50",

  // Cards & Containers (De-boxing)
  card: "bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm",
  cardNoPadding:
    "bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm",

  // Section Headers inside cards
  sectionHeader:
    "text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800/50 pb-3 mb-4",

  // Inputs
  input:
    "w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-shadow outline-none text-sm",

  // Buttons
  primaryButton:
    "px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-colors shadow-sm flex items-center justify-center gap-2",
  secondaryButton:
    "px-6 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-sm transition-colors flex items-center justify-center gap-2",
  outlineButton:
    "px-6 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-sm transition-colors flex items-center justify-center gap-2",
  ghostButton:
    "px-4 py-2 rounded-lg text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-sm transition-colors flex items-center justify-center gap-2",
};
