import React, { useState } from "react";
import { RichTextEditor } from "../../editor/components/RichTextEditor";
import { FileSpreadsheet, CheckCircle2, Layout, Settings } from "lucide-react";
import { ExamTemplate } from "../../../types/index";

interface ExamTemplateEngineViewProps {
  examTemplates: ExamTemplate[];
  onSaveExamTemplate: (tmpl: ExamTemplate) => void;
}

export const ExamTemplateEngineView: React.FC<ExamTemplateEngineViewProps> = ({
  examTemplates,
  onSaveExamTemplate,
}) => {
  const [template, setTemplate] = useState<any>(
    examTemplates[0] || {
      id: "tmpl-official",
      name: "القالب الوزاري الرسمي للاختبارات",
      showHeaderLogo: true,
      showStudentDataBox: true,
      showGradesTable: true,
      showInstructionsBox: true,
      instructions: [
        "الرجاء كتابة الاسم بالكامل في الخانة المخصصة.",
        "الإجابة بقلم جاف أزرق وتجنب الشطب المعيب.",
        "زمن الامتحان محدد ولن يُسمح بالتأخير.",
      ],
      customCSS: "",
    },
  );

  const handleSave = () => {
    onSaveExamTemplate(template);
    alert("تم تحديث وحفظ تصميم القالب الامتحاني بنجاح!");
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div>
          <h1 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-blue-600" />
            <span>محرك القوالب الامتحانية ومربع بيانات الطالب والتفنيط</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            التحكم بهيكلية صندوق الطالب، جدول رصد الدرجات (التفنيط)، وصندوق
            التعليمات العامة للورقة الامتحانية.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition flex items-center gap-2 shrink-0"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>اعتماد القالب الامتحاني</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-xs">
        {/* Editor Controls (6 cols) */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
          <h2 className="text-sm font-extrabold text-slate-900 dark:text-white border-b pb-2">
            مكوّنات ورقة الأسئلة المخصّصة
          </h2>

          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer font-bold">
              <input
                type="checkbox"
                checked={template.showHeaderLogo}
                onChange={(e) =>
                  setTemplate({ ...template, showHeaderLogo: e.target.checked })
                }
                className="rounded text-blue-600"
              />
              <span>إظهار شعار المؤسسة في منتصف الترويسة</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer font-bold">
              <input
                type="checkbox"
                checked={template.showStudentDataBox}
                onChange={(e) =>
                  setTemplate({
                    ...template,
                    showStudentDataBox: e.target.checked,
                  })
                }
                className="rounded text-blue-600"
              />
              <span>إظهار مربع بيانات الطالب والشعبة</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer font-bold">
              <input
                type="checkbox"
                checked={template.showGradesTable}
                onChange={(e) =>
                  setTemplate({
                    ...template,
                    showGradesTable: e.target.checked,
                  })
                }
                className="rounded text-blue-600"
              />
              <span>إظهار جدول تفنيط ورصد درجات الأسئلة للمعلم والمصحح</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer font-bold">
              <input
                type="checkbox"
                checked={template.showInstructionsBox}
                onChange={(e) =>
                  setTemplate({
                    ...template,
                    showInstructionsBox: e.target.checked,
                  })
                }
                className="rounded text-blue-600"
              />
              <span>إظهار صندوق التعليمات والإرشادات العامة</span>
            </label>
          </div>

          <div>
            <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
              نص التعليمات والإرشادات (كل سطر تعليمية)
            </label>
            <div className="w-full rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-800 bg-white min-h-[120px] overflow-hidden">
              <RichTextEditor
                value={template.instructions?.join("\n") || ""}
                onChange={(newVal) =>
                  setTemplate({
                    ...template,
                    instructions: [newVal], // Store HTML as the first element since it handles formatting internally now
                  })
                }
              />
            </div>
          </div>
        </div>

        {/* Live Preview (6 cols) */}
        <div className="lg:col-span-6 bg-slate-100 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
          <h3 className="font-bold text-slate-800 dark:text-slate-200">
            معاينة مربع الترويسة والتفنيط للورقة الامتحانية:
          </h3>

          <div className="bg-white text-slate-900 p-4 rounded border shadow-sm space-y-3 font-sans">
            {template.showStudentDataBox && (
              <div className="border-2 border-slate-900 p-2.5 rounded text-[12pt] student-info-box">
                <div className="flex justify-between items-center font-bold text-[12pt] w-full gap-x-6 gap-y-2 flex-wrap">
                  <div className="flex items-center gap-1.5 flex-1 min-w-[200px]">
                    <span className="shrink-0 text-[12pt]">اسم الطالب:</span>
                    <span className="border-b-2 border-dotted border-slate-700 flex-1 min-w-[120px] h-3 inline-block"></span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="shrink-0 text-[12pt]">الزمن المحدد:</span>
                    <span className="border-b-2 border-dotted border-slate-700 px-2 h-5 flex items-center justify-center min-w-[60px] text-slate-900">
                      ....... دقيقة
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="shrink-0 text-[12pt]">الدرجة الكلية:</span>
                    <span className="border-b-2 border-dotted border-slate-700 px-2 h-5 flex items-center justify-center min-w-[60px] text-slate-900 font-extrabold">
                      ....... درجة
                    </span>
                  </div>
                </div>
              </div>
            )}

            {template.showGradesTable && (
              <div className="border border-slate-400 rounded overflow-hidden text-[10px]">
                <table className="w-full text-center border-collapse">
                  <thead className="bg-slate-200 font-bold">
                    <tr>
                      <th className="border p-1">السؤال</th>
                      <th className="border p-1">س1</th>
                      <th className="border p-1">س2</th>
                      <th className="border p-1">س3</th>
                      <th className="border p-1">س4</th>
                      <th className="border p-1">المجموع (رقماً)</th>
                      <th className="border p-1">المجموع (كتابةً)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border p-1 font-semibold">
                        الدرجة المستحقة
                      </td>
                      <td className="border p-1"></td>
                      <td className="border p-1"></td>
                      <td className="border p-1"></td>
                      <td className="border p-1"></td>
                      <td className="border p-1 font-bold">/ 100</td>
                      <td className="border p-1 font-bold"></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {template.showInstructionsBox && (
              <div className="p-2 bg-amber-50 border border-amber-300 rounded text-[10px] space-y-0.5 text-amber-900">
                <div className="font-bold">ملاحظات وتعليمات هامة للطالب:</div>
                {template.instructions?.map((ins, i) => (
                  <div key={i}>• {ins}</div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
