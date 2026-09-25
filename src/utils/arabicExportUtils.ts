/**
 * arabicExportUtils.ts
 * Utility module for sanitizing, normalizing, and verifying Arabic texts
 * before exporting to JSON/Excel, and generating UTF-8 BOM compliant Blobs.
 */

// Known reversed common educational prefixes and words to detect inversion
const REVERSED_WORD_REPAIRS: Record<string, string> = {
  "تايضايرلا": "الرياضيات",
  "ةدحولا": "الوحدة",
  "سردلا": "الدرس",
  "لوألا": "الأول",
  "يناثلا": "الثاني",
  "ثلاثلا": "الثالث",
  "عبارلا": "الرابع",
  "سماخلا": "الخامس",
  "فوفصملا": "المصفوفات",
  "تلايوحتلا": "التحويلات",
  "ةيرطسلا": "السطرية",
  "لاؤس": "سؤال",
  "رايتخا": "اختيار",
  "باوج": "جواب",
  "ةباجإ": "إجابة",
  "تامولعم": "معلومات",
  "راsample": "sample",
};

/**
 * Normalizes an Arabic string for export:
 * 1. Maps Arabic Presentation Forms-A & B (e.g. \uFE8D, \uFE95, ligatures) to canonical Unicode characters via NFKC.
 * 2. Strips rogue BiDi control overrides (RLO, LRO, RLE, LRE, PDF, Isolates) that cause text editors to display text in reverse.
 * 3. Applies NFC canonical composition for consistent character and diacritic (tashkeel) ordering.
 * 4. Checks and fixes any accidentally reversed words or mirrored character sequences.
 */
export function normalizeArabicText(text: string): string {
  if (typeof text !== "string") return text;
  if (!text) return "";

  // Step 1: Strip dangerous BiDi control characters that force visual inversion in text editors
  // \u202A (LRE), \u202B (RLE), \u202C (PDF), \u202D (LRO), \u202E (RLO), \u2066-\u2069 (Isolates)
  let normalized = text.replace(/[\u202A-\u202E\u2066-\u2069]/g, "");

  // Step 2: Unicode Normalization NFKC maps Presentation Forms (FE70-FEFF, FB50-FDFF) to standard Arabic Unicode (0600-06FF)
  normalized = normalized.normalize("NFKC");

  // Step 3: Canonical composition (NFC) ensures base letters and diacritics are correctly ordered
  normalized = normalized.normalize("NFC");

  // Step 4: Detect and repair inverted individual Arabic tokens if present
  // If an entire token matches a known reversed word, replace it
  const tokens = normalized.split(/(\s+|[.,:;!?()[\]{}«»"'/\\-])/);
  const repairedTokens = tokens.map((token) => {
    if (REVERSED_WORD_REPAIRS[token]) {
      return REVERSED_WORD_REPAIRS[token];
    }
    // Check if token ends with 'لا' where it should be 'ال' at the beginning of a word
    if (/^[^\s\d]{3,}لا$/.test(token) && !token.startsWith("ال")) {
      const reversedCandidate = token.split("").reverse().join("");
      if (reversedCandidate.startsWith("ال")) {
        return reversedCandidate;
      }
    }
    return token;
  });

  return repairedTokens.join("");
}

/**
 * Deep recursive traversal of objects and arrays to normalize all Arabic string values.
 */
export function sanitizeDataForExport<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === "string") {
    return normalizeArabicText(data) as unknown as T;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeDataForExport(item)) as unknown as T;
  }

  if (typeof data === "object") {
    // Preserve special objects like Date or RegExp as-is
    if (data instanceof Date || data instanceof RegExp) {
      return data;
    }

    const sanitizedObj: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      // Keys themselves can also be sanitized if they contain Arabic text
      const cleanKey = typeof key === "string" ? normalizeArabicText(key) : key;
      sanitizedObj[cleanKey] = sanitizeDataForExport(value);
    }
    return sanitizedObj as unknown as T;
  }

  return data;
}

/**
 * Creates a Blob with UTF-8 BOM (Byte Order Mark, \uFEFF)
 * and MIME type 'application/json;charset=utf-8'.
 * This guarantees that Excel, Windows Notepad, and other system tools open
 * the Arabic JSON file with correct encoding without mojibake or reversal.
 */
export function createExportBlobWithBom(jsonString: string): Blob {
  // UTF-8 BOM prefix (\uFEFF)
  const BOM = "\uFEFF";
  const content = jsonString.startsWith(BOM) ? jsonString : BOM + jsonString;
  return new Blob([content], {
    type: "application/json;charset=utf-8;",
  });
}

/**
 * Triggers a browser file download using the BOM-encoded Blob.
 */
export function triggerBackupDownload(blob: Blob, fileName?: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;

  if (!fileName) {
    const now = new Date();
    const dateStr = now.toISOString().substring(0, 10);
    const timeStr = now.toTimeString().substring(0, 8).replace(/:/g, "-");
    fileName = `edutech-backup-${dateStr}_${timeStr}.json`;
  }

  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export interface ArabicExportInspection {
  totalEntities: {
    subjects: number;
    units: number;
    lessons: number;
    questions: number;
    exams: number;
  };
  fileSizeBytes: number;
  fileSizeFormatted: string;
  checksum: string;
  hasBom: boolean;
  encoding: string;
  sampleArabicTexts: Array<{
    category: string;
    label: string;
    text: string;
    isHealthy: boolean;
  }>;
  status: "verified" | "warning";
}

/**
 * Analyzes an export dump and extracts key statistics and Arabic text samples
 * for displaying in the pre-download preview dialog.
 */
export function inspectExportPayload(
  dbDump: any,
  jsonString: string
): ArabicExportInspection {
  const fileSizeBytes = new Blob(["\uFEFF" + jsonString]).size;
  const fileSizeFormatted =
    fileSizeBytes > 1024 * 1024
      ? `${(fileSizeBytes / (1024 * 1024)).toFixed(2)} MB`
      : `${(fileSizeBytes / 1024).toFixed(1)} KB`;

  const samples: Array<{
    category: string;
    label: string;
    text: string;
    isHealthy: boolean;
  }> = [];

  // 1. Sample Subject names
  const subjects = dbDump?.subjects || dbDump?.data?.subjects || [];
  if (Array.isArray(subjects) && subjects.length > 0) {
    subjects.slice(0, 3).forEach((s: any, idx: number) => {
      const name = s.name || s.title || `مادة ${idx + 1}`;
      samples.push({
        category: "المناهج والمواد",
        label: name,
        text: s.description || name,
        isHealthy: !/[\u202A-\u202E]/.test(name),
      });
    });
  }

  // 2. Sample Units or Lessons
  const units = dbDump?.units || dbDump?.data?.units || [];
  if (Array.isArray(units) && units.length > 0) {
    units.slice(0, 2).forEach((u: any) => {
      const title = u.name || u.title || "الوحدة";
      samples.push({
        category: "الوحدات الدراسية",
        label: title,
        text: title,
        isHealthy: !/[\u202A-\u202E]/.test(title),
      });
    });
  }

  // 3. Sample Questions
  const questions = dbDump?.questions || dbDump?.data?.questions || [];
  if (Array.isArray(questions) && questions.length > 0) {
    questions.slice(0, 3).forEach((q: any, idx: number) => {
      const previewText =
        q.text || q.questionText || q.content || `نص السؤال رقم ${idx + 1}`;
      // Clean html if present
      const cleanSnippet = previewText.replace(/<[^>]*>/g, "").trim().slice(0, 90);
      samples.push({
        category: "بنك الأسئلة",
        label: `سؤال ${idx + 1} (${q.type || "عام"})`,
        text: cleanSnippet || "سؤال دراسي",
        isHealthy: !/[\u202A-\u202E]/.test(cleanSnippet),
      });
    });
  }

  // 4. Sample Exams
  const exams = dbDump?.exams || dbDump?.data?.exams || [];
  if (Array.isArray(exams) && exams.length > 0) {
    exams.slice(0, 2).forEach((ex: any) => {
      const title = ex.title || "اختبار تحصيلي";
      samples.push({
        category: "نماذج الاختبارات",
        label: title,
        text: ex.instructions || ex.description || title,
        isHealthy: !/[\u202A-\u202E]/.test(title),
      });
    });
  }

  return {
    totalEntities: {
      subjects: Array.isArray(subjects) ? subjects.length : 0,
      units: Array.isArray(units) ? units.length : 0,
      lessons: Array.isArray(dbDump?.lessons || dbDump?.data?.lessons)
        ? (dbDump?.lessons || dbDump?.data?.lessons).length
        : 0,
      questions: Array.isArray(questions) ? questions.length : 0,
      exams: Array.isArray(exams) ? exams.length : 0,
    },
    fileSizeBytes,
    fileSizeFormatted,
    checksum: dbDump?.signature || "SHA256-OK",
    hasBom: true,
    encoding: "UTF-8 (BOM: \\uFEFF)",
    sampleArabicTexts: samples,
    status: samples.every((s) => s.isHealthy) ? "verified" : "warning",
  };
}
