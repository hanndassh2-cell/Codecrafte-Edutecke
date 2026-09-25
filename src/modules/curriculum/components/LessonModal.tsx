import React, { useState, useEffect } from "react";
import { X, FileText, Check, Clock } from "lucide-react";
import { Lesson, Unit, Subject } from "../../../types";

interface LessonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (lesson: Lesson) => void | boolean;
  initialLesson?: Lesson | null;
  units: Unit[];
  subjects: Subject[];
  defaultUnitId?: string;
  defaultSubjectId?: string;
  existingLessonsCount?: number;
}

export const LessonModal: React.FC<LessonModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialLesson,
  units,
  subjects,
  defaultUnitId,
  defaultSubjectId,
  existingLessonsCount = 0,
}) => {
  const [title, setTitle] = useState("");
  const [code, setCode] = useState("");
  const [unitId, setUnitId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [durationMinutes, setDurationMinutes] = useState<number>(45);
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"draft" | "review" | "approved">("draft");
  const [orderIndex, setOrderIndex] = useState<number>(1);
  const [statusChanged, setStatusChanged] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialLesson) {
        setTitle(initialLesson.title || "");
        setCode(initialLesson.code || "");
        setUnitId(initialLesson.unitId || defaultUnitId || units[0]?.id || "");
        setSubjectId(initialLesson.subjectId || defaultSubjectId || subjects[0]?.id || "");
        setDurationMinutes(initialLesson.durationMinutes || 45);
        setDescription(initialLesson.description || "");
        const st = initialLesson.status;
        setStatus(
          st === "approved" || st === "completed"
            ? "approved"
            : st === "review"
            ? "review"
            : "draft"
        );
        setOrderIndex(initialLesson.orderIndex || 1);
      } else {
        const selUnit = units.find((u) => u.id === defaultUnitId) || units[0];
        const nextNum = existingLessonsCount + 1;
        setTitle(`الدرس ${nextNum}`);
        setCode(`L${nextNum}`);
        setUnitId(selUnit?.id || "");
        setSubjectId(selUnit?.subjectId || defaultSubjectId || subjects[0]?.id || "");
        setDurationMinutes(45);
        setDescription("");
        setStatus("draft");
        setOrderIndex(nextNum);
      }
      setError(null);
      setStatusChanged(false);
    }
  }, [isOpen, initialLesson, defaultUnitId, defaultSubjectId, units, subjects, existingLessonsCount]);

  if (!isOpen) return null;

  const handleUnitChange = (newUnitId: string) => {
    setUnitId(newUnitId);
    const targetUnit = units.find((u) => u.id === newUnitId);
    if (targetUnit) {
      setSubjectId(targetUnit.subjectId);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("يرجى إدخال عنوان الدرس التعليمي.");
      return;
    }
    if (!unitId) {
      setError("يرجى تحديد الوحدة التعليمية التابع لها هذا الدرس.");
      return;
    }

    const currentSubjId = subjectId || units.find((u) => u.id === unitId)?.subjectId || "";

    const savedLesson: Lesson = {
      ...(initialLesson || {}),
      id: initialLesson?.id || `lesson-${Date.now()}`,
      unitId,
      subjectId: currentSubjId,
      title: title.trim(),
      code: code.trim() || `L${orderIndex}`,
      description: description.trim(),
      durationMinutes: Number(durationMinutes) || 45,
      orderIndex: Number(orderIndex) || 1,
      status: !statusChanged && initialLesson ? initialLesson.status : status || "draft",
      contentParagraphs: initialLesson?.contentParagraphs || [],
      objectives: initialLesson?.objectives || [],
      updatedAt: new Date().toISOString(),
    };

    try {
      if (onSave(savedLesson) === false) { setError("تعذر حفظ الدرس. بقيت مدخلاتك محفوظة في هذه النافذة؛ حاول مجددًا."); return; }
      onClose();
    } catch { setError("تعذر حفظ الدرس. لم تُغلق النافذة كي تتمكن من إعادة المحاولة."); }
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
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-100 dark:border-emerald-900/50 shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                {initialLesson ? "تعديل بيانات الدرس" : "إضافة درس تعليمي جديد"}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                تحديد العنوان والمخرجات والمدة الزمنية للدرس
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

          {/* Unit selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              الوحدة التعليمية التابع لها <span className="text-rose-500">*</span>
            </label>
            <select
              value={unitId}
              onChange={(e) => handleUnitChange(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            >
              {units.map((u) => {
                const sub = subjects.find((s) => s.id === u.subjectId);
                return (
                  <option key={u.id} value={u.id}>
                    {u.title} {sub ? `[${sub.name}]` : ""}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Lesson Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              عنوان الدرس <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: مفهوم النهاية والاتصال"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 placeholder:text-slate-400"
            />
          </div>

          {/* Lesson Code & Duration & Order */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                رمز الدرس
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="L1"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 placeholder:text-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                المدة (دقائق)
              </label>
              <input
                type="number"
                min="5"
                step="5"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 45)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                الترتيب
              </label>
              <input
                type="number"
                min="1"
                value={orderIndex}
                onChange={(e) => setOrderIndex(parseInt(e.target.value) || 1)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              الوصف والأهداف التعليمية
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="وصف مختصر لمحتوى الدرس ومحاوره الأساسية..."
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 placeholder:text-slate-400 leading-relaxed"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              حالة الدرس
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => { setStatus("draft"); setStatusChanged(true); }}
                className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  status === "draft"
                    ? "bg-amber-50 dark:bg-amber-950/50 border-amber-500 text-amber-700 dark:text-amber-300"
                    : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${status === "draft" ? "bg-amber-500" : "bg-slate-300"}`} />
                <span>مسودة</span>
              </button>

              <button
                type="button"
                onClick={() => { setStatus("review"); setStatusChanged(true); }}
                className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  status === "review"
                    ? "bg-blue-50 dark:bg-blue-950/50 border-blue-500 text-blue-700 dark:text-blue-300"
                    : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${status === "review" ? "bg-blue-500" : "bg-slate-300"}`} />
                <span>قيد المراجعة</span>
              </button>

              <button
                type="button"
                onClick={() => { setStatus("approved"); setStatusChanged(true); }}
                className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  status === "approved"
                    ? "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-700 dark:text-emerald-300"
                    : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${status === "approved" ? "bg-emerald-500" : "bg-slate-300"}`} />
                <span>معتمد</span>
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
            <span>حفظ بيانات الدرس</span>
          </button>
        </div>
      </div>
    </div>
  );
};
