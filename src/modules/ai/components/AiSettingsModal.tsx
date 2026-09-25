import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Settings2,
  Save,
  Loader2,
  ShieldCheck,
  Lock,
  Key,
  Wifi,
  Terminal,
} from "lucide-react";
import {
  AiSettings,
  getAISettingsList,
  saveAiSettingsList,
  testAiModelConnection,
} from "../services/aiProviderAdapter";
import { systemLog } from "../../../services/diagnosticLogger";



const HybridInput = ({ value, onChange, options, placeholder, id }: { value: string, onChange: (val: string) => void, options: {label: string, value: string}[], placeholder: string, id: string }) => {
  return (
    <div className="flex items-center gap-2">
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 text-left font-mono text-slate-900 dark:text-white"
        dir="ltr"
        placeholder={placeholder}
      />
      <div className="relative">
        <select
          onChange={(e) => {
            if (e.target.value) {
              onChange(e.target.value);
              e.target.value = "";
            }
          }}
          value=""
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          title="اختر من القائمة"
        >
          <option value="" disabled>اختر...</option>
          {options.map((opt, i) => (
            <option key={i} value={opt.value}>
              {opt.value} {opt.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="px-3 py-2.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-700 dark:text-slate-300 transition flex items-center justify-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
        </button>
      </div>
    </div>
  );
};


export const AiSettingsModal: React.FC<{ onClose: () => void }> = ({
  onClose,
}) => {
  const [modelsList, setModelsList] = useState<AiSettings[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [testStatuses, setTestStatuses] = useState<Record<number, { status: "idle" | "testing" | "success" | "error"; message?: string }>>({});

  useEffect(() => {
    try {
      systemLog("تهيئة واجهة إدارة النماذج...", "info");
      const list = getAISettingsList();
      const ensuredList = [...list];
      
      // Auto-correct provider based on URL for existing saved items
      for (let i = 0; i < ensuredList.length; i++) {
        if (ensuredList[i] && ensuredList[i].baseUrl) {
          const lowerVal = ensuredList[i].baseUrl.toLowerCase();
          if (lowerVal.includes("generativelanguage") && !lowerVal.includes("openai")) {
            ensuredList[i].provider = "google";
          } else if (lowerVal.includes("generativelanguage") && lowerVal.includes("openai")) {
            ensuredList[i].provider = "openai";
          } else if (lowerVal.includes("api.openai.com")) {
            ensuredList[i].provider = "openai";
          } else if (lowerVal.includes("api.groq.com")) {
            ensuredList[i].provider = "groq";
          } else if (lowerVal.includes("api.anthropic.com")) {
            ensuredList[i].provider = "anthropic";
          } else if (lowerVal.includes("api.deepseek.com")) {
            ensuredList[i].provider = "deepseek";
          } else if (lowerVal.includes("localhost") || lowerVal.includes("127.0.0.1") || lowerVal.includes("ngrok")) {
            ensuredList[i].provider = "ollama";
          } else {
            ensuredList[i].provider = "custom";
          }
        }
      }
      
      // Ensure we have OCR model (Index 0)
      if (!ensuredList[0]) {
        ensuredList[0] = {
          id: "default-1",
          provider: "openai",
          modelName: "gemini-2.5-flash",
          baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/",
          apiKey: "",
          temperature: 0.1,
          priority: 1,
          enabled: true,
          hasKey: false,
        };
      } else {
        // Ensure the default temperature makes sense if it was newly mapped
        if (ensuredList[0].temperature === undefined) {
           ensuredList[0].temperature = 0.1;
        }
      }
      
      // Ensure we have Solver model (Index 1)
      if (!ensuredList[1]) {
        ensuredList[1] = {
          id: "default-2",
          provider: "openai",
          modelName: "gemini-2.5-pro",
          baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/",
          apiKey: "",
          temperature: 0.7,
          priority: 2,
          enabled: true,
          hasKey: false,
        };
      } else {
        if (ensuredList[1].temperature === undefined) {
           ensuredList[1].temperature = 0.7;
        }
      }
      
      setModelsList(ensuredList);
      systemLog(`تم تحميل ${ensuredList.length} نموذج بنجاح.`, "success");
    } catch (e) {
      console.warn("Failed to load models list", e);
      systemLog("فشل تحميل النماذج.", "error");
    }
  }, []);

  const handleSaveAll = async () => {
    setIsSaving(true);
    systemLog("جاري تشفير وحفظ الإعدادات في الخزنة...", "info");
    try {
      await saveAiSettingsList(modelsList);
      systemLog("تم حفظ جميع النماذج بنجاح!", "success");
      setTimeout(() => onClose(), 800);
    } catch (e: any) {
      console.warn("Save models list error:", e);
      systemLog(`خطأ أثناء الحفظ: ${e?.message || "حدث خطأ غير معروف"}`, "error");
      setIsSaving(false);
    }
  };

  const handleChangeModel = (index: number, field: keyof AiSettings, value: any) => {
    let fieldName = field as string;
    if (field === "modelName") fieldName = "اسم النموذج";
    else if (field === "baseUrl") fieldName = "الرابط الأساسي";
    else if (field === "apiKey") fieldName = "مفتاح API";
    else if (field === "temperature") fieldName = "مؤشر التباين";
    
    systemLog(`تحديث نموذج ${index === 0 ? "استخراج النصوص" : "التحليل"}: تم تعديل [${fieldName}].`, "info");

    setModelsList((prev) => {
      const next = [...prev];
      if (next[index]) {
        next[index] = { ...next[index], [field]: value };
        if (field === "baseUrl") {

          const lowerVal = String(value).toLowerCase();
          if (lowerVal.includes("generativelanguage") && !lowerVal.includes("openai")) {
            next[index].provider = "google";
          } else if (lowerVal.includes("generativelanguage") && lowerVal.includes("openai")) {
            next[index].provider = "openai";
          } else if (lowerVal.includes("api.openai.com")) {
            next[index].provider = "openai";
          } else if (lowerVal.includes("api.groq.com")) {
            next[index].provider = "groq";
          } else if (lowerVal.includes("api.anthropic.com")) {
            next[index].provider = "anthropic";
          } else if (lowerVal.includes("api.deepseek.com")) {
            next[index].provider = "deepseek";
          } else if (lowerVal.includes("localhost") || lowerVal.includes("127.0.0.1") || lowerVal.includes("ngrok")) {
            next[index].provider = "ollama";
          } else {
            next[index].provider = "custom";
          }

        }
      }
      return next;
    });
    // Reset test status when model settings change
    setTestStatuses((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
  };

  const handleTestConnection = async (index: number) => {
    const model = modelsList[index];
    if (!model) return;

    const modelLabel = index === 0 ? "محرك استخراج النصوص" : "محرك التحليل والحل";
    systemLog(`جاري اختبار الاتصال لـ [${modelLabel}]...`, "info");
    systemLog(`المسار: ${model.baseUrl}`, "info");

    setTestStatuses(prev => ({ ...prev, [index]: { status: "testing", message: "جاري الاتصال..." } }));
    
    try {
      const isConnected = await testAiModelConnection(model);
      if (isConnected) {
        systemLog(`[${modelLabel}]: تم الاتصال بنجاح واستلام استجابة سليمة.`, "success");
        setTestStatuses(prev => ({ ...prev, [index]: { status: "success", message: "تم الاتصال بنجاح!" } }));
      } else {
        systemLog(`[${modelLabel}]: فشل الاتصال، استجابة غير متوقعة.`, "warn");
        setTestStatuses(prev => ({ ...prev, [index]: { status: "error", message: "فشل الاتصال بالخادم. يرجى التحقق من الرابط ومفتاح API." } }));
      }
    } catch (err: any) {
      let errorMessage = "فشل الاتصال: " + (err.message || "تأكد من تشغيل الخادم المحلي أو صحة مفتاح السحابة.");
      if (err.message?.includes("Failed to fetch") || err.message?.includes("fetch")) {
        errorMessage = "تعذر الوصول للخادم. يرجى التحقق من الرابط (Base URL) أو اتصال الإنترنت.";
      }
      systemLog(`[${modelLabel}]: فشل الاتصال (${errorMessage}).`, "error");
      setTestStatuses(prev => ({ ...prev, [index]: { status: "error", message: errorMessage } }));
    }
  };

  const renderModelCard = (title: string, index: number, hint: string) => {
    const model = modelsList[index];
    if (!model) return null;

    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition">
        <h4 className="text-lg font-bold text-indigo-600 dark:text-indigo-400 mb-4">{title}</h4>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              الرابط الأساسي (Base URL)
            </label>
            {/* Hybrid Input for Base URL */}
            <HybridInput
              id={`base-url-input-${index}`}
              value={model.baseUrl || ""}
              onChange={(val) => handleChangeModel(index, "baseUrl", val)}
              placeholder="اكتب الرابط الأساسي أو اختر من القائمة"
              options={[
                { value: "http://localhost:11434/v1", label: "(Ollama Local)" },
                { value: "http://localhost:1234/v1", label: "(LM Studio Local)" },
                { value: "https://generativelanguage.googleapis.com/v1beta/openai/", label: "(Google Gemini)" },
                { value: "https://api.openai.com/v1", label: "(OpenAI)" },
                { value: "https://api.groq.com/openai/v1", label: "(Groq Cloud)" }
              ]}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              اسم النموذج (Model Name)
            </label>
            {/* Hybrid Input for Model Name */}
            <HybridInput
              id={`model-name-input-${index}`}
              value={model.modelName || ""}
              onChange={(val) => handleChangeModel(index, "modelName", val)}
              placeholder="اكتب اسم النموذج أو اختر من القائمة"
              options={index === 0 ? [
                { value: "qwen2-vl", label: "(Ollama Local)" },
                { value: "qwen2.5-vl", label: "" },
                { value: "llama3.2-vision", label: "(Ollama Local)" },
                { value: "gemini-2.5-flash", label: "(Google)" },
                { value: "gemini-2.5-pro", label: "(Google)" },
                { value: "gpt-4o", label: "(OpenAI)" }
              ] : [
                { value: "qwen2.5", label: "(Ollama Local)" },
                { value: "deepseek-r1", label: "(Ollama Local)" },
                { value: "mathstral", label: "" },
                { value: "llama-3.3-70b-versatile", label: "(Groq)" },
                { value: "gpt-4o", label: "(OpenAI)" },
                { value: "o1-mini", label: "(OpenAI)" }
              ]}
            />
          </div>
          
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex justify-between">
              <div className="flex items-center gap-1.5">
                <span>API Key (مشفّر في الخزنة)</span>
                <Lock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </label>
            <div className="relative">
              <Key className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                id={`api-key-input-${index}`}
                type="password"
                value={model.apiKey || ""}
                onChange={(e) => handleChangeModel(index, "apiKey", e.target.value)}
                placeholder={model.hasKey ? "•••••••• (أدخل مفتاحاً جديداً لتحديثه)" : "sk-..."}
                className="w-full pl-3 pr-10 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 text-left font-mono text-slate-900 dark:text-white"
                dir="ltr"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex justify-between">
              <span>مؤشر التباين (Temperature)</span>
              <span className="text-indigo-600 dark:text-indigo-400 font-mono font-bold px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-md">
                {model.temperature.toFixed(2)}
              </span>
            </label>
            <input
              id={`temperature-input-${index}`}
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={model.temperature}
              onChange={(e) =>
                handleChangeModel(index, "temperature", parseFloat(e.target.value))
              }
              className="w-full accent-indigo-600 cursor-pointer"
            />
            <p className="text-xs text-slate-500 mt-1">{hint}</p>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-700/50">
            <button
              id={`test-btn-${index}`}
              onClick={() => handleTestConnection(index)}
              disabled={testStatuses[index]?.status === "testing"}
              className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 w-full disabled:opacity-50"
            >
              {testStatuses[index]?.status === "testing" ? (
                <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
              ) : (
                <Wifi className="w-4 h-4 text-indigo-500" />
              )}
              <span>اختبار الاتصال بالخادم والنموذج</span>
            </button>
            {testStatuses[index]?.status === "success" && (
              <div className="p-2.5 mt-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-xs font-bold rounded-lg text-center border border-emerald-100 dark:border-emerald-800">
                {testStatuses[index].message}
              </div>
            )}
            {testStatuses[index]?.status === "error" && (
              <div className="p-2.5 mt-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-xs font-bold rounded-lg text-center border border-red-100 dark:border-red-800">
                {testStatuses[index].message}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const modalContent = (
    <div className="fixed inset-0 z-[99999] bg-slate-900/60 pointer-events-auto backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl max-w-3xl w-full flex flex-col max-h-[95vh] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden" dir="rtl" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm">
              <Settings2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  إدارة نماذج الذكاء الاصطناعي
                </h3>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  خزنة مشفّرة AES-256-GCM
                </span>
              </div>
            </div>
          </div>
          <button
            id="close-settings-btn"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {renderModelCard("محرك استخراج النصوص (OCR)", 0, "ينصح بقيمة منخفضة (مثل 0.1) لضمان دقة استخراج النصوص.")}
          {renderModelCard("محرك التحليل والحل", 1, "ينصح بقيمة أعلى (مثل 0.7) لمرونة التحليل الأكاديمي.")}
        </div>

        {/* Footer */}
        <div className="p-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 shrink-0">
          <button
            id="save-settings-btn"
            onClick={handleSaveAll}
            disabled={isSaving}
            className="w-full py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 disabled:opacity-50"
          >
            {isSaving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            <span>{isSaving ? "جاري التشفير والحفظ في الخزنة..." : "حفظ وتشفير النماذج"}</span>
          </button>
        </div>
      </div>
    </div>
  );
  return createPortal(modalContent, document.body);
};
