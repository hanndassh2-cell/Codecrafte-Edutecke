import { getStoredData, KEYS } from "../services/storage";

export interface CurriculumValidationResult {
  isValid: boolean;
  errors: string[];
}

export function validateCurriculumContext(
  subjectId: string | undefined,
  unitId: string | undefined,
  lessonId: string | undefined
): CurriculumValidationResult {
  const errors: string[] = [];
  
  if (!subjectId) {
    errors.push("يجب اختيار مادة صالحة.");
  }
  if (!unitId) {
    errors.push("يجب اختيار وحدة صالحة.");
  }
  if (!lessonId) {
    errors.push("يجب اختيار درس صالح.");
  }

  // Get current curriculum from storage (read-only)
  const subjects = getStoredData<any[]>(KEYS.SUBJECTS, []);
  const units = getStoredData<any[]>(KEYS.UNITS, []);
  const lessons = getStoredData<any[]>(KEYS.LESSONS, []);

  if (subjectId) {
    const subjectExists = subjects.some(s => s && s.id === subjectId);
    if (!subjectExists) {
      errors.push(`المادة المحددة غير موجودة في المنهج (${subjectId}).`);
    }
  }

  if (unitId) {
    const unit = units.find(u => u && u.id === unitId);
    if (!unit) {
      errors.push(`الوحدة المحددة غير موجودة في المنهج (${unitId}).`);
    } else if (subjectId && unit.subjectId && unit.subjectId !== subjectId) {
      errors.push(`الوحدة المحددة لا تنتمي للمادة المحددة.`);
    }
  }

  if (lessonId) {
    const lesson = lessons.find(l => l && l.id === lessonId);
    if (!lesson) {
      errors.push(`الدرس المحدد غير موجود في المنهج (${lessonId}).`);
    } else if (unitId && lesson.unitId && lesson.unitId !== unitId) {
      errors.push(`الدرس المحدد لا ينتمي للوحدة المحددة.`);
    }
  }

  // Only block pure technical markers if they are not in the curriculum
  // (We removed unit-101, les-101-1, sub-101 from here because they are actual IDs in initialData)
  const technicalMarkers = ["temp"];
  if (subjectId && technicalMarkers.includes(subjectId)) errors.push("معرف المادة غير صالح (Technical Marker).");
  if (unitId && technicalMarkers.includes(unitId)) errors.push("معرف الوحدة غير صالح (Technical Marker).");
  if (lessonId && technicalMarkers.includes(lessonId)) errors.push("معرف الدرس غير صالح (Technical Marker).");

  return {
    isValid: errors.length === 0,
    errors
  };
}
