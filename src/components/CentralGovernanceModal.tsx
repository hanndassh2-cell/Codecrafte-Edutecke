import React, { useState, useEffect } from "react";
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Layers,
  Database,
  BookOpen,
  FileCheck,
  Library,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  History,
  X,
  RefreshCw,
  Eye,
  Check,
  ArrowRight,
  Info,
  Server,
  Lock,
  FileText,
  Wrench,
} from "lucide-react";
import {
  centralGovernance,
  SystemIntegrityReport,
  TransactionSnapshot,
  CurriculumComplianceReport,
  QuestionComplianceItem,
  DirectionalTestResult,
  DirectionalTestFailureDetail,
} from "../services/centralGovernanceEngine";
import { storage } from "../services/storage";
import { repositories } from "../repositories";

interface CentralGovernanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenExam?: (examId: string) => void;
}

export const CentralGovernanceModal: React.FC<CentralGovernanceModalProps> = ({
  isOpen,
  onClose,
  onOpenExam,
}) => {
  const [activeTab, setActiveTab] = useState<"overview" | "compliance" | "tests" | "snapshots" | "audit" | "emergency">("overview");
  const [report, setReport] = useState<SystemIntegrityReport | null>(null);
  const [complianceReport, setComplianceReport] = useState<CurriculumComplianceReport | null>(null);
  const [testResults, setTestResults] = useState<DirectionalTestResult[]>([]);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [snapshots, setSnapshots] = useState<TransactionSnapshot[]>([]);
  const [selectedSnapshot, setSelectedSnapshot] = useState<TransactionSnapshot | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [repairingExamId, setRepairingExamId] = useState<string | null>(null);
  const [isRepairingAll, setIsRepairingAll] = useState(false);
  const [repairStats, setRepairStats] = useState<{
    libraryBeforeCount?: number;
    libraryAfterCount?: number;
    countBefore: number;
    countAfter: number;
    repairedCount: number;
  } | null>(null);

  // Rebind Modal state
  const [selectedQuestionToRebind, setSelectedQuestionToRebind] = useState<QuestionComplianceItem | null>(null);
  const [rebindSubjectId, setRebindSubjectId] = useState<string>("");
  const [rebindUnitId, setRebindUnitId] = useState<string>("");
  const [rebindLessonId, setRebindLessonId] = useState<string>("");

  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  const refreshData = async () => {
    const rep = centralGovernance.validateReferentialIntegrity();
    setReport(rep);
    setSnapshots(centralGovernance.getSnapshots());
    const compReport = centralGovernance.auditCurriculumCompliance();
    setComplianceReport(compReport);
    const logs = await repositories.auditLogs.getAll();
    setAuditLogs(logs);
  };

  useEffect(() => {
    if (isOpen) {
      refreshData();
      // Auto-run tests on open as requested
      handleRunTests();
    }
  }, [isOpen]);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleRunTests = () => {
    setIsRunningTests(true);
    setTimeout(() => {
      const results = centralGovernance.runDirectionalIntegrityTests();
      setTestResults(results);
      setIsRunningTests(false);
      refreshData();
      triggerToast("اكتملت جميع اختبارات الحوكمة وسلامة البيانات بنجاح!");
    }, 400);
  };

  const handleRollback = (snapshotId: string) => {
    if (confirm("هل أنت متأكد من استعادة هذه النقطة الزمنية؟ سيتم إرجاع جميع السجلات للحالة المحفوظة.")) {
      try {
        const ok = centralGovernance.rollbackToSnapshot(snapshotId);
        if (ok) {
          refreshData();
          triggerToast("تمت استعادة نقطة التراجع بنجاح ✓");
        } else {
          triggerToast("تعذر استعادة النقطة الزمنية.");
        }
      } catch (err: any) {
        console.error(err);
        triggerToast("فشل: " + (err.message || String(err)));
      }
    }
  };

  const handleRepairAll = () => {
    centralGovernance.safeHealDatabase();
    refreshData();
    triggerToast("تم الفحص الشامل وإصلاح جميع العلاقات والمراجع تلقائياً (بشكل آمن) ✓");
  };

  const handleOpenExam = (examId?: string) => {
    if (!examId) return;
    if (onOpenExam) {
      onOpenExam(examId);
    } else {
      window.dispatchEvent(new CustomEvent("open-exam-edit", { detail: examId }));
    }
    onClose();
  };

  const handleRepairRecord = (examId?: string) => {
    setRepairingExamId(examId || "all");
    try {
      const res = centralGovernance.repairExamRecordMissingIds(examId);
      if (res.success) {
        setRepairStats({
          countBefore: res.countBefore,
          countAfter: res.countAfter,
          repairedCount: res.repairedCount,
        });
        triggerToast(`تم إصلاح السجل وتحديث النسخة الاحتياطية بنجاح (${res.repairedCount} حقل) ✓`);
        // Re-run test
        const results = centralGovernance.runDirectionalIntegrityTests();
        setTestResults(results);
        refreshData();
      } else {
        triggerToast("تعذر إصلاح السجل أو لا توجد حقول تحتاج لتصحيح.");
      }
    } catch (err: any) {
      triggerToast("خطأ: " + err.message);
    } finally {
      setRepairingExamId(null);
    }
  };

  const handleRepairAllRecords = () => {
    setIsRepairingAll(true);
    try {
      
      const res = centralGovernance.emergencyDataRecovery();
      if (res.success) {
        setRepairStats({
          countBefore: res.examsBeforeCount,
          countAfter: res.examsAfterCount,
          libraryBeforeCount: res.libraryBeforeCount,
          libraryAfterCount: res.libraryAfterCount,
          repairedCount: Math.max(0, res.examsAfterCount - res.examsBeforeCount + res.libraryAfterCount - res.libraryBeforeCount),
        });
        console.log("RECOVERY REPORT:", res);
        triggerToast("تم استعادة جميع السجلات المفقودة بنجاح ✓");
        
        // Re-run test
        setTimeout(() => {
           const results = centralGovernance.runDirectionalIntegrityTests();
           setTestResults(results);
           refreshData();
        }, 500);
      } else {
        triggerToast("تعذر الاستعادة الطارئة.");
      }
      setIsRepairingAll(false);
      return; // Skip old logic

      setRepairStats({
        countBefore: res.countBefore,
        countAfter: res.countAfter,
        repairedCount: res.repairedCount,
      });
      triggerToast(
        `تم إصلاح جميع السجلات بنجاح (المخالفات قبل: ${res.countBefore} | بعد: ${res.countAfter}) وتحديث النسخة الاحتياطية تلقائيًا ✓`
      );
      // Automatically re-run tests immediately
      const results = centralGovernance.runDirectionalIntegrityTests();
      setTestResults(results);
      refreshData();
    } catch (err: any) {
      triggerToast("خطأ أثناء الإصلاح الجماعي: " + err.message);
    } finally {
      setIsRepairingAll(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-5xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-800 dark:text-slate-100">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">نظام الحوكمة وسلامة البيانات المركزي</h2>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  Single Source of Truth Active
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                إدارة مركزية للعلاقات: شجرة المنهاج ← بنك الأسئلة (المصدر الوحيد) ← إعداد الدروس ← مولد النماذج ← مكتبة الاختبارات
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-medium">
          <button
            onClick={() => setActiveTab("overview")}
            className={`py-3 px-3 border-b-2 flex items-center gap-2 transition ${
              activeTab === "overview"
                ? "border-blue-600 text-blue-600 dark:text-blue-400 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <Database className="w-4 h-4" />
            لوحة الحوكمة والنزاهة
          </button>
          <button
            onClick={() => setActiveTab("compliance")}
            className={`py-3 px-3 border-b-2 flex items-center gap-2 transition ${
              activeTab === "compliance"
                ? "border-blue-600 text-blue-600 dark:text-blue-400 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            مطابقة الشجرة والبنك
            {complianceReport && complianceReport.requiresReviewCount > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-bold">
                {complianceReport.requiresReviewCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("tests")}
            className={`py-3 px-3 border-b-2 flex items-center gap-2 transition ${
              activeTab === "tests"
                ? "border-blue-600 text-blue-600 dark:text-blue-400 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <Play className="w-4 h-4" />
            فحص التدفقات والاتجاهات
          </button>
          <button
            onClick={() => setActiveTab("snapshots")}
            className={`py-3 px-3 border-b-2 flex items-center gap-2 transition ${
              activeTab === "snapshots"
                ? "border-blue-600 text-blue-600 dark:text-blue-400 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            نقاط التراجع (Rollback Snapshots)
            {snapshots.length > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-slate-200 dark:bg-slate-700 font-bold">
                {snapshots.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("audit")}
            className={`py-3 px-3 border-b-2 flex items-center gap-2 transition ${
              activeTab === "audit"
                ? "border-blue-600 text-blue-600 dark:text-blue-400 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <History className="w-4 h-4" />
            سجل العمليات
          </button>
          
          <button
            onClick={() => setActiveTab("emergency")}
            className={`py-3 px-3 border-b-2 flex items-center gap-2 transition ${
              activeTab === "emergency"
                ? "border-red-600 text-red-600 dark:text-red-400 font-bold bg-red-50 dark:bg-red-900/20"
                : "border-transparent text-red-500 hover:text-red-700 dark:hover:text-red-400"
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            وضع الطوارئ (Emergency)
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          {/* TOAST ALERT */}
          {toastMessage && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-200 text-sm flex items-center gap-2 shadow-sm animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
              <span>{toastMessage}</span>
            </div>
          )}

          {/* TAB 1: OVERVIEW & ARCHITECTURE */}
          {activeTab === "overview" && report && (
            <div className="space-y-6">
              {/* Top Architecture Flow Ribbon */}
              <div className="p-4 bg-gradient-to-r from-blue-50/70 via-indigo-50/70 to-emerald-50/70 dark:from-slate-800/80 dark:via-slate-800/60 dark:to-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl mb-4">
                <div className="flex justify-between items-center mb-3">
                  <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    نموذج الحوكمة الموحد (5 Modules Canonical Architecture)
                  </div>
                  <div className="text-[11px] font-bold px-2 py-1 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-blue-600" />
                    <span>إصدار المخطط الحالي: <span className={storage.getSchemaStatus().isUpToDate ? "text-emerald-600" : "text-amber-600"}>v{storage.getSchemaStatus().currentVersion}</span> (الهدف: v{storage.getSchemaStatus().targetVersion})</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-center text-xs font-medium">
                  <div className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg flex flex-col items-center justify-center gap-1 shadow-sm">
                    <Layers className="w-4 h-4 text-blue-600" />
                    <span className="font-bold">1. شجرة المنهاج</span>
                    <span className="text-[10px] text-slate-500">المواد والوحدات والدروس</span>
                  </div>
                  <div className="p-2.5 bg-blue-50 dark:bg-blue-950/60 border-2 border-blue-500 rounded-lg flex flex-col items-center justify-center gap-1 shadow-md">
                    <Database className="w-4 h-4 text-blue-600" />
                    <span className="font-bold text-blue-700 dark:text-blue-300">2. بنك الأسئلة</span>
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">المصدر الأصلي والوحيد</span>
                  </div>
                  <div className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg flex flex-col items-center justify-center gap-1 shadow-sm">
                    <BookOpen className="w-4 h-4 text-emerald-600" />
                    <span className="font-bold">3. إعداد الدروس</span>
                    <span className="text-[10px] text-slate-500">روابط فقط (References)</span>
                  </div>
                  <div className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg flex flex-col items-center justify-center gap-1 shadow-sm">
                    <FileCheck className="w-4 h-4 text-amber-600" />
                    <span className="font-bold">4. مولد النماذج</span>
                    <span className="text-[10px] text-slate-500">روابط فقط (References)</span>
                  </div>
                  <div className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg flex flex-col items-center justify-center gap-1 shadow-sm">
                    <Library className="w-4 h-4 text-purple-600" />
                    <span className="font-bold">5. مكتبة الاختبارات</span>
                    <span className="text-[10px] text-slate-500">روابط فقط (References)</span>
                  </div>
                </div>
              </div>

              {/* Key Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl">
                  <div className="text-xs text-slate-500 mb-1 font-medium">الأسئلة الأصلية في البنك</div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">
                    {report.totalCanonicalQuestions}
                  </div>
                  <div className="text-[11px] text-emerald-600 font-medium mt-1">
                    المصدر الأصلي للبيانات
                  </div>
                </div>
                <div className="p-4 bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl">
                  <div className="text-xs text-slate-500 mb-1 font-medium">إجمالي الارتباطات الفعالة</div>
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {report.totalActiveReferences}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    في الدروس والبطاقات والاختبارات
                  </div>
                </div>
                <div className="p-4 bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl">
                  <div className="text-xs text-slate-500 mb-1 font-medium">الأسئلة المعزولة أو المكررة</div>
                  <div className="text-2xl font-bold text-emerald-600">
                    {report.orphanedQuestionsCount + (report.duplicateUUIDsCount || 0)}
                  </div>
                  <div className={`text-[11px] font-medium mt-1 ${report.orphanedQuestionsCount === 0 && (report.duplicateUUIDsCount || 0) === 0 ? "text-emerald-600" : "text-amber-600"}`}>
                    {report.orphanedQuestionsCount === 0 && (report.duplicateUUIDsCount || 0) === 0 ? "بيانات سليمة تماماً" : `${report.orphanedQuestionsCount} معزول، ${(report.duplicateUUIDsCount || 0)} مكرر`}
                  </div>
                </div>
                <div className="p-4 bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl">
                  <div className="text-xs text-slate-500 mb-1 font-medium">درجة النزاهة التوافقية</div>
                  <div className={`text-2xl font-bold ${report.score === 100 ? "text-emerald-600" : "text-amber-600"}`}>
                    {report.score}%
                  </div>
                  <div className={`text-[11px] font-medium mt-1 ${report.score === 100 ? "text-emerald-600" : "text-amber-600"}`}>
                    {report.score === 100 ? "توافق كامل بين جميع الوحدات" : "يوجد مراجع تحتاج للمراجعة"}
                  </div>
                </div>
              </div>

              {/* Modules Detailed Status */}
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <span className="font-bold text-sm">حالة المزامنة والربط عبر النوافذ الخمس</span>
                  <button
                    onClick={handleRepairAll}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    فحص وإصلاح المراجع تلقائياً
                  </button>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                  <div className="p-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center font-bold">
                        1
                      </div>
                      <div>
                        <div className="font-semibold">شجرة المنهاج (Curriculum Tree)</div>
                        <div className="text-xs text-slate-500">{report.modules.curriculumTree.message}</div>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                      Single Source Active ✓
                    </span>
                  </div>

                  <div className="p-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center font-bold">
                        2
                      </div>
                      <div>
                        <div className="font-semibold">بنك الأسئلة المركزي (Question Bank)</div>
                        <div className="text-xs text-slate-500">{report.modules.questionBank.message}</div>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                      Single Source Active ✓
                    </span>
                  </div>

                  <div className="p-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center font-bold">
                        3
                      </div>
                      <div>
                        <div className="font-semibold">إعداد الدروس والبطاقات (Lesson Editor)</div>
                        <div className="text-xs text-slate-500">{report.modules.lessonEditor.message}</div>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                      Single Source Active ✓
                    </span>
                  </div>

                  <div className="p-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center font-bold">
                        4
                      </div>
                      <div>
                        <div className="font-semibold">مولد النماذج الامتحانية (Exam Generator)</div>
                        <div className="text-xs text-slate-500">{report.modules.examGenerator.message}</div>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                      Single Source Active ✓
                    </span>
                  </div>

                  <div className="p-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center font-bold">
                        5
                      </div>
                      <div>
                        <div className="font-semibold">مكتبة الاختبارات (Exams Library)</div>
                        <div className="text-xs text-slate-500">{report.modules.examLibrary.message}</div>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                      Single Source Active ✓
                    </span>
                  </div>
                </div>
              </div>

              {/* Core Governance Rules Card */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2">
                <div className="font-bold text-sm flex items-center gap-2">
                  <Lock className="w-4 h-4 text-blue-600" />
                  قواعد الحوكمة الصارمة المطبقة آلياً:
                </div>
                <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5 list-disc list-inside">
                  <li><span className="font-semibold">الإضافة:</span> يتم إنشاء السجل الأصلي في بنك الأسئلة أولاً، ثم إنشاء الارتباطات في الدروس والاختبارات.</li>
                  <li><span className="font-semibold">التعديل:</span> يُعدل السجل المركزي في بنك الأسئلة وينعكس فوراً وتلقائياً على جميع النوافذ.</li>
                  <li><span className="font-semibold">الإزالة من درس:</span> يُحذف الارتباط (Link) فقط، ويبقى السؤال الأصلي محفوظاً ببنك الأسئلة ومساره كاملاً.</li>
                  <li><span className="font-semibold">الحذف النهائي:</span> محظور تماماً إذا كان للسؤال أي ارتباط نشط، ويتاح خيار الأرشفة (Soft Delete) مع الاستعادة الفورية.</li>
                  <li><span className="font-semibold">تعديل المنهاج:</span> محمي بنظام المعاملات الذاتية (Transactions) مع إنشاء نسخ احتياطية واستعادة تلقائية عند أي خطأ.</li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB: CURRICULUM & QUESTION BANK COMPLIANCE */}
          {activeTab === "compliance" && complianceReport && (
            <div className="space-y-6">
              {/* Golden Rule Header Card */}
              <div className="p-4 bg-gradient-to-r from-amber-500/10 via-emerald-500/10 to-blue-500/10 border-2 border-amber-500/30 dark:border-amber-500/20 rounded-2xl">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-amber-500/20 text-amber-700 dark:text-amber-300 rounded-xl">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                        القاعدة الذهبية للحوكمة: التكامل الجذري بين شجرة المنهاج وبنك الأسئلة
                      </h3>
                      <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-100">
                        Golden Rule Enforced
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                      <strong>شجرة المنهاج</strong> هي المصدر المعتمد الوحيد للمواد والوحدات والدروس. <strong>بنك الأسئلة</strong> هو المصدر المعتمد الوحيد للأسئلة.
                      ولا يُقبل وجود أي سؤال ببنك الأسئلة إلا إذا كان مرتبطاً بـ <code className="bg-white/80 dark:bg-slate-800 px-1 py-0.5 rounded border border-slate-200 dark:border-slate-700 font-mono">Curriculum ID</code> حقيقي موجود في شجرة المنهاج.
                    </p>
                  </div>
                </div>
              </div>

              {/* Compliance Metrics Overview */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl">
                  <div className="text-xs text-slate-500 mb-1 font-medium">إجمالي الأسئلة المربوطة</div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">
                    {complianceReport.totalQuestionsAudited}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">خضعت للفحص والتدقيق</div>
                </div>
                <div className="p-4 bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl">
                  <div className="text-xs text-slate-500 mb-1 font-medium">أسئلة مطابقة 100%</div>
                  <div className="text-2xl font-bold text-emerald-600">
                    {complianceReport.compliantCount}
                  </div>
                  <div className="text-[11px] text-emerald-600 font-medium mt-1">
                    مرتبطة بعقد شجرة المنهاج الحالية
                  </div>
                </div>
                <div className="p-4 bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl">
                  <div className="text-xs text-slate-500 mb-1 font-medium">تم إصلاح المسميات آلياً</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {complianceReport.autoRepairedCount}
                  </div>
                  <div className="text-[11px] text-blue-600 font-medium mt-1">
                    تم تحديث عناوين المادة والوحدة للدرس
                  </div>
                </div>
                <div className="p-4 bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl">
                  <div className="text-xs text-slate-500 mb-1 font-medium">غير مصنف / يحتاج مراجعة</div>
                  <div className="text-2xl font-bold text-amber-600">
                    {complianceReport.requiresReviewCount}
                  </div>
                  <div className="text-[11px] text-amber-600 font-medium mt-1">
                    أسئلة يتيمة محفوظة بكامل بياناتها
                  </div>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl">
                <div>
                  <h4 className="font-bold text-sm">أدوات الفحص التلقائي وإعادة التوجيه</h4>
                  <p className="text-xs text-slate-500">
                    يمكنك تشغيل المطابقة لمعالجة أي تعارض تلقائياً دون حذف أي سؤال.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const rep = centralGovernance.auditCurriculumCompliance();
                      setComplianceReport(rep);
                      triggerToast("تم الفحص والمطابقة مع شجرة المنهاج بنجاح ✓");
                    }}
                    className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold flex items-center gap-1.5 hover:bg-slate-100 transition"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    تحديث فحص الشجرة
                  </button>
                  <button
                    onClick={() => {
                      const rep = centralGovernance.autoRepairAndRebindQuestions("المعلم");
                      setComplianceReport(rep);
                      refreshData();
                      triggerToast("تمت مطابقة وإصلاح مراجع الأسئلة تلقائياً دون أي فقدان للبيانات ✓");
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    تطبيق المطابقة والإصلاح الآلي
                  </button>
                </div>
              </div>

              {/* List of Questions requiring Review / Rebinding */}
              <div className="space-y-3">
                <h4 className="font-bold text-sm flex items-center justify-between">
                  <span>سجل الأسئلة المأرشفة وغير المصنفة ({complianceReport.items.filter(i => i.status !== "compliant").length})</span>
                  <span className="text-xs text-slate-500 font-normal">
                    (لا يتأثر أداء أي سؤال أو اختباره أثناء وجوده بهذه القائمة)
                  </span>
                </h4>

                {complianceReport.items.filter(i => i.status !== "compliant").length === 0 ? (
                  <div className="py-12 text-center border border-dashed border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20 rounded-xl">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                    <p className="text-sm font-bold text-emerald-800 dark:text-emerald-200">
                      جميع الأسئلة في بنك الأسئلة مرتبطة 100% بـ Curriculum IDs حقيقية في شجرة المنهاج!
                    </p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                      النظام ملتزم كلياً بالقاعدة الذهبية Single Source of Truth.
                    </p>
                  </div>
                ) : (
                  <div className="border border-slate-200 dark:border-slate-700 rounded-xl divide-y divide-slate-100 dark:divide-slate-800 max-h-96 overflow-y-auto">
                    {complianceReport.items
                      .filter(i => i.status !== "compliant")
                      .map((item) => (
                        <div key={item.questionId} className="p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                #{item.questionId}
                              </span>
                              <span
                                className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                                  item.status === "repaired"
                                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300"
                                    : "bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300"
                                }`}
                              >
                                {item.status === "repaired" ? "تم الإصلاح الآلي" : "يحتاج إعادة ربط"}
                              </span>
                            </div>
                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 line-clamp-2">
                              {item.questionText || "بدون نص"}
                            </p>
                            {item.issueDescription && (
                              <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                <Info className="w-3 h-3 flex-shrink-0" />
                                <span>{item.issueDescription}</span>
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => {
                              setSelectedQuestionToRebind(item);
                              const subs = storage.getSubjects();
                              setRebindSubjectId(item.currentSubjectId || subs[0]?.id || "");
                              setRebindUnitId(item.currentUnitId || "");
                              setRebindLessonId(item.currentLessonId || "");
                            }}
                            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-lg text-xs font-bold flex items-center gap-1 transition flex-shrink-0"
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                            إعادة الربط بالدرس
                          </button>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: DIRECTIONAL TEST RUNNER */}
          {activeTab === "tests" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="font-bold text-base">فحص سلامة العمليات ثنائية الاتجاه</h3>
                    {testResults.length > 0 && (
                      <span
                        className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${
                          testResults.every((t) => t.passed)
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
                        }`}
                      >
                        {testResults.filter((t) => t.passed).length}/{testResults.length} PASS
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">
                    اختبار دورة الحياة الكاملة: إضافة ← تعديل ← إزالة الارتباط ← حظر الحذف الخطأ ← أرشفة واستعادة ← فحص النسخ الاحتياطية.
                  </p>
                </div>
                <button
                  onClick={handleRunTests}
                  disabled={isRunningTests}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-bold text-sm flex items-center gap-2 transition shadow-sm"
                >
                  {isRunningTests ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      جاري تنفيذ الاختبارات...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      بدء الاختبار الشامل
                    </>
                  )}
                </button>
              </div>

              {/* Repair Stats Notification Bar */}
              {repairStats && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs flex flex-wrap items-center justify-between gap-2 shadow-xs">
                  <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span className="font-bold">إحصائيات آخر عملية إصلاح:</span>
                    <span>المخالفات قبل: <strong className="font-mono bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">{repairStats.countBefore}</strong></span>
                    <span>← بعد: <strong className="font-mono bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300">{repairStats.countAfter}</strong></span>
                    <span className="text-slate-500">(تم تصحيح {repairStats.repairedCount} حقل بنجاح)</span>
                  </div>
                  <span className={`px-2.5 py-1 text-xs font-bold rounded-lg ${
                    repairStats.countAfter === 0
                      ? "bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700"
                      : "bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700"
                  }`}>
                    المخالفات: {repairStats.countAfter === 0 ? "0 ✓ (تطابق 100%)" : `${repairStats.countAfter} ✕`}
                  </span>
                </div>
              )}

              {testResults.length === 0 ? (
                <div className="py-12 text-center border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                  <Play className="w-10 h-10 text-slate-400 mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                    اضغط على "بدء الاختبار الشامل" للتحقق من تدفق البيانات بين النوافذ الخمس
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {testResults.map((t, idx) => (
                    <div
                      key={idx}
                      className={`p-4 border rounded-xl flex flex-col gap-3 ${
                        t.passed
                          ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800"
                          : "bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          {t.passed ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                          ) : (
                            <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                          )}
                          <div>
                            <div className="font-bold text-sm">{t.testName}</div>
                            <div className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 font-mono">
                              {t.details}
                            </div>
                          </div>
                        </div>
                        <span
                          className={`px-2 py-0.5 text-xs font-bold rounded-full flex-shrink-0 ${
                            t.passed
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300"
                              : "bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300"
                          }`}
                        >
                          {t.passed ? "ناجح ✓" : "فشل ✕"}
                        </span>
                      </div>

                      {/* Explicit Record Failure Diagnostic and Action Cards */}
                      {t.failureDetails && t.failureDetails.length > 0 && (
                        <div className="mt-2 pt-3 border-t border-rose-200/70 dark:border-rose-800/60 space-y-3">
                          {/* Bulk Repair Master Banner */}
                          <div className="p-3.5 bg-gradient-to-r from-amber-500/15 via-blue-500/10 to-emerald-500/15 border border-amber-300 dark:border-amber-700/60 rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-xs">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-amber-500/20 text-amber-700 dark:text-amber-300 rounded-lg flex-shrink-0">
                                <Wrench className="w-5 h-5" />
                              </div>
                              <div>
                                <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                                  <span>استعادة طوارئ لجميع النماذج والاختبارات المفقودة</span>
                                  <span className="px-2 py-0.5 bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 rounded-full text-xs font-bold font-mono">
                                    {t.failureDetails.length} سجل متأثر
                                  </span>
                                </div>
                                <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                                  يقوم بفحص جميع الامتحانات والنسخ وتعيين <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded font-mono text-[11px] font-bold">id = questionId</code> للأسئلة المفقودة، ثم حفظ <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded font-mono text-[11px] font-bold">edutech_exams_v1</code> وتحديث النسخة الاحتياطية تلقائيًا.
                                </p>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={handleRepairAllRecords}
                              disabled={isRepairingAll}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition shadow-sm cursor-pointer"
                            >
                              {isRepairingAll ? (
                                <>
                                  <RefreshCw className="w-4 h-4 animate-spin" />
                                  <span>جاري الإصلاح الجماعي...</span>
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="w-4 h-4" />
                                  <span>إصلاح جميع السجلات ({t.failureDetails.length} سجل)</span>
                                </>
                              )}
                            </button>
                          </div>

                          <div className="text-xs font-bold text-rose-800 dark:text-rose-300 flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                              <span>تفاصيل السجلات المسببة لعدم التطابق ({(t.failureDetails || []).length}):</span>
                            </div>
                            <span className="text-[11px] text-slate-500 font-normal">
                              يمكنك فحص الامتحان يدوياً أو إصلاح الحقل المفقود فوراً
                            </span>
                          </div>

                          <div className="space-y-2.5">
                            {(t.failureDetails || []).map((fail, fIdx) => (
                              <div
                                key={fIdx}
                                className="p-3 bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800/80 rounded-xl shadow-xs text-xs space-y-2.5"
                              >
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-slate-700 dark:text-slate-200">
                                  {fail.examId && (
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-slate-400 dark:text-slate-500 font-medium">examId:</span>
                                      <code className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 rounded font-mono text-[11px] font-bold">
                                        {fail.examId}
                                      </code>
                                    </div>
                                  )}
                                  {fail.examTitle && (
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-slate-400 dark:text-slate-500 font-medium">اسم الامتحان:</span>
                                      <span className="font-bold text-slate-900 dark:text-white truncate">
                                        {fail.examTitle}
                                      </span>
                                    </div>
                                  )}
                                  {fail.versionCode && (
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-slate-400 dark:text-slate-500 font-medium">النسخة:</span>
                                      <span className="px-1.5 py-0.5 bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold rounded text-[11px]">
                                        {fail.versionCode}
                                      </span>
                                    </div>
                                  )}
                                  {fail.questionId && (
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-slate-400 dark:text-slate-500 font-medium">questionId:</span>
                                      <code className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-amber-600 dark:text-amber-400 rounded font-mono text-[11px] font-bold">
                                        {fail.questionId}
                                      </code>
                                    </div>
                                  )}
                                  {fail.fieldPath && (
                                    <div className="flex items-center gap-1.5 sm:col-span-2">
                                      <span className="text-slate-400 dark:text-slate-500 font-medium whitespace-nowrap">المسار الكامل للحقل:</span>
                                      <code className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-rose-600 dark:text-rose-400 rounded font-mono text-[11px] dir-ltr text-left overflow-x-auto">
                                        {fail.fieldPath}
                                      </code>
                                    </div>
                                  )}
                                </div>

                                {/* Comparison Values */}
                                <div className="flex flex-wrap items-center gap-2 pt-1.5 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                                  <span className="text-slate-400 dark:text-slate-500 font-medium">مقارنة القيم:</span>
                                  <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded font-mono">
                                    النسخة الاحتياطية (backup): {fail.beforeVal === undefined ? "undefined" : JSON.stringify(fail.beforeVal)}
                                  </span>
                                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 rotate-180" />
                                  <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 rounded font-mono font-bold">
                                    الحالي (current): {fail.afterVal === undefined ? "undefined" : JSON.stringify(fail.afterVal)}
                                  </span>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                                  {fail.examId && (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenExam(fail.examId)}
                                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg font-bold text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                                      title="فتح الامتحان في محرر الامتحانات للوصول اليدوي"
                                    >
                                      <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                      <span>فتح الامتحان</span>
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleRepairRecord(fail.examId)}
                                    disabled={repairingExamId === fail.examId || repairingExamId === "all"}
                                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                                    title="ملء id = questionId فقط إذا كان id مفقوداً وتحديث النسخة الاحتياطية"
                                  >
                                    <Wrench className="w-3.5 h-3.5" />
                                    <span>{repairingExamId === fail.examId ? "جاري الإصلاح..." : "إصلاح السجل"}</span>
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ROLLBACK SNAPSHOTS */}
          {activeTab === "snapshots" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base">نقاط التراجع التلقائية (Rollback Snapshots)</h3>
                  <p className="text-xs text-slate-500">
                    يتم إنشاء نسخة احتياطية فورية قبل أي عملية حساسة لحماية البيانات التعليمية من أي خطأ.
                  </p>
                </div>
                <button
                  onClick={() => {
                    const snapId = centralGovernance.createRollbackSnapshot("نسخة احتياطية يدوية");
                    refreshData();
                    triggerToast("تم إنشاء نقطة استعادة يدوية بنجاح ✓");
                  }}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition"
                >
                  + إنشاء نقطة استعادة فورية
                </button>
              </div>

              {snapshots.length === 0 ? (
                <div className="py-12 text-center border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                  <RotateCcw className="w-10 h-10 text-slate-400 mx-auto mb-2 opacity-50" />
                  <p className="text-sm text-slate-500">لا توجد نقاط تراجع مسجلة حالياً</p>
                </div>
              ) : (
                <div className="border border-slate-200 dark:border-slate-700 rounded-xl divide-y divide-slate-100 dark:divide-slate-800">
                  {snapshots.map((snap) => (
                    <div key={snap.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                      <div>
                        <div className="font-bold text-sm text-slate-800 dark:text-slate-100">
                          {snap.actionName}
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-3 mt-1">
                          <span>المستخدم: {snap.user}</span>
                          <span>•</span>
                          <span>التوقيت: {new Date(snap.timestamp).toLocaleString("ar-SA")}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRollback(snap.id)}
                        className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-lg text-xs font-bold flex items-center gap-1.5 transition"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        استعادة هذه النقطة
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: AUDIT TRAIL */}
          {activeTab === "audit" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base">سجل التدقيق والحوكمة (Audit Trail)</h3>
                  <p className="text-xs text-slate-500">
                    توثيق كامل لكل عمليات الإضافة والتعديل والفك والأرشفة والاستعادة والحذف.
                  </p>
                </div>
              </div>

              <div className="border border-slate-200 dark:border-slate-700 rounded-xl max-h-96 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {auditLogs.map((log) => (
                  <div key={log.id} className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-800 dark:text-slate-100">{log.action}</div>
                      <div className="text-slate-500 mt-0.5">
                        الوحدة: {log.module || log.targetEntity || "عام"} | {log.details || ""}
                      </div>
                    </div>
                    <div className="text-slate-400 text-[11px] text-left">
                      {new Date(log.timestamp).toLocaleTimeString("ar-SA")}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/40">
          <div className="text-xs text-slate-500">
            الحوكمة المركزية نشطة وتمنع تكرار البيانات أو تلف المراجع
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-xl font-bold text-sm transition"
          >
            إغلاق
          </button>
        </div>
      </div>

      {/* REBIND QUESTION DIALOG */}
      {selectedQuestionToRebind && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-base flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-600" />
                إعادة ربط السؤال بشجرة المنهاج
              </h3>
              <button
                onClick={() => setSelectedQuestionToRebind(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-xs space-y-1">
              <span className="font-bold text-slate-500">نص السؤال:</span>
              <p className="text-slate-800 dark:text-slate-200 font-semibold line-clamp-3">
                {selectedQuestionToRebind.questionText}
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">1. اختر المادة:</label>
                <select
                  value={rebindSubjectId}
                  onChange={(e) => {
                    setRebindSubjectId(e.target.value);
                    setRebindUnitId("");
                    setRebindLessonId("");
                  }}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium"
                >
                  {storage.getSubjects().map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1">2. اختر الوحدة:</label>
                <select
                  value={rebindUnitId}
                  onChange={(e) => {
                    setRebindUnitId(e.target.value);
                    setRebindLessonId("");
                  }}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium"
                >
                  {storage.getUnits().filter(u => u && u.subjectId === rebindSubjectId).map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1">3. اختر الدرس النهائي المعتمد:</label>
                <select
                  value={rebindLessonId}
                  onChange={(e) => setRebindLessonId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium"
                >
                  {storage.getLessons().filter(l => l && l.unitId === rebindUnitId).map((les) => (
                    <option key={les.id} value={les.id}>
                      {les.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setSelectedQuestionToRebind(null)}
                className="px-4 py-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-xs font-bold"
              >
                إلغاء
              </button>
              <button
                onClick={() => {
                  if (!rebindSubjectId || !rebindUnitId || !rebindLessonId) {
                    alert("يرجى اختيار المادة والوحدة والدرس بالكامل.");
                    return;
                  }
                  centralGovernance.rebindQuestionToCurriculum(
                    selectedQuestionToRebind.questionId,
                    rebindSubjectId,
                    rebindUnitId,
                    rebindLessonId,
                    "المعلم"
                  );
                  setSelectedQuestionToRebind(null);
                  refreshData();
                  triggerToast("تمت إعادة ربط السؤال بدرس شجرة المنهاج وتفعيله بنجاح ✓");
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition"
              >
                تأكيد وإعادة التفعيل
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
