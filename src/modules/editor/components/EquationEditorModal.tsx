import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Check, Sparkles, RotateCcw, Copy, ChevronDown, Settings, Keyboard } from "lucide-react";
import "./equation-editor.css";
import "mathlive";
import { MathText, convertMathMLToTeX, convertMathMLInText, convertWordLinearMathToTeX } from "../../../components/MathText";
import { writeToClipboard } from "../../../utils/clipboard";
import { EquationToolbar } from "../../../components/EquationToolbar";

declare global {
  namespace React {
    namespace JSX {
      interface IntrinsicElements {
        "math-field": React.DetailedHTMLProps<
          React.HTMLAttributes<HTMLElement> & {
            ref?: React.Ref<any>;
            style?: React.CSSProperties;
            class?: string;
          },
          HTMLElement
        >;
      }
    }
  }
}

interface EquationEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialEquation?: string;
  onSave: (equationCode: string) => void | boolean | Promise<void | boolean>;
}

// Visual Quick Insert Buttons for MS Word style ribbon
const QUICK_STRUCTURES = [
  {
    label: "كسر",
    icon: "x/y",
    snippet: "\\frac{#?}{#?}",
    title: "إدراج كسر (بسط ومقام)",
  },
  {
    label: "أس علوي",
    icon: "xⁿ",
    snippet: "#?^{#?}",
    title: "إدراج قوة أو أس علوي",
  },
  {
    label: "دليل سفلي",
    icon: "xₙ",
    snippet: "#?_{#?}",
    title: "إدراج دليل سفلي",
  },
  {
    label: "أس ودليل",
    icon: "xₙⁿ",
    snippet: "#?_{#?}^{#?}",
    title: "إدراج أس ودليل سفلي معاً",
  },
  {
    label: "جذر تربيعي",
    icon: "√x",
    snippet: "\\sqrt{#?}",
    title: "إدراج جذر تربيعي",
  },
  {
    label: "جذر نوني",
    icon: "ⁿ√x",
    snippet: "\\sqrt[#?]{#?}",
    title: "إدراج جذر نوني",
  },
  {
    label: "مصفوفة 2×2",
    icon: "[2×2]",
    snippet: "\\begin{pmatrix} #? & #? \\\\ #? & #? \\end{pmatrix}",
    title: "إدراج مصفوفة قوسية 2x2",
  },
  {
    label: "مصفوفة 3×3",
    icon: "[3×3]",
    snippet: "\\begin{pmatrix} #? & #? & #? \\\\ #? & #? & #? \\\\ #? & #? & #? \\end{pmatrix}",
    title: "إدراج مصفوفة قوسية 3x3",
  },
  {
    label: "نظام معادلات",
    icon: "{x,y}",
    snippet: "\\begin{cases} #? & \\text{إذا } #? \\\\ #? & \\text{إذا } #? \\end{cases}",
    title: "إدراج أقواس تفريع ونظام معادلات",
  },
  {
    label: "تكامل",
    icon: "∫",
    snippet: "\\int_{#?}^{#?} #? \\, d#?",
    title: "إدراج تكامل محدود",
  },
  {
    label: "مجموع",
    icon: "∑",
    snippet: "\\sum_{#?}^{#?} #?",
    title: "إدراج رمز المجموع",
  },
  {
    label: "سهم تفاعل",
    icon: "→",
    snippet: "\\xrightarrow{\\Delta}",
    title: "إدراج سهم تفاعل كيميائي حراري",
  },
  {
    label: "تفاعل اتزان",
    icon: "⇌",
    snippet: "\\rightleftharpoons",
    title: "إدراج سهم تفاعل انعكاسي متزن",
  },
];

const QUICK_SYMBOLS = [
  { label: "α", code: "\\alpha" },
  { label: "β", code: "\\beta" },
  { label: "γ", code: "\\gamma" },
  { label: "Δ", code: "\\Delta" },
  { label: "π", code: "\\pi" },
  { label: "θ", code: "\\theta" },
  { label: "λ", code: "\\lambda" },
  { label: "μ", code: "\\mu" },
  { label: "σ", code: "\\sigma" },
  { label: "ω", code: "\\omega" },
  { label: "Ω", code: "\\Omega" },
  { label: "±", code: "\\pm" },
  { label: "×", code: "\\times" },
  { label: "÷", code: "\\div" },
  { label: "≠", code: "\\neq" },
  { label: "≤", code: "\\leq" },
  { label: "≥", code: "\\geq" },
  { label: "≈", code: "\\approx" },
  { label: "∞", code: "\\infty" },
  { label: "→", code: "\\rightarrow" },
  { label: "↑", code: "\\uparrow" },
  { label: "↓", code: "\\downarrow" },
];

// Keep the existing quick templates; the full existing library remains under advanced tools.
const template = (label: string, snippet: string) => ({ label, snippet, title: label });
const GROUPS = [
  { id: 'fractions', label: 'كسر', preview: String.raw`\frac{a}{b}`, items: [
    QUICK_STRUCTURES[0], template('كسر مائل', '#?/#?'),
    template('كسر مركب', String.raw`\frac{#?}{\frac{#?}{#?}}`),
    template('مشتقة عادية', String.raw`\frac{d#?}{d#?}`),
    template('مشتقة جزئية', String.raw`\frac{\partial #?}{\partial #?}`),
  ] },
  { id: 'scripts', label: 'أس ودليل', preview: 'x_{n}^{2}', items: QUICK_STRUCTURES.slice(1, 4) },
  { id: 'roots', label: 'جذر', preview: String.raw`\sqrt{x}`, items: QUICK_STRUCTURES.slice(4, 6) },
  { id: 'functions', label: 'دوال ومشتقات', preview: String.raw`\log_a x`, items: [
    template('لوغاريتم بأساس', String.raw`\log_{#?}{#?}`),
    template('مشتقة عند نقطة', String.raw`\dfrac{\mathrm{d}}{\mathrm{d}x}#?\bigm|_{x=#?}`),
    template('مشتقة من الرتبة n', String.raw`\dfrac{\mathrm{d}^{#?}}{\mathrm{d}x^{#?}}#?\bigm|_{x=#?}`),
  ] },
  { id: 'integrals', label: 'تكامل', preview: String.raw`\int`, items: [QUICK_STRUCTURES[9],
    template('تكامل غير محدود', String.raw`\int #?\,d#?`),
    template('تكامل مزدوج', String.raw`\iint_{#?} #?\,d#?\,d#?`)] },
  { id: 'sums', label: 'مجموع', preview: String.raw`\sum`, items: [QUICK_STRUCTURES[10],
    template('حاصل ضرب', String.raw`\prod_{#?}^{#?} #?`)] },
  { id: 'limits', label: 'نهاية', preview: String.raw`\lim_{x\to a}`, items: [
    template('نهاية', String.raw`\lim_{#?\to #?} #?`),
    template('نهاية من اليمين', String.raw`\lim_{#?\to #?^{+}} #?`),
    template('نهاية من اليسار', String.raw`\lim_{#?\to #?^{-}} #?`)] },
  { id: 'brackets', label: 'أقواس', preview: String.raw`\left(x\right)`, items: [
    template('قوسان دائريان', String.raw`\left(#?\right)`),
    template('قوسان مربعان', String.raw`\left[#?\right]`),
    template('قيمة مطلقة', String.raw`\left|#?\right|`), QUICK_STRUCTURES[8]] },
  { id: 'matrices', label: 'مصفوفة', preview: String.raw`\begin{pmatrix}a&b\\c&d\end{pmatrix}`, items: QUICK_STRUCTURES.slice(6, 8) },
  { id: 'complex', label: 'أعداد مركبة', preview: String.raw`\overline{z}`, items: [
    template('طويل العدد المركب', String.raw`\lvert#?\rvert`), template('السعة', String.raw`\arg(#?)`),
    template('الجزء الحقيقي', String.raw`\Re(#?)`), template('الجزء التخيلي', String.raw`\Im(#?)`),
    template('المرافق', String.raw`\overline{#?}`),
  ] },
  { id: 'symbols', label: 'رموز', preview: String.raw`\pm\;\alpha\;\infty`, items: QUICK_SYMBOLS.map(sym => template(sym.label, sym.code)) },
];
const CHEMISTRY = [QUICK_STRUCTURES[11], QUICK_STRUCTURES[12],
  template('سهم تفاعل', String.raw`\longrightarrow`),
  template('غاز متصاعد', String.raw`\uparrow`), template('راسب', String.raw`\downarrow`),
  QUICK_STRUCTURES[2], QUICK_STRUCTURES[1],
  template('نظير كيميائي', String.raw`{}^{#?}_{#?}\mathrm{#?}`),
];
const FormulaPreview = ({ code }: { code: string }) => (
  <span className="equation-formula" dir="ltr" aria-hidden="true">
    <MathText text={`$${code.replaceAll('#?', String.raw`\square`)}$`} inline />
  </span>
);

// These are the installed MathLive menu commands, reused by the visible ribbon.
type NativeMenuItem = {
  id?: string; submenu?: readonly NativeMenuItem[]; data?: unknown;
  visible?: boolean | (() => boolean); enabled?: boolean | (() => boolean);
  checked?: boolean | 'mixed' | (() => boolean | 'mixed');
  label?: string | (() => string);
  onMenuSelect?: (event: { target: EventTarget; modifiers: { alt: boolean; control: boolean; meta: boolean; shift: boolean }; id?: string; data?: unknown }) => void;
};
const nativeItem = (items: readonly NativeMenuItem[], id: string): NativeMenuItem | undefined => {
  for (const item of items) {
    if (item.id === id) return item;
    const child = nativeItem(item.submenu || [], id);
    if (child) return child;
  }
};
const nativeFlag = (flag: boolean | (() => boolean) | undefined) => typeof flag === 'function' ? flag() : flag !== false;
const NATIVE_TOOL_GROUPS = [
  { id: 'mode', label: 'وضع الكتابة', entries: [['mode-math', 'رياضيات'], ['mode-text', 'نص'], ['mode-latex', 'LaTeX']] },
  { id: 'variant', label: 'نمط الخط', entries: [['variant-style-up', 'مستقيم'], ['variant-style-bold', 'عريض'], ['variant-style-italic', 'مائل'], ['variant-double-struck', 'مزدوج'], ['variant-fraktur', 'قوطي'], ['variant-calligraphic', 'خطّي']] },
  { id: 'color', label: 'لون النص', entries: [] },
  { id: 'background-color', label: 'تظليل', entries: [] },
  { id: 'clipboard', label: 'تحرير', entries: [['cut', 'قص'], ['copy-latex', 'نسخ LaTeX'], ['copy-typst', 'نسخ Typst'], ['copy-ascii-math', 'نسخ AsciiMath'], ['copy-as-math-ml', 'نسخ MathML'], ['paste', 'لصق'], ['select-all', 'تحديد الكل']] },
] as const;
const COLOR_NAMES: Record<string, string> = { red:'أحمر', orange:'برتقالي', yellow:'أصفر', lime:'ليموني', green:'أخضر', teal:'تركوازي', cyan:'سماوي', blue:'أزرق', indigo:'نيلي', purple:'بنفسجي', magenta:'وردي', black:'أسود', 'dark-grey':'رمادي داكن', grey:'رمادي', 'light-grey':'رمادي فاتح', white:'أبيض' };
const COLORS = Object.keys(COLOR_NAMES);
// MathLive 0.110 assigns the Typst copy item the same ID as LaTeX.
const equationMenuItem = (items: readonly NativeMenuItem[], id: string) => id === 'copy-typst'
  ? nativeItem(items, 'copy')?.submenu?.[1] : nativeItem(items, id);

export const EquationEditorModal: React.FC<EquationEditorModalProps> = ({
  isOpen,
  onClose,
  initialEquation = "",
  onSave,
}) => {
  const [displayMode, setDisplayMode] = useState<"inline" | "block">("inline");
  const [equationCode, setEquationCode] = useState("");
  const [showAdvancedToolbar, setShowAdvancedToolbar] = useState(false);
  const [subject, setSubject] = useState<"math" | "chemistry">("math");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const savingRef = useRef(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const mathSelectionRef = useRef<any>(null);
  const [showCodeView, setShowCodeView] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>("fractions");
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [matrixHover, setMatrixHover] = useState<[number, number]>([0, 0]);
  const [nativeItems, setNativeItems] = useState<readonly NativeMenuItem[]>([]);
  const [versionHistory, setVersionHistory] = useState<{ timestamp: number, latex: string }[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const mathfieldRef = useRef<any>(null);

  // Parse initial equation when modal opens
  useEffect(() => {
    if (!isOpen) return;

    setActiveCategory("fractions");
    setActiveTool(null);
    setSubject("math");
    setError("");
    setShowHistory(false);
    mathSelectionRef.current = null;
    setShowAdvancedToolbar(false);
    setShowCodeView(false);

    let raw = initialEquation.trim();

    // Check if wrapping dollars exist
    if (raw.startsWith("$$") && raw.endsWith("$$") && raw.length >= 4) {
      setDisplayMode("block");
      raw = raw.slice(2, -2).trim();
    } else if (raw.startsWith("$") && raw.endsWith("$") && raw.length >= 2) {
      setDisplayMode("inline");
      raw = raw.slice(1, -1).trim();
    } else {
      // Auto detect mode based on structure
      if (
        raw.includes("\\begin{") ||
        raw.includes("\\matrix") ||
        raw.includes("\\bmatrix") ||
        raw.includes("\\pmatrix") ||
        raw.includes("\\vmatrix") ||
        raw.includes("\\cases") ||
        raw.includes("\n")
      ) {
        setDisplayMode("block");
      } else {
        setDisplayMode("inline");
      }
    }

    // Convert Word MathML or Linear math if present
    if (raw.includes("<math") || raw.includes("<omath")) {
      raw = convertMathMLToTeX(raw);
    }
    raw = convertMathMLInText(raw);
    raw = convertWordLinearMathToTeX(raw);

    setEquationCode(raw);
    setVersionHistory(raw ? [{ timestamp: Date.now(), latex: raw }] : []);
    if (mathfieldRef.current) mathfieldRef.current.value = raw;
  }, [isOpen, initialEquation]);

  const saveToHistory = (latex: string) => {
    if (!latex) return;
    setVersionHistory(prev => {
      // Don't save if identical to last
      if (prev.length > 0 && prev[prev.length - 1].latex === latex) return prev;
      return [...prev, { timestamp: Date.now(), latex }];
    });
  };

  const autoRepair = () => {
    saveToHistory(equationCode);
    let repaired = equationCode;
    repaired = repaired.replace(/\{([^{}]+)\\over\s+([^{}]+)\}/g, '\\frac{$1}{$2}');
    repaired = repaired.replace(/->/g, '\\rightarrow');
    handleCodeChange(repaired);
    saveToHistory(repaired);
  };

  const revertToHistory = (latex: string) => {
    saveToHistory(equationCode);
    handleCodeChange(latex);
  };

  // Sync state with MathLive field element
  useEffect(() => {
    if (!isOpen) return;

    const mf = mathfieldRef.current;
    if (!mf) return;

    // Configure MathLive Options
    try {
      mf.smartFence = true;
      mf.mathVirtualKeyboardPolicy = "manual";
      setNativeItems(mf.menuItems);
    } catch (err) {
      console.error("Error initializing mathfield:", err);
    }

    const handleInput = () => {
      if (mathfieldRef.current) {
        const val = mathfieldRef.current.value || "";
        setEquationCode(val);
        setError("");
      }
    };

    const rememberSelection = () => {
      if (mf.selection) mathSelectionRef.current = structuredClone(mf.selection);
    };
    mf.addEventListener("input", handleInput);
    mf.addEventListener("selection-change", rememberSelection);
    mf.addEventListener("focusout", rememberSelection);
    const previousFocus = document.activeElement as HTMLElement | null;
    const keyboard = window.mathVirtualKeyboard;
    const oldKeyboardLayer = document.body.style.getPropertyValue('--keyboard-zindex');
    document.body.style.setProperty('--keyboard-zindex', '10001');
    const updateKeyboardHeight = () => setKeyboardHeight(keyboard?.visible ? keyboard.boundingRect.height : 0);
    keyboard?.addEventListener('geometrychange', updateKeyboardHeight);
    updateKeyboardHeight();
    const frame = requestAnimationFrame(() => mf.focus());
    return () => {
      cancelAnimationFrame(frame);
      mf.removeEventListener("input", handleInput);
      mf.removeEventListener("selection-change", rememberSelection);
      mf.removeEventListener("focusout", rememberSelection);
      keyboard?.removeEventListener('geometrychange', updateKeyboardHeight);
      keyboard?.hide();
      if (oldKeyboardLayer) document.body.style.setProperty('--keyboard-zindex', oldKeyboardLayer);
      else document.body.style.removeProperty('--keyboard-zindex');
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [isOpen]);

  // Update mathfield value if code is edited from text area
  const handleCodeChange = (newCode: string) => {
    setEquationCode(newCode);
    setError("");
    mathSelectionRef.current = null;
    if (mathfieldRef.current) {
      try {
        mathfieldRef.current.value = newCode;
      } catch (e) {
        // ignore parse error during manual typing
      }
    }
  };

  // Insert snippet visually into MathField
  const handleInsertSnippet = (snippet: string) => {
    let cleanSnippet = snippet.trim();
    // Strip wrapping $ or $$ if present
    if (cleanSnippet.startsWith("$$") && cleanSnippet.endsWith("$$")) {
      cleanSnippet = cleanSnippet.slice(2, -2).trim();
    } else if (cleanSnippet.startsWith("$") && cleanSnippet.endsWith("$")) {
      cleanSnippet = cleanSnippet.slice(1, -1).trim();
    }

    const mf = mathfieldRef.current;
    if (mf) {
      try {
        if (typeof mf.insert === "function") {
          if (mathSelectionRef.current) mf.selection = mathSelectionRef.current;
          mf.insert(cleanSnippet, { format: "latex", focus: true, selectionMode: "placeholder" });
        } else if (typeof mf.executeCommand === "function") {
          mf.executeCommand(["insert", cleanSnippet]);
        } else {
          mf.value = (mf.value || "") + " " + cleanSnippet;
        }
        mf.focus();
        setEquationCode(mf.value || "");
      } catch (err) {
        console.error("Error inserting snippet into mathfield:", err);
        setError("تعذّر إدراج القالب. اختر موضعًا داخل المعادلة وحاول مجددًا.");
      }
    } else {
      handleCodeChange(equationCode + " " + cleanSnippet);
    }
  };

  const runNative = (id: string) => {
    const mf = mathfieldRef.current;
    const item = equationMenuItem(nativeItems, id);
    if (!mf || !item?.onMenuSelect) return;
    try {
      if (mathSelectionRef.current) mf.selection = structuredClone(mathSelectionRef.current);
      if (!nativeFlag(item.visible) || !nativeFlag(item.enabled)) {
        setError('حدد موضعًا أو نصًا مناسبًا داخل المعادلة أولًا.');
        return;
      }
      item.onMenuSelect({ target: mf, modifiers: { alt:false, control:false, meta:false, shift:false }, id, data:item.data });
      mf.focus();
      if (mf.selection) mathSelectionRef.current = structuredClone(mf.selection);
      setEquationCode(mf.value || '');
      setError('');
    } catch (err) {
      console.error('MathLive command failed:', id, err);
      setError('تعذّر تنفيذ الأمر. بقيت المعادلة كما هي؛ حاول مجددًا.');
    }
  };

  const handleSave = async () => {
    if (savingRef.current) return;
    setError("");
    const mf = mathfieldRef.current;
    const rawVal = mf ? mf.value : equationCode;
    const trimmed = (rawVal || "").trim();

    if (!trimmed) {
      setError("اكتب معادلة قبل إدراجها في البطاقة.");
      mf?.focus();
      return;
    }

    // Construct final math string with appropriate dollar delimiters
    let formatted = trimmed;
    if (displayMode === "block") {
      formatted = `$$${trimmed}$$`;
    } else {
      let inlineTrimmed = trimmed
        .replace(/\\begin\{align\*?\}/g, "\\begin{aligned}")
        .replace(/\\end\{align\*?\}/g, "\\end{aligned}")
        .replace(/\\begin\{gather\*?\}/g, "\\begin{gathered}")
        .replace(/\\end\{gather\*?\}/g, "\\end{gathered}")
        .replace(/\\begin\{equation\*?\}/g, "\\begin{aligned}")
        .replace(/\\end\{equation\*?\}/g, "\\end{aligned}");
      formatted = `$${inlineTrimmed}$`;
    }

    savingRef.current = true;
    setSaving(true);
    try {
      const result = await onSave(formatted);
      if (result === false) throw new Error("Equation insertion failed");
      mf?.blur();
      onClose();
    } catch {
      setError("تعذّر إدراج المعادلة. بقيت كتابتك محفوظة في هذه النافذة؛ حاول مجددًا.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const handleCopyCode = async () => {
    try {
      await writeToClipboard("", equationCode);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err: any) {
      alert(err.message || "حدث خطأ أثناء النسخ");
    }
  };

  if (!isOpen) return null;

  const isEditing = Boolean(initialEquation.trim());
  const currentGroup = GROUPS.find(group => group.id === activeCategory) || GROUPS[0];
  const items = subject === 'chemistry' ? CHEMISTRY : currentGroup.items;
  const close = () => { if (!savingRef.current) { mathfieldRef.current?.blur(); onClose(); } };
  const handleDialogKey = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault(); event.stopPropagation();
      if (window.mathVirtualKeyboard?.visible) window.mathVirtualKeyboard.hide();
      else close();
    }
    if (event.key === 'Tab') {
      const controls = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), textarea, select, math-field, input') || [])
        .filter(el => !el.closest('[hidden]'));
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
  };
  return createPortal(
    <div data-editor-overlay="true" className="equation-overlay" style={{ bottom: keyboardHeight }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="equation-dialog-title"
        className="equation-dialog" dir="rtl" onKeyDown={handleDialogKey} style={keyboardHeight ? { maxHeight: `calc(100dvh - ${keyboardHeight + 40}px)` } : undefined}>
        <header className="equation-header">
          <div><h2 id="equation-dialog-title">{isEditing ? 'تعديل المعادلة' : 'إدراج معادلة'}</h2>
            <p>اختر تركيبًا واكتب مباشرة</p></div>
          <button type="button" className="equation-icon-button" onClick={close} disabled={saving} aria-label="إغلاق نافذة المعادلة"><X size={22} /></button>
        </header>
        <div className="equation-scroll-body">
          <nav className="equation-subjects" aria-label="مجال المعادلة">
            <button type="button" aria-pressed={subject === 'math'} onClick={() => setSubject('math')}>رياضيات</button>
            <button type="button" aria-pressed={subject === 'chemistry'} onClick={() => setSubject('chemistry')}>كيمياء</button>
          </nav>
          {subject === 'math' && <div className="equation-ribbon" role="group" aria-label="تراكيب المعادلات">
            {GROUPS.map(group => <button type="button" key={group.id} aria-label={group.label} aria-pressed={activeCategory === group.id}
              aria-controls="equation-template-gallery" onClick={() => setActiveCategory(group.id)}>
              <FormulaPreview code={group.preview} /><span>{group.label}</span><ChevronDown size={15} />
            </button>)}
          </div>}
          <div id="equation-template-gallery" className="equation-gallery" role="group" aria-label={subject === 'chemistry' ? 'قوالب الكيمياء' : `قوالب ${currentGroup.label}`}>
            {items.map((item, idx) => <button key={`${subject}-${activeCategory}-${idx}`} type="button" title={item.title} aria-label={item.label}
              onMouseDown={e => e.preventDefault()} onClick={() => handleInsertSnippet(item.snippet)}>
              <FormulaPreview code={item.snippet} /><span>{item.label}</span>
            </button>)}
          </div>
          {subject === 'math' && activeCategory === 'matrices' && <div className="equation-matrix-picker" role="group" aria-label="حجم المصفوفة">
            <span>أو اختر عدد الصفوف والأعمدة:</span>
            <div className="equation-matrix-grid" onMouseLeave={() => setMatrixHover([0, 0])}>
              {Array.from({ length: 25 }, (_, index) => {
                const row = Math.floor(index / 5) + 1, col = index % 5 + 1;
                return <button key={index} type="button" title={`${row} صف × ${col} عمود`} aria-label={`مصفوفة ${row}×${col}`}
                  className={matrixHover[0] >= row && matrixHover[1] >= col ? 'active' : ''}
                  onMouseEnter={() => setMatrixHover([row, col])} onMouseDown={e => e.preventDefault()}
                  onClick={() => runNative(`insert-matrix-${row}x${col}`)} />;
              })}
            </div><span aria-live="polite">{matrixHover[0] ? `${matrixHover[0]} × ${matrixHover[1]}` : 'حتى 5 × 5'}</span>
          </div>}
          <div className="equation-format-bar" role="toolbar" aria-label="تنسيق المعادلة وأوامر التحرير">
            {NATIVE_TOOL_GROUPS.map(group => <button key={group.id} type="button" aria-expanded={activeTool === group.id}
              aria-controls="equation-tool-panel" onMouseDown={e => e.preventDefault()}
              onClick={() => setActiveTool(activeTool === group.id ? null : group.id)}>{group.label}<ChevronDown size={14} /></button>)}
          </div>
          {activeTool && <div id="equation-tool-panel" className="equation-tool-panel" role="group" aria-label={NATIVE_TOOL_GROUPS.find(group => group.id === activeTool)?.label}>
            {(activeTool === 'color' || activeTool === 'background-color' ? COLORS.map(color => [
              `${activeTool === 'color' ? 'color' : 'background-color'}-${color}`, COLOR_NAMES[color]
            ]) : NATIVE_TOOL_GROUPS.find(group => group.id === activeTool)?.entries || []).map(([id, label]) => {
              const item = equationMenuItem(nativeItems, id);
              const checked = typeof item?.checked === 'function' ? item.checked() : item?.checked;
              const swatch = (activeTool === 'color' || activeTool === 'background-color') && item?.label;
              const swatchHtml = typeof item?.label === 'function' ? item.label() : item?.label;
              const swatchColor = swatch ? /background:\s*(#[0-9a-fA-F]{3,8})/.exec(swatchHtml || '')?.[1] : undefined;
              return <button key={id} type="button" aria-label={label} title={label} aria-pressed={checked === true}
                disabled={!item || !nativeFlag(item.visible) || !nativeFlag(item.enabled)}
                onMouseDown={e => e.preventDefault()} onClick={() => runNative(id)}>
                {swatchColor && <span className="equation-swatch" style={{ backgroundColor:swatchColor }} />}{!swatchColor && label}
              </button>;
            })}
          </div>}
          <section className="equation-writing">
            <label id="equation-field-label">المعادلة</label>
            <div className="equation-field-shell">
              <math-field ref={mathfieldRef} aria-labelledby="equation-field-label" aria-describedby="equation-field-help"
                style={{ width: '100%', fontSize: '2rem', direction: 'ltr', backgroundColor: 'transparent', border: 'none', outline: 'none' }} />
            </div>
            <p id="equation-field-help">اختر الخانة واكتب — استخدم الأسهم أو Tab للتنقل بين الخانات</p>
            {error && <p role="alert" className="equation-error">{error}</p>}
          </section>
          <div className="equation-options">
            <div className="equation-placement" role="group" aria-label="موضع المعادلة">
              <span>الموضع</span><div>
                <button type="button" aria-pressed={displayMode === 'inline'} onClick={() => setDisplayMode('inline')}>ضمن السطر</button>
                <button type="button" aria-pressed={displayMode === 'block'} onClick={() => setDisplayMode('block')}>سطر مستقل</button>
              </div>
            </div>
            <div className="equation-option-buttons">
              <button type="button" aria-expanded={showCodeView} aria-controls="equation-advanced" onClick={() => setShowCodeView(!showCodeView)}><Settings size={17} />خيارات متقدمة<ChevronDown size={15} /></button>
              <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => {
                const keyboard = window.mathVirtualKeyboard;
                if (keyboard?.visible) keyboard.hide();
                else { mathfieldRef.current?.focus(); keyboard?.show(); }
              }}><Keyboard size={18} />لوحة المفاتيح</button>
            </div>
          </div>
          {showCodeView && <section id="equation-advanced" className="equation-advanced" aria-label="خيارات متقدمة">
            <div className="equation-advanced-actions">
              <button type="button" onClick={handleCopyCode}><Copy size={16} />{copySuccess ? 'تم النسخ' : 'نسخ الكود'}</button>
              <button type="button" onClick={() => { saveToHistory(equationCode); handleCodeChange(''); }}>مسح المعادلة</button>
              <button type="button" onClick={autoRepair}><Sparkles size={16} />إصلاح تلقائي</button>
              <button type="button" aria-expanded={showHistory} onClick={() => setShowHistory(!showHistory)}><RotateCcw size={16} />سجل التعديلات ({versionHistory.length})</button>
              <button type="button" aria-expanded={showAdvancedToolbar} onClick={() => setShowAdvancedToolbar(!showAdvancedToolbar)}>مكتبة القوالب الكاملة<ChevronDown size={15} /></button>
            </div>
            <label htmlFor="equation-source">لصق من Word أو تحرير LaTeX / MathML</label>
            <textarea id="equation-source" rows={3} dir="ltr" value={equationCode}
              onFocus={() => saveToHistory(equationCode)} onChange={e => handleCodeChange(e.target.value)}
              onBlur={() => {
                let converted = equationCode;
                if (converted.includes('<math') || converted.includes('<omath')) converted = convertMathMLToTeX(converted);
                converted = convertWordLinearMathToTeX(convertMathMLInText(converted));
                if (converted !== equationCode) handleCodeChange(converted);
              }} placeholder="LaTeX / MathML" />
            {showAdvancedToolbar && <EquationToolbar onInsert={handleInsertSnippet} />}
            {showHistory && <div className="equation-history">
              {versionHistory.length === 0 ? <p>لا توجد نسخ سابقة في هذه الجلسة.</p> : versionHistory.map((item, index) => <div key={index}>
                <FormulaPreview code={item.latex} /><button type="button" onClick={() => revertToHistory(item.latex)}>استعادة</button>
              </div>)}
            </div>}
          </section>}
        </div>
        <footer className="equation-footer">
          <span>{isEditing ? 'تُحدّث المعادلة الحالية داخل البطاقة' : 'تُدرج المعادلة عند موضع المؤشر'}</span>
          <div><button type="button" onClick={close} disabled={saving}>إلغاء</button>
            <button type="button" className="equation-submit" onClick={handleSave} disabled={saving}>
              <Check size={18} />{saving ? 'جارٍ الإدراج…' : isEditing ? 'تحديث المعادلة' : 'إدراج في البطاقة'}
            </button></div>
        </footer>
      </div>
    </div>, document.body
  );
};
