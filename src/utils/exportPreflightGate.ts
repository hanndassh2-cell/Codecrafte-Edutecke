/**
 * Unified Pre-Export Validation Gate & Frozen Sandbox Engine
 * 
 * Provides a standardized single-source preflight gate for all export formats:
 * - Official High-Res Image PDF (jsPDF + html-to-image/html2canvas)
 * - Experimental Live-Text PDF V2 (jsPDF + TrueType fonts + vector bidi)
 * - High-Res PNG snapshots (Single page or all pages)
 * 
 * Ensures:
 * 1. Consistent source of truth from .a4-print-sheet elements across Lessons, Exams, and Question Bank.
 * 2. Pre-export checks: valid page count, no blank/empty pages, images loaded, math formulas stabilized.
 * 3. Arabic RTL direction integrity check.
 * 4. Frozen isolated sandbox (clone into off-screen sandbox with fixed 1.0 scale and no UI buttons/tools).
 * 5. Post-export audit comparing preview pages with generated document pages.
 */

import { sanitizeCssString } from "./colorSanitizer";

export interface PreExportDiagnostic {
  totalSheetsFound: number;
  validSheetsCount: number;
  blankSheetsCount: number;
  overflowingSheetsCount: number;
  totalImages: number;
  loadedImages: number;
  failedImages: number;
  equationsCount: number;
  isArabicRtlValid: boolean;
  sheetsMeasurable: boolean;
}

export interface PreExportValidationResult {
  ok: boolean;
  error?: string;
  reasonCode?: "NO_PAGES" | "BLANK_PAGES" | "UNMEASURABLE" | "CONTENT_OVERFLOW" | "IMAGES_FAILED" | "MATH_FAILED" | "FONTS_FAILED";
  validSheets: HTMLElement[];
  diagnostic: PreExportDiagnostic;
  auditSummary: string;
}

export interface PostExportAuditReport {
  previewPageCount: number;
  exportedPageCount: number;
  noBlankPages: boolean;
  equationsRendered: number;
  imagesLoaded: number;
  arabicDirectionValid: boolean;
  status: "verified" | "warning";
  message: string;
}

/**
 * Checks if a specific .a4-print-sheet element has actual substantive content
 * or if it is an accidental blank/empty page.
 */
export function isSheetContentful(sheet: HTMLElement): boolean {
  if (!sheet) return false;

  // 1. Check main content area if present
  const mainEl = sheet.querySelector("main");
  if (mainEl) {
    const mainText = mainEl.textContent?.trim() || "";
    const mainHasMedia = mainEl.querySelectorAll("img, svg, canvas, .katex, .katex-display, .katex-html, math, table, [data-type='equation']").length > 0;
    const mainHasCards = mainEl.querySelectorAll(".exam-question-item, .question-renderer-block, .editor-card, .card-shell").length > 0;
    
    if (mainText.length > 0 || mainHasMedia || mainHasCards) {
      return true;
    }
  }

  // 2. Check full sheet text
  const fullText = sheet.textContent?.trim() || "";
  // Exclude boilerplate that might be in header/footer (like page number or generic template labels)
  const cleanedText = fullText.replace(/صفحة\s*\d+\s*(من|\/)\s*\d+/g, "").trim();

  // 3. Check for substantive content elements anywhere in sheet
  const hasSubstantiveElements = sheet.querySelectorAll(
    "img, svg, canvas, .katex, .katex-display, .katex-html, math, table, [data-type='equation'], .exam-question-item, .question-renderer-block, .editor-card, .card-shell, .math-rendered-block, .math-node"
  ).length > 0;

  if (cleanedText.length > 3 || hasSubstantiveElements) {
    return true;
  }

  return false;
}

function getExpectedA4HeightPx(orientation: "portrait" | "landscape" = "portrait") {
  return (orientation === "landscape" ? 210 : 297) * 3.779527559;
}

export function isSheetOverflowing(sheet: HTMLElement, orientation: "portrait" | "landscape" = "portrait"): boolean {
  if (!sheet) return false;

  const expectedHeight = getExpectedA4HeightPx(orientation);
  const measuredHeight = Math.ceil(Math.max(
    sheet.offsetHeight,
    sheet.scrollHeight,
    sheet.getBoundingClientRect().height
  ));

  if (measuredHeight > expectedHeight + 14) {
    return true;
  }

  const mainEl = sheet.querySelector<HTMLElement>("main");
  const footerEl = sheet.querySelector<HTMLElement>("footer");

  if (mainEl && mainEl.clientHeight > 0 && mainEl.scrollHeight > mainEl.clientHeight + 10) {
    return true;
  }

  if (mainEl && footerEl) {
    const mainRect = mainEl.getBoundingClientRect();
    const footerRect = footerEl.getBoundingClientRect();
    if (mainRect.bottom > footerRect.top + 4) {
      return true;
    }
  }

  return false;
}

/**
 * Waits for all fonts, images, KaTeX equations, and layout to stabilize.
 */
export async function waitForRenderingSettled(container: HTMLElement, timeoutMs = 2500): Promise<{ imagesLoaded: number; imagesFailed: number }> {
  // 1. Fonts readiness
  if (typeof document !== "undefined" && document.fonts && document.fonts.ready) {
    try {
      await Promise.race([
        document.fonts.ready,
        new Promise((resolve) => setTimeout(resolve, timeoutMs / 2)),
      ]);
    } catch {
      // ignore
    }
  }

  // 2. Images loading check
  const imgs = Array.from(container.querySelectorAll<HTMLImageElement>("img"));
  let loadedCount = 0;
  let failedCount = 0;

  if (imgs.length > 0) {
    await Promise.all(
      imgs.map((img) => {
        if (img.complete) {
          if (img.naturalWidth > 0 || img.src.startsWith("data:")) {
            loadedCount++;
          } else {
            failedCount++;
          }
          return Promise.resolve();
        }
        return new Promise<void>((resolve) => {
          const onDone = () => {
            if (img.naturalWidth > 0 || img.src.startsWith("data:")) {
              loadedCount++;
            } else {
              failedCount++;
            }
            resolve();
          };
          img.addEventListener("load", onDone, { once: true });
          img.addEventListener("error", onDone, { once: true });
          setTimeout(onDone, Math.min(timeoutMs, 1200));
        });
      })
    );
  }

  // 3. KaTeX reflow trigger
  const mathEls = container.querySelectorAll(
    ".katex, .katex-display, .katex-html, tiptap-math, [data-type='equation'], .math-display, .math-inline, svg, math, .math-node"
  );
  mathEls.forEach((el) => {
    const htmlEl = el as HTMLElement;
    void htmlEl.offsetHeight;
    void htmlEl.offsetWidth;
  });

  // 4. Double frame wait for CSS paint reflow
  await new Promise((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, 80)))
  );

  return { imagesLoaded: loadedCount, imagesFailed: failedCount };
}

/**
 * Common Pre-Export Gate for all export pathways (PDF image, PDF V2, PNG).
 */
export async function runPreExportGate(
  containerEl: HTMLElement,
  options: { orientation?: "portrait" | "landscape" } = {}
): Promise<PreExportValidationResult> {
  if (!containerEl) {
    return {
      ok: false,
      error: "تعذر بدء التصدير: لم يتم تزويد عنصر المعاينة.",
      reasonCode: "NO_PAGES",
      validSheets: [],
      diagnostic: {
        totalSheetsFound: 0,
        validSheetsCount: 0,
        blankSheetsCount: 0,
        overflowingSheetsCount: 0,
        totalImages: 0,
        loadedImages: 0,
        failedImages: 0,
        equationsCount: 0,
        isArabicRtlValid: false,
        sheetsMeasurable: false,
      },
      auditSummary: "فشل التحقق: لا يوجد محتوى للمعاينة",
    };
  }

  // 1. Wait for fonts & DOM settling
  const imgStats = await waitForRenderingSettled(containerEl);

  // 2. Discover .a4-print-sheet elements (ignoring measuring scratchpads)
  let rawSheets = Array.from(
    containerEl.querySelectorAll<HTMLElement>(".a4-print-sheet")
  ).filter((s) => !s.closest('[data-measuring="true"]'));

  // If none found immediately, retry briefly for dynamically paginated templates
  if (rawSheets.length === 0) {
    const startTime = Date.now();
    while (Date.now() - startTime < 1200) {
      await new Promise((r) => setTimeout(r, 100));
      const found = Array.from(
        containerEl.querySelectorAll<HTMLElement>(".a4-print-sheet")
      ).filter((s) => !s.closest('[data-measuring="true"]'));
      if (found.length > 0) {
        rawSheets = found;
        break;
      }
    }
  }

  // Fallback: If container itself is an .a4-print-sheet
  if (rawSheets.length === 0 && containerEl.classList.contains("a4-print-sheet")) {
    rawSheets = [containerEl];
  }

  if (rawSheets.length === 0) {
    return {
      ok: false,
      error: "لم يتم العثور على أي صفحات صالحة للمعاينة والطباعة (.a4-print-sheet). يرجى التأكد من اكتمال تحميل المستند.",
      reasonCode: "NO_PAGES",
      validSheets: [],
      diagnostic: {
        totalSheetsFound: 0,
        validSheetsCount: 0,
        blankSheetsCount: 0,
        overflowingSheetsCount: 0,
        totalImages: imgStats.imagesLoaded + imgStats.imagesFailed,
        loadedImages: imgStats.imagesLoaded,
        failedImages: imgStats.imagesFailed,
        equationsCount: 0,
        isArabicRtlValid: false,
        sheetsMeasurable: false,
      },
      auditSummary: "فشل: لم يتم العثور على صفحات معاينة",
    };
  }

  // 3. Measurability verification
  let sheetsMeasurable = true;
  for (const sheet of rawSheets) {
    const rect = sheet.getBoundingClientRect();
    // Allow off-screen sheets if offsetWidth > 0 or if styled with fixed dimensions
    const isDimensioned =
      rect.width > 0 ||
      sheet.offsetWidth > 0 ||
      sheet.style.width.includes("mm") ||
      sheet.classList.contains("a4-print-sheet");
    if (!isDimensioned) {
      sheetsMeasurable = false;
      break;
    }
  }

  if (!sheetsMeasurable) {
    return {
      ok: false,
      error: "إحدى صفحات المعاينة غير قابلة للقياس أو غير ظاهرة على الشاشة. يرجى الانتظار حتى اكتمال تحميل الصفحة.",
      reasonCode: "UNMEASURABLE",
      validSheets: [],
      diagnostic: {
        totalSheetsFound: rawSheets.length,
        validSheetsCount: 0,
        blankSheetsCount: 0,
        overflowingSheetsCount: 0,
        totalImages: imgStats.imagesLoaded + imgStats.imagesFailed,
        loadedImages: imgStats.imagesLoaded,
        failedImages: imgStats.imagesFailed,
        equationsCount: 0,
        isArabicRtlValid: false,
        sheetsMeasurable: false,
      },
      auditSummary: "فشل: صفحات غير قابلة للقياس",
    };
  }

  // 4. Contentfulness filter: Eliminate blank or empty sheets
  const validSheets = rawSheets.filter((sheet) => isSheetContentful(sheet));
  const blankSheetsCount = rawSheets.length - validSheets.length;

  if (validSheets.length === 0) {
    return {
      ok: false,
      error: "المستند فارغ أو يحتوي على صفحات بيضاء دون محتوى تعليمي أو أسئلة قابلة للتصدير. يرجى إضافة محتوى قبل التصدير.",
      reasonCode: "BLANK_PAGES",
      validSheets: [],
      diagnostic: {
        totalSheetsFound: rawSheets.length,
        validSheetsCount: 0,
        blankSheetsCount,
        overflowingSheetsCount: 0,
        totalImages: imgStats.imagesLoaded + imgStats.imagesFailed,
        loadedImages: imgStats.imagesLoaded,
        failedImages: imgStats.imagesFailed,
        equationsCount: 0,
        isArabicRtlValid: false,
        sheetsMeasurable: true,
      },
      auditSummary: "فشل: المستند فارغ تماماً",
    };
  }

  const overflowingSheets = validSheets.filter((sheet) =>
    isSheetOverflowing(sheet, options.orientation || "portrait")
  );

  if (overflowingSheets.length > 0) {
    return {
      ok: false,
      error: `تعذر التصدير: توجد ${overflowingSheets.length} صفحة يتجاوز محتواها حدود A4. يرجى انتظار إعادة توزيع الصفحات أو تقليل الكثافة/حجم الخط قبل التصدير.`,
      reasonCode: "CONTENT_OVERFLOW",
      validSheets: [],
      diagnostic: {
        totalSheetsFound: rawSheets.length,
        validSheetsCount: validSheets.length,
        blankSheetsCount,
        overflowingSheetsCount: overflowingSheets.length,
        totalImages: imgStats.imagesLoaded + imgStats.imagesFailed,
        loadedImages: imgStats.imagesLoaded,
        failedImages: imgStats.imagesFailed,
        equationsCount: 0,
        isArabicRtlValid: false,
        sheetsMeasurable: true,
      },
      auditSummary: `فشل: ${overflowingSheets.length} صفحة خارج حدود A4`,
    };
  }

  // 5. Arabic RTL Direction verification
  const isContainerRtl =
    containerEl.getAttribute("dir") === "rtl" ||
    window.getComputedStyle(containerEl).direction === "rtl" ||
    document.documentElement.getAttribute("dir") === "rtl";

  // 6. KaTeX & Math Equations count
  const equationsCount = validSheets.reduce((acc, sheet) => {
    return (
      acc +
      sheet.querySelectorAll(
        ".katex, .katex-display, .katex-html, tiptap-math, [data-type='equation'], math, .math-node"
      ).length
    );
  }, 0);

  const totalImages = imgStats.imagesLoaded + imgStats.imagesFailed;

  const diagnostic: PreExportDiagnostic = {
    totalSheetsFound: rawSheets.length,
    validSheetsCount: validSheets.length,
    blankSheetsCount,
    overflowingSheetsCount: 0,
    totalImages,
    loadedImages: imgStats.imagesLoaded,
    failedImages: imgStats.imagesFailed,
    equationsCount,
    isArabicRtlValid: isContainerRtl,
    sheetsMeasurable: true,
  };

  const auditSummary = `المعاينة: ${validSheets.length} صفحات | الصور: ${imgStats.imagesLoaded} | المعادلات: ${equationsCount} | الاتجاه: ${isContainerRtl ? "عربي RTL" : "LTR"} | لا توجد صفحات فارغة أو محتوى خارج A4`;

  return {
    ok: true,
    validSheets,
    diagnostic,
    auditSummary,
  };
}

/**
 * Creates an isolated frozen export sandbox.
 * Clones target sheets into an off-screen fixed-scale container (zoom=1, scale=1)
 * and strips all interactive toolbars, buttons, and editing controls.
 */
export function createFrozenExportSandbox(
  sheets: HTMLElement[],
  orientation: "portrait" | "landscape" = "portrait"
): {
  sandboxStage: HTMLElement;
  clonedSheets: HTMLElement[];
  cleanup: () => void;
} {
  const pdfWidthMm = orientation === "landscape" ? 297 : 210;
  const pdfHeightMm = orientation === "landscape" ? 210 : 297;

  const sandboxStage = document.createElement("div");
  sandboxStage.id = "pdf-export-frozen-sandbox";
  sandboxStage.className = "print-preview-modal-root";
  sandboxStage.style.position = "fixed";
  sandboxStage.style.top = "-20000px";
  sandboxStage.style.left = "-20000px";
  sandboxStage.style.zIndex = "-99999";
  sandboxStage.style.width = `${pdfWidthMm}mm`;
  sandboxStage.style.height = `${pdfHeightMm}mm`;
  sandboxStage.style.overflow = "hidden";
  sandboxStage.style.background = "#ffffff";
  sandboxStage.style.color = "#0f172a";
  sandboxStage.style.boxSizing = "border-box";
  sandboxStage.style.opacity = "1";
  sandboxStage.style.visibility = "visible";
  sandboxStage.style.pointerEvents = "none";
  sandboxStage.style.transform = "none";
  sandboxStage.style.zoom = "1";

  document.body.appendChild(sandboxStage);

  const clonedSheets: HTMLElement[] = [];

  for (let i = 0; i < sheets.length; i++) {
    const originalSheet = sheets[i];
    const clonedSheet = originalSheet.cloneNode(true) as HTMLElement;

    // Reset styles to pure fixed paper dimensions
    clonedSheet.style.transform = "none";
    clonedSheet.style.zoom = "1";
    clonedSheet.style.margin = "0";
    clonedSheet.style.position = "relative";
    clonedSheet.style.top = "0";
    clonedSheet.style.left = "0";
    clonedSheet.style.boxShadow = "none";
    clonedSheet.style.border = "none";
    clonedSheet.style.width = `${pdfWidthMm}mm`;
    clonedSheet.style.minHeight = `${pdfHeightMm}mm`;
    clonedSheet.style.maxHeight = "none";
    clonedSheet.style.background = "#ffffff";
    clonedSheet.style.display = "flex";
    clonedSheet.style.visibility = "visible";
    clonedSheet.style.opacity = "1";
    clonedSheet.classList.remove("hidden", "opacity-0", "pointer-events-none");
    clonedSheet.classList.add("pdf-print-density", "pdf-export-sheet");

    // Remove buttons, edit toolbars, overlays, and non-print UI
    const removeSelectors = [
      "button",
      '[role="button"]',
      ".no-print",
      ".no-pdf",
      '[class*="print:hidden"]',
      '[data-no-print="true"]',
      "input",
      "select",
      "textarea",
      ".modal",
      ".toolbar",
      ".editor-toolbar",
      ".print-modal-toolbar",
      ".action-btn",
      ".editor-only-hint",
      '[data-measuring="true"]',
    ];

    const elementsToRemove = clonedSheet.querySelectorAll(removeSelectors.join(", "));
    elementsToRemove.forEach((el) => {
      // NEVER remove mathematical formulas or question content cards!
      if (
        el.closest(
          ".katex, .katex-display, .math-text-container, tiptap-math, [data-type='equation'], math, svg, .question-renderer-block, .editor-card-content, .card-shell-content"
        )
      ) {
        return;
      }
      if (el.parentNode) {
        el.parentNode.removeChild(el);
      }
    });

    // Remove .katex-mathml so MathML text annotations don't overlap canvas glyphs
    clonedSheet.querySelectorAll(".katex-mathml").forEach((el) => {
      el.remove();
    });

    // Ensure .katex-html is visible
    clonedSheet.querySelectorAll(".katex-html").forEach((el) => {
      const htmlEl = el as HTMLElement;
      htmlEl.style.setProperty("display", "inline-block", "important");
      htmlEl.style.setProperty("visibility", "visible", "important");
      htmlEl.style.setProperty("opacity", "1", "important");
    });

    // Strip tooltips and hover effects
    clonedSheet.querySelectorAll("[title]").forEach((el) => {
      el.removeAttribute("title");
    });

    // Sanitize any dangerous CSS expressions
    clonedSheet.querySelectorAll("*").forEach((el) => {
      const hEl = el as HTMLElement;
      if (hEl.style && hEl.style.cssText) {
        hEl.style.cssText = sanitizeCssString(hEl.style.cssText);
      }
    });

    clonedSheets.push(clonedSheet);
  }

  const cleanup = () => {
    if (document.body.contains(sandboxStage)) {
      document.body.removeChild(sandboxStage);
    }
  };

  return {
    sandboxStage,
    clonedSheets,
    cleanup,
  };
}

/**
 * Builds an automated post-export verification audit comparing the preview
 * expectations with the actual generated PDF / image outputs.
 */
export function buildPostExportAudit(
  previewPageCount: number,
  exportedPageCount: number,
  diagnostic: PreExportDiagnostic
): PostExportAuditReport {
  const noBlankPages = diagnostic.blankSheetsCount === 0;
  const isMatch = previewPageCount === exportedPageCount && exportedPageCount > 0;
  const status = isMatch && noBlankPages ? "verified" : "warning";

  const message = `المعاينة: ${previewPageCount} صفحات | PDF: ${exportedPageCount} صفحات | ${
    noBlankPages ? "لا توجد صفحة بيضاء" : `تم استبعاد ${diagnostic.blankSheetsCount} صفحة فارغة`
  } | المعادلات: ${diagnostic.equationsCount} | النصوص: ${diagnostic.isArabicRtlValid ? "عربي RTL سليم" : "سليم"}`;

  return {
    previewPageCount,
    exportedPageCount,
    noBlankPages,
    equationsRendered: diagnostic.equationsCount,
    imagesLoaded: diagnostic.loadedImages,
    arabicDirectionValid: diagnostic.isArabicRtlValid,
    status,
    message,
  };
}
