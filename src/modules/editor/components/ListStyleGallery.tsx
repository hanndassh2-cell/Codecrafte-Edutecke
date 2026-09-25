import React, { useEffect, useRef, useState } from "react";
import { Editor, useEditorState } from "@tiptap/react";
import { List, ListOrdered, ChevronDown, Indent, Outdent } from "lucide-react";
import { PortalDropdown } from "../../../components/PortalDropdown";
import { BULLET_STYLES, NUMBER_STYLES, formatListMarker } from "../../../utils/listEngine";

/** Presentation controls for the current TipTap instance, including nested lists. */
export const ListStyleGallery = ({ editor }: { editor: Editor }) => {
  const [open, setOpen] = useState<string | null>(null);
  const gallery = useRef<HTMLDivElement>(null);
  useEffect(() => { if (open) gallery.current?.querySelector<HTMLButtonElement>("button")?.focus(); }, [open]);
  const bookmark = useRef(editor.state.selection.getBookmark());
  const state = useEditorState({ editor, selector: ({ editor: current }) => {
    const actions = { canSink: current.can().sinkListItem("listItem"), canLift: current.can().liftListItem("listItem") };
    const $from = current.state.selection.$from;
    for (let depth = $from.depth; depth > 0; depth--) {
      const node = $from.node(depth);
      if (["bulletList", "orderedList"].includes(node.type.name)) return { ...actions, type: node.type.name, style: node.attrs.listStyle };
    }
    return { ...actions, type: null, style: null };
  } });
  const preserve = (event: React.MouseEvent) => { event.preventDefault(); bookmark.current = editor.state.selection.getBookmark(); };
  const indent = (increase: boolean) => {
    if (state?.type) {
      if (increase) editor.chain().focus().sinkListItem("listItem").run();
      else editor.chain().focus().liftListItem("listItem").run();
      return;
    }
    // Reuse existing paragraph margin attributes; no schema/storage changes.
    editor.chain().focus().command(({ tr }) => {
      tr.doc.nodesBetween(tr.selection.from, tr.selection.to, (node, pos) => {
        if (!["paragraph", "heading"].includes(node.type.name)) return;
        const key = node.attrs.dir === "ltr" ? "marginLeft" : "marginRight";
        const element = editor.view.nodeDOM(pos);
        const computed = element instanceof HTMLElement ? getComputedStyle(element) : null;
        const current = computed?.[key] || node.attrs[key] || "0px";
        // Browsers resolve margins to px. Preserve uncommon unresolved units using CSS arithmetic.
        const value = /^-?[\d.]+(?:px)?$/.test(current)
          ? `${Math.max(0, parseFloat(current) + (increase ? 24 : -24))}px`
          : `max(0px, calc(${current} ${increase ? "+" : "-"} 24px))`;
        tr.setNodeMarkup(pos, undefined, { ...node.attrs, [key]: value });
      });
      return true;
    }).run();
  };
  const apply = (type: "bulletList" | "orderedList", style?: string) => {
    // A keyboard user may focus the gallery. Restoring the PM bookmark retains
    // the complete selection, including cell selections, rather than a text range.
    editor.view.dispatch(editor.state.tr.setSelection(bookmark.current.resolve(editor.state.doc)));
    editor.chain().focus().toggleStyledList(type, style).run();
    setOpen(null);
  };
  const buttonClass = "rounded p-1.5 text-slate-600 hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-blue-500 dark:text-slate-300";
  return <div dir="rtl" className="flex shrink-0 items-center gap-1" aria-label="القوائم والتعداد">
    {(["bulletList", "orderedList"] as const).map(type => {
      const bullet = type === "bulletList";
      const label = bullet ? "تعداد نقطي" : "تعداد رقمي";
      const styles = bullet ? BULLET_STYLES : NUMBER_STYLES;
      const Icon = bullet ? List : ListOrdered;
      return <div key={type} className={`flex items-center rounded ${state?.type === type ? "bg-blue-50 text-blue-700 dark:bg-blue-950" : ""}`}>
        <button type="button" title={`${label} (${bullet ? "Ctrl+Shift+8" : "Ctrl+Shift+7"})`} aria-label={label} aria-pressed={state?.type === type} className={buttonClass} onMouseDown={preserve} onFocus={() => { bookmark.current = editor.state.selection.getBookmark(); }} onClick={() => apply(type)}><Icon size={17} /></button>
        <PortalDropdown open={open === type} onOpenChange={next => setOpen(next ? type : null)} className="w-80 rounded-xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-slate-900" trigger={
          <button type="button" title={`أنماط ${label}`} aria-label={`أنماط ${label}`} aria-expanded={open === type} aria-haspopup="dialog" className={buttonClass} onMouseDown={preserve} onFocus={() => { bookmark.current = editor.state.selection.getBookmark(); }}><ChevronDown size={12} /></button>
        }>
          <div dir="rtl" role="dialog" aria-label={`أنماط ${label}`}>
            <div className="mb-3 text-sm font-bold text-slate-800 dark:text-white">{label}</div>
            <div ref={gallery} className="grid grid-cols-3 gap-2" onKeyDown={event => {
              const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("button"));
              const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
              const delta = { ArrowLeft: 1, ArrowRight: -1, ArrowDown: 3, ArrowUp: -3 }[event.key];
              if (delta !== undefined || event.key === "Home" || event.key === "End") {
                event.preventDefault();
                const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : Math.max(0, Math.min(buttons.length - 1, index + delta!));
                buttons[next]?.focus();
              }
            }}>
              {styles.map(style => <button key={style.id} type="button" title={style.label} aria-label={style.label} aria-pressed={state?.type === type && (state.style || (bullet ? "disc" : "decimal")) === style.id}
                onMouseDown={e => e.preventDefault()} onClick={() => apply(type, style.id)}
                className={`rounded-lg border p-2 text-right transition hover:border-blue-400 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-blue-500 dark:hover:bg-slate-800 ${state?.type === type && (state.style || (bullet ? "disc" : "decimal")) === style.id ? "border-blue-500 bg-blue-50 dark:bg-blue-950" : "border-slate-200 dark:border-slate-700"}`}>
                {[1,2,3].map(n => <span key={n} className="flex h-5 items-center gap-1.5" aria-hidden="true"><bdi dir={style.id.startsWith("arabic") ? "rtl" : "ltr"} className="min-w-5 text-center text-xs text-slate-700 dark:text-slate-200">{formatListMarker(n, style.id)}</bdi><span className={`h-0.5 rounded bg-slate-300 dark:bg-slate-600 ${n === 3 ? "w-5" : "w-8"}`} /></span>)}
              </button>)}
            </div>
            <p className="mt-3 text-xs text-slate-500">Tab لمستوى فرعي · Shift + Tab للرجوع</p>
          </div>
        </PortalDropdown>
      </div>;
    })}
    <button type="button" title={state?.type ? "مستوى فرعي (Tab)" : "زيادة المسافة البادئة"} aria-label={state?.type ? "مستوى فرعي" : "زيادة المسافة البادئة"} disabled={!!state?.type && !state.canSink} className={`${buttonClass} disabled:opacity-30`} onMouseDown={preserve} onClick={() => indent(true)}><Indent size={16} className="rotate-180" /></button>
    <button type="button" title={state?.type ? "رفع المستوى (Shift + Tab)" : "تقليل المسافة البادئة"} aria-label={state?.type ? "رفع المستوى" : "تقليل المسافة البادئة"} disabled={!!state?.type && !state.canLift} className={`${buttonClass} disabled:opacity-30`} onMouseDown={preserve} onClick={() => indent(false)}><Outdent size={16} className="rotate-180" /></button>
  </div>;
};
