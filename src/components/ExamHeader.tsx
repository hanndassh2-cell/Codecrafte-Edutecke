import React from "react";
import { PrintTemplate } from "../types";
import { storage } from "../services/storage";

export interface ExamHeaderProps {
  template?: PrintTemplate;
  // Dynamic header fields
  approvedModelText?: string;
  educationalLevel?: string;
  materialsText?: string;
  institutionName?: string;
  logoUrl?: string;
  examDate?: string;

  // Title fields
  examTitle?: string;
  subjectName?: string;
  unitTitle?: string;
  lessonTitle?: string;
  hierarchyText?: string;

  // Student Box fields
  showStudentBox?: boolean;
  durationMinutes?: number | string;
  totalMarks?: number | string;

  // Question Strip fields
  showQuestionStrip?: boolean;
  questionNumber?: number | string;
  questionLabel?: string;
  questionInstruction?: string;
  questionMarksText?: string;
  secTotalMarks?: number | string;
  perItemMark?: number | string;

  // Modular rendering
  part?: "all" | "top" | "title" | "student-box" | "question-strip";
  className?: string;
}

/**
 * Cleanly formats the centered exam title according to the official specification:
 * المادة – الوحدة – الدرس – عنوان الدرس
 */
export function formatExamHierarchyTitle(params: {
  title?: string;
  subjectName?: string;
  unitTitle?: string;
  lessonTitle?: string;
  hierarchyText?: string;
}): string {
  const { title, subjectName, unitTitle, lessonTitle, hierarchyText } = params;

  // If title already has explicit dashes or hierarchy separators, use it directly
  if (title && (title.includes(" - ") || title.includes(" – ") || title.includes(" : "))) {
    return title;
  }

  const parts: string[] = [];
  const rawSub = (subjectName || "").replace("الرياضيات العامة", "الرياضيات").trim();
  const subPrefix = rawSub ? (rawSub.startsWith("امتحان") ? rawSub : `امتحان ${rawSub}`) : "امتحان الرياضيات";
  parts.push(subPrefix);

  if (unitTitle) {
    parts.push(unitTitle);
  }
  if (lessonTitle) {
    parts.push(lessonTitle);
  }

  if (parts.length > 1) {
    return parts.join(" - ");
  }

  // Fallback to hierarchyText if available
  if (hierarchyText && hierarchyText.includes("-")) {
    const segments = hierarchyText.split("|").pop()?.trim() || "";
    if (segments) {
      return segments.startsWith("امتحان") ? segments : `امتحان ${segments}`;
    }
  }

  if (title && title !== "وثيقة الاختبار النهائي" && title !== "وثيقة الاختبار") {
    return title.startsWith("امتحان") ? title : `امتحان ${title}`;
  }

  // Standard official default
  return "امتحان الرياضيات - الوحدة الثانية : التحليل الرياضي - الدرس الثاني : التابع الصحيح - معادلة المماس";
}

/**
 * Top row: «نموذج اختبار معتمد» + الصف/المرحلة + سطر المواد (يمين) | الشعار/اسم الجهة + التاريخ (يسار)
 */
export const ExamHeaderTop: React.FC<ExamHeaderProps> = ({
  template,
  approvedModelText,
  educationalLevel,
  materialsText,
  institutionName,
  logoUrl,
  examDate,
  className = "",
}) => {
  const effectiveModelText =
    approvedModelText ||
    template?.headerContent?.rightText ||
    "نموذج اختبار معتمد";

  const effectiveLevel =
    educationalLevel ||
    template?.headerContent?.centerText ||
    "الثالث الثانوي المهني";

  const effectiveMaterials =
    materialsText ||
    template?.headerContent?.leftText ||
    "رياضيات فيزياء كيمياء رسم صناعي رسم حاسوب";

  const settings = storage.getSettings();
  const currentAcademy = settings.academyName || "المثنى لطلاب الهندسة";

  const rawInstitution =
    institutionName || template?.headerContent?.schoolName || currentAcademy;

  const isMinistryLegacy =
    rawInstitution.includes("وزارة التربية والتعليم") ||
    rawInstitution.includes("الإدارة العامة للامتحانات");

  const effectiveInstitution = isMinistryLegacy ? currentAcademy : rawInstitution;

  const effectiveLogo =
    logoUrl || template?.headerContent?.logoUrl || settings.logoUrl;
  const effectiveDate =
    examDate ||
    (template?.headerContent?.showGregorianDate !== false ? "28 يناير 2026 م" : "");

  return (
    <div
      className={`exam-header-top flex justify-between items-start w-full text-slate-900 border-b border-slate-700 pb-1 mb-1.5 select-none ${className}`}
      dir="rtl"
    >
      {/* Right Column: Model Name + Grade/Level + Subjects list */}
      <div className="flex flex-col text-right leading-tight">
        <div className="font-bold text-slate-900 text-[11.5pt] tracking-normal">
          {effectiveModelText}
        </div>
        <div className="font-bold text-slate-800 text-[10pt] mt-0.5">
          {effectiveLevel}
        </div>
        <div className="font-medium text-slate-600 text-[8.5pt] mt-0.5 tracking-tight">
          {effectiveMaterials}
        </div>
      </div>

      {/* Left Column: Logo/Institution badge + Date */}
      <div className="flex flex-col items-start text-left leading-tight shrink-0">
        {effectiveLogo ? (
          <img
            src={effectiveLogo}
            alt="Logo"
            className="h-8 max-w-[120px] object-contain mb-1"
          />
        ) : (
          <div className="bg-slate-900 text-white font-bold text-[9.5pt] px-2.5 py-1 rounded shadow-xs mb-1">
            {effectiveInstitution}
          </div>
        )}
        {effectiveDate && (
          <div className="text-[8.5pt] text-slate-500 font-medium tracking-tight">
            {effectiveDate}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Centered bold exam title line: المادة – الوحدة – الدرس – عنوان الدرس
 */
export const ExamHeaderTitle: React.FC<ExamHeaderProps> = ({
  examTitle,
  subjectName,
  unitTitle,
  lessonTitle,
  hierarchyText,
  className = "",
}) => {
  const fullTitle = formatExamHierarchyTitle({
    title: examTitle,
    subjectName,
    unitTitle,
    lessonTitle,
    hierarchyText,
  });

  return (
    <div
      className={`exam-header-title w-full text-center border-b border-slate-700 pb-1 mb-1.5 select-none ${className}`}
      dir="rtl"
    >
      <h1 className="font-bold text-slate-900 text-[10.5pt] sm:text-[11pt] tracking-normal leading-snug">
        {fullTitle}
      </h1>
    </div>
  );
};

/**
 * Rounded Single Horizontal Box: اسم الطالب (يمين) | الزمن المحدد (وسط) | الدرجة الكلية (يسار)
 */
export const ExamHeaderStudentBox: React.FC<ExamHeaderProps> = ({
  durationMinutes = 30,
  totalMarks = 400,
  className = "",
}) => {
  const durationStr = durationMinutes ? `${durationMinutes} دقيقة` : "30 دقيقة";
  const marksStr = totalMarks ? `${totalMarks} درجة` : "400 درجة";

  return (
    <div
      className={`exam-header-student-box w-full border border-slate-800 rounded-md py-1 px-3 mb-1.5 bg-white text-slate-900 text-[9.5pt] font-bold select-none student-info-box ${className}`}
      dir="rtl"
    >
      <div className="flex items-center justify-between gap-3 w-full">
        {/* Right: Student Name with dotted writing line */}
        <div className="flex items-center gap-1.5 flex-1 min-w-[180px]">
          <span className="shrink-0 text-slate-900 font-bold text-[9.5pt]">
            اسم الطالب:
          </span>
          <span className="border-b border-dotted border-slate-600 flex-1 h-3 inline-block"></span>
        </div>

        {/* Center: Duration */}
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-slate-800 font-bold text-[9.5pt]">
            الزمن المحدد:
          </span>
          <span className="text-slate-900 font-bold text-[9.5pt] border-b border-dotted border-slate-600 min-w-[50px] text-center">
            {durationStr}
          </span>
        </div>

        {/* Left: Total Marks */}
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-slate-800 font-bold text-[9.5pt]">
            الدرجة الكلية:
          </span>
          <span className="text-slate-900 font-bold text-[9.5pt] border-b border-dotted border-slate-600 min-w-[50px] text-center">
            {marksStr}
          </span>
        </div>
      </div>
    </div>
  );
};

/**
 * Light Question Strip: السؤال الأول + عنوان/تعليمات السؤال + الدرجة
 */
export const ExamHeaderQuestionStrip: React.FC<ExamHeaderProps> = ({
  questionNumber = 1,
  questionLabel,
  questionInstruction = "حل المسائل التالية:",
  questionMarksText,
  secTotalMarks = 400,
  perItemMark,
  className = "",
}) => {
  const effectiveLabel =
    questionLabel ||
    (questionNumber === 1
      ? "السؤال الأول"
      : questionNumber === 2
      ? "السؤال الثاني"
      : questionNumber === 3
      ? "السؤال الثالث"
      : `السؤال ${questionNumber}`);

  let effectiveMarks = questionMarksText;
  if (!effectiveMarks) {
    if (perItemMark) {
      effectiveMarks = `[ ${secTotalMarks} درجة ] - كل فقرة [ ${perItemMark} درجة ]`;
    } else {
      effectiveMarks = `[ ${secTotalMarks} درجة ]`;
    }
  }

  return (
    <div
      className={`exam-header-question-strip w-full border border-slate-300 dark:border-slate-700 bg-slate-50/70 rounded-md px-3 py-1.5 flex justify-between items-center mb-2 text-[9.5pt] select-none break-inside-avoid print:break-inside-avoid ${className}`}
      dir="rtl"
    >
      <div className="font-bold text-slate-900 flex items-center gap-1.5">
        <span className="font-black text-slate-900">{effectiveLabel}:</span>
        <span className="text-slate-800">{questionInstruction}</span>
      </div>
      <div className="font-bold text-slate-800 bg-white border border-slate-300 rounded px-2 py-0.5 text-[9pt] shadow-2xs shrink-0">
        {effectiveMarks}
      </div>
    </div>
  );
};

/**
 * Unified ExamHeader component rendering the exact redesigned reference header
 */
export const ExamHeader: React.FC<ExamHeaderProps> = (props) => {
  const { part = "all", showStudentBox = true, showQuestionStrip = true } = props;

  if (part === "top") {
    return <ExamHeaderTop {...props} />;
  }
  if (part === "title") {
    return <ExamHeaderTitle {...props} />;
  }
  if (part === "student-box") {
    return <ExamHeaderStudentBox {...props} />;
  }
  if (part === "question-strip") {
    return <ExamHeaderQuestionStrip {...props} />;
  }

  return (
    <div className={`exam-header-container w-full ${props.className || ""}`} dir="rtl">
      <ExamHeaderTop {...props} />
      <ExamHeaderTitle {...props} />
      {showStudentBox && <ExamHeaderStudentBox {...props} />}
      {showQuestionStrip && <ExamHeaderQuestionStrip {...props} />}
    </div>
  );
};

export default ExamHeader;
