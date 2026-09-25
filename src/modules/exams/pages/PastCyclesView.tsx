import React, { useState, useMemo, useEffect } from "react";
import {
  History,
  Clock,
  Plus,
  Trash2,
  RotateCcw,
  Calendar,
  Layers,
  X,
  CheckCircle2,
  AlertCircle,
  Pencil,
  Printer,
  FileText,
  Search,
  CheckSquare,
  Square,
  Lock,
} from "lucide-react";
import { Cycle, Exam, Subject } from "../../../types/index";
import { initialCycles, initialPrintTemplates } from "../../../database/initialData";
import { storage } from "../../../services/storage";
import {
  canPerformAction,
  canAccessSubject,
  filterAllowedItemsBySubject,
  filterAllowedSubjects,
} from "../../../services/rbacEngine";
import { User } from "../../../types";
import { PrintPreviewModal } from "../../../components/PrintPreviewModal";
import { PaginatedA4Preview } from "../../../components/PaginatedA4Preview";
import { generateExamPrintItems } from "../../../services/SharedPrintService";

interface PastCyclesViewProps {
  cycles: Cycle[];
  exams?: Exam[];
  subjects?: Subject[];
  currentUser?: User;
  onSaveCycle: (cycle: Cycle) => void;
  onDeleteCycle: (id: string) => void;
}

export const PastCyclesView: React.FC<PastCyclesViewProps> = ({
  cycles,
  exams = [],
  subjects = [],
  currentUser,
  onSaveCycle,
  onDeleteCycle,
}) => {
  const effectiveUser = useMemo(() => currentUser || storage.getCurrentUser(), [currentUser]);
  const canCreateCycle = canPerformAction(effectiveUser, "create", "exams");
  const canEditCycle = canPerformAction(effectiveUser, "edit", "exams");
  const canDeleteCycle = canPerformAction(effectiveUser, "delete", "exams");
  const canRestoreCycles =
    canPerformAction(effectiveUser, "restore", "exams") ||
    canPerformAction(effectiveUser, "create", "exams");
  const canExport = canPerformAction(effectiveUser, "export");

  // Load and filter subjects and exams strictly by user subject permissions
  const allSubjects = useMemo(() => {
    if (subjects && subjects.length > 0) return subjects;
    return storage.getSubjects();
  }, [subjects]);

  const allowedSubjects = useMemo(
    () => filterAllowedSubjects(effectiveUser, allSubjects),
    [effectiveUser, allSubjects]
  );

  const allowedExams = useMemo(
    () => filterAllowedItemsBySubject(effectiveUser, exams || []),
    [effectiveUser, exams]
  );

  // Filter cycles: admin sees all cycles, teachers/viewers only see cycles containing allowed exams
  const visibleCycles = useMemo(() => {
    if (!effectiveUser) return [];
    if (effectiveUser.role === "admin") return cycles;

    return cycles.filter((c) => {
      const hasAllowedExams = (c.examIds || []).some((id) =>
        allowedExams.some((e) => e.id === id)
      );
      return hasAllowedExams;
    });
  }, [cycles, allowedExams, effectiveUser]);

  // Form State for Adding / Editing
  const [isAdding, setIsAdding] = useState(false);
  const [editingCycle, setEditingCycle] = useState<Cycle | null>(null);
  const [deleteConfirmCycleId, setDeleteConfirmCycleId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [academicYear, setAcademicYear] = useState("2025/2026");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState<"active" | "archived">("archived");
  const [selectedExamIds, setSelectedExamIds] = useState<string[]>([]);
  const [examSearchQuery, setExamSearchQuery] = useState("");

  // Print Preview Modal State
  const [previewExam, setPreviewExam] = useState<Exam | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [showAnswerKey, setShowAnswerKey] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Active Print Template for preview
  const [activeTemplate, setActiveTemplate] = useState(() => {
    const templates = storage.getPrintTemplates();
    return templates.find((t) => t.isDefault && t.type === "exam") ||
           templates.find((t) => t.type === "exam") ||
           storage.getPrintTemplate();
  });

  useEffect(() => {
    const handleSyncTemplate = () => {
      const templates = storage.getPrintTemplates();
      const defaultTmpl = templates.find((t) => t.isDefault && t.type === "exam") ||
                          templates.find((t) => t.type === "exam") ||
                          storage.getPrintTemplate();
      setActiveTemplate(defaultTmpl);
    };
    window.addEventListener("refresh-data-all", handleSyncTemplate);
    return () => window.removeEventListener("refresh-data-all", handleSyncTemplate);
  }, []);

  const openAddModal = () => {
    if (!canCreateCycle) {
      setFeedbackMessage("⚠️ ليس لديك صلاحية إنشاء دورات امتحانية جديدة.");
      return;
    }
    setName("");
    setAcademicYear("2025/2026");
    setStartDate(new Date().toISOString().split("T")[0]);
    setEndDate(new Date().toISOString().split("T")[0]);
    setStatus("archived");
    setSelectedExamIds([]);
    setExamSearchQuery("");
    setIsAdding(true);
  };

  const openEditModal = (cycle: Cycle) => {
    if (!canEditCycle) {
      setFeedbackMessage("⚠️ ليس لديك صلاحية تعديل الدورات الامتحانية.");
      return;
    }
    setEditingCycle(cycle);
    setName(cycle.name);
    setAcademicYear(cycle.academicYear || "2025/2026");
    setStartDate(cycle.startDate || "");
    setEndDate(cycle.endDate || "");
    setStatus(cycle.status || "archived");
    // Only pre-select exam IDs that this user is allowed to see and manage
    setSelectedExamIds((cycle.examIds || []).filter((id) => allowedExams.some((e) => e.id === id)));
    setExamSearchQuery("");
  };

  const handleToggleExamSelection = (examId: string) => {
    const exam = allowedExams.find((e) => e.id === examId);
    if (!exam || !canAccessSubject(effectiveUser, exam.subjectId)) {
      setFeedbackMessage("⚠️ لا يمكن ربط نموذج اختبار من مادة غير مصرح لك بالوصول إليها.");
      return;
    }

    setSelectedExamIds((prev) =>
      prev.includes(examId) ? prev.filter((id) => id !== examId) : [...prev, examId]
    );
  };

  const handleSelectAllAllowedExams = () => {
    const filteredIds = allowedExams
      .filter((e) => {
        if (!examSearchQuery.trim()) return true;
        const q = examSearchQuery.toLowerCase();
        return (
          e.title.toLowerCase().includes(q) ||
          (allSubjects.find((s) => s.id === e.subjectId)?.name || "").toLowerCase().includes(q)
        );
      })
      .map((e) => e.id);

    setSelectedExamIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
  };

  const handleDeselectAllExams = () => {
    setSelectedExamIds([]);
  };

  const handleSaveCycleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // Strict validation: Ensure selected exam IDs are strictly within allowed exams
    const sanitizedExamIds = selectedExamIds.filter((id) =>
      allowedExams.some((e) => e.id === id && canAccessSubject(effectiveUser, e.subjectId))
    );

    if (editingCycle) {
      if (!canEditCycle) {
        setFeedbackMessage("⚠️ ليس لديك صلاحية تعديل الدورات.");
        return;
      }

      // Preserve unallowed exams that were previously linked by an admin so they aren't accidentally destroyed
      const unallowedExistingExamIds = (editingCycle.examIds || []).filter(
        (id) => !allowedExams.some((e) => e.id === id)
      );

      const updatedCycle: Cycle = {
        ...editingCycle,
        name: name.trim(),
        academicYear,
        startDate: startDate || new Date().toISOString().split("T")[0],
        endDate: endDate || new Date().toISOString().split("T")[0],
        status,
        examIds: Array.from(new Set([...unallowedExistingExamIds, ...sanitizedExamIds])),
      };

      onSaveCycle(updatedCycle);
      setEditingCycle(null);
      setFeedbackMessage("✅ تم حفظ تعديلات الدورة بنجاح.");
    } else {
      if (!canCreateCycle) {
        setFeedbackMessage("⚠️ ليس لديك صلاحية إنشاء دورات جديدة.");
        return;
      }

      const newCycle: Cycle = {
        id: `cycle-${Date.now()}`,
        name: name.trim(),
        academicYear,
        startDate: startDate || new Date().toISOString().split("T")[0],
        endDate: endDate || new Date().toISOString().split("T")[0],
        status,
        examIds: sanitizedExamIds,
      };

      onSaveCycle(newCycle);
      setIsAdding(false);
      setFeedbackMessage("✅ تم إنشاء الدورة الامتحانية وربط النماذج المصرح بها بنجاح.");
    }
  };

  const handleConfirmDelete = (id: string) => {
    if (!canDeleteCycle) {
      setFeedbackMessage("⚠️ ليس لديك صلاحية حذف الدورات الامتحانية.");
      setDeleteConfirmCycleId(null);
      return;
    }

    const targetCycle = cycles.find((c) => c.id === id);
    if (targetCycle && effectiveUser?.role !== "admin") {
      const hasUnauthorizedExams = (targetCycle.examIds || []).some(
        (examId) => !allowedExams.some((e) => e.id === examId)
      );
      if (hasUnauthorizedExams) {
        setFeedbackMessage("⚠️ لا يمكن حذف هذه الدورة لأنها تحتوي على اختبارات تابعة لمواد أخرى خارج صلاحياتك.");
        setDeleteConfirmCycleId(null);
        return;
      }
    }

    onDeleteCycle(id);
    setDeleteConfirmCycleId(null);
    setFeedbackMessage("✅ تم حذف الدورة من الأرشيف بنجاح.");
  };

  const handleRestoreDefaults = () => {
    if (!canRestoreCycles) {
      setFeedbackMessage("⚠️ ليس لديك صلاحية استعادة الدورات الافتراضية.");
      return;
    }
    initialCycles.forEach((c) => {
      onSaveCycle(c);
    });
    setFeedbackMessage("✅ تم استعادة الدورات الافتراضية بنجاح.");
  };

  // Prepare print items safely for preview modal
  const previewExamItems = useMemo(() => {
    if (!previewExam) return [];
    if (!canAccessSubject(effectiveUser, previewExam.subjectId)) return [];

    const examQuestions =
      previewExam.versions && previewExam.versions.length > 0
        ? previewExam.versions[0].questions
        : previewExam.libraryDoc?.questionSnapshots || [];

    const subjectObj = subjects.find((s) => s.id === previewExam.subjectId);

    return generateExamPrintItems({
      template: {
        ...((previewExam as any).printTemplate || activeTemplate),
        type: "exam" as const,
      },
      title: previewExam.title,
      durationMinutes: previewExam.durationMinutes || 90,
      totalMarks: previewExam.totalMarks || 100,
      showStudentBox: true,
      showInstructions: false,
      showGradingTable: false,
      sections: [],
      questions: examQuestions,
      versionQuestions: examQuestions,
      showAnswerKey,
      canSwap: false,
      groupingEnabled: false,
      subjectName: subjectObj?.name || (previewExam as any).subjectName,
      educationalLevel: (previewExam as any).educationalLevel || "",
      academicTerm: (previewExam as any).academicTerm || "",
    });
  }, [previewExam, showAnswerKey, activeTemplate, effectiveUser]);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Feedback Banner */}
      {feedbackMessage && (
        <div className="p-4 rounded-xl bg-blue-50 text-blue-900 border border-blue-200 dark:bg-blue-950/80 dark:text-blue-200 dark:border-blue-800 text-xs font-bold flex items-center justify-between shadow-xs animate-fade-in">
          <span>{feedbackMessage}</span>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="p-1 text-blue-700 hover:text-blue-900 dark:text-blue-300 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <History className="w-6 h-6 text-[#0f6cbd] dark:text-blue-400" />
            <span>أرشيف الامتحانات والدورات السابقة</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5">
            متابعة أسئلة الامتحانات الوزارية للسنوات الماضية وحساب معامل التكرار التاريخي لتوقع أسئلة الامتحان القادم.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            onClick={handleRestoreDefaults}
            disabled={!canRestoreCycles}
            className={`px-4 py-2 text-xs sm:text-sm font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700/80 rounded-xl transition flex items-center gap-2 ${
              !canRestoreCycles ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
            }`}
            title={!canRestoreCycles ? "ليس لديك صلاحية استعادة الدورات الافتراضية" : "استعادة الدورات الافتراضية"}
          >
            <RotateCcw className="w-4 h-4" />
            <span>استعادة الدورات الافتراضية</span>
          </button>
          <button
            onClick={openAddModal}
            disabled={!canCreateCycle}
            className={`px-4 py-2 text-xs sm:text-sm font-bold bg-[#0f6cbd] hover:bg-[#115ea3] text-white rounded-xl transition flex items-center gap-2 shadow-xs ${
              !canCreateCycle ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
            }`}
            title={!canCreateCycle ? "ليس لديك صلاحية إضافة دورات مؤرشفة جديدة" : "إضافة دورة مؤرشفة جديدة"}
          >
            <Plus className="w-4 h-4" />
            <span>إضافة دورة مؤرشفة جديدة</span>
          </button>
        </div>
      </div>

      {/* Add / Edit Cycle Form Modal */}
      {(isAdding || editingCycle) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <History className="w-5 h-5 text-purple-600" />
                <span>{editingCycle ? "تعديل الدورة الامتحانية" : "إضافة دورة امتحانية مؤرشفة"}</span>
              </h2>
              <button
                onClick={() => {
                  setIsAdding(false);
                  setEditingCycle(null);
                }}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCycleSubmit} className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  اسم الدورة / الفصل الدراسي <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: الفصل الدراسي الأول 2025/2026"
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl focus:outline-hidden focus:ring-2 focus:ring-purple-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    السنة الأكاديمية
                  </label>
                  <input
                    type="text"
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                    placeholder="2025/2026"
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    حالة الدورة
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as "active" | "archived")}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl focus:outline-hidden"
                  >
                    <option value="archived">مؤرشفة</option>
                    <option value="active">نشطة حالياً</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    تاريخ البدء
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    تاريخ الانتهاء
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Connected Exams Selector Section */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-purple-600" />
                    <span>ربط نماذج الاختبارات بالدورة ({selectedExamIds.length} محددة)</span>
                  </label>
                  <div className="flex items-center gap-2 text-[10px]">
                    <button
                      type="button"
                      onClick={handleSelectAllAllowedExams}
                      className="text-blue-600 hover:underline font-bold"
                    >
                      تحديد الكل المتاح
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={handleDeselectAllExams}
                      className="text-slate-500 hover:underline font-bold"
                    >
                      إلغاء التحديد
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={examSearchQuery}
                    onChange={(e) => setExamSearchQuery(e.target.value)}
                    placeholder="ابحث في نماذج الاختبارات المسموحة لديك..."
                    className="w-full pr-8 pl-3 py-1.5 text-[11px] border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg focus:outline-hidden"
                  />
                </div>

                <div className="max-h-48 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl p-2 space-y-1.5 bg-slate-50/50 dark:bg-slate-900/40">
                  {allowedExams.length === 0 ? (
                    <div className="text-center py-4 text-slate-400 text-[11px]">
                      لا توجد نماذج اختبارات متاحة ضمن المواد المصرح بها لك.
                    </div>
                  ) : (
                    allowedExams
                      .filter((e) => {
                        if (!examSearchQuery.trim()) return true;
                        const q = examSearchQuery.toLowerCase();
                        return (
                          e.title.toLowerCase().includes(q) ||
                          (allSubjects.find((s) => s.id === e.subjectId)?.name || "").toLowerCase().includes(q)
                        );
                      })
                      .map((exam) => {
                        const isSelected = selectedExamIds.includes(exam.id);
                        const subject = allSubjects.find((s) => s.id === exam.subjectId);
                        return (
                          <div
                            key={exam.id}
                            onClick={() => handleToggleExamSelection(exam.id)}
                            className={`p-2 rounded-lg border text-[11px] flex items-center justify-between cursor-pointer transition ${
                              isSelected
                                ? "bg-purple-50 dark:bg-purple-950/40 border-purple-300 dark:border-purple-800"
                                : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-100/50"
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-purple-600 shrink-0" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-400 shrink-0" />
                              )}
                              <div className="truncate">
                                <span className="font-bold text-slate-800 dark:text-slate-200 block truncate">
                                  {exam.title}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {subject?.name || "المادة"} • {exam.totalQuestions} أسئلة • {exam.totalMarks} درجة
                                </span>
                              </div>
                            </div>
                            <span
                              className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded"
                              style={{
                                backgroundColor: subject?.color ? `${subject.color}15` : "#f3e8ff",
                                color: subject?.color || "#7e22ce",
                              }}
                            >
                              {subject?.name || "مادة مصرح بها"}
                            </span>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsAdding(false);
                    setEditingCycle(null);
                  }}
                  className="px-4 py-2 font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 rounded-xl transition cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-bold bg-[#0f6cbd] hover:bg-[#115ea3] text-white rounded-xl transition cursor-pointer"
                >
                  {editingCycle ? "حفظ التعديلات" : "حفظ الدورة"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmCycleId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-sm w-full p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                تأكيد حذف الدورة من الأرشيف
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                هل أنت متأكد من رغبتك في حذف هذه الدورة الامتحانية؟ لا يمكن التراجع عن هذا الإجراء.
              </p>
            </div>
            <div className="flex gap-2 justify-center pt-2">
              <button
                onClick={() => setDeleteConfirmCycleId(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 transition cursor-pointer"
              >
                إلغاء
              </button>
              <button
                onClick={() => handleConfirmDelete(deleteConfirmCycleId)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600 text-white hover:bg-red-700 transition cursor-pointer"
              >
                تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid View */}
      {visibleCycles.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 p-12 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs text-center space-y-4 max-w-lg mx-auto">
          <div className="w-16 h-16 bg-blue-50 dark:bg-blue-950/40 text-[#0f6cbd] dark:text-blue-400 rounded-full flex items-center justify-center mx-auto">
            <History className="w-8 h-8" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-base font-black text-slate-800 dark:text-white">
              {cycles.length === 0
                ? "أرشيف الامتحانات فارغ حالياً"
                : "لا توجد دورات مؤرشفة مرتبطة بالمواد المصرح بها لك"}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
              {cycles.length === 0
                ? "لم تقم بإضافة أي دورات مؤرشفة بعد. يمكنك استيراد الدورات الافتراضية بضغطة زر واحدة لتجربة نظام التحليل وتوقع الأسئلة."
                : "جميع الدورات المؤرشفة الحالية لا تحتوي على نماذج اختبارات ضمن المواد المسندة لحسابك."}
            </p>
          </div>
          {canRestoreCycles && cycles.length === 0 && (
            <button
              onClick={handleRestoreDefaults}
              className="px-4 py-2.5 text-xs font-bold bg-[#0f6cbd] hover:bg-[#115ea3] text-white rounded-xl transition inline-flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>استعادة الدورات الافتراضية الآن</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {visibleCycles.map((c, cIdx) => {
            // Strictly filter connected exams to only those the current user is allowed to access
            const cycleAllowedExams = (allowedExams || []).filter(
              (e) => e && c.examIds?.includes(e.id)
            );

            // Prevent non-admin users from deleting cycles containing exams outside their permissions
            const hasUnauthorizedExams = (c.examIds || []).some(
              (examId) => !allowedExams.some((e) => e.id === examId)
            );
            const canDeleteThisCycle =
              canDeleteCycle && (effectiveUser?.role === "admin" || !hasUnauthorizedExams);

            const deleteTooltipText = !canDeleteCycle
              ? "ليس لديك صلاحية حذف الدورات"
              : hasUnauthorizedExams && effectiveUser?.role !== "admin"
              ? "لا يمكن حذف هذه الدورة لاحتوائها على اختبارات تابعة لمواد أخرى خارج صلاحياتك"
              : "حذف الدورة";

            return (
              <div
                key={c.id ? `${c.id}_${cIdx}` : `cycle_${cIdx}`}
                className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition space-y-4 relative group"
              >
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="space-y-1">
                    <span className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white block">
                      {c.name}
                    </span>
                    <span className="text-[10px] sm:text-xs text-slate-400 dark:text-slate-500 font-semibold block">
                      السنة الأكاديمية: {c.academicYear}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        c.status === "active"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                          : "bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300"
                      }`}
                    >
                      {c.status === "active" ? "دورة نشطة" : "مؤرشفة"}
                    </span>

                    {/* Edit Cycle Button */}
                    <button
                      onClick={() => openEditModal(c)}
                      disabled={!canEditCycle}
                      title={!canEditCycle ? "ليس لديك صلاحية تعديل الدورات" : "تعديل الدورة وربط النماذج"}
                      className={`p-1.5 rounded-lg text-slate-400 transition opacity-0 group-hover:opacity-100 focus:opacity-100 ${
                        !canEditCycle
                          ? "cursor-not-allowed opacity-30"
                          : "hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-950/40 cursor-pointer"
                      }`}
                    >
                      <Pencil className="w-4 h-4" />
                    </button>

                    {/* Delete Cycle Button */}
                    <button
                      onClick={() => {
                        if (!canDeleteThisCycle) {
                          if (hasUnauthorizedExams) {
                            setFeedbackMessage(
                              "⚠️ لا يمكن حذف هذه الدورة لأنها تحتوي على اختبارات تابعة لمواد أخرى خارج صلاحياتك."
                            );
                          }
                          return;
                        }
                        setDeleteConfirmCycleId(c.id);
                      }}
                      disabled={!canDeleteThisCycle}
                      title={deleteTooltipText}
                      className={`p-1.5 rounded-lg text-slate-400 transition opacity-0 group-hover:opacity-100 focus:opacity-100 ${
                        !canDeleteThisCycle
                          ? "cursor-not-allowed opacity-30"
                          : "hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 cursor-pointer"
                      }`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span>البدء: {c.startDate}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span>الانتهاء: {c.endDate}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                    <Layers className="w-4 h-4 text-purple-500" />
                    <span>تحتوي على: {cycleAllowedExams.length} اختبارات مربوطة مصرح بها</span>
                  </div>
                  <span className="font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>جاهز للتحليل</span>
                  </span>
                </div>

                {/* Connected Allowed Exams List */}
                {cycleAllowedExams.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-dashed border-slate-100 dark:border-slate-800/80 space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 block">
                      قائمة الامتحانات المصرح بها في هذا الأرشيف:
                    </span>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {cycleAllowedExams.map((exam, eIdx) => {
                        const isSubjectAllowed = canAccessSubject(effectiveUser, exam.subjectId);
                        const canExportThisExam = canExport && isSubjectAllowed;
                        const sub = allSubjects.find((s) => s.id === exam.subjectId);

                        return (
                          <div
                            key={(exam.id || "exam") + "_" + eIdx}
                            className="p-2 bg-slate-50/70 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800 text-[10px] flex items-center justify-between gap-2 hover:bg-slate-100/70 dark:hover:bg-slate-800/50 transition"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-800 dark:text-slate-200 block truncate">
                                  {exam.title}
                                </span>
                                <span
                                  className="text-[8px] font-bold px-1.5 py-0.2 rounded"
                                  style={{
                                    backgroundColor: sub?.color ? `${sub.color}15` : "#f1f5f9",
                                    color: sub?.color || "#475569",
                                  }}
                                >
                                  {sub?.name || "المادة"}
                                </span>
                              </div>
                              <span className="text-[9px] text-slate-400 block mt-0.5">
                                الأسئلة: {exam.totalQuestions} | الدرجة: {exam.totalMarks} | التاريخ: {exam.createdAt}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {/* Preview & Print Button */}
                              <button
                                onClick={() => {
                                  if (!isSubjectAllowed) {
                                    setFeedbackMessage("⚠️ ليس لديك صلاحية الوصول إلى مادة هذا الامتحان.");
                                    return;
                                  }
                                  if (!canExportThisExam) {
                                    setFeedbackMessage("⚠️ ليس لديك صلاحية تصدير أو طباعة نماذج الاختبارات.");
                                    return;
                                  }
                                  setPreviewExam(exam);
                                  setShowAnswerKey(false);
                                  setIsPrintModalOpen(true);
                                }}
                                disabled={!canExportThisExam}
                                className={`px-2 py-1 rounded-lg text-[10px] font-bold transition flex items-center gap-1 ${
                                  canExportThisExam
                                    ? "bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/60 cursor-pointer"
                                    : "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600 opacity-50 cursor-not-allowed"
                                }`}
                                title={
                                  !isSubjectAllowed
                                    ? "ليس لديك صلاحية الوصول لمادة هذا الامتحان"
                                    : !canExport
                                    ? "ليس لديك صلاحية التصدير والطباعة"
                                    : "معاينة وطباعة ورقة الامتحان"
                                }
                              >
                                {canExportThisExam ? <Printer className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                                <span>طباعة</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Print Preview Modal for Selected Exam */}
      {previewExam && (
        <PrintPreviewModal
          isOpen={isPrintModalOpen}
          onClose={() => {
            setIsPrintModalOpen(false);
            setPreviewExam(null);
          }}
          title={`${allSubjects.find((s) => s.id === previewExam.subjectId)?.name || "المادة"} - نموذج اختباري - ${previewExam.title}`}
          extraToolbarContent={
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAnswerKey(!showAnswerKey)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  showAnswerKey
                    ? "bg-purple-600 hover:bg-purple-700 text-white"
                    : "bg-purple-100 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 hover:bg-purple-200"
                }`}
              >
                <span>{showAnswerKey ? "عرض ورقة الطلاب 📄" : "عرض سلّم الحل والجواب 🔑"}</span>
              </button>
            </div>
          }
        >
          <PaginatedA4Preview
            template={{
              ...((previewExam as any).printTemplate || activeTemplate),
              headerContent: {
                ...((previewExam as any).printTemplate?.headerContent || activeTemplate.headerContent),
                subjectName:
                  allSubjects.find((s) => s.id === previewExam.subjectId)?.name || "نموذج اختبار معتمد",
              },
            }}
            title={previewExam.title}
            hierarchyText={allSubjects.find((s) => s.id === previewExam.subjectId)?.name || ""}
            items={previewExamItems}
          />
        </PrintPreviewModal>
      )}
    </div>
  );
};

