/** Actual modal + installed MathLive + TipTap. JSDOM cannot certify visual layout or pointer geometry. */
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { JSDOM } from 'jsdom';
import React, { act, useState } from 'react';
import type { Editor } from '@tiptap/react';
registerHooks({ resolve(specifier, context, next) {
  if (specifier === 'mathlive') return { url: new URL('../../node_modules/mathlive/mathlive.mjs', import.meta.url).href, shortCircuit: true };
  return next(specifier, context);
}, load(url, context, next) {
  // Node does not load stylesheets. Never substitute editor/MathLive code.
  if (url.endsWith('.css')) return { format: 'module', source: 'export default {}', shortCircuit: true };
  return next(url, context);
} });
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'http://localhost', pretendToBeVisual: true });
for (const key of ['window','document','navigator','HTMLElement','Element','Node','MutationObserver','DOMParser','getComputedStyle','localStorage','Event','CustomEvent','customElements','DocumentFragment','KeyboardEvent','MouseEvent','HTMLSelectElement','HTMLInputElement','HTMLTextAreaElement','HTMLSlotElement','ShadowRoot','Document','SVGElement','EventTarget','HTMLCanvasElement','AbortController','AbortSignal','FocusEvent','InputEvent','DOMRect','UIEvent','NodeFilter']) {
  Object.defineProperty(globalThis, key, { configurable: true, value: (dom.window as any)[key] });
}
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true, requestAnimationFrame: (cb: FrameRequestCallback) => setTimeout(() => cb(0), 0), cancelAnimationFrame: clearTimeout });
(dom.window.Range.prototype as any).getClientRects = () => [];
(dom.window.Range.prototype as any).getBoundingClientRect = () => ({ top:0,bottom:0,left:0,right:0,width:0,height:0 });
window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return false; }, media: '', onchange: null });

Object.defineProperty(document, "fonts", { value: { ready: Promise.resolve(), check: () => true, add() {}, delete() {} } });
HTMLElement.prototype.scrollIntoView = () => {};
HTMLElement.prototype.scroll = () => {};
class LayoutObserver { observe() {} unobserve() {} disconnect() {} }
Object.assign(globalThis, { ResizeObserver: LayoutObserver, IntersectionObserver: LayoutObserver });
Object.assign(window, { ResizeObserver: LayoutObserver, IntersectionObserver: LayoutObserver });
// JSDOM's CSS matcher reads a custom element's `mode` during its constructor.
// Supply layout-only styles from an ordinary element; math editing stays real.
const layoutStyle = window.getComputedStyle(document.createElement('span'));
const originalStyle = window.getComputedStyle.bind(window);
const readStyle = (element: Element) => element.tagName === 'MATH-FIELD' ? layoutStyle : originalStyle(element);
Object.assign(window, { getComputedStyle: readStyle });
Object.defineProperty(globalThis, 'getComputedStyle', { configurable: true, value: readStyle });
const { createRoot } = await import('react-dom/client');
const { EquationEditorModal } = await import('../modules/editor/components/EquationEditorModal');
const { MathfieldElement } = await import('mathlive');
MathfieldElement.fontsDirectory = null;
MathfieldElement.soundsDirectory = null;

let saved = '', closed = 0;
const root = createRoot(document.getElementById('root')!);
const settle = async (fn: () => void) => act(async () => { fn(); await new Promise(resolve => setTimeout(resolve, 110)); });
const errors: string[] = [];
window.addEventListener('error', event => errors.push(event.message));
const click = async (label: string) => {
  const button = Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find(b => b.getAttribute('aria-label') === label || b.textContent?.trim() === label);
  assert.ok(button, label); assert.equal(button.disabled, false);
  await settle(() => { button.dispatchEvent(new MouseEvent('mousedown', { bubbles:true, cancelable:true })); button.click(); });
};
const open = async (initialEquation = '', onSave: (s: string) => any = s => { saved = s; }) => {
  await settle(() => root.render(null));
  await settle(() => root.render(<EquationEditorModal isOpen initialEquation={initialEquation} onSave={onSave} onClose={() => { closed++; root.render(null); }} />));
  assert.equal(document.querySelectorAll('math-field').length, 1);
  return document.querySelector('math-field') as any;
};
const input = async (mf: any, value: string) => settle(() => { mf.value = value; mf.position = -1; mf.dispatchEvent(new Event('input', { bubbles:true })); mf.dispatchEvent(new Event('selection-change')); });
let mf = await open('$x^2$');
assert.ok(mf instanceof MathfieldElement);
assert.equal(mf.value, 'x^2', 'opening existing math populates MathLive, not stale React state');
assert.equal(mf.mathVirtualKeyboardPolicy, 'manual');
assert.ok(document.querySelector('button.equation-submit')?.textContent?.includes('تحديث المعادلة'));
assert.equal(document.querySelector('.equation-advanced'), null);
await click('إلغاء'); assert.equal(saved, ''); assert.equal(closed, 1);
console.log('PASS E01 existing equation initialization, one real MathLive field, advanced collapsed, cancel');

mf = await open();
await click('إدراج في البطاقة');
assert.equal(closed, 1); assert.equal(saved, ''); assert.ok(document.querySelector('[role="alert"]'));
await click('كسر'); // First button is ribbon, then template.
const fraction = document.querySelector<HTMLButtonElement>('.equation-gallery button')!;
await settle(() => fraction.click());
assert.ok(mf.value.includes('\\frac'));
assert.ok(mf.getValue(mf.selection).includes('placeholder'), 'first empty placeholder is selected');
await settle(() => mf.insert('2'));
await settle(() => mf.executeCommand('moveToNextPlaceholder'));
assert.ok(mf.getValue(mf.selection).includes('placeholder'));
await settle(() => mf.insert('3'));
assert.equal(mf.value, String.raw`\frac23`);
await click('سطر مستقل'); await click('إدراج في البطاقة');
assert.equal(saved, String.raw`$$\frac23$$`); assert.equal(closed, 2);
console.log('PASS E02 empty insertion blocked; actual fraction placeholders filled/navigated; block delimiters');

mf = await open();
for (const [group, item, expected] of [
  ['كسر','كسر مركب', '\\frac'], ['أس ودليل','أس ودليل', '^'],
  ['جذر','جذر نوني','\\sqrt'], ['تكامل','تكامل مزدوج','\\iint'],
  ['مجموع','حاصل ضرب','\\prod'], ['نهاية','نهاية من اليمين','\\lim'],
  ['أقواس','نظام معادلات','\\begin{cases}'], ['مصفوفة','مصفوفة 2×2','\\begin{pmatrix}'],
  ['مصفوفة','مصفوفة 3×3','\\begin{pmatrix}'],
] as const) {
  await input(mf, ''); await click(group);
  const button = Array.from(document.querySelectorAll<HTMLButtonElement>('.equation-gallery button')).find(b=>b.getAttribute('aria-label')===item)!;
  assert.ok(button,item); await settle(()=>button.click());
  assert.ok(mf.value.includes(expected), item + ' uses actual MathLive parsing');
  assert.ok(mf.getValue(mf.selection).includes('placeholder'), item+' first placeholder');
  assert.equal(mf.errors.length, 0, item+' valid syntax');
}
await input(mf, 'a+b');
await settle(()=>{ mf.position = 1; mf.dispatchEvent(new Event('selection-change')); });
await click('جذر'); await click('جذر تربيعي');
assert.ok(mf.value.startsWith('a\\sqrt'), 'template restores cursor within expression');
assert.ok(mf.value.endsWith('+b'));
await click('كيمياء'); await click('تفاعل اتزان'); assert.ok(mf.value.includes('rightleftharpoons'));
await click('خيارات متقدمة'); await click('مكتبة القوالب الكاملة');
assert.ok(document.querySelector('.equation-advanced')?.textContent?.includes('رموز سريعة'));
await click('إلغاء');
console.log('PASS E03 nested fractions/scripts/roots/integrals/sums/limits/cases/matrices; placeholder selection; cursor retention; chemistry and existing library');

mf = await open('$x$', () => false);
await input(mf, 'y+1'); await click('تحديث المعادلة');
assert.ok(document.querySelector('[role="alert"]')); assert.equal(mf.value,'y+1');
await click('إلغاء');
mf = await open('$x$', async () => { throw new Error('test rejection'); });
await click('تحديث المعادلة'); assert.ok(document.querySelector('[role="alert"]'));
await click('إلغاء');
let resolveSave: (result: boolean) => void; let calls = 0;
mf = await open('$x$', () => { calls++; return new Promise<boolean>(resolve=>{resolveSave=resolve;}); });
await click('تحديث المعادلة');
assert.equal(document.querySelector<HTMLButtonElement>('.equation-submit')!.disabled,true);
await settle(()=> document.querySelector<HTMLButtonElement>('.equation-submit')!.click()); assert.equal(calls,1);
await settle(()=>resolveSave!(true)); assert.equal(document.querySelector('[role="dialog"]'),null);
console.log('PASS E04 false/rejected saves keep draft and dialog; in-flight double submit prevented');

mf = await open('$x$');
await click('خيارات متقدمة');
await input(mf, 'a->b'); await click('إصلاح تلقائي');
assert.ok(mf.value.includes('rightarrow'));
await click('سجل التعديلات (3)');
assert.ok(document.querySelector('.equation-history'));
await settle(()=>document.querySelector<HTMLButtonElement>('.equation-history button')!.click()); assert.equal(mf.value,'x');
await settle(()=>document.querySelector('[role="dialog"]')!.dispatchEvent(new KeyboardEvent('keydown',{ key:'Escape',bubbles:true,cancelable:true })));
assert.equal(document.querySelector('[role="dialog"]'),null);
console.log('PASS E05 advanced repair/history restore and Escape');

const { RichTextEditor } = await import('../modules/editor/components/RichTextEditor');
const { MathText } = await import('../components/MathText');
let editor: Editor;
let html = '';
function Harness() {
  const [value,setValue] = useState('<p>قبل بعد</p>');
  return <RichTextEditor value={value} onChange={s=>{ html=s;setValue(s); }} onFocus={e=>{editor=e;}} autoFocus />;
}
await settle(()=>root.render(<Harness/>)); await settle(()=>{}); assert.ok(editor!);
await settle(()=>editor.commands.setTextSelection(4));
await click('معادلة'); mf = document.querySelector('math-field');
await input(mf, String.raw`\frac{1}{2}`); await click('إدراج في البطاقة');
assert.ok(editor.state.doc.textContent.includes(String.raw`قبل$\frac{1}{2}$ بعد`), editor.state.doc.textContent);
let from=0,to=0;
editor.state.doc.descendants((node,pos)=>{ if(node.isText && node.text?.includes('$')) { from=pos+node.text.indexOf('$');to=pos+node.text.lastIndexOf('$')+1; } });
await settle(()=> (editor as any).__openEquationEditor({ from,to,text:String.raw`$\frac{1}{2}$` }));
mf=document.querySelector('math-field'); assert.equal(mf.value,String.raw`\frac{1}{2}`);
await input(mf,'x^2'); await click('تحديث المعادلة');
assert.equal((editor.state.doc.textContent.match(/\$/g)||[]).length,2);
assert.ok(editor.state.doc.textContent.includes('$x^2$')); assert.ok(!editor.state.doc.textContent.includes('frac'));
await settle(()=>editor.commands.undo()); assert.ok(!editor.state.doc.textContent.includes('$x^2$'));
await settle(()=>editor.commands.redo()); assert.ok(editor.state.doc.textContent.includes('$x^2$'));
await settle(()=>editor.commands.setTextSelection(2));
const priorDoc=editor.getHTML(), priorSelection=editor.state.selection.toJSON();
await click('معادلة'); mf=document.querySelector('math-field'); assert.equal(mf.value,'', 'new insert never reuses last edited expression');
await input(mf,'z'); await click('إلغاء');
assert.equal(editor.getHTML(),priorDoc); assert.deepEqual(editor.state.selection.toJSON(),priorSelection);
console.log('PASS E06 actual RichTextEditor insertion at saved cursor, replacement without duplicate, undo/redo, new session reset and cancel selection');
await settle(()=>root.render(<MathText text={html}/>));
assert.ok(document.querySelector('.katex'), 'existing preview renderer renders saved equation');
assert.equal(document.querySelector('.katex-error'),null);
assert.deepEqual(errors,[]);
console.log('PASS E07 saved equation renders through existing MathText preview; no runtime errors');
mf = await open();
await click('مصفوفة');
assert.equal(document.querySelectorAll('.equation-matrix-grid button').length, 25);
await click('مصفوفة 4×3');
assert.ok(mf.value.includes('\\begin{pmatrix}'));
assert.equal((mf.value.match(/&/g) || []).length, 8, '4 rows and 3 columns from native MathLive matrix command');
assert.equal(mf.errors.length, 0);
await input(mf, ''); await click('دوال ومشتقات'); await click('مشتقة من الرتبة n');
assert.ok(mf.value.includes('\\dfrac') && mf.value.includes('\\mathrm{d}'));
await input(mf, ''); await click('أعداد مركبة'); await click('المرافق');
assert.ok(mf.value.includes('\\overline'));
await input(mf, 'x'); await settle(() => { mf.select(); mf.dispatchEvent(new Event('selection-change')); });
await click('نمط الخط');
await click('عريض'); assert.ok(mf.value.includes('\\mathbf{x}'), 'native MathLive style preserves expression: '+mf.value);
await click('لون النص'); await click('أحمر'); assert.ok(mf.value.includes('\\textcolor'), 'native color applies to selection: '+mf.value);
await click('تظليل'); await click('أصفر'); assert.ok(mf.value.includes('\\colorbox'), 'native background applies to selection: '+mf.value);
await settle(() => { mf.position = -1; mf.dispatchEvent(new Event('selection-change')); });
await click('وضع الكتابة'); assert.ok(document.querySelector('.equation-tool-panel')?.textContent?.includes('LaTeX'));
await click('نص'); assert.equal(mf.mode, 'text', 'mode command uses native MathLive mode');
await settle(() => document.querySelector<HTMLButtonElement>('.equation-tool-panel button[aria-label="رياضيات"]')!.click());
assert.equal(mf.mode, 'math');
await click('تحرير'); assert.ok(document.querySelector('.equation-tool-panel')?.textContent?.includes('تحديد الكل'));
assert.ok(document.querySelector<HTMLButtonElement>('.equation-tool-panel button[aria-label="نسخ Typst"]'));
await click('تحديد الكل'); assert.ok(mf.getValue(mf.selection).length > 0);
await click('إلغاء');
console.log('PASS E08 matrix grid, new templates, native formatting and clipboard commands exposed without context menu');
await settle(()=>root.unmount());
dom.window.close();
