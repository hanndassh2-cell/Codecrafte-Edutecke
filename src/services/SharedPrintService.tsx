import React from "react";
import { MathText } from "../components/MathText";
import { QuestionRenderer, createAnswerKeyItems } from "../components/QuestionRenderer";
import { PrintTemplate } from "../types";
import {
  ExamHeaderTitle,
  ExamHeaderStudentBox,
  ExamHeaderQuestionStrip,
} from "../components/ExamHeader";

export interface PrintItem {
  id: string;
  content: React.ReactNode;
}

export const getArabicQuestionLabel = (index: number): string => {
  const labels = [
    "السؤال الأول",
    "السؤال الثاني",
    "السؤال الثالث",
    "السؤال الرابع",
    "السؤال الخامس",
    "السؤال السادس",
    "السؤال السابع",
    "السؤال الثامن",
    "السؤال التاسع",
    "السؤال العاشر",
  ];
  return labels[index - 1] || `السؤال ${index}`;
};

export const getDefaultWordingForType = (type: string): string => {
  switch (type) {
    case "true_false":
      return "ضع علامة (صح) أو (خطأ) أمام العبارات التالية:";
    case "mcq":
      return "اختر الإجابة الصحيحة لكل من الفقرات التالية:";
    case "essay":
      return "أجب عن الأسئلة التالية:";
    case "problem":
      return "حل المسائل التالية:";
    case "definition":
      return "عرّف المصطلحات التالية:";
    case "explain":
    case "reason":
      return "علّل واشرح العبارات التالية:";
    case "fill_blanks":
      return "أكمل الفراغات التالية:";
    case "matching":
      return "صل بين عناصر العمود الأول وما يناسبها في العمود الثاني:";
    case "ordering":
      return "رتب الخطوات التالية ترتيباً صحيحاً:";
    case "diagram_label":
      return "اكتب البيانات المناسبة على الشكل:";
    case "table_query":
      return "أجب عن الأسئلة بناءً على الجدول أو الرسم البياني:";
    case "equation":
      return "اكتب واوزن المعادلات التالية:";
    case "grammar":
      return "أعرب العبارات التالية واستخرج القواعد المطلوبة:";
    case "all":
    default:
      return "حل المسائل التالية:";
  }
};

export interface GenerateExamPrintItemsOptions {
  template: PrintTemplate;
  title: string;
  durationMinutes?: number;
  totalMarks?: number;
  showStudentBox?: boolean;
  showInstructions?: boolean;
  instructionsText?: string;
  showGradingTable?: boolean;
  sections?: any[];
  questions: any[]; // Flat array of questions (QuestionSnapshot or full Question object)
  versionQuestions?: any[]; // The specific question order list (e.g. version A questions from the generated exam or document)
  showAnswerKey?: boolean;
  canSwap?: boolean;
  onSwapQuestion?: (questionId: string, sectionId: string) => void;
  onRemoveQuestion?: (questionId: string) => void;
  groupingEnabled?: boolean;
  subjectName?: string;
  educationalLevel?: string;
  academicTerm?: string;
  unitTitle?: string;
  lessonTitle?: string;
  hierarchyText?: string;
  materialsText?: string;
  approvedModelText?: string;
  institutionName?: string;
  logoUrl?: string;
  examDate?: string;
}

/**
 * Shared Print Service / Centralized Exam & Model Print Engine
 * 
 * اجعل نظام المعاينة والطباعة خدمة مركزية (Shared Print Service)، بحيث تستدعي جميع النوافذ 
 * نفس المكون ونفس ملفات التنسيق (CSS/Templates)، ويُمنع إنشاء أي معاينة أو طباعة محلية 
 * داخل أي نافذة مستقبلاً. أي تعديل على قالب الطباعة ينعكس تلقائياً على جميع أجزاء البرنامج.
 */
export function generateExamPrintItems(options: GenerateExamPrintItemsOptions): PrintItem[] {
  const {
    template,
    title,
    durationMinutes,
    totalMarks,
    showStudentBox = true,
    showInstructions = false,
    instructionsText = "",
    showGradingTable = false,
    sections = [],
    questions = [],
    versionQuestions = [],
    showAnswerKey = false,
    canSwap = false,
    onSwapQuestion,
    onRemoveQuestion,
    subjectName,
    educationalLevel,
    academicTerm,
    unitTitle,
    lessonTitle,
    hierarchyText,
    materialsText,
    approvedModelText,
    institutionName,
    logoUrl,
    examDate,
  } = options;

  const items: PrintItem[] = [];

  // Get typography settings
  const typo = template.typography || {
    fontFamily: "'Amiri', serif",
    baseFontSize: 12,
    headingSize: 16,
    studentBoxFontSize: 11,
    questionFontSize: 11,
    optionsFontSize: 10,
    marksFontSize: 10,
    questionSpacing: 12,
  };

  const titleSize = `${typo.headingSize || 16}pt`;
  const studentBoxSize = `${typo.studentBoxFontSize || 11}pt`;
  const questionSize = `${typo.questionFontSize || 11}pt`;
  const optionsSize = `${typo.optionsFontSize || 10}pt`;
  const marksSize = `${typo.marksFontSize || 10}pt`;
  const spacingPx = `${typo.questionSpacing !== undefined ? typo.questionSpacing : 12}px`;
  const optionSpacingPx = `${typo.questionOptionSpacing !== undefined ? typo.questionOptionSpacing : 3}px`;

  // 1. Official Clean RTL Exam Header Title (Centered Bold Title + Full Width Divider Line)
  items.push({
    id: "header-title",
    content: (
      <div 
        className="official-exam-header select-none"
        dir="rtl"
      >
        <ExamHeaderTitle
          template={template}
          examTitle={title}
          subjectName={subjectName}
          unitTitle={unitTitle}
          lessonTitle={lessonTitle}
          hierarchyText={hierarchyText}
        />
      </div>
    ),
  });

  // 2. Official Student Information Box (Rounded Single Horizontal Box: Student Name Right, Duration Center, Marks Left)
  if (showStudentBox) {
    items.push({
      id: "header-student-box",
      content: (
        <div className="select-none" dir="rtl">
          <ExamHeaderStudentBox
            template={template}
            durationMinutes={durationMinutes}
            totalMarks={totalMarks}
          />
        </div>
      ),
    });
  }

  // 3. Official Exam Instructions
  if (showInstructions && instructionsText) {
    items.push({
      id: "header-instructions",
      content: (
        <div 
          className="border-2 border-slate-900 p-3 rounded-sm mb-3 bg-slate-50 space-y-1 relative" 
          style={{ fontSize: questionSize }}
          dir="rtl"
        >
          <div className="font-extrabold text-slate-900 flex items-center gap-1 border-b border-slate-300 pb-1 mb-1">
            <span>📌</span>
            <span>تعليمات وإرشادات هامة للطلاب:</span>
          </div>
          <div className="text-slate-800 font-medium space-y-1 pt-0.5 leading-relaxed" style={{ fontSize: questionSize }}>
            <MathText text={instructionsText} dir="rtl" style={{ fontSize: questionSize }} />
          </div>
        </div>
      ),
    });
  }

  // Use the provided versionQuestions list or fall back to questions list
  const activeQuestionsList = versionQuestions && versionQuestions.length > 0
    ? versionQuestions
    : questions.map((q, idx) => ({
        questionId: q.id || q.questionId,
        allocatedMarks: q.allocatedMarks !== undefined ? q.allocatedMarks : 0,
        sectionId: q.sectionId,
        questionOrder: idx + 1,
      }));

  // 4. Official Examination Grading & Verification Committee Table
  if (showGradingTable && activeQuestionsList.length > 0) {
    items.push({
      id: "header-grading-table",
      content: (
        <div className="mb-3 overflow-hidden border-2 border-slate-900 rounded-sm select-none" dir="rtl">
          <table className="w-full text-center border-collapse border-spacing-0" style={{ fontSize: studentBoxSize }}>
            <thead>
              <tr className="bg-slate-100 font-extrabold text-slate-900 border-b-2 border-slate-900">
                <th className="border-l-2 border-slate-900 p-1 w-28 whitespace-nowrap">رقم السؤال</th>
                {activeQuestionsList.map((_, idx) => (
                  <th
                    key={idx}
                    className="border-l border-slate-900 p-1 font-bold"
                    style={{ fontSize: studentBoxSize }}
                  >
                    {getArabicQuestionLabel(idx + 1).replace("السؤال ", "س ")}
                  </th>
                ))}
                <th className="border-l-2 border-slate-900 p-1 bg-slate-200 font-black" style={{ fontSize: studentBoxSize }}>
                  المجموع
                </th>
                <th className="border-l border-slate-900 p-1 w-24 text-[9.5pt]">المصحح</th>
                <th className="p-1 w-24 text-[9.5pt]">المراجع</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-900 font-bold">
                <td className="border-l-2 border-slate-900 p-1 whitespace-nowrap bg-slate-50 text-slate-900" style={{ fontSize: studentBoxSize }}>
                  الدرجة المخصصة
                </td>
                {activeQuestionsList.map((q, idx) => (
                  <td
                    key={idx}
                    className="border-l border-slate-900 p-1 text-slate-900 font-bold"
                    style={{ fontSize: studentBoxSize }}
                  >
                    {q.allocatedMarks}
                  </td>
                ))}
                <td className="border-l-2 border-slate-900 p-1 font-black bg-slate-100 text-slate-900" style={{ fontSize: studentBoxSize }}>
                  {totalMarks}
                </td>
                <td className="border-l border-slate-900 p-1 text-slate-400 text-[9pt] font-normal">الاسم والتوقيع</td>
                <td className="p-1 text-slate-400 text-[9pt] font-normal">الاسم والتوقيع</td>
              </tr>
              <tr className="h-7">
                <td className="border-l-2 border-slate-900 p-1 whitespace-nowrap bg-slate-50 font-bold text-slate-900" style={{ fontSize: studentBoxSize }}>
                  الدرجة المستحقة
                </td>
                {activeQuestionsList.map((_, idx) => (
                  <td
                    key={idx}
                    className="border-l border-slate-900 p-1 text-slate-300"
                    style={{ fontSize: studentBoxSize }}
                  >
                    &nbsp;
                  </td>
                ))}
                <td className="border-l-2 border-slate-900 p-1 text-slate-300 bg-slate-100" style={{ fontSize: studentBoxSize }}>
                  &nbsp;
                </td>
                <td className="border-l border-slate-900 p-1 text-slate-300" style={{ fontSize: studentBoxSize }}>
                  &nbsp;
                </td>
                <td className="p-1 text-slate-300" style={{ fontSize: studentBoxSize }}>
                  &nbsp;
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      ),
    });
  }

  // 5. Questions List inside Exam Grouped by Section
  if (activeQuestionsList.length > 0) {
    const activeSections = sections && sections.length > 0 
      ? sections 
      : [{ id: "default-sec", title: "", questionType: "all", count: activeQuestionsList.length, markPerQuestion: 1 }];

    activeSections.forEach((sec, secIdx) => {
      const secQuestions = activeQuestionsList.filter(
        (eq) => eq.sectionId === sec.id,
      );

      // fallback grouping if no sections are assigned yet
      const displayQuestions =
        secQuestions.length > 0
          ? secQuestions
          : (sec.id === "default-sec" ? activeQuestionsList : []);

      if (displayQuestions.length === 0) return;

      const secTotalMarks = displayQuestions.reduce(
        (acc, eq) => acc + (eq.allocatedMarks || sec.markPerQuestion || 0),
        0,
      );
      const firstEqMark = displayQuestions[0]?.allocatedMarks || sec.markPerQuestion || 0;
      const formattedFirstEqMark = Number(firstEqMark).toFixed(firstEqMark % 1 === 0 ? 0 : 2);
      const labelName = getArabicQuestionLabel(secIdx + 1);
      const rawTitle = sec.title || getDefaultWordingForType(sec.questionType);
      const marksBadgeText = `[ ${secTotalMarks} درجة ]${
        formattedFirstEqMark && formattedFirstEqMark !== "0"
          ? ` - كل فقرة [ ${formattedFirstEqMark} درجة ]`
          : ""
      }`;

      items.push({
        id: `section-${sec.id}-header`,
        content: (
          <div dir="rtl" className="select-none">
            <ExamHeaderQuestionStrip
              template={template}
              questionNumber={secIdx + 1}
              questionLabel={labelName}
              questionInstruction={rawTitle}
              questionMarksText={marksBadgeText}
              secTotalMarks={secTotalMarks}
              perItemMark={formattedFirstEqMark}
            />
          </div>
        ),
      });

      // Extract resolved question objects for this section (1 Question = 1 Independent Block)
      const resolvedQuestions = displayQuestions
        .map((eq) => {
          const q = questions.find((item) => (item.id || item.questionId) === eq.questionId);
          if (!q) return null;
          return {
            ...q,
            allocatedMarks: eq.allocatedMarks || sec.markPerQuestion,
          };
        })
        .filter(Boolean);

      const activeFontFamily = sec.fontFamily || typo.fontFamily || "inherit";

      // Render each question as a strictly independent block (No grouping, no similarity merge)
      resolvedQuestions.forEach((q: any, qIdx: number) => {
        if (!q) return;

        items.push({
          id: `question-${q.id || q.questionId}-${sec.id}-${qIdx}`,
          content: (
            <QuestionRenderer
              question={q}
              questionNumber={qIdx + 1}
              numberFormat="dash"
              allocatedMarks={q.allocatedMarks || sec.markPerQuestion}
              showMarks={false}
              mode="exam-print"
              showAnswerKey={showAnswerKey}
              suppressAnswerBox={showAnswerKey}
              activeFontFamily={activeFontFamily}
              questionSize={questionSize}
              optionsSize={optionsSize}
              marksSize={marksSize}
              spacingPx={spacingPx}
              optionSpacingPx={optionSpacingPx}
              canSwap={canSwap}
              onSwapQuestion={onSwapQuestion ? (qid) => onSwapQuestion(qid, sec.id) : undefined}
              onRemoveQuestion={onRemoveQuestion}
              style={{ marginTop: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0 }}
            />
          ),
        });

        if (showAnswerKey) {
          const ansItems = createAnswerKeyItems(
            q,
            `${q.id || q.questionId}-${sec.id}-${qIdx}`,
            optionsSize,
            activeFontFamily
          );
          items.push(...ansItems);
        }
      });
    });
  }

  return items;
}
