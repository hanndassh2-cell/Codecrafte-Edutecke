import React, { useEffect, useState, useRef } from "react";
import { FloatingCardContextMenu } from "./FloatingCardContextMenu";
import { 
  GripVertical, Eye, EyeOff, MoreVertical, ChevronUp, ChevronDown, Lock, Copy, ArrowUp, ArrowDown, Settings, Trash2, Sparkles, X
} from "lucide-react";

export interface CardShellProps {
  p: any;
  index: number;
  totalCards: number;
  cardInfo: any;
  cardTypesList: any[];
  isDragged: boolean;
  isActive: boolean;
  isCollapsed: boolean;
  setActiveParagraphId: (id: string) => void;
  onRequestEditorFocus?: (id: string, position?: "start" | "end") => void;
  handleDragStart: (e: any, index: number) => void;
  handleDragOver: (e: any, index: number) => void;
  handleDragEnd: (e: any) => void;
  updateParagraph: (id: string, field: string, value: any) => void;
  toggleCollapse: (id: string) => void;
  duplicateParagraph?: (id: string) => void;
  moveParagraph?: (id: string, dir: "up" | "down") => void;
  deleteParagraph?: (id: string) => void;
  setShowAISolver: (val: boolean) => void;
  readOnly?: boolean;
  children: React.ReactNode;
}

export const CardShell: React.FC<CardShellProps> = ({
  p,
  index,
  totalCards,
  cardInfo,
  cardTypesList,
  isDragged,
  isActive,
  isCollapsed,
  setActiveParagraphId,
  onRequestEditorFocus,
  handleDragStart,
  handleDragOver,
  handleDragEnd,
  updateParagraph,
  toggleCollapse,
  duplicateParagraph,
  moveParagraph,
  deleteParagraph,
  setShowAISolver,
  readOnly = false,
  children,
}) => {
  const Icon = cardInfo.icon || (() => null);
  const guideText = cardInfo.description || "";
  
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const triggerBtnRef = useRef<HTMLButtonElement>(null);
  
  // Local state for locked status.
  const [isLocked, setIsLocked] = useState(p.isLocked || false);
  const [draftTitle, setDraftTitle] = useState(p.title || cardInfo.label || "");

  useEffect(() => {
    setDraftTitle(p.title || cardInfo.label || "");
  }, [p.title, cardInfo.label]);

  const commitTitle = () => {
    const nextTitle = draftTitle.trim() || cardInfo.label;
    setDraftTitle(nextTitle);
    if (nextTitle !== p.title) updateParagraph(p.id, "title", nextTitle);
  };

  return (
    <div
      data-lesson-card-id={p.id}
      onClick={(e) => { e.stopPropagation(); setActiveParagraphId(p.id); }}
      onDragOver={(e) => !readOnly && handleDragOver(e, index)}
      style={{ "--card-line-spacing": `${p.lineSpacing || 0}px` } as React.CSSProperties}
      className={`lesson-card group relative my-2 flex cursor-text flex-col overflow-visible rounded-lg transition-all duration-150 ${
        isDragged
          ? "opacity-50 border-2 border-blue-400 border-dashed"
          : isActive
            ? "border border-blue-300/90 bg-white shadow-sm dark:border-blue-700/80 dark:bg-slate-900"
            : p.customColor
              ? p.customColor.includes("blue")
                ? "bg-blue-50/20 dark:bg-blue-950/10 border border-blue-300/80 dark:border-blue-800/80 shadow-2xs"
                : p.customColor.includes("emerald")
                  ? "bg-emerald-50/20 dark:bg-emerald-950/10 border border-emerald-300/80 dark:border-emerald-800/80 shadow-2xs"
                  : p.customColor.includes("rose")
                    ? "bg-rose-50/20 dark:bg-rose-950/10 border border-rose-300/80 dark:border-rose-800/80 shadow-2xs"
                    : p.customColor.includes("amber")
                      ? "bg-amber-50/20 dark:bg-amber-950/10 border border-amber-300/80 dark:border-amber-800/80 shadow-2xs"
                      : p.customColor.includes("purple")
                        ? "bg-purple-50/20 dark:bg-purple-950/10 border border-purple-300/80 dark:border-purple-800/80 shadow-2xs"
                        : "bg-slate-50/30 dark:bg-slate-800/30 border border-slate-300 dark:border-slate-700 shadow-2xs"
              : "border border-transparent bg-white hover:border-slate-200 hover:shadow-sm dark:bg-slate-900 dark:hover:border-slate-700"
      }`}
    >
      {/* Right Margin Word Selection Strip */}
      <div
        onClick={(e) => { e.stopPropagation(); setActiveParagraphId(p.id); }}
        className={`lesson-card-selection-strip absolute right-0 top-0 bottom-0 w-1 rounded-r-md transition-colors cursor-pointer z-20 ${
          isActive ? "bg-blue-600 dark:bg-blue-500" : "bg-transparent group-hover:bg-slate-300 dark:group-hover:bg-slate-700"
        }`}
        title="تحديد الفقرة"
      />

      {/* Header Container - ALWAYS VISIBLE */}
      <div
        className={`lesson-card-header sticky top-0 z-20 flex cursor-default items-center justify-between rounded-t-lg px-2 py-1 transition-all backdrop-blur-xl ${
          isActive
            ? "border-b border-blue-100 bg-blue-50/70 dark:border-blue-900/70 dark:bg-blue-950/30"
            : "border-b border-transparent bg-white/90 group-hover:bg-slate-50/90 dark:bg-slate-900/90 dark:group-hover:bg-slate-800/70"
        }`}
      >
        <div className="flex items-center gap-2 w-full min-w-0">
          <div
            data-card-drag-handle
            draggable={!readOnly}
            onDragStart={(e) => {
              if (readOnly) return;
              e.stopPropagation();
              handleDragStart(e, index);
            }}
            onDragEnd={(e) => {
              e.stopPropagation();
              if (!readOnly) handleDragEnd(e);
            }}
            className="cursor-grab p-0.5 text-slate-300 transition hover:text-slate-600 active:cursor-grabbing dark:text-slate-600 dark:hover:text-slate-300"
            title="اسحب من هذا المقبض فقط لإعادة ترتيب البطاقة"
            aria-label="مقبض إعادة ترتيب البطاقة"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </div>
          <div className={`p-1 rounded-md bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 text-blue-600 dark:text-blue-400 flex-shrink-0 ${p.customColor || cardInfo.color}`}>
            <Icon className="w-3.5 h-3.5" />
          </div>
          
          {/* Card title: directly editable on the active card, like a document heading. */}
          <div className="flex items-center gap-2 flex-1 min-w-0 py-0.5">
            {isActive && !isCollapsed && !readOnly ? (
              <input
                value={draftTitle}
                onChange={(event) => setDraftTitle(event.target.value)}
                onClick={(event) => event.stopPropagation()}
                onFocus={() => setActiveParagraphId(p.id)}
                onBlur={commitTitle}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || (event.key === "Tab" && !event.shiftKey)) {
                    event.preventDefault();
                    commitTitle();
                    onRequestEditorFocus?.(p.id, "start");
                    event.currentTarget.blur();
                  } else if (event.key === "Escape") {
                    event.preventDefault();
                    setDraftTitle(p.title || cardInfo.label || "");
                    event.currentTarget.blur();
                  }
                }}
                aria-label="عنوان البطاقة"
                title="عدّل العنوان، ثم اضغط Enter للكتابة في المحتوى"
                className="min-w-0 flex-1 rounded border border-transparent bg-transparent px-1.5 py-1 text-sm font-bold text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-slate-200 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-500/15 dark:text-slate-100 dark:hover:border-slate-700 dark:focus:bg-slate-900"
                placeholder={cardInfo.label}
              />
            ) : (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  if (isCollapsed) toggleCollapse(p.id);
                  setActiveParagraphId(p.id);
                }}
                className="min-w-0 flex-1 cursor-pointer truncate text-right text-sm font-bold text-slate-700 transition-colors hover:text-blue-600 dark:text-slate-200 dark:hover:text-blue-400"
                title={isCollapsed ? "انقر لتوسيع البطاقة" : "انقر لتحديد البطاقة وتعديل عنوانها"}
              >
                {p.title || cardInfo.label}
              </button>
            )}
            
            {/* Short Status */}
            <div className="flex items-center gap-1 shrink-0">
              {p.forceBreakAfter && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200 border border-blue-200 dark:border-blue-800" title="يوجد فاصل صفحة بعد هذه البطاقة">
                  ✂️ فاصل
                </span>
              )}
              {isLocked && <span title="مغلق"><Lock className="w-3 h-3 text-red-500" /></span>}
              {p.isVisible === false && <span title="مخفي من المعاينة والطباعة"><EyeOff className="w-3 h-3 text-amber-500" /></span>}
            </div>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Permanent Expand/Collapse Button (⌄/⌃) - Always Visible */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); toggleCollapse(p.id); }}
            className="p-1 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 text-slate-600 dark:text-slate-300 rounded-md transition cursor-pointer flex items-center justify-center ml-0.5"
            title={isCollapsed ? "توسيع البطاقة" : "طي البطاقة"}
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>

          {/* Secondary Quick Actions - Revealed on Hover/Active */}
          {!readOnly && (
            <div className={`flex items-center gap-0.5 transition-opacity ${isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setShowAISolver(true); }}
                className="p-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-md transition text-indigo-500 cursor-pointer"
                title="مساعد الذكاء الاصطناعي (AI)"
              >
                <Sparkles className="w-3.5 h-3.5" />
              </button>
              
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); updateParagraph(p.id, "isVisible", p.isVisible === false ? true : false); }}
                className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-md transition text-slate-500 dark:text-slate-400 cursor-pointer"
                title={p.isVisible !== false ? "إخفاء من العرض" : "إظهار في العرض"}
              >
                {p.isVisible !== false ? <Eye className="w-3.5 h-3.5 text-emerald-500" /> : <EyeOff className="w-3.5 h-3.5" />}
              </button>
              
              {/* Context Menu Toggle (⋯) */}
              <div className="relative">
                <button
                  ref={triggerBtnRef}
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setIsMoreMenuOpen(!isMoreMenuOpen); }}
                  className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-md transition text-slate-500 dark:text-slate-400 cursor-pointer"
                  title="مزيد من الخيارات"
                >
                  <MoreVertical className="w-3.5 h-3.5" />
                </button>

                <FloatingCardContextMenu
                  isOpen={isMoreMenuOpen}
                  onClose={() => setIsMoreMenuOpen(false)}
                  triggerRef={triggerBtnRef}
                  isLocked={isLocked}
                  onToggleLock={() => setIsLocked(!isLocked)}
                  onDuplicate={duplicateParagraph ? () => duplicateParagraph(p.id) : undefined}
                  onDelete={deleteParagraph ? () => setShowDeleteConfirm(true) : undefined}
                  onMoveUp={moveParagraph && index > 0 ? () => moveParagraph(p.id, "up") : undefined}
                  onMoveDown={moveParagraph && index < totalCards - 1 ? () => moveParagraph(p.id, "down") : undefined}
                  onToggleVisibility={() => updateParagraph(p.id, "isVisible", p.isVisible === false ? true : false)}
                  isVisible={p.isVisible !== false}
                  onOpenSettings={() => setShowSettings(!showSettings)}
                />
              </div>
            </div>
          )}
        </div>
      </div>
      
      {showSettings && (
        <div className="p-4 bg-slate-50 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs font-bold animate-in slide-in-from-top-2 duration-200 relative">
          <button 
            onClick={() => setShowSettings(false)}
            className="absolute top-2 left-2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
          
          {/* Card Line Spacing */}
          <div>
            <label className="block text-slate-500 dark:text-slate-400 mb-1.5 font-bold">
              تباعد الأسطر داخل البطاقة
              <span className="mr-2 px-1.5 py-0.5 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 rounded font-mono text-[10px]">
                {p.lineSpacing || 0}
              </span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0"
                max="30"
                step="1"
                value={p.lineSpacing || 0}
                onChange={(e) => updateParagraph(p.id, "lineSpacing", parseInt(e.target.value))}
                className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => updateParagraph(p.id, "lineSpacing", 0)}
                className="text-[9px] text-slate-400 hover:text-slate-600 cursor-pointer"
                title="إعادة التعيين (0)"
              >
                تلقائي
              </button>
            </div>
          </div>

          {/* 1. Change Card Type */}
          <div>
            <label className="block text-slate-500 dark:text-slate-400 mb-1.5">نوع البطاقة</label>
            <select
              value={p.type}
              onChange={(e) => {
                const newType = e.target.value;
                updateParagraph(p.id, "type", newType);
                const newCardInfo = cardTypesList.find((c: any) => c.type === newType);
                if (newCardInfo) {
                  updateParagraph(p.id, "title", newCardInfo.label);
                }
              }}
              className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-2xs cursor-pointer"
            >
              {cardTypesList.map((c: any) => (
                <option key={c.type} value={c.type}>{c.label}</option>
              ))}
            </select>
          </div>
          {/* 2. Card Background Color */}
          <div>
            <label className="block text-slate-500 dark:text-slate-400 mb-1.5">لون البطاقة</label>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); updateParagraph(p.id, "customColor", undefined); }}
                className={`w-6 h-6 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center text-[10px] text-slate-500 hover:scale-105 transition-all cursor-pointer ${
                  !p.customColor ? "ring-2 ring-blue-500 scale-110 border-blue-600 font-bold" : ""
                }`}
                title="تلقائي / بدون لون"
              >
                ✕
              </button>
              {[
                { name: "أزرق", val: "bg-blue-50 text-blue-600 border-blue-200" },
                { name: "أخضر", val: "bg-emerald-50 text-emerald-600 border-emerald-200" },
                { name: "أحمر", val: "bg-rose-50 text-rose-600 border-rose-200" },
                { name: "أصفر", val: "bg-amber-50 text-amber-600 border-amber-200" },
                { name: "بنفسجي", val: "bg-purple-50 text-purple-600 border-purple-200" },
                { name: "رمادي", val: "bg-slate-50 text-slate-700 border-slate-200" },
              ].map((colorObj) => (
                <button
                  key={colorObj.val}
                  onClick={(e) => { e.stopPropagation(); updateParagraph(p.id, "customColor", colorObj.val); }}
                  className={`w-6 h-6 rounded-full border-2 transition-all cursor-pointer ${colorObj.val.split(" ")[0]} ${
                    p.customColor === colorObj.val ? "ring-2 ring-blue-500 scale-110 border-blue-600" : "border-slate-300 dark:border-slate-600 hover:scale-105"
                  }`}
                  title={colorObj.name}
                />
              ))}
            </div>
          </div>
          {/* 3. Print Options */}
          <div>
            <label className="block text-slate-500 dark:text-slate-400 mb-1.5">إعدادات الطباعة</label>
            <label className="flex items-center gap-2 text-slate-700 dark:text-slate-200 cursor-pointer pt-1 mb-2">
              <input
                type="checkbox"
                checked={p.hideInPrint !== true}
                onChange={(e) => updateParagraph(p.id, "hideInPrint", !e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
              />
              <span>إظهار البطاقة في الطباعة</span>
            </label>
            <label className="flex items-center gap-2 text-slate-700 dark:text-slate-200 cursor-pointer pt-1" title="إظهار سلم التصحيح في صفحة الطالب. مخفي تلقائياً.">
              <input
                type="checkbox"
                checked={p.showAnswerKey === true}
                onChange={(e) => updateParagraph(p.id, "showAnswerKey", e.target.checked)}
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
              />
              <span>عرض سلم التصحيح للأسئلة</span>
            </label>
          </div>
          {/* 4. Page Break Option */}
          <div>
            <label className="block text-slate-500 dark:text-slate-400 mb-1.5">تخطيط الصفحات A4</label>
            <label className="flex items-center gap-2 text-slate-700 dark:text-slate-200 cursor-pointer pt-1" title="إجبار بداية صفحة جديدة بعد هذه البطاقة مباشرة في المعاينة والطباعة">
              <input
                type="checkbox"
                checked={p.forceBreakAfter === true}
                onChange={(e) => updateParagraph(p.id, "forceBreakAfter", e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
              />
              <span>فاصل صفحة بعد البطاقة ✂️</span>
            </label>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="p-4 bg-rose-50 dark:bg-rose-900/30 border-b border-rose-200 dark:border-rose-800 flex items-center justify-between animate-in slide-in-from-top-2">
          <span className="text-sm font-bold text-rose-700 dark:text-rose-300">هل أنت متأكد من حذف هذه البطاقة؟</span>
          <div className="flex gap-2">
            <button onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(false); }} className="px-3 py-1 text-xs bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 font-bold hover:bg-slate-50 dark:hover:bg-slate-700">إلغاء</button>
            <button onClick={(e) => { e.stopPropagation(); deleteParagraph?.(p.id); }} className="px-3 py-1 text-xs bg-rose-600 text-white rounded font-bold hover:bg-rose-700">نعم، احذف</button>
          </div>
        </div>
      )}

      {/* Internal Content (Specialized Content Area) */}
      <div className={`relative ${isLocked ? 'pointer-events-none opacity-90' : ''}`}>
        {children}
      </div>

    </div>
  );
};
