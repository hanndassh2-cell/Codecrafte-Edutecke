/** Integration tests of the production RichTextEditor, not a parallel editor.
 * JSDOM has no layout: CSS painting and pointer-drag geometry require browser QA. */
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { JSDOM } from 'jsdom';
import React, { act, useState } from 'react';
import type { Editor } from '@tiptap/react';
registerHooks({ load(url, context, next) {
  // Node does not load stylesheets. Never substitute editor/MathLive code.
  if (url.endsWith('.css')) return { format: 'module', source: 'export default {}', shortCircuit: true };
  return next(url, context);
} });
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'http://localhost', pretendToBeVisual: true });
for (const key of ['window','document','navigator','HTMLElement','Element','Node','MutationObserver','DOMParser','getComputedStyle','localStorage','Event','CustomEvent','customElements','DocumentFragment','KeyboardEvent','MouseEvent','HTMLSelectElement','HTMLInputElement','HTMLTextAreaElement']) {
  Object.defineProperty(globalThis, key, { configurable: true, value: (dom.window as any)[key] });
}
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true, requestAnimationFrame: (cb: FrameRequestCallback) => setTimeout(() => cb(0), 0), cancelAnimationFrame: clearTimeout });
(dom.window.Range.prototype as any).getClientRects = () => [];
(dom.window.Range.prototype as any).getBoundingClientRect = () => ({ top:0,bottom:0,left:0,right:0,width:0,height:0 });
window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return false; }, media: '', onchange: null });
const { createRoot } = await import('react-dom/client');
const { RichTextEditor } = await import('../modules/editor/components/RichTextEditor');
const { CellSelection, TableMap } = await import('@tiptap/pm/tables');
const { BULLET_STYLES, NUMBER_STYLES, formatListMarker, normalizeHtmlLists } = await import('../utils/listEngine');
const sample = '<p dir="rtl" data-dir-mode="manual" style="text-align:center"><span style="font-size:24pt;font-family:Arial;color:#a21caf">درس علمي كبير</span></p><p></p>';
let editor: Editor;
let output = '';
function Harness() {
  const [value, setValue] = useState(sample);
  return <RichTextEditor value={value} onChange={html => { output = html; setValue(html); }} onFocus={current => { editor = current; }} autoFocus />;
}
const runtimeErrors: string[] = [];
window.addEventListener('error', event => runtimeErrors.push(event.message));
const root = createRoot(document.getElementById('root')!);
const settle = async (fn: () => void) => act(async () => { fn(); await new Promise(resolve => setTimeout(resolve, 35)); });
await settle(() => root.render(<Harness />));
await settle(() => {});
assert.ok(editor!);
const click = async (name: string) => {
  const button = Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find(b => b.getAttribute('aria-label') === name || b.title === name);
  assert.ok(button, name); assert.equal(button.disabled, false, name);
  await settle(() => { button.dispatchEvent(new MouseEvent('mousedown', { bubbles:true, cancelable:true })); button.click(); });
};
const setContent = async (html: string) => settle(() => { editor.commands.setContent(html); editor.commands.setTextSelection(1); });
const selectText = async (text: string) => {
  let pos = 0;
  editor.state.doc.descendants((node, p) => { if (node.isText && node.text?.includes(text)) pos = p; });
  await settle(() => { editor.commands.setTextSelection({ from:pos, to:pos+text.length }); });
};
const assertTypography = () => {
  const span = editor.view.dom.querySelector('span[style*="font-size"]') as HTMLElement;
  assert.ok(span, '24pt inline mark must survive');
  assert.equal(span.style.fontSize,'24pt'); assert.equal(span.style.fontFamily,'Arial'); assert.equal(span.style.color,'rgb(162, 28, 175)');
  const p = span.closest('p')!;
  assert.equal(p.style.textAlign,'center'); assert.equal(p.getAttribute('dir'),'rtl'); assert.equal(p.getAttribute('data-dir-mode'),'manual');
};
await selectText('درس علمي كبير');
await click('تعداد نقطي'); assertTypography(); assert.ok(editor.isActive('bulletList'));
await click('تعداد نقطي'); assertTypography(); assert.equal(editor.isActive('bulletList'),false);
await click('تعداد رقمي'); assertTypography();
await click('تعداد رقمي'); assertTypography();
assert.ok(output.includes('24pt'), 'controlled onChange must retain the font after animation frames');
console.log('PASS L01 production toolbar: 24pt/Arial/color/center/manual RTL survive both list toggles and controlled updates');

// Explicit paragraph typography and old li inheritance survive wrapping/lifting.
await setContent('<h2 dir="ltr" data-dir-mode="manual" style="font-size:24pt;font-family:Arial;color:blue;text-align:right">Scientific heading</h2><p></p>');
await selectText('Scientific heading'); await click('تعداد نقطي');
let p = editor.view.dom.querySelector('li p') as HTMLElement;
assert.equal(p.style.fontSize,'24pt'); assert.equal(p.style.fontFamily,'Arial'); assert.equal(p.style.color,'blue'); assert.equal(p.style.textAlign,'right'); assert.equal(p.getAttribute('dir'),'ltr');
await click('تعداد نقطي');
p = editor.view.dom.querySelector('p')!;
assert.equal(p.style.fontSize,'24pt'); assert.equal(p.style.color,'blue');
await setContent('<ul><li style="font-size:24pt;font-family:Arial;color:blue"><p>تنسيق قديم</p></li></ul>');
await selectText('تنسيق قديم'); await click('تعداد نقطي');
p = editor.view.dom.querySelector('p')!;
assert.equal(p.style.fontSize,'24pt'); assert.equal(p.style.fontFamily,'Arial'); assert.equal(p.style.color,'blue');
console.log('PASS L02 headings and legacy li typography survive conversion and lifting');

await setContent(sample); await selectText('درس علمي كبير');
for (const [label, styles, type] of [['تعداد نقطي',BULLET_STYLES,'bulletList'],['تعداد رقمي',NUMBER_STYLES,'orderedList']] as const) {
  for (const style of styles) {
    await click('أنماط '+label); await click(style.label);
    assert.equal(editor.getAttributes(type).listStyle, style.id);
    assertTypography();
  }
}
assert.equal(formatListMarker(12,'arabic-indic'),'١٢.');
assert.equal(formatListMarker(3,'arabic-alpha'),'ت.');
assert.equal(formatListMarker(3,'arabic-abjad'),'ج.');
assert.equal(formatListMarker(4,'upper-roman'),'IV.');
const persisted = editor.getHTML();
await setContent(persisted); assertTypography();
const normalized = new DOMParser().parseFromString(normalizeHtmlLists('<ul><li><p dir="ltr" data-dir-mode="manual" style="text-align:center">عربي باتجاه يدوي</p></li></ul>'), 'text/html');
assert.equal(normalized.querySelector('p')?.getAttribute('dir'), 'ltr');
console.log('PASS L03 all gallery entries execute on the production editor and retain formatting; Arabic/Abjad/Roman marker values');

const key = async (key: string, shiftKey = false) => settle(() => {
  editor.view.dom.dispatchEvent(new KeyboardEvent('keydown',{ key, code:key, shiftKey, bubbles:true, cancelable:true }));
});
await setContent('<ul data-list-style="check"><li><p>الأول</p></li><li><p>الثاني</p></li></ul>');
await selectText('الثاني'); await key('Tab');
assert.ok(editor.view.dom.querySelector('li ul li'), 'Tab sinks second item');
await key('Tab',true); assert.equal(editor.view.dom.querySelector('li ul'),null);
await settle(() => { editor.commands.setTextSelection(editor.state.selection.to); });
await key('Enter');
assert.equal(editor.view.dom.querySelectorAll('li').length,3,'Enter leaves an editable empty item even after onUpdate');
await key('Enter');
assert.equal(editor.isActive('listItem'),false,'Enter on empty item exits');
await settle(() => { editor.commands.insertContent('فقرة بعد القائمة'); });
assert.ok(editor.state.selection.$from.parent.textContent.includes('فقرة بعد القائمة'));
console.log('PASS L04 real keyboard events: Tab, Shift+Tab, Enter and exit empty list');

// Real controls on a table containing empty cells exercise the former sanitizer bug.
await setContent('<p>بداية</p><table><tr><td><p>أ</p></td><td><p>ب</p></td><td><p></p></td></tr><tr><td><p></p></td><td><p>ج</p></td><td><p></p></td></tr></table><p></p>');
const tableInfo = () => { let table: any, start=0; editor.state.doc.descendants((n,pos) => { if(n.type.name==='table'){table=n;start=pos+1;return false;} }); return {table,start,map:TableMap.get(table)}; };
const selectCell = async (row=0,col=0) => { const {table,start,map}=tableInfo(); await settle(() => {editor.commands.setTextSelection(start+map.positionAt(row,col,table)+2);}); };
const countCells = () => editor.view.dom.querySelectorAll('td,th').length;
const railSlot = document.querySelector('.toolbar-second-row')!;
assert.ok(railSlot, 'second row exists before entering a cell');
assert.equal(document.querySelector('[aria-label="أدوات الجدول"]'), null, 'table tools are contextual');
let info=tableInfo();
await settle(() => {editor.commands.setCellSelection({anchorCell:info.start+info.map.positionAt(0,0,info.table),headCell:info.start+info.map.positionAt(0,1,info.table)});});
assert.ok(editor.state.selection instanceof CellSelection);
assert.equal(document.querySelector('.toolbar-second-row'), railSlot, 'context switch reuses second row');
assert.ok(document.querySelector('[aria-label="أدوات الجدول"]'));
assert.equal(document.querySelector('.toolbar-insert-slot')?.hasAttribute('hidden'), true);
await click('دمج الخلايا المحددة'); assert.equal(countCells(),5); assert.ok(editor.view.dom.querySelector('[colspan="2"]'));
assert.ok(editor.view.dom.textContent?.includes('أب'));
await click('تقسيم الخلية المدمجة إلى خلاياها الأصلية'); assert.equal(countCells(),6);
await selectCell(0,1); await click('تحديد الصف الحالي'); assert.equal(editor.view.dom.querySelectorAll('.selectedCell').length,3);
await click('دمج الخلايا المحددة'); await click('تقسيم الخلية المدمجة إلى خلاياها الأصلية'); assert.equal(countCells(),6);
await selectCell(1,1); await click('تحديد العمود الحالي'); assert.equal(editor.view.dom.querySelectorAll('.selectedCell').length,2);
await click('دمج الخلايا المحددة'); assert.ok(editor.view.dom.querySelector('[rowspan="2"]')); await click('تقسيم الخلية المدمجة إلى خلاياها الأصلية');
await selectCell(); await click('تحديد الجدول كاملًا'); assert.equal(editor.view.dom.querySelectorAll('.selectedCell').length,6);
await click('دمج الخلايا المحددة'); assert.equal(countCells(),1); await click('تقسيم الخلية المدمجة إلى خلاياها الأصلية'); assert.equal(countCells(),6);
await selectCell(); await click('إضافة صف أسفل'); assert.equal(tableInfo().map.height,3);
await selectCell(); await click('حذف الصف الحالي'); assert.equal(tableInfo().map.height,2);
await selectCell(); await click('إضافة عمود بعد'); assert.equal(tableInfo().map.width,4);
await selectCell(); await click('حذف العمود الحالي'); assert.equal(tableInfo().map.width,3);
let bubbledDrag = 0;
document.getElementById('root')!.addEventListener('dragstart', () => { bubbledDrag++; });
const beforeDrag=editor.getHTML(); const drag=new Event('dragstart',{bubbles:true,cancelable:true});
await settle(() => {editor.view.dom.querySelector('td p')!.dispatchEvent(drag);});
assert.equal(bubbledDrag,0,'cell drag cannot reach card reorder handlers');
assert.equal(drag.defaultPrevented,true); assert.equal(editor.getHTML(),beforeDrag);
console.log('PASS T01 production controls: 2 cells / row / column / all → merge/split with empty cells; add/delete; native table drag blocked (pointer geometry NOT tested)');
// Toolbar typography reads every selected run, rather than the first mark.
await setContent('<p><span style="font-size:24pt;font-family:Arial;color:#dc2626">كبير</span><span style="font-size:12pt;font-family:Cairo;color:#2563eb">صغير</span></p>');
await selectText('كبير');
const sizeSelect = () => document.querySelector<HTMLSelectElement>('select[aria-label="حجم الخط"]')!;
const familySelect = () => document.querySelector<HTMLSelectElement>('select[aria-label="نوع الخط"]')!;
assert.equal(sizeSelect().value, '24pt');
assert.equal(familySelect().value, 'Arial', 'custom/saved font outside presets remains visible');
await settle(() => { editor.commands.selectAll(); });
assert.equal(sizeSelect().value, '');
assert.equal(sizeSelect().selectedOptions[0].textContent, 'مختلط');
assert.equal(familySelect().value, '');
const mixedHTML = editor.getHTML();
await click('تعداد نقطي'); await click('تعداد نقطي');
assert.ok(editor.getHTML().includes('24pt')); assert.ok(editor.getHTML().includes('12pt'));
assert.equal(sizeSelect().value, '', 'mixed selection remains mixed after list toggle');
console.log('PASS R01 actual 24pt/custom font and mixed font/size selection reflected in toolbar');

await setContent(sample); await selectText('درس علمي كبير');
const beforeColorSelection = editor.state.selection.toJSON();
await click('لون النص');
assert.equal(document.activeElement?.textContent?.trim(), 'إلغاء التلوين', 'keyboard focus enters color popup');
await click('أحمر تنبيهي');
assert.deepEqual(editor.state.selection.toJSON(), beforeColorSelection);
assert.equal(editor.getAttributes('textStyle').color, '#dc2626');
await click('تظليل النص'); await click('أصفر');
assert.equal(editor.getAttributes('highlight').color, '#fef08a');
await click('تظليل النص');
await settle(() => { document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', {key:'Escape',bubbles:true,cancelable:true})); });
assert.equal(document.querySelector('[role="dialog"][aria-label="تظليل النص"]'), null);
assert.equal(document.activeElement?.getAttribute('aria-label'), 'تظليل النص');
await click('عريض'); assert.ok(editor.isActive('bold'));
await click('مائل'); assert.ok(editor.isActive('italic'));
await click('تسطير'); assert.ok(editor.isActive('underline'));
await click('محاذاة للوسط'); assert.equal(editor.getAttributes('paragraph').textAlign, 'center');
await click('اتجاه من اليسار لليمين'); assert.equal(editor.getAttributes('paragraph').dir, 'ltr');
await click('اتجاه من اليمين لليسار'); assert.equal(editor.getAttributes('paragraph').dir, 'rtl');
await click('زيادة المسافة البادئة'); assert.equal(editor.getAttributes('paragraph').marginRight, '24px');
await click('تقليل المسافة البادئة'); assert.equal(editor.getAttributes('paragraph').marginRight, '0px');
console.log('PASS R02 real color/highlight popovers, Escape/focus return and inline/alignment/direction actions preserve selection');

await setContent('<p style="text-align:right">يمين</p><p style="text-align:center">وسط</p>');
await settle(() => { editor.commands.selectAll(); });
for (const title of ['محاذاة لليمين','محاذاة للوسط','محاذاة لليسار','ضبط النص (Justify)']) {
  assert.equal(document.querySelector(`button[title="${title}"]`)?.getAttribute('aria-pressed'), 'false');
}
await setContent('<p>بداية</p><table><tr><td><p>أ</p></td><td><p>ب</p></td></tr></table><p>نهاية</p>');
info = tableInfo();
await settle(() => { editor.commands.setCellSelection({anchorCell:info.start+info.map.positionAt(0,0,info.table),headCell:info.start+info.map.positionAt(0,1,info.table)}); });
const cellsBefore = editor.state.selection.toJSON();
await click('لون النص'); await click('أزرق أساسي');
assert.ok(editor.state.selection instanceof CellSelection);
assert.deepEqual(editor.state.selection.toJSON(), cellsBefore);
assert.equal(editor.view.dom.querySelectorAll('td span[style*="color"]').length, 2);
await click('تظليل النص'); await click('أصفر');
assert.ok(editor.state.selection instanceof CellSelection);
assert.equal(editor.view.dom.querySelectorAll('td mark').length, 2);
await click('عرض أدوات الإدراج');
assert.equal(document.querySelector('.toolbar-insert-slot')?.hasAttribute('hidden'), false);
await click('عرض أدوات الجدول');
assert.deepEqual(editor.state.selection.toJSON(), cellsBefore);
await click('دمج الخلايا المحددة'); assert.equal(countCells(),1);
await click('تقسيم الخلية المدمجة إلى خلاياها الأصلية'); assert.equal(countCells(),2);
console.log('PASS R03 cell selection survives color/highlight and switching insert/table row; merge/split still works');

assert.deepEqual(runtimeErrors, [], 'no DOM handler errors');
await settle(() => root.unmount()); dom.window.close();
