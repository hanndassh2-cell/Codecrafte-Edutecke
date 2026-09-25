import React, { useState, useEffect, useRef } from "react";
import {
  User as UserIcon,
  Lock,
  BookOpen,
  Feather,
  Atom,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  HelpCircle,
  Mail,
  Shield,
  X,
  Check,
  Sparkles,
  Users,
  Copy,
} from "lucide-react";
import { storage } from "../../../services/storage";
import { User } from "../../../types/index";
import { verifyPassword } from "../../../utils/crypto";
import { AdminFirstRunSetup } from "../components/AdminFirstRunSetup";

interface LoginViewProps {
  onLogin: (rememberMe: boolean, loggedInUser?: User) => void;
}

/**
 * Normalizes Arabic text and strings for forgiving, user-friendly matching
 */
function normalizeAuthString(str: string): string {
  return (str || "")
    .trim()
    .toLowerCase()
    .replace(/[أإآآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[\u064B-\u065F\u0670]/g, "") // remove tashkeel
    .replace(/[\s\-_.]+/g, ""); // normalize spaces/dashes
}

export const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  const [isAdminSetupNeeded, setIsAdminSetupNeeded] = useState(
    () => !storage.isAdminInitialized()
  );

  // Initialize rememberMe and rememberedUsername securely from localStorage
  const savedRememberedUsername = localStorage.getItem("rememberedUsername") || "";
  const savedRememberMe =
    localStorage.getItem("rememberMe") === "true" ||
    Boolean(savedRememberedUsername);

  const [username, setUsername] = useState(savedRememberedUsername);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(savedRememberMe);
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showAdminHelpModal, setShowAdminHelpModal] = useState(false);
  const [capsLockActive, setCapsLockActive] = useState(false);
  const [showQuickAccounts, setShowQuickAccounts] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  const usernameInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  // Autofocus appropriately on mount
  useEffect(() => {
    if (savedRememberedUsername) {
      passwordInputRef.current?.focus();
    } else {
      usernameInputRef.current?.focus();
    }
  }, [savedRememberedUsername]);

  // Handle remember me toggle
  const handleRememberMeToggle = (checked: boolean) => {
    setRememberMe(checked);
    if (checked) {
      localStorage.setItem("rememberMe", "true");
      if (username.trim()) {
        localStorage.setItem("rememberedUsername", username.trim());
      }
    } else {
      localStorage.removeItem("rememberMe");
      localStorage.removeItem("rememberedUsername");
    }
  };

  // Handle username change and sync with rememberMe
  const handleUsernameChange = (val: string) => {
    setUsername(val);
    if (loginError) setLoginError(null);
    if (rememberMe) {
      if (val.trim()) {
        localStorage.setItem("rememberedUsername", val.trim());
        localStorage.setItem("rememberMe", "true");
      } else {
        localStorage.removeItem("rememberedUsername");
      }
    }
  };

  // Handle key down in password field to detect CapsLock
  const handlePasswordKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.getModifierState) {
      setCapsLockActive(e.getModifierState("CapsLock"));
    }
  };

  // If initial admin setup is required, render the safe setup component
  if (isAdminSetupNeeded) {
    return (
      <AdminFirstRunSetup
        onSetupComplete={(adminUser) => {
          setIsAdminSetupNeeded(false);
          localStorage.setItem("rememberMe", "true");
          localStorage.setItem(
            "rememberedUsername",
            adminUser.username || adminUser.email || "ahmed_admin"
          );
          onLogin(true, adminUser);
        }}
      />
    );
  }

  const allSystemUsers = storage.getUsers();

  const handleSelectQuickAccount = (u: User) => {
    const chosen = u.username || u.email;
    setUsername(chosen);
    if (rememberMe) {
      localStorage.setItem("rememberedUsername", chosen);
      localStorage.setItem("rememberMe", "true");
    }
    setPassword("");
    setLoginError(null);
    setShowQuickAccounts(false);
    passwordInputRef.current?.focus();
  };

  const handleCopyAdminEmail = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText("hanndassh@gmail.com");
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2500);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setLoginError(null);
    const rawUsername = username.trim();
    const cleanPassword = password.trim();

    if (!rawUsername || !cleanPassword) {
      setLoginError("يرجى إدخال اسم المستخدم وكلمة المرور.");
      return;
    }

    setIsLoading(true);

    try {
      const allUsers = storage.getUsers();
      const normInput = normalizeAuthString(rawUsername);

      // Match forgivingly by:
      // 1. exact username or normalized username
      // 2. exact email or normalized email
      // 3. full name (normalized)
      // 4. "admin" alias for the first admin
      const matchedUser = allUsers.find((u) => {
        const uName = (u.username || "").trim().toLowerCase();
        const uEmail = (u.email || "").trim().toLowerCase();
        const uFullName = (u.name || "").trim().toLowerCase();

        if (uName === rawUsername.toLowerCase() || uEmail === rawUsername.toLowerCase()) {
          return true;
        }

        const normUName = normalizeAuthString(u.username);
        const normUEmail = normalizeAuthString(u.email);
        const normUFullName = normalizeAuthString(u.name);

        if (normUName === normInput || normUEmail === normInput || normUFullName === normInput) {
          return true;
        }

        if (normInput === "admin" && (u.role === "admin" || u.id === "usr-1")) {
          return true;
        }

        return false;
      });

      const UNIFIED_AUTH_ERROR = "اسم المستخدم أو كلمة المرور غير صحيحة.";

      if (!matchedUser) {
        await new Promise((r) => setTimeout(r, 400));
        setLoginError(UNIFIED_AUTH_ERROR);
        setIsLoading(false);
        storage.logAction(
          rawUsername,
          "تسجيل دخول فاشل",
          "المصادقة والمستخدمين",
          "",
          `محاولة فاشلة لمعرّف غير مسجل: ${rawUsername}`,
          {
            userId: "unknown",
            userName: rawUsername,
            result: "denied",
            entityType: "المصادقة",
          }
        );
        return;
      }

      // 2. Validate Password strictly and Auto-Migrate if needed
      const verification = await verifyPassword(cleanPassword, matchedUser);

      if (!verification.isValid) {
        await new Promise((r) => setTimeout(r, 400));
        setLoginError(UNIFIED_AUTH_ERROR);
        setIsLoading(false);
        storage.logAction(
          matchedUser.name,
          "تسجيل دخول فاشل",
          "المصادقة والمستخدمين",
          matchedUser.id,
          `محاولة فاشلة للحساب (${matchedUser.username || matchedUser.email})`,
          {
            userId: matchedUser.id,
            userName: matchedUser.name,
            userRole: matchedUser.role,
            result: "denied",
            entityType: "المصادقة",
            entityId: matchedUser.id,
          }
        );
        return;
      }

      // 3. Check Account Status (Disabled demo or inactive accounts)
      if (matchedUser.status && matchedUser.status !== "active") {
        await new Promise((r) => setTimeout(r, 350));
        setLoginError(
          "هذا الحساب غير مفعل حالياً. يرجى مراجعة مسؤول المنظومة للتفعيل."
        );
        setIsLoading(false);
        storage.logAction(
          matchedUser.name,
          "تسجيل دخول - حساب معطل",
          "المصادقة والمستخدمين",
          matchedUser.id,
          `محاولة دخول لحساب غير مفعّل (${matchedUser.username || matchedUser.email})`,
          {
            userId: matchedUser.id,
            userName: matchedUser.name,
            userRole: matchedUser.role,
            result: "denied",
            entityType: "المصادقة",
            entityId: matchedUser.id,
          }
        );
        return;
      }

      let activeUser = matchedUser;
      if (verification.needsMigration && verification.updatedUser) {
        activeUser = verification.updatedUser;
        storage.saveUser(activeUser);
      }

      // 4. Update lastLoginAt
      activeUser.lastLoginAt = new Date()
        .toISOString()
        .replace("T", " ")
        .substring(0, 19);
      storage.saveUser(activeUser);

      // 5. Audit Log Success
      storage.logAction(
        activeUser.name,
        "تسجيل دخول ناجح",
        "المصادقة والمستخدمين",
        activeUser.id,
        `دخول ناجح بدور (${activeUser.role})`,
        {
          userId: activeUser.id,
          userName: activeUser.name,
          userRole: activeUser.role,
          result: "success",
          entityType: "المصادقة",
          entityId: activeUser.id,
        }
      );

      // 6. Handle Remember Me state (stores username ONLY, never password)
      if (rememberMe) {
        localStorage.setItem("rememberMe", "true");
        localStorage.setItem(
          "rememberedUsername",
          activeUser.username || activeUser.email || rawUsername
        );
      } else {
        localStorage.removeItem("rememberMe");
        localStorage.removeItem("rememberedUsername");
      }

      // 7. Successful Login
      storage.setCurrentUser(activeUser);
      setIsLoading(false);
      onLogin(rememberMe, activeUser);
    } catch (e: any) {
      setIsLoading(false);
      setLoginError("حدث خطأ أثناء معالجة تسجيل الدخول. يرجى المحاولة لاحقاً.");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 overflow-y-auto p-4 text-slate-900"
      dir="rtl"
    >
      {/* Background Animated Elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[15%] left-[20%] animate-[bounce_12s_ease-in-out_infinite]">
          <span className="text-blue-200/40 font-serif text-6xl select-none">∫</span>
        </div>
        <div className="absolute top-[30%] right-[25%] animate-[bounce_15s_ease-in-out_infinite_reverse]">
          <span className="text-blue-200/40 font-serif text-5xl select-none">π</span>
        </div>
        <div className="absolute bottom-[20%] left-[30%] animate-[bounce_10s_ease-in-out_infinite]">
          <span className="text-blue-200/40 font-serif text-7xl select-none">∑</span>
        </div>
        <div className="absolute top-[20%] right-[15%] animate-[pulse_8s_ease-in-out_infinite]">
          <Atom className="w-20 h-20 text-blue-200/40" strokeWidth={1} />
        </div>
        <div className="absolute bottom-[25%] right-[20%] animate-[spin_20s_linear_infinite]">
          <Shield className="w-16 h-16 text-blue-200/30" strokeWidth={1} />
        </div>
        <div className="absolute top-[45%] left-[10%] animate-[pulse_10s_ease-in-out_infinite]">
          <Atom className="w-24 h-24 text-blue-200/40" strokeWidth={1} />
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-md my-auto">
        {/* White Card */}
        <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 p-8 md:px-10 flex flex-col items-center justify-center transform transition-all duration-300">
          {/* Logo & Headers */}
          <div className="flex flex-col items-center gap-2 mb-6 w-full text-center">
            <div className="relative flex items-center justify-center mb-1">
              <div className="relative text-blue-600 flex items-center justify-center">
                <BookOpen className="w-14 h-14" strokeWidth={1.5} />
                <Feather
                  className="w-7 h-7 absolute -left-2 top-0 text-blue-500"
                  strokeWidth={1.5}
                />
                <Atom
                  className="w-9 h-9 absolute -right-3 -top-2 text-indigo-500"
                  strokeWidth={2}
                />
              </div>
            </div>

            <h1
              className="text-3xl font-black text-blue-600 tracking-tight"
              dir="ltr"
              style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}
            >
              EduTech
            </h1>
            <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">
              إيدوتيك
            </h2>
            <p className="text-xs md:text-sm font-bold text-slate-600 tracking-wide">
              نظام إدارة المنهاج والاختبارات الذكي
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="w-full space-y-4">
            <div className="space-y-3">
              {/* Username / Email */}
              <div className="relative group">
                <div className="absolute inset-y-0 right-0 pl-3 flex items-center pr-3 pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                  <UserIcon className="h-5 w-5" />
                </div>
                <input
                  ref={usernameInputRef}
                  type="text"
                  required
                  disabled={isLoading}
                  value={username}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  className="block w-full pr-10 pl-3 py-2.5 border border-slate-200 bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-xl transition-all font-medium text-slate-900 placeholder:text-slate-400 text-sm shadow-sm disabled:opacity-60 disabled:bg-slate-50"
                  placeholder="اسم المستخدم أو البريد الإلكتروني"
                  autoComplete="username"
                />
              </div>

              {/* Password */}
              <div className="relative group">
                <div className="absolute inset-y-0 right-0 pl-3 flex items-center pr-3 pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  ref={passwordInputRef}
                  type={showPassword ? "text" : "password"}
                  required
                  disabled={isLoading}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (loginError) setLoginError(null);
                  }}
                  onKeyDown={handlePasswordKeyDown}
                  onKeyUp={handlePasswordKeyDown}
                  className="block w-full pr-10 pl-10 py-2.5 border border-slate-200 bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-xl transition-all font-medium text-slate-900 placeholder:text-slate-400 text-sm shadow-sm disabled:opacity-60 disabled:bg-slate-50"
                  placeholder="كلمة المرور"
                  dir="ltr"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  tabIndex={-1}
                  disabled={isLoading}
                  title={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>

              {/* CapsLock Alert */}
              {capsLockActive && (
                <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium animate-in fade-in">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>تنبيه: زر الأحرف الكبيرة (Caps Lock) مفعّل</span>
                </div>
              )}
            </div>

            {/* Remember Username Checkbox & Quick Accounts Switcher */}
            <div className="flex items-center justify-between px-1 py-0.5">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-600 hover:text-slate-800 transition-colors select-none">
                <input
                  type="checkbox"
                  disabled={isLoading}
                  checked={rememberMe}
                  onChange={(e) => handleRememberMeToggle(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer disabled:opacity-50"
                />
                <span>تذكر اسم المستخدم</span>
              </label>

              {allSystemUsers.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowQuickAccounts(!showQuickAccounts)}
                  className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <Users className="w-3 h-3" />
                  <span>الحسابات المتوفرة</span>
                </button>
              )}
            </div>

            {/* Quick Accounts Dropdown / List */}
            {showQuickAccounts && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 space-y-1.5 animate-in fade-in">
                <div className="flex items-center justify-between pb-1 border-b border-slate-200/80 px-1">
                  <span className="text-[11px] font-bold text-slate-600">
                    اضغط على الحساب لتعبئة اسم المستخدم:
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowQuickAccounts(false)}
                    className="text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <div className="max-h-36 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                  {allSystemUsers.map((u) => {
                    const roleLabel =
                      u.role === "admin"
                        ? "مدير"
                        : u.role === "supervisor"
                        ? "مشرف"
                        : "معلم";
                    const isCurrent = (u.username || u.email) === username;
                    const isActive = u.status === "active";
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => handleSelectQuickAccount(u)}
                        className={`w-full text-right p-2 rounded-lg flex items-center justify-between text-xs transition-colors cursor-pointer ${
                          isCurrent
                            ? "bg-blue-100/80 text-blue-900 font-bold"
                            : "hover:bg-slate-200/70 text-slate-700 font-medium"
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isActive ? "bg-emerald-500" : "bg-slate-400"
                            }`}
                          />
                          <span className="font-bold">{u.name}</span>
                          <span className="text-[10px] text-slate-500 font-mono" dir="ltr">
                            ({u.username || u.email})
                          </span>
                        </div>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                            u.role === "admin"
                              ? "bg-purple-100 text-purple-700"
                              : u.role === "supervisor"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {roleLabel}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {loginError && (
              <div className="text-xs text-rose-600 font-bold text-center bg-rose-50 py-2.5 px-3 rounded-xl border border-rose-100 flex items-center justify-center gap-1.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{loginError}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 px-4 rounded-xl font-bold text-sm shadow-md transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
                isLoading
                  ? "bg-blue-400 text-white cursor-wait"
                  : "bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white shadow-blue-500/20 hover:shadow-lg"
              }`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جارٍ التحقق وتسجيل الدخول...</span>
                </>
              ) : (
                <span>تسجيل الدخول</span>
              )}
            </button>

            {/* Admin Guidance / Support Link */}
            <div className="flex items-center justify-center gap-2 mt-3 pt-1 text-xs font-bold">
              <button
                type="button"
                onClick={() => setShowAdminHelpModal(true)}
                className="text-slate-500 hover:text-blue-600 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>نسيت كلمة المرور أو تحتاج تفعيل الحساب؟</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Support / Admin Contact Modal */}
      {showAdminHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-sm w-full p-6 relative text-right animate-in zoom-in-95">
            <button
              type="button"
              onClick={() => setShowAdminHelpModal(false)}
              className="absolute top-4 left-4 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-4 text-blue-600">
              <Shield className="w-6 h-6 shrink-0" />
              <h3 className="font-extrabold text-slate-800 text-base">
                الدعم الفني وإدارة الحسابات
              </h3>
            </div>

            <div className="space-y-3 text-xs leading-relaxed text-slate-600">
              <p>
                لإعادة ضبط كلمة المرور أو تفعيل الحسابات غير المفعلة، يمكنك مراجعة مدير النظام من داخل المنظومة أو التواصل مباشرة مع الإدارة:
              </p>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <p className="text-[11px] text-slate-500 font-medium">البريد الإلكتروني للإشراف:</p>
                    <p className="font-bold text-slate-800 font-mono text-xs truncate" dir="ltr">
                      hanndassh@gmail.com
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCopyAdminEmail}
                  className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[11px] font-bold shrink-0 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  {copiedEmail ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span className="text-emerald-600">تم النسخ</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>نسخ</span>
                    </>
                  )}
                </button>
              </div>

              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-amber-800 text-[11px]">
                💡 <strong>ملاحظة:</strong> يستطيع مدير النظام تعديل كلمات المرور، الصلاحيات، وتفعيل الحسابات من خلال لوحة <em>المستخدمون والصلاحيات</em> في قائمة الإعدادات.
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowAdminHelpModal(false)}
              className="w-full mt-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition-colors cursor-pointer"
            >
              حسناً، فهمت
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-4 flex flex-col items-center text-center space-y-0.5">
        <p className="text-slate-500 text-xs font-medium tracking-wide">
          للمساعدة في التفعيل، تواصل عبر:{" "}
          <span className="font-sans font-bold text-slate-700" dir="ltr">
            hanndassh@gmail.com
          </span>
        </p>
        <p className="text-slate-400 text-[11px]">
          النسخة 1.0 — إشراف المهندس مثنى رمضان
        </p>
      </div>
    </div>
  );
};

