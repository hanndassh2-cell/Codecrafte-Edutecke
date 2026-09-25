import React, { useState } from "react";
import {
  HelpCircle,
  BookOpen,
  CheckSquare,
  MessageSquare,
  ChevronDown,
} from "lucide-react";

export const HelpSupportView: React.FC = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const faqs = [
    {
      q: "كيف يتم توليد المشتتات الذكية بالذكاء الاصطناعي؟",
      a: "عند صياغة سؤال اختيار من متعدد، يمكنك النقر على زر 'توليد بالذكاء الاصطناعي' ليقوم نموذج Gemini بتشخيص الأخطاء المفاهيمية والحسابية الشائعة وتوفير مشتتات مقنعة وموزونة.",
    },
    {
      q: "هل التطبيق يعمل أوفلاين ويحفظ البيانات محلياً؟",
      a: "نعم، النظام مصمم ليكون تطبيق محلي (Local-First)، وتُحفظ كافة البيانات والدروس وبنك الأسئلة في التخزين المحلي للكمبيوتر مع إمكانية تصدير نسخة احتياطية بصيغة JSON.",
    },
    {
      q: "كيف أضمن تطابق طباعة الامتحانات والدروس مع ورقة A4 القياسية؟",
      a: "جميع القوالب تدعم المعاينة الحية الفورية بمقاسات A4 الدقيقة (210mm x 297mm) بالهوامش التي تحددها بالسنتيمتر مع دعم خطوط وألوان مرئية.",
    },
  ];

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div>
          <h1 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-blue-600" />
            <span>دليل الاستخدام والدعم الفني لنظام إديوتيك</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            دليل إرشادي شامل لكافة الميزات، الأسئلة الشائعة، وقائمة المهام
            الفردية للمدرس.
          </p>
        </div>
      </div>

      {/* FAQs */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 text-xs">
        <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">
          الأسئلة الشائعة والإرشادات التربوية
        </h2>

        {faqs.map((faq, idx) => (
          <div
            key={idx}
            className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden"
          >
            <button
              onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
              className="w-full p-3.5 bg-slate-50 dark:bg-slate-800 text-right font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between"
            >
              <span>{faq.q}</span>
              <ChevronDown
                className={`w-4 h-4 transition ${openFaq === idx ? "rotate-180" : ""}`}
              />
            </button>
            {openFaq === idx && (
              <div className="p-3.5 text-slate-600 dark:text-slate-300 leading-relaxed bg-white dark:bg-slate-900">
                {faq.a}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
