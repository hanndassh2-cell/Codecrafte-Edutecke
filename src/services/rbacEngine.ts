import { User } from "../types";

export type AppAction =
  | "create"
  | "edit"
  | "delete"
  | "export"
  | "generate"
  | "archive"
  | "restore"
  | "import"
  | "users_manage"
  | "settings_manage";

export type ModuleKey =
  | "dashboard"
  | "curriculum"
  | "lessons"
  | "questions"
  | "exams"
  | "exams-library"
  | "cycles"
  | "reports"
  | "users"
  | "settings"
  | "user-profile"
  | "help";

/**
 * Checks if a user can access a specific module/tab.
 */
export function canAccessModule(
  user: User | null | undefined,
  moduleKey: string
): boolean {
  if (!user || user.status === "disabled") return false;
  if (user.role === "admin") return true;

  // Always accessible tabs for active logged-in users
  if (
    moduleKey === "dashboard" ||
    moduleKey === "user-profile" ||
    moduleKey === "help"
  ) {
    return true;
  }

  const perms = user.permissions;
  if (!perms) return true;

  switch (moduleKey) {
    case "curriculum":
      return perms.curriculum !== false;
    case "lessons":
      return perms.lessons !== false;
    case "questions":
      return perms.questions !== false;
    case "exams":
    case "exams-library":
    case "cycles":
      return perms.exams !== false;
    case "reports":
      return perms.reports !== false;
    case "users":
      return perms.users !== false && ((user.role as string) === "admin" || user.role === "supervisor");
    case "settings":
      return perms.settings !== false;
    default:
      return true;
  }
}

/**
 * Checks if a user can perform a specific sensitive action.
 */
export function canPerformAction(
  user: User | null | undefined,
  actionKey: AppAction,
  targetModule?: string
): boolean {
  if (!user || user.status === "disabled") return false;
  if (user.role === "admin") return true;

  // Check if target module is accessible first
  if (targetModule && !canAccessModule(user, targetModule)) {
    return false;
  }

  // Role restriction checks
  if (user.role === "viewer") {
    if (
      actionKey === "create" ||
      actionKey === "edit" ||
      actionKey === "delete" ||
      actionKey === "generate" ||
      actionKey === "archive" ||
      actionKey === "restore" ||
      actionKey === "import" ||
      actionKey === "users_manage" ||
      actionKey === "settings_manage"
    ) {
      return false;
    }
  }

  if (user.role === "reviewer") {
    if (actionKey === "delete" || actionKey === "users_manage" || actionKey === "settings_manage") {
      return false;
    }
  }

  if (actionKey === "export") {
    return user.permissions?.exports !== false;
  }

  if (actionKey === "users_manage") {
    return user.permissions?.users !== false && ((user.role as string) === "admin" || user.role === "supervisor");
  }

  if (actionKey === "settings_manage") {
    return user.permissions?.settings !== false;
  }

  return true;
}

/**
 * Checks if a user has access to a specific subject by subjectId.
 */
export function canAccessSubject(
  user: User | null | undefined,
  subjectId: string | undefined | null
): boolean {
  if (!user || user.status === "disabled") return false;
  if (user.role === "admin") return true;
  if (!subjectId || subjectId === "all") return true;

  if (user.allowedSubjectIds && user.allowedSubjectIds.length > 0) {
    return user.allowedSubjectIds.includes(subjectId);
  }

  return true;
}

/**
 * Filters an array of subjects to only those accessible by the user.
 */
export function filterAllowedSubjects<T extends { id: string }>(
  user: User | null | undefined,
  subjects: T[]
): T[] {
  if (!user || user.status === "disabled") return [];
  if (user.role === "admin") return subjects;
  if (!user.allowedSubjectIds || user.allowedSubjectIds.length === 0) return subjects;
  return subjects.filter((s) => user.allowedSubjectIds.includes(s.id));
}

/**
 * Filters an array of items (questions, exams, lessons, units) by subjectId.
 */
export function filterAllowedItemsBySubject<T extends { subjectId?: string; scope?: { subjectId?: string } }>(
  user: User | null | undefined,
  items: T[]
): T[] {
  if (!user || user.status === "disabled") return [];
  if (user.role === "admin") return items;
  if (!user.allowedSubjectIds || user.allowedSubjectIds.length === 0) return items;
  return items.filter((item) => {
    const sId = item.subjectId || item.scope?.subjectId;
    if (!sId) return true;
    return user.allowedSubjectIds.includes(sId);
  });
}
