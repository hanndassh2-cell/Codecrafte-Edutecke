import React from 'react';
import { GripVertical, MoreHorizontal, Search, Plus } from 'lucide-react';

const plain = (value: unknown) => String(value || '').replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/g,' ').trim();
export function cardContentState(card: any): string {
  if (card.type === 'page-break') return 'فاصل صفحة';
  if (card.type === 'title') return plain(card.title) ? 'عنوان موجود' : 'يحتاج عنوانًا';
  if (card.type === 'questions') {
    try { const data=JSON.parse(card.body || '[]'); const list=Array.isArray(data)?data:[data]; return list.some(q=>q && (q.id || plain(q.text || q.question || q.content))) ? 'أسئلة موجودة' : 'يحتاج أسئلة'; } catch { return plain(card.body)?'محتوى موجود':'يحتاج أسئلة'; }
  }
  if (card.type === 'images') {
    try { const data = JSON.parse(card.body || '{}'); return plain(data?.url || data?.src) ? 'صور موجودة' : 'يحتاج صورة'; }
    catch { return /<img\b[^>]*src=["'][^"']+|https?:|data:image/.test(card.body || '') ? 'صور موجودة' : 'يحتاج صورة'; }
  }
  if (card.type === 'activities' || card.type === 'notes') {
    try { const data=JSON.parse(card.body || '{}'); return plain(card.type === 'notes' ? data.text : data.steps) ? 'محتوى موجود' : 'يحتاج محتوى'; }
    catch { return plain(card.body) ? 'محتوى موجود' : 'يحتاج محتوى'; }
  }
  if (card.type === 'math') return plain(card.body) ? 'معادلة موجودة' : 'يحتاج معادلة';
  return plain(card.body) || /<(img|table|math)\b/.test(card.body || '') ? 'محتوى موجود' : 'يحتاج محتوى';
}
export const hasCardContent = (card:any) => !cardContentState(card).startsWith('يحتاج');

export function LessonOutline({cards,allCards,activeId,query,onQuery,filter,onFilter,onSelect,onAdd,onMove,onHide,onDuplicate,onDelete,onDragStart,onDragOver,onDragEnd,summary,expanded=false,readOnly=false,busy=false}: {
  cards:any[]; allCards:any[];activeId:string;query:string;onQuery:(value:string)=>void;
  filter:string;onFilter:(value:'all'|'incomplete'|'hidden')=>void; onSelect:(id:string)=>void;
  onAdd:(index:number|null)=>void; onMove:(id:string,direction:'up'|'down')=>void;
  onHide:(card:any)=>void;onDuplicate:(id:string)=>void;onDelete:(card:any)=>void;
  onDragStart:(e:React.DragEvent,index:number)=>void;onDragOver:(e:React.DragEvent,index:number)=>void;onDragEnd:()=>void;
  summary:(card:any)=>string;expanded?:boolean;readOnly?:boolean;busy?:boolean;
}) {
  return <div className={`unified-outline ${expanded?'is-expanded':''}`}>
    <label className="unified-outline-search"><Search size={16}/><input aria-label="بحث في بطاقات الدرس" value={query} onChange={e=>onQuery(e.target.value)} placeholder="ابحث في البطاقات…"/></label>
    <select aria-label="تصفية البطاقات" value={filter} onChange={e=>onFilter(e.target.value as any)}><option value="all">جميع البطاقات ({allCards.length})</option><option value="incomplete">تحتاج محتوى</option><option value="hidden">مخفية من الإخراج</option></select>
    <div className="unified-outline-list">
      {!cards.length && <p className="p-4 text-sm">{allCards.length?'لا توجد بطاقات تطابق البحث والتصفية.':'لا توجد بطاقات بعد.'}</p>}
      {cards.map(card=>{const index=allCards.findIndex(c=>c.id===card.id);return <article key={card.id} className={`unified-outline-row ${card.id===activeId?'is-current':''}`} onDragOver={e=>!readOnly&&onDragOver(e,index)}>
        {!readOnly && <button type="button" data-card-drag-handle draggable={!busy} disabled={busy} className="unified-drag-handle" aria-label={`ترتيب ${card.title || 'البطاقة'}`} title="اسحب للترتيب، أو استخدم Alt مع سهم الأعلى أو الأسفل" onDragStart={e=>onDragStart(e,index)} onDragEnd={onDragEnd} onKeyDown={e=>{if(e.altKey&&(e.key==='ArrowUp'||e.key==='ArrowDown')){e.preventDefault();onMove(card.id,e.key==='ArrowUp'?'up':'down');}}}><GripVertical size={17}/></button>}
        <button type="button" className="unified-card-select" aria-current={card.id===activeId?'page':undefined} disabled={busy} onClick={()=>onSelect(card.id)}><strong>{index+1}. {card.title || 'بطاقة بلا عنوان'}</strong><small>{cardContentState(card)}{(card.isVisible===false||card.hidden)&&' · مخفية من الإخراج'}</small>{expanded&&<p>{summary(card)}</p>}</button>
        {!readOnly && <details className="unified-card-menu"><summary aria-label={`إجراءات ${card.title || 'البطاقة'}`}><MoreHorizontal size={18}/></summary><div>
          <button disabled={busy} onClick={()=>onAdd(index)}>إضافة بطاقة بعدها</button>
          <button disabled={busy} onClick={()=>onHide(card)}>{card.isVisible===false?'إظهار في الإخراج':'إخفاء من الإخراج'}</button>
          {card.type!=='questions'&&<button disabled={busy} onClick={()=>onDuplicate(card.id)}>تكرار البطاقة</button>}
          <button disabled={busy||index===0} onClick={()=>onMove(card.id,'up')}>نقل إلى الأعلى</button><button disabled={busy||index===allCards.length-1} onClick={()=>onMove(card.id,'down')}>نقل إلى الأسفل</button>
          <button disabled={busy} className="text-rose-600" onClick={()=>onDelete(card)}>حذف البطاقة…</button>
        </div></details>}
      </article>;})}
    </div>
    {!readOnly&&<button disabled={busy} className="document-add-card" onClick={()=>onAdd(null)}><Plus size={18}/>{allCards.length?'إضافة بطاقة':'إضافة أول بطاقة'}</button>}
    <p className="px-2 py-1 text-xs text-slate-500">الحالة تصف وجود المحتوى، ولا تقيم جودته أو جاهزية الطباعة.</p>
  </div>;
}
