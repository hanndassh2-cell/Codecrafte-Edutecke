export interface CardLayoutEstimate {
  id: string;
  type: string;
  title: string;
  estimatedHeightPx: number;
  forceBreakAfter?: boolean;
  forceBreakBefore?: boolean;
}

export interface PageLayoutReport {
  totalPages: number;
  availablePageHeightPx: number;
  pageDistribution: {
    pageNumber: number;
    cards: CardLayoutEstimate[];
    usedHeightPx: number;
    remainingHeightPx: number;
    whiteSpacePercentage: number;
  }[];
  averageWhiteSpacePercentage: number;
  efficiencyScorePercentage: number;
  hasLargeGaps: boolean;
  recommendations: string[];
}

/**
 * Estimates the height of a paragraph card in pixels for A4 rendering.
 */
export function estimateCardHeight(
  card: { id: string; type: string; title?: string; body?: string; forceBreakAfter?: boolean; forceBreakBefore?: boolean },
  options?: { baseFontSize?: number; lineSpacing?: number; cardSpacing?: number }
): number {
  const baseFont = options?.baseFontSize || 12; // pt
  const lineSpacing = options?.lineSpacing || 1.2;
  const paddingPx = card.type === "title" ? 16 : 32; // card padding top/bottom
  const titleHeightPx = card.title ? 32 : 0;

  if (card.type === "page-break") {
    return 20; // minimal height for indicator
  }

  let bodyText = card.body || "";
  let bodyHeightPx = 0;

  if (card.type === "questions") {
    try {
      if (bodyText.startsWith("[") || bodyText.startsWith("{")) {
        const questions = JSON.parse(bodyText);
        const list = Array.isArray(questions) ? questions : [questions];
        bodyHeightPx = list.reduce((acc, q) => {
          let qH = 50; // base text question height
          if (q.questionText) qH += Math.ceil(q.questionText.length / 60) * 22;
          if (q.imageUrl) qH += 120;
          if (q.options && Array.isArray(q.options)) qH += q.options.length * 28;
          if (q.modelAnswer) qH += 40;
          return acc + qH;
        }, 0);
      } else {
        bodyHeightPx = Math.ceil(bodyText.length / 50) * 24 + 40;
      }
    } catch {
      bodyHeightPx = 80;
    }
  } else if (card.type === "images") {
    bodyHeightPx = 220; // estimate image height + caption
  } else if (card.type === "tables") {
    bodyHeightPx = 180;
  } else {
    // Standard html or raw text
    const cleanText = bodyText.replace(/<[^>]*>/g, " ").trim();
    const charCount = cleanText.length;
    const estimatedLines = Math.max(1, Math.ceil(charCount / 65));
    const fontPx = baseFont * 1.33; // pt to px
    bodyHeightPx = Math.ceil(estimatedLines * fontPx * lineSpacing);
  }

  return titleHeightPx + paddingPx + bodyHeightPx;
}

/**
 * Calculates page breakdown and returns a PageLayoutReport.
 */
export function analyzePageLayout(
  cards: any[],
  templateSettings?: any
): PageLayoutReport {
  const isLandscape = templateSettings?.orientation === "landscape";
  const pageHeightPx = isLandscape ? 793 : 1122; // 297mm @ 96dpi = 1122.5px
  const marginsCm = templateSettings?.marginsCm || { top: 2.5, bottom: 2.5 };
  const marginsPx = (parseFloat(marginsCm.top) + parseFloat(marginsCm.bottom)) * 37.8;
  const headerFooterPx = 180; // header + footer
  const safetyBufferPx = 24;
  const availablePageHeightPx = Math.max(300, pageHeightPx - marginsPx - headerFooterPx - safetyBufferPx);

  const gapPx = templateSettings?.typography?.cardSpacing ?? 16;

  const estimates: CardLayoutEstimate[] = cards.map((c) => ({
    id: c.id,
    type: c.type,
    title: c.title || "",
    estimatedHeightPx: estimateCardHeight(c, {
      baseFontSize: templateSettings?.typography?.baseFontSize,
      lineSpacing: templateSettings?.typography?.lineSpacing,
    }),
    forceBreakAfter: c.forceBreakAfter || c.type === "page-break",
    forceBreakBefore: c.forceBreakBefore,
  }));

  const pages: {
    pageNumber: number;
    cards: CardLayoutEstimate[];
    usedHeightPx: number;
    remainingHeightPx: number;
    whiteSpacePercentage: number;
  }[] = [];

  let currentPageCards: CardLayoutEstimate[] = [];
  let currentHeight = 0;

  estimates.forEach((cardEstimate) => {
    // If forceBreakBefore is active
    if (cardEstimate.forceBreakBefore && currentPageCards.length > 0) {
      const remaining = Math.max(0, availablePageHeightPx - currentHeight);
      pages.push({
        pageNumber: pages.length + 1,
        cards: currentPageCards,
        usedHeightPx: currentHeight,
        remainingHeightPx: remaining,
        whiteSpacePercentage: Math.round((remaining / availablePageHeightPx) * 100),
      });
      currentPageCards = [];
      currentHeight = 0;
    }

    const spaceNeeded = cardEstimate.estimatedHeightPx;

    if (currentHeight + spaceNeeded > availablePageHeightPx && currentPageCards.length > 0) {
      const remaining = Math.max(0, availablePageHeightPx - currentHeight);
      pages.push({
        pageNumber: pages.length + 1,
        cards: currentPageCards,
        usedHeightPx: currentHeight,
        remainingHeightPx: remaining,
        whiteSpacePercentage: Math.round((remaining / availablePageHeightPx) * 100),
      });
      currentPageCards = [];
      currentHeight = 0;
    }

    currentPageCards.push(cardEstimate);
    currentHeight += cardEstimate.estimatedHeightPx + gapPx;

    if (cardEstimate.forceBreakAfter) {
      const remaining = Math.max(0, availablePageHeightPx - currentHeight);
      pages.push({
        pageNumber: pages.length + 1,
        cards: currentPageCards,
        usedHeightPx: currentHeight,
        remainingHeightPx: remaining,
        whiteSpacePercentage: Math.round((remaining / availablePageHeightPx) * 100),
      });
      currentPageCards = [];
      currentHeight = 0;
    }
  });

  if (currentPageCards.length > 0) {
    const remaining = Math.max(0, availablePageHeightPx - currentHeight);
    pages.push({
      pageNumber: pages.length + 1,
      cards: currentPageCards,
      usedHeightPx: currentHeight,
      remainingHeightPx: remaining,
      whiteSpacePercentage: Math.round((remaining / availablePageHeightPx) * 100),
    });
  }

  const totalPages = pages.length || 1;
  const totalWhiteSpaceSum = pages.reduce((acc, p) => acc + p.whiteSpacePercentage, 0);
  const averageWhiteSpacePercentage = Math.round(totalWhiteSpaceSum / totalPages);
  const efficiencyScorePercentage = Math.max(0, Math.min(100, 100 - averageWhiteSpacePercentage));

  const hasLargeGaps = pages.some((p) => p.whiteSpacePercentage > 35);

  const recommendations: string[] = [];
  if (hasLargeGaps) {
    recommendations.push("توجد مساحات بيضاء زائدة في بعض الصفحات. يُنصح بتطبيق تحسين التوزيع أو إضافة فواصل صفحات يدوية.");
  } else {
    recommendations.push("التوزيع الحالي لبطاقات الدرس ممتاز ومتزن على صفحات A4.");
  }

  pages.forEach((p) => {
    if (p.whiteSpacePercentage > 40 && p.cards.length < 3) {
      recommendations.push(`الصفحة رقم ${p.pageNumber} تحتوي على مساحة غير مستغلة قدرها ${p.whiteSpacePercentage}%.`);
    }
  });

  return {
    totalPages,
    availablePageHeightPx,
    pageDistribution: pages,
    averageWhiteSpacePercentage,
    efficiencyScorePercentage,
    hasLargeGaps,
    recommendations,
  };
}

/**
 * Automatically applies optimal forceBreakAfter markers to cards that end naturally near the page boundary or before orphan headers.
 */
export function optimizeCardPageBreaks(
  cards: any[],
  templateSettings?: any
): { optimizedCards: any[]; breaksAddedCount: number; breaksRemovedCount: number; report: PageLayoutReport } {
  // First, analyze layout without existing automatic forceBreakAfter
  const cleanedCards = cards.map((c) => ({
    ...c,
    forceBreakAfter: c.type === "page-break" ? true : false,
  }));

  const report = analyzePageLayout(cleanedCards, templateSettings);
  let breaksAddedCount = 0;
  let breaksRemovedCount = 0;

  const cardBreakMap = new Set<string>();

  report.pageDistribution.forEach((page, pageIdx) => {
    // Skip last page as break is not needed after the final item of lesson
    if (pageIdx === report.pageDistribution.length - 1) return;

    if (page.cards.length > 0) {
      const lastCardEstimate = page.cards[page.cards.length - 1];
      const lastCardOriginal = cards.find((c) => c.id === lastCardEstimate.id);

      // Check if last card is an orphan section header (title, objectives header, etc.)
      const isHeaderCard =
        lastCardEstimate.type === "title" ||
        lastCardEstimate.type === "objectives" ||
        lastCardEstimate.id.includes("header") ||
        lastCardEstimate.title.includes("عنوان") ||
        lastCardEstimate.title.includes("الأهداف");

      if (isHeaderCard && page.cards.length > 1) {
        // Move break to previous card so header moves to top of next page
        const cardBeforeHeader = page.cards[page.cards.length - 2];
        if (cardBeforeHeader && cardBeforeHeader.type !== "page-break") {
          cardBreakMap.add(cardBeforeHeader.id);
        }
      } else if (lastCardEstimate && lastCardEstimate.type !== "page-break") {
        // Add break to last card on page if fill rate is good or page has moderate content
        if (page.whiteSpacePercentage < 50 || page.cards.length >= 2) {
          cardBreakMap.add(lastCardEstimate.id);
        }
      }
    }
  });

  const optimizedCards = cards.map((c, index) => {
    const isLastItemInLesson = index === cards.length - 1;
    const shouldHaveBreak = cardBreakMap.has(c.id) && !isLastItemInLesson && c.type !== "page-break";

    if (shouldHaveBreak && !c.forceBreakAfter) {
      breaksAddedCount++;
      return { ...c, forceBreakAfter: true };
    } else if (!shouldHaveBreak && c.forceBreakAfter && c.type !== "page-break") {
      breaksRemovedCount++;
      return { ...c, forceBreakAfter: false };
    }
    return c;
  });

  const newReport = analyzePageLayout(optimizedCards, templateSettings);

  return {
    optimizedCards,
    breaksAddedCount,
    breaksRemovedCount,
    report: newReport,
  };
}
