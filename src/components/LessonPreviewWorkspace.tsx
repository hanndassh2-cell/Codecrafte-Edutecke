import React, { useEffect, useRef, useState } from 'react';
import { BookOpen, Printer, ArrowRight, Download, PanelRightClose, Maximize, Minus, Plus } from 'lucide-react';
import './LessonPreviewWorkspace.css';

export interface LessonPreviewInfo { returnLabel?: string; path: string; outline: { id: string; title: string }[] }
interface Props {
  info: LessonPreviewInfo; title?: string; children: React.ReactNode; settings: React.ReactNode;
  contentRef: React.RefObject<HTMLDivElement>; page: number; pages: number; zoom: number;
  mode: 'single'|'double'|'continuous'; landscape: boolean; busy: boolean;
  onPage: (n:number)=>void; onZoom:(n:number)=>void; onMode:(m:Props['mode'])=>void;
  onClose:()=>void; onPrint:()=>void; exports: {label:string; action:()=>void}[];
}
export function LessonPreviewWorkspace(p:Props) {
  const root=useRef<HTMLDivElement>(null), viewport=useRef<HTMLDivElement>(null);
  const [collapsed,setCollapsed]=useState(false), [tab,setTab]=useState('pages');
  const [sheets,setSheets]=useState<HTMLElement[]>([]);
  const [settings,setSettings]=useState(false);
  const width=p.landscape?1122.52:793.7, height=p.landscape?793.7:1122.52;
  useEffect(()=>{
    const el=p.contentRef.current; if(!el)return;
    const refresh=()=>setSheets(Array.from(el.querySelectorAll<HTMLElement>('[data-preview-page] > .a4-print-sheet')));
    refresh(); const observer=new MutationObserver(refresh); observer.observe(el,{childList:true,subtree:true});
    return()=>observer.disconnect();
  },[p.contentRef,p.pages]);
  const navigate=(n:number)=>{p.onPage(n); requestAnimationFrame(()=>p.contentRef.current?.querySelector(`[data-preview-page="${n}"]`)?.scrollIntoView({block:'start'}));};
  const fit=(page:boolean)=>{ const el=viewport.current;if(!el)return; const columns=p.mode==='double'?2:1;
    p.onZoom(Math.max(.2,Math.min(2,(el.clientWidth-48)/(width*columns+(columns-1)*24),...(page?[(el.clientHeight-48)/height]:[])))); };
  const outlinePage=(id:string)=>sheets.findIndex(sheet=>Array.from(sheet.querySelectorAll<HTMLElement>('[data-preview-item-id]')).some(el=>el.dataset.previewItemId===id||el.dataset.previewItemId?.startsWith(id+'-')))+1;
  useEffect(()=>{
    let id: string|null=null;try{id=sessionStorage.getItem('edutech-preview-focus-card');}catch{return;}
    if(!id||!sheets.length||p.contentRef.current?.querySelector('[data-measuring=true]'))return;const page=outlinePage(id);if(!page)return;
    navigate(page);try{sessionStorage.removeItem('edutech-preview-focus-card');}catch{}
  },[sheets]);
  const scroll=()=>{if(p.mode!=='continuous'||p.busy)return; const top=viewport.current?.getBoundingClientRect().top??0;
    const visible=Array.from(p.contentRef.current?.querySelectorAll<HTMLElement>('[data-preview-page]')??[]);
    const current=visible.reduce<HTMLElement|undefined>((best,el)=>!best||Math.abs(el.getBoundingClientRect().top-top)<Math.abs(best.getBoundingClientRect().top-top)?el:best,undefined);
    if(current)p.onPage(Number(current.dataset.previewPage)); };
  return <div ref={root} className="lesson-preview-workspace" dir="rtl" style={{'--preview-zoom':p.busy?1:p.zoom,'--page-width':`${width}px`} as React.CSSProperties}>
    <header className="lp-header no-print"><div className="lp-brand"><BookOpen/> EduTech</div><div className="lp-heading"><h1>{p.title || 'معاينة الدرس'}</h1><p>{p.info.path}</p></div>
      <button onClick={p.onClose}><ArrowRight size={18}/>{p.info.returnLabel || "العودة للتحرير"}</button>
      <details className="lp-export"><summary><Download size={18}/> تنزيل وتصدير</summary><div>{p.exports.map(e=><button key={e.label} disabled={p.busy} onClick={e.action}>{e.label}</button>)}</div></details>
      <button className="lp-primary" disabled={p.busy} onClick={p.onPrint}><Printer size={18}/>طباعة</button>
    </header>
    <nav className="lp-controls no-print" aria-label="عرض الصفحات">
      {([['single','صفحة واحدة'],['double','صفحتان'],['continuous','متصل']] as const).map(([mode,label])=><button key={mode} aria-pressed={p.mode===mode} onClick={()=>p.onMode(mode)}>{label}</button>)}
      <button onClick={()=>fit(true)}>ملاءمة الصفحة</button><button onClick={()=>fit(false)}>ملاءمة العرض</button>
      <button aria-label="تصغير" onClick={()=>p.onZoom(Math.max(.2,p.zoom-.1))}><Minus size={16}/></button><output>{Math.round(p.zoom*100)}%</output><button aria-label="تكبير" onClick={()=>p.onZoom(Math.min(3,p.zoom+.1))}><Plus size={16}/></button>
      <button title="ملء الشاشة" onClick={()=>{if(document.fullscreenElement)void document.exitFullscreen();else void root.current?.requestFullscreen();}}><Maximize size={18}/></button>
      <button aria-pressed={collapsed} onClick={()=>setCollapsed(!collapsed)}><PanelRightClose size={18}/>{collapsed?'إظهار اللوحة':'وضع التركيز'}</button>
      <button aria-expanded={settings} onClick={()=>setSettings(!settings)}>إعدادات الإخراج</button>
    </nav>
    {settings&&<div className="lp-settings no-print">{p.settings}</div>}
    <div className="lp-body">
      {!collapsed&&<aside className="lp-sidebar no-print"><div className="lp-tabs"><button aria-pressed={tab==='pages'} onClick={()=>setTab('pages')}>الصفحات</button><button aria-pressed={tab==='outline'} onClick={()=>setTab('outline')}>مخطط الدرس</button></div>
        <div className="lp-sidebar-content">{tab==='pages'?sheets.map((sheet,i)=><button className="lp-thumbnail" key={i} aria-label={`الصفحة ${i+1}`} aria-current={p.page===i+1?'page':undefined} onClick={()=>navigate(i+1)}><Thumbnail sheet={sheet} width={width} height={height}/><span>{i+1}</span></button>):p.info.outline.map(item=>{const page=outlinePage(item.id);return <button className="lp-outline-item" key={item.id} disabled={!page} onClick={()=>navigate(page)}>{item.title}<small>{page?`الصفحة ${page}`:'جارٍ تجهيز الصفحات'}</small></button>;})}</div>
      </aside>}
      <main ref={viewport} onScroll={scroll} className="lp-canvas print-preview-area"><div ref={p.contentRef} className={`lp-document ${p.mode==='double'&&!p.busy?'lp-double':''}`}>{p.children}</div></main>
    </div>
    <footer className="lp-status no-print"><button disabled={p.page<=1} onClick={()=>navigate(p.page-1)}>السابق</button><span>الصفحة {p.page} من {p.pages}</span><button disabled={p.page>=p.pages} onClick={()=>navigate(p.page+1)}>التالي</button><span className="lp-status-end">A4 · العربية · {Math.round(p.zoom*100)}%</span></footer>
  </div>;
}
function Thumbnail({sheet,width,height}:{sheet:HTMLElement;width:number;height:number}){
 const ref=useRef<HTMLDivElement>(null);
 useEffect(()=>{const clone=sheet.cloneNode(true) as HTMLElement;clone.querySelectorAll('[id]').forEach(el=>el.removeAttribute('id'));clone.removeAttribute('id');clone.style.width=`${width}px`;clone.style.maxWidth='none';clone.style.margin='0';clone.style.transform=`scale(${160/width})`;clone.style.transformOrigin='top right';clone.setAttribute('aria-hidden','true');ref.current?.replaceChildren(clone);},[sheet,width]);
 return <div ref={ref} className="lp-thumbnail-page a4-preview-container" style={{height:height*160/width}}/>;
}
