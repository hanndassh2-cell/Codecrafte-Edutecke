import React, { createContext, useContext, useEffect, useMemo, useState, useCallback, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Editor } from "@tiptap/react";
import { CheckCircle2, Circle, Globe, Loader2, Minus, Plus } from "lucide-react";

// UI placement only: every card retains its original editor and data callbacks.
const WorkspaceContext = createContext<{
  host: HTMLDivElement | null;
  setHost: React.Dispatch<React.SetStateAction<HTMLDivElement | null>>;
  editor: Editor | null;
  setEditor: React.Dispatch<React.SetStateAction<Editor | null>>;
} | null>(null);

export function FocusedEditorWorkspace({ children }: { children: React.ReactNode }) {
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  const [editor, setEditor] = useState<Editor | null>(null);
  const value = useMemo(() => ({ host, setHost, editor, setEditor }), [host, editor]);
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function WorkspaceToolbarHost() {
  const workspace = useContext(WorkspaceContext)!;
  return <div ref={workspace.setHost} className="workspace-toolbar-host" aria-label="أدوات تحرير البطاقة" />;
}

export function WorkspaceToolbar({ editor, isActive, children }: {
  editor: Editor | null; isActive?: boolean; children: React.ReactNode;
}) {
  const workspace = useContext(WorkspaceContext);
  const setEditor = workspace?.setEditor;
  useEffect(() => {
    if (!setEditor || !editor) return;
    const claim = () => setEditor(editor);
    // Multiple fields share a single ribbon, bound to the field being edited.
    setEditor(current => !current || current.isDestroyed ? editor : current);
    editor.on("focus", claim);
    return () => {
      editor.off("focus", claim);
      setEditor(current => current === editor ? null : current);
    };
  }, [editor, setEditor]);
  if (!workspace) return <div className={`${isActive ? "block" : "hidden group-focus-within:block"} z-20 w-full`}>{children}</div>;
  if (!workspace.host || workspace.editor !== editor) return null;
  return createPortal(children, workspace.host);
}

function WordCount({ editor }: { editor: Editor }) {
  const subscribe = useCallback((notify: () => void) => {
    editor.on("update", notify);
    return () => { editor.off("update", notify); };
  }, [editor]);
  const words = useSyncExternalStore(subscribe,
    () => editor.getText().trim().split(/\s+/u).filter(Boolean).length,
    () => 0,
  );
  return <span>عدد الكلمات: {words}</span>;
}

export function WorkspaceStatus({ isSaving, isDirty, index, count, zoom, onZoom }: {
  isSaving: boolean; isDirty: boolean; index: number; count: number;
  zoom: number; onZoom: (value: number) => void;
}) {
  const workspace = useContext(WorkspaceContext)!;
  return <footer className="workspace-status" aria-label="حالة المستند" dir="rtl">
    <div className="workspace-zoom" aria-label="تكبير المستند">
      <button type="button" onClick={() => onZoom(Math.min(150, zoom + 10))} disabled={zoom >= 150} aria-label="تكبير"><Plus size={16} /></button>
      <button type="button" onClick={() => onZoom(100)} title="إعادة التكبير إلى 100%">{zoom}%</button>
      <button type="button" onClick={() => onZoom(Math.max(60, zoom - 10))} disabled={zoom <= 60} aria-label="تصغير"><Minus size={16} /></button>
    </div>
    <span>البطاقة {index + 1} من {count}</span>
    <span className="workspace-language"><Globe size={16} /> العربية</span>
    {workspace.editor && !workspace.editor.isDestroyed && <WordCount editor={workspace.editor} />}
    <span className={`workspace-save-state ${isDirty ? "is-dirty" : ""}`} role="status">
      {isSaving ? <Loader2 size={16} className="animate-spin" /> : isDirty ? <Circle size={16} /> : <CheckCircle2 size={16} />}
      {isSaving ? "جارٍ الحفظ…" : isDirty ? "تغييرات غير محفوظة" : "تم الحفظ"}
    </span>
  </footer>;
}

// The editor remains mounted while the outline expands. Preserve a ProseMirror
// bookmark (including cell selections), focus, and the document scroll position.
export function WorkspaceOutlineToggle({expanded,onChange}:{expanded:boolean;onChange:(value:boolean)=>void}) {
  const workspace=useContext(WorkspaceContext)!;
  const saved=React.useRef<{editor:Editor;bookmark:any;scroll:number}|null>(null);
  const wasExpanded = React.useRef(expanded);
  useEffect(() => {
    const restore = wasExpanded.current && !expanded;
    wasExpanded.current = expanded;
    if (!restore) return;
    const frame = requestAnimationFrame(() => {
      const state = saved.current;
      if (!state || state.editor.isDestroyed) return;
      try {
        state.editor.view.dispatch(state.editor.state.tr.setSelection(state.bookmark.resolve(state.editor.state.doc)));
        state.editor.commands.focus(undefined, { scrollIntoView: false });
      } catch { /* The selected field may have been removed. */ }
      const area = document.querySelector('.document-writing-area');
      if (area) area.scrollTop = state.scroll;
    });
    return () => cancelAnimationFrame(frame);
  }, [expanded]);
  return <button type="button" aria-expanded={expanded} onMouseDown={e=>e.preventDefault()} onClick={()=>{
    if (!expanded) {
      const editor=workspace.editor;
      if(editor&&!editor.isDestroyed) saved.current={editor,bookmark:editor.state.selection.getBookmark(),scroll:document.querySelector('.document-writing-area')?.scrollTop||0};
    }
    onChange(!expanded);
  }}>{expanded?'العودة للبطاقة':'توسيع المخطط'}</button>;
}
