import React, { useEffect, useState, useRef } from "react";
import ReactDOM from "react-dom";
import { 
  Copy, Lock, Unlock, Settings, Trash2, ArrowUp, ArrowDown, ChevronRight, Eye, EyeOff
} from "lucide-react";

export interface FloatingCardContextMenuProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement | null>;
  isLocked: boolean;
  onToggleLock: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onToggleVisibility?: () => void;
  isVisible?: boolean;
  onOpenSettings?: () => void;
}

export const FloatingCardContextMenu: React.FC<FloatingCardContextMenuProps> = ({
  isOpen,
  onClose,
  triggerRef,
  isLocked,
  onToggleLock,
  onDuplicate,
  onDelete,
  onMoveUp,
  onMoveDown,
  onToggleVisibility,
  isVisible = true,
  onOpenSettings,
}) => {
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [showOrderOptions, setShowOrderOptions] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !triggerRef.current) return;

    const calculatePosition = () => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const menuWidth = 200; // 12.5rem = 200px
      const estimatedMenuHeight = 220;

      let top = rect.bottom + 6;
      let left = rect.left;

      // Flip vertically if overflowing bottom of viewport
      if (top + estimatedMenuHeight > window.innerHeight) {
        top = Math.max(10, rect.top - estimatedMenuHeight - 6);
      }

      // Shift horizontally for RTL / viewport edges
      if (left + menuWidth > window.innerWidth - 12) {
        left = window.innerWidth - menuWidth - 12;
      }
      if (left < 12) {
        left = 12;
      }

      setPosition({ top, left });
    };

    calculatePosition();

    const handleScrollOrResize = () => {
      onClose();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current && 
        !menuRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };

    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);
    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, triggerRef, onClose]);

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div 
      ref={menuRef}
      style={{
        position: "fixed",
        top: `${position.top}px`,
        left: `${position.left}px`,
        zIndex: 99999,
      }}
      className="w-52 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 py-1.5 animate-in fade-in zoom-in-95 duration-100 text-right font-sans rtl select-none overflow-hidden"
    >
      {/* 1. تكرار البطاقة */}
      {onDuplicate && (
        <button 
          type="button"
          onClick={(e) => { e.stopPropagation(); onDuplicate(); onClose(); }} 
          className="w-full text-right px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-slate-800 flex items-center justify-between transition cursor-pointer"
        >
          <span>تكرار البطاقة</span>
          <Copy className="w-3.5 h-3.5 text-blue-500 shrink-0" />
        </button>
      )}

      {/* 2. قفل التعديل / إلغاء القفل */}
      <button 
        type="button"
        onClick={(e) => { e.stopPropagation(); onToggleLock(); onClose(); }} 
        className="w-full text-right px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-amber-50 dark:hover:bg-slate-800 flex items-center justify-between transition cursor-pointer"
      >
        <span>{isLocked ? "إلغاء قفل التعديل" : "قفل التعديل"}</span>
        {isLocked ? (
          <Unlock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
        ) : (
          <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        )}
      </button>

      {/* 3. إظهار / إخفاء من المعاينة والطباعة */}
      {onToggleVisibility && (
        <button 
          type="button"
          onClick={(e) => { e.stopPropagation(); onToggleVisibility(); onClose(); }} 
          className="w-full text-right px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between transition cursor-pointer"
        >
          <span>{isVisible ? "إخفاء من العرض والمعاينة" : "إظهار في العرض والمعاينة"}</span>
          {isVisible ? (
            <EyeOff className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          ) : (
            <Eye className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          )}
        </button>
      )}

      {/* 4. إعدادات البطاقة */}
      {onOpenSettings && (
        <button 
          type="button"
          onClick={(e) => { e.stopPropagation(); onOpenSettings(); onClose(); }} 
          className="w-full text-right px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between transition cursor-pointer"
        >
          <span>إعدادات البطاقة</span>
          <Settings className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
        </button>
      )}

      {/* 5. ترتيب البطاقة (تحريك لأعلى/لأسفل مدمج) */}
      {(onMoveUp || onMoveDown) && (
        <div className="border-t border-slate-100 dark:border-slate-800 my-1 pt-1">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setShowOrderOptions(!showOrderOptions); }}
            className="w-full text-right px-3 py-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between transition cursor-pointer"
          >
            <span>ترتيب البطاقة</span>
            <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showOrderOptions ? "rotate-90" : ""}`} />
          </button>

          {showOrderOptions && (
            <div className="bg-slate-50 dark:bg-slate-950/50 py-1 my-0.5 space-y-0.5 animate-in fade-in duration-100">
              {onMoveUp && (
                <button 
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onMoveUp(); onClose(); }} 
                  className="w-full text-right px-4 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 flex items-center justify-between transition cursor-pointer"
                >
                  <span>تحريك للأعلى</span>
                  <ArrowUp className="w-3 h-3 text-slate-400" />
                </button>
              )}
              {onMoveDown && (
                <button 
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onMoveDown(); onClose(); }} 
                  className="w-full text-right px-4 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 flex items-center justify-between transition cursor-pointer"
                >
                  <span>تحريك للأسفل</span>
                  <ArrowDown className="w-3 h-3 text-slate-400" />
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* 6. حذف البطاقة */}
      {onDelete && (
        <div className="border-t border-slate-100 dark:border-slate-800 mt-1 pt-1">
          <button 
            type="button"
            onClick={(e) => { e.stopPropagation(); onDelete(); onClose(); }} 
            className="w-full text-right px-3 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center justify-between transition cursor-pointer"
          >
            <span>حذف البطاقة</span>
            <Trash2 className="w-3.5 h-3.5 text-rose-500 shrink-0" />
          </button>
        </div>
      )}
    </div>,
    document.body
  );
};
