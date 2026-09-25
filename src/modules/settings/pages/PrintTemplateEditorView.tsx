import React, { useState } from "react";
import { storage } from "../../../services/storage";
import { Printer, Save, CheckCircle2, Layout, Settings } from "lucide-react";
import { PrintTemplate } from "../../../types/index";
import { A4PaperPreview } from "../../../components/A4PaperPreview";

interface PrintTemplateEditorViewProps {
  printTemplates: PrintTemplate[];
  onSaveTemplate: (tmpl: PrintTemplate) => void;
}

export const PrintTemplateEditorView: React.FC<
  PrintTemplateEditorViewProps
> = ({ printTemplates, onSaveTemplate }) => {
  const ptSavedUi = React.useMemo(() => storage.getUiState("print_template_editor_ui", {
    selectedTemplateId: printTemplates[0]?.id || "tmpl-a4-def",
  }), []);

  const initialTmpl = printTemplates.find((t) => t.id === ptSavedUi.selectedTemplateId) || printTemplates[0] || {
    id: "tmpl-a4-def",
    name: "قالب A4 الهيدر والفوتر القياسي",
    type: "lesson",
    orientation: "portrait",
    marginsCm: { top: 2, bottom: 2, left: 1.5, right: 1.5 },
    headerContent: {
      schoolName: "المؤسسة التعليمية المعتمدة",
      showHijriDate: true,
      showGregorianDate: true,
      subjectName: "المادة الدراسية",
      customText: "نظام أتمتة المناهج والامتحانات",
    },
    footerContent: {
      teacherName: "إعداد قسم المناهج والتأليف",
      showPageNumber: true,
      copyrightNotice: "حقوق الطبع محفوظة © 2026",
    },
    isDefault: true,
  };

  const [selectedTemplate, setSelectedTemplate] = useState<PrintTemplate>(initialTmpl);

  React.useEffect(() => {
    storage.saveUiState("print_template_editor_ui", {
      selectedTemplateId: selectedTemplate.id,
    });
  }, [selectedTemplate.id]);

  const handleSave = () => {
    onSaveTemplate(selectedTemplate);
    alert("تم حفظ إعدادات قالب الطباعة بنجاح!");
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div>
          <h1 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Printer className="w-5 h-5 text-blue-600" />
            <span>محرر قوالب الطباعة القياسية (A4 Templates)</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            تعديل ترويسة الصفحة الرسمية، الشعار، الهوامش بالسنتيمتر، والتذييل
            لكافة المخرجات المطبوعة.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition flex items-center gap-2 shrink-0"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>حفظ قالب الطباعة</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Settings Form Controls (6 cols) */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 text-xs">
          <h2 className="text-sm font-extrabold text-slate-900 dark:text-white border-b pb-2">
            خصائص الترويسة والتذييل
          </h2>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
              اسم المؤسسة التعليمية / الأكاديمية
            </label>
            <input
              type="text"
              placeholder="يترك فارغاً لاستخدام اسم الأكاديمية / المعهد من الإعدادات العامة"
              value={selectedTemplate.headerContent.schoolName || ""}
              onChange={(e) =>
                setSelectedTemplate({
                  ...selectedTemplate,
                  headerContent: {
                    ...selectedTemplate.headerContent,
                    schoolName: e.target.value,
                  },
                })
              }
              className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
              النص التوجيهي أو الفرعي في الترويسة
            </label>
            <input
              type="text"
              value={selectedTemplate.headerContent.customText || ""}
              onChange={(e) =>
                setSelectedTemplate({
                  ...selectedTemplate,
                  headerContent: {
                    ...selectedTemplate.headerContent,
                    customText: e.target.value,
                  },
                })
              }
              className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          
          <div className="flex items-center gap-2 mt-2">
            <input
              type="checkbox"
              id="showEndOfQuestionsMarker"
              checked={selectedTemplate.footerContent.showEndOfQuestionsMarker || false}
              onChange={(e) =>
                setSelectedTemplate({
                  ...selectedTemplate,
                  footerContent: {
                    ...selectedTemplate.footerContent,
                    showEndOfQuestionsMarker: e.target.checked,
                  },
                })
              }
              className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <label
              htmlFor="showEndOfQuestionsMarker"
              className="text-slate-700 dark:text-slate-300 font-semibold"
            >
              عرض عبارة "انتهت الأسئلة" في نهاية الصفحة الأخيرة
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                اسم إعداد المدرس / القسم (التذييل)
              </label>
              <input
                type="text"
                value={selectedTemplate.footerContent.teacherName || ""}
                onChange={(e) =>
                  setSelectedTemplate({
                    ...selectedTemplate,
                    footerContent: {
                      ...selectedTemplate.footerContent,
                      teacherName: e.target.value,
                    },
                  })
                }
                className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                حقوق الملكية والنشر
              </label>
              <input
                type="text"
                value={selectedTemplate.footerContent.copyrightNotice || ""}
                onChange={(e) =>
                  setSelectedTemplate({
                    ...selectedTemplate,
                    footerContent: {
                      ...selectedTemplate.footerContent,
                      copyrightNotice: e.target.value,
                    },
                  })
                }
                className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="border-t pt-3 space-y-2">
            <h3 className="font-bold text-slate-900 dark:text-white">
              إعدادات الهوامش واتجاه الصفحة (cm)
            </h3>
            <div className="grid grid-cols-4 gap-2">
              <div>
                <label className="text-[11px] text-slate-500">العلوي</label>
                <input
                  type="number"
                  step="0.1"
                  value={selectedTemplate.marginsCm.top}
                  onChange={(e) =>
                    setSelectedTemplate({
                      ...selectedTemplate,
                      marginsCm: {
                        ...selectedTemplate.marginsCm,
                        top: Number(e.target.value),
                      },
                    })
                  }
                  className="w-full p-2 rounded border dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-500">السفلي</label>
                <input
                  type="number"
                  step="0.1"
                  value={selectedTemplate.marginsCm.bottom}
                  onChange={(e) =>
                    setSelectedTemplate({
                      ...selectedTemplate,
                      marginsCm: {
                        ...selectedTemplate.marginsCm,
                        bottom: Number(e.target.value),
                      },
                    })
                  }
                  className="w-full p-2 rounded border dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-500">الأيمن</label>
                <input
                  type="number"
                  step="0.1"
                  value={selectedTemplate.marginsCm.right}
                  onChange={(e) =>
                    setSelectedTemplate({
                      ...selectedTemplate,
                      marginsCm: {
                        ...selectedTemplate.marginsCm,
                        right: Number(e.target.value),
                      },
                    })
                  }
                  className="w-full p-2 rounded border dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-500">الأيسر</label>
                <input
                  type="number"
                  step="0.1"
                  value={selectedTemplate.marginsCm.left}
                  onChange={(e) =>
                    setSelectedTemplate({
                      ...selectedTemplate,
                      marginsCm: {
                        ...selectedTemplate.marginsCm,
                        left: Number(e.target.value),
                      },
                    })
                  }
                  className="w-full p-2 rounded border dark:bg-slate-800"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Live A4 Preview (6 cols) */}
        <div className="lg:col-span-6">
          <A4PaperPreview
            template={selectedTemplate}
            title="نموذج ورقة A4 مطبوعة"
          >
            <div className="text-xs space-y-3 leading-relaxed">
              <p>
                هذه المعاينة توضح التنسيق الدقيق للطباعة على ورقة A4. الترويسة
                والتذييل والهوامش تطابق التعيينات في اللوحة الجانبية.
              </p>
              <div className="p-3 bg-slate-100 rounded border text-[11px]">
                نص معايير الجودة والطباعة الرسمية...
              </div>
            </div>
          </A4PaperPreview>
        </div>
      </div>
    </div>
  );
};
