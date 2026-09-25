import React from "react";
import { ShieldAlert, ArrowRight, Lock } from "lucide-react";

interface AccessDeniedViewProps {
  moduleName?: string;
  onReturnToDashboard: () => void;
}

export const AccessDeniedView: React.FC<AccessDeniedViewProps> = ({
  moduleName = "هذه الشاشة",
  onReturnToDashboard,
}) => {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6 bg-slate-50/50 dark:bg-slate-950/50">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 max-w-lg w-full text-center shadow-xl space-y-6 animate-in fade-in zoom-in-95 duration-200" dir="rtl">
        <div className="relative mx-auto w-20 h-20 flex items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
          <ShieldAlert className="w-10 h-10" />
          <div className="absolute -bottom-1 -left-1 p-1 bg-white dark:bg-slate-900 rounded-full shadow">
            <Lock className="w-4 h-4 text-slate-500" />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-black text-slate-900 dark:text-white">
            الوصول غير مصرح به (Access Denied)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            عفواً، لا يمتلك حسابك أو دورك الحالي الصلاحية الكافية لدخول {moduleName}. يرجى التواصل مع مدير النظام لتحديث صلاحيات الوصول الخاصة بك.
          </p>
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={onReturnToDashboard}
            className="w-full py-3 px-5 rounded-2xl bg-primary-600 hover:bg-primary-700 text-white font-black text-xs shadow-md shadow-primary-600/20 transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <span>العودة إلى لوحة التحكم الرئيسية</span>
            <ArrowRight className="w-4 h-4 rotate-180" />
          </button>
        </div>
      </div>
    </div>
  );
};
