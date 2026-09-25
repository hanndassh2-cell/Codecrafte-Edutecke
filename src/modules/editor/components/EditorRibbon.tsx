import React, { useEffect, useState } from "react";
import {
  Save,
  Plus,
  FileText,
  FileDown,
  Printer,
  Maximize2,
  BookOpen,
  PanelLeft,
  PanelRight,
  Sparkles,
  Wand2,
  MoreHorizontal,
  LayoutTemplate,
  Sliders,
  ChevronDown,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

export const EditorRibbon = ({
  lastSaved,
  onSave,
  onExportWord,
  onExportPdf,
  onPrint,
  activeMainTab,
  setActiveMainTab,
  onPreview,
  isFocusReadingMode,
  setIsFocusReadingMode,
  onToggleNav,
  onTogglePreview,
  isNavCollapsed,
  isPreviewCollapsed,
  cardsZoomLevel = 100,
  setCardsZoomLevel,
  zoomLevel = 100,
  setZoomLevel,
  setIsAiAssistantOpen,
  setIsQuestionHubOpen,
  setQuestionHubTab,
  onInsertAction,
  onOpenCardPicker,
  readOnly = false,
}: any) => {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const handleCardsZoomChange = (val: number) => {
    const clamped = Math.min(200, Math.max(40, val));
    if (setCardsZoomLevel) setCardsZoomLevel(clamped);
    else if (setZoomLevel) setZoomLevel(clamped);
  };

  const currentCardsZoom = Math.round(cardsZoomLevel || zoomLevel || 100);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as Element).closest(".ribbon-dropdown")) {
        setActiveMenu(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleMenu = (menu: string) => {
    setActiveMenu(activeMenu === menu ? null : menu);
  };

  const DropdownItem = ({ icon, text, onClick }: any) => (
    <button
      onClick={(e) => {
        onClick(e);
        setActiveMenu(null);
      }}
      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-right font-bold cursor-pointer"
    >
      {icon && <span className="text-slate-500">{icon}</span>}
      <span>{text}</span>
    </button>
  );

  const zoomPresets = [50, 75, 90, 100, 110, 125, 150, 200];

  return (
    <div className="sticky top-0 z-[100] flex shrink-0 select-none items-center justify-between gap-2 overflow-x-auto border-b border-slate-200/90 bg-white/95 px-3 py-1.5 text-xs shadow-sm backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/95">
      {/* Right Side (RTL): Primary Document Actions */}
      <div className="flex shrink-0 items-center gap-1.5">
        {!readOnly && onSave && (
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={onSave}
              className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-extrabold text-white shadow-sm transition-all hover:bg-blue-700"
              title="حفظ التغييرات (Ctrl+S)"
            >
              <Save className="h-4 w-4" />
              <span>حفظ</span>
            </button>
            <span className="hidden max-w-[130px] truncate text-[11px] font-medium text-slate-500 2xl:inline dark:text-slate-400" title={lastSaved ? `آخر حفظ: ${lastSaved}` : "لم يُحفظ بعد"}>
              {lastSaved ? `تم الحفظ ${lastSaved}` : "لم يُحفظ بعد"}
            </span>
          </div>
        )}

        {/* One primary insertion path, shared with the document canvas. */}
        {!readOnly && (
          <button
            onClick={onOpenCardPicker}
            className="flex cursor-pointer items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-extrabold text-blue-700 transition-colors hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/60"
            title="إضافة بطاقة في نهاية الدرس"
          >
            <Plus className="h-4 w-4" />
            <span>إضافة بطاقة</span>
          </button>
        )}

        {/* Insert Elements Menu */}
        {!readOnly && (
          <div className="relative ribbon-dropdown">
            <button
              onClick={() => toggleMenu("insert")}
              className="flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700/80"
            >
              <LayoutTemplate className="w-4 h-4 text-slate-600" />
              <span>إدراج</span>
            </button>
            {activeMenu === "insert" && (
              <div className="absolute top-full right-0 mt-1 w-52 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 py-1 flex flex-col z-50 animate-in fade-in zoom-in-95">
                <DropdownItem icon={<FileText className="w-4 h-4 text-slate-600" />} text="هيكل درس كامل" onClick={() => onInsertAction?.("lesson_template")} />
                {setActiveMainTab && (
                  <DropdownItem icon={<Sliders className="w-4 h-4 text-blue-500" />} text="إعداد الصفحة والقالب" onClick={() => setActiveMainTab("page_setup")} />
                )}
              </div>
            )}
          </div>
        )}

        {/* Smart AI Menu */}
        {!readOnly && (
          <div className="relative ribbon-dropdown">
            <button
              onClick={() => toggleMenu("ai")}
              className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-2.5 py-1.5 text-xs font-extrabold text-purple-700 transition-colors hover:bg-purple-100 dark:border-purple-800 dark:bg-purple-950/40 dark:text-purple-300 dark:hover:bg-purple-900/60"
            >
              <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span>الذكاء الاصطناعي</span>
            </button>
            {activeMenu === "ai" && (
              <div className="absolute top-full right-0 mt-1 w-56 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 py-1 flex flex-col z-50 animate-in fade-in zoom-in-95">
                <DropdownItem icon={<Sparkles className="w-4 h-4 text-purple-500" />} text="المساعد الذكي (Chat)" onClick={() => setIsAiAssistantOpen?.(true)} />
                <DropdownItem icon={<Wand2 className="w-4 h-4 text-purple-500" />} text="مولد الاختبارات" onClick={() => { setQuestionHubTab?.("builder"); setIsQuestionHubOpen?.(true); }} />
              </div>
            )}
          </div>
        )}

        {/* Divider */}
        {!readOnly && <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-1 shrink-0"></div>}

        {/* Layout View Mode Toggles */}
        <div className="flex shrink-0 items-center gap-0.5 rounded-lg border border-slate-200/80 bg-slate-50 p-0.5 dark:border-slate-700/80 dark:bg-slate-800/60">
          {setIsFocusReadingMode && (
            <button
              onClick={() => setIsFocusReadingMode(!isFocusReadingMode)}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isFocusReadingMode
                  ? "bg-blue-600 text-white shadow-2xs"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700"
              }`}
              title="وضع القراءة والتركيز"
            >
              <BookOpen className="w-4 h-4" />
            </button>
          )}

          {onToggleNav && (
            <button
              onClick={onToggleNav}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                !isNavCollapsed
                  ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700"
              }`}
              title="إظهار / إخفاء شريط المنهج"
            >
              <PanelLeft className="w-4 h-4" />
            </button>
          )}

          {onTogglePreview && (
            <button
              onClick={onTogglePreview}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                !isPreviewCollapsed
                  ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700"
              }`}
              title="إظهار / إخفاء المعاينة المباشرة"
            >
              <PanelRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Center: Main Tab Switcher (محتوى الدرس VS إعداد الصفحة والقالب) */}
      {setActiveMainTab && (
        <div className="mx-auto flex shrink-0 items-center gap-0.5 rounded-lg border border-slate-200 bg-slate-100 p-0.5 dark:border-slate-700/80 dark:bg-slate-800/90">
          <button
            type="button"
            onClick={() => setActiveMainTab("content")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
              activeMainTab !== "page_setup"
                ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs border border-slate-200/80 dark:border-slate-700"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
            title="محرر محتوى المستند والبطاقات"
          >
            <FileText className="w-4 h-4" />
            <span>محتوى الدرس</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMainTab("page_setup")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
              activeMainTab === "page_setup"
                ? "bg-blue-600 text-white shadow-2xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
            title="إعدادات الصفحة، الهوامش، الورقة، الهيدر والفوتر والقوالب"
          >
            <Sliders className="w-4 h-4 text-amber-300" />
            <span>إعداد الصفحة</span>
          </button>
        </div>
      )}

      {/* Left Side (RTL): Cards Zoom & More Options */}
      <div className="flex shrink-0 items-center gap-1.5">
        {/* Cards Zoom Control (تكبير/تصغير البطاقات) */}
        <div className="flex items-center gap-0.5 rounded-lg border border-slate-200 bg-slate-50 px-1 py-0.5 shadow-2xs dark:border-slate-700 dark:bg-slate-800/90">
          <button
            onClick={() => handleCardsZoomChange(currentCardsZoom - 10)}
            className="p-1 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-slate-700 transition cursor-pointer"
            title="تصغير البطاقات (-10%)"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <div className="relative ribbon-dropdown">
            <button
              onClick={() => toggleMenu("cardsZoom")}
              className="flex items-center gap-0.5 text-[11px] font-black text-slate-700 dark:text-slate-200 px-1.5 py-0.5 rounded hover:bg-slate-200/60 dark:hover:bg-slate-700 cursor-pointer"
            >
              <span>{currentCardsZoom}%</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>
            {activeMenu === "cardsZoom" && (
              <div className="absolute top-full left-0 mt-1 w-24 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 py-1 flex flex-col z-50 animate-in fade-in zoom-in-95">
                {zoomPresets.map((pz) => (
                  <button
                    key={pz}
                    onClick={() => {
                      handleCardsZoomChange(pz);
                      setActiveMenu(null);
                    }}
                    className={`px-3 py-1 text-xs font-bold text-right hover:bg-blue-50 dark:hover:bg-blue-900/40 cursor-pointer ${
                      pz === currentCardsZoom ? "text-blue-600 font-black bg-blue-50/50" : "text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {pz}%
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => handleCardsZoomChange(currentCardsZoom + 10)}
            className="p-1 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-slate-700 transition cursor-pointer"
            title="تكبير البطاقات (+10%)"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => handleCardsZoomChange(100)}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer"
            title="إعادة ضبط زوم البطاقات 100%"
          >
            <Maximize2 className="w-3 h-3" />
          </button>
        </div>

        {/* More Actions (...) */}
        <div className="relative ribbon-dropdown">
          <button
            onClick={() => toggleMenu("more")}
            className="cursor-pointer rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            title="خيارات إضافية"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
          {activeMenu === "more" && (
            <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 py-1 flex flex-col z-50 animate-in fade-in zoom-in-95">
              <DropdownItem icon={<FileText className="w-4 h-4" />} text="تصدير Word" onClick={onExportWord} />
              <DropdownItem icon={<FileDown className="w-4 h-4" />} text="تصدير PDF" onClick={onExportPdf} />
              <DropdownItem icon={<Printer className="w-4 h-4" />} text="طباعة" onClick={onPrint} />
              <div className="h-px bg-slate-100 dark:bg-slate-800 my-1"></div>
              <DropdownItem icon={<Maximize2 className="w-4 h-4" />} text="معاينة ملء الشاشة" onClick={onPreview} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
