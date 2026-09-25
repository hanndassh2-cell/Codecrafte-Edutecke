import React, { useState } from "react";
import {
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  BookOpen,
  Feather,
  Atom,
  Loader2,
  AlertCircle,
  KeyRound,
} from "lucide-react";
import { storage } from "../../../services/storage";
import { User } from "../../../types/index";
import { validatePasswordStrength } from "../../../utils/crypto";

interface AdminFirstRunSetupProps {
  onSetupComplete: (user: User) => void;
}

export const AdminFirstRunSetup: React.FC<AdminFirstRunSetupProps> = ({
  onSetupComplete,
}) => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const passwordStrength = validatePasswordStrength(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const isFormValid = passwordStrength.isValid && passwordsMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    if (!passwordStrength.isValid) {
      setErrorMessage(passwordStrength.error || "يرجى استيفاء شروط كلمة المرور");
      return;
    }

    if (!passwordsMatch) {
      setErrorMessage("كلمتا المرور غير متطابقتين. يرجى التأكد وإعادة الإدخال.");
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);

    try {
      const updatedAdmin = await storage.setupAdminPassword(password);
      // Wait a tiny moment for smooth UI feedback
      setTimeout(() => {
        setIsLoading(false);
        onSetupComplete(updatedAdmin);
      }, 400);
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(err.message || "حدث خطأ أثناء حفظ كلمة المرور");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 overflow-y-auto p-4 text-slate-900"
      dir="rtl"
    >
      {/* Background Subtle Elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[10%] left-[15%] text-blue-200/40 font-serif text-6xl select-none">
          ∫
        </div>
        <div className="absolute top-[25%] right-[20%] text-blue-200/40 font-serif text-5xl select-none">
          π
        </div>
        <div className="absolute bottom-[15%] left-[25%] text-blue-200/40 font-serif text-7xl select-none">
          ∑
        </div>
        <div className="absolute top-[18%] right-[10%] text-blue-200/40 select-none">
          <Atom className="w-20 h-20" strokeWidth={1} />
        </div>
      </div>

      <div className="relative z-10 w-full max-w-md my-auto">
        <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-slate-100 p-7 md:p-8 flex flex-col items-center">
          {/* Logo & Heading */}
          <div className="flex flex-col items-center gap-1.5 mb-5 w-full text-center">
            <div className="relative flex items-center justify-center mb-1">
              <div className="relative text-blue-600 flex items-center justify-center">
                <BookOpen className="w-12 h-12" strokeWidth={1.5} />
                <Feather
                  className="w-6 h-6 absolute -left-2 top-0"
                  strokeWidth={1.5}
                />
                <Atom
                  className="w-8 h-8 absolute -right-3 -top-2"
                  strokeWidth={2}
                />
              </div>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 rounded-full text-amber-800 text-xs font-bold mb-1">
              <ShieldCheck className="w-4 h-4 text-amber-600" />
              <span>التهيئة الآمنة للنظام (First-Run Setup)</span>
            </div>

            <h1 className="text-xl font-extrabold text-slate-800 tracking-tight">
              تعيين كلمة مرور المدير الرئيسي
            </h1>
            <p className="text-xs font-medium text-slate-500 max-w-xs leading-relaxed">
              لحماية المنظومة، يجب إنشاء كلمة مرور قوية لحساب المشرف العام قبل بدء الاستخدام لأول مرة.
            </p>
          </div>

          {/* Admin Account Card */}
          <div className="w-full bg-slate-50 border border-slate-200/80 rounded-xl p-3 mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-sm shadow-sm">
                م
              </div>
              <div className="text-right">
                <p className="text-xs font-extrabold text-slate-800">
                  أحمد محمود (المدير الرئيسي)
                </p>
                <p className="text-[11px] font-mono text-slate-500" dir="ltr">
                  ahmed_admin
                </p>
              </div>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold">
              مدير النظام
            </span>
          </div>

          {/* Setup Form */}
          <form onSubmit={handleSubmit} className="w-full space-y-4">
            {/* Password */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 text-right">
                كلمة المرور الجديدة:
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  disabled={isLoading}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pr-9 pl-10 py-2.5 border border-slate-200 bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-xl transition-all font-sans text-slate-900 placeholder:text-slate-400 text-sm shadow-sm disabled:opacity-50 disabled:bg-slate-50"
                  placeholder="أدخل كلمة مرور قوية (10+ محارف)"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Password Policy Checklist */}
            <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-3 space-y-2 text-xs">
              <p className="font-bold text-slate-700 text-[11px]">
                شروط كلمة المرور الآمنة:
              </p>
              <div className="grid grid-cols-1 gap-1.5">
                <div className="flex items-center gap-2">
                  {passwordStrength.hasMinLength ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-slate-300 shrink-0" />
                  )}
                  <span
                    className={
                      passwordStrength.hasMinLength
                        ? "text-emerald-700 font-bold"
                        : "text-slate-500"
                    }
                  >
                    10 محارف على الأقل ({password.length}/10)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {passwordStrength.hasLetter ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-slate-300 shrink-0" />
                  )}
                  <span
                    className={
                      passwordStrength.hasLetter
                        ? "text-emerald-700 font-bold"
                        : "text-slate-500"
                    }
                  >
                    تتضمن أحرفاً (عربية أو إنجليزية)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {passwordStrength.hasNumber ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-slate-300 shrink-0" />
                  )}
                  <span
                    className={
                      passwordStrength.hasNumber
                        ? "text-emerald-700 font-bold"
                        : "text-slate-500"
                    }
                  >
                    تتضمن أرقاماً (0-9)
                  </span>
                </div>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 text-right">
                تأكيد كلمة المرور:
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                  <KeyRound className="h-4 w-4" />
                </div>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  disabled={isLoading}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="block w-full pr-9 pl-10 py-2.5 border border-slate-200 bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-xl transition-all font-sans text-slate-900 placeholder:text-slate-400 text-sm shadow-sm disabled:opacity-50 disabled:bg-slate-50"
                  placeholder="أعد كتابة كلمة المرور للتأكيد"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>

              {confirmPassword.length > 0 && !passwordsMatch && (
                <p className="text-[11px] text-rose-600 font-bold flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  كلمتا المرور غير متطابقتين
                </p>
              )}
            </div>

            {errorMessage && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 p-2.5 rounded-xl text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !isFormValid}
              className={`w-full py-3 px-4 rounded-xl font-bold text-sm shadow-md transition-all duration-200 flex items-center justify-center gap-2 ${
                isLoading || !isFormValid
                  ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                  : "bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white shadow-blue-500/25 hover:shadow-lg"
              }`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جارٍ التشفير وتفعيل الحساب...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>حفظ كلمة المرور وتفعيل الحساب</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 mt-6 text-center text-slate-400 text-xs">
        EduTech Security Engine — التشفير العسكري الآمن PBKDF2-SHA256
      </div>
    </div>
  );
};
