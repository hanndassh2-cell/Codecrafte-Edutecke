import React, { useState, useRef, useEffect } from "react";
import {
  Printer,
  FileText,
  FileCode,
  Save,
  Image as ImageIcon,
  ZoomIn,
  ZoomOut,
  ChevronRight,
  ChevronLeft,
  ChevronsRight,
  ChevronsLeft,
  Maximize2,
  Minimize2,
  X,
  ChevronDown,
  Layers,
  LayoutGrid,
  Check,
  Sparkles,
} from "lucide-react";
import { GridColumnsOption, SubItemNumberingStyle, GroupingDensity } from "../services/groupingEngine";

export interface UnifiedPreviewToolbarProps {
  onPrint: () => void;
  onExportPdf: () => void;
  onExportPdfV2?: () => void;
  onExportWord: () => void;
  onExportPngCurrentPage: () => void;
  onExportPngAllPages: () => void;

  zoom: number;
  onZoomChange: (zoom: number) => void;

  viewMode?: "single" | "continuous" | "double";
  onViewModeChange?: (mode: "single" | "continuous" | "double") => void;

  orientation?: "portrait" | "landscape";
  onOrientationChange?: (orientation: "portrait" | "landscape") => void;

  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;

  // Grouping Engine controls
  groupingEnabled?: boolean;
  onGroupingEnabledChange?: (enabled: boolean) => void;
  groupingColumns?: GridColumnsOption;
  onGroupingColumnsChange?: (cols: GridColumnsOption) => void;
  groupingNumberingStyle?: SubItemNumberingStyle;
  onGroupingNumberingStyleChange?: (style: SubItemNumberingStyle) => void;
  groupingDensity?: GroupingDensity;
  onGroupingDensityChange?: (density: GroupingDensity) => void;

  extraToolbarContent?: React.ReactNode;

  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;

  onClose?: () => void;
  title?: string;
  className?: string;
}

export const UnifiedPreviewToolbar: React.FC<UnifiedPreviewToolbarProps> = ({
  onPrint,
  onExportPdf,
  onExportPdfV2,
  onExportWord,
  onExportPngCurrentPage,
  onExportPngAllPages,

  zoom,
  onZoomChange,

  viewMode = "single",
  onViewModeChange,

  orientation = "portrait",
  onOrientationChange,

  currentPage = 1,
  totalPages = 1,
  onPageChange,

  groupingEnabled,
  onGroupingEnabledChange,
  groupingColumns = "auto",
  onGroupingColumnsChange,
  groupingNumberingStyle = "paren-num",
  onGroupingNumberingStyleChange,
  groupingDensity = "compact",
  onGroupingDensityChange,

  extraToolbarContent,

  isFullscreen = false,
  onToggleFullscreen,

  onClose,
  title,
  className = "",
}) => {
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isGroupingMenuOpen, setIsGroupingMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const groupingMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Element | null;
      if (!target) return;
      if (exportMenuRef.current && !exportMenuRef.current.contains(target) && !target.closest?.('[data-popover="export"]')) {
        setIsExportOpen(false);
      }
      if (groupingMenuRef.current && !groupingMenuRef.current.contains(target) && !target.closest?.('[data-popover="grouping"]')) {
        setIsGroupingMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div
      className={`flex items-center justify-between px-3 py-2 bg-white dark:bg-slate-800 border-b border-slate-300 dark:border-slate-700 shadow-sm print-modal-toolbar z-50 rounded-t-xl gap-2 flex-wrap sm:flex-nowrap ${className}`}
      dir="rtl"
    >
      <div className="flex items-center gap-2 flex-wrap">
        {/* Main Print Button */}
        <button
          onClick={onPrint}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-colors shadow-xs active:scale-95 cursor-pointer shrink-0"
          title="طباعة المستند مباشرة (Ctrl+P)"
        >
          <Printer className="w-4 h-4" />
          <span>طباعة</span>
        </button>

        {/* Primary PDF Export Button (Rendered as high-res image / Vector DOM) */}
        <button
          onClick={onExportPdf}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs rounded-lg transition-all shadow-sm active:scale-95 cursor-pointer shrink-0 border border-emerald-500/30"
          title="تصدير المستند كملف PDF عالي الدقة مطابق للمعاينة 100% بخطوط عربية سليمة (الخيار المعتمد)"
        >
          <FileText className="w-4 h-4 text-emerald-100" />
          <span className="hidden sm:inline">PDF كصورة (المعتمد)</span>
          <span className="sm:hidden">تصدير PDF</span>
          <span className="hidden md:inline-block text-[9px] bg-emerald-800/80 text-emerald-100 px-1.5 py-0.2 rounded font-bold">
            أفضل ثبات
          </span>
        </button>

        {/* Export Dropdown Menu (PDF, Word, PNG Current, PNG All) */}
        <div className="relative shrink-0" ref={exportMenuRef}>
          <button
            onClick={() => setIsExportOpen(!isExportOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-lg transition-colors cursor-pointer"
            title="خيارات التصدير الشاملة"
          >
            <Save className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            <span>تصدير</span>
            <ChevronDown className="w-3 h-3 opacity-70" />
          </button>

          {isExportOpen && (
            <div className="absolute right-0 top-full mt-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl py-2 z-50 w-72 text-right animate-in fade-in zoom-in-95 duration-150">
              {/* Explanatory Info Header */}
              <div className="mx-2 mb-2 p-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-lg text-[10px] text-amber-900 dark:text-amber-200 leading-relaxed">
                <div className="font-bold flex items-center gap-1 mb-0.5 text-amber-800 dark:text-amber-300">
                  <Sparkles className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>دليل فرق صيغ التصدير:</span>
                </div>
                <div>• <b>PDF كصورة:</b> الشكل الأفضل والمطابق للمعاينة 100% بأعلى ثبات.</div>
                <div>• <b>PDF نص حي:</b> نصوص قابلة للنسخ والبحث مع دقة طباعية عالية.</div>
                <div>• <b>PNG:</b> صور عالية الدقة لكل صفحة.</div>
              </div>

              <div className="px-3 py-1 text-[10px] font-extrabold text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-700/50 mb-1">
                صيغ المستندات والملفات (PDF & Docs)
              </div>
              <button
                onClick={() => {
                  setIsExportOpen(false);
                  onExportPdf();
                }}
                className="w-full text-right px-3.5 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2.5 cursor-pointer"
              >
                <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span>تصدير PDF كصورة (المعتمد)</span>
                    <span className="text-[9px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-1 py-0.2 rounded font-bold">مطابق للمعاينة</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-normal">دقة طباعية ثابتة وشكل مثالي 100%</span>
                </div>
              </button>
              {onExportPdfV2 && (
                <button
                  onClick={() => {
                    setIsExportOpen(false);
                    onExportPdfV2();
                  }}
                  className="w-full text-right px-3.5 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2.5 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-violet-600 shrink-0" />
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span>PDF نص حي (تجريبي)</span>
                      <span className="text-[9px] bg-violet-100 dark:bg-violet-950/80 text-violet-800 dark:text-violet-300 px-1 py-0.2 rounded font-bold">نص حي V2</span>
                    </div>
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-normal">نصوص قابلة للنسخ والبحث مع مطابقة تامة بدون أي تشويه</span>
                  </div>
                </button>
              )}
              <button
                onClick={() => {
                  setIsExportOpen(false);
                  onExportWord();
                }}
                className="w-full text-right px-3.5 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2.5 cursor-pointer"
              >
                <FileCode className="w-4 h-4 text-blue-600 shrink-0" />
                <span>تصدير Word (.doc)</span>
              </button>
              
              <div className="px-3 py-1 text-[10px] font-extrabold text-slate-400 dark:text-slate-500 border-t border-b border-slate-100 dark:border-slate-700/50 my-1">
                صور عالية الدقة (PNG)
              </div>
              <button
                onClick={() => {
                  setIsExportOpen(false);
                  onExportPngCurrentPage();
                }}
                className="w-full text-right px-3.5 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2.5 cursor-pointer"
              >
                <ImageIcon className="w-4 h-4 text-purple-600 shrink-0" />
                <div className="flex flex-col">
                  <span>تصدير الصفحة الحالية (صورة PNG)</span>
                  <span className="text-[10px] text-slate-400 font-normal">دقة عالية - تطابق المعاينة 100%</span>
                </div>
              </button>
              <button
                onClick={() => {
                  setIsExportOpen(false);
                  onExportPngAllPages();
                }}
                className="w-full text-right px-3.5 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2.5 cursor-pointer"
              >
                <ImageIcon className="w-4 h-4 text-indigo-600 shrink-0" />
                <div className="flex flex-col">
                  <span>تصدير جميع الصفحات (صور PNG)</span>
                  <span className="text-[10px] text-slate-400 font-normal">تحميل كل صفحة كملف PNG مستقل</span>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Grouping Engine Options Button & Menu */}
        {onGroupingEnabledChange && (
          <div className="relative shrink-0 z-50" ref={groupingMenuRef} data-popover="grouping">
            <button
              onClick={() => setIsGroupingMenuOpen(!isGroupingMenuOpen)}
              className={`flex items-center gap-1.5 px-3 py-1.5 font-bold text-xs rounded-lg transition-colors cursor-pointer border ${
                groupingEnabled
                  ? "bg-blue-50 dark:bg-blue-950/60 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 shadow-2xs"
                  : "bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
              }`}
              title="محرك تجميع الأسئلة والتمارين تحت جذر موحد وشبكة مدمجة"
            >
              <Layers className={`w-4 h-4 ${groupingEnabled ? "text-blue-600 dark:text-blue-400" : "text-slate-500"}`} />
              <span className="hidden sm:inline">تجميع الأسئلة (Grouping)</span>
              <span className="sm:hidden">تجميع</span>
              {groupingEnabled && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
              )}
              <ChevronDown className="w-3 h-3 opacity-70" />
            </button>

            {isGroupingMenuOpen && (
              <div
                className="absolute right-0 top-full mt-2 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-3.5 z-[100] w-76 text-right animate-in fade-in zoom-in-95 duration-150 space-y-3.5 ring-1 ring-black/10 select-none"
                onClick={(e) => e.stopPropagation()}
                data-popover="grouping-content"
              >
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2">
                  <div className="flex items-center gap-1.5 font-extrabold text-xs text-slate-800 dark:text-slate-100">
                    <LayoutGrid className="w-4 h-4 text-blue-600" />
                    <span>محرك تجميع الأسئلة (Grouping Engine)</span>
                  </div>
                </div>

                {/* Enable / Disable Toggle */}
                <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">تفعيل التجميع الذكي</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">تجميع الأسئلة المشتركة تحت رأس موحد</span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onGroupingEnabledChange(!groupingEnabled);
                    }}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${
                      groupingEnabled ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-600"
                    }`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                        groupingEnabled ? "-translate-x-4" : "-translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                {groupingEnabled && (
                  <>
                    {/* Columns Count */}
                    {onGroupingColumnsChange && (
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block">
                          توزيع أعمدة الشبكة (Grid Columns):
                        </label>
                        <div className="grid grid-cols-4 gap-1">
                          {(["auto", 2, 3, 4] as const).map((col) => (
                            <button
                              key={col}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onGroupingColumnsChange(col);
                              }}
                              className={`py-1 text-[11px] font-bold rounded border transition-colors cursor-pointer ${
                                groupingColumns === col
                                  ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                                  : "bg-slate-50 dark:bg-slate-750 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
                              }`}
                            >
                              {col === "auto" ? "تلقائي" : `${col} أعمدة`}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Numbering Style */}
                    {onGroupingNumberingStyleChange && (
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block">
                          نمط ترقيم التمارين التابعة:
                        </label>
                        <div className="grid grid-cols-3 gap-1">
                          {[
                            { id: "paren-num", label: "(1), (2)..." },
                            { id: "paren-alpha", label: "(أ), (ب)..." },
                            { id: "dash", label: "1-, 2-..." },
                          ].map((st) => (
                            <button
                              key={st.id}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onGroupingNumberingStyleChange(st.id as SubItemNumberingStyle);
                              }}
                              className={`py-1 text-[11px] font-bold rounded border transition-colors cursor-pointer ${
                                groupingNumberingStyle === st.id
                                  ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                                  : "bg-slate-50 dark:bg-slate-750 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
                              }`}
                            >
                              {st.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Density */}
                    {onGroupingDensityChange && (
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block">
                          كثافة توزيع الأسئلة والمسافات:
                        </label>
                        <div className="grid grid-cols-3 gap-1">
                          {[
                            { id: "compact", label: "مدمج" },
                            { id: "normal", label: "عادي" },
                            { id: "spaced", label: "متباعد" },
                          ].map((den) => (
                            <button
                              key={den.id}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onGroupingDensityChange(den.id as GroupingDensity);
                              }}
                              className={`py-1 text-[10px] font-bold rounded border transition-colors cursor-pointer ${
                                groupingDensity === den.id
                                  ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                                  : "bg-slate-50 dark:bg-slate-750 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
                              }`}
                            >
                              {den.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {extraToolbarContent && (
          <>
            <div className="w-px h-5 bg-slate-300 dark:bg-slate-700 mx-0.5 shrink-0 hidden sm:block"></div>
            <div className="flex items-center gap-1.5 shrink-0">{extraToolbarContent}</div>
          </>
        )}

        <div className="w-px h-5 bg-slate-300 dark:bg-slate-700 mx-0.5 shrink-0 hidden sm:block"></div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onZoomChange(Math.max(0.25, Math.round((zoom - 0.1) * 10) / 10))}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
            title="تصغير"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={() => onZoomChange(Math.min(3, Math.round((zoom + 0.1) * 10) / 10))}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
            title="تكبير"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <select
            value={zoom}
            onChange={(e) => onZoomChange(Number(e.target.value))}
            className="border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1 text-xs font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 outline-none w-20 cursor-pointer"
          >
            <option value={0.5}>50%</option>
            <option value={0.75}>75%</option>
            <option value={1}>100%</option>
            <option value={1.25}>125%</option>
            <option value={1.5}>150%</option>
            <option value={2}>200%</option>
          </select>
        </div>

        {onViewModeChange && (
          <>
            <div className="w-px h-5 bg-slate-300 dark:bg-slate-700 mx-0.5 shrink-0 hidden md:block"></div>
            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-0.5 rounded-lg text-xs font-bold border border-slate-300 dark:border-slate-700 shrink-0">
              <button
                onClick={() => onViewModeChange("single")}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  viewMode === "single"
                    ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                صفحة واحدة
              </button>
              <button
                onClick={() => onViewModeChange("continuous")}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  viewMode === "continuous"
                    ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                عرض متسلسل
              </button>
            </div>
          </>
        )}

        {onOrientationChange && (
          <>
            <div className="w-px h-5 bg-slate-300 dark:bg-slate-700 mx-0.5 shrink-0 hidden md:block"></div>
            {/* Page Orientation Toggle */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-0.5 rounded-lg text-xs font-bold border border-slate-300 dark:border-slate-700 shrink-0">
              <button
                onClick={() => onOrientationChange("portrait")}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  orientation === "portrait"
                    ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                عمودي
              </button>
              <button
                onClick={() => onOrientationChange("landscape")}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  orientation === "landscape"
                    ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                أفقي
              </button>
            </div>
          </>
        )}

        {onPageChange && (viewMode === "single" || !onViewModeChange) && (
          <>
            <div className="w-px h-5 bg-slate-300 dark:bg-slate-700 mx-0.5 shrink-0 hidden md:block"></div>
            {/* Pagination Controls */}
            <div className="flex items-center gap-1 shrink-0" dir="ltr">
              <button
                onClick={() => onPageChange(1)}
                disabled={currentPage === 1}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300 disabled:opacity-30 transition-colors cursor-pointer"
                title="الصفحة الأولى"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300 disabled:opacity-30 transition-colors cursor-pointer"
                title="الصفحة السابقة"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-extrabold px-2 min-w-[3.2rem] text-center text-slate-700 dark:text-slate-200">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300 disabled:opacity-30 transition-colors cursor-pointer"
                title="الصفحة التالية"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => onPageChange(totalPages)}
                disabled={currentPage === totalPages}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300 disabled:opacity-30 transition-colors cursor-pointer"
                title="الصفحة الأخيرة"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </>
        )}
      </div>

      <div className="flex items-center gap-1 shrink-0 mr-auto">
        {onToggleFullscreen && (
          <button
            onClick={onToggleFullscreen}
            className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
            title={isFullscreen ? "تصغير الشاشة" : "ملء الشاشة"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        )}

        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors cursor-pointer"
            title="إغلاق المعاينة (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
};
