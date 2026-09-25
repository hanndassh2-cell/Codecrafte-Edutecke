import React, { useState, useEffect } from "react";
import {
  X,
  Layers,
  CheckCircle2,
  AlertCircle,
  Type,
  Target,
  Lightbulb,
  BookOpen,
  Image as ImageIcon,
  Table as TableIcon,
  Sigma,
  Activity,
  HelpCircle,
  StickyNote,
  CheckSquare,
  ArrowRight,
  Eye,
  Sliders,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { SemanticElement, ContentAnalysisResult } from "../../../services/contentAnalyzer";
import {
  distributeContentToCards,
  DistributedCardProposal,
  convertProposalsToEditorCards,
  ELEMENT_TO_CARD_MAP,
} from "../../../services/contentDistributor";
import { CARD_TYPES } from "./EditorPanel";
import { MathText } from "../../../components/MathText";
import { RichTextEditor } from "./RichTextEditor";

interface ContentDistributorModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysisResult: ContentAnalysisResult | null;
  onConfirmDistribute: (newCards: any[]) => void;
  lessonContext?: any;
}

const CARD_ICONS: Record<string, any> = {
  title: Type,
  objectives: Target,
  concepts: Lightbulb,
  explanation: BookOpen,
  images: ImageIcon,
  tables: TableIcon,
  math: Sigma,
  activities: Activity,
  questions: HelpCircle,
  notes: StickyNote,
  examples: CheckSquare,
};

export const ContentDistributorModal: React.FC<ContentDistributorModalProps> = ({
  isOpen,
  onClose,
  analysisResult,
  onConfirmDistribute,
  lessonContext,
}) => {
  const [proposals, setProposals] = useState<DistributedCardProposal[]>([]);
  const [groupSameType, setGroupSameType] = useState(true);
  const [activePreviewId, setActivePreviewId] = useState<string | null>(null);

  useEffect(() => {
    if (analysisResult && analysisResult.elements.length > 0) {
      const res = distributeContentToCards(analysisResult.elements, groupSameType);
      setProposals(res.proposals);
      if (res.proposals.length > 0) {
        setActivePreviewId(res.proposals[0].id);
      }
    } else {
      setProposals([]);
    }
  }, [analysisResult, groupSameType]);

  if (!isOpen || !analysisResult) return null;

  const handleToggleCard = (id: string) => {
    setProposals((prev) =>
      prev.map((p) => (p.id === id ? { ...p, isEnabled: !p.isEnabled } : p))
    );
  };

  const handleChangeCardType = (id: string, newType: string) => {
    const cardInfo = CARD_TYPES.find((c) => c.type === newType);
    if (!cardInfo) return;
    setProposals((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              cardType: newType,
              cardTitle: cardInfo.label,
            }
          : p
      )
    );
  };

  const handleUpdateCardTitle = (id: string, newTitle: string) => {
    setProposals((prev) =>
      prev.map((p) => (p.id === id ? { ...p, cardTitle: newTitle } : p))
    );
  };

  const handleConfirm = () => {
    const newCards = convertProposalsToEditorCards(proposals, lessonContext);
    onConfirmDistribute(newCards);
    onClose();
  };

  const enabledCount = proposals.filter((p) => p.isEnabled).length;
  const activeProposal = proposals.find((p) => p.id === activePreviewId) || proposals[0];

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in" dir="rtl">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-800 dark:text-slate-100 text-lg flex items-center gap-2">
                موزع المحتوى التلقائي (Content Distributor)
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                  مراجعة قبل الإدراج
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                تم توزيع {analysisResult.summary.totalElements} عنصراً محللاً على البطاقات التعليمية المناسبة تلقائياً
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Control Bar */}
        <div className="px-6 py-3 bg-indigo-50/50 dark:bg-indigo-950/20 border-b border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between gap-4 text-xs font-medium text-slate-700 dark:text-slate-300">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
              <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              إجمالي البطاقات التلقائية: <strong className="text-indigo-600 dark:text-indigo-400 font-extrabold">{enabledCount} بطاقة</strong>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                window.dispatchEvent(
                  new CustomEvent("open-ai-content-assistant", {
                    detail: analysisResult?.elements || [],
                  })
                );
                onClose();
              }}
              className="px-3 py-1.5 rounded-xl border border-purple-300 dark:border-purple-800 bg-purple-100/70 dark:bg-purple-950/60 text-purple-800 dark:text-purple-200 hover:bg-purple-200/80 font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs transition"
              title="تحليل العناصر غير المحددة بدقة عبر مساعد المحتوى الذكي"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-600 animate-pulse" />
              <span>مساعد المحتوى الذكي (AI Fallback)</span>
            </button>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={groupSameType}
                onChange={(e) => setGroupSameType(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <span>تجميع العناصر المتشابهة في بطاقة واحدة</span>
            </label>
          </div>
        </div>

        {/* Main Content Split (Card Proposals List vs Card Live Preview) */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-0">
          
          {/* Left / Right Column 1: Proposals List (7 cols) */}
          <div className="lg:col-span-7 border-l border-slate-200 dark:border-slate-800 p-4 overflow-y-auto space-y-3 bg-slate-50/30 dark:bg-slate-950/30">
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 flex items-center justify-between">
              <span>البطاقات المقترحة للتوزيع:</span>
              <span className="text-[11px] text-slate-400">يمكنك تعديل نوع البطاقة أو تعطيلها</span>
            </div>

            {proposals.map((prop) => {
              const cardDef = CARD_TYPES.find((c) => c.type === prop.cardType);
              const IconComp = CARD_ICONS[prop.cardType] || BookOpen;
              const isSelected = activePreviewId === prop.id;

              return (
                <div
                  key={prop.id}
                  onClick={() => setActivePreviewId(prop.id)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer space-y-2.5 ${
                    isSelected
                      ? "border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/30 shadow-sm"
                      : prop.isEnabled
                      ? "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700"
                      : "border-slate-200/50 dark:border-slate-800/50 bg-slate-100/50 dark:bg-slate-900/30 opacity-60"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <input
                        type="checkbox"
                        checked={prop.isEnabled}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleToggleCard(prop.id);
                        }}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />

                      <div className={`p-2 rounded-xl border ${cardDef?.color || "bg-slate-100 text-slate-700 border-slate-200"}`}>
                        <IconComp className="w-4 h-4" />
                      </div>

                      <input
                        type="text"
                        value={prop.cardTitle}
                        onChange={(e) => handleUpdateCardTitle(prop.id, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="font-bold text-xs text-slate-800 dark:text-slate-100 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none px-1 py-0.5 rounded"
                      />
                    </div>

                    {/* Destination Card Type Dropdown */}
                    <select
                      value={prop.cardType}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => handleChangeCardType(prop.id, e.target.value)}
                      className="px-2 py-1 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] bg-white dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                    >
                      {CARD_TYPES.map((c) => (
                        <option key={c.type} value={c.type}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Elements breakdown inside card */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-1 text-[10px]">
                    <span className="text-slate-400 font-medium">العناصر المسندة:</span>
                    {(prop.elements || []).map((elem, i) => (
                      <span
                        key={elem.id || i}
                        className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border border-slate-200/60 dark:border-slate-700/60"
                      >
                        {elem.typeLabelArabic} ({elem.type})
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Column 2: Selected Card Live Preview (5 cols) */}
          <div className="lg:col-span-5 p-4 flex flex-col min-h-0 bg-white dark:bg-slate-900">
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 flex items-center justify-between shrink-0">
              <span className="flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-indigo-600" />
                معاينة البطاقة قبل الإدراج:
              </span>
              {activeProposal && (
                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                  {activeProposal.cardTitle}
                </span>
              )}
            </div>

            {activeProposal ? (
              <div className="flex-1 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 overflow-y-auto bg-slate-50/50 dark:bg-slate-950/50 space-y-3">
                <div className="pb-2 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <h4 className="font-black text-sm text-slate-800 dark:text-slate-100">
                    {activeProposal.cardTitle}
                  </h4>
                  <span className="text-[10px] font-mono text-slate-400">
                    نوع البطاقة: {activeProposal.cardType}
                  </span>
                </div>

                <div className="prose prose-sm dark:prose-invert max-w-none text-right">
                  <RichTextEditor value={activeProposal.htmlBody || "<p className='text-slate-400'>لا يوجد محتوى في هذه البطاقة</p>"} readOnly />
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-400 text-xs border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                حدد بطاقة لملاحظة المعاينة
              </div>
            )}
          </div>

        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-between shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            إلغاء
          </button>

          <button
            onClick={handleConfirm}
            disabled={enabledCount === 0}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 disabled:opacity-40 text-white font-black text-xs transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/20 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            تأكيد وتوزيع البطاقات تلقائياً في الدرس ({enabledCount})
          </button>
        </div>

      </div>
    </div>
  );
};
