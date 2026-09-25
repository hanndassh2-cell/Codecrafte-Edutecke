/** Real React controls + TipTap transactions in DOM. Browser geometry is tested separately. */
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import React, { act } from 'react';

const dom = new JSDOM('<!doctype html><html><body><div id="editor"></div><div id="tools"></div></body></html>', { url: 'http://localhost', pretendToBeVisual: true });
for (const key of ['window', 'document', 'navigator', 'HTMLElement', 'Element', 'Node', 'MutationObserver', 'DOMParser', 'KeyboardEvent', 'MouseEvent', 'getComputedStyle']) {
  Object.defineProperty(globalThis, key, { configurable: true, value: (dom.window as any)[key] });
}
Object.assign(globalThis, {
  IS_REACT_ACT_ENVIRONMENT: true,
  requestAnimationFrame: (cb: FrameRequestCallback) => setTimeout(() => cb(0), 0),
  cancelAnimationFrame: clearTimeout,
});
// JSDOM supplies no layout. These stubs only let ProseMirror focus its DOM selection.
(dom.window.Range.prototype as any).getClientRects = () => [];
(dom.window.Range.prototype as any).getBoundingClientRect = () => ({ top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0 });
const { createRoot } = await import('react-dom/client');
const { Editor } = await import('@tiptap/react');
const { default: StarterKit } = await import('@tiptap/starter-kit');
const { Table } = await import('@tiptap/extension-table');
const { TableRow } = await import('@tiptap/extension-table-row');
const { TableCell } = await import('@tiptap/extension-table-cell');
const { TableHeader } = await import('@tiptap/extension-table-header');
const { CellSelection, TableMap } = await import('@tiptap/pm/tables');
const { TableTools } = await import('../modules/editor/components/TableTools');
const { TableInsertModal } = await import('../modules/editor/components/TableInsertModal');

const editor = new Editor({ element: document.getElementById('editor')!, extensions: [StarterKit, Table, TableRow, TableCell, TableHeader], content: '<p>بداية</p><table>'+[0,1,2].map(r => '<tr>'+[0,1,2].map(c => `<td><p>${r},${c}</p></td>`).join('')+'</tr>').join('')+'</table><p>نهاية</p>' });
const root = createRoot(document.getElementById('tools')!);
await act(async () => { root.render(<TableTools editor={editor} />); });
const settle = async (fn: () => void) => act(async () => { fn(); await new Promise(resolve => setTimeout(resolve, 8)); });
const tableInfo = () => {
  let table: any, start = 0;
  editor.state.doc.descendants((node, pos) => { if(node.type.name === 'table') { table = node; start = pos + 1; return false; } });
  return { table, start, map: TableMap.get(table) };
};
const selectMiddle = async () => { const { table, start, map } = tableInfo(); await settle(() => { editor.commands.setTextSelection(start + map.positionAt(1, 1, table) + 2); }); };
const button = (title: string) => document.querySelector<HTMLButtonElement>(`button[title="${title}"]`)!;
const click = async (title: string) => {
  const target = button(title); assert.ok(target, title); assert.equal(target.disabled, false, title+' must be enabled');
  await settle(() => { target.dispatchEvent(new dom.window.MouseEvent('mousedown', { bubbles: true, cancelable: true })); target.click(); });
};
const selectedCells = () => document.querySelectorAll('#editor .selectedCell').length;
const countCells = () => document.querySelectorAll('#editor td, #editor th').length;

await selectMiddle();
assert.equal(button('حدد خليتين أو أكثر أولًا بالسحب أو Shift + نقرة').disabled, true);
await click('تحديد الصف الحالي');
assert.equal(selectedCells(), 3, 'row selection includes cells before the middle cell');
assert.ok(editor.state.selection instanceof CellSelection);
await click('دمج الخلايا المحددة');
assert.equal(countCells(), 7);
assert.equal(document.querySelector('#editor [colspan="3"]')?.textContent, '1,01,11,2', 'merged content retained');
await click('تقسيم الخلية المدمجة إلى خلاياها الأصلية');
assert.equal(countCells(), 9);
assert.equal(button('تقسيم الخلية المدمجة إلى خلاياها الأصلية').disabled, true, 'split state refreshes after transaction');
console.log('PASS React row selection → merge → split, including live enabled states');

await selectMiddle();
await click('تحديد العمود الحالي');
assert.equal(selectedCells(), 3, 'column selection includes cells above the middle cell');
await click('دمج الخلايا المحددة');
assert.ok(document.querySelector('#editor [rowspan="3"]'));
await click('تقسيم الخلية المدمجة إلى خلاياها الأصلية');
assert.equal(countCells(), 9);
console.log('PASS middle-column selection → vertical merge → split');

await selectMiddle();
await click('تحديد الجدول كاملًا');
assert.equal(selectedCells(), 9);
await click('دمج الخلايا المحددة');
assert.equal(countCells(), 1);
await click('تقسيم الخلية المدمجة إلى خلاياها الأصلية');
assert.equal(countCells(), 9);
await selectMiddle();
await click('إضافة صف أسفل');
assert.equal(tableInfo().map.height, 4);
await selectMiddle();
await click('حذف الصف الحالي');
assert.equal(tableInfo().map.height, 3);
await click('إضافة عمود بعد');
assert.equal(tableInfo().map.width, 4);
await selectMiddle();
const { closeHistory } = await import('@tiptap/pm/history');
await settle(() => { editor.view.dispatch(closeHistory(editor.state.tr)); });
await click('حذف العمود الحالي');
assert.equal(tableInfo().map.width, 3);
await settle(() => { editor.commands.undo(); });
assert.equal(tableInfo().map.width, 4);
await settle(() => { editor.commands.redo(); });
assert.equal(tableInfo().map.width, 3);
console.log('PASS whole-table merge/split, row/column add/delete and undo/redo');

let inserted: number[] = [], closed = 0;
await act(async () => { root.render(<TableInsertModal isOpen onClose={() => { closed++; }} onInsert={(rows, cols) => { inserted = [rows, cols]; }} />); });
const grid = document.querySelector<HTMLButtonElement>('button[aria-label="2 صف و4 عمود"]')!;
assert.ok(grid);
await settle(() => grid.click());
assert.deepEqual(inserted, [2,4]);
assert.equal(closed, 1);
// Reopen and exercise numeric controls and form submit.
await act(async () => { root.render(<TableInsertModal key="numeric" isOpen onClose={() => { closed++; }} onInsert={(rows, cols) => { inserted = [rows, cols]; }} />); });
const setInput = async (label: string, value: string) => settle(() => {
  const input = document.querySelector<HTMLInputElement>(`input[aria-label="${label}"]`)!;
  Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value')!.set!.call(input, value);
  input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
});
await setInput('عدد الصفوف', '5'); await setInput('عدد الأعمدة', '6');
await settle(() => document.querySelector('form')!.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true })));
assert.deepEqual(inserted, [5,6]);
assert.equal(document.querySelector('[role="dialog"]')?.parentElement?.parentElement, document.body, 'dialog escapes document stacking context');
await settle(() => document.querySelector('input')!.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })));
assert.equal(closed, 3);
console.log('PASS grid and numeric insertion, dialog portal and Escape');
const { FocusedEditorWorkspace, WorkspaceToolbarHost, WorkspaceToolbar, WorkspaceStatus } = await import('../modules/editor/components/FocusedEditorWorkspace');
const secondElement = document.createElement('div'); document.body.appendChild(secondElement);
const secondEditor = new Editor({ element: secondElement, extensions: [StarterKit], content: '<p>نص علمي عربي</p>' });
await act(async () => { root.render(<FocusedEditorWorkspace>
  <WorkspaceToolbarHost />
  <WorkspaceToolbar editor={editor}><button>الأدوات الأولى</button></WorkspaceToolbar>
  <WorkspaceToolbar editor={secondEditor}><button>الأدوات الثانية</button></WorkspaceToolbar>
  <WorkspaceStatus isDirty={false} isSaving={false} index={0} count={2} zoom={100} onZoom={() => {}} />
</FocusedEditorWorkspace>); });
assert.equal(document.querySelector('.workspace-toolbar-host')?.textContent, 'الأدوات الأولى');
await settle(() => { secondEditor.commands.focus('end'); });
assert.equal(document.querySelector('.workspace-toolbar-host')?.textContent, 'الأدوات الثانية', 'single ribbon follows active field');
assert.ok(document.querySelector('.workspace-status')?.textContent?.includes('عدد الكلمات: 3'));
await settle(() => { secondEditor.commands.insertContent(' جديد'); });
assert.ok(document.querySelector('.workspace-status')?.textContent?.includes('عدد الكلمات: 4'));
await settle(() => { editor.commands.focus(); });
assert.equal(document.querySelector('.workspace-toolbar-host')?.textContent, 'الأدوات الأولى');
console.log('PASS single toolbar ownership, field switching and live word count');
await act(async () => root.unmount());
editor.destroy(); secondEditor.destroy(); dom.window.close();
