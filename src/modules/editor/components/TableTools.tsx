import React from "react";
import { Editor, useEditorState } from "@tiptap/react";
import { CellSelection, TableMap } from "@tiptap/pm/tables";
import { Rows, Columns, Table as TableIcon, ArrowUp, ArrowDown, ArrowRightLeft, Combine, Split, Trash2 } from "lucide-react";

export const TableTools = ({ editor }: { editor: Editor }) => {
  const tableState = useEditorState({ editor, selector: ({ editor: current }) => {
    let hasTable = false;
    current.state.doc.descendants(node => {
      if (node.type.name === "table") { hasTable = true; return false; }
      return !hasTable;
    });
    return {
    hasTable,
    isTable: current.isActive("table"),
    canMerge: current.can().mergeCells(),
    canSplit: current.can().splitCell(),
    hasCellSelection: current.state.selection instanceof CellSelection,
  }; } });
  // Keep this rail in the document flow while the document has a table.
  // Revealing it on mousedown used to move every cell under the pointer.
  if (!editor.isEditable || !tableState?.hasTable) return null;

  const run = (command: () => void) => (event: React.MouseEvent) => {
    event.preventDefault();
    command();
  };

  const toolClass =
    "flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-35 dark:text-slate-200 dark:hover:bg-slate-800";

  const selectTableRange = (mode: "row" | "column" | "table") => {
    const selection = editor.state.selection;
    const $from = selection instanceof CellSelection
      ? editor.state.doc.resolve(selection.$anchorCell.pos + 1)
      : selection.$from;
    let cellDepth = $from.depth;
    while (cellDepth > 0 && !["tableCell", "tableHeader"].includes($from.node(cellDepth).type.name)) cellDepth -= 1;
    if (cellDepth <= 0) return;

    let tableDepth = cellDepth - 1;
    while (tableDepth > 0 && $from.node(tableDepth).type.name !== "table") tableDepth -= 1;
    if (tableDepth <= 0) return;

    const tableNode = $from.node(tableDepth);
    const tableStart = $from.start(tableDepth);
    const cellOffset = $from.before(cellDepth) - tableStart;
    const map = TableMap.get(tableNode);
    const rect = map.findCell(cellOffset);

    let anchorCell = tableStart + map.positionAt(rect.top, rect.left, tableNode);
    let headCell = anchorCell;
    if (mode === "row") {
      anchorCell = tableStart + map.positionAt(rect.top, 0, tableNode);
      headCell = tableStart + map.positionAt(rect.top, map.width - 1, tableNode);
    } else if (mode === "column") {
      anchorCell = tableStart + map.positionAt(0, rect.left, tableNode);
      headCell = tableStart + map.positionAt(map.height - 1, rect.left, tableNode);
    } else {
      anchorCell = tableStart + map.positionAt(0, 0, tableNode);
      headCell = tableStart + map.positionAt(map.height - 1, map.width - 1, tableNode);
    }

    editor.chain().focus().setCellSelection({ anchorCell, headCell }).run();
  };

  const hasCellSelection = editor.state.selection instanceof CellSelection;

  return (
    <fieldset
      disabled={!tableState.isTable}
      role="toolbar"
      aria-label="أدوات الجدول"
      className="table-context-toolbar flex h-11 min-w-0 w-full flex-nowrap items-center gap-1 overflow-x-auto border-0 border-t border-blue-100 bg-blue-50/60 px-4 py-1 dark:border-slate-700 dark:bg-slate-900"
      dir="rtl"
    >
      <span className="px-1.5 text-xs font-extrabold text-blue-700 dark:text-blue-300">الجدول</span>
      <div className="h-5 w-px bg-slate-200 dark:bg-slate-700" />
      <button type="button" className={toolClass} onMouseDown={(event) => event.preventDefault()} onClick={run(() => selectTableRange("row"))} title="تحديد الصف الحالي"><Rows className="h-3.5 w-3.5" /><span>تحديد صف</span></button>
      <button type="button" className={toolClass} onMouseDown={(event) => event.preventDefault()} onClick={run(() => selectTableRange("column"))} title="تحديد العمود الحالي"><Columns className="h-3.5 w-3.5" /><span>تحديد عمود</span></button>
      <button type="button" className={toolClass} onMouseDown={(event) => event.preventDefault()} onClick={run(() => selectTableRange("table"))} title="تحديد الجدول كاملًا"><TableIcon className="h-3.5 w-3.5" /><span>تحديد الكل</span></button>
      <div className="h-5 w-px bg-slate-200 dark:bg-slate-700" />
      <button type="button" className={toolClass} onMouseDown={(event) => event.preventDefault()} onClick={run(() => editor.chain().focus().addRowBefore().run())} title="إضافة صف أعلى"><Rows className="h-3.5 w-3.5" /><ArrowUp className="h-3 w-3" /></button>
      <button type="button" className={toolClass} onMouseDown={(event) => event.preventDefault()} onClick={run(() => editor.chain().focus().addRowAfter().run())} title="إضافة صف أسفل"><Rows className="h-3.5 w-3.5" /><ArrowDown className="h-3 w-3" /></button>
      <button type="button" className={toolClass} onMouseDown={(event) => event.preventDefault()} onClick={run(() => editor.chain().focus().addColumnBefore().run())} title="إضافة عمود قبل"><Columns className="h-3.5 w-3.5" /><ArrowRightLeft className="h-3 w-3" /></button>
      <button type="button" className={toolClass} onMouseDown={(event) => event.preventDefault()} onClick={run(() => editor.chain().focus().addColumnAfter().run())} title="إضافة عمود بعد"><Columns className="h-3.5 w-3.5" /><ArrowRightLeft className="h-3 w-3" /></button>
      <div className="h-5 w-px bg-slate-200 dark:bg-slate-700" />
      <button type="button" className={toolClass} disabled={!hasCellSelection || !editor.can().mergeCells()} onMouseDown={(event) => event.preventDefault()} onClick={run(() => editor.chain().focus().mergeCells().run())} title={hasCellSelection ? "دمج الخلايا المحددة" : "حدد خليتين أو أكثر أولًا بالسحب أو Shift + نقرة"}><Combine className="h-3.5 w-3.5" /><span className="hidden sm:inline">دمج الخلايا</span></button>
      <button type="button" className={toolClass} disabled={!editor.can().splitCell()} onMouseDown={(event) => event.preventDefault()} onClick={run(() => editor.chain().focus().splitCell().run())} title="تقسيم الخلية المدمجة إلى خلاياها الأصلية"><Split className="h-3.5 w-3.5" /><span className="hidden sm:inline">تقسيم الخلية</span></button>
      <div className="h-5 w-px bg-slate-200 dark:bg-slate-700" />
      <button type="button" className={`${toolClass} text-rose-600 dark:text-rose-300`} onMouseDown={(event) => event.preventDefault()} onClick={run(() => editor.chain().focus().deleteRow().run())} title="حذف الصف الحالي">حذف صف</button>
      <button type="button" className={`${toolClass} text-rose-600 dark:text-rose-300`} onMouseDown={(event) => event.preventDefault()} onClick={run(() => editor.chain().focus().deleteColumn().run())} title="حذف العمود الحالي">حذف عمود</button>
      <button type="button" className={`${toolClass} text-rose-700 dark:text-rose-300`} onMouseDown={(event) => event.preventDefault()} onClick={run(() => editor.chain().focus().deleteTable().run())} title="حذف الجدول"><Trash2 className="h-3.5 w-3.5" /></button>
    </fieldset>
  );
};

