import React from "react";
import { PrintTemplate } from "../types/index";
import { storage } from "../services/storage";
import { ExamHeaderTop } from "./ExamHeader";

interface A4PaperPreviewProps {
  template: PrintTemplate;
  title?: string;
  subtitle?: string;
  hierarchyText?: string;
  children: React.ReactNode;
  pageNumber?: number;
  totalPages?: number;
  className?: string;
}

export const A4PaperPreview: React.FC<A4PaperPreviewProps> = ({
  template,
  title,
  subtitle,
  hierarchyText,
  children,
  pageNumber = 1,
  totalPages = 1,
  className = "",
}) => {
  const isLandscape = template.orientation === "landscape";
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

  return (
    <div
      className={`a4-print-sheet bg-white text-slate-900 shadow-xl border border-slate-200 mx-auto transition-all relative flex flex-col print:shadow-none print:border-none print:m-0 print:w-full ${
        isLandscape
          ? "w-[297mm] h-[210mm] max-h-[210mm] overflow-hidden print:h-auto print:max-h-none print:overflow-visible max-w-full"
          : "w-[210mm] h-[297mm] max-h-[297mm] overflow-hidden print:h-auto print:max-h-none print:overflow-visible max-w-full"
      } ${className}`}
      style={{
        paddingTop: `${top}cm`,
        paddingBottom: `${bottom}cm`,
        paddingLeft: `${left}cm`,
        paddingRight: `${right}cm`,
        direction: "rtl",
        fontFamily: typography.fontFamily,
        fontSize: `${typography.baseFontSize}pt`,
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

      {(() => {
        const isExam = template.type === "exam";
        return (
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
        );
      })()}

      <main className="flex-1 space-y-4 relative z-10" dir="auto" style={{ unicodeBidi: "isolate" }}>{children}</main>

      <footer
        className={`mt-auto pt-4 border-t-2 border-slate-900 flex items-end justify-between font-medium tracking-wide relative z-10 ${hideHeaderFooter ? "opacity-0 h-0 overflow-hidden mt-0 pt-0 border-0" : ""}`}
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
                  fontSize: template.footerContent.pageNumberSettings?.fontSize
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
                  fontSize: template.footerContent.pageNumberSettings?.fontSize
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
              template.footerContent.pageNumberSettings?.align === "left") && (
              <div
                style={{
                  fontFamily:
                    template.footerContent.pageNumberSettings?.fontFamily ||
                    typography.fontFamily,
                  fontSize: template.footerContent.pageNumberSettings?.fontSize
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
