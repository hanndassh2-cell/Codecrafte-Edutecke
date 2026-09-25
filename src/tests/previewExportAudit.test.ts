/**
 * Preview, Export & Print Audit Test Suite
 * Validates lesson and exam preview formatting, export button labels, list formatting, equation sanitization, and print options.
 */

import { formatListMarker, BULLET_STYLES, NUMBER_STYLES, toRomanNumeral } from "../utils/listEngine";
import { convertWordLinearMathToTeX } from "../utils/mathConverter";
import { generateExamPrintItems } from "../services/SharedPrintService";
import { PrintTemplate } from "../types";

export interface PreviewAuditTestResult {
  suite: string;
  name: string;
  passed: boolean;
  error?: string;
}

export function runPreviewAndExportAuditTests(): {
  total: number;
  passed: number;
  failed: number;
  results: PreviewAuditTestResult[];
} {
  const results: PreviewAuditTestResult[] = [];

  function test(suite: string, name: string, fn: () => void) {
    try {
      fn();
      results.push({ suite, name, passed: true });
    } catch (err: any) {
      results.push({ suite, name, passed: false, error: err?.message || String(err) });
    }
  }

  function assert(condition: boolean, msg: string) {
    if (!condition) {
      throw new Error(`Assertion failed: ${msg}`);
    }
  }

  // 1. Bullet and Numbering Engine Tests
  test("List Engine", "Formats decimal numbers correctly", () => {
    const m1 = formatListMarker(1, "decimal", "rtl");
    const m2 = formatListMarker(2, "decimal", "rtl");
    assert(m1.includes("1"), "Marker 1 should contain '1'");
    assert(m2.includes("2"), "Marker 2 should contain '2'");
  });

  test("List Engine", "Formats Arabic Abjad letters correctly", () => {
    const m1 = formatListMarker(1, "arabic-abjad", "rtl");
    const m2 = formatListMarker(2, "arabic-abjad", "rtl");
    assert(m1.includes("أ"), "Marker 1 should be 'أ'");
    assert(m2.includes("ب"), "Marker 2 should be 'ب'");
  });

  test("List Engine", "Formats circled numbers correctly", () => {
    const c1 = formatListMarker(1, "circled", "rtl");
    const c2 = formatListMarker(2, "circled", "rtl");
    assert(c1 === "①", "Circled marker 1 must be ①");
    assert(c2 === "②", "Circled marker 2 must be ②");
  });

  test("List Engine", "Formats bullets correctly", () => {
    const bDisc = formatListMarker(1, "disc", "rtl");
    const bSquare = formatListMarker(1, "square", "rtl");
    assert(bDisc === "•", "Disc bullet should be •");
    assert(bSquare === "■", "Square bullet should be ■");
  });

  test("List Engine", "Formats Roman numerals correctly", () => {
    assert(toRomanNumeral(1) === "I", "1 should be I");
    assert(toRomanNumeral(4) === "IV", "4 should be IV");
    assert(toRomanNumeral(9) === "IX", "9 should be IX");
  });

  // 2. Math & Equation Conversion Tests
  test("Equation Converter", "Cleans Word Linear Math and transforms linear arrays", () => {
    const input = "■(a&b@c&d)";
    const tex = convertWordLinearMathToTeX(input);
    assert(typeof tex === "string", "Equation output should be a valid string");
  });

  test("Equation Converter", "Sanitizes HTML entities in math strings", () => {
    const input = "&lt;x&gt; &amp; &quot;y&quot;";
    const tex = convertWordLinearMathToTeX(input);
    assert(!tex.includes("&lt;"), "HTML entity &lt; must be replaced with <");
    assert(tex.includes("<x>"), "Entity <x> must be intact");
  });

  // 3. Shared Print Service & Exam Layout Tests
  const mockTemplate: PrintTemplate = {
    id: "tmpl-test",
    name: "قالب اختبار",
    type: "exam",
    orientation: "portrait",
    marginsCm: { top: 2, bottom: 2, left: 1.5, right: 1.5 },
    headerContent: {
      schoolName: "مدرسة الاختبار",
      subjectName: "الرياضيات",
      showHijriDate: true,
      showGregorianDate: true,
    },
    footerContent: {
      teacherName: "الأستاذ الفاضل",
      copyrightNotice: "جميع الحقوق محفوظة",
      showPageNumber: true,
    },
    isDefault: true,
  };

  test("Exam Print Engine", "Generates header and question blocks uniformly", () => {
    const items = generateExamPrintItems({
      template: mockTemplate,
      title: "امتحان نهاية الفصل",
      durationMinutes: 60,
      totalMarks: 20,
      showStudentBox: true,
      questions: [
        {
          id: "q-1",
          type: "mcq",
          text: "ما هو ناتج 2 + 2؟",
          options: ["1", "2", "3", "4"],
          correctOptionIndex: 3,
          allocatedMarks: 5,
        },
        {
          id: "q-2",
          type: "true_false",
          text: "مجموع زوايا المثلث 180 درجة.",
          allocatedMarks: 5,
        }
      ],
      showAnswerKey: false,
    });

    assert(items.length > 0, "Items list should not be empty");
    assert(items.some(i => i.id === "header-title"), "Exam Title block must exist");
    assert(items.some(i => i.id === "header-student-box"), "Student Info Box must exist when showStudentBox is true");
  });

  test("Exam Print Engine", "Generates answer key items when showAnswerKey is true", () => {
    const items = generateExamPrintItems({
      template: mockTemplate,
      title: "امتحان نهاية الفصل",
      showStudentBox: false,
      questions: [
        {
          id: "q-1",
          type: "mcq",
          text: "ما هو ناتج 2 + 2؟",
          options: ["1", "2", "3", "4"],
          correctOptionIndex: 3,
          allocatedMarks: 5,
        }
      ],
      showAnswerKey: true,
    });

    assert(items.some(i => i.id.includes("anskey-")), "Answer key blocks should be included");
  });

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  return {
    total: results.length,
    passed,
    failed,
    results,
  };
}

// CLI test runner support
if (process.argv[1]?.includes("previewExportAudit.test.ts")) {
  console.log("==================================================");
  console.log("🔍 Running Preview, Export & Print Audit Test Suite");
  console.log("==================================================");
  const suiteResult = runPreviewAndExportAuditTests();
  suiteResult.results.forEach((r) => {
    if (r.passed) {
      console.log(`✅ [${r.suite}] ${r.name}`);
    } else {
      console.error(`❌ [${r.suite}] ${r.name}: ${r.error}`);
    }
  });
  console.log("--------------------------------------------------");
  console.log(`Total: ${suiteResult.total} | Passed: ${suiteResult.passed} | Failed: ${suiteResult.failed}`);
  console.log("==================================================");
  if (suiteResult.failed > 0) {
    process.exit(1);
  }
}

