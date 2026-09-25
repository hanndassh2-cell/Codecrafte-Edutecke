import React, { useState } from "react";
import { X, Search } from "lucide-react";
import { CARD_TYPES } from "./EditorPanel";

interface ContentPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (type: string) => void;
}

const CATEGORIES = [
  { id: "content", label: "محتوى (شرح، مفاهيم، صور، أمثلة)" },
  { id: "assessment", label: "تعليم وتقييم (أنشطة، أسئلة)" },
  { id: "import", label: "استيراد ذكي (ذكاء اصطناعي، Word، لصق ذكي)" },
];

export const ContentPickerModal: React.FC<ContentPickerModalProps> = ({
  isOpen,
  onClose,
  onSelect,
}) => {
  const [searchQuery, setSearchQuery] = useState("");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">إضافة محتوى جديد</h3>
            <span className="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 px-2 py-0.5 rounded-full font-bold">10+ أنواع عناصر</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 shrink-0 relative">
          <Search className="absolute right-7 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            autoFocus
            placeholder="ابحث عن نوع المحتوى (عنوان، أهداف، مفاهيم، صور، جداول، معادلات، أنشطة، أسئلة)..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl py-3 pr-11 pl-4 text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-500 font-medium"
          />
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {CATEGORIES.map(category => {
            const categoryCards = CARD_TYPES.filter(c => {
              if (searchQuery && !c.label.includes(searchQuery) && !(c.description || "").includes(searchQuery)) return false;
              if (category.id === "content" && ["title", "objectives", "explanation", "concepts", "math", "equation", "experiment", "images", "image", "tables", "table", "video", "notes", "examples", "page-break"].includes(c.type)) return true;
              if (category.id === "assessment" && ["activities", "questions"].includes(c.type)) return true;
              if (category.id === "import" && ["ai_import", "word_import", "smart_paste", "lesson_template"].includes(c.type)) return true;
              return false;
            });

            if (categoryCards.length === 0) return null;

            return (
              <div key={category.id}>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">{category.label}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {categoryCards.map(c => {
                    const Icon = c.icon;
                    return (
                      <button
                        key={c.type}
                        onClick={() => {
                          onSelect(c.type);
                          onClose();
                          setSearchQuery("");
                        }}
                        className="flex items-start gap-3.5 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 hover:border-blue-500 hover:shadow-md bg-white dark:bg-slate-900 transition-all text-right group"
                      >
                        <div className={`p-2.5 rounded-xl shrink-0 ${c.color} transition-transform group-hover:scale-105`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-slate-800 dark:text-slate-200 text-sm mb-0.5 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{c.label}</div>
                          <div className="text-xs text-slate-500 leading-relaxed truncate">{c.description || "محتوى تعليمي"}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
