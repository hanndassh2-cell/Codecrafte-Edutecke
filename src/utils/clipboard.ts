export const checkClipboardPermissions = async (type: 'read' | 'write'): Promise<boolean> => {
  if (typeof window === 'undefined') return false;
  
  if (!window.isSecureContext) {
    throw new Error("يجب استخدام بيئة آمنة (HTTPS) أو Localhost للوصول إلى الحافظة.");
  }

  if (!navigator.clipboard) {
    throw new Error("المتصفح الخاص بك لا يدعم واجهة الحافظة الحديثة (Clipboard API).");
  }

  try {
    const permissionName = type === 'read' ? 'clipboard-read' : 'clipboard-write';
    const permission = await navigator.permissions.query({ name: permissionName as any });
    if (permission.state === 'denied') {
      throw new Error(`تم رفض صلاحية ${type === 'read' ? 'القراءة من' : 'الكتابة إلى'} الحافظة. يرجى السماح بها من إعدادات المتصفح.`);
    }
    return true;
  } catch (error) {
    // Firefox might throw here because it doesn't support clipboard-read in permissions API
    return true; 
  }
};

export const writeToClipboard = async (html: string, text: string) => {
  // await checkClipboardPermissions('write');
  try {
    if (typeof ClipboardItem !== "undefined") {
      const htmlBlob = new Blob([html], { type: "text/html" });
      const textBlob = new Blob([text], { type: "text/plain" });
      const item = new ClipboardItem({
        "text/html": htmlBlob,
        "text/plain": textBlob,
      });
      await navigator.clipboard.write([item]);
      return true;
    } else {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err: any) {
    console.error("Clipboard write error:", err);
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e: any) {
      throw new Error("فشل النسخ إلى الحافظة: " + (err.message || e.message || "حدث خطأ غير معروف"));
    }
  }
};

export const readFromClipboard = async (): Promise<{ html?: string; text?: string; files?: File[] }> => {
  // await checkClipboardPermissions('read');
  try {
    if (typeof navigator.clipboard.read === "function") {
      const items = await navigator.clipboard.read();
      let html = "";
      let text = "";
      const files: File[] = [];
      
      for (const item of items) {
        if (item.types.includes("text/html")) {
          const blob = await item.getType("text/html");
          html = await blob.text();
        }
        if (item.types.includes("text/plain")) {
          const blob = await item.getType("text/plain");
          text = await blob.text();
        }
        for (const type of item.types) {
          if (type.startsWith("image/")) {
            const blob = await item.getType(type);
            files.push(new File([blob], "pasted-image.png", { type }));
          }
        }
      }
      return { html, text, files };
    } else {
      const text = await navigator.clipboard.readText();
      return { text };
    }
  } catch (err: any) {
    console.error("Clipboard read error:", err);
    try {
      const text = await navigator.clipboard.readText();
      return { text };
    } catch (e: any) {
      throw new Error("فشل اللصق من الحافظة: " + (err.message || e.message || "حدث خطأ غير معروف"));
    }
  }
};
