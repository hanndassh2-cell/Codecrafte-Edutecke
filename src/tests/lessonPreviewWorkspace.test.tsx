/** UI contract tests. JSDOM does not prove physical pagination, PDF rendering or browser layout. */
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { JSDOM } from 'jsdom';
import React,{act,useRef,useState} from 'react';
registerHooks({load(url,context,next){if(url.endsWith('.css'))return{format:'module',source:'export default {}',shortCircuit:true};return next(url,context);}});
const dom=new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>',{url:'http://localhost',pretendToBeVisual:true});
for(const key of ['window','document','navigator','HTMLElement','Element','Node','MutationObserver','sessionStorage','Event','MouseEvent'])Object.defineProperty(globalThis,key,{configurable:true,value:(dom.window as any)[key]});
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true,requestAnimationFrame:(cb:FrameRequestCallback)=>setTimeout(()=>cb(0),0),cancelAnimationFrame:clearTimeout});
let scrolled='';HTMLElement.prototype.scrollIntoView=function(){scrolled=this.getAttribute('data-preview-page')||'';};
const {createRoot}=await import('react-dom/client');
const {LessonPreviewWorkspace}=await import('../components/LessonPreviewWorkspace');
let closed=false,printed=false,exported='';
function Harness(){const ref=useRef<HTMLDivElement>(null);const[page,onPage]=useState(1),[zoom,onZoom]=useState(1);const[mode,onMode]=useState<'single'|'double'|'continuous'>('single');
return <LessonPreviewWorkspace info={{path:'الرياضيات / التفاضل',outline:[{id:'card2',title:'جدول ومعادلات'}]}} title="درس تجريبي" contentRef={ref} page={page} pages={2} zoom={zoom} mode={mode} landscape={false} busy={false} onPage={onPage} onZoom={onZoom} onMode={onMode} onClose={()=>{closed=true;}} onPrint={()=>{printed=true;}} settings={<span>إعدادات قائمة</span>} exports={[{label:'PDF صورة',action:()=>{exported='image';}},{label:'PDF نص حي',action:()=>{exported='live';}}]}>
<div className="a4-preview-container">{[1,2].map(i=><div key={i} data-preview-page={i}><div className="a4-print-sheet"><section data-preview-item-id={`card${i}`} id={`original${i}`}><p>درس عربي {i}</p><table><tbody><tr><td>قيمة</td></tr></tbody></table><span className="katex">x²</span></section></div></div>)}</div>
</LessonPreviewWorkspace>;}
const root=createRoot(document.getElementById('root')!);
const settle=async(fn:()=>void)=>act(async()=>{fn();await new Promise(r=>setTimeout(r,20));});
const click=async(label:string)=>{const b=Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find(el=>el.textContent===label||el.getAttribute('aria-label')===label);assert.ok(b,label);assert.equal(b.disabled,false);await settle(()=>b.click());};
await settle(()=>root.render(<Harness/>));await settle(()=>{});
assert.equal(document.querySelectorAll('.lp-thumbnail').length,2);
assert.equal(document.querySelectorAll('#original1').length,1,'clones must not duplicate IDs');
assert.match(document.querySelector('.lp-thumbnail-page')!.textContent!,/درس عربي/);
await click('الصفحة 2');assert.equal(scrolled,'2');assert.equal(document.querySelector('[aria-current=page]')!.getAttribute('aria-label'),'الصفحة 2');
await click('تكبير');assert.equal(document.querySelector('output')!.textContent,'110%');assert.equal(document.querySelectorAll('.lp-document [data-preview-page]').length,2);
await click('صفحتان');assert.ok(document.querySelector('.lp-double'));await click('متصل');assert.equal(document.querySelector('.lp-double'),null);
await click('مخطط الدرس');await click('جدول ومعادلاتالصفحة 2');assert.equal(scrolled,'2');
await click('وضع التركيز');assert.equal(document.querySelector('aside'),null);await click('إظهار اللوحة');assert.ok(document.querySelector('aside'));
await click('إعدادات الإخراج');assert.match(document.querySelector('.lp-settings')!.textContent!,/إعدادات قائمة/);
await click('PDF صورة');assert.equal(exported,'image');await click('PDF نص حي');assert.equal(exported,'live');
await click('طباعة');assert.equal(printed,true);await click('العودة للتحرير');assert.equal(closed,true);
await settle(()=>root.unmount());console.log('PASS lesson preview UI: thumbnails, outline, navigation, modes, zoom, focus, return and distinct export callbacks');
