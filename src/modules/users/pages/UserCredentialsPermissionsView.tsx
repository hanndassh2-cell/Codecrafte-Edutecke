import React, { useState, useEffect, useMemo } from "react";
import {
  Camera,
  Eye,
  EyeOff,
  BookOpen,
  Sparkles,
  ShieldCheck,
  User as UserIcon,
  Check,
  RotateCcw,
  AlertCircle,
  Save,
  UserPlus,
  ArrowRight,
  Trash2,
  Users,
  Search,
  Filter,
  History,
  Clock,
  KeyRound,
  Copy,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Layers,
  ShieldAlert,
} from "lucide-react";
import { User, UserRole, UserPermissions, AuditLog, Subject } from "../../../types/index";
import { storage } from "../../../services/storage";
import { repositories } from "../../../repositories";
import { createPasswordHashForUser, validatePasswordStrength } from "../../../utils/crypto";

interface UserCredentialsPermissionsViewProps {
  currentUser?: User;
  allUsers?: User[];
  onSaveUser?: (updatedUser: User) => void;
  onDeleteUser?: (id: string) => void;
  onReorderUsers?: (reorderedUsers: User[]) => void;
  onBackToSettings?: () => void;
}

const DEFAULT_PERMISSIONS: Record<UserRole, UserPermissions> = {
  admin: {
    curriculum: true,
    lessons: true,
    questions: true,
    exams: true,
    exports: true,
    reports: true,
    users: true,
    settings: true,
  },
  supervisor: {
    curriculum: true,
    lessons: true,
    questions: true,
    exams: true,
    exports: true,
    reports: true,
    users: false,
    settings: false,
  },
  teacher: {
    curriculum: false,
    lessons: true,
    questions: true,
    exams: true,
    exports: false,
    reports: false,
    users: false,
    settings: false,
  },
  reviewer: {
    curriculum: true,
    lessons: true,
    questions: true,
    exams: false,
    exports: false,
    reports: true,
    users: false,
    settings: false,
  },
  viewer: {
    curriculum: false,
    lessons: false,
    questions: false,
    exams: false,
    exports: false,
    reports: true,
    users: false,
    settings: false,
  },
};

export const UserCredentialsPermissionsView: React.FC<
  UserCredentialsPermissionsViewProps
> = ({
  currentUser: propsCurrentUser,
  allUsers: propsAllUsers,
  onSaveUser: propsOnSaveUser,
  onDeleteUser: propsOnDeleteUser,
  onBackToSettings,
}) => {
  const usersList = propsAllUsers || storage.getUsers();
  const activeCurrentUser =
    propsCurrentUser || storage.getCurrentUser() || usersList[0];

  const [activeTab, setActiveTab] = useState<"users" | "audit_log">("users");

  const userSavedUi = useMemo(() => storage.getUiState("user_credentials_ui", {
    selectedUserId: propsCurrentUser?.id || activeCurrentUser?.id || usersList[0]?.id || "usr-1",
  }), [propsCurrentUser, activeCurrentUser, usersList]);

  const [selectedUserId, setSelectedUserId] = useState<string>(
    propsCurrentUser?.id || userSavedUi.selectedUserId || activeCurrentUser?.id || usersList[0]?.id || "usr-1",
  );

  useEffect(() => {
    storage.saveUiState("user_credentials_ui", {
      selectedUserId,
    });
  }, [selectedUserId]);

  const [showPassword, setShowPassword] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  // User Form State
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("admin");
  const [status, setStatus] = useState<"active" | "disabled">("active");
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [allowedSubjectIds, setAllowedSubjectIds] = useState<string[]>([]);
  const [lastLoginAt, setLastLoginAt] = useState<string>("");

  const [permissions, setPermissions] = useState<UserPermissions>({
    curriculum: true,
    lessons: true,
    questions: true,
    exams: true,
    exports: true,
    reports: true,
    users: true,
    settings: true,
  });

  // Audit Log State
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditSearch, setAuditSearch] = useState("");
  const [auditResultFilter, setAuditResultFilter] = useState<"all" | "success" | "denied" | "error">("all");
  const [auditEntityFilter, setAuditEntityFilter] = useState<string>("all");

  const allSubjects = useMemo(() => storage.getSubjects(), []);

  const refreshAuditLogs = async () => {
    const logs = await repositories.auditLogs.getAll();
    setAuditLogs(logs);
  };

  useEffect(() => {
    refreshAuditLogs();
  }, [activeTab]);

  const handleCreateNewUser = () => {
    const draftId = `draft-${Date.now()}`;
    setSelectedUserId(draftId);
    setName("مستخدم جديد");
    setUsername(`user_${Math.floor(Math.random() * 1000)}`);
    setEmail(`user${Math.floor(Math.random() * 1000)}@edutech.edu`);
    setPassword("");
    setRole("teacher");
    setStatus("disabled");
    setAllowedSubjectIds([]);
    setLastLoginAt("");
    setPermissions({ ...DEFAULT_PERMISSIONS["teacher"] });
    setToastMessage(
      "تم فتح نموذج إضافة مستخدم جديد. يرجى تعيين كلمة مرور قوية (10+ محارف) والصلاحيات ثم الضغط على (حفظ).",
    );
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3500);
  };

  useEffect(() => {
    const handleNewUserReq = () => {
      handleCreateNewUser();
    };
    const handleSelectUserReq = (e: any) => {
      if (e.detail) {
        setSelectedUserId(e.detail);
      }
    };
    window.addEventListener("create-new-user-request", handleNewUserReq);
    window.addEventListener("select-user-request", handleSelectUserReq);
    return () => {
      window.removeEventListener("create-new-user-request", handleNewUserReq);
      window.removeEventListener("select-user-request", handleSelectUserReq);
    };
  }, []);

  // Load user data whenever selectedUserId changes
  useEffect(() => {
    if (selectedUserId.startsWith("draft-")) {
      return;
    }
    const targetUser =
      usersList.find((u) => u.id === selectedUserId) || activeCurrentUser;
    if (targetUser) {
      setName(targetUser.name || "");
      setUsername(targetUser.username || targetUser.email.split("@")[0]);
      setEmail(targetUser.email || "");
      setPassword(targetUser.password || "");
      setRole(targetUser.role || "admin");
      setStatus(targetUser.status || "active");
      setAvatarUrl(targetUser.avatar || "");
      setAllowedSubjectIds(targetUser.allowedSubjectIds || []);
      setLastLoginAt(targetUser.lastLoginAt || "");

      if (targetUser.permissions) {
        setPermissions({ ...targetUser.permissions });
      } else {
        setPermissions(DEFAULT_PERMISSIONS[targetUser.role || "admin"]);
      }
    }
  }, [selectedUserId, usersList]);

  const togglePermission = (key: keyof UserPermissions) => {
    setPermissions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSelectAllPermissions = () => {
    setPermissions({
      curriculum: true,
      lessons: true,
      questions: true,
      exams: true,
      exports: true,
      reports: true,
      users: true,
      settings: true,
    });
  };

  const handleDeselectAllPermissions = () => {
    setPermissions({
      curriculum: false,
      lessons: false,
      questions: false,
      exams: false,
      exports: false,
      reports: false,
      users: false,
      settings: false,
    });
  };

  const handleResetToRoleDefault = () => {
    setPermissions(DEFAULT_PERMISSIONS[role]);
  };

  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole);
    setPermissions(DEFAULT_PERMISSIONS[newRole]);
  };

  const handleSubjectToggle = (subjId: string) => {
    setAllowedSubjectIds((prev) => {
      if (prev.includes(subjId)) {
        return prev.filter((id) => id !== subjId);
      } else {
        return [...prev, subjId];
      }
    });
  };

  const handleResetPasswordAction = async () => {
    const randomChars = Math.random().toString(36).substring(2, 6).toUpperCase();
    const randomNums = Math.floor(1000 + Math.random() * 9000);
    const tempPassword = `Pass_${randomChars}_${randomNums}`;
    setPassword(tempPassword);
    setShowPassword(true);
    setToastMessage(`تم تعيين كلمة مرور مؤقتة جديدة: (${tempPassword}). يرجى حفظ التغييرات.`);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 5000);
  };

  const handleCopyPassword = () => {
    if (!password) {
      setToastMessage("لا توجد كلمة مرور لنسخها.");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2500);
      return;
    }
    if (navigator.clipboard) {
      navigator.clipboard.writeText(password);
      setToastMessage("تم نسخ كلمة المرور إلى الحافظة!");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2500);
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const isDraft = selectedUserId.startsWith("draft-");
    const realId = isDraft ? `usr-${Date.now()}` : selectedUserId;
    const targetUser =
      usersList.find((u) => u.id === selectedUserId) || activeCurrentUser;

    // Password Hashing & Salt Enforcement (Random Unique Salt per User)
    const typedPassword = password.trim();
    let newPasswordSalt = targetUser?.passwordSalt;
    let newPasswordHash = targetUser?.passwordHash;
    let newPasswordIterations = targetUser?.passwordIterations || 100000;
    let newPasswordAlgorithm = targetUser?.passwordAlgorithm || "PBKDF2-SHA256";
    let finalSavedPassword = targetUser?.password;

    if (typedPassword && typedPassword !== "••••••••") {
      const validation = validatePasswordStrength(typedPassword, 4);
      if (!validation.isValid) {
        setToastMessage(
          validation.error ||
            "كلمة المرور غير صالحة. يرجى إدخال 4 محارف على الأقل."
        );
        setShowToast(true);
        setTimeout(() => setShowToast(false), 4000);
        return;
      }

      const creds = await createPasswordHashForUser(typedPassword);
      newPasswordSalt = creds.passwordSalt;
      newPasswordHash = creds.passwordHash;
      newPasswordIterations = creds.passwordIterations;
      newPasswordAlgorithm = creds.passwordAlgorithm;
      finalSavedPassword = typedPassword;
    } else if (isDraft && (!newPasswordHash || !newPasswordSalt) && !finalSavedPassword) {
      setToastMessage(
        "يرجى إدخال كلمة مرور للمستخدم الجديد لتفعيل الحساب."
      );
      setShowToast(true);
      setTimeout(() => setShowToast(false), 4000);
      return;
    }

    const updatedUser: User = {
      ...(targetUser || {}),
      id: realId,
      name:
        name.trim() || (isDraft ? "مستخدم جديد" : targetUser?.name || "مستخدم"),
      username:
        username.trim() ||
        (isDraft
          ? `user_${Math.floor(Math.random() * 1000)}`
          : targetUser?.username || "user"),
      email:
        email.trim() ||
        (isDraft
          ? `user${Math.floor(Math.random() * 1000)}@edutech.edu`
          : targetUser?.email || ""),
      password: finalSavedPassword,
      passwordHash: newPasswordHash,
      passwordSalt: newPasswordSalt,
      passwordIterations: newPasswordIterations,
      passwordAlgorithm: newPasswordAlgorithm,
      role,
      status,
      avatar: avatarUrl,
      permissions: { ...permissions },
      allowedSubjectIds,
      lastLoginAt: lastLoginAt || targetUser?.lastLoginAt,
    };

    // Save through storage service
    storage.saveUser(updatedUser);

    if (propsOnSaveUser) {
      propsOnSaveUser(updatedUser);
    }

    // Set selected user ID to real persisted ID
    setSelectedUserId(realId);
    setPassword(finalSavedPassword || "");

    // Audit log entry for user save
    storage.logAction(
      activeCurrentUser.name,
      isDraft ? "إنشاء مستخدم جديد" : "تحديث بيانات وصلاحيات مستخدم",
      "المستخدمون والترخيص",
      realId,
      `المستخدم: ${updatedUser.name} (${updatedUser.email}) - الدور: ${updatedUser.role}`,
      {
        userId: activeCurrentUser.id,
        userName: activeCurrentUser.name,
        userRole: activeCurrentUser.role,
        result: "success",
        entityType: "المستخدمين",
        entityId: realId,
      }
    );

    refreshAuditLogs();

    setToastMessage(
      `تم حفظ بيانات وصلاحيات الحساب (${updatedUser.name}) بنجاح!`,
    );
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3500);
  };

  const handleReset = () => {
    if (selectedUserId.startsWith("draft-")) {
      setName("مستخدم جديد");
      setUsername("");
      setEmail("");
      setPassword("");
      setRole("teacher");
      setStatus("disabled");
      setAllowedSubjectIds([]);
      setPermissions({ ...DEFAULT_PERMISSIONS["teacher"] });
      return;
    }
    const targetUser =
      usersList.find((u) => u.id === selectedUserId) || activeCurrentUser;
    if (targetUser) {
      setName(targetUser.name || "");
      setUsername(targetUser.username || "");
      setEmail(targetUser.email || "");
      setPassword("");
      setRole(targetUser.role || "admin");
      setStatus(targetUser.status || "active");
      setAvatarUrl(targetUser.avatar || "");
      setAllowedSubjectIds(targetUser.allowedSubjectIds || []);
      setPermissions(
        targetUser.permissions ||
          DEFAULT_PERMISSIONS[targetUser.role || "admin"],
      );
    }
  };

  // Filtered Audit Logs
  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      // 1. Search Query
      if (auditSearch.trim()) {
        const q = auditSearch.trim().toLowerCase();
        const matchUser = (log.userName || "").toLowerCase().includes(q);
        const matchUserId = (log.userId || "").toLowerCase().includes(q);
        const matchAction = (log.action || "").toLowerCase().includes(q);
        const matchEntity = (log.targetEntity || log.entityType || "").toLowerCase().includes(q);
        const matchDetails = (log.details || "").toLowerCase().includes(q);
        if (!matchUser && !matchUserId && !matchAction && !matchEntity && !matchDetails) {
          return false;
        }
      }

      // 2. Result Filter
      if (auditResultFilter !== "all") {
        const logRes = log.result || "success";
        if (logRes !== auditResultFilter) return false;
      }

      // 3. Entity Filter
      if (auditEntityFilter !== "all") {
        const entity = log.targetEntity || log.entityType || "";
        if (!entity.includes(auditEntityFilter)) return false;
      }

      return true;
    });
  }, [auditLogs, auditSearch, auditResultFilter, auditEntityFilter]);

  const handleClearAuditLogs = () => {
    if (activeCurrentUser.role !== "admin") {
      alert("عذراً، مسح سجلات التدقيق متاح فقط لمدير النظام.");
      return;
    }
    if (confirm("هل أنت متأكد من رغبتك في تفريغ سجل الحركات والتدقيق بالكامل؟")) {
      storage.clearAuditLogs();
      refreshAuditLogs();
      setToastMessage("تم تفريغ سجل الحركات والتدقيق بنجاح.");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }
  };

  return (
    <div
      className="min-h-[calc(100vh-80px)] bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 font-sans w-full transition-colors duration-200"
      dir="rtl"
    >
      <div className="max-w-6xl mx-auto flex flex-col h-full space-y-6">
        {/* Toast Notification */}
        {showToast && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-6 py-3 rounded-2xl shadow-xl flex items-center gap-3 animate-in slide-in-from-top-4 duration-300 font-bold text-sm">
            <Check className="w-5 h-5 bg-white text-emerald-600 rounded-full p-0.5 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Header Section */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Right: Navigation + Title & Subtitle */}
          <div className="flex items-center gap-3.5">
            <button
              type="button"
              onClick={() => {
                if (onBackToSettings) {
                  onBackToSettings();
                } else {
                  window.dispatchEvent(
                    new CustomEvent("navigate-tab", { detail: "settings" }),
                  );
                }
                setTimeout(() => {
                  window.dispatchEvent(
                    new CustomEvent("settings-subtab", { detail: "users" }),
                  );
                }, 50);
              }}
              className="p-3 rounded-2xl bg-blue-50 hover:bg-blue-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-blue-600 dark:text-blue-400 transition active:scale-95 cursor-pointer shrink-0 border border-blue-200/60 dark:border-slate-700"
              title="العودة إلى جدول المستخدمين والصلاحيات (RBAC)"
            >
              <ArrowRight className="w-5 h-5 stroke-[2.5]" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  إدارة المستخدمين وسجل التدقيق (Audit Log)
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900/50">
                  RBAC & Audit Engine
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                تحديث بيانات وسجل حسابات المستخدمين ومراقبة العمليات الحساسة في النظام.
              </p>
            </div>
          </div>

          {/* Tab Switcher & Quick Actions */}
          <div className="flex flex-wrap items-center gap-2 shrink-0 bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setActiveTab("users")}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition cursor-pointer ${
                activeTab === "users"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Users className="w-4 h-4" />
              <span>إدارة المستخدمين والصلاحيات</span>
            </button>

            {(activeCurrentUser.role === "admin" || activeCurrentUser.role === "supervisor" || activeCurrentUser.permissions?.users) && (
              <button
                type="button"
                onClick={() => setActiveTab("audit_log")}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition cursor-pointer ${
                  activeTab === "audit_log"
                    ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <History className="w-4 h-4" />
                <span>سجل التدقيق والمراقبة ({auditLogs.length})</span>
              </button>
            )}
          </div>
        </div>

        {/* TAB 1: USER MANAGEMENT & PERMISSIONS */}
        {activeTab === "users" && (
          <div className="space-y-6">
            {/* Top Toolbar: Switcher & Add User */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-3">
              {usersList.length > 0 && (
                <div className="flex items-center gap-2 px-2.5 py-1">
                  <Users className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300 shrink-0 hidden sm:inline">
                    تعديل الحساب:
                  </span>
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-2xs max-w-[220px] sm:max-w-[280px] truncate"
                  >
                    {selectedUserId.startsWith("draft-") && (
                      <option value={selectedUserId}>
                        + {name.trim() || "مستخدم جديد"} (مسودة غير محفوظة)
                      </option>
                    )}
                    {usersList.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role === "admin" ? "مدير" : u.role === "supervisor" ? "مشرف" : u.role === "teacher" ? "معلم" : u.role === "reviewer" ? "مراجع" : "مستعرض"}) - {u.status === "active" ? "نشط" : "معطل"}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button
                type="button"
                onClick={handleCreateNewUser}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center gap-2 shadow-xs transition active:scale-95 cursor-pointer shrink-0"
              >
                <UserPlus className="w-4 h-4" />
                <span>إضافة مستخدم جديد</span>
              </button>
            </div>

            {/* Main Form */}
            <form
              onSubmit={handleSave}
              className="grid grid-cols-1 lg:grid-cols-2 gap-6"
            >
              {/* Card 1: Account Profile & Credentials */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-6 border border-slate-200/80 dark:border-slate-800 flex flex-col relative overflow-hidden group">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-600" />

                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                      <UserIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                        بيانات الحساب والاعتماد
                      </h2>
                      <p className="text-[11px] text-slate-400 font-medium">
                        الاسم الكامل، اسم الدخول، كلمة المرور والنطاق
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                      status === "active"
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                        : "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-800"
                    }`}
                  >
                    {status === "active" ? "حساب نشط" : "حساب معطل"}
                  </span>
                </div>

                {/* Avatar Section */}
                <div className="flex flex-col items-center mb-6">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center border-2 border-blue-500/20 shadow-md overflow-hidden text-slate-500 dark:text-slate-400">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt={name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <UserIcon className="w-10 h-10 text-slate-400" />
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const url = prompt(
                          "أدخل رابط الصورة أو اترك فارغاً:",
                          avatarUrl,
                        );
                        if (url !== null) setAvatarUrl(url);
                      }}
                      className="absolute bottom-0 left-0 bg-blue-600 text-white p-1.5 rounded-full shadow-md hover:bg-blue-700 transition-all active:scale-95 cursor-pointer"
                      title="تغيير الصورة الشخصية"
                    >
                      <Camera className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {lastLoginAt && (
                    <div className="flex items-center gap-1.5 mt-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700">
                      <Clock className="w-3.5 h-3.5 text-blue-500" />
                      <span>آخر دخول: {lastLoginAt}</span>
                    </div>
                  )}
                </div>

                {/* Form Fields */}
                <div className="space-y-4 flex-1">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      الاسم الكامل
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                      placeholder="أدخل الاسم الكامل"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        اسم الدخول (Username)
                      </label>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                        placeholder="اسم المستخدم"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        البريد الإلكتروني
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                        placeholder="example@edutech.com"
                      />
                    </div>
                  </div>

                  {/* Password & Password Reset Action */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <span>كلمة المرور</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold border border-blue-200/50 dark:border-blue-800/50">
                          تشفير PBKDF2
                        </span>
                      </label>
                      <div className="flex items-center gap-2">
                        {password && (
                          <button
                            type="button"
                            onClick={handleCopyPassword}
                            className="text-[11px] font-bold text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1 cursor-pointer"
                            title="نسخ كلمة المرور"
                          >
                            <Copy className="w-3 h-3" />
                            <span>نسخ</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={handleResetPasswordAction}
                          className="text-[11px] font-extrabold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <KeyRound className="w-3 h-3" />
                          <span>تعيين كلمة مرور مؤقتة</span>
                        </button>
                      </div>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                        placeholder="اترك فارغاً للإبقاء على كلمة المرور الحالية، أو اكتب كلمة مرور جديدة..."
                        dir="ltr"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1 cursor-pointer"
                        title={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    {password ? (
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>سيتم تشفير وتحديث كلمة المرور عند الضغط على حفظ. ({password.length} محارف)</span>
                      </p>
                    ) : (
                      <p className="text-[11px] text-slate-400 mt-1">
                        كلمة المرور الحالية محفوظة ومحمية بالتشفير.
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        الدور (User Role)
                      </label>
                      <select
                        value={role}
                        onChange={(e) =>
                          handleRoleChange(e.target.value as UserRole)
                        }
                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer font-bold"
                      >
                        <option value="admin">مدير نظام (Admin)</option>
                        <option value="supervisor">مشرف (Supervisor)</option>
                        <option value="teacher">معلم (Teacher)</option>
                        <option value="reviewer">مراجع (Reviewer)</option>
                        <option value="viewer">مستعرض (Viewer)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        حالة الحساب
                      </label>
                      <select
                        value={status}
                        onChange={(e) =>
                          setStatus(e.target.value as "active" | "disabled")
                        }
                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer font-bold"
                      >
                        <option value="active">نشط (Active)</option>
                        <option value="disabled">معطل (Disabled)</option>
                      </select>
                    </div>
                  </div>

                  {/* Allowed Subjects Selection Scope */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                        <span>نطاق الوصول للمواد الدراسية (Allowed Subjects)</span>
                      </label>
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                        {allowedSubjectIds.length === 0 ? "جميع المواد" : `${allowedSubjectIds.length} مادة مخصصة`}
                      </span>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/80 space-y-2 max-h-36 overflow-y-auto">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800 dark:text-slate-200">
                        <input
                          type="checkbox"
                          checked={allowedSubjectIds.length === 0}
                          onChange={(e) => {
                            if (e.target.checked) setAllowedSubjectIds([]);
                          }}
                          className="rounded text-blue-600 focus:ring-blue-500"
                        />
                        <span>وصول كامل لكافة المواد الدراسية في النظام</span>
                      </label>

                      <hr className="border-slate-200 dark:border-slate-700 my-1" />

                      <div className="grid grid-cols-2 gap-1.5">
                        {allSubjects.map((s) => (
                          <label key={s.id} className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-300">
                            <input
                              type="checkbox"
                              checked={allowedSubjectIds.includes(s.id)}
                              onChange={() => handleSubjectToggle(s.id)}
                              className="rounded text-blue-600 focus:ring-blue-500"
                            />
                            <span className="truncate">{s.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Account Actions Footer */}
                <div className="pt-4 mt-6 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                    إجراءات الحساب
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedUserId.startsWith("draft-")) {
                        setSelectedUserId(usersList[0]?.id || "usr-1");
                        setToastMessage(
                          "تم إلغاء المسودة والعودة للمستخدمين المحفوظين.",
                        );
                        setShowToast(true);
                        return;
                      }
                      if (usersList.length <= 1) {
                        setToastMessage("لا يمكن حذف المستخدم الوحيد في النظام.");
                        setShowToast(true);
                        return;
                      }
                      const target =
                        usersList.find((u) => u.id === selectedUserId) ||
                        activeCurrentUser;
                      if (target) {
                        setUserToDelete(target);
                      }
                    }}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition flex items-center gap-1.5 border border-rose-200/60 dark:border-rose-900/40 cursor-pointer active:scale-95"
                    title="حذف هذا الحساب من النظام"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>حذف الحساب</span>
                  </button>
                </div>
              </div>

              {/* Card 2: Permissions Configuration Matrix */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-6 border border-slate-200/80 dark:border-slate-800 flex flex-col relative overflow-hidden group">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-600" />

                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                        صلاحيات الوصول التفصيلية
                      </h2>
                      <p className="text-[11px] text-slate-400 font-medium">
                        مفاتيح الصلاحيات المخصصة لهذا الحساب
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={handleSelectAllPermissions}
                      className="px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-white dark:bg-slate-900 shadow-2xs rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/60 transition cursor-pointer"
                    >
                      تحديد الكل
                    </button>
                    <button
                      type="button"
                      onClick={handleDeselectAllPermissions}
                      className="px-2.5 py-1 text-[11px] font-bold text-rose-700 dark:text-rose-400 bg-white dark:bg-slate-900 shadow-2xs rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/60 transition cursor-pointer"
                    >
                      إلغاء الكل
                    </button>
                    <button
                      type="button"
                      onClick={handleResetToRoleDefault}
                      className="px-2.5 py-1 text-[11px] font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 shadow-2xs rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                    >
                      افتراضي الدور
                    </button>
                  </div>
                </div>

                <div className="space-y-5 flex-1 mt-2">
                  {/* Category 1: المحتوى الأكاديمي */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-md">
                        <BookOpen className="w-3.5 h-3.5" />
                      </div>
                      <h3 className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                        المحتوى الأكاديمي والمنهاج
                      </h3>
                    </div>
                    <div className="space-y-1 bg-slate-50/70 dark:bg-slate-800/40 rounded-xl p-2.5 border border-slate-200/60 dark:border-slate-800">
                      <Toggle
                        label="إدارة شجرة المنهاج والمواد (Curriculum)"
                        description="إنشاء وتعديل المواد، الوحدات والدروس"
                        enabled={permissions.curriculum}
                        onChange={() => togglePermission("curriculum")}
                      />
                      <Toggle
                        label="إعداد محرّر الدروس والفقرات (Lessons)"
                        description="تعديل نصوص الفقرات والأهداف التعليمية"
                        enabled={permissions.lessons}
                        onChange={() => togglePermission("lessons")}
                      />
                    </div>
                  </div>

                  {/* Category 2: التقييم والاختبارات */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-md">
                        <Sparkles className="w-3.5 h-3.5" />
                      </div>
                      <h3 className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                        التقييم والاختبارات
                      </h3>
                    </div>
                    <div className="space-y-1 bg-slate-50/70 dark:bg-slate-800/40 rounded-xl p-2.5 border border-slate-200/60 dark:border-slate-800">
                      <Toggle
                        label="بنك الأسئلة والمشتتات (Questions)"
                        description="إضافة وتعديل الأسئلة وخيارات الإجابات"
                        enabled={permissions.questions}
                        onChange={() => togglePermission("questions")}
                      />
                      <Toggle
                        label="توليد الامتحانات والاختبارات (Exams)"
                        description="محرك التوليد الآلي واليدوي للنماذج"
                        enabled={permissions.exams}
                        onChange={() => togglePermission("exams")}
                      />
                      <Toggle
                        label="تصدير وطباعة النماذج (Exports)"
                        description="تصدير ملفات PDF و Word و A4"
                        enabled={permissions.exports}
                        onChange={() => togglePermission("exports")}
                      />
                    </div>
                  </div>

                  {/* Category 3: التحليل والإدارة */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-md">
                        <ShieldCheck className="w-3.5 h-3.5" />
                      </div>
                      <h3 className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                        التحليل والإدارة
                      </h3>
                    </div>
                    <div className="space-y-1 bg-slate-50/70 dark:bg-slate-800/40 rounded-xl p-2.5 border border-slate-200/60 dark:border-slate-800">
                      <Toggle
                        label="إدارة المستخدمين والأدوار (Users)"
                        description="إضافة وتعديل حسابات المستخدمين وصلاحياتهم"
                        enabled={permissions.users}
                        onChange={() => togglePermission("users")}
                      />
                      <Toggle
                        label="إعدادات النظام والترخيص والنسخ الاحتياطي (Settings)"
                        description="تخصيص الهوية والترخيص واستعادة البيانات"
                        enabled={permissions.settings}
                        onChange={() => togglePermission("settings")}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Save Action Bar */}
              <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2.5 text-xs font-bold text-slate-600 dark:text-slate-300">
                  <div className="p-2 bg-blue-50 dark:bg-blue-950/80 rounded-xl text-blue-600 dark:text-blue-400 shrink-0">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-slate-900 dark:text-white font-extrabold">
                      {selectedUserId.startsWith("draft-")
                        ? "إضافة مسودة مستخدم جديد"
                        : `تعديل حساب: ${name || "مستخدم"}`}
                    </p>
                    <p className="text-[11px] text-slate-400 font-normal">
                      سيتم حفظ البيانات والصلاحيات وتشفير كلمة المرور وتوثيق الإجراء في سجل التدقيق.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>إلغاء التعديلات</span>
                  </button>

                  <button
                    type="submit"
                    className="px-7 py-2.5 rounded-xl text-xs font-black text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-600/20 active:scale-[0.98] transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>حفظ الحساب والصلاحيات</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* TAB 2: AUDIT LOG TRAIL VIEWER */}
        {activeTab === "audit_log" && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-6 border border-slate-200/80 dark:border-slate-800 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <h2 className="text-lg font-black text-slate-900 dark:text-white">
                    سجل التدقيق والمراقبة المركزي (Audit Trail Log)
                  </h2>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                  توثيق زمني شامل لجميع العمليات الحساسة المحاولة والناجحة والمرفوضة بحساب المستخدم الحقيقي.
                </p>
              </div>

              {activeCurrentUser.role === "admin" && (
                <button
                  type="button"
                  onClick={handleClearAuditLogs}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-900 transition cursor-pointer self-start md:self-auto"
                >
                  تفريغ السجل بالكامل
                </button>
              )}
            </div>

            {/* Audit Log Filter Bar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Search input */}
              <div className="relative">
                <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  placeholder="بحث باسم المستخدم، الإجراء، أو التفاصيل..."
                  className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Result Filter */}
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <Filter className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300 shrink-0">الحالة:</span>
                <select
                  value={auditResultFilter}
                  onChange={(e) => setAuditResultFilter(e.target.value as any)}
                  className="bg-transparent text-xs font-extrabold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer w-full"
                >
                  <option value="all">جميع الحالات ({auditLogs.length})</option>
                  <option value="success">الناجحة فقط (Success)</option>
                  <option value="denied">المرفوضة فقط (Denied)</option>
                  <option value="error">الأخطاء فقط (Error)</option>
                </select>
              </div>

              {/* Entity Filter */}
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <Layers className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300 shrink-0">الكيان:</span>
                <select
                  value={auditEntityFilter}
                  onChange={(e) => setAuditEntityFilter(e.target.value)}
                  className="bg-transparent text-xs font-extrabold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer w-full"
                >
                  <option value="all">جميع الكيانات</option>
                  <option value="المصادقة">المصادقة والمستخدمين</option>
                  <option value="المواد">المواد الدراسية</option>
                  <option value="الوحدات">الوحدات</option>
                  <option value="الدروس">الدروس</option>
                  <option value="الأسئلة">الأسئلة وبنك المشتتات</option>
                  <option value="الامتحانات">توليد الامتحانات والمكتبة</option>
                  <option value="الإعدادات">الإعدادات والنسخ الاحتياطي</option>
                </select>
              </div>
            </div>

            {/* Audit Log Table / List */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-extrabold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-3 px-4">التاريخ والوقت</th>
                    <th className="py-3 px-4">المستخدم</th>
                    <th className="py-3 px-4">الإجراء والكيان</th>
                    <th className="py-3 px-4 text-center">النتيجة</th>
                    <th className="py-3 px-4">التفاصيل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200 font-medium">
                  {filteredAuditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400 font-bold">
                        لا توجد سجلات تدقيق تطابق شروط البحث الحالية.
                      </td>
                    </tr>
                  ) : (
                    filteredAuditLogs.map((log) => {
                      const res = log.result || "success";
                      return (
                        <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                          <td className="py-3 px-4 whitespace-nowrap text-slate-500 dark:text-slate-400 dir-ltr text-right font-mono text-[11px]">
                            {log.timestamp}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="flex flex-col">
                              <span className="font-extrabold text-slate-900 dark:text-white">
                                {log.userName}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                ID: {log.userId} {log.userRole ? `(${log.userRole})` : ""}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-800 dark:text-slate-200">
                                {log.action}
                              </span>
                              <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">
                                {log.targetEntity || log.entityType || "النظام"}
                                {log.targetEntityId || log.entityId ? ` [${log.targetEntityId || log.entityId}]` : ""}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black ${
                                res === "success"
                                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                                  : res === "denied"
                                  ? "bg-rose-50 text-rose-700 dark:bg-rose-950/80 dark:text-rose-400 border border-rose-200 dark:border-rose-800"
                                  : "bg-amber-50 text-amber-700 dark:bg-amber-950/80 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
                              }`}
                            >
                              {res === "success" ? (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>ناجحة</span>
                                </>
                              ) : res === "denied" ? (
                                <>
                                  <ShieldAlert className="w-3.5 h-3.5" />
                                  <span>مرفوضة</span>
                                </>
                              ) : (
                                <>
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                  <span>خطأ</span>
                                </>
                              )}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-300 max-w-xs truncate">
                            {log.details || "-"}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Delete User Confirmation Modal */}
      {userToDelete && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150"
          dir="rtl"
        >
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="p-3 bg-rose-100 dark:bg-rose-950/80 rounded-2xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  تأكيد حذف الحساب
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  سيتم حذف حساب المستخدم نهائياً وتوثيق الإجراء
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
              هل أنت متأكد من رغبتك في حذف حساب المستخدم{" "}
              <strong className="text-slate-900 dark:text-white font-extrabold">
                {userToDelete.name}
              </strong>{" "}
              ({userToDelete.email})؟
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => {
                  const idToDelete = userToDelete.id;
                  const targetName = userToDelete.name;
                  setUserToDelete(null);
                  storage.deleteUser(idToDelete);
                  if (propsOnDeleteUser) propsOnDeleteUser(idToDelete);

                  storage.logAction(
                    activeCurrentUser.name,
                    "حذف حساب مستخدم",
                    "المستخدمون والترخيص",
                    idToDelete,
                    `حذف الحساب: ${targetName}`,
                    {
                      userId: activeCurrentUser.id,
                      userName: activeCurrentUser.name,
                      userRole: activeCurrentUser.role,
                      result: "success",
                      entityType: "المستخدمين",
                      entityId: idToDelete,
                    }
                  );

                  refreshAuditLogs();

                  setToastMessage(`تم حذف المستخدم (${targetName}) بنجاح.`);
                  setShowToast(true);

                  const remaining = usersList.filter(
                    (u) => u.id !== idToDelete,
                  );
                  if (remaining.length > 0) {
                    setSelectedUserId(remaining[0].id);
                  }
                }}
                className="px-5 py-2.5 rounded-xl text-xs font-black text-white bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-600/20 active:scale-95 transition cursor-pointer"
              >
                نعم، تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Toggle Subcomponent
interface ToggleProps {
  label: string;
  description?: string;
  enabled: boolean;
  onChange: () => void;
}

const Toggle: React.FC<ToggleProps> = ({
  label,
  description,
  enabled,
  onChange,
}) => {
  return (
    <div
      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800/80 cursor-pointer transition-colors group"
      onClick={onChange}
    >
      <div className="flex flex-col pr-1">
        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          {label}
        </span>
        {description && (
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">
            {description}
          </span>
        )}
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-50 ${
          enabled ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-700"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
            enabled ? "-translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
};
