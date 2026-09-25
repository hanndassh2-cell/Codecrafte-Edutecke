import React, { useState, useEffect } from "react";
import {
  X,
  BookOpen,
  Calculator,
  Atom,
  FlaskConical,
  Globe,
  Code,
  Compass,
  Layers,
  Cpu,
  Bookmark,
  Sparkles,
  GraduationCap,
  Award,
  FileText,
  Binary,
  Check,
  Palette,
} from "lucide-react";
import { Subject } from "../../../types";

interface SubjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (subject: Subject) => void | boolean;
  initialSubject?: Subject | null;
  existingSubjectsCount?: number;
}

const COLOR_PRESETS = [
  { name: "أزرق ملكي", hex: "#2563eb" },
  { name: "زمردي", hex: "#059669" },
  { name: "نيلي", hex: "#4f46e5" },
  { name: "بنفسجي", hex: "#7c3aed" },
  { name: "كهرماني / ذهبي", hex: "#d97706" },
  { name: "ياقوتي / أحمر", hex: "#dc2626" },
  { name: "تيل / بحري", hex: "#0d9488" },
  { name: "رمادي صخري", hex: "#475569" },
];

export const ICON_MAP: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  BookOpen,
  Calculator,
  Atom,
  FlaskConical,
  Globe,
  Code,
  Compass,
  Layers,
  Cpu,
  Bookmark,
  Sparkles,
  GraduationCap,
  Award,
  FileText,
  Binary,
};

const ICON_OPTIONS = [
  { key: "BookOpen", label: "كتاب" },
  { key: "Calculator", label: "رياضيات" },
  { key: "Atom", label: "فيزياء/ذرة" },
  { key: "FlaskConical", label: "كيمياء/مختبر" },
  { key: "Compass", label: "هندسة" },
  { key: "Cpu", label: "إلكترونيات/حاسوب" },
  { key: "Code", label: "برمجة" },
  { key: "Globe", label: "جغرافيا/عام" },
  { key: "GraduationCap", label: "أكاديمي" },
  { key: "Layers", label: "وحدات/طبقات" },
  { key: "Bookmark", label: "مرجع" },
  { key: "Sparkles", label: "مادة مميزة" },
];

export const SubjectModal: React.FC<SubjectModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialSubject,
  existingSubjectsCount = 0,
}) => {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [color, setColor] = useState("#2563eb");
  const [icon, setIcon] = useState("BookOpen");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"active" | "archived">("active");
  const [totalMarks, setTotalMarks] = useState<number>(100);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialSubject) {
        setName(initialSubject.name || "");
        setCode(initialSubject.code || "");
        setColor(initialSubject.color || "#2563eb");
        setIcon(initialSubject.icon || "BookOpen");
        setDescription(initialSubject.description || "");
        setStatus(initialSubject.status || "active");
        setTotalMarks(initialSubject.totalMarks || 100);
      } else {
        setName("");
        setCode(`SUB-${existingSubjectsCount + 1}`);
        setColor(COLOR_PRESETS[existingSubjectsCount % COLOR_PRESETS.length].hex);
        setIcon("BookOpen");
        setDescription("");
        setStatus("active");
        setTotalMarks(100);
      }
      setError(null);
    }
  }, [isOpen, initialSubject, existingSubjectsCount]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("يرجى إدخال اسم المادة الدراسية.");
      return;
    }

    const newSubject: Subject = {
      ...initialSubject,
      id: initialSubject?.id || `subj-${Date.now()}`,
      name: name.trim(),
      code: code.trim() || `SUB-${Date.now().toString().slice(-4)}`,
      color: color || "#2563eb",
      icon: icon || "BookOpen",
      description: description.trim(),
      status: status || "active",
      totalMarks: Number(totalMarks) || 100,
    };

    try {
      if (onSave(newSubject) === false) { setError("تعذر حفظ المادة. راجع الصلاحيات وحاول مجددًا."); return; }
      onClose();
    } catch { setError("تعذر حفظ المادة. بقيت بياناتك في النموذج لإعادة المحاولة."); }
  };

  const SelectedIconComponent = ICON_MAP[icon] || BookOpen;

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
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-xs"
              style={{ backgroundColor: color }}
            >
              <SelectedIconComponent className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                {initialSubject ? "تعديل بيانات المادة الدراسية" : "إضافة مادة دراسية جديدة"}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {initialSubject
                  ? "تحديث اسم وخصائص ولون المادة في شجرة المنهاج"
                  : "إنشاء مادة جديدة لإضافة الوحدات والدروس والأسئلة إليها"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-bold">
              {error}
            </div>
          )}

          {/* Subject Name & Code */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="block text-xs font-black text-slate-700 dark:text-slate-300">
                اسم المادة الدراسية <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                autoFocus
                placeholder="مثال: الرياضيات التطبيقية، الفيزياء، الكيمياء..."
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError(null);
                }}
                className="w-full px-3.5 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all placeholder:text-slate-400"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-black text-slate-700 dark:text-slate-300">
                رمز المادة
              </label>
              <input
                type="text"
                placeholder="مثال: MATH101"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Color Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-black text-slate-700 dark:text-slate-300">
                اللون المميز للمادة
              </label>
              <span className="text-[11px] font-mono text-slate-400">{color}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setColor(c.hex)}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                    color === c.hex
                      ? "ring-2 ring-offset-2 ring-primary-500 dark:ring-offset-slate-900 scale-110 shadow-xs"
                      : "hover:scale-105 opacity-80 hover:opacity-100"
                  }`}
                  style={{ backgroundColor: c.hex }}
                  title={c.name}
                >
                  {color === c.hex && <Check className="w-3.5 h-3.5 text-white" />}
                </button>
              ))}
              <div className="flex items-center gap-1.5 mr-auto">
                <Palette className="w-4 h-4 text-slate-400" />
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-7 h-7 rounded-lg border-0 cursor-pointer bg-transparent"
                  title="اختر لوناً مخصصاً"
                />
              </div>
            </div>
          </div>

          {/* Icon Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-black text-slate-700 dark:text-slate-300">
              أيقونة المادة
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {ICON_OPTIONS.map((opt) => {
                const IconCmp = ICON_MAP[opt.key] || BookOpen;
                const isSelected = icon === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setIcon(opt.key)}
                    className={`flex flex-col items-center justify-center gap-1 p-2 rounded-xl border text-center transition-all cursor-pointer ${
                      isSelected
                        ? "border-primary-500 bg-primary-50 dark:bg-primary-950/50 text-primary-600 dark:text-primary-400 font-bold shadow-xs"
                        : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                  >
                    <IconCmp className="w-4 h-4" />
                    <span className="text-[10px] truncate max-w-full">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Total Marks & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-black text-slate-700 dark:text-slate-300">
                الدرجة الكلية للمادة (المجموع الامتحاني)
              </label>
              <input
                type="number"
                min="10"
                max="1000"
                step="5"
                placeholder="100"
                value={totalMarks}
                onChange={(e) => setTotalMarks(Number(e.target.value))}
                className="w-full px-3.5 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-black text-slate-700 dark:text-slate-300">
                حالة المادة
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setStatus("active")}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    status === "active"
                      ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-500 shadow-xs"
                      : "bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                  }`}
                >
                  نشط ومتاح
                </button>
                <button
                  type="button"
                  onClick={() => setStatus("archived")}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    status === "archived"
                      ? "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-500 shadow-xs"
                      : "bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                  }`}
                >
                  مؤرشف
                </button>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="block text-xs font-black text-slate-700 dark:text-slate-300">
              الوصف والملاحظات الأكاديمية (اختياري)
            </label>
            <textarea
              rows={2}
              placeholder="وصف مختصر لمفردات المنهج، الفئة المستهدفة، أو التخصص..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all placeholder:text-slate-400 resize-none"
            />
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-black transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{initialSubject ? "حفظ التعديلات" : "إضافة المادة"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
