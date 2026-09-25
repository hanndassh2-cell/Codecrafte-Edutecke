import React, { useEffect, useState } from "react";
import { BookOpen, Settings, Atom, Feather, GraduationCap } from "lucide-react";

interface SplashViewProps {
  onFinish?: () => void;
}

export const SplashView: React.FC<SplashViewProps> = ({ onFinish }) => {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("جاري تهيئة بيئة العمل...");

  useEffect(() => {
    // Simulate a loading sequence
    const sequence = [
      { p: 15, text: "جاري تهيئة بيئة العمل...", time: 200 },
      { p: 45, text: "جاري الاتصال بمحركات الذكاء الاصطناعي...", time: 1200 },
      { p: 80, text: "تحميل مساحة العمل...", time: 2500 },
      { p: 100, text: "اكتمل التحميل", time: 3500 },
    ];

    sequence.forEach(({ p, text, time }) => {
      setTimeout(() => {
        setProgress(p);
        setStatus(text);
      }, time);
    });

    const finishTimeout = setTimeout(() => {
      if (onFinish) onFinish();
    }, 4200);

    return () => {
      clearTimeout(finishTimeout);
    };
  }, [onFinish]);

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 overflow-hidden text-slate-900"
      dir="rtl"
    >
      {/* Background Animated Elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Floating Icons & Symbols */}
        <div className="absolute top-[15%] left-[20%] animate-[bounce_12s_ease-in-out_infinite]">
          <span className="text-blue-200/40 font-serif text-6xl">∫</span>
        </div>
        <div className="absolute top-[30%] right-[25%] animate-[bounce_15s_ease-in-out_infinite_reverse]">
          <span className="text-blue-200/40 font-serif text-5xl">π</span>
        </div>
        <div className="absolute bottom-[20%] left-[30%] animate-[bounce_10s_ease-in-out_infinite]">
          <span className="text-blue-200/40 font-serif text-7xl">∑</span>
        </div>
        <div className="absolute top-[20%] right-[15%] animate-[pulse_8s_ease-in-out_infinite]">
          <Atom className="w-20 h-20 text-blue-200/40" strokeWidth={1} />
        </div>
        <div className="absolute bottom-[25%] right-[20%] animate-[spin_20s_linear_infinite]">
          <Settings className="w-16 h-16 text-blue-200/40" strokeWidth={1} />
        </div>
        <div className="absolute top-[45%] left-[10%] animate-[pulse_10s_ease-in-out_infinite]">
          <GraduationCap
            className="w-24 h-24 text-blue-200/40"
            strokeWidth={1}
          />
        </div>
        <div className="absolute bottom-[35%] left-[15%] animate-[bounce_14s_ease-in-out_infinite]">
          <Atom className="w-12 h-12 text-blue-200/40" strokeWidth={1.5} />
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center w-full px-6">
        {/* White Card */}
        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 p-10 md:px-24 flex flex-col items-center justify-center transform transition-all duration-1000 animate-in zoom-in-95 fade-in mb-12">
          <div className="flex flex-col items-center gap-4 mb-6">
            <div className="relative flex items-center justify-center mb-2">
              {/* Icon Container similar to image */}
              <div className="relative text-blue-600 flex items-center justify-center">
                <BookOpen className="w-20 h-20" strokeWidth={1.5} />
                <Feather
                  className="w-10 h-10 absolute -left-2 top-0"
                  strokeWidth={1.5}
                />
                <Atom
                  className="w-12 h-12 absolute -right-4 -top-2"
                  strokeWidth={2}
                />
              </div>
            </div>

            <h1
              className="text-5xl md:text-6xl font-black text-blue-600 tracking-tight"
              dir="ltr"
              style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}
            >
              EduTech
            </h1>
            <h2 className="text-4xl md:text-5xl font-extrabold text-slate-800 tracking-tight mb-2">
              إيدوتيك
            </h2>
          </div>

          <p className="text-lg md:text-xl font-bold text-slate-600 tracking-wide text-center">
            نظام إدارة المنهاج والاختبارات الذكي
          </p>
        </div>

        {/* Progress Bar Section */}
        <div className="w-full max-w-md flex flex-col items-center animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300 fill-mode-both">
          <div className="h-2.5 w-full bg-slate-200 rounded-full overflow-hidden shadow-inner">
            <div
              className="h-full bg-blue-600 relative"
              style={{
                width: `${progress}%`,
                transition: "width 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            >
              <div className="absolute inset-0 bg-white/20 animate-[pulse_1.5s_ease-in-out_infinite]"></div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-center gap-1 text-slate-500 text-sm font-semibold animate-pulse tracking-wide">
            <span>{status}</span>
            {progress < 100 && (
              <span className="flex gap-0.5" dir="ltr">
                <span className="animate-bounce delay-75">.</span>
                <span className="animate-bounce delay-150">.</span>
                <span className="animate-bounce delay-300">.</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-8 flex flex-col items-center text-center space-y-1 animate-in fade-in duration-1000 delay-700 fill-mode-both">
        <p className="text-slate-500 text-sm font-medium tracking-wider">
          النسخة 1.0 (Beta)
        </p>
        <p className="text-slate-500 text-sm">
          تطوير وإشراف: المهندس مثنى رمضان
        </p>
      </div>
    </div>
  );
};
