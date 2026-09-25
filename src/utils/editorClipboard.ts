import { processSmartPaste } from "../modules/editor/components/RichTextEditor";
import { processCentralContentPipeline } from "../services/bidiContentPipeline";
import { sanitizeHtmlForProseMirror } from "../services/smartPasteEngine";
import { Editor } from "@tiptap/core";
import { DOMSerializer } from "prosemirror-model";
import { TextSelection, NodeSelection } from "prosemirror-state";
import { writeToClipboard, readFromClipboard } from "./clipboard";

export const executeCopy = async (editor: Editor) => {
  const { state } = editor;
  if (state.selection.empty && !(state.selection instanceof NodeSelection)) {
    editor.view.focus();
    return;
  }

  const currentSelection = state.selection;
  const slice = state.selection.content();
  const div = document.createElement("div");
  const fragment = DOMSerializer.fromSchema(state.schema).serializeFragment(slice.content);
  div.appendChild(fragment);
  const html = div.innerHTML;
  const text = state.doc.textBetween(state.selection.from, state.selection.to, "\n");
  
  try {
    await writeToClipboard(html, text);
  } catch (err: any) {
    alert(err.message || "حدث خطأ أثناء النسخ");
  }
  
  if (!editor.isFocused) {
    editor.view.focus();
  }
  try {
    const { tr } = editor.state;
    tr.setSelection(currentSelection);
    editor.view.dispatch(tr);
  } catch (e) {}
};

export const executeCut = async (editor: Editor) => {
  const { state } = editor;
  if (state.selection.empty && !(state.selection instanceof NodeSelection)) {
    editor.view.focus();
    return;
  }

  // Cache selection before async copy
  const currentSelection = state.selection;

  try {
    await executeCopy(editor);
    
    // Restore selection in case it was lost during the permission prompt
    if (!editor.isFocused) {
       editor.view.focus();
    }
    try {
       const { tr } = editor.state;
       tr.setSelection(currentSelection);
       editor.view.dispatch(tr);
    } catch (e) {}

    editor.chain().focus().deleteSelection().run();
  } catch (err: any) {
    alert(err.message || "حدث خطأ أثناء القص");
  }
};

export const executePaste = async (editor: Editor) => {
  try {
    // Cache the selection BEFORE waiting for the async clipboard
    const currentSelection = editor.state.selection;
    
    const clipboardData = await readFromClipboard();
    
    // Re-focus and restore selection if it was lost during the permission prompt
    if (!editor.isFocused) {
       editor.view.focus();
    }
    try {
       const { tr } = editor.state;
       tr.setSelection(currentSelection);
       editor.view.dispatch(tr);
    } catch (e) {}

    if (clipboardData) {
      const html = clipboardData.html || "";
      const text = clipboardData.text || "";
      const filesList = clipboardData.files as unknown as FileList | null;
      
      // Check if processSmartPaste is available, otherwise use raw html/text
      let cleanedHtml = html;
      if (typeof processSmartPaste === "function") {
        try {
          const processed = await processSmartPaste(html, text, filesList);
          if (processed) cleanedHtml = processed;
        } catch (e) {
          console.error("processSmartPaste failed", e);
        }
      }
      
      if (cleanedHtml) {
        if (typeof processCentralContentPipeline === "function") {
          try {
             const { html: normalizedHtml } = processCentralContentPipeline(cleanedHtml, {
               cleanWordJunk: true,
               convertEquations: true,
               normalizeLists: true,
             });
             cleanedHtml = normalizedHtml;
          } catch (err) {}
        }
        const safeHtml = sanitizeHtmlForProseMirror(cleanedHtml);
        try {
          editor.chain().focus().insertContent(safeHtml).run();
        } catch (err) {
          console.warn("[editorClipboard] insertContent failed with HTML, falling back to text", err);
          if (text) {
            try {
              editor.chain().focus().insertContent(text).run();
            } catch (textErr) {
              console.error("[editorClipboard] Text insert fallback failed", textErr);
            }
          }
        }
      } else if (text) {
        try {
          editor.chain().focus().insertContent(text).run();
        } catch (textErr) {
          console.error("[editorClipboard] Text insert failed", textErr);
        }
      }
    } else {
      console.error("Clipboard blocked or empty.");
    }
  } catch (err: any) {
    alert(err.message || "حدث خطأ أثناء اللصق");
  }
};

export const executeDuplicate = async (editor: Editor) => {
  if (!editor || editor.isDestroyed) return;
  const { state, view } = editor;
  if (state.selection.empty && !(state.selection instanceof NodeSelection)) {
    editor.view.focus();
    return;
  }
  const slice = state.selection.content();
  const maxPosBefore = state.doc.content.size;
  const insertPos = Math.max(0, Math.min(state.selection.to, maxPosBefore));
  const tr = state.tr.insert(insertPos, slice.content);
  
  try {
    const maxPosAfter = tr.doc.content.size;
    const safeTo = Math.max(0, Math.min(insertPos, maxPosAfter));
    if (state.selection instanceof NodeSelection) {
      tr.setSelection(NodeSelection.create(tr.doc, safeTo));
    } else {
      const safeEnd = Math.max(safeTo, Math.min(safeTo + slice.content.size, maxPosAfter));
      tr.setSelection(TextSelection.create(tr.doc, safeTo, safeEnd));
    }
  } catch (e) {
    console.warn("Failed to restore selection after duplicate", e);
  }
  
  view.dispatch(tr);
  editor.view.focus();
};

export const executeDelete = (editor: Editor) => {
  editor.chain().focus().deleteSelection().run();
};

export const executeSelectAll = (editor: Editor) => {
  editor.chain().focus().selectAll().run();
};

export const executeUndo = (editor: Editor) => {
  editor.chain().focus().undo().run();
};

export const executeRedo = (editor: Editor) => {
  editor.chain().focus().redo().run();
};

