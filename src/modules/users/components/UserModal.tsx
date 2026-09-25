import React from "react";
import { X, UserCheck } from "lucide-react";
import { User } from "../../../types/index";
import { UserCredentialsPermissionsView } from "../pages/UserCredentialsPermissionsView";

interface UserModalProps {
  isOpen: boolean;
  user: Partial<User> | null;
  allUsers?: User[];
  onClose: () => void;
  onSave: (user: User) => void;
}

export const UserModal: React.FC<UserModalProps> = ({
  isOpen,
  user,
  allUsers,
  onClose,
  onSave,
}) => {
  if (!isOpen) return null;

  const initialUser: User = {
    ...(user || {}),
    id: user?.id || `usr-${Date.now()}`,
    name: user?.name || "مستخدم جديد",
    username:
      user?.username ||
      (user?.email
        ? user.email.split("@")[0]
        : `user_${Math.floor(Math.random() * 1000)}`),
    email: user?.email || `user${Math.floor(Math.random() * 1000)}@edutech.edu`,
    password: user?.password || "",
    role: (user?.role as any) || "teacher",
    allowedSubjectIds: user?.allowedSubjectIds || [],
    status: (user?.status as any) || "active",
    permissions: user?.permissions,
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-md overflow-y-auto"
      dir="rtl"
    >
      <div className="bg-white dark:bg-slate-950 rounded-3xl shadow-2xl max-w-5xl w-full max-h-[92vh] border border-slate-200 dark:border-slate-800 overflow-y-auto my-auto animate-in fade-in zoom-in-95 duration-200 flex flex-col relative">
        <div className="sticky top-0 z-20 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                {user?.id
                  ? "تعديل بيانات المستخدم والصلاحيات"
                  : "إضافة مستخدم جديد وتحديد الصلاحيات"}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                تعيين اسم الدخول وكلمة المرور وتخصيص صلاحيات الوصول
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 transition-colors"
            title="إغلاق النافذة"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-2 sm:p-4 overflow-y-auto">
          <UserCredentialsPermissionsView
            currentUser={initialUser}
            allUsers={allUsers}
            onSaveUser={(updatedUser) => {
              onSave(updatedUser);
              onClose();
            }}
          />
        </div>
      </div>
    </div>
  );
};
