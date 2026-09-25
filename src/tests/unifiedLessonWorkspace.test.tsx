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
dom.window.HTMLElement.prototype.scrollIntoView = () => {};
const { createRoot } = await import('react-dom/client');

const { EditorPanel } = await import('../modules/editor/components/EditorPanel');
const { storage } = await import('../services/storage');
const { cardContentState } = await import('../modules/editor/components/LessonOutline');
const { CellSelection, TableMap } = await import('@tiptap/pm/tables');
const { FocusedEditorWorkspace, WorkspaceToolbar, WorkspaceOutlineToggle } = await import('../modules/editor/components/FocusedEditorWorkspace');
const { Editor: TipTap } = await import('@tiptap/react');
const { default: StarterKit } = await import('@tiptap/starter-kit');
const { Table, TableRow, TableCell, TableHeader } = await import('@tiptap/extension-table');
const root = createRoot(document.getElementById('root')!);
const settle = async (fn:()=>void) => act(async()=>{fn();await new Promise(r=>setTimeout(r,50));});
const button = (text:string, scope:ParentNode=document) => {
 const b=Array.from(scope.querySelectorAll<HTMLButtonElement>('button')).find(b=>b.textContent?.trim()===text || b.title===text || b.getAttribute('aria-label')===text);
 assert.ok(b, text);return b;
};
const click = async (text:string,scope:ParentNode=document)=>settle(()=>button(text,scope).click());
let cards=[{id:'one',type:'title',title:'عنوان علمي',body:''},{id:'two',type:'text',title:'نص علمي',body:'<p>محتوى محفوظ</p>'}];
let saveAllowed=false, saves=0,back=0,preview=0;
let updateCards:React.Dispatch<React.SetStateAction<any[]>>;

function Harness({empty=false}:{empty?:boolean}) {
 const [value,setValue]=useState(empty?[]:cards);updateCards=setValue;cards=value;
 return <EditorPanel paragraphs={value} setParagraphs={setValue} attachedQuestions={[]} onAddQuestion={()=>{}} onRemoveQuestion={()=>{}} lesson={{id:'test-lesson',title:'درس الاختبار'}} isDirty onSave={async()=>{saves++;return saveAllowed;}} onBack={()=>{throw new Error("Must use verified-save return path");}} onSavedBack={()=>back++} onPreview={()=>preview++} pageSetupView={<p>إعداد الصفحة الحالي</p>} />;
}
await settle(()=>root.render(<Harness/>));
const dialog=()=>document.querySelector('.focused-editor-dialog')!;
assert.equal(dialog().getAttribute('aria-label'),'تحرير عنوان علمي');
saveAllowed=true;await click('البطاقة التالية',dialog());
await settle(()=>root.render(<Harness key="reopen"/>));
assert.equal(dialog().getAttribute('aria-label'),'تحرير نص علمي');
saves=0;saveAllowed=false;
await click('البطاقة السابقة',dialog());assert.equal(saves,1);assert.match(dialog().getAttribute('aria-label')! ,/نص علمي/);
saveAllowed=true;await click('البطاقة السابقة',dialog());assert.match(dialog().getAttribute('aria-label')!,/عنوان علمي/);
await click('توسيع المخطط',dialog());assert.ok(document.querySelector('.outline-expanded'));
const handle=dialog().querySelector('[data-card-drag-handle]')!;
await settle(()=>handle.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',altKey:true,bubbles:true})));
assert.deepEqual(cards.map(c=>c.id),['two','one']);
assert.equal(dialog().querySelectorAll('article[draggable="true"]').length,0);
const drag=(el:Element,type:string)=>{const event=new Event(type,{bubbles:true,cancelable:true});Object.defineProperty(event,'dataTransfer',{value:{effectAllowed:'',setData(){}}});el.dispatchEvent(event);};
await settle(()=>drag(dialog().querySelector('[data-card-drag-handle]')!,'dragstart'));
await settle(()=>drag(dialog().querySelectorAll('.unified-outline-row')[1],'dragover'));
await settle(()=>drag(dialog().querySelector('[data-card-drag-handle]')!,'dragend'));
assert.deepEqual(cards.map(c=>c.id),['one','two']);
await settle(()=>drag(dialog().querySelector('.unified-card-select')!,'dragstart'));
await settle(()=>drag(dialog().querySelectorAll('.unified-outline-row')[1],'dragover'));
assert.deepEqual(cards.map(c=>c.id),['one','two'],'text selection does not initiate card reordering');
await click('نقل إلى الأسفل',dialog());
assert.deepEqual(cards.map(c=>c.id),['two','one']);
await click('إخفاء من الإخراج',dialog());assert.equal((cards[0] as any).isVisible,false);
const filter=dialog().querySelector<HTMLSelectElement>('[aria-label="تصفية البطاقات"]')!;
await settle(()=>{filter.value='hidden';filter.dispatchEvent(new Event('change',{bubbles:true}));});
assert.equal(dialog().querySelectorAll('.unified-outline-row').length,1);
await settle(()=>{filter.value='all';filter.dispatchEvent(new Event('change',{bubbles:true}));});
const query=dialog().querySelector<HTMLInputElement>('[aria-label="بحث في بطاقات الدرس"]')!;
const setQuery=(value:string)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(query,value);query.dispatchEvent(new Event('input',{bubbles:true}));};
await settle(()=>setQuery('غير موجود'));assert.equal(dialog().querySelectorAll('.unified-outline-row').length,0);
await settle(()=>setQuery('نص علمي'));assert.equal(dialog().querySelectorAll('.unified-outline-row').length,1);
await settle(()=>setQuery(''));
window.confirm=()=>false;await click('حذف البطاقة…',dialog());assert.equal(cards.length,2);
window.confirm=()=>true;await click('حذف البطاقة…',dialog());assert.equal(cards.length,1);
await click('تراجع عن حذف البطاقة',dialog());assert.equal(cards.length,2);
await click('تكرار البطاقة',dialog());assert.equal(cards.length,3);
assert.ok(cards.some(c=>c.body.includes('محتوى محفوظ')));
await click('إعداد الصفحة',dialog());assert.ok(dialog().textContent?.includes('إعداد الصفحة الحالي'));
await click('العودة إلى مساحة العمل',dialog());
await click('معاينة الدرس',dialog());assert.equal(preview,1);
await click('حفظ وإغلاق محرر المستند',dialog());assert.equal(back,1);
assert.equal(cardContentState({type:'title',title:'عنوان',body:''}),'عنوان موجود');
assert.equal(cardContentState({type:'images',body:'{"url":"","caption":"وصف"}'}),'يحتاج صورة');
assert.equal(cardContentState({type:'questions',body:'[]'}),'يحتاج أسئلة');
await settle(()=>root.render(<Harness key="empty" empty/>));
assert.ok(document.querySelector('[aria-label="إعداد درس فارغ"]'));
await click('إضافة أول بطاقة',dialog());assert.ok(document.body.textContent?.includes('سيتم الإدراج في نهاية الدرس'));
const pickerInput=document.querySelector<HTMLInputElement>('[placeholder="ابحث، ثم اضغط Enter للإدراج"]')!;
await settle(()=>pickerInput.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true})));
assert.equal(cards.length,1);assert.ok(dialog().getAttribute('aria-label')?.startsWith('تحرير'));

console.log('PASS actual EditorPanel: restore card, failed-save navigation guard, successful navigation, expand, keyboard reorder, hide, duplicate, page setup, preview callback, empty lesson');
await settle(()=>root.render(<div/>));

// Real ProseMirror selection + same editor instance through expand and collapse.
const target=document.createElement('div');document.body.append(target);
const editor=new TipTap({element:target,extensions:[StarterKit,Table,TableRow,TableCell,TableHeader],content:'<p>درس علمي</p><table><tr><td><p>أ</p></td><td><p>ب</p></td></tr></table>'});
let collapse:()=>void;
function SelectionHarness(){const [expanded,setExpanded]=useState(false);collapse=()=>setExpanded(false);return <FocusedEditorWorkspace><WorkspaceToolbar editor={editor}><span/></WorkspaceToolbar><WorkspaceOutlineToggle expanded={expanded} onChange={setExpanded}/><main className="document-writing-area" style={{display:expanded?'none':'block'}} /></FocusedEditorWorkspace>;}
await settle(()=>root.render(<SelectionHarness/>));
const checkRestore=async()=>{
 const before=editor.state.selection.toJSON(), html=editor.getHTML();
 const area=document.querySelector('.document-writing-area')!;area.scrollTop=230;
 await click('توسيع المخطط');
 await settle(()=>{editor.commands.setTextSelection(1);area.scrollTop=0;});
 await settle(()=>collapse());
 await settle(()=>{});
 assert.deepEqual(editor.state.selection.toJSON(),before);assert.equal(area.scrollTop,230);assert.equal(editor.isDestroyed,false);assert.equal(editor.getHTML(),html);
};
await settle(()=>{editor.commands.setTextSelection({from:1,to:5});});await checkRestore();
let start=0,table:any;editor.state.doc.descendants((node,pos)=>{if(node.type.name==='table'){start=pos+1;table=node;return false;}});
const map=TableMap.get(table);
await settle(()=>{editor.view.dispatch(editor.state.tr.setSelection(CellSelection.create(editor.state.doc,start+map.map[0],start+map.map[1])));});await checkRestore();
console.log('PASS text/cell selection, scroll, content and live editor survive outline expansion and any return path');
await settle(()=>root.unmount());editor.destroy();dom.window.close();
