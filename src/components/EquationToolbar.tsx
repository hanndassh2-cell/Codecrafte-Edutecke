import React, { useState } from "react";
import {
  Atom,
  Calculator,
  Plus,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Binary,
  ArrowRightLeft,
  Parentheses,
  Variable,
} from "lucide-react";
import { MathText } from "./MathText";

interface EquationToolbarProps {
  onInsert: (code: string) => void;
  className?: string;
}

// 1. MS Word Style Structure Categories
interface StructureItem {
  id: string;
  name: string;
  code: string;
  preview: string;
  description: string;
}

interface StructureGroup {
  categoryName: string;
  categoryIcon: React.ReactNode;
  items: StructureItem[];
}

const WORD_STRUCTURES: StructureGroup[] = [
  {
    categoryName: "مكتبة القوالب (Math Snippets)",
    categoryIcon: <Sparkles className="w-4 h-4" />,
    items: [
      {
        id: "snip-1",
        name: "مساحة الدائرة",
        code: "$A = \\pi r^2$",
        preview: "$A = \\pi r^2$",
        description: "قانون مساحة الدائرة",
      },
      {
        id: "snip-2",
        name: "القانون العام",
        code: "$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$",
        preview: "$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$",
        description: "حل المعادلة التربيعية",
      },
      {
        id: "snip-3",
        name: "مصفوفة ثنائية",
        code: "$\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}$",
        preview: "$\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}$",
        description: "مصفوفة 2×2",
      },
      {
        id: "snip-4",
        name: "نظرية فيثاغورس",
        code: "$c^2 = a^2 + b^2$",
        preview: "$c^2 = a^2 + b^2$",
        description: "قانون المثلث قائم الزاوية",
      },
      {
        id: "snip-5",
        name: "تكامل محدود",
        code: "$\\int_{a}^{b} f(x) \\, dx$",
        preview: "$\\int_{a}^{b} f(x) \\, dx$",
        description: "التكامل المحدود للدالة",
      },
      {
        id: "snip-6",
        name: "دالة أسية",
        code: "$f(x) = e^x$",
        preview: "$f(x) = e^x$",
        description: "الدالة الأسية الطبيعية",
      },
    ],
  },
  {
    categoryName: "الكسور (Fraction)",
    categoryIcon: <span className="font-serif font-bold italic">x/y</span>,
    items: [
      {
        id: "frac-1",
        name: "كسر اعتيادي",
        code: "$\\frac{x}{y}$",
        preview: "$\\frac{x}{y}$",
        description: "بسط ومقام عمودي",
      },
      {
        id: "frac-2",
        name: "مشتقة تفاضلية",
        code: "$\\frac{dy}{dx}$",
        preview: "$\\frac{dy}{dx}$",
        description: "مشتقة صريحة",
      },
      {
        id: "frac-3",
        name: "مشتقة جزئية",
        code: "$\\frac{\\partial f}{\\partial x}$",
        preview: "$\\frac{\\partial f}{\\partial x}$",
        description: "تفاضل جزئي",
      },
      {
        id: "frac-4",
        name: "كسر بداخل كسر",
        code: "$\\frac{1}{1 + \\frac{a}{b}}$",
        preview: "$\\frac{1}{1 + \\frac{a}{b}}$",
        description: "كسر مركب",
      },
    ],
  },
  {
    categoryName: "الأسس والأدلة (Script)",
    categoryIcon: <span className="font-serif font-bold italic">xⁿ</span>,
    items: [
      {
        id: "script-1",
        name: "أس علوي",
        code: "$x^n$",
        preview: "$x^n$",
        description: "قوة أو أس",
      },
      {
        id: "script-2",
        name: "دليل سفلي",
        code: "$x_i$",
        preview: "$x_i$",
        description: "مؤشر أو دليل",
      },
      {
        id: "script-3",
        name: "أس ودليل معاً",
        code: "$x_i^n$",
        preview: "$x_i^n$",
        description: "قوة ومؤشر",
      },
      {
        id: "script-4",
        name: "نظير كيميائي علوي وسفلي",
        code: "$^{14}_{6}\\text{C}$",
        preview: "$^{14}_{6}\\text{C}$",
        description: "عدد ذري وكتلي للنظير",
      },
    ],
  },
  {
    categoryName: "الجذور (Radical)",
    categoryIcon: <span className="font-serif font-bold italic">√x</span>,
    items: [
      {
        id: "rad-1",
        name: "جذر تربيعي",
        code: "$\\sqrt{x}$",
        preview: "$\\sqrt{x}$",
        description: "جذر لمتغير",
      },
      {
        id: "rad-2",
        name: "جذر نوني",
        code: "$\\sqrt[n]{x}$",
        preview: "$\\sqrt[n]{x}$",
        description: "جذر برتبة n",
      },
      {
        id: "rad-3",
        name: "جذر مجموع مربعات",
        code: "$\\sqrt{x^2 + y^2}$",
        preview: "$\\sqrt{x^2 + y^2}$",
        description: "طول المتجه أو الوتر",
      },
    ],
  },
  {
    categoryName: "التكاملات (Integral)",
    categoryIcon: <span className="font-serif font-bold italic">∫</span>,
    items: [
      {
        id: "int-1",
        name: "تكامل غير محدد",
        code: "$\\int f(x) dx$",
        preview: "$\\int f(x) dx$",
        description: "تكامل بدائي",
      },
      {
        id: "int-2",
        name: "تكامل محدد",
        code: "$\\int_{a}^{b} f(x) dx$",
        preview: "$\\int_{a}^{b} f(x) dx$",
        description: "تكامل بين حدين a و b",
      },
      {
        id: "int-3",
        name: "تكامل مضاعف",
        code: "$\\iint f(x,y) dx dy$",
        preview: "$\\iint f(x,y) dx dy$",
        description: "تكامل ثنائي للأسطح",
      },
      {
        id: "int-4",
        name: "تكامل مغلق (مسار)",
        code: "$\\oint_{C} F \\cdot dr$",
        preview: "$\\oint_{C} F \\cdot dr$",
        description: "تكامل على مسار مغلق",
      },
    ],
  },
  {
    categoryName: "التجميع والنهايات (Large Operators)",
    categoryIcon: <span className="font-serif font-bold italic">∑</span>,
    items: [
      {
        id: "op-1",
        name: "مجموع متسلسلة",
        code: "$\\sum_{i=1}^{n} x_i$",
        preview: "$\\sum_{i=1}^{n} x_i$",
        description: "مجموع عناصر من 1 إلى n",
      },
      {
        id: "op-2",
        name: "جداء نوتات",
        code: "$\\prod_{i=1}^{n} x_i$",
        preview: "$\\prod_{i=1}^{n} x_i$",
        description: "ضرب متتالي",
      },
      {
        id: "op-3",
        name: "نهاية دالة",
        code: "$\\lim_{x \\to a} f(x)$",
        preview: "$\\lim_{x \\to a} f(x)$",
        description: "نهاية عندما يؤول x لـ a",
      },
    ],
  },
  {
    categoryName: "الأقواس والحواصر (Brackets)",
    categoryIcon: <Parentheses className="w-4 h-4" />,
    items: [
      {
        id: "br-1",
        name: "أقواس دائرية",
        code: "$(x + y)$",
        preview: "$(x + y)$",
        description: "قوس عادي",
      },
      {
        id: "br-2",
        name: "حاصرات مربعة",
        code: "$[a, b]$",
        preview: "$[a, b]$",
        description: "مجال مغلق أو تركيز",
      },
      {
        id: "br-3",
        name: "أقواس مجموعة",
        code: "$\\{x \\in \\mathbb{R}\\}$",
        preview: "$\\{x \\in \\mathbb{R}\\}$",
        description: "مجموعة رياضية",
      },
      {
        id: "br-4",
        name: "قيمة مطلقة / محدد",
        code: "$|x|$",
        preview: "$|x|$",
        description: "طول أو محدد",
      },
    ],
  },
  {
    categoryName: "الدوال المثلثية (Trigonometry)",
    categoryIcon: <Binary className="w-4 h-4" />,
    items: [

      {
        id: "mat-3",
        name: "دالة الجيب (Sin)",
        code: "$\\sin(\\theta)$",
        preview: "$\\sin(\\theta)$",
        description: "جيب الزاوية",
      },
      {
        id: "mat-4",
        name: "دالة تجيب (Cos)",
        code: "$\\cos(\\theta)$",
        preview: "$\\cos(\\theta)$",
        description: "تجيب الزاوية",
      },
    ],
  },
];

// 2. MS Word Style Categorized Symbol Palettes
interface SymbolPalette {
  groupTitle: string;
  symbols: { label: string; code: string; preview: string }[];
}

const WORD_SYMBOLS: SymbolPalette[] = [
  {
    groupTitle: "أسهم كيميائية وروابط التفاعل (Chemistry Arrows & Bonds)",
    symbols: [
      { label: "سهم تفاعل مباشر", code: " → ", preview: "$\\longrightarrow$" },
      {
        label: "توازن كيميائي عكسي",
        code: " ⇌ ",
        preview: "$\\rightleftharpoons$",
      },
      {
        label: "سهم تسخين حراري",
        code: " $\\xrightarrow{\\Delta}$ ",
        preview: "$\\xrightarrow{\\Delta}$",
      },
      { label: "غاز متصاعد (لأعلى)", code: " ↑ ", preview: "$\\uparrow$" },
      { label: "راسب كيميائي (لأسفل)", code: " ↓ ", preview: "$\\downarrow$" },
      { label: "سهم يمين", code: "$\\rightarrow$", preview: "$\\rightarrow$" },
      { label: "سهم يسار", code: "$\\leftarrow$", preview: "$\\leftarrow$" },
      {
        label: "سهم مزدوج",
        code: "$\\leftrightarrow$",
        preview: "$\\leftrightarrow$",
      },
      {
        label: "سهم اقتضاء",
        code: "$\\Rightarrow$",
        preview: "$\\Rightarrow$",
      },
      { label: "سهم تكافؤ منطقي", code: "$\\iff$", preview: "$\\iff$" },
    ],
  },
  {
    groupTitle: "رموز أحرف يونانية (Greek Letters)",
    symbols: [
      { label: " ألفا", code: "$\\alpha$", preview: "$\\alpha$" },
      { label: " بيتا", code: "$\\beta$", preview: "$\\beta$" },
      { label: " غاما", code: "$\\gamma$", preview: "$\\gamma$" },
      { label: " دلتا صغيرة", code: "$\\delta$", preview: "$\\delta$" },
      {
        label: " دلتا كبيرة (تغير/حرارة)",
        code: "$\\Delta$",
        preview: "$\\Delta$",
      },
      { label: " سيتا (زاوية)", code: "$\\theta$", preview: "$\\theta$" },
      { label: " لامدا (طول موجي)", code: "$\\lambda$", preview: "$\\lambda$" },
      { label: " ميو (أجزاء)", code: "$\\mu$", preview: "$\\mu$" },
      { label: " باي (نسبة محيطية)", code: "$\\pi$", preview: "$\\pi$" },
      { label: " رو (كثافة)", code: "$\\rho$", preview: "$\\rho$" },
      { label: " سيجما", code: "$\\sigma$", preview: "$\\sigma$" },
      { label: " أوميغا", code: "$\\omega$", preview: "$\\omega$" },
      { label: " أوميغا كبيرة (أوم)", code: "$\\Omega$", preview: "$\\Omega$" },
    ],
  },
  {
    groupTitle: "عمليات رياضية ومقارنات (Operators & Relations)",
    symbols: [
      { label: "زائد أو ناقص", code: "$\\pm$", preview: "$\\pm$" },
      { label: "ضرب نقطي", code: "$\\cdot$", preview: "$\\cdot$" },
      { label: "ضرب جذاء", code: "$\\times$", preview: "$\\times$" },
      { label: "قسمة", code: "$\\div$", preview: "$\\div$" },
      { label: "لا يساوي", code: "$\\neq$", preview: "$\\neq$" },
      { label: "أكبر من أو يساوي", code: "$\\ge$", preview: "$\\ge$" },
      { label: "أصغر من أو يساوي", code: "$\\le$", preview: "$\\le$" },
      { label: "ينتمي إلى", code: "$\\in$", preview: "$\\in$" },
      { label: "لا ينتمي", code: "$\\notin$", preview: "$\\notin$" },
      { label: "يساوي تقريباً", code: "$\\approx$", preview: "$\\approx$" },
      { label: "ما لا نهاية", code: "$\\infty$", preview: "$\\infty$" },
      { label: "لكل", code: "$\\forall$", preview: "$\\forall$" },
      { label: "يوجد", code: "$\\exists$", preview: "$\\exists$" },
    ],
  },
  {
    groupTitle: "رموز وأيونات كيميائية متكررة (Common Ions & Terms)",
    symbols: [
      { label: "أيون هيدرونيوم", code: "H3O^+", preview: "$H_3O^+$" },
      { label: "أيون هيدروكسيد", code: "OH^-", preview: "$OH^-$" },
      { label: "أيون صوديوم", code: "Na^+", preview: "$Na^+$" },
      { label: "أيون كلوريد", code: "Cl^-", preview: "$Cl^-$" },
      { label: "أيون كالسيوم", code: "Ca^2+", preview: "$Ca^{2+}$" },
      { label: "أيون كبريتات", code: "SO4^2-", preview: "$SO_4^{2-}$" },
      { label: "الأس الهيدروجيني", code: "pH", preview: "$\\text{pH}$" },
      { label: "ثابت تأين الحمض Ka", code: "Ka", preview: "$\\text{K}_a$" },
      { label: "ثابت تأين الأساس Kb", code: "Kb", preview: "$\\text{K}_b$" },
      {
        label: "الجداء الأيوني للماء Kw",
        code: "Kw",
        preview: "$\\text{K}_w$",
      },
    ],
  },
];

// 3. Preset Formulas & Full Examples
const PRESET_FORMULAS = [
  {
    label: "تفاعل معايرة وتعادل كامل",
    code: "HCl + NaOH → NaCl + H2O",
    preview:
      "$\\mathrm{HCl} + \\mathrm{NaOH} \\longrightarrow \\mathrm{NaCl} + \\mathrm{H_2O}$",
    category: "كيمياء",
  },
  {
    label: "تأين النشادر العكسي (توازن)",
    code: "NH3 + H2O ⇌ NH4^+ + OH^-",
    preview:
      "$\\mathrm{NH_3} + \\mathrm{H_2O} \\rightleftharpoons \\mathrm{NH_4}^+ + \\mathrm{OH}^-$",
    category: "كيمياء",
  },
  {
    label: "تفكك حراري لكربونات الكالسيوم",
    code: "CaCO3 →[Δ] CaO + CO2 ↑",
    preview:
      "$\\mathrm{CaCO_3} \\xrightarrow{\\Delta} \\mathrm{CaO} + \\mathrm{CO_2} \\uparrow$",
    category: "كيمياء",
  },
  {
    label: "قانون حساب pH لحمض قوي",
    code: "pH = -log[H3O^+]",
    preview: "$\\text{pH} = -\\log[H_3O^+]$",
    category: "كيمياء",
  },
  {
    label: "القانون العام للمعادلة التربيعية",
    code: "$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$",
    preview: "$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$",
    category: "رياضيات",
  },
  {
    label: "تكامل بالأتجزئة محدد",
    code: "$\\int_{a}^{b} u \\, dv = [u v]_{a}^{b} - \\int_{a}^{b} v \\, du$",
    preview:
      "$\\int_{a}^{b} u \\, dv = [u v]_{a}^{b} - \\int_{a}^{b} v \\, du$",
    category: "رياضيات",
  },
];

export const EquationToolbar: React.FC<EquationToolbarProps> = ({
  onInsert,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const [activeTab, setActiveTab] = useState<
    "structures" | "symbols" | "presets" | "matrices"
  >("structures");

  const [matrixBracket, setMatrixBracket] = useState("pmatrix");


  return (
    <div
      className={`bg-white dark:bg-slate-800 rounded-xl border border-slate-300 dark:border-slate-700 shadow-2xs overflow-hidden text-xs ${className}`}
    >
      {/* Compact bar when closed */}
      {!isOpen ? (
        <div className="p-1.5 px-2.5 bg-slate-100/90 dark:bg-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1">
              <span className="w-5 h-5 rounded bg-blue-600 text-white flex items-center justify-center font-serif text-xs">
                π
              </span>
              <span>رموز سريعة:</span>
            </span>

            <button
              type="button"
              onClick={() => onInsert(" → ")}
              className="px-2 py-0.5 bg-white dark:bg-slate-700 hover:bg-blue-50 dark:hover:bg-blue-900/40 border border-slate-300 dark:border-slate-600 rounded text-slate-800 dark:text-slate-200 font-bold transition flex items-center gap-1 text-[11px]"
              title="سهم تفاعل أمامي"
            >
              <span>تفاعل</span>
              <MathText text="$\longrightarrow$" inline />
            </button>

            <button
              type="button"
              onClick={() => onInsert(" ⇌ ")}
              className="px-2 py-0.5 bg-white dark:bg-slate-700 hover:bg-blue-50 dark:hover:bg-blue-900/40 border border-slate-300 dark:border-slate-600 rounded text-slate-800 dark:text-slate-200 font-bold transition flex items-center gap-1 text-[11px]"
              title="سهم توازن عكسي"
            >
              <span>توازن</span>
              <MathText text="$\rightleftharpoons$" inline />
            </button>

            <button
              type="button"
              onClick={() => onInsert(" →[Δ] ")}
              className="px-2 py-0.5 bg-white dark:bg-slate-700 hover:bg-blue-50 dark:hover:bg-blue-900/40 border border-slate-300 dark:border-slate-600 rounded text-slate-800 dark:text-slate-200 font-bold transition flex items-center gap-1 text-[11px]"
              title="حرارة تسخين"
            >
              <span>حرارة</span>
              <MathText text="$\xrightarrow{\Delta}$" inline />
            </button>

            <button
              type="button"
              onClick={() => onInsert(" ↑ ")}
              className="px-1.5 py-0.5 bg-white dark:bg-slate-700 hover:bg-blue-50 dark:hover:bg-blue-900/40 border border-slate-300 dark:border-slate-600 rounded text-slate-800 dark:text-slate-200 font-bold transition"
              title="غاز متصاعد"
            >
              ↑ غاز
            </button>

            <button
              type="button"
              onClick={() => onInsert(" ↓ ")}
              className="px-1.5 py-0.5 bg-white dark:bg-slate-700 hover:bg-blue-50 dark:hover:bg-blue-900/40 border border-slate-300 dark:border-slate-600 rounded text-slate-800 dark:text-slate-200 font-bold transition"
              title="راسب"
            >
              ↓ راسب
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] transition shadow-2xs shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>عرض رموز وبنيويات Word الكرتونية</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <>
          {/* Ribbon Header bar when open */}
          <div className="bg-slate-100 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-700 p-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-2xs font-serif font-bold text-sm">
                π
              </div>
              <div>
                <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-100 text-sm">
                  <span>شريط أدوات إدراج المعادلة (نمط Word)</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 font-semibold">
                    كيمياء + رياضيات
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  ادرج بنيويات الكسر والجذر، أسهم التفاعلات، والرموز الكيميائية
                  بنقرة واحدة
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-800 text-white font-bold transition shadow-2xs shrink-0 text-xs"
            >
              <span>إغلاق الشريط المفصل</span>
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick Insert Ribbon (Always visible row like MS Word quick tools) */}
          <div className="p-2 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700/60 flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="font-bold text-slate-600 dark:text-slate-300 ml-1 flex items-center gap-1">
              <ArrowRightLeft className="w-3.5 h-3.5 text-blue-600" />
              <span>أسهم سريعة:</span>
            </span>

            <button
              type="button"
              onClick={() => onInsert(" → ")}
              className="px-2.5 py-1 bg-white dark:bg-slate-700 hover:bg-blue-50 dark:hover:bg-blue-900/40 border border-slate-200 dark:border-slate-600 rounded-md font-bold text-slate-800 dark:text-slate-200 transition shadow-2xs flex items-center gap-1.5"
              title="سهم تفاعل أمامي"
            >
              <span>تفاعل</span>
              <MathText text="$\\longrightarrow$" inline />
            </button>

            <button
              type="button"
              onClick={() => onInsert(" ⇌ ")}
              className="px-2.5 py-1 bg-white dark:bg-slate-700 hover:bg-blue-50 dark:hover:bg-blue-900/40 border border-slate-200 dark:border-slate-600 rounded-md font-bold text-slate-800 dark:text-slate-200 transition shadow-2xs flex items-center gap-1.5"
              title="سهم توازن عكسي"
            >
              <span>توازن</span>
              <MathText text="$\\rightleftharpoons$" inline />
            </button>

            <button
              type="button"
              onClick={() => onInsert(" →[Δ] ")}
              className="px-2.5 py-1 bg-white dark:bg-slate-700 hover:bg-blue-50 dark:hover:bg-blue-900/40 border border-slate-200 dark:border-slate-600 rounded-md font-bold text-slate-800 dark:text-slate-200 transition shadow-2xs flex items-center gap-1.5"
              title="حرارة تسخين"
            >
              <span>حرارة</span>
              <MathText text="$\\xrightarrow{\\Delta}$" inline />
            </button>

            <button
              type="button"
              onClick={() => onInsert(" ↑ ")}
              className="px-2.5 py-1 bg-white dark:bg-slate-700 hover:bg-blue-50 dark:hover:bg-blue-900/40 border border-slate-200 dark:border-slate-600 rounded-md font-bold text-slate-800 dark:text-slate-200 transition shadow-2xs flex items-center gap-1.5"
              title="غاز متصاعد"
            >
              <span>غاز</span>
              <MathText text="$\\uparrow$" inline />
            </button>

            <button
              type="button"
              onClick={() => onInsert(" ↓ ")}
              className="px-2.5 py-1 bg-white dark:bg-slate-700 hover:bg-blue-50 dark:hover:bg-blue-900/40 border border-slate-200 dark:border-slate-600 rounded-md font-bold text-slate-800 dark:text-slate-200 transition shadow-2xs flex items-center gap-1.5"
              title="راسب لأسفل"
            >
              <span>راسب</span>
              <MathText text="$\\downarrow$" inline />
            </button>

            <div className="h-4 w-px bg-slate-300 dark:bg-slate-600 my-auto mx-1" />

            <button
              type="button"
              onClick={() => onInsert("$\\frac{a}{b}$")}
              className="px-2 py-1 bg-white dark:bg-slate-700 hover:bg-blue-50 dark:hover:bg-blue-900/40 border border-slate-200 dark:border-slate-600 rounded-md font-bold transition shadow-2xs"
              title="كسر بسط ومقام"
            >
              <MathText text="$\\frac{a}{b}$" inline />
            </button>

            <button
              type="button"
              onClick={() => onInsert("$\\sqrt{x}$")}
              className="px-2 py-1 bg-white dark:bg-slate-700 hover:bg-blue-50 dark:hover:bg-blue-900/40 border border-slate-200 dark:border-slate-600 rounded-md font-bold transition shadow-2xs"
              title="جذر تربيعي"
            >
              <MathText text="$\\sqrt{x}$" inline />
            </button>

            <button
              type="button"
              onClick={() => onInsert("$x^2$")}
              className="px-2 py-1 bg-white dark:bg-slate-700 hover:bg-blue-50 dark:hover:bg-blue-900/40 border border-slate-200 dark:border-slate-600 rounded-md font-bold transition shadow-2xs"
              title="أس علوي"
            >
              <MathText text="$x^2$" inline />
            </button>
          </div>

          {/* Expanded MS Word Ribbon Tabs */}
          <div className="p-3 space-y-3">
            {/* MS Word Design Ribbon Navigation Tabs */}
            <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-700 pb-1">
              <button
                type="button"
                onClick={() => setActiveTab("structures")}
                className={`px-3 py-1.5 rounded-t-lg font-bold transition flex items-center gap-1.5 border-b-2 -mb-1 ${
                  activeTab === "structures"
                    ? "border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40"
                    : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                <Calculator className="w-4 h-4" />
                <span>بنيويات وتراكيب (Structures)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("symbols")}
                className={`px-3 py-1.5 rounded-t-lg font-bold transition flex items-center gap-1.5 border-b-2 -mb-1 ${
                  activeTab === "symbols"
                    ? "border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40"
                    : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                <Variable className="w-4 h-4" />
                <span>الرموز والأسهم (Symbols &amp; Arrows)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("matrices")}
                className={`px-3 py-1.5 rounded-t-lg font-bold transition flex items-center gap-1.5 border-b-2 -mb-1 ${
                  activeTab === "matrices"
                    ? "border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40"
                    : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                <Binary className="w-4 h-4" />
                <span>المصفوفات (Matrices)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("presets")}
                className={`px-3 py-1.5 rounded-t-lg font-bold transition flex items-center gap-1.5 border-b-2 -mb-1 ${
                  activeTab === "presets"
                    ? "border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40"
                    : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                <Atom className="w-4 h-4" />
                <span>معادلات وقوالب جاهزة</span>
              </button>
            </div>

            {/* TAB 1: Structures (Fraction, Radical, Integral, Script...) */}
            {activeTab === "structures" && (
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {WORD_STRUCTURES.map((group, gIdx) => (
                  <div
                    key={gIdx}
                    className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-2.5 border border-slate-200 dark:border-slate-700/70 space-y-2"
                  >
                    <div className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-200 text-xs">
                      <span className="p-1 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                        {group.categoryIcon}
                      </span>
                      <span>{group.categoryName}</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {group.items.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => onInsert(item.code)}
                          className="p-2 bg-white dark:bg-slate-700 hover:bg-blue-50 dark:hover:bg-blue-900/40 hover:border-blue-400 border border-slate-200 dark:border-slate-600 rounded-lg text-right transition flex flex-col justify-between space-y-1 shadow-2xs group"
                        >
                          <div className="flex items-center justify-between text-[11px] font-bold text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-300">
                            <span>{item.name}</span>
                            <Plus className="w-3 h-3 opacity-0 group-hover:opacity-100 transition text-blue-600" />
                          </div>
                          <div className="py-1 px-1 bg-slate-100 dark:bg-slate-800 rounded flex items-center justify-center text-xs">
                            <MathText text={item.preview} />
                          </div>
                          <span className="text-[9px] text-slate-400 dark:text-slate-400 truncate">
                            {item.description}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* TAB 2: Symbols & Arrows (Chemistry Arrows, Greek Letters, Math Operators) */}
            {activeTab === "symbols" && (
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {WORD_SYMBOLS.map((pal, pIdx) => (
                  <div
                    key={pIdx}
                    className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-2.5 border border-slate-200 dark:border-slate-700/70 space-y-2"
                  >
                    <h4 className="font-bold text-slate-700 dark:text-slate-200 text-xs">
                      {pal.groupTitle}
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {pal.symbols.map((sym, sIdx) => (
                        <button
                          key={sIdx}
                          type="button"
                          onClick={() => onInsert(sym.code)}
                          className="px-2.5 py-1.5 bg-white dark:bg-slate-700 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-100 font-semibold transition flex items-center gap-1.5 shadow-2xs group"
                          title={`إدراج ${sym.label}`}
                        >
                          <MathText text={sym.preview} inline />
                          <span className="text-[10px] text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-300">
                            ({sym.label})
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            
            {/* TAB 4: Matrices */}
            {activeTab === "matrices" && (
              <div className="space-y-4 max-h-72 overflow-y-auto pr-1">
                <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 border border-slate-200 dark:border-slate-700/70">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                    <h4 className="font-bold text-slate-700 dark:text-slate-200 text-xs flex items-center gap-2">
                      <Binary className="w-4 h-4 text-blue-600" />
                      <span>اختر شكل الأقواس قبل إدراج المصفوفة:</span>
                    </h4>
                    <select 
                      value={matrixBracket} 
                      onChange={(e) => setMatrixBracket(e.target.value)}
                      className="text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1.5 outline-none font-bold text-slate-800 dark:text-slate-100"
                    >
                      <option value="pmatrix">( ) أقواس دائرية (pmatrix)</option>
                      <option value="bmatrix">[ ] أقواس مربعة (bmatrix)</option>
                      <option value="Bmatrix">{'{ }'} أقواس معقوفة (Bmatrix)</option>
                      <option value="vmatrix">| | محدد / قيمة مطلقة (vmatrix)</option>
                      <option value="Vmatrix">‖ ‖ أقواس مزدوجة (Vmatrix)</option>
                      <option value="matrix">بدون أقواس (matrix)</option>
                    </select>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'm1x1', name: '1×1', code: 'a', desc: 'عنصر واحد' },
                      { id: 'm2x2', name: '2×2', code: 'a & b \\ c & d', desc: 'مربعة ثنائية' },
                      { id: 'm3x3', name: '3×3', code: 'a & b & c \\ d & e & f \\ g & h & i', desc: 'مربعة ثلاثية' },
                      { id: 'm4x4', name: '4×4', code: 'a & b & c & d \\ e & f & g & h \\ i & j & k & l \\ m & n & o & p', desc: 'مربعة رباعية' },
                      { id: 'mrow', name: 'مصفوفة صفية', code: 'a & b & c', desc: '1×3' },
                      { id: 'mcol', name: 'مصفوفة عمودية', code: 'a \\ b \\ c', desc: '3×1' },
                      { id: 'mzero', name: 'مصفوفة صفرية', code: '0 & 0 \\ 0 & 0', desc: '2×2 صفرية' },
                      { id: 'mident', name: 'مصفوفة الوحدة', code: '1 & 0 \\ 0 & 1', desc: '2×2 متطابقة' },
                      { id: 'mdiag', name: 'مصفوفة قطرية', code: 'a & 0 \\ 0 & b', desc: '2×2 قطرية' },
                      { id: 'mtri', name: 'مصفوفة مثلثية', code: 'a & b & c \\ 0 & d & e \\ 0 & 0 & f', desc: 'علوية 3×3' },
                      { id: 'msym', name: 'مصفوفة تناظرية', code: 'a & b & c \\ b & d & e \\ c & e & f', desc: '3×3 متماثلة' },
                      { id: 'm2xn', name: '2×n', code: 'a_1 & \dots & a_n \\ b_1 & \dots & b_n', desc: 'صفين وأعمدة n' },
                      { id: 'mmx2', name: 'm×2', code: 'a_1 & b_1 \\ \vdots & \vdots \\ a_m & b_m', desc: 'عمودين وصفوف m' },
                      { id: 'mmxn', name: 'm×n', code: 'a_{11} & \dots & a_{1n} \\ \vdots & \ddots & \vdots \\ a_{m1} & \dots & a_{mn}', desc: 'عامة m×n' },
                    ].map(tpl => (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => onInsert(`$\\begin{${matrixBracket}}
${tpl.code}
\\end{${matrixBracket}}$`)}
                        className="p-2 bg-white dark:bg-slate-700 hover:bg-blue-50 dark:hover:bg-blue-900/40 hover:border-blue-400 border border-slate-200 dark:border-slate-600 rounded-lg text-right transition flex flex-col justify-between space-y-1 shadow-2xs group"
                      >
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-300">
                          <span>{tpl.name}</span>
                          <Plus className="w-3 h-3 opacity-0 group-hover:opacity-100 transition text-blue-600" />
                        </div>
                        <div className="py-1 px-1 bg-slate-100 dark:bg-slate-800 rounded flex items-center justify-center text-xs overflow-hidden">
                           <MathText text={`$\\begin{${matrixBracket}} ${tpl.code} \\end{${matrixBracket}}$`} />
                        </div>
                        <span className="text-[9px] text-slate-400 dark:text-slate-400 truncate text-center w-full block">
                          {tpl.desc}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: Preset Formulas & Equations */}

            {activeTab === "presets" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
                {PRESET_FORMULAS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onInsert(preset.code)}
                    className="p-2.5 rounded-xl bg-white dark:bg-slate-700 hover:border-blue-500 border border-slate-200 dark:border-slate-600 text-right transition flex flex-col justify-between space-y-2 shadow-2xs group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-300">
                        {preset.label}
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                        {preset.category}
                      </span>
                    </div>
                    <div className="py-2 px-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-600/50 flex items-center justify-center text-sm">
                      <MathText text={preset.preview} />
                    </div>
                    <div className="text-[10px] text-blue-600 dark:text-blue-400 font-bold flex items-center gap-1 justify-end">
                      <span>انقر لإدراج المعادلة بالكامل</span>
                      <Plus className="w-3 h-3" />
                    </div>
                  </button>
                ))}
              </div>
            )}

            <div className="p-2 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-900/50 text-[11px] text-blue-900 dark:text-blue-200 flex items-start gap-2">
              <HelpCircle className="w-4 h-4 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
              <div>
                <p className="font-bold">نصيحة استخدام شريط Word للمعادلات:</p>
                <p className="mt-0.5">
                  تستطيع كتابة المعادلة مباشرة مثل{" "}
                  <code className="bg-blue-100 dark:bg-blue-900/60 px-1 rounded font-mono">
                    NaOH → Na^+ + OH^-
                  </code>{" "}
                  وسيتم تحويلها وتنسيقها تلقائياً، أو استخدام أزرار الشريط أعلاه
                  لإدراج الكسور والجذور والرموز الدقيقة!
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
