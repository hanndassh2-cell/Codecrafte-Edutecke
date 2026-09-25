import React, { useState, useEffect } from "react";
import { X, Folder, BookOpen, Check } from "lucide-react";
import { Unit, Subject } from "../../../types";

interface UnitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (unit: Unit) => void | boolean;
  initialUnit?: Unit | null;
  subjects: Subject[];
  defaultSubjectId?: string;
  existingUnitsCount?: number;
}

export const UnitModal: React.FC<UnitModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialUnit,
  subjects,
  defaultSubjectId,
  existingUnitsCount = 0,
}) => {
  const [title, setTitle] = useState("");
  const [code, setCode] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"active" | "archived">("active");
  const [orderIndex, setOrderIndex] = useState<number>(1);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialUnit) {
        setTitle(initialUnit.title || "");
        setCode(initialUnit.code || "");
        setSubjectId(initialUnit.subjectId || defaultSubjectId || subjects[0]?.id || "");
        setDescription(initialUnit.description || "");
        setStatus(initialUnit.status || "active");
        setOrderIndex(initialUnit.orderIndex || 1);
      } else {
        const activeSubjId = defaultSubjectId || subjects[0]?.id || "";
        const nextNum = existingUnitsCount + 1;
        setTitle(`الوحدة ${nextNum}`);
        setCode(`U${nextNum}`);
        setSubjectId(activeSubjId);
        setDescription("");
        setStatus("active");
        setOrderIndex(nextNum);
      }
      setError(null);
    }
  }, [isOpen, initialUnit, defaultSubjectId, subjects, existingUnitsCount]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("يرجى إدخال عنوان الوحدة التعليمية.");
      return;
    }
    if (!subjectId) {
      setError("يرجى تحديد المادة الدراسية التابعة لها.");
      return;
    }

    const savedUnit: Unit = {
      ...initialUnit,
      id: initialUnit?.id || `unit-${Date.now()}`,
      subjectId,
      title: title.trim(),
      code: code.trim() || `U${orderIndex}`,
      description: description.trim(),
      orderIndex: Number(orderIndex) || 1,
      status: status || "active",
    };

    try {
      if (onSave(savedUnit) === false) {
        setError("تعذر حفظ الوحدة. راجع الصلاحيات وحاول مجددًا.");
        return;
      }
      onClose();
    } catch {
      setError("تعذر حفظ الوحدة. احتفظنا بمدخلاتك لتتمكن من المحاولة مجددًا.");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      dir="rtl"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-100 dark:border-blue-900/50 shadow-xs">
              <Folder className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                {initialUnit ? "تعديل بيانات الوحدة التعليمية" : "إضافة وحدة تعليمية جديدة"}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                تنظيم الدروس والمخرجات التعليمية ضمن مادة محددة
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs font-bold">
              {error}
            </div>
          )}

          {/* Subject selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              المادة الدراسية التابعة لها <span className="text-rose-500">*</span>
            </label>
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.code ? `(${s.code})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Unit Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              عنوان الوحدة <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: الوحدة الأولى - التفاضل والتكامل"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 placeholder:text-slate-400"
            />
          </div>

          {/* Unit Code & Order */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                رمز / كود الوحدة
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="مثال: U1"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 placeholder:text-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                ترتيب الظهور
              </label>
              <input
                type="number"
                min="1"
                value={orderIndex}
                onChange={(e) => setOrderIndex(parseInt(e.target.value) || 1)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              وصف الوحدة والأهداف العامة
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="اكتب نبذة موجزة عن محاور هذه الوحدة وموضوعاتها..."
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 placeholder:text-slate-400 leading-relaxed"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              حالة الوحدة
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setStatus("active")}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-2 cursor-pointer ${
                  status === "active"
                    ? "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-700 dark:text-emerald-300"
                    : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${status === "active" ? "bg-emerald-500" : "bg-slate-300"}`} />
                <span>نشطة ومتاحة</span>
              </button>
              <button
                type="button"
                onClick={() => setStatus("archived")}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-2 cursor-pointer ${
                  status === "archived"
                    ? "bg-amber-50 dark:bg-amber-950/50 border-amber-500 text-amber-700 dark:text-amber-300"
                    : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${status === "archived" ? "bg-amber-500" : "bg-slate-300"}`} />
                <span>مؤرشفة</span>
              </button>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition cursor-pointer"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="flex items-center gap-1.5 px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-black transition shadow-xs hover:shadow-sm cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>حفظ بيانات الوحدة</span>
          </button>
        </div>
      </div>
    </div>
  );
};
