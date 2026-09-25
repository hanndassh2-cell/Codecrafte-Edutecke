import { EditorModalPortal } from "./EditorOverlay";
import React, { useEffect, useState } from "react";
import { X, Table as TableIcon } from "lucide-react";

interface TableInsertModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (rows: number, cols: number, withHeader: boolean) => void;
}

export const TableInsertModal: React.FC<TableInsertModalProps> = ({
  isOpen,
  onClose,
  onInsert,
}) => {
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);
  const [withHeader, setWithHeader] = useState(true);
  const [gridFocus, setGridFocus] = useState(0);
  const [hoveredSize, setHoveredSize] = useState({ rows: 0, cols: 0 });

  useEffect(() => {
    if (isOpen) setHoveredSize({ rows: 0, cols: 0 });
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!Number.isInteger(rows) || !Number.isInteger(cols) || rows < 1 || rows > 30 || cols < 1 || cols > 15) return;
    onInsert(rows, cols, withHeader);
    onClose();
  };

  const insertQuickTable = (quickRows: number, quickCols: number) => {
    onInsert(quickRows, quickCols, withHeader);
    onClose();
  };

  return (
    <EditorModalPortal onClose={onClose}>
    <div
      className="fixed inset-0 z-[2100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
      role="dialog" aria-modal="true" aria-label="إدراج جدول"
      dir="rtl"
    >
      <div className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800 shrink-0 sticky top-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-slate-800 dark:text-white">
            <TableIcon className="w-5 h-5 text-blue-500" />
            <h3 className="font-bold">إدراج جدول</h3>
          </div>
          <button
            onClick={onClose}
            aria-label="إغلاق إدراج الجدول"
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <section>
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-extrabold text-slate-800 dark:text-slate-100">اختيار حجم الجدول</h4>
                  <p className="mt-0.5 text-xs text-slate-500">مرّر المؤشر ثم انقر لاختيار حجم الجدول.</p>
                </div>
                <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-sm font-black text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                  {hoveredSize.rows && hoveredSize.cols ? `${hoveredSize.rows} × ${hoveredSize.cols}` : "اختر الحجم"}
                </span>
              </div>
              <div
                className="grid grid-cols-8 gap-1 rounded-xl border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-700 dark:bg-slate-950/50"
                onMouseLeave={() => setHoveredSize({ rows: 0, cols: 0 })}
                aria-label="شبكة اختيار حجم الجدول"
              >
                {Array.from({ length: 64 }, (_, index) => {
                  const cellRow = Math.floor(index / 8) + 1;
                  const cellCol = (index % 8) + 1;
                  const selected = cellRow <= hoveredSize.rows && cellCol <= hoveredSize.cols;
                  return (
                    <button
                      key={`${cellRow}-${cellCol}`}
                      type="button"
                      onMouseEnter={() => setHoveredSize({ rows: cellRow, cols: cellCol })}
                      tabIndex={gridFocus === index ? 0 : -1}
                      onFocus={() => { setGridFocus(index); setHoveredSize({ rows: cellRow, cols: cellCol }); }}
                      onKeyDown={event => {
                        const offsets: Record<string, number> = { ArrowLeft: 1, ArrowRight: -1, ArrowDown: 8, ArrowUp: -8 };
                        if (!(event.key in offsets)) return;
                        event.preventDefault();
                        const next = Math.max(0, Math.min(63, index + offsets[event.key]));
                        event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>("button")[next]?.focus();
                      }}
                      onClick={() => insertQuickTable(cellRow, cellCol)}
                      className={`aspect-square min-h-7 rounded-[3px] border transition ${selected ? "border-blue-600 bg-blue-500 shadow-sm" : "border-slate-300 bg-white hover:border-blue-400 dark:border-slate-600 dark:bg-slate-800"}`}
                      title={`إدراج جدول ${cellRow} صف × ${cellCol} عمود`}
                      aria-label={`${cellRow} صف و${cellCol} عمود`}
                    />
                  );
                })}
              </div>
            </section>

            <div className="flex items-center gap-3 text-xs font-bold text-slate-400">
              <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
              <span>أو أدخل المقاس بدقة</span>
              <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  عدد الصفوف
                </label>
                <input
                  aria-label="عدد الصفوف"
                  type="number"
                  min="1"
                  max="30"
                  value={rows}
                  onChange={(e) => setRows(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-shadow text-center"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  عدد الأعمدة
                </label>
                <input
                  aria-label="عدد الأعمدة"
                  type="number"
                  min="1"
                  max="15"
                  value={cols}
                  onChange={(e) => setCols(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-shadow text-center"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800/50">
              <input
                type="checkbox"
                id="withHeader"
                checked={withHeader}
                onChange={(e) => setWithHeader(e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-slate-100 border-slate-300 rounded focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600"
              />
              <label
                htmlFor="withHeader"
                className="text-sm font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                تضمين صف العنوان (ترويسة)
              </label>
            </div>

            <div className="mt-2 flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm"
              >
                إدراج جدول {rows} × {cols}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
    </EditorModalPortal>
  );
};
