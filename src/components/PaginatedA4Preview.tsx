import React, { useState, useEffect, useRef } from "react";
import { PrintTemplate } from "../types/index";
import { storage } from "../services/storage";
import { ExamHeaderTop } from "./ExamHeader";

interface PaginatedA4PreviewProps {
  template: PrintTemplate;
  title?: string;
  subtitle?: string;
  hierarchyText?: string;
  items: { id: string; content: React.ReactNode }[];
  className?: string;
  onPagesChange?: (pagesCount: number) => void;
  currentPageIndex?: number;
  viewMode?: 'single' | 'double';
  overrideOrientation?: 'portrait' | 'landscape';
}

export const PaginatedA4Preview: React.FC<PaginatedA4PreviewProps> = ({
  template,
  title,
  subtitle,
  hierarchyText,
  items,
  className = "",
  onPagesChange,
  currentPageIndex,
  viewMode = 'single',
  overrideOrientation,
}) => {
  const isLandscape = overrideOrientation ? overrideOrientation === "landscape" : template.orientation === "landscape";
  const {
    top = 2.5,
    bottom = 2.5,
    left = 2.0,
    right = 2.5,
  } = template.marginsCm || {};

  const typography = template.typography || {
    fontFamily: "Cairo",
    baseFontSize: 12,
    headingSize: 22,
  };

  const watermark = template.watermark || {
    enabled: false,
    type: "text",
    text: "",
    opacity: 0.1,
    orientation: "diagonal",
  };

  const [pages, setPages] = useState<
    { id: string; content: React.ReactNode }[][]
  >([items]);
  const [measuring, setMeasuring] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMeasuring(true);
    setPages([items]);
  }, [items, template, isLandscape, top, bottom]);

  useEffect(() => {
    if (!measuring || !containerRef.current) return;

    let isSubscribed = true;

    const raf = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

    const getChildHeight = (child: HTMLElement) => {
      const rect = child.getBoundingClientRect();
      return Math.ceil(Math.max(child.offsetHeight, child.scrollHeight, rect.height));
    };

    const waitForPreviewLayoutSettled = async (container: HTMLElement) => {
      if (document.fonts?.ready) {
        try {
          await Promise.race([
            document.fonts.ready,
            new Promise((resolve) => setTimeout(resolve, 1200)),
          ]);
        } catch {
          // Continue with the best available browser metrics.
        }
      }

      const images = Array.from(container.querySelectorAll<HTMLImageElement>("img"));
      await Promise.allSettled(
        images.map((img) => {
          if (img.complete) return Promise.resolve();
          return new Promise<void>((resolve) => {
            const done = () => resolve();
            img.addEventListener("load", done, { once: true });
            img.addEventListener("error", done, { once: true });
            setTimeout(done, 1200);
          });
        })
      );

      container
        .querySelectorAll<HTMLElement>(
          ".katex, .katex-display, .katex-html, tiptap-math, [data-type='equation'], .math-display, .math-inline, math, svg"
        )
        .forEach((el) => {
          void el.offsetHeight;
          void el.offsetWidth;
        });

      let previousSignature = "";
      for (let i = 0; i < 5; i++) {
        await raf();
        await raf();
        await new Promise((resolve) => setTimeout(resolve, 80));
        const nextSignature = Array.from(container.children)
          .map((child) => {
            const htmlChild = child as HTMLElement;
            return `${getChildHeight(htmlChild)}:${htmlChild.textContent?.length || 0}`;
          })
          .join("|");
        if (nextSignature && nextSignature === previousSignature) break;
        previousSignature = nextSignature;
      }
    };

    const runMeasurement = async () => {
      if (!containerRef.current || !isSubscribed) return;

      const measuringContainer = containerRef.current;
      await waitForPreviewLayoutSettled(measuringContainer);
      if (!isSubscribed) return;

      const pageHeightPx = isLandscape ? 210 * 3.779527559 : 297 * 3.779527559; // 1122.52px
      
      const topNum = parseFloat(String(top)) || 2.5;
      const bottomNum = parseFloat(String(bottom)) || 2.5;
      const marginsPx = (topNum + bottomNum) * 37.79527559;
      
      const gapPx = typography.cardSpacing !== undefined 
        ? typography.cardSpacing 
        : (typography.questionSpacing !== undefined ? typography.questionSpacing : 16);

      const parentSheet = measuringContainer.closest(".a4-print-sheet");
      const headerEl = parentSheet?.querySelector("header");
      const footerEl = parentSheet?.querySelector("footer");

      const measuredHeaderHeight = (headerEl && headerEl.offsetHeight > 10) ? (headerEl.offsetHeight + 12) : 0;
      const measuredFooterHeight = (footerEl && footerEl.offsetHeight > 10) ? (footerEl.offsetHeight + 10) : 0;

      const children = Array.from(
        measuringContainer.children,
      ) as HTMLElement[];

      let currentPages: (typeof items)[] = [];
      let currentPage: typeof items = [];
      let currentHeight = 0;

      children.forEach((child, index) => {
        let itemHeight = getChildHeight(child);
        const currentItem = items[index] as any;
        
        // Manual Page Break control flags
        const isForceBreakBefore = currentItem?.forceBreakBefore || child.hasAttribute("data-force-break-before");
        const isForceBreakAfter = currentItem?.forceBreakAfter || currentItem?.id?.includes("page-break") || child.hasAttribute("data-force-break-after");

        // If forceBreakBefore is requested and we already have items on the current page
        if (isForceBreakBefore && currentPage.length > 0) {
          currentPages.push(currentPage);
          currentPage = [];
          currentHeight = 0;
        }

        // If element is unrendered or height is too small relative to text length
        const rawText = child.textContent?.trim() || "";
        if (itemHeight < 30 && rawText.length > 20) {
          itemHeight = Math.max(itemHeight, Math.ceil(rawText.length / 50) * 22 + 35);
        }

        const isFirstPage = currentPages.length === 0;
        const useDifferentFirstPage = template.headerContent.differentFirstPage;
        const hideHeaderFooter = useDifferentFirstPage && isFirstPage;
        const headerFooterPx = hideHeaderFooter ? 0 : (measuredHeaderHeight + measuredFooterHeight);

        // Safety buffer (24px) ensures content never pushes footer into bottom overflow clipping zone
        const safetyBufferPx = 24;
        const pageAvailableHeight = Math.max(
          300,
          pageHeightPx - marginsPx - headerFooterPx - safetyBufferPx
        );

        // Only standalone section headers or title cards enforce orphan protection
        const isHeader = items[index]?.id?.endsWith("-header") || items[index]?.id?.includes("section-header") || items[index]?.id?.startsWith("title");
        const nextChild = children[index + 1];
        let nextItemHeight = nextChild ? getChildHeight(nextChild) + gapPx : 0;
        const nextRawText = nextChild?.textContent?.trim() || "";
        if (nextChild && nextItemHeight < 30 && nextRawText.length > 20) {
          nextItemHeight = Math.max(nextItemHeight, Math.ceil(nextRawText.length / 50) * 22 + 35);
        }

        // Only enforce fitting next child if nextChild is reasonable height (< 50% of page)
        const needsToFitNext = isHeader && nextChild && nextItemHeight < (pageAvailableHeight * 0.5);
        const spaceNeeded = itemHeight + (needsToFitNext ? nextItemHeight : 0);

        if (
          currentHeight + spaceNeeded > pageAvailableHeight &&
          currentPage.length > 0
        ) {
          // Check if current page ends with an orphan header/title
          const lastItem = currentPage[currentPage.length - 1] as any;
          const isLastHeader = lastItem?.id?.endsWith("-header") || lastItem?.id?.includes("section-header") || lastItem?.id?.startsWith("title");

          if (currentPage.length === 1 && isLastHeader) {
            // Header is the only item on currentPage. Keep header on currentPage and append currentItem directly.
            currentHeight = (children[index - 1]?.offsetHeight || 40) + gapPx;
          } else if (currentPage.length > 1 && isLastHeader) {
            // Header is at bottom of filled page. Pop header so previous page finishes cleanly, and move header to top of new page with currentItem.
            const poppedHeader = currentPage.pop()!;
            currentPages.push(currentPage);
            currentPage = [poppedHeader];
            currentHeight = (children[index - 1]?.offsetHeight || 40) + gapPx;
          } else {
            currentPages.push(currentPage);
            currentPage = [];
            currentHeight = 0;
          }
        }

        currentPage.push(items[index]);
        currentHeight += itemHeight + gapPx;

        // If forceBreakAfter is requested, break page immediately after adding this item
        if (isForceBreakAfter && currentPage.length > 0) {
          currentPages.push(currentPage);
          currentPage = [];
          currentHeight = 0;
        }
      });

      if (currentPage.length > 0) {
        currentPages.push(currentPage);
      }

      const validPages = currentPages.filter((p) => p && p.length > 0);
      const newPages = validPages.length > 0 ? validPages : [items];
      
      setPages((prevPages) => {
        // Very basic equality check for length to avoid infinite re-renders
        if (prevPages.length === newPages.length && prevPages.length > 0) {
          const isSame = prevPages.every((page, idx) => page.length === newPages[idx].length);
          if (isSame) return prevPages;
        }
        return newPages;
      });

      if (onPagesChange) onPagesChange(newPages.length);
      if (isSubscribed) setMeasuring(false);
    };

    const timer1 = setTimeout(() => void runMeasurement(), 120);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && containerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        if (isSubscribed) void runMeasurement();
      });
      resizeObserver.observe(containerRef.current);
    }

    if (document.fonts) {
      document.fonts.ready.then(() => {
        if (isSubscribed) void runMeasurement();
      });
    }

    const images = containerRef.current.querySelectorAll("img");
    images.forEach((img) => {
      if (!img.complete) {
        img.addEventListener("load", () => void runMeasurement(), { once: true });
      }
    });

    return () => {
      isSubscribed = false;
      clearTimeout(timer1);
      resizeObserver?.disconnect();
    };
  }, [measuring, items, isLandscape, top, bottom, title, template]);

  const PageWrapper = ({ children, pageNumber, totalPages, className: additionalClass, isMeasuring: wrapperIsMeasuring }: any) => {
    const isFirstPage = pageNumber === 1;
    const useDifferentFirstPage = template.headerContent.differentFirstPage;
    const hideHeaderFooter = useDifferentFirstPage && isFirstPage;

    const settings = storage.getSettings();
    const academyName = settings.academyName || "المثنى لطلاب الهندسة";

    const rightText =
      template.headerContent.rightText ||
      template.headerContent.subjectName ||
      "";
    const centerText =
      template.headerContent.centerText ||
      (hierarchyText ? hierarchyText.split("\n")[0] : "");
    const leftText = template.headerContent.leftText || title || "";

    const footerText =
      template.footerContent.copyrightNotice ||
      "جميع الحقوق محفوظة - نظام إديوتيك لإدارة المناهج © 2026";

    const isExam = template.type === "exam" || items.some(i => i.id === "header-title" || i.id.startsWith("section-"));

    return (
      <div
        className={`a4-print-sheet bg-white text-slate-900 shadow-xl border border-slate-200 mx-auto transition-all relative flex flex-col print:shadow-none print:border-none print:m-0 print:w-full mb-8 print:mb-0 ${
          wrapperIsMeasuring
            ? isLandscape ? "w-[297mm] min-h-[210mm] max-w-full" : "w-[210mm] min-h-[297mm] max-w-full"
            : isLandscape
              ? "w-[297mm] min-h-[210mm] overflow-visible print:h-auto print:max-h-none print:overflow-visible max-w-full"
              : "w-[210mm] min-h-[297mm] overflow-visible print:h-auto print:max-h-none print:overflow-visible max-w-full"
        } ${className} ${additionalClass || ''}`}
        style={{
          paddingTop: `${top}cm`,
          paddingBottom: `${bottom}cm`,
          paddingLeft: `${left}cm`,
          paddingRight: `${right}cm`,
          direction: "rtl",
          fontFamily: typography.fontFamily,
          fontSize: `${typography.baseFontSize}pt`,
          lineHeight: typography.lineHeight ? typography.lineHeight : (typography.lineSpacing ? `${typography.lineSpacing + 18}px` : (typography.cardDisplayMode === 'compact' ? 1.35 : typography.cardDisplayMode === 'textbook' ? 1.65 : 1.55)),
          pageBreakAfter: "always",
          breakAfter: "page",
          ...({
          } as React.CSSProperties)
        }}
      >
        {watermark.enabled && watermark.text && (
          <div
            className={`absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden ${watermark.layer === "above" ? "z-50" : "z-0"}`}
            style={{ opacity: watermark.opacity }}
          >
            <div
              className="font-bold"
              style={{
                color: watermark.color || "#64748b",
                fontFamily: watermark.fontFamily || typography.fontFamily,
                fontSize: watermark.fontSize
                  ? watermark.fontSize + "px"
                  : isLandscape
                    ? "120px"
                    : "100px",
                transform:
                  watermark.orientation === "diagonal"
                    ? "rotate(-45deg)"
                    : "none",
                userSelect: "none",
                whiteSpace: watermark.fitToPage ? "pre-wrap" : "nowrap",
                textAlign: "center",
                width: watermark.fitToPage
                  ? watermark.orientation === "diagonal"
                    ? "140%"
                    : "100%"
                  : "auto",
                maxWidth: watermark.fitToPage
                  ? watermark.orientation === "diagonal"
                    ? "140%"
                    : "100%"
                  : "none",
                wordBreak: watermark.fitToPage ? "break-word" : "normal",
                lineHeight: "1.2",
              }}
            >
              {watermark.text}
            </div>
          </div>
        )}

        {template.sideText?.right?.text && (
          <div
            className="absolute top-0 bottom-0 pointer-events-none flex flex-col"
            style={{
              right: template.sideText.right.margin || "0.5cm",
              justifyContent:
                template.sideText.right.align === "start"
                  ? "flex-start"
                  : template.sideText.right.align === "end"
                    ? "flex-end"
                    : "center",
              alignItems: "center",
              width: 0,
              zIndex: 10,
            }}
          >
            <div
              className="whitespace-nowrap"
              style={{
                transform: template.sideText.right.direction === "bottom-to-top" ? "rotate(-90deg)" : "rotate(90deg)",
                color: template.sideText.right.color || "#000000",
                fontFamily: template.sideText.right.fontFamily || typography.fontFamily || "inherit",
                fontSize: template.sideText.right.fontSize ? (!isNaN(Number(template.sideText.right.fontSize)) ? `${template.sideText.right.fontSize}pt` : template.sideText.right.fontSize) : '12pt',
                ...({
                  "--sidetext-font": template.sideText.right.fontFamily || typography.fontFamily || "inherit",
                  "--sidetext-size": template.sideText.right.fontSize ? (!isNaN(Number(template.sideText.right.fontSize)) ? `${template.sideText.right.fontSize}pt` : template.sideText.right.fontSize) : '12pt',
                } as React.CSSProperties)
              }}
            >
              {template.sideText.right.text}
            </div>
          </div>
        )}
        {template.sideText?.left?.text && (
          <div
            className="absolute top-0 bottom-0 pointer-events-none flex flex-col"
            style={{
              left: template.sideText.left.margin || "0.5cm",
              justifyContent:
                template.sideText.left.align === "start"
                  ? "flex-start"
                  : template.sideText.left.align === "end"
                    ? "flex-end"
                    : "center",
              alignItems: "center",
              width: 0,
              zIndex: 10,
            }}
          >
            <div
              className="whitespace-nowrap"
              style={{
                transform: template.sideText.left.direction === "bottom-to-top" ? "rotate(-90deg)" : "rotate(90deg)",
                color: template.sideText.left.color || "#000000",
                fontFamily: template.sideText.left.fontFamily || typography.fontFamily || "inherit",
                fontSize: template.sideText.left.fontSize ? (!isNaN(Number(template.sideText.left.fontSize)) ? `${template.sideText.left.fontSize}pt` : template.sideText.left.fontSize) : '12pt',
                ...({
                  "--sidetext-font": template.sideText.left.fontFamily || typography.fontFamily || "inherit",
                  "--sidetext-size": template.sideText.left.fontSize ? (!isNaN(Number(template.sideText.left.fontSize)) ? `${template.sideText.left.fontSize}pt` : template.sideText.left.fontSize) : '12pt',
                } as React.CSSProperties)
              }}
            >
              {template.sideText.left.text}
            </div>
          </div>
        )}

        <header
          className={`print-document-header ${isExam ? "exam-mode-header pb-1 mb-1.5 border-b border-slate-700" : "border-b-2 border-slate-900 pb-3 mb-6"} flex items-start justify-between relative z-10 ${hideHeaderFooter ? "opacity-0 h-0 overflow-hidden mb-0 pb-0 border-0" : ""}`}
          style={{ marginTop: hideHeaderFooter ? 0 : "auto" }}
        >
          {isExam ? (
            <ExamHeaderTop
              template={template}
              approvedModelText={template.headerContent?.rightText || "نموذج اختبار معتمد"}
              educationalLevel={template.headerContent?.centerText || "الثالث الثانوي المهني"}
              materialsText={template.headerContent?.leftText || "رياضيات فيزياء كيمياء رسم صناعي رسم حاسوب"}
              institutionName={
                template.headerContent?.schoolName &&
                !template.headerContent.schoolName.includes("وزارة التربية والتعليم") &&
                !template.headerContent.schoolName.includes("الإدارة العامة للامتحانات")
                  ? template.headerContent.schoolName
                  : academyName
              }
              logoUrl={template.headerContent?.logoUrl || settings.logoUrl}
              examDate={template.headerContent?.showGregorianDate !== false ? "28 يناير 2026 م" : ""}
            />
          ) : (
            <>
              <div className="flex flex-col items-start justify-start text-right flex-1">
                {rightText && (
                  <h2
                    className="font-bold text-slate-900 leading-relaxed"
                    style={{
                      fontSize: `${typography.headingSize || typography.baseFontSize + 6}pt`,
                    }}
                  >
                    {rightText}
                  </h2>
                )}
                {centerText && (
                  <h3
                    className="font-bold text-slate-800 leading-relaxed mt-1"
                    style={{
                      fontSize: `${Math.max(12, (typography.headingSize || typography.baseFontSize + 6) - 2)}pt`,
                    }}
                  >
                    {centerText}
                  </h3>
                )}
                {leftText && (
                  <h4
                    className="font-medium text-slate-700 leading-relaxed mt-1"
                    style={{ fontSize: `${typography.baseFontSize}pt` }}
                  >
                    {leftText}
                  </h4>
                )}
              </div>

              {template.headerContent.centerLogo && (
                <div className="flex flex-col items-center justify-center shrink-0 mx-4">
                  <div className="h-14 px-4 rounded-xl bg-slate-100 border-2 border-slate-800 text-slate-900 flex items-center justify-center font-extrabold text-[12px] shadow-sm">
                    {template.headerContent.logoUrl ? (
                      <img
                        src={template.headerContent.logoUrl}
                        className="h-10 w-10 object-contain"
                      />
                    ) : (
                      academyName
                    )}
                  </div>
                </div>
              )}

              <div className="flex flex-col items-end text-left gap-1 shrink-0 flex-1">
                {!template.headerContent.centerLogo &&
                  (template.headerContent.logoUrl ? (
                    <img
                      src={template.headerContent.logoUrl}
                      alt="Logo"
                      className="h-9 w-9 object-contain"
                    />
                  ) : (
                    <div className="h-9 px-3 rounded bg-slate-900 text-white flex items-center justify-center font-bold text-[10px]">
                      {academyName}
                    </div>
                  ))}
                {template.headerContent.showGregorianDate !== false && (
                  <div className="text-[10px] text-slate-500 font-medium">
                    28 يناير 2026 م
                  </div>
                )}
              </div>
            </>
          )}
        </header>

        <main 
          className="flex-1 flex flex-col relative z-10"
          dir="auto"
          style={{
            gap: isExam ? '2px' : `${typography.cardSpacing !== undefined ? typography.cardSpacing : (typography.questionSpacing !== undefined ? typography.questionSpacing : 16)}px`,
          }}
        >
          {children}
          {template.footerContent?.showEndOfQuestionsMarker && pageNumber === totalPages && (
            <div 
              className="text-center font-extrabold text-[14pt] text-slate-800"
              dir="auto"
              style={{
                marginTop: `${typography.questionSpacing !== undefined ? typography.questionSpacing : 16}px`,
                
              }}
            >
              انتهت الأسئلة
            </div>
          )}
        </main>

        <footer
          className={`mt-auto pt-3 pb-1.5 border-t-2 border-slate-900 flex items-end justify-between font-medium tracking-wide relative z-10 ${hideHeaderFooter ? "opacity-0 h-0 overflow-hidden mt-0 pt-0 pb-0 border-0" : ""}`}
          style={{ fontSize: `${Math.max(10, typography.baseFontSize - 4)}pt` }}
        >
          <div className="w-1/3 text-right text-slate-500 shrink-0">
            {template.footerContent.showPageNumber !== false &&
              template.footerContent.pageNumberSettings?.align === "right" && (
                <div
                  style={{
                    fontFamily:
                      template.footerContent.pageNumberSettings?.fontFamily ||
                      typography.fontFamily,
                    fontSize: template.footerContent.pageNumberSettings
                      ?.fontSize
                      ? `${template.footerContent.pageNumberSettings.fontSize}px`
                      : "inherit",
                    color:
                      template.footerContent.pageNumberSettings?.color ||
                      "inherit",
                    fontWeight: template.footerContent.pageNumberSettings?.bold
                      ? "bold"
                      : "normal",
                  }}
                >
                  صفحة {pageNumber} من {totalPages}
                </div>
              )}
          </div>
          <div className="flex-1 text-center whitespace-nowrap overflow-hidden text-ellipsis leading-relaxed px-2 text-slate-600">
            {footerText}
            {template.footerContent.showPageNumber !== false &&
              template.footerContent.pageNumberSettings?.align === "center" && (
                <div
                  className="mt-1"
                  style={{
                    fontFamily:
                      template.footerContent.pageNumberSettings?.fontFamily ||
                      typography.fontFamily,
                    fontSize: template.footerContent.pageNumberSettings
                      ?.fontSize
                      ? `${template.footerContent.pageNumberSettings.fontSize}px`
                      : "inherit",
                    color:
                      template.footerContent.pageNumberSettings?.color ||
                      "inherit",
                    fontWeight: template.footerContent.pageNumberSettings?.bold
                      ? "bold"
                      : "normal",
                  }}
                >
                  صفحة {pageNumber} من {totalPages}
                </div>
              )}
          </div>
          <div className="w-1/3 text-left shrink-0 text-slate-500">
            {template.footerContent.showPageNumber !== false &&
              (!template.footerContent.pageNumberSettings?.align ||
                template.footerContent.pageNumberSettings?.align ===
                  "left") && (
                <div
                  style={{
                    fontFamily:
                      template.footerContent.pageNumberSettings?.fontFamily ||
                      typography.fontFamily,
                    fontSize: template.footerContent.pageNumberSettings
                      ?.fontSize
                      ? `${template.footerContent.pageNumberSettings.fontSize}px`
                      : "inherit",
                    color:
                      template.footerContent.pageNumberSettings?.color ||
                      "inherit",
                    fontWeight: template.footerContent.pageNumberSettings?.bold
                      ? "bold"
                      : "normal",
                  }}
                >
                  صفحة {pageNumber} من {totalPages}
                </div>
              )}
          </div>
        </footer>
      </div>
    );
  };

  const globalStyles = (
    <style>{`
      .a4-preview-container .ProseMirror > p,
      .a4-preview-container .ProseMirror > ul,
      .a4-preview-container .ProseMirror > ol,
      .a4-preview-container .ProseMirror > table,
      .a4-preview-container .ProseMirror > img,
      .a4-preview-container .ProseMirror > .math-display,
      .a4-preview-container .math-text-container > p,
      .a4-preview-container .math-text-container > ul,
      .a4-preview-container .math-text-container > ol,
      .a4-preview-container .math-text-container > table,
      .a4-preview-container .math-text-container > img,
      .a4-preview-container .math-text-container > .math-display,
      .a4-preview-container main p,
      .a4-preview-container main ul,
      .a4-preview-container main ol,
      .a4-preview-container main table,
      .a4-preview-container main img {
        margin-bottom: ${typography.elementSpacing !== undefined ? typography.elementSpacing : 8}px !important;
      }
      .a4-preview-container .ProseMirror > *:last-child,
      .a4-preview-container .math-text-container > *:last-child,
      .a4-preview-container main section > *:last-child {
        margin-bottom: 0 !important;
      }
    `}</style>
  );

  return (
    <>
      {globalStyles}
      {/* Hidden measurement stage */}
      {measuring && (
        <div 
          data-measuring="true"
          className="opacity-0 pointer-events-none absolute left-[-9999px] top-[-9999px] a4-preview-container"
          style={{
            width: isLandscape ? "297mm" : "210mm",
          }}
        >
          <PageWrapper pageNumber={1} totalPages={1} isMeasuring={true}>
            <div 
              ref={containerRef} 
              className="flex flex-col"
              style={{
                gap: `${typography.cardSpacing !== undefined ? typography.cardSpacing : (typography.questionSpacing !== undefined ? typography.questionSpacing : 16)}px`
              }}
            >
              {items.map((item) => (
                <div key={item.id} data-preview-item-id={item.id} dir="auto" className="h-auto min-h-0 shrink-0 block">{item.content}</div>
              ))}
            </div>
          </PageWrapper>
        </div>
      )}

      {/* Rendered active document pages */}
      <div className={`a4-preview-container ${viewMode === 'double' ? 'flex flex-row flex-wrap justify-center gap-6 space-y-0' : 'space-y-8 print:space-y-0 print:block'}`}>
        {pages.map((pageItems, pageIdx) => {
          const isVisibleOnScreen = (() => {
            if (currentPageIndex === undefined) return true;
            if (viewMode === 'double') {
              const startIdx = currentPageIndex % 2 === 0 ? currentPageIndex : currentPageIndex - 1;
              return pageIdx >= startIdx && pageIdx <= startIdx + 1;
            }
            return currentPageIndex === pageIdx;
          })();

          return (
            <div
              key={pageIdx}
              data-preview-page={pageIdx + 1}
              className={!isVisibleOnScreen ? "hidden print:block" : "block"}
              style={!isVisibleOnScreen ? { display: "none" } : undefined}
            >
              <PageWrapper
                pageNumber={pageIdx + 1}
                totalPages={pages.length}
              >
                {pageItems.map((item) => (
                  <div key={item.id} data-preview-item-id={item.id} dir="auto" className="h-auto min-h-0 shrink-0 block">{item.content}</div>
                ))}
              </PageWrapper>
            </div>
          );
        })}
      </div>
    </>
  );
};
