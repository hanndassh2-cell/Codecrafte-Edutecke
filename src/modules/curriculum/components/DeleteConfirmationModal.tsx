import React from "react";
import { AlertTriangle, Trash2, X, Folder, FileText, HelpCircle, BookOpen, Layers } from "lucide-react";

export interface DeleteTargetInfo {
  type: "subject" | "unit" | "lesson";
  id: string;
  title: string;
  childUnitsCount?: number;
  childLessonsCount?: number;
  linkedQuestionsCount?: number;
  contentCardsCount?: number;
}

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | boolean;
  target: DeleteTargetInfo | null;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  target,
}) => {
  const [error, setError] = React.useState<string | null>(null);
  React.useEffect(() => setError(null), [isOpen, target?.id]);
  if (!isOpen || !target) return null;

  const typeNameMap = {
    subject: "مادة دراسية",
    unit: "وحدة تعليمية",
    lesson: "درس تعليمي",
  };

  const typeName = typeNameMap[target.type] || "عنصر";

  const hasLinkedData =
    (target.childUnitsCount || 0) > 0 ||
    (target.childLessonsCount || 0) > 0 ||
    (target.linkedQuestionsCount || 0) > 0 ||
    (target.contentCardsCount || 0) > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      dir="rtl"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between bg-rose-50/50 dark:bg-rose-950/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-200 dark:border-rose-800">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                تأكيد حذف {typeName}
              </h3>
              <p className="text-xs text-rose-600 dark:text-rose-400 font-bold mt-0.5">
                عملية حساسة تؤثر على الهيكل الأكاديمي
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">
              اسم {typeName} المراد حذفها:
            </div>
            <div className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              {target.type === "subject" && <BookOpen className="w-4 h-4 text-primary-500" />}
              {target.type === "unit" && <Folder className="w-4 h-4 text-blue-500" />}
              {target.type === "lesson" && <FileText className="w-4 h-4 text-emerald-500" />}
              <span>{target.title}</span>
            </div>
          </div>

          {target.type === "subject" && <p className="text-sm text-rose-700 dark:text-rose-300">سيحذف هذا الإجراء المادة ووحداتها ودروسها وبطاقات تلك الدروس. تبقى الأسئلة في البنك ويُفك ارتباطها بالمادة والعناصر المحذوفة.</p>}
          {target.type === "unit" && <p className="text-sm text-rose-700 dark:text-rose-300">سيحذف هذا الإجراء الوحدة ودروسها وبطاقات تلك الدروس. تبقى الأسئلة في البنك ويُفك ارتباطها بالوحدة والدروس المحذوفة.</p>}
          {hasLinkedData ? (
            <div className="space-y-2.5">
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                البيانات المرتبطة التي ستتأثر بهذا الإجراء:
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {target.childUnitsCount !== undefined && target.childUnitsCount > 0 && (
                  <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex items-center justify-between">
                    <span className="text-amber-800 dark:text-amber-300 font-bold flex items-center gap-1.5">
                      <Folder className="w-3.5 h-3.5" />
                      <span>الوحدات التابعة</span>
                    </span>
                    <span className="font-black text-amber-900 dark:text-amber-200 bg-amber-100 dark:bg-amber-900/80 px-2 py-0.5 rounded-md">
                      {target.childUnitsCount}
                    </span>
                  </div>
                )}

                {target.childLessonsCount !== undefined && target.childLessonsCount > 0 && (
                  <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex items-center justify-between">
                    <span className="text-amber-800 dark:text-amber-300 font-bold flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" />
                      <span>الدروس التابعة</span>
                    </span>
                    <span className="font-black text-amber-900 dark:text-amber-200 bg-amber-100 dark:bg-amber-900/80 px-2 py-0.5 rounded-md">
                      {target.childLessonsCount}
                    </span>
                  </div>
                )}

                {target.linkedQuestionsCount !== undefined && target.linkedQuestionsCount > 0 && (
                  <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 flex items-center justify-between">
                    <span className="text-blue-800 dark:text-blue-300 font-bold flex items-center gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5" />
                      <span>الأسئلة المرتبطة</span>
                    </span>
                    <span className="font-black text-blue-900 dark:text-blue-200 bg-blue-100 dark:bg-blue-900/80 px-2 py-0.5 rounded-md">
                      {target.linkedQuestionsCount}
                    </span>
                  </div>
                )}

                {target.contentCardsCount !== undefined && target.contentCardsCount > 0 && (
                  <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <span className="text-slate-700 dark:text-slate-300 font-bold flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5" />
                      <span>فقرات الدرس</span>
                    </span>
                    <span className="font-black text-slate-800 dark:text-slate-200 bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-md">
                      {target.contentCardsCount}
                    </span>
                  </div>
                )}
              </div>

              <div className="p-3 bg-blue-50/70 dark:bg-blue-950/30 rounded-xl border border-blue-100 dark:border-blue-900/40 text-[11px] text-blue-800 dark:text-blue-300 leading-relaxed font-medium">
                🛡️ <strong>حماية بنك الأسئلة:</strong> لن يتم مسح أي سؤال من رصيد بنك الأسئلة المركزي، بل سيتم فقط فك الارتباط بهذا العنصر المحذوف لضمان عدم فقدان أي مجهود علمي.
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
              هذا العنصر لا يحتوي على بيانات فرعية أو أسئلة مرتبطة. يمكنك حذفه مباشرة بأمان.
            </p>
          )}
        </div>

        {error && <p role="alert" className="p-4 text-rose-700">{error}</p>}
        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition cursor-pointer"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={() => {
              try {
                if (onConfirm() === false) { setError("تعذر الحذف. راجع الصلاحيات وحاول مجددًا."); return; }
                onClose();
              } catch { setError("تعذر إتمام الحذف. تحقق من البيانات قبل إعادة المحاولة."); }
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black transition shadow-xs hover:shadow-sm cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>نعم، تأكيد الحذف نهائياً</span>
          </button>
        </div>
      </div>
    </div>
  );
};
