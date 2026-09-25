import React, { useState } from 'react';
import { FileText, Edit2, Eye, Clock, Layers, HelpCircle, MoreHorizontal, Trash2, ChevronDown, ExternalLink } from 'lucide-react';
import { Lesson, Question } from '../../../types';
import { QuestionRenderer } from '../../../components/QuestionRenderer';
import { QUESTION_TYPE_ARABIC_NAMES } from '../../../services/questionObjectBuilder';
import { MathText } from '../../../components/MathText';
import './LessonDetails.css';

// Only explicit IDs in existing question cards establish insertion; a bank link
// or lesson.questionIds alone does not mean the question is part of the document.
export function insertedQuestionIds(lesson: Lesson): Set<string> {
  const ids = new Set<string>();
  for (const card of lesson.contentParagraphs || []) {
    if (card.type !== 'questions' || !card.body) continue;
    try {
      const data = JSON.parse(card.body);
      for (const q of Array.isArray(data) ? data : [data]) if (typeof q?.id === 'string') ids.add(q.id);
    } catch { /* Free text questions have no established bank identity. */ }
  }
  return ids;
}

export function lessonHasPreviewContent(lesson: Lesson): boolean {
  return (lesson.contentParagraphs || []).some(card => card.isVisible !== false && !card.hidden &&
    !!card.body && (!!card.body.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, '').trim() || /<(img|svg|math)\b/i.test(card.body)));
}

export function LessonDetails({ lesson, questions, subjectName, unitTitle, onRoot, onSubject, onUnit, onEdit, onPrepare, onPreview, onDelete, onQuestions }: {
  lesson: Lesson; questions: Question[]; subjectName?: string; unitTitle?: string;
  onRoot: () => void; onSubject: () => void; onUnit: () => void;
  onEdit?: () => void; onPrepare?: () => void; onPreview?: () => void;
  onDelete?: () => void; onQuestions?: () => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const cards = lesson.contentParagraphs || [];
  const inserted = insertedQuestionIds(lesson);
  const linked = [...new Map(questions.filter(q => q && (q.lessonId === lesson.id || q.lessonIds?.includes(lesson.id) || lesson.questionIds?.includes(q.id) || inserted.has(q.id))).map(q => [q.id, q])).values()];
  const hasContent = lessonHasPreviewContent(lesson);
  const status = { draft: 'مسودة', review: 'قيد المراجعة', approved: 'معتمد', completed: 'مكتمل', archived: 'مؤرشف', in_progress: 'قيد الإعداد', 'in-progress': 'قيد الإعداد' }[lesson.status || ''];
  return <div className="lesson-detail" dir="rtl">
    <nav className="ld-breadcrumb" aria-label="مسار الدرس">
      <button onClick={onRoot}>المناهج</button><span>/</span>
      <button onClick={onSubject}>{subjectName || 'المادة'}</button><span>/</span>
      <button onClick={onUnit}>{unitTitle || 'الوحدة'}</button><span>/</span><span aria-current="page">{lesson.title}</span>
    </nav>
    <section className="ld-panel ld-hero">
      <div className="ld-heading"><span className="ld-icon"><FileText/></span><div><h1>{lesson.title}</h1><p>{subjectName}{unitTitle && ` / ${unitTitle}`}</p></div></div>
      <div className="ld-actions">
        {onPrepare && <button className="ld-primary" onClick={onPrepare}><Edit2 size={18}/>إعداد الدرس</button>}
        {onPreview && <button onClick={onPreview} disabled={!hasContent}><Eye size={18}/>معاينة الدرس</button>}
        {onEdit && <button onClick={onEdit}><Edit2 size={17}/>تعديل البيانات</button>}
        <details className="ld-menu"><summary aria-label="إجراءات الدرس"><MoreHorizontal size={20}/></summary><div>
          <button onClick={() => window.dispatchEvent(new CustomEvent('refresh-data-all'))}>تحديث البيانات</button>
          {onDelete && <button className="ld-danger" onClick={onDelete}><Trash2 size={16}/>حذف الدرس</button>}
        </div></details>
      </div>
      {!hasContent && <p className="ld-note">لا يوجد محتوى للمعاينة بعد. أضف محتوى من إعداد الدرس.</p>}
      <div className="ld-stats">
        {lesson.durationMinutes != null && lesson.durationMinutes > 0 && <span><Clock size={18}/>{lesson.durationMinutes} دقيقة</span>}
        <span><Layers size={18}/>{cards.length} بطاقات</span><span><HelpCircle size={18}/>{linked.length} أسئلة مرتبطة</span>
        {status && <span className="ld-status">{status}</span>}
      </div>
    </section>
    <section className="ld-panel" aria-labelledby="lesson-content-heading">
      <div className="ld-section-heading"><Layers/><h2 id="lesson-content-heading">محتوى الدرس</h2></div>
      <p className="ld-note">عرض مختصر للبطاقات حسب ترتيبها المحفوظ.</p>
      {cards.length ? <ol className="ld-cards">{cards.slice(0,4).map((card,index) => <li key={card.id}>
        <span className="ld-number">{index+1}</span><FileText size={19}/><span>{card.title || 'بطاقة بلا عنوان'}</span>
      </li>)}</ol> : <p className="ld-empty">لا توجد بطاقات بعد. ابدأ من زر «إعداد الدرس».</p>}
      {cards.length > 4 && <p className="ld-note ld-remaining">توجد {cards.length-4} بطاقات أخرى تظهر في إعداد الدرس.</p>}
    </section>
    <section className="ld-panel" aria-labelledby="lesson-questions-heading">
      <div className="ld-section-bar"><div className="ld-section-heading"><HelpCircle/><h2 id="lesson-questions-heading">الأسئلة المرتبطة بالدرس ({linked.length})</h2></div>
        {onQuestions && <button className="ld-link" onClick={onQuestions}><ExternalLink size={16}/>إدارة في بنك الأسئلة</button>}
      </div>
      {!linked.length ? <p className="ld-empty">لا توجد أسئلة مرتبطة بهذا الدرس حاليًا.</p> : <div className="ld-questions">{(showAll ? linked : linked.slice(0,2)).map(q => <details className="ld-question" key={q.id}>
        <summary><span className="ld-question-title"><MathText text={q.text || 'سؤال بلا نص'} inline/></span>
          <span className="ld-tags">{q.type && <span>{QUESTION_TYPE_ARABIC_NAMES[q.type] || ({problem:'مسألة تطبيقية',reason:'علّل',explain:'اشرح',equation:'معادلة',custom:'نوع مخصص'})[q.type] || 'سؤال'}</span>}{q.marks != null && <span>{q.marks} درجات</span>}<span>{inserted.has(q.id) ? 'مدرج في محتوى الدرس' : 'مرتبط بالدرس'}</span></span><ChevronDown size={18}/></summary>
        <div className="ld-question-body"><QuestionRenderer question={q} mode="preview-only" showMarks={q.marks != null} suppressAnswerBox forceDirection="rtl"/></div>
      </details>)}</div>}
      <div className="ld-question-footer"><p className="ld-note">ربط السؤال بالدرس لا يعني إدراجه في محتواه.</p>{linked.length > 2 && <button className="ld-link" aria-expanded={showAll} onClick={()=>setShowAll(!showAll)}>{showAll ? 'عرض سؤالين فقط' : `عرض جميع الأسئلة (${linked.length})`}</button>}</div>
    </section>
  </div>;
}
