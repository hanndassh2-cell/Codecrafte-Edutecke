import React, { useState, useRef } from "react";
import { storage } from "../../../services/storage";
import {
  Settings,
  Users,
  ShieldAlert,
  Database,
  Download,
  Upload,
  RefreshCw,
  Clock,
  Key,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  CloudUpload,
  UserCheck,
  Building2,
  Palette,
  Info,
  CreditCard,
  Moon,
  Sun,
  Monitor,
  Smartphone,
  ArrowUp,
  ArrowDown,
  Edit3,
  Copy,
  Power,
  Search,
  Filter,
  ShieldCheck,
  Plus,
  Sliders,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { User, AuditLog, SystemSettings } from "../../../types/index";
import { UserModal } from "../../users/components/UserModal";
import { applyGlobalTheme } from "../../../services/themeEngine";

interface SettingsViewProps {
  settings: SystemSettings;
  users: User[];
  auditLogs: AuditLog[];
  onSaveSettings: (settings: SystemSettings) => void;
  onSaveUser: (user: User) => void;
  onDeleteUser?: (id: string) => void;
  onReorderUsers?: (reorderedUsers: User[]) => void;
  onExportBackup: () => void;
  onImportBackup: (jsonStr: string) => void;
  onResetAllData: (phrase: string) => void;
  onEmptyDatabase: (phrase: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  users,
  auditLogs,
  onSaveSettings,
  onSaveUser,
  onDeleteUser,
  onReorderUsers,
  onExportBackup,
  onImportBackup,
  onResetAllData,
  onEmptyDatabase,
}) => {
  const settingsSavedUi = React.useMemo(() => storage.getUiState("settings_ui", {
    activeSubTab: "system" as const,
    showAdvancedColors: false,
    userSearchTerm: "",
    userRoleFilter: "all",
    isAuditLogCollapsed: true,
  }), []);

  const [activeSubTab, setActiveSubTab] = useState<
    "system" | "backup" | "users" | "appearance" | "about"
  >("system");
  const [systemForm, setSystemForm] = React.useState<SystemSettings>(settings);
  const [showAdvancedColors, setShowAdvancedColors] = useState(settingsSavedUi.showAdvancedColors ?? false);
  const currentUser = storage.getCurrentUser();
  const [licenseKeyInput, setLicenseKeyInput] = useState("");
  const [importFileContent, setImportFileContent] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [userModal, setUserModal] = useState<{
    isOpen: boolean;
    user: Partial<User> | null;
  }>({ isOpen: false, user: null });
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    isDanger?: boolean;
  }>({ isOpen: false, title: "", message: "", onConfirm: () => {} });

  // RBAC User Table Filters
  const [userSearchTerm, setUserSearchTerm] = useState(settingsSavedUi.userSearchTerm || "");
  const [userRoleFilter, setUserRoleFilter] = useState<string>(settingsSavedUi.userRoleFilter || "all");
  const [isAuditLogCollapsed, setIsAuditLogCollapsed] = useState(settingsSavedUi.isAuditLogCollapsed ?? true);
  const [showSaveToast, setShowSaveToast] = useState(false);

  React.useEffect(() => {
    storage.saveUiState("settings_ui", {
      activeSubTab,
      showAdvancedColors,
      userSearchTerm,
      userRoleFilter,
      isAuditLogCollapsed,
    });
  }, [activeSubTab, showAdvancedColors, userSearchTerm, userRoleFilter, isAuditLogCollapsed]);

  const handleSaveSettingsAndNotify = (updatedForm?: SystemSettings) => {
    const dataToSave = updatedForm || systemForm;
    setSystemForm(dataToSave);
    applyGlobalTheme(dataToSave);
    onSaveSettings(dataToSave);
    setShowSaveToast(true);
    setTimeout(() => {
      setShowSaveToast(false);
    }, 3000);
  };

  React.useEffect(() => {
    setSystemForm(settings);
  }, [settings]);

  React.useEffect(() => {
    const handleSubTabEvent = (e: any) => {
      if (
        e.detail &&
        ["system", "backup", "users", "appearance", "about"].includes(e.detail)
      ) {
        setActiveSubTab(e.detail);
      }
    };
    window.addEventListener("settings-subtab", handleSubTabEvent);
    return () =>
      window.removeEventListener("settings-subtab", handleSubTabEvent);
  }, []);

  const openConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    isDanger: boolean = false,
  ) => {
    setConfirmModal({ isOpen: true, title, message, onConfirm, isDanger });
  };

  const closeConfirm = () => {
    setConfirmModal((prev) => ({ ...prev, isOpen: false }));
  };

  const handleActivateLicense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenseKeyInput.trim()) return;
    const updated = {
      ...settings,
      licenseStatus: "active" as const,
      licenseKey: licenseKeyInput,
    };
    onSaveSettings(updated);
    openConfirm(
      "نجاح",
      "تم تفعيل الرخصة الدائمة لنظام إديوتيك بنجاح!",
      () => {},
      false,
    );
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setImportFileContent(content);
      }
    };
    reader.readAsText(file);
  };

  const handleImportSubmit = () => {
    if (!importFileContent) return;
    try {
      onImportBackup(importFileContent);
      openConfirm(
        "تمت الاستعادة بنجاح",
        "تم استيراد قاعدة البيانات بنجاح وتحديث كافة البيانات في النظام.",
        () => {
          setImportFileContent("");
        },
        false,
      );
    } catch (e) {
      openConfirm(
        "خطأ في الاستعادة",
        "حدث خطأ أثناء محاولة استعادة البيانات. يرجى التأكد من أن الملف صالح.",
        () => {},
        true,
      );
    }
  };

  return (
    <div className="flex flex-col h-full gap-6 p-6 lg:p-8 animate-in fade-in duration-300">
      {/* Top Title Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/20 shrink-0">
            <Settings className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              إعدادات النظام
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-bold mt-0.5">
              تخصيص المظهر، إدارة النسخ الاحتياطية، والتحكم بالصلاحيات
            </p>
          </div>
        </div>
      </div>

      {/* Sub-tabs Navigation Segmented Container */}
      <div className="bg-slate-100/90 dark:bg-slate-950 p-1.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-inner flex items-center gap-1.5 overflow-x-auto whitespace-nowrap hide-scrollbar">
        {/* Tab 1: System */}
        <button
          type="button"
          onClick={() => setActiveSubTab("system")}
          className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all duration-200 shrink-0 cursor-pointer ${
            activeSubTab === "system"
              ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200/60 dark:border-slate-700 scale-[1.01]"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-900/50"
          }`}
        >
          <div
            className={`p-1.5 rounded-lg ${activeSubTab === "system" ? "bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400" : "bg-slate-200/60 dark:bg-slate-800 text-slate-500"}`}
          >
            <Sliders className="w-4 h-4" />
          </div>
          <span>إعدادات النظام</span>
        </button>

        {/* Tab 2: Database & Backup */}
        <button
          type="button"
          onClick={() => setActiveSubTab("backup")}
          className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all duration-200 shrink-0 cursor-pointer ${
            activeSubTab === "backup"
              ? "bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm border border-slate-200/60 dark:border-slate-700 scale-[1.01]"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-900/50"
          }`}
        >
          <div
            className={`p-1.5 rounded-lg ${activeSubTab === "backup" ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400" : "bg-slate-200/60 dark:bg-slate-800 text-slate-500"}`}
          >
            <Database className="w-4 h-4" />
          </div>
          <span>النسخ الاحتياطي وإدارة البيانات</span>
        </button>

        {/* Tab 3: Users & Permissions */}
        <button
          type="button"
          onClick={() => setActiveSubTab("users")}
          className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all duration-200 shrink-0 cursor-pointer ${
            activeSubTab === "users"
              ? "bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-sm border border-slate-200/60 dark:border-slate-700 scale-[1.01]"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-900/50"
          }`}
        >
          <div
            className={`p-1.5 rounded-lg ${activeSubTab === "users" ? "bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400" : "bg-slate-200/60 dark:bg-slate-800 text-slate-500"}`}
          >
            <Users className="w-4 h-4" />
          </div>
          <span>المستخدمون والصلاحيات</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold ${
              activeSubTab === "users"
                ? "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300"
                : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
            }`}
          >
            {users.length}
          </span>
        </button>

        {/* Tab 4: Appearance */}
        <button
          type="button"
          onClick={() => setActiveSubTab("appearance")}
          className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all duration-200 shrink-0 cursor-pointer ${
            activeSubTab === "appearance"
              ? "bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-sm border border-slate-200/60 dark:border-slate-700 scale-[1.01]"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-900/50"
          }`}
        >
          <div
            className={`p-1.5 rounded-lg ${activeSubTab === "appearance" ? "bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400" : "bg-slate-200/60 dark:bg-slate-800 text-slate-500"}`}
          >
            <Palette className="w-4 h-4" />
          </div>
          <span>المظهر والواجهة</span>
        </button>

        {/* Tab 5: About & System Info */}
        <button
          type="button"
          onClick={() => setActiveSubTab("about")}
          className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all duration-200 shrink-0 cursor-pointer ${
            activeSubTab === "about"
              ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/60 dark:border-slate-700 scale-[1.01]"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-900/50"
          }`}
        >
          <div
            className={`p-1.5 rounded-lg ${activeSubTab === "about" ? "bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400" : "bg-slate-200/60 dark:bg-slate-800 text-slate-500"}`}
          >
            <Info className="w-4 h-4" />
          </div>
          <span>حول النظام والتراخيص</span>
        </button>

      </div>

      {activeSubTab === "system" && (
        <div className="space-y-5 animate-in fade-in zoom-in-95 duration-200">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Card 1: Visual Identity */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-xs border border-slate-200/80 dark:border-slate-800 space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                  <Palette className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                    الهوية البصرية للمؤسسة
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    الشعار والاسم التجاري واسم المدير الظاهر بالتقارير
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    اسم الأكاديمية / المعهد
                  </label>
                  <input
                    type="text"
                    value={systemForm.academyName || ""}
                    onChange={(e) =>
                      setSystemForm({
                        ...systemForm,
                        academyName: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    placeholder="معهد المثنى لطلاب الهندسة"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    المدير المسؤول
                  </label>
                  <input
                    type="text"
                    value={systemForm.managerName || ""}
                    onChange={(e) =>
                      setSystemForm({
                        ...systemForm,
                        managerName: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    placeholder="المهندس مثنى رمضان"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    توصيف التخصصات والمراحل (أسفل الشعار)
                  </label>
                  <input
                    type="text"
                    value={systemForm.subtextBelowLogo || ""}
                    onChange={(e) =>
                      setSystemForm({
                        ...systemForm,
                        subtextBelowLogo: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    placeholder="رياضيات - فيزياء - كيمياء - تخصص هندسي - رسم هندسي"
                  />
                </div>
              </div>
            </div>

            {/* Card 2: Logo Uploader */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-xs border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                <CloudUpload className="w-4 h-4 text-blue-600" />
                <h3 className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                  شعار الأكاديمية
                </h3>
              </div>
              <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl h-36 flex flex-col items-center justify-center bg-slate-50/60 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer relative overflow-hidden group">
                {systemForm.logoUrl ? (
                  <img
                    src={systemForm.logoUrl}
                    alt="Logo"
                    className="h-full w-full object-contain p-2"
                  />
                ) : (
                  <>
                    <CloudUpload className="w-8 h-8 text-slate-400 group-hover:text-blue-500 transition-colors mb-1" />
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                      اسحب الشعار هنا
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5">
                      أو انقر للاستعراض
                    </span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (event) =>
                        setSystemForm({
                          ...systemForm,
                          logoUrl: event.target?.result as string,
                        });
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </div>
              <p className="text-[10px] text-slate-400 text-center font-medium">
                PNG أو JPG بخلفية شفافة (الحد الأقصى 2MB)
              </p>
            </div>
          </div>

          {/* Card 3: Contact & Report Footer Info */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-xs border border-slate-200/80 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                  معلومات التواصل وتذييل التقارير
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  أرقام التواصل والبريد والنص المطبوع أسفل التقارير والاختبارات
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  الهاتف الأساسي
                </label>
                <input
                  type="text"
                  value={systemForm.primaryContactNumber || ""}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9+ ]/g, "");
                    setSystemForm({
                      ...systemForm,
                      primaryContactNumber: val,
                    });
                  }}
                  className="w-full px-3 py-2 text-xs font-mono font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  dir="ltr"
                  placeholder="+966 50 000 0000"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  الهاتف الإضافي
                </label>
                <input
                  type="text"
                  value={systemForm.additionalContactNumber || ""}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9+ ]/g, "");
                    setSystemForm({
                      ...systemForm,
                      additionalContactNumber: val,
                    });
                  }}
                  className="w-full px-3 py-2 text-xs font-mono font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  dir="ltr"
                  placeholder="+966 55 000 0000"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  البريد الإلكتروني
                </label>
                <input
                  type="email"
                  value={systemForm.email || ""}
                  onChange={(e) =>
                    setSystemForm({
                      ...systemForm,
                      email: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 text-xs font-mono font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  dir="ltr"
                  placeholder="admin@edutech.com"
                />
              </div>

              <div className="md:col-span-3 space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  تذييل التقارير وحقوق الطبع والملاحظات
                </label>
                <input
                  type="text"
                  value={systemForm.reportFooter || ""}
                  onChange={(e) =>
                    setSystemForm({
                      ...systemForm,
                      reportFooter: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  placeholder="© 2026 جميع الحقوق محفوظة لمعهد المثنى لطلاب الهندسة"
                />
              </div>
            </div>
          </div>

          {/* Integrated Compact Save Action Bar */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
              <Info className="w-4 h-4 text-blue-500 shrink-0" />
              <span>
                تطبق هذه التغييرات فوراً على كافة الترويسات والتقارير المطبوعة.
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setSystemForm(settings)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition cursor-pointer"
              >
                إلغاء التعديلات
              </button>
              <button
                type="button"
                onClick={() => handleSaveSettingsAndNotify()}
                className="px-6 py-2 text-xs font-extrabold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-600/20 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>حفظ التعديلات</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === "appearance" && (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
          {/* Top Header Card */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-xs border border-slate-200/80 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-pink-100 dark:bg-pink-950/60 text-pink-600 dark:text-pink-400">
                <Palette className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span>تغيير سمة التطبيق (Theme)</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mt-0.5">
                  اختر المظهر المفضّل واضبط ألوان الواجهة بالتخصيص مع انتقال
                  تدريجي سلس للعين.
                </p>
              </div>
            </div>

            {/* Current Account Link Badge */}
            <div className="flex items-center gap-2 bg-sky-50 dark:bg-sky-950/50 border border-sky-200/80 dark:border-sky-800/80 text-sky-700 dark:text-sky-300 px-3.5 py-1.5 rounded-full text-xs font-black self-start md:self-auto shrink-0 shadow-2xs">
              <UserCheck className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <span>
                مربوط بحساب: {currentUser?.name || "المهندس مثنى رمضان"}
              </span>
            </div>
          </div>

          {/* Dynamic Theme Features Banner */}
          {systemForm.themePreset === "emerald_green" ? (
            <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white p-5 rounded-2xl border border-emerald-700 shadow-md relative overflow-hidden transition-all duration-300">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-2 max-w-3xl">
                  <div className="flex items-center gap-2 text-sm font-extrabold text-emerald-200">
                    <Palette className="w-5 h-5 text-emerald-300 shrink-0" />
                    <span>
                      السمة الزمردية الأكاديمية (Professional Emerald Theme)
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed text-emerald-100 font-medium">
                    تعتمد على خلفية ناصعة مائلة للمينت الخفيف جداً مع تفاصيل زمردية راقية وأزرار تفاعلية واضحة، صُممت خصيصاً لتوفير راحة بصرية فائقة للأنظمة الأكاديمية والمناهج الهندسية.
                  </p>
                </div>
                <div className="self-start md:self-auto shrink-0 bg-emerald-950/70 text-emerald-200 border border-emerald-600 px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-xs">
                  <span>✨ مظهر أكاديمي زمردي</span>
                </div>
              </div>
            </div>
          ) : systemForm.themePreset === "classic_blue" ? (
            <div className="bg-gradient-to-r from-blue-900 to-indigo-950 text-white p-5 rounded-2xl border border-blue-700 shadow-md relative overflow-hidden transition-all duration-300">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-2 max-w-3xl">
                  <div className="flex items-center gap-2 text-sm font-extrabold text-blue-200">
                    <Palette className="w-5 h-5 text-blue-300 shrink-0" />
                    <span>
                      سمة الأزرق المكتبي (Classic Office Blue Theme)
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed text-blue-100 font-medium">
                    تعتمد على خلفية ناصعة مع مسحة ثلجية منعشة وتفاصيل زرقاء ملكية رصينة، تعزز التركيز والإنتاجية أثناء إعداد وتوليد الاختبارات ومراجعة المسائل الرياضية.
                  </p>
                </div>
                <div className="self-start md:self-auto shrink-0 bg-blue-950/70 text-blue-200 border border-blue-600 px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-xs">
                  <span>✨ النمط الأزرق المكتبي</span>
                </div>
              </div>
            </div>
          ) : systemForm.themePreset === "warm_professional" ? (
            <div className="bg-gradient-to-r from-amber-900 to-stone-900 text-white p-5 rounded-2xl border border-amber-700/60 shadow-md relative overflow-hidden transition-all duration-300">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-2 max-w-3xl">
                  <div className="flex items-center gap-2 text-sm font-extrabold text-amber-200">
                    <Palette className="w-5 h-5 text-amber-300 shrink-0" />
                    <span>
                      السمة العاجية الدافئة (Warm Professional Ivory Theme)
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed text-amber-100 font-medium">
                    تعتمد على خلفية عاجية دافئة مريحة للعين وخالية من البرودة، مع بطاقات ناصعة وألوان تباين متوازنة مستوحاة من بيئة العمل الأكاديمية والطباعة الورقية الفاخرة.
                  </p>
                </div>
                <div className="self-start md:self-auto shrink-0 bg-stone-950/70 text-amber-200 border border-amber-600/60 px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-xs">
                  <span>✨ سمة عاجية دافئة</span>
                </div>
              </div>
            </div>
          ) : systemForm.themePreset === "dark" ||
            (systemForm.themeMode === "dark" && !systemForm.themePreset) ? (
            <div className="bg-[#0b132b] dark:bg-slate-950 text-white p-5 rounded-2xl border border-slate-800 shadow-md relative overflow-hidden transition-all duration-300">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-2 max-w-3xl">
                  <div className="flex items-center gap-2 text-sm font-extrabold text-blue-300">
                    <Monitor className="w-5 h-5 text-blue-400 shrink-0" />
                    <span>
                      السمة الداكنة الاحترافية (Eye-Friendly Charcoal Dark Mode)
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-300 font-medium">
                    تعتمد على درجات الفحم والنيلي العميق المريح للرؤية الليلية بدلاً من السواد القاتم، مع تباين عالي الجودة لعرض الرموز الرياضية والأسئلة بدقة فائقة.
                  </p>
                </div>
                <div className="self-start md:self-auto shrink-0 bg-slate-800/90 text-blue-300 border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-xs">
                  <span>✨ راحة للعين أثناء العمل الليلي</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white p-5 rounded-2xl border border-slate-700 shadow-md relative overflow-hidden transition-all duration-300">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-2 max-w-3xl">
                  <div className="flex items-center gap-2 text-sm font-extrabold text-sky-300">
                    <Sun className="w-5 h-5 text-sky-400 shrink-0" />
                    <span>السمة الفاتحة القياسية (Standard High-Contrast Light)</span>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-300 font-medium">
                    الواجهة القياسية ذات التباين الواضح والبطاقات البيضاء النظيفة، مثالية للعمل اليومي المكتبي والمراجعة الدقيقة للنصوص والرسوم التوضيحية.
                  </p>
                </div>
                <div className="self-start md:self-auto shrink-0 bg-slate-800/90 text-sky-300 border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-xs">
                  <span>✨ النمط الفاتح المعتمد</span>
                </div>
              </div>
            </div>
          )}

          {/* 5 Theme Options Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {/* 1. السمة الزمردية الأكاديمية */}
            <button
              type="button"
              onClick={() => {
                const updated = {
                  ...systemForm,
                  themeMode: "light" as const,
                  themePreset: "emerald_green" as const,
                  primaryColorHex: "#059669",
                  syncWithOs: false,
                };
                handleSaveSettingsAndNotify(updated);
              }}
              className={`p-3.5 rounded-2xl border-2 text-right transition-all flex flex-col justify-between gap-3 cursor-pointer relative overflow-hidden ${
                systemForm.themePreset === "emerald_green"
                  ? "border-emerald-600 bg-white dark:bg-slate-900 shadow-md ring-2 ring-emerald-500/20 scale-[1.01]"
                  : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700"
              }`}
            >
              {/* Card Preview Mock */}
              <div className="w-full h-24 rounded-xl bg-[#f4faf7] p-2 border border-emerald-200 flex flex-col gap-1.5">
                <div className="w-full h-4 rounded-md bg-gradient-to-r from-emerald-600 to-teal-700 flex items-center justify-between px-2">
                  <div className="w-10 h-1.5 rounded-full bg-white/80"></div>
                  <div className="w-2 h-2 rounded-full bg-white"></div>
                </div>
                <div className="flex-1 grid grid-cols-3 gap-1.5">
                  <div className="col-span-1 rounded-md bg-white border border-emerald-100 p-1 space-y-1">
                    <div className="w-full h-1.5 rounded bg-emerald-600"></div>
                    <div className="w-3/4 h-1.5 rounded bg-emerald-300"></div>
                  </div>
                  <div className="col-span-2 rounded-md bg-white border border-emerald-200 p-1 space-y-1">
                    <div className="w-full h-1.5 rounded bg-emerald-600"></div>
                    <div className="w-2/3 h-1 rounded bg-emerald-100"></div>
                  </div>
                </div>
              </div>

              {/* Title & Radio */}
              <div className="flex items-center justify-between gap-1.5 pt-1">
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-black text-slate-900 dark:text-white truncate">
                    السمة الزمردية
                  </span>
                  <span className="text-[10px] text-emerald-600 font-bold">
                    مينت خفيف + زمردي
                  </span>
                </div>
                <div
                  className={`w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                    systemForm.themePreset === "emerald_green"
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : "border-slate-300 dark:border-slate-600 bg-transparent"
                  }`}
                >
                  {systemForm.themePreset === "emerald_green" && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                  )}
                </div>
              </div>
            </button>

            {/* 2. سمة الأزرق المكتبي */}
            <button
              type="button"
              onClick={() => {
                const updated = {
                  ...systemForm,
                  themeMode: "light" as const,
                  themePreset: "classic_blue" as const,
                  primaryColorHex: "#2563eb",
                  syncWithOs: false,
                };
                handleSaveSettingsAndNotify(updated);
              }}
              className={`p-3.5 rounded-2xl border-2 text-right transition-all flex flex-col justify-between gap-3 cursor-pointer relative overflow-hidden ${
                systemForm.themePreset === "classic_blue"
                  ? "border-blue-600 bg-white dark:bg-slate-900 shadow-md ring-2 ring-blue-500/20 scale-[1.01]"
                  : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700"
              }`}
            >
              {/* Card Preview Mock */}
              <div className="w-full h-24 rounded-xl bg-[#f3f7fd] p-2 border border-blue-200 flex flex-col gap-1.5">
                <div className="w-full h-4 rounded-md bg-gradient-to-r from-blue-700 to-blue-800 flex items-center justify-between px-2">
                  <div className="w-10 h-1.5 rounded-full bg-white/80"></div>
                  <div className="w-2 h-2 rounded-full bg-white"></div>
                </div>
                <div className="flex-1 grid grid-cols-3 gap-1.5">
                  <div className="col-span-1 rounded-md bg-white border border-blue-100 p-1 space-y-1">
                    <div className="w-full h-1.5 rounded bg-blue-600"></div>
                    <div className="w-3/4 h-1.5 rounded bg-blue-300"></div>
                  </div>
                  <div className="col-span-2 rounded-md bg-white border border-blue-200 p-1 space-y-1">
                    <div className="w-full h-1.5 rounded bg-blue-600"></div>
                    <div className="w-2/3 h-1 rounded bg-blue-100"></div>
                  </div>
                </div>
              </div>

              {/* Title & Radio */}
              <div className="flex items-center justify-between gap-1.5 pt-1">
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-black text-slate-900 dark:text-white truncate">
                    الأزرق المكتبي
                  </span>
                  <span className="text-[10px] text-blue-600 font-bold">
                    ثلجي خفيف + ملكي
                  </span>
                </div>
                <div
                  className={`w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                    systemForm.themePreset === "classic_blue"
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-slate-300 dark:border-slate-600 bg-transparent"
                  }`}
                >
                  {systemForm.themePreset === "classic_blue" && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                  )}
                </div>
              </div>
            </button>

            {/* 3. السمة العاجية الدافئة */}
            <button
              type="button"
              onClick={() => {
                const updated = {
                  ...systemForm,
                  themeMode: "light" as const,
                  themePreset: "warm_professional" as const,
                  primaryColorHex: "#0d9488",
                  syncWithOs: false,
                };
                handleSaveSettingsAndNotify(updated);
              }}
              className={`p-3.5 rounded-2xl border-2 text-right transition-all flex flex-col justify-between gap-3 cursor-pointer relative overflow-hidden ${
                systemForm.themePreset === "warm_professional"
                  ? "border-teal-700 bg-white dark:bg-slate-900 shadow-md ring-2 ring-teal-500/20 scale-[1.01]"
                  : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700"
              }`}
            >
              {/* Card Preview Mock */}
              <div className="w-full h-24 rounded-xl bg-[#faf7f2] p-2 border border-stone-300 flex flex-col gap-1.5">
                <div className="w-full h-4 rounded-md bg-gradient-to-r from-teal-800 to-stone-800 flex items-center justify-between px-2">
                  <div className="w-10 h-1.5 rounded-full bg-white/80"></div>
                  <div className="w-2 h-2 rounded-full bg-amber-200"></div>
                </div>
                <div className="flex-1 grid grid-cols-3 gap-1.5">
                  <div className="col-span-1 rounded-md bg-white border border-stone-200 p-1 space-y-1">
                    <div className="w-full h-1.5 rounded bg-teal-700"></div>
                    <div className="w-3/4 h-1.5 rounded bg-stone-300"></div>
                  </div>
                  <div className="col-span-2 rounded-md bg-white border border-stone-200 p-1 space-y-1">
                    <div className="w-full h-1.5 rounded bg-teal-700"></div>
                    <div className="w-2/3 h-1 rounded bg-amber-100"></div>
                  </div>
                </div>
              </div>

              {/* Title & Radio */}
              <div className="flex items-center justify-between gap-1.5 pt-1">
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-black text-slate-900 dark:text-white truncate">
                    العاجية الدافئة
                  </span>
                  <span className="text-[10px] text-teal-700 dark:text-teal-400 font-bold">
                    عاجي مريح + تيل
                  </span>
                </div>
                <div
                  className={`w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                    systemForm.themePreset === "warm_professional"
                      ? "border-teal-700 bg-teal-700 text-white"
                      : "border-slate-300 dark:border-slate-600 bg-transparent"
                  }`}
                >
                  {systemForm.themePreset === "warm_professional" && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                  )}
                </div>
              </div>
            </button>

            {/* 4. السمة الفاتحة القياسية */}
            <button
              type="button"
              onClick={() => {
                const updated = {
                  ...systemForm,
                  themeMode: "light" as const,
                  themePreset: "light" as const,
                  primaryColorHex: "#0f6cbd",
                  syncWithOs: false,
                };
                handleSaveSettingsAndNotify(updated);
              }}
              className={`p-3.5 rounded-2xl border-2 text-right transition-all flex flex-col justify-between gap-3 cursor-pointer relative overflow-hidden ${
                (systemForm.themePreset === "light" ||
                  (!systemForm.themePreset &&
                    systemForm.themeMode === "light")) &&
                !systemForm.syncWithOs
                  ? "border-blue-600 bg-white dark:bg-slate-900 shadow-md ring-2 ring-blue-500/20 scale-[1.01]"
                  : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700"
              }`}
            >
              {/* Card Preview Mock */}
              <div className="w-full h-24 rounded-xl bg-slate-50 dark:bg-slate-800 p-2 border border-slate-200 flex flex-col gap-1.5">
                <div className="w-full h-4 rounded-md bg-slate-200 dark:bg-slate-700 flex items-center justify-between px-2">
                  <div className="w-10 h-1.5 rounded-full bg-slate-400"></div>
                  <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                </div>
                <div className="flex-1 grid grid-cols-3 gap-1.5">
                  <div className="col-span-1 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-1 space-y-1">
                    <div className="w-full h-1.5 rounded bg-blue-600"></div>
                    <div className="w-3/4 h-1.5 rounded bg-slate-300"></div>
                  </div>
                  <div className="col-span-2 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-1 space-y-1">
                    <div className="w-full h-1.5 rounded bg-blue-600"></div>
                    <div className="w-2/3 h-1 rounded bg-slate-200"></div>
                  </div>
                </div>
              </div>

              {/* Title & Radio */}
              <div className="flex items-center justify-between gap-1.5 pt-1">
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-black text-slate-900 dark:text-white truncate">
                    الفاتحة القياسية
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">
                    تباين ناصع محايد
                  </span>
                </div>
                <div
                  className={`w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                    (systemForm.themePreset === "light" ||
                      (!systemForm.themePreset &&
                        systemForm.themeMode === "light")) &&
                    !systemForm.syncWithOs
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-slate-300 dark:border-slate-600 bg-transparent"
                  }`}
                >
                  {(systemForm.themePreset === "light" ||
                    (!systemForm.themePreset &&
                      systemForm.themeMode === "light")) &&
                    !systemForm.syncWithOs && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                    )}
                </div>
              </div>
            </button>

            {/* 5. السمة الداكنة الاحترافية */}
            <button
              type="button"
              onClick={() => {
                const updated = {
                  ...systemForm,
                  themeMode: "dark" as const,
                  themePreset: "dark" as const,
                  primaryColorHex: "#3b82f6",
                  syncWithOs: false,
                };
                handleSaveSettingsAndNotify(updated);
              }}
              className={`p-3.5 rounded-2xl border-2 text-right transition-all flex flex-col justify-between gap-3 cursor-pointer relative overflow-hidden ${
                systemForm.themePreset === "dark" ||
                (systemForm.themeMode === "dark" &&
                  !systemForm.themePreset &&
                  !systemForm.syncWithOs)
                  ? "border-blue-500 bg-slate-900 text-white shadow-md ring-2 ring-blue-500/20 scale-[1.01]"
                  : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700"
              }`}
            >
              {/* Card Preview Mock */}
              <div className="w-full h-24 rounded-xl bg-[#090d16] p-2 border border-slate-800 flex flex-col gap-1.5">
                <div className="w-full h-4 rounded-md bg-slate-900 flex items-center justify-between px-2">
                  <div className="w-10 h-1.5 rounded-full bg-slate-700"></div>
                  <div className="w-2 h-2 rounded-full bg-slate-700"></div>
                </div>
                <div className="flex-1 grid grid-cols-3 gap-1.5">
                  <div className="col-span-1 rounded-md bg-slate-900 p-1 space-y-1">
                    <div className="w-full h-1.5 rounded bg-blue-500"></div>
                    <div className="w-3/4 h-1.5 rounded bg-slate-700"></div>
                  </div>
                  <div className="col-span-2 rounded-md bg-slate-900/90 border border-slate-800 p-1 space-y-1">
                    <div className="w-full h-1.5 rounded bg-blue-500"></div>
                    <div className="w-2/3 h-1 rounded bg-slate-800"></div>
                  </div>
                </div>
              </div>

              {/* Title & Radio */}
              <div className="flex items-center justify-between gap-1.5 pt-1">
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-black text-slate-900 dark:text-white truncate">
                    الداكنة الاحترافية
                  </span>
                  <span className="text-[10px] text-blue-400 font-bold">
                    فحم عميق + راحة للعين
                  </span>
                </div>
                <div
                  className={`w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                    systemForm.themePreset === "dark" ||
                    (systemForm.themeMode === "dark" &&
                      !systemForm.themePreset &&
                      !systemForm.syncWithOs)
                      ? "border-blue-500 bg-blue-600 text-white"
                      : "border-slate-300 dark:border-slate-600 bg-transparent"
                  }`}
                >
                  {(systemForm.themePreset === "dark" ||
                    (systemForm.themeMode === "dark" &&
                      !systemForm.themePreset &&
                      !systemForm.syncWithOs)) && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                  )}
                </div>
              </div>
            </button>
          </div>

          {/* OS Sync Row */}
          <div className="bg-slate-50/80 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                مزامنة سمة التطبيق مع إعدادات نظام التشغيل (Windows/macOS)
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold">
                يتغير المظهر تلقائياً حسب وضع جهازك الداكن أو الفاتح
              </p>
            </div>

            {/* Switch Toggle Button */}
            <button
              type="button"
              onClick={() => {
                const nextSync = !systemForm.syncWithOs;
                const updated = {
                  ...systemForm,
                  syncWithOs: nextSync,
                  themeMode: nextSync
                    ? ("system" as const)
                    : systemForm.themeMode,
                };
                handleSaveSettingsAndNotify(updated);
              }}
              className={`w-12 h-6.5 rounded-full p-1 transition-colors duration-200 ease-in-out cursor-pointer shrink-0 ${
                systemForm.syncWithOs || systemForm.themeMode === "system"
                  ? "bg-blue-600"
                  : "bg-slate-300 dark:bg-slate-700"
              }`}
            >
              <div
                className={`w-4.5 h-4.5 rounded-full bg-white shadow-md transform transition-transform duration-200 ease-in-out ${
                  systemForm.syncWithOs || systemForm.themeMode === "system"
                    ? "translate-x-0"
                    : "-translate-x-5"
                }`}
              />
            </button>
          </div>

          {/* Advanced Manual Color Button */}
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => setShowAdvancedColors(!showAdvancedColors)}
              className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200 text-xs font-black transition-all cursor-pointer shadow-2xs flex items-center gap-2"
            >
              <Palette className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>تخصيص الألوان يدوياً (متقدم)</span>
              {showAdvancedColors ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>
          </div>

          {/* Advanced Hex Color Pickers Panel */}
          {showAdvancedColors && (
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 animate-in fade-in duration-200">
              <h4 className="text-xs font-black text-slate-900 dark:text-white">
                ضبط قيم الألوان الستعشرية (Hex Custom Color Pickers)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    اللون الرئيسي (Primary)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={systemForm.primaryColorHex || "#2563eb"}
                      onChange={(e) => {
                        const updated = {
                          ...systemForm,
                          primaryColorHex: e.target.value,
                        };
                        setSystemForm(updated);
                        onSaveSettings(updated);
                      }}
                      className="w-9 h-9 rounded-lg border border-slate-300 dark:border-slate-700 cursor-pointer p-0.5"
                    />
                    <input
                      type="text"
                      value={systemForm.primaryColorHex || "#2563eb"}
                      onChange={(e) => {
                        const updated = {
                          ...systemForm,
                          primaryColorHex: e.target.value,
                        };
                        setSystemForm(updated);
                        onSaveSettings(updated);
                      }}
                      className="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    اللون الثانوي (Secondary)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={systemForm.secondaryColorHex || "#475569"}
                      onChange={(e) => {
                        const updated = {
                          ...systemForm,
                          secondaryColorHex: e.target.value,
                        };
                        setSystemForm(updated);
                        onSaveSettings(updated);
                      }}
                      className="w-9 h-9 rounded-lg border border-slate-300 dark:border-slate-700 cursor-pointer p-0.5"
                    />
                    <input
                      type="text"
                      value={systemForm.secondaryColorHex || "#475569"}
                      onChange={(e) => {
                        const updated = {
                          ...systemForm,
                          secondaryColorHex: e.target.value,
                        };
                        setSystemForm(updated);
                        onSaveSettings(updated);
                      }}
                      className="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    لون التميز (Accent)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={systemForm.accentColorHex || "#f59e0b"}
                      onChange={(e) => {
                        const updated = {
                          ...systemForm,
                          accentColorHex: e.target.value,
                        };
                        setSystemForm(updated);
                        onSaveSettings(updated);
                      }}
                      className="w-9 h-9 rounded-lg border border-slate-300 dark:border-slate-700 cursor-pointer p-0.5"
                    />
                    <input
                      type="text"
                      value={systemForm.accentColorHex || "#f59e0b"}
                      onChange={(e) => {
                        const updated = {
                          ...systemForm,
                          accentColorHex: e.target.value,
                        };
                        setSystemForm(updated);
                        onSaveSettings(updated);
                      }}
                      className="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Footer Buttons */}
          <div className="pt-4 flex items-center justify-start gap-3">
            <button
              type="button"
              onClick={() => handleSaveSettingsAndNotify()}
              className="px-7 py-3 rounded-2xl text-xs font-black text-white bg-blue-700 hover:bg-blue-800 shadow-md shadow-blue-700/20 active:scale-95 transition-all cursor-pointer flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>حفظ الإعدادات</span>
            </button>
            <button
              type="button"
              onClick={() => setSystemForm(settings)}
              className="px-6 py-3 rounded-2xl text-xs font-black text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all cursor-pointer"
            >
              <span>إلغاء التغييرات</span>
            </button>
          </div>
        </div>
      )}

      {activeSubTab === "about" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-xs border border-slate-200/80 dark:border-slate-800 space-y-4 h-fit">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                <Info className="w-5 h-5" />
              </div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                معلومات الإصدار والمطور
              </h2>
            </div>
            <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 space-y-3 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-700/60">
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  الإصدار الحالي:
                </span>
                <span className="font-mono text-slate-900 dark:text-white font-black bg-blue-100 dark:bg-blue-900/40 px-2.5 py-0.5 rounded-md text-[11px]">
                  v1.0.0 (Build 2026)
                </span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-700/60">
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  نظام التشغيل:
                </span>
                <span className="text-slate-600 dark:text-slate-400 font-medium">
                  Web / Chrome / Edge
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  الدعم الفني:
                </span>
                <a
                  href="#"
                  className="text-blue-600 dark:text-blue-400 hover:underline font-bold"
                >
                  support@edutech.com
                </a>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-xs border border-slate-200/80 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                  إدارة التراخيص (Licensing)
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  إدارة حالة النسخة ومفتاح التفعيل الخاص ببرنامجك
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  حالة النسخة الحالية:
                </span>
                <span
                  className={`px-2.5 py-1 rounded-lg font-extrabold text-xs ${
                    settings.licenseStatus === "active"
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                      : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                  }`}
                >
                  {settings.licenseStatus === "active"
                    ? "مرخصة رسمياً (دائمة)"
                    : "نسخة تجريبية (Trial)"}
                </span>
              </div>
              {settings.licenseStatus === "trial" && (
                <div className="text-amber-600 dark:text-amber-400 text-[11px] pt-1.5 font-bold">
                  متبقي {settings.trialDaysLeft} يوماً على انتهاء الفترة
                  التجريبية.
                </div>
              )}
            </div>

            <form onSubmit={handleActivateLicense} className="space-y-3">
              <div className="space-y-1">
                <label className="block font-bold text-slate-700 dark:text-slate-300 text-xs">
                  مفتاح التفعيل (License Key)
                </label>
                <input
                  type="text"
                  required
                  placeholder="XXXX-XXXX-XXXX-XXXX"
                  value={licenseKeyInput}
                  onChange={(e) => setLicenseKeyInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono"
                  dir="ltr"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Key className="w-4 h-4" />
                <span>تفعيل النسخة</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {activeSubTab === "users" && (
        <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-2xl shadow-sm space-y-6 animate-in fade-in zoom-in-95 duration-200">
          {/* Section Title & Add Button */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2 mb-1">
                <Users className="w-6 h-6 text-blue-600" />
                <span>إدارة المستخدمين والصلاحيات (RBAC)</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
                التحكم الكامل بالحسابات والأدوار، إعادة الترتيب، الحذف، التعديل
                وتعيين الصلاحيات لضمان أمان النظام.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                window.dispatchEvent(
                  new CustomEvent("navigate-tab", { detail: "user-profile" }),
                );
                setTimeout(() => {
                  window.dispatchEvent(
                    new CustomEvent("create-new-user-request"),
                  );
                }, 50);
              }}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-extrabold rounded-xl transition shadow-sm flex items-center gap-2 shrink-0 text-xs sm:text-sm cursor-pointer"
            >
              <UserCheck className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>+ إضافة مستخدم جديد وتحديد الصلاحيات</span>
            </button>
          </div>

          {/* Quick Stats Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 rounded-xl p-3.5 flex items-center justify-between">
              <span className="text-xs font-extrabold text-blue-800 dark:text-blue-300">
                إجمالي الحسابات
              </span>
              <span className="text-lg font-black text-blue-700 dark:text-blue-400">
                {users.length}
              </span>
            </div>
            <div className="bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 rounded-xl p-3.5 flex items-center justify-between">
              <span className="text-xs font-extrabold text-emerald-800 dark:text-emerald-300">
                الحسابات النشطة
              </span>
              <span className="text-lg font-black text-emerald-700 dark:text-emerald-400">
                {users.filter((u) => u.status === "active").length}
              </span>
            </div>
            <div className="bg-purple-50/60 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/50 rounded-xl p-3.5 flex items-center justify-between">
              <span className="text-xs font-extrabold text-purple-800 dark:text-purple-300">
                مسؤولو النظام (Admins)
              </span>
              <span className="text-lg font-black text-purple-700 dark:text-purple-400">
                {users.filter((u) => u.role === "admin").length}
              </span>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col md:flex-row items-center gap-3 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute right-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="ابحث باسم المستخدم، البريد، أو اسم الحساب..."
                value={userSearchTerm}
                onChange={(e) => setUserSearchTerm(e.target.value)}
                className="w-full pr-9 pl-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
              <Filter className="w-4 h-4 text-slate-400 shrink-0" />
              <select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
                className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs font-bold py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-sm w-full md:w-auto"
              >
                <option value="all">جميع الأدوار</option>
                <option value="admin">مسؤول النظام (Admin)</option>
                <option value="teacher">أستاذ (Teacher)</option>
                <option value="supervisor">مشرف (Supervisor)</option>
                <option value="data_entry">مدخل بيانات (Data Entry)</option>
              </select>
            </div>
          </div>

          {/* RBAC Users Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700 text-xs">
                <tr>
                  <th className="px-3 py-3.5 text-center w-16">الترتيب</th>
                  <th className="px-4 py-3.5">اسم المستخدم</th>
                  <th className="px-4 py-3.5">الدور (Role)</th>
                  <th className="px-4 py-3.5">ملخص الصلاحيات</th>
                  <th className="px-4 py-3.5">حالة الحساب</th>
                  <th className="px-4 py-3.5 text-center">
                    أزرار التحكم والإجراءات
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                {users
                  .filter((u) => {
                    const matchesSearch =
                      !userSearchTerm ||
                      u.name
                        .toLowerCase()
                        .includes(userSearchTerm.toLowerCase()) ||
                      u.email
                        .toLowerCase()
                        .includes(userSearchTerm.toLowerCase()) ||
                      (u.username &&
                        u.username
                          .toLowerCase()
                          .includes(userSearchTerm.toLowerCase()));
                    const matchesRole =
                      userRoleFilter === "all" || u.role === userRoleFilter;
                    return matchesSearch && matchesRole;
                  })
                  .map((u, filteredIdx) => {
                    const actualIdx = users.findIndex(
                      (userItem) => userItem.id === u.id,
                    );
                    return (
                      <tr
                        key={u.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        {/* Order & Reorder Controls */}
                        <td className="px-3 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                if (actualIdx > 0) {
                                  const updated = [...users];
                                  const [moved] = updated.splice(actualIdx, 1);
                                  updated.splice(actualIdx - 1, 0, moved);
                                  if (onReorderUsers) onReorderUsers(updated);
                                }
                              }}
                              disabled={actualIdx === 0}
                              className="p-1 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-30 text-slate-600 dark:text-slate-300 transition"
                              title="تحريك للأعلى"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <span className="text-xs font-bold text-slate-400 w-4 text-center">
                              {actualIdx + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                if (actualIdx < users.length - 1) {
                                  const updated = [...users];
                                  const [moved] = updated.splice(actualIdx, 1);
                                  updated.splice(actualIdx + 1, 0, moved);
                                  if (onReorderUsers) onReorderUsers(updated);
                                }
                              }}
                              disabled={actualIdx === users.length - 1}
                              className="p-1 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-30 text-slate-600 dark:text-slate-300 transition"
                              title="تحريك للأأسفل"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>

                        {/* User Name & Details */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-black flex items-center justify-center text-xs shrink-0 border border-blue-200/50 dark:border-blue-800/50">
                              {u.name.substring(0, 2)}
                            </div>
                            <div>
                              <div className="font-black text-slate-900 dark:text-white text-xs sm:text-sm">
                                {u.name}
                              </div>
                              <div className="text-[11px] text-slate-500 font-mono mt-0.5 flex items-center gap-1.5">
                                <span>{u.email}</span>
                                {u.username && (
                                  <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded text-[10px]">
                                    @{u.username}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Role Badge */}
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-black ${
                              u.role === "admin"
                                ? "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border border-purple-200/50 dark:border-purple-800/50"
                                : u.role === "teacher"
                                  ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/50"
                                  : u.role === "supervisor"
                                    ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200/50 dark:border-amber-800/50"
                                    : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                            }`}
                          >
                            {u.role === "admin"
                              ? "مسؤول النظام (Admin)"
                              : u.role === "teacher"
                                ? "أستاذ (Teacher)"
                                : u.role === "supervisor"
                                  ? "مشرف (Supervisor)"
                                  : "مدخل بيانات"}
                          </span>
                        </td>

                        {/* Permissions Overview */}
                        <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400 max-w-xs">
                          {u.role === "admin" ? (
                            <span className="text-purple-600 dark:text-purple-400 font-extrabold flex items-center gap-1">
                              <ShieldCheck className="w-3.5 h-3.5" />
                              كامل صلاحيات النظام
                            </span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {u.permissions?.questions !== false && (
                                <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded text-[10px] font-bold">
                                  الأسئلة
                                </span>
                              )}
                              {u.permissions?.exams !== false && (
                                <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded text-[10px] font-bold">
                                  الاختبارات
                                </span>
                              )}
                              {u.permissions?.curriculum !== false && (
                                <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded text-[10px] font-bold">
                                  المناهج
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Status Toggle Button */}
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => {
                              const updated: User = {
                                ...u,
                                status:
                                  u.status === "active" ? "disabled" : "active",
                              };
                              onSaveUser(updated);
                            }}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition shadow-2xs ${
                              u.status === "active"
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800"
                                : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                            }`}
                            title="انقر لتغيير حالة الحساب (نشط / معطل)"
                          >
                            <span
                              className={`w-2 h-2 rounded-full ${u.status === "active" ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`}
                            ></span>
                            <span>
                              {u.status === "active" ? "نشط" : "معطل"}
                            </span>
                          </button>
                        </td>

                        {/* Action Buttons */}
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Edit Button */}
                            <button
                              type="button"
                              onClick={() => {
                                window.dispatchEvent(
                                  new CustomEvent("navigate-tab", {
                                    detail: "user-profile",
                                  }),
                                );
                                setTimeout(() => {
                                  window.dispatchEvent(
                                    new CustomEvent("select-user-request", {
                                      detail: u.id,
                                    }),
                                  );
                                }, 50);
                              }}
                              className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:hover:bg-blue-900/60 dark:text-blue-300 rounded-lg text-xs font-bold transition flex items-center gap-1"
                              title="تعديل بيانات المستخدم والصلاحيات"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span className="hidden lg:inline">تعديل</span>
                            </button>

                            {/* Duplicate Button */}
                            <button
                              type="button"
                              onClick={() => {
                                const newId = `usr-${Date.now()}`;
                                const newUser: User = {
                                  ...u,
                                  id: newId,
                                  name: `${u.name} (نسخة)`,
                                  username: `${u.username || "user"}_copy_${Math.floor(Math.random() * 1000)}`,
                                  email: `copy_${Math.floor(Math.random() * 1000)}_${u.email}`,
                                };
                                onSaveUser(newUser);
                              }}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold transition flex items-center gap-1"
                              title="نسخ الحساب والصلاحيات لمستخدم جديد"
                            >
                              <Copy className="w-3.5 h-3.5" />
                              <span className="hidden lg:inline">نسخ</span>
                            </button>

                            {/* Delete Button */}
                            <button
                              type="button"
                              onClick={() => {
                                if (users.length <= 1) {
                                  openConfirm(
                                    "غير مسموح",
                                    "لا يمكن حذف المستخدم الوحيد في النظام.",
                                    () => {},
                                    false,
                                  );
                                  return;
                                }
                                openConfirm(
                                  "تأكيد حذف المستخدم",
                                  `هل أنت تأكد من رغبتك في حذف حساب المستخدم "${u.name}" (${u.email}) نهائياً؟`,
                                  () => {
                                    storage.deleteUser(u.id);
                                    if (onDeleteUser) onDeleteUser(u.id);
                                  },
                                  true,
                                );
                              }}
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 dark:text-rose-300 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer active:scale-95"
                              title="حذف هذا المستخدم من النظام"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span className="hidden lg:inline">حذف</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeSubTab === "backup" && (
        <div className="flex flex-col gap-4">
          {/* Information & Architecture Status Banner */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-xs border border-slate-200/80 dark:border-slate-800 space-y-3.5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-100 dark:border-slate-800">
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                  حالة التخزين والنسخ الاحتياطي
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  توضيح آلية حفظ البيانات وتصدير النسخ الاحتياطية
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-1">
                <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>التخزين التلقائي المحلي (Active)</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  يتم حفظ جميع التعديلات والإضافات تلقائياً وفورياً في ذاكرة المتصفح المحلية.
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-1">
                <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  <span>النسخة المستقلة الآمنة (Manual JSON)</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  لحماية البيانات من مسح سجل المتصفح، يُوصى بتصدير ملف <code className="font-mono text-blue-600 dark:text-blue-400 font-bold">JSON</code> يدويًا وحفظه خارجيًا.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 flex items-start gap-2.5 text-[11px] text-blue-900 dark:text-blue-200">
              <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <p>
                <strong>ملاحظة تقنية:</strong> النسخ التلقائي الخارجي المباشر إلى مجلد محدد على القرص الصلب سيتوفر مع إطلاق نسخة سطح المكتب <strong>(Electron Desktop Edition)</strong>.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Export Card */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-xs border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between gap-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="space-y-2">
                <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                    <Download className="w-5 h-5" />
                  </div>
                  <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                    تصدير نسخة احتياطية
                  </h2>
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">
                  تنزيل كافة بيانات المناهج والأسئلة والاختبارات والمستخدمين في
                  ملف واحد بصيغة JSON لحفظه أوفلاين.
                </p>
              </div>
              <button
                type="button"
                onClick={onExportBackup}
                className="w-full py-2.5 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 font-bold text-xs transition flex items-center justify-center gap-2 shadow-2xs cursor-pointer active:scale-95"
              >
                <Download className="w-4 h-4" />
                <span>تصدير ملف النسخة الاحتياطية الآن</span>
              </button>
            </div>

            {/* Restore Card */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-xs border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between gap-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="space-y-2">
                <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                    <Upload className="w-5 h-5" />
                  </div>
                  <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                    استعادة نسخة احتياطية (Restore)
                  </h2>
                </div>

                <div
                  className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-4 flex flex-col items-center justify-center text-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <CloudUpload className="w-8 h-8 text-slate-400 group-hover:text-blue-500 transition-colors mb-1" />
                  <p className="text-slate-700 dark:text-slate-300 font-bold text-xs">
                    {importFileContent
                      ? "تم اختيار الملف بنجاح."
                      : "انقر لاختيار ملف JSON لاستعادته"}
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={handleImportSubmit}
                disabled={!importFileContent}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-95"
              >
                <Upload className="w-4 h-4" />
                <span>استعادة البيانات الآن</span>
              </button>
            </div>
          </div>

          {/* Reset System Card */}
          <div className="bg-rose-50/70 dark:bg-rose-950/20 p-5 rounded-2xl border border-rose-200/80 dark:border-rose-900/30 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-right">
              <h3 className="font-extrabold text-rose-900 dark:text-rose-300 flex items-center gap-2 text-sm">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>إعادة ضبط المصنع وتصفير البيانات</span>
              </h3>
              <p className="text-rose-800/80 dark:text-rose-300/80 text-xs">
                مسح البيانات الحالية للتفريغ التام للبدء من جديد، أو استعادة
                بيانات العينة.
              </p>
            </div>
            <div className="flex items-center gap-2.5 shrink-0 w-full md:w-auto justify-end">
              <button
                type="button"
                onClick={() => {
                  const phrase = prompt("تحذير: سيتم تفريغ كافة البيانات للبدء من الصفر.\nللتأكيد، اكتب حرفياً: تأكيد إفراغ البيانات");
                  if (phrase) {
                    onEmptyDatabase(phrase);
                  }
                }}
                className="px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400 hover:bg-rose-100 font-extrabold text-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>إفراغ الشامل</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const phrase = prompt("تحذير: سيتم استعادة البيانات الافتراضية.\nللتأكيد، اكتب حرفياً: تأكيد استعادة الافتراضي");
                  if (phrase) {
                    onResetAllData(phrase);
                  }
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
              >
                <RefreshCw className="w-4 h-4" />
                <span>استعادة الافتراضي</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal.isOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
          dir="rtl"
        >
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-md w-full border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in duration-200">
            <div
              className={`p-6 border-b ${confirmModal.isDanger ? "border-red-100 dark:border-red-900/30" : "border-slate-100 dark:border-slate-800"}`}
            >
              <div className="flex items-center gap-3 mb-2">
                {confirmModal.isDanger ? (
                  <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                )}
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {confirmModal.title}
                </h3>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-4 leading-relaxed">
                {confirmModal.message}
              </p>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-end gap-3">
              <button
                onClick={closeConfirm}
                className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition"
              >
                {confirmModal.isDanger ? "تراجع" : "حسناً"}
              </button>
              {confirmModal.isDanger && (
                <button
                  onClick={() => {
                    confirmModal.onConfirm();
                    closeConfirm();
                  }}
                  className="px-6 py-2 rounded-xl font-bold text-white transition bg-red-600 hover:bg-red-700"
                >
                  تأكيد الإجراء
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      <UserModal
        isOpen={userModal.isOpen}
        user={userModal.user}
        allUsers={users}
        onClose={() => setUserModal({ isOpen: false, user: null })}
        onSave={(u) => {
          onSaveUser(u);
          setUserModal({ isOpen: false, user: null });
        }}
      />

      {/* Floating Save Success Toast */}
      {showSaveToast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-6 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 border border-emerald-500 animate-in fade-in slide-in-from-bottom-5 duration-200">
          <CheckCircle2 className="w-5 h-5 text-white shrink-0" />
          <span className="text-xs font-black">
            تم حفظ الإعدادات وتطبيق السمة بنجاح على كامل النظام!
          </span>
        </div>
      )}
    </div>
  );
};
