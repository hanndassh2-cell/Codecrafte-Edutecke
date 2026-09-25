import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/** Keep insertion dialogs outside the scaled document and all card stacking contexts. */
export function EditorModalPortal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const first = ref.current?.querySelector<HTMLElement>('input:not([type="hidden"]), button, select, textarea');
    first?.focus();
    return () => { if (previous?.isConnected) previous.focus(); };
  }, []);
  return createPortal(<div ref={ref} data-editor-overlay="true" style={{ display: "contents" }} onKeyDown={event => {
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); closeRef.current(); }
    if (event.key === "Tab") {
      const controls = Array.from(ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled):not([type="hidden"]), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]') || []).filter(el => !el.hidden && el.getAttribute('aria-hidden') !== 'true');
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
  }}>{children}</div>, document.body);
}

export function EditorPopover({ anchorRef, onClose, children }: {
  anchorRef: React.RefObject<HTMLDivElement>; onClose: () => void; children: React.ReactNode;
}) {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const popoverRef = useRef<HTMLDivElement>(null);
  useEffect(() => { popoverRef.current?.querySelector<HTMLElement>('button, input')?.focus(); }, []);
  useLayoutEffect(() => {
    const rect = anchorRef.current?.getBoundingClientRect();
    if (rect) setPosition({ top: Math.min(rect.bottom + 6, Math.max(8, window.innerHeight - 340)), left: Math.max(8, Math.min(rect.right - 260, window.innerWidth - 268)) });
  }, [anchorRef]);
  useEffect(() => {
    const close = () => onClose();
    window.addEventListener("resize", close);
    return () => window.removeEventListener("resize", close);
  }, [onClose]);
  return createPortal(<div ref={popoverRef} role="dialog" aria-label={anchorRef.current?.querySelector('button')?.getAttribute('title') || 'تنسيق النص'} className="fixed z-[9000] flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-slate-900" style={{ ...position, width: "min(260px, calc(100vw - 16px))", maxHeight: "min(330px, calc(100vh - 16px))", overflowY: "auto" }} dir="rtl" onMouseDown={event => event.stopPropagation()} onKeyDown={event => {
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); onClose(); anchorRef.current?.querySelector('button')?.focus(); }
    if (event.key === "Tab") {
      const controls = Array.from(popoverRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled)') || []);
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
  }}>{children}</div>, document.body);
}
