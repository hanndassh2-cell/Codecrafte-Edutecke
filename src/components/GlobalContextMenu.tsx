import React, { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { Copy, Trash2, Undo2, Redo2, AlignLeft, AlignCenter, AlignRight, Edit, ArrowRightLeft, ArrowUp, ArrowDown, Combine, Split, Trash } from "lucide-react";
import { executeCopy, executeCut, executePaste, executeDuplicate, executeDelete, executeSelectAll, executeUndo, executeRedo } from "../utils/editorClipboard";
import { writeToClipboard, readFromClipboard } from "../utils/clipboard";
import { selfHealingMonitor } from "../services/SelfHealingMonitor";
import { Editor } from "@tiptap/core";
import { TextSelection } from "@tiptap/pm/state";

export const GlobalContextMenu = () => {
  const [menuState, setMenuState] = useState<{
    isOpen: boolean;
    x: number;
    y: number;
    type: "equation" | "image" | "table" | "text" | "input";
    targetElement?: HTMLElement | null;
    editor?: Editor | null;
    savedSelection?: any;
    data?: any;
  }>({
    isOpen: false,
    x: 0,
    y: 0,
    type: "text",
  });

  const onEditEquationRef = useRef<any>(null);

  useEffect(() => {
    // We can intercept equation edit from a global event or attach it to window
    (window as any).__openGlobalEquationEditor = (data: any) => {
      if ((window as any).__equationEditorCallback) {
        (window as any).__equationEditorCallback(data);
      }
    };
  }, []);

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      const targetElement = e.target as HTMLElement;
      
      // Find if we are in Tiptap
      const pm = targetElement.closest(".ProseMirror");
      const isInput = targetElement.tagName === "INPUT" || targetElement.tagName === "TEXTAREA";
      
      if (pm || isInput) {
        e.preventDefault();
        e.stopPropagation();

        let type: any = "text";
        let editor: Editor | null = null;
        let savedSelection: any = null;
        let data: any = null;

        if (pm) {
          editor = (pm as any).__tiptapEditor;
          if (editor && !editor.isDestroyed) {
            // Try to set cursor to where the user right-clicked so actions apply to the clicked element
            const coords = { left: e.clientX, top: e.clientY };
            const pos = editor.view.posAtCoords(coords);
            const docSize = editor.state.doc.content.size;
            
            const mathEl = targetElement.closest(".math-rendered-block, .math-rendered-inline") as HTMLElement;
            if (mathEl) {
              type = "equation";
              const rawFrom = parseInt(mathEl.getAttribute("data-math-from") || "0", 10);
              const rawTo = parseInt(mathEl.getAttribute("data-math-to") || "0", 10);
              const from = Math.max(0, Math.min(isNaN(rawFrom) ? 0 : rawFrom, docSize));
              const to = Math.max(from, Math.min(isNaN(rawTo) ? from : rawTo, docSize));
              data = {
                from,
                to,
                text: mathEl.getAttribute("data-math-tex") || "",
                tex: mathEl.getAttribute("data-math-tex") || "",
                isBlock: mathEl.getAttribute("data-math-block") === "true",
              };
              if (from <= to && to <= docSize) {
                try {
                  editor.commands.setTextSelection({ from, to });
                } catch (err) {}
              }
            } else if (targetElement.tagName === "IMG") {
              type = "image";
              if (pos && typeof pos.pos === "number") {
                 // Try to select the image node specifically
                 try {
                   const safePos = Math.max(0, Math.min(pos.pos, docSize));
                   const resolved = editor.view.state.doc.resolve(safePos);
                   if (resolved.nodeAfter && resolved.nodeAfter.type.name === 'image') {
                     editor.commands.setNodeSelection(safePos);
                   } else if (resolved.nodeBefore && resolved.nodeBefore.type.name === 'image') {
                     const beforePos = Math.max(0, safePos - resolved.nodeBefore.nodeSize);
                     editor.commands.setNodeSelection(beforePos);
                   }
                 } catch (err) {}
              }
            } else if (targetElement.closest("table")) {
              type = "table";
              if (pos && typeof pos.pos === "number") {
                // Only move selection if current selection is not inside this table
                const { state } = editor;
                const { from, to } = state.selection;
                const safePos = Math.max(0, Math.min(pos.pos, docSize));
                try {
                  const safeFrom = Math.max(0, Math.min(from, docSize));
                  const domAtFrom = editor.view.domAtPos(safeFrom);
                  const node = domAtFrom.node as HTMLElement;
                  const tableAtSelection = (node && node.closest) ? node.closest("table") : (node && node.parentElement) ? node.parentElement.closest("table") : null;
                  
                  if (tableAtSelection !== targetElement.closest("table")) {
                     editor.commands.setTextSelection(safePos);
                  }
                } catch (err) {
                  try {
                    editor.commands.setTextSelection(safePos);
                  } catch (e) {}
                }
              }
            } else {
              // General text right click
              if (pos && typeof pos.pos === "number") {
                // Only move if we right clicked outside the current selection (don't clear active selection)
                const { from, to } = editor.state.selection;
                const safePos = Math.max(0, Math.min(pos.pos, docSize));
                if (safePos < from || safePos > to) {
                  try {
                    editor.commands.setTextSelection(safePos);
                  } catch (e) {}
                }
              }
            }
            
            // Save the active selection after our adjustments
            savedSelection = editor.state.selection;
          }
        } else if (isInput) {
          type = "input";
          const el = targetElement as HTMLInputElement | HTMLTextAreaElement;
          savedSelection = { start: el.selectionStart || 0, end: el.selectionEnd || 0 };
        }

        setMenuState({
          isOpen: true,
          x: e.clientX,
          y: e.clientY,
          type,
          editor,
          savedSelection,
          targetElement,
          data,
        });
      } else {
        // If it's not an editor or input, just let the default menu show or we can override it everywhere if needed.
        // For now, we only unify editors and input fields.
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      const el = e.target as HTMLElement;
      if (el && el.closest('.global-context-menu-container')) {
        return; // Don't close if clicking inside the menu
      }
      setMenuState((prev) => ({ ...prev, isOpen: false }));
    };

    window.addEventListener("contextmenu", handleContextMenu, { capture: true });
    window.addEventListener("mousedown", handleClickOutside, { capture: true });

    return () => {
      window.removeEventListener("contextmenu", handleContextMenu, { capture: true });
      window.removeEventListener("click", handleClickOutside, { capture: true });
    };
  }, []);

  const closeMenu = () => setMenuState((prev) => ({ ...prev, isOpen: false }));

  if (!menuState.isOpen) return null;

  const { editor, targetElement, type, data, savedSelection } = menuState;

  const executeEditorCommand = async (actionName: string, commandFunc: (editor: Editor) => void | Promise<void>) => {
    if (!editor || editor.isDestroyed) return;
    
    // Restore selection and focus so actions happen on the right-clicked element safely
    if (savedSelection) {
      try {
        const { tr } = editor.state;
        if (typeof savedSelection.from === "number" && typeof savedSelection.to === "number") {
          const maxPos = tr.doc.content.size;
          const safeFrom = Math.max(0, Math.min(savedSelection.from, maxPos));
          const safeTo = Math.max(safeFrom, Math.min(savedSelection.to, maxPos));
          tr.setSelection(TextSelection.create(tr.doc, safeFrom, safeTo));
        } else {
          tr.setSelection(savedSelection);
        }
        editor.view.dispatch(tr);
      } catch (err) {
        console.warn("Failed to restore selection in context menu:", err);
      }
    }
    
    // Crucial to explicitly focus the editor view before running clipboard commands
    if (!editor.isFocused) {
      editor.view.focus();
    }
    
    try {
      await commandFunc(editor);
    } catch(err) {
      console.error(`Failed to execute ${actionName}:`, err);
    }
    closeMenu();
  };

  const executeEditorChain = (actionName: string, chainAction: (chain: any) => any) => {
    if (!editor || editor.isDestroyed) return;
    
    if (savedSelection) {
      try {
        const { tr } = editor.state;
        if (typeof savedSelection.from === "number" && typeof savedSelection.to === "number") {
          const maxPos = tr.doc.content.size;
          const safeFrom = Math.max(0, Math.min(savedSelection.from, maxPos));
          const safeTo = Math.max(safeFrom, Math.min(savedSelection.to, maxPos));
          tr.setSelection(TextSelection.create(tr.doc, safeFrom, safeTo));
        } else {
          tr.setSelection(savedSelection);
        }
        editor.view.dispatch(tr);
      } catch (err) {}
    }
    
    if (!editor.isFocused) {
      editor.view.focus();
    }
    
    try {
      chainAction(editor.chain().focus()).run();
    } catch(err) {
      console.error(`Failed to execute chain ${actionName}:`, err);
    }
    closeMenu();
  };

  const handleInputAction = async (action: string) => {
    if (!targetElement) return;
    if (targetElement.tagName === "INPUT" || targetElement.tagName === "TEXTAREA") {
      const el = targetElement as HTMLInputElement | HTMLTextAreaElement;
      el.focus();
      if (savedSelection && typeof savedSelection.start === "number") {
         el.setSelectionRange(savedSelection.start, savedSelection.end);
      }
      try {
        if (action === "copy" || action === "cut") {
          const start = el.selectionStart || 0;
          const end = el.selectionEnd || 0;
          const text = el.value.substring(start, end);
          if (text) {
            await writeToClipboard("", text);
          }
          
          el.focus();
          el.setSelectionRange(start, end);

          if (action === "cut") {
            el.setRangeText("", start, end, "end");
            el.dispatchEvent(new Event('input', { bubbles: true }));
          }
        } else if (action === "paste") {
          const clipData = await readFromClipboard();
          el.focus();
          if (savedSelection && typeof savedSelection.start === "number") {
             el.setSelectionRange(savedSelection.start, savedSelection.end);
          }
          const text = clipData?.text || "";
          if (text) {
             const start = el.selectionStart || 0;
             const end = el.selectionEnd || 0;
             el.setRangeText(text, start, end, "end");
             el.dispatchEvent(new Event('input', { bubbles: true }));
          }
        } else if (action === "delete") {
          const start = el.selectionStart || 0;
          const end = el.selectionEnd || 0;
          if (start !== end) { el.setRangeText("", start, end, "end"); el.dispatchEvent(new Event('input', { bubbles: true })); }
        } else if (action === "selectAll") {
          el.setSelectionRange(0, el.value.length);
        }
      } catch (err: any) {
        console.error("Clipboard API failed for input:", err);
        alert(err.message || "حدث خطأ في عملية الحافظة");
      }
    }
    closeMenu();
  };

  return createPortal(
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.1 }}
      className="fixed z-[100] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-xl p-1 w-56 dir-rtl flex flex-col gap-0.5 global-context-menu-container"
      style={{
        top: Math.min(menuState.y, window.innerHeight - 300),
        left: Math.min(menuState.x, window.innerWidth - 250),
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
    >
      <button
        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
        onClick={() => editor ? executeEditorCommand("cut", executeCut) : handleInputAction("cut")}
        className="flex items-center justify-between px-2 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md w-full text-right"
      >
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 flex items-center justify-center">✂️</span>
          <span>قص (Cut)</span>
        </div>
        <span className="text-[10px] text-slate-400">Ctrl+X</span>
      </button>
      
      <button
        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
        onClick={() => editor ? executeEditorCommand("copy", executeCopy) : handleInputAction("copy")}
        className="flex items-center justify-between px-2 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md w-full text-right"
      >
        <div className="flex items-center gap-2">
          <Copy className="w-4 h-4 text-slate-400" />
          <span>نسخ (Copy)</span>
        </div>
        <span className="text-[10px] text-slate-400">Ctrl+C</span>
      </button>
      
      <button
        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
        onClick={async () => {
          if (editor) {
            await executeEditorCommand("paste", executePaste);
          } else {
            handleInputAction("paste");
          }
        }}
        className="flex items-center justify-between px-2 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md w-full text-right"
      >
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 flex items-center justify-center">📋</span>
          <span>لصق (Paste)</span>
        </div>
        <span className="text-[10px] text-slate-400">Ctrl+V</span>
      </button>

      {editor && (
        <>
          <button
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onClick={() => executeEditorCommand("duplicate", executeDuplicate)}
            className="flex items-center justify-between px-2 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md w-full text-right"
          >
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 flex items-center justify-center">🔂</span>
              <span>تكرار (Duplicate)</span>
            </div>
            <span className="text-[10px] text-slate-400">Ctrl+D</span>
          </button>
          
          <button
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onClick={() => executeEditorCommand("delete", executeDelete)}
            className="flex items-center justify-between px-2 py-1.5 text-xs text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30 rounded-md w-full text-right"
          >
            <div className="flex items-center gap-2">
              <Trash2 className="w-4 h-4" />
              <span>حذف (Delete)</span>
            </div>
            <span className="text-[10px] text-slate-400">Del</span>
          </button>

          <div className="h-px bg-slate-100 dark:bg-slate-800 my-1 mx-1"></div>

          <button
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onClick={() => executeEditorCommand("select_all", executeSelectAll)}
            className="flex items-center justify-between px-2 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md w-full text-right"
          >
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 flex items-center justify-center">✅</span>
              <span>تحديد الكل</span>
            </div>
            <span className="text-[10px] text-slate-400">Ctrl+A</span>
          </button>

          <div className="flex gap-1 w-full mt-1">
            <button
              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onClick={() => executeEditorCommand("undo", executeUndo)}
              className="flex-1 flex justify-center items-center py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md"
              title="تراجع (Undo)"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onClick={() => executeEditorCommand("redo", executeRedo)}
              className="flex-1 flex justify-center items-center py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md"
              title="إعادة (Redo)"
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>

          <div className="flex gap-1 w-full mt-1 px-1">
            <button
              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onClick={() => executeEditorChain("align", (chain) => chain.setTextAlign('right'))}
              className="flex-1 flex justify-center items-center py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md"
              title="محاذاة لليمين"
            >
              <AlignRight className="w-4 h-4" />
            </button>
            <button
              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onClick={() => executeEditorChain("align", (chain) => chain.setTextAlign('center'))}
              className="flex-1 flex justify-center items-center py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md"
              title="محاذاة للوسط"
            >
              <AlignCenter className="w-4 h-4" />
            </button>
            <button
              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onClick={() => executeEditorChain("align", (chain) => chain.setTextAlign('left'))}
              className="flex-1 flex justify-center items-center py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md"
              title="محاذاة لليسار"
            >
              <AlignLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Text Colors in Context Menu */}
          <div className="flex items-center justify-between gap-1 w-full mt-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-800 px-1">
            <span className="text-[10px] text-slate-400">تلوين:</span>
            <div className="flex items-center gap-1">
              {[
                { name: "أحمر", color: "#dc2626" },
                { name: "أزرق", color: "#2563eb" },
                { name: "أخضر", color: "#059669" },
                { name: "برتقالي", color: "#d97706" },
                { name: "بنفسجي", color: "#7c3aed" },
              ].map((c) => (
                <button
                  key={c.color}
                  onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onClick={() => executeEditorChain("color", (chain) => chain.setColor(c.color))}
                  className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-600 hover:scale-125 transition-transform cursor-pointer"
                  style={{ backgroundColor: c.color }}
                  title={c.name}
                />
              ))}
              <button
                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onClick={() => executeEditorChain("unsetColor", (chain) => chain.unsetColor())}
                className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-600 flex items-center justify-center text-[9px] text-slate-500 hover:text-rose-500 hover:scale-110 transition-transform cursor-pointer"
                title="إلغاء اللون"
              >
                ✕
              </button>
            </div>
          </div>
        </>
      )}

      {/* EQUATION SPECIFIC */}
      {editor && type === "equation" && (
        <>
          <div className="h-px bg-slate-100 dark:bg-slate-800 my-1 mx-1"></div>
          <button
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onClick={() => {
              if ((editor as any).__openEquationEditor) {
                (editor as any).__openEquationEditor(data);
              }
              closeMenu();
            }}
            className="flex items-center gap-2 px-2 py-1.5 text-xs font-bold text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-md w-full text-right"
          >
            <Edit className="w-4 h-4 text-blue-500" />
            <span>تعديل المعادلة</span>
          </button>
          <button
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onClick={() => executeEditorCommand("action", (ed) => {
              const maxPos = ed.state.doc.content.size;
              const safeFrom = Math.max(0, Math.min(data?.from || 0, maxPos));
              const safeTo = Math.max(safeFrom, Math.min(data?.to || 0, maxPos));
              let tex = data?.tex || "";
              if (data?.isBlock) {
                tex = tex.replace(/^\$\$([\s\S]+)\$\$/, "$$$1$$");
                ed.chain().focus().insertContentAt(safeTo, ` ${tex}`).run();
              } else {
                tex = tex.replace(/^\$((?:\\\$|[^\$])+)\$/, "$$$$$1$$$$");
                ed.chain().focus().insertContentAt(safeTo, `${tex}`).run();
              }
              if (safeFrom < safeTo) {
                ed.chain().focus().deleteRange({ from: safeFrom, to: safeTo }).run();
              }
            })}
            className="flex items-center gap-2 px-2 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md w-full text-right"
          >
            <ArrowRightLeft className="w-4 h-4 text-slate-400" />
            <span>تبديل مضمن / كتلة (Inline/Block)</span>
          </button>
          
          <button
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onClick={() => executeEditorCommand("action", (ed) => {
              const maxPos = ed.state.doc.content.size;
              const safeFrom = Math.max(0, Math.min(data?.from || 0, maxPos));
              ed.chain().focus().insertContentAt(safeFrom, " ").run();
            })}
            className="flex items-center gap-2 px-2 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md w-full text-right"
          >
            <ArrowUp className="w-4 h-4 text-slate-400" />
            <span>إدراج قبل المعادلة</span>
          </button>
          <button
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onClick={() => executeEditorCommand("action", (ed) => {
              const maxPos = ed.state.doc.content.size;
              const safeTo = Math.max(0, Math.min(data?.to || 0, maxPos));
              ed.chain().focus().insertContentAt(safeTo, " ").run();
            })}
            className="flex items-center gap-2 px-2 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md w-full text-right"
          >
            <ArrowDown className="w-4 h-4 text-slate-400" />
            <span>إدراج بعد المعادلة</span>
          </button>
        </>
      )}

      {/* TABLE SPECIFIC */}
      {editor && type === "table" && (
        <>
          <div className="h-px bg-slate-100 dark:bg-slate-800 my-1 mx-1"></div>
          <button
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onClick={() => executeEditorChain("merge_cells", (chain) => chain.mergeCells())}
            className="flex items-center gap-2 px-2 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 rounded-md w-full text-right transition-colors"
          >
            <Combine className="w-4 h-4 text-slate-400" />
            <span>دمج الخلايا المحددة</span>
          </button>
          <button
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onClick={() => executeEditorChain("split_cell", (chain) => chain.splitCell())}
            className="flex items-center gap-2 px-2 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 rounded-md w-full text-right transition-colors"
          >
            <Split className="w-4 h-4 text-slate-400" />
            <span>تقسيم الخلية</span>
          </button>
          <button
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onClick={() => executeEditorChain("delete_table", (chain) => chain.deleteTable())}
            className="flex items-center gap-2 px-2 py-1.5 text-xs text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30 rounded-md w-full text-right transition-colors"
          >
            <Trash className="w-4 h-4" />
            <span>حذف الجدول</span>
          </button>
        </>
      )}

      {/* IMAGE SPECIFIC */}
      {editor && type === "image" && (
        <>
          <div className="h-px bg-slate-100 dark:bg-slate-800 my-1 mx-1"></div>
          <button
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onClick={() => executeEditorCommand("action", (ed) => {
              const attrs = ed.getAttributes("image");
              const currentWidth = attrs.width ? parseInt(attrs.width, 10) : 300;
              ed.commands.updateAttributes("image", { width: currentWidth + 50 });
            })}
            className="flex items-center gap-2 px-2 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md w-full text-right"
          >
            <span className="w-4 h-4 flex items-center justify-center">🔍+</span>
            <span>تكبير الصورة</span>
          </button>
          <button
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onClick={() => executeEditorCommand("action", (ed) => {
              const attrs = ed.getAttributes("image");
              const currentWidth = attrs.width ? parseInt(attrs.width, 10) : 300;
              ed.commands.updateAttributes("image", { width: Math.max(50, currentWidth - 50) });
            })}
            className="flex items-center gap-2 px-2 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md w-full text-right"
          >
            <span className="w-4 h-4 flex items-center justify-center">🔍-</span>
            <span>تصغير الصورة</span>
          </button>
        </>
      )}
    </motion.div>,
    document.body
  );
};
