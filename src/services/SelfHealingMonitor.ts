import { Editor } from "@tiptap/core";
import { readFromClipboard } from "../utils/clipboard";

export type ActionName = "cut" | "copy" | "paste" | "delete" | "duplicate" | "select_all" | "undo" | "redo" | string;

export interface FailureContext {
  id: string;
  action: ActionName;
  reason: string;
  fixDescription: string;
  applyFix: () => Promise<boolean>;
}

class SelfHealingMonitorService {
  private listeners: ((failure: FailureContext | null) => void)[] = [];
  
  subscribe(listener: (failure: FailureContext | null) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify(failure: FailureContext | null) {
    this.listeners.forEach(l => l(failure));
  }

  clear() {
    this.notify(null);
  }

  async executeAndMonitor(
    action: ActionName,
    editor: Editor | null,
    executable: () => Promise<void> | void,
    fallbackFix?: () => Promise<boolean>
  ) {
    if (!editor) {
       try {
         await executable();
       } catch (e) {
         console.error(e);
       }
       return;
    }

    const beforeState = {
      contentLength: editor.state.doc.content.size,
      selectionFrom: editor.state.selection.from,
      selectionTo: editor.state.selection.to,
      isFocused: editor.isFocused,
    };

    let caughtError: Error | null = null;
    try {
      await executable();
    } catch (err: any) {
      caughtError = err;
    }

    // Wait a tick to allow the editor state to update (e.g. async paste)
    await new Promise(r => setTimeout(r, 50));

    const afterState = {
      contentLength: editor.state.doc.content.size,
      selectionFrom: editor.state.selection.from,
      selectionTo: editor.state.selection.to,
      isFocused: editor.isFocused,
    };

    let failed = false;
    let reason = "";
    const defaultFixDescription = "إعادة تهيئة التحديد والتركيز وتطبيق الأمر إجبارياً";
    
    if (caughtError) {
      failed = true;
      reason = "حدث خطأ برمجي أثناء التنفيذ: " + caughtError.message;
    } else {
      const changedContent = beforeState.contentLength !== afterState.contentLength;
      const changedSelection = beforeState.selectionFrom !== afterState.selectionFrom || beforeState.selectionTo !== afterState.selectionTo;
      
      if (action === "cut" || action === "delete") {
        if (!changedContent && beforeState.selectionFrom !== beforeState.selectionTo) {
          failed = true;
          reason = "لم يتم حذف المحتوى المحدد. قد يكون التركيز مفقوداً.";
        }
      } else if (action === "paste") {
        if (!changedContent) {
          try {
             const clip = await readFromClipboard();
             if (clip?.text && clip.text.trim().length > 0) {
               failed = true;
               reason = "لم يتم لصق المحتوى رغم وجود بيانات في الحافظة. قد يكون الموضع غير صالح.";
             }
          } catch(e) {}
        }
      } else if (action === "copy") {
        if (beforeState.selectionFrom === beforeState.selectionTo) {
          // Success but no change -> ignore
        } else {
           try {
             const clip = await readFromClipboard();
             if (!clip?.text) {
               failed = true;
               reason = "لم يتم نسخ المحتوى بنجاح. قد يكون التركيز مفقوداً.";
             }
           } catch(e) {}
        }
      } else if (action === "duplicate") {
         if (!changedContent && beforeState.selectionFrom !== beforeState.selectionTo) {
           failed = true;
           reason = "لم يتم تكرار العنصر المحدد.";
         }
      }
    }

    if (failed) {
      const fixId = Math.random().toString(36).substring(7);
      
      const defaultFix = async () => {
         // Auto fix: force focus, restore selection if possible, and run again
         if (!editor.isFocused) editor.view.focus();
         if (fallbackFix) {
           return await fallbackFix();
         } else {
           try {
             await executable();
             return true;
           } catch(e) {
             return false;
           }
         }
      };

      this.notify({
        id: fixId,
        action,
        reason,
        fixDescription: defaultFixDescription,
        applyFix: defaultFix
      });
    } else {
      this.clear();
    }
  }
}

export const selfHealingMonitor = new SelfHealingMonitorService();
