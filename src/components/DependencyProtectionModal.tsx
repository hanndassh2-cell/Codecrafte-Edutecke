import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  AlertTriangle,
  Link,
  Unlink,
  Archive,
  Trash2,
  X,
  Layers,
  BookOpen,
  FileCheck,
  Library,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
} from "lucide-react";
import {
  centralGovernance,
  QuestionDependencyReport,
  CurriculumDependencyReport,
} from "../services/centralGovernanceEngine";
import { storage } from "../services/storage";
import { Lesson } from "../types";

export interface DependencyProtectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: "question" | "lesson" | "unit" | "subject";
  targetId: string;
  parentLessonId?: string; // If invoked from within a specific lesson editor card
  onSuccess?: () => void;
}

export const DependencyProtectionModal: React.FC<DependencyProtectionModalProps> = ({
  isOpen,
  onClose,
  targetType,
  targetId,
  parentLessonId,
  onSuccess,
}) => {
  const [questionReport, setQuestionReport] = useState<QuestionDependencyReport | null>(null);
  const [curriculumReport, setCurriculumReport] = useState<CurriculumDependencyReport | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [targetTransferLessonId, setTargetTransferLessonId] = useState<string>("");
  const [isConfirmingHardDelete, setIsConfirmingHardDelete] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && targetId) {
      setIsConfirmingHardDelete(false);
      setErrorMessage(null);
      if (targetType === "question") {
        const rep = centralGovernance.inspectQuestionReferences(targetId);
        setQuestionReport(rep);
      } else {
        const rep = centralGovernance.inspectCurriculumDependencies(targetType, targetId);
        setCurriculumReport(rep);
        const allLessons = storage.getLessons();
        setLessons(allLessons.filter((l) => l.id !== targetId));
        if (allLessons.length > 1) {
          const other = allLessons.find((l) => l.id !== targetId);
          if (other) setTargetTransferLessonId(other.id);
        }
      }
    }
  }, [isOpen, targetId, targetType]);

  if (!isOpen) return null;

  // HANDLERS
  const handleUnlinkFromLesson = () => {
    if (parentLessonId && targetType === "question") {
      centralGovernance.unlinkQuestionFromLesson(targetId, parentLessonId);
      if (onSuccess) onSuccess();
      onClose();
    }
  };

  const handleArchive = () => {
    if (targetType === "question") {
      centralGovernance.archiveQuestion(targetId);
    } else if (targetType === "lesson") {
      centralGovernance.safeDeleteLesson(targetId, "archive");
    } else if (targetType === "unit") {
      centralGovernance.safeDeleteUnit(targetId, "archive");
    } else if (targetType === "subject") {
      centralGovernance.safeDeleteSubject(targetId, "archive");
    }
    if (onSuccess) onSuccess();
    onClose();
  };

  const handleTransferAndRemoveLesson = () => {
    if (targetType === "lesson" && targetTransferLessonId) {
      const res = centralGovernance.safeDeleteLesson(targetId, "transfer", targetTransferLessonId);
      if (res.success) {
        if (onSuccess) onSuccess();
        onClose();
      } else {
        setErrorMessage(res.message);
      }
    }
  };

  const handleHardDeleteQuestion = () => {
    const res = centralGovernance.hardDeleteQuestion(targetId, "المعلم");
    if (res.success) {
      if (onSuccess) onSuccess();
      onClose();
    } else {
      setErrorMessage(res.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden text-slate-800 dark:text-slate-100 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-amber-50/80 dark:bg-amber-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-600/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base text-amber-900 dark:text-amber-200">
                فحص الارتباطات والحماية المركزية
              </h3>
              <p className="text-xs text-amber-700 dark:text-amber-400">
                منع فقدان أو تكرار أو حذف البيانات التعليمية المرتبطة
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {errorMessage && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-800 dark:text-rose-200 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* QUESTION INSPECTION */}
          {targetType === "question" && questionReport && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl">
                <div className="text-xs text-slate-500 font-medium">نص السؤال:</div>
                <div className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-1 line-clamp-2">
                  {questionReport.questionText || "بدون نص"}
                </div>
                <div className="text-xs text-slate-400 mt-1 font-mono">ID: {questionReport.questionId}</div>
              </div>

              {/* Status Banner */}
              {questionReport.activeReferencesCount > 0 ? (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-sm">
                    <AlertTriangle className="w-4 h-4" />
                    <span>الحذف النهائي محظور لوجود ({questionReport.activeReferencesCount}) ارتباطات نشطة:</span>
                  </div>
                  <div className="max-h-40 overflow-y-auto divide-y divide-amber-200/60 dark:divide-amber-800/40 text-xs text-slate-700 dark:text-slate-300">
                    {(questionReport?.references || []).map((r, i) => (
                      <div key={i} className="py-1.5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {r.entityType === "lesson" && <BookOpen className="w-3.5 h-3.5 text-blue-600" />}
                          {r.entityType === "lesson_card" && <Layers className="w-3.5 h-3.5 text-emerald-600" />}
                          {r.entityType === "exam" && <FileCheck className="w-3.5 h-3.5 text-amber-600" />}
                          {r.entityType === "exam_library" && <Library className="w-3.5 h-3.5 text-purple-600" />}
                          <span className="font-semibold">{r.title}</span>
                        </div>
                        <span className="text-[10px] text-slate-500">{r.details}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>السؤال غير مستخدم في أي دروس أو اختبارات حالية، ويمكن حذفه بأمان.</span>
                </div>
              )}

              {/* Action Selection for Question */}
              <div className="space-y-2 pt-2">
                <div className="text-xs font-bold text-slate-600 dark:text-slate-400">
                  اختر الإجراء المناسب وفقاً لقواعد الحوكمة:
                </div>

                {parentLessonId && (
                  <button
                    onClick={handleUnlinkFromLesson}
                    className="w-full p-3 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 rounded-xl text-right flex items-center justify-between group transition"
                  >
                    <div>
                      <div className="text-sm font-bold text-blue-700 dark:text-blue-300 flex items-center gap-2">
                        <Unlink className="w-4 h-4" />
                        إلغاء الارتباط من هذا الدرس فقط (Unlink)
                      </div>
                      <div className="text-xs text-blue-600/80 dark:text-blue-400/80 mt-0.5">
                        الخيار الموصى به: يزيل السؤال من بطاقة الدرس الحالية مع بقائه محفوظاً ببنك الأسئلة.
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-blue-600 group-hover:translate-x-1 transition" />
                  </button>
                )}

                <button
                  onClick={handleArchive}
                  className="w-full p-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-right flex items-center justify-between group transition"
                >
                  <div>
                    <div className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <Archive className="w-4 h-4 text-amber-600" />
                      أرشفة السؤال (Soft Delete / Archive)
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      يخفي السؤال من القوائم النشطة مع إمكانية استعادته بنقرة واحدة مستقبلاً.
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition" />
                </button>

                {questionReport.canHardDelete ? (
                  <button
                    onClick={handleHardDeleteQuestion}
                    className="w-full p-3 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800 rounded-xl text-right flex items-center justify-between group transition"
                  >
                    <div>
                      <div className="text-sm font-bold text-rose-700 dark:text-rose-300 flex items-center gap-2">
                        <Trash2 className="w-4 h-4" />
                        حذف نهائي من بنك الأسئلة
                      </div>
                      <div className="text-xs text-rose-600/80 dark:text-rose-400/80 mt-0.5">
                        سيتم حفظ نسخة احتياطية فورية قبل الحذف لضمان أمان النظام.
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-rose-600 group-hover:translate-x-1 transition" />
                  </button>
                ) : (
                  <div className="p-3 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2 bg-slate-50/50 dark:bg-slate-800/30">
                    <label className="flex items-center gap-2 text-xs font-semibold text-rose-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isConfirmingHardDelete}
                        onChange={(e) => setIsConfirmingHardDelete(e.target.checked)}
                        className="rounded text-rose-600 focus:ring-rose-500"
                      />
                      <span>أنا أدرك أن الحذف النهائي سيلغي ارتباطات هذا السؤال من الاختبارات والدروس</span>
                    </label>
                    {isConfirmingHardDelete && (
                      <button
                        onClick={handleHardDeleteQuestion}
                        className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        تأكيد الحذف النهائي مع إنشاء نسخة تراجع
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* CURRICULUM INSPECTION (LESSON, UNIT, SUBJECT) */}
          {targetType !== "question" && curriculumReport && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl">
                <div className="text-xs text-slate-500 font-medium">العنصر المراد حذفه أو تعديله:</div>
                <div className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-1">
                  {curriculumReport.name} ({targetType === "lesson" ? "درس" : targetType === "unit" ? "وحدة" : "مادة"})
                </div>
              </div>

              {curriculumReport.warnings.length > 0 && (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl space-y-1.5">
                  <div className="font-bold text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    <span>تحذير سلامة المنهاج (Cascade Prevention):</span>
                  </div>
                  <ul className="text-xs text-amber-700 dark:text-amber-400 space-y-1 list-disc list-inside">
                    {(curriculumReport?.warnings || []).map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Actions */}
              <div className="space-y-2 pt-2">
                <button
                  onClick={handleArchive}
                  className="w-full p-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-right flex items-center justify-between group transition"
                >
                  <div>
                    <div className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <Archive className="w-4 h-4 text-amber-600" />
                      أرشفة العنصر مع الحفاظ الكامل على الأسئلة
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      الخيار الآمن: يحفظ جميع الأسئلة والمحتويات التعليمية من التلف.
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition" />
                </button>

                {targetType === "lesson" && lessons.length > 0 && (
                  <div className="p-3 border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30 rounded-xl space-y-2">
                    <div className="text-xs font-bold text-blue-700 dark:text-blue-300">
                      نقل جميع أسئلة هذا الدرس إلى درس آخر قبل الحذف:
                    </div>
                    <div className="flex gap-2">
                      <select
                        value={targetTransferLessonId}
                        onChange={(e) => setTargetTransferLessonId(e.target.value)}
                        className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                      >
                        {lessons.map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.title}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={handleTransferAndRemoveLesson}
                        className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow-sm"
                      >
                        نقل وحذف بأمان
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end bg-slate-50/80 dark:bg-slate-800/40">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg font-bold text-xs transition"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
};
