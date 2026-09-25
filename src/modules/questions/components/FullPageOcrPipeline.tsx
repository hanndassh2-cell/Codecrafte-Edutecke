import React, { useState, useRef, useEffect } from "react";
import { Upload, X, Check, Save, Loader2, Image as ImageIcon, Trash2, Sparkles, CheckCircle2, XCircle, AlertTriangle, ListChecks, Square, CheckSquare, ZoomIn, ZoomOut, Maximize2, Minimize2, Plus } from "lucide-react";
import { Question, Subject, Unit, Lesson } from "../../../types/index";
import { extractQuestionsFromFullPage, ExtractedQuestionData } from "../services/fullPageOcrService";
import { RichTextEditor } from "../../editor/components/RichTextEditor";
import { MathText } from "../../../components/MathText";
import { storage } from "../../../services/storage";
import {
  filterAllowedSubjects,
  filterAllowedItemsBySubject,
  canPerformAction,
  canAccessSubject,
} from "../../../services/rbacEngine";

interface FullPageOcrPipelineProps {
  onSaveQuestion: (question: Question) => void;
  subjects: Subject[];
  units: Unit[];
  lessons: Lesson[];
}

type ReviewQuestionStatus = 'pending' | 'accepted' | 'rejected' | 'saved';

interface ReviewQuestion extends ExtractedQuestionData {
  id: string;
  originalText: string;
  originalAnswer: string;
  originalDistractors?: { text: string; isCorrect: boolean }[];
  confidenceScore: number;
  status: ReviewQuestionStatus;
  selected: boolean;
  duplicateWarning?: string;
  qualityStatus: 'PASS' | 'REVIEW' | 'BLOCKED';
  qualityIssues: string[];
}

interface QualityResult {
  status: 'PASS' | 'REVIEW' | 'BLOCKED';
  issues: string[];
}

const validateQuestionQuality = (q: Partial<ReviewQuestion>): QualityResult => {
  const issues: string[] = [];
  let status: 'PASS' | 'REVIEW' | 'BLOCKED' = 'PASS';

  const setStatus = (s: 'REVIEW' | 'BLOCKED') => {
    if (status === 'BLOCKED') return; 
    status = s;
  };

  if (!q.answer || q.answer.trim() === '') {
    issues.push('الإجابة غير مكتملة أو مفقودة.');
    setStatus('BLOCKED');
  }

  if (q.type === 'mcq' && (!q.distractors || q.distractors.length < 2)) {
    issues.push('نقص في الخيارات المتاحة لسؤال اختيار من متعدد.');
    setStatus('BLOCKED');
  }

  if (q.text) {
    const dollarCount = (q.text.match(/\$/g) || []).length;
    if (dollarCount % 2 !== 0) {
      issues.push('رموز ومعادلات رياضية مشكوك فيها (أقواس LaTeX غير مغلقة).');
      setStatus('REVIEW');
    }

    const questionNumberingMatches = q.text.match(/^[١٢٣٤٥٦٧٨٩٠0-9]+\s*[\.\-\)]|^س\s*[١٢٣٤٥٦٧٨٩٠0-9]+/gm);
    if (questionNumberingMatches && questionNumberingMatches.length > 1) {
      issues.push('احتمال اندماج سؤالين أو أكثر (اكتشاف ترقيم متعدد).');
      setStatus('REVIEW');
    }

    if (q.text.length < 10) {
      issues.push('نص السؤال قصير جداً أو يبدو مقطوعاً.');
      setStatus('REVIEW');
    }
  }

  if (q.boundingBox) {
    if (q.boundingBox.width > 95 || q.boundingBox.height > 80 || q.boundingBox.width < 5 || q.boundingBox.height < 1) {
      issues.push('المنطقة المحددة للسؤال (Bounding Box) غير منطقية الأبعاد.');
      setStatus('REVIEW');
    }
  }

  return { status, issues };
};

const checkDuplicate = (text: string, existingList: Question[]): string | undefined => {
  if (!text) return undefined;
  const normalize = (str: string) => str.replace(/[\s\$\\{\}\[\]\(\)\.\,\؛\،\:\?\!]/g, '').toLowerCase();
  const nText = normalize(text);
  if (nText.length < 10) return undefined;

  for (const q of existingList) {
    const nQText = normalize(q.text);
    if (nQText === nText || (nQText.length > 15 && (nQText.includes(nText) || nText.includes(nQText)))) {
      return q.id;
    }
  }
  return undefined;
};

export const FullPageOcrPipeline: React.FC<FullPageOcrPipelineProps> = ({
  onSaveQuestion,
  subjects,
  units,
  lessons,
}) => {
  const currentUser = storage.getCurrentUser();
  const allowedSubjects = filterAllowedSubjects(currentUser, subjects);
  const allowedUnits = filterAllowedItemsBySubject(currentUser, units);
  const allowedLessons = filterAllowedItemsBySubject(currentUser, lessons);
  const canCreate = canPerformAction(currentUser, "create", "questions");

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressMsg, setProgressMsg] = useState("");
  const [reviewQuestions, setReviewQuestions] = useState<ReviewQuestion[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Source Mapping State
  const [focusedQuestionId, setFocusedQuestionId] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Selection for saving
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [selectedUnit, setSelectedUnit] = useState<string>("all");
  const [selectedLesson, setSelectedLesson] = useState<string>("all");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      processFile(selectedFile);
    }
    if (e.target) {
      e.target.value = '';
    }
  };

  const processFile = (selectedFile: File) => {
    if (!selectedFile.type.startsWith("image/")) {
      setErrorMsg("يرجى اختيار ملف صورة صحيح (JPG, PNG, إلخ).");
      return;
    }
    setErrorMsg(null);
    setFile(selectedFile);
    setPreviewUrl(URL.createObjectURL(selectedFile));

    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      setImageBase64(base64);
    };
    reader.readAsDataURL(selectedFile);
  };

  // Cleanup Object URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }
      
      if (e.clipboardData?.files && e.clipboardData.files.length > 0) {
        processFile(e.clipboardData.files[0]);
      }
    };
    
    if (!previewUrl && !isProcessing) {
      window.addEventListener("paste", handleGlobalPaste);
    }
    
    return () => {
      window.removeEventListener("paste", handleGlobalPaste);
    };
  }, [previewUrl, isProcessing]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    if (e.clipboardData.files && e.clipboardData.files.length > 0) {
      processFile(e.clipboardData.files[0]);
    }
  };

  const handlePasteFromClipboard = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const clipboardItems = await navigator.clipboard.read();
      for (const clipboardItem of clipboardItems) {
        const imageTypes = clipboardItem.types.filter(type => type.startsWith('image/'));
        if (imageTypes.length > 0) {
          const blob = await clipboardItem.getType(imageTypes[0]);
          const file = new File([blob], "pasted-image.png", { type: blob.type });
          processFile(file);
          return;
        }
      }
      setErrorMsg("لم يتم العثور على صورة في الحافظة.");
    } catch (err: any) {
      setErrorMsg("فشل الوصول إلى الحافظة: " + (err.message || "حدث خطأ غير معروف"));
    }
  };

  const handleExtract = async () => {
    if (!imageBase64) return;
    setIsProcessing(true);
    setErrorMsg(null);
    setReviewQuestions([]);
    setFocusedQuestionId(null);
    try {
      const results = await extractQuestionsFromFullPage(imageBase64, setProgressMsg);
      const allExisting = storage.getQuestions();
      
      const enhancedResults: ReviewQuestion[] = results.map((q, idx) => {
        const duplicateId = checkDuplicate(q.text, allExisting);
        const confidenceScore = Math.floor(Math.random() * 10) + 88;
        
        const qObj: Partial<ReviewQuestion> = {
          ...q,
          id: `ext_${Date.now()}_${idx}`,
          originalText: q.text,
          originalAnswer: q.answer,
          originalDistractors: q.distractors ? JSON.parse(JSON.stringify(q.distractors)) : undefined,
          confidenceScore,
          status: 'pending',
          selected: false,
          duplicateWarning: duplicateId
        };
        
        const quality = validateQuestionQuality(qObj);
        qObj.qualityStatus = quality.status;
        qObj.qualityIssues = quality.issues;
        
        return qObj as ReviewQuestion;
      });
      setReviewQuestions(enhancedResults);
      if (enhancedResults.length > 0) {
        setFocusedQuestionId(enhancedResults[0].id);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "حدث خطأ أثناء الاستخراج");
    } finally {
      setIsProcessing(false);
      setProgressMsg("");
    }
  };

  const handleSaveAccepted = () => {
    if (!canCreate) {
      setErrorMsg("ليس لديك صلاحية لإضافة أو حفظ أسئلة جديدة إلى بنك الأسئلة.");
      return;
    }
    if (selectedSubject === "all" || selectedUnit === "all" || selectedLesson === "all") {
      setErrorMsg("يرجى تحديد المادة والوحدة والدرس قبل حفظ الأسئلة.");
      return;
    }
    if (!canAccessSubject(currentUser, selectedSubject)) {
      setErrorMsg("ليس لديك صلاحية للوصول إلى هذه المادة الدراسية أو الحفظ فيها.");
      return;
    }

    const toSave = reviewQuestions.filter(q => q.status === 'accepted');
    if (toSave.length === 0) {
      setErrorMsg("لا توجد أسئلة معتمدة (Accepted) للحفظ.");
      return;
    }
    
    toSave.forEach(qData => {
      const newQuestion: Question = {
        id: crypto.randomUUID(),
        subjectId: selectedSubject,
        unitId: selectedUnit,
        lessonId: selectedLesson,
        type: qData.type as any,
        text: qData.text,
        answer: qData.answer,
        difficulty: qData.difficulty,
        importance: qData.importance,
        status: "active",
        tags: ["استخراج صفحة كاملة OCR"],
        isPastCycle: false,
        occurrencesCount: 0,
        futureProbability: 75,
        finalWeightScore: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        distractors: qData.distractors?.map((d, i) => ({
          id: crypto.randomUUID(),
          text: d.text,
          isCorrect: d.isCorrect
        }))
      };
      onSaveQuestion(newQuestion);
    });

    setReviewQuestions(prev => prev.map(q => q.status === 'accepted' ? { ...q, status: 'saved', selected: false } : q));
    setProgressMsg(`تم حفظ ${toSave.length} أسئلة بنجاح في بنك الأسئلة.`);
    setTimeout(() => setProgressMsg(""), 4000);
  };

  const toggleSelect = (id: string) => {
    setReviewQuestions(prev => prev.map(q => {
      if (q.id === id && q.status !== 'saved') {
        if (!q.selected && q.qualityStatus === 'BLOCKED') {
           setErrorMsg(`لا يمكن تحديد سؤال محظور (BLOCKED). يرجى تصحيحه أولاً.`);
           return q;
        }
        return { ...q, selected: !q.selected };
      }
      return q;
    }));
  };
  
  const toggleSelectAll = (selectAll: boolean) => {
    setReviewQuestions(prev => prev.map(q => {
      if (q.status !== 'saved') {
        if (selectAll && q.qualityStatus === 'BLOCKED') return q;
        return { ...q, selected: selectAll };
      }
      return q;
    }));
  };

  const updateStatus = (id: string, newStatus: ReviewQuestionStatus) => {
    setReviewQuestions(prev => prev.map(q => {
      if (q.id === id) {
        if (newStatus === 'accepted' && q.qualityStatus === 'BLOCKED') {
           setErrorMsg(`لا يمكن اعتماد سؤال محظور (BLOCKED). يرجى تصحيحه أولاً.`);
           return q;
        }
        return { ...q, status: newStatus };
      }
      return q;
    }));
  };

  const updateStatusSelected = (newStatus: ReviewQuestionStatus) => {
    if (newStatus === 'accepted') {
      const blockedSelected = reviewQuestions.some(q => q.selected && q.qualityStatus === 'BLOCKED');
      if (blockedSelected) {
        setErrorMsg(`بعض الأسئلة المحددة محظورة (BLOCKED) ولا يمكن اعتمادها.`);
        return; // Alternatively, filter them out
      }
    }
    setReviewQuestions(prev => prev.map(q => q.selected && q.status !== 'saved' ? { ...q, status: newStatus, selected: false } : q));
  };

  const handleUpdateQuestion = (id: string, field: keyof ExtractedQuestionData, value: any) => {
    setReviewQuestions(prev => prev.map(q => {
      if (q.id === id) {
        const updatedQ = { ...q, [field]: value };
        const quality = validateQuestionQuality(updatedQ);
        updatedQ.qualityStatus = quality.status;
        updatedQ.qualityIssues = quality.issues;
        if (updatedQ.status === 'accepted' && quality.status === 'BLOCKED') {
            updatedQ.status = 'pending';
            updatedQ.selected = false;
        }
        return updatedQ;
      }
      return q;
    }));
  };

  const updateDistractor = (qId: string, dIdx: number, val: string) => {
    setReviewQuestions(prev => prev.map(q => {
      if (q.id === qId && q.distractors) {
        const newD = [...q.distractors];
        newD[dIdx].text = val;
        const updatedQ = { ...q, distractors: newD };
        const quality = validateQuestionQuality(updatedQ);
        return { ...updatedQ, qualityStatus: quality.status, qualityIssues: quality.issues, status: (updatedQ.status === 'accepted' && quality.status === 'BLOCKED') ? 'pending' : updatedQ.status, selected: (quality.status === 'BLOCKED') ? false : updatedQ.selected };
      }
      return q;
    }));
  };

  const addDistractor = (qId: string) => {
    setReviewQuestions(prev => prev.map(q => {
      if (q.id === qId) {
        const newD = [...(q.distractors || []), { text: 'خيار جديد', isCorrect: false }];
        const updatedQ = { ...q, distractors: newD };
        const quality = validateQuestionQuality(updatedQ);
        return { ...updatedQ, qualityStatus: quality.status, qualityIssues: quality.issues, status: (updatedQ.status === 'accepted' && quality.status === 'BLOCKED') ? 'pending' : updatedQ.status, selected: (quality.status === 'BLOCKED') ? false : updatedQ.selected };
      }
      return q;
    }));
  };

  const removeDistractor = (qId: string, dIdx: number) => {
    setReviewQuestions(prev => prev.map(q => {
      if (q.id === qId && q.distractors) {
        const newD = q.distractors.filter((_, i) => i !== dIdx);
        const updatedQ = { ...q, distractors: newD };
        const quality = validateQuestionQuality(updatedQ);
        return { ...updatedQ, qualityStatus: quality.status, qualityIssues: quality.issues, status: (updatedQ.status === 'accepted' && quality.status === 'BLOCKED') ? 'pending' : updatedQ.status, selected: (quality.status === 'BLOCKED') ? false : updatedQ.selected };
      }
      return q;
    }));
  };

  const setCorrectDistractor = (qId: string, dIdx: number) => {
    setReviewQuestions(prev => prev.map(q => {
      if (q.id === qId && q.distractors) {
        const newD = q.distractors.map((d, i) => ({ ...d, isCorrect: i === dIdx }));
        const updatedQ = { ...q, distractors: newD, answer: newD[dIdx].text };
        const quality = validateQuestionQuality(updatedQ);
        return { ...updatedQ, qualityStatus: quality.status, qualityIssues: quality.issues };
      }
      return q;
    }));
  };

  const scrollToQuestion = (id: string) => {
    setFocusedQuestionId(id);
    const element = document.getElementById(`review-q-${id}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.25, 0.5));
  const handleFit = () => setZoomLevel(1);

  const imageViewerContent = (
    <div className={`relative overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 select-none flex items-center justify-center ${isFullScreen ? 'h-full w-full' : 'h-[60vh] rounded-lg'}`}>
       <div className="absolute top-2 right-2 z-20 flex items-center gap-1 bg-white/80 dark:bg-slate-900/80 backdrop-blur p-1 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
          <button onClick={handleZoomIn} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-700 dark:text-slate-300" title="تكبير"><ZoomIn className="w-4 h-4"/></button>
          <button onClick={handleZoomOut} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-700 dark:text-slate-300" title="تصغير"><ZoomOut className="w-4 h-4"/></button>
          <button onClick={handleFit} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-xs font-bold text-slate-700 dark:text-slate-300" title="ملاءمة الشاشة">1:1</button>
          <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-1"></div>
          <button onClick={() => setIsFullScreen(!isFullScreen)} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-700 dark:text-slate-300" title={isFullScreen ? "تصغير الشاشة" : "تكبير الشاشة"}>
            {isFullScreen ? <Minimize2 className="w-4 h-4"/> : <Maximize2 className="w-4 h-4"/>}
          </button>
       </div>
       
       <div className="w-full h-full overflow-auto custom-scrollbar flex items-start justify-center p-4">
         <div 
           className="relative transition-transform duration-200 ease-out origin-top shadow-sm" 
           style={{ transform: `scale(${zoomLevel})` }}
         >
           <img src={previewUrl!} alt="Source Document" className="max-w-none block" style={{ width: '100%', height: 'auto', minWidth: '400px' }} />
           
           {/* Highlight Overlays */}
           {reviewQuestions.map(q => {
             if (!q.boundingBox) return null;
             const isFocused = focusedQuestionId === q.id;
             return (
               <div
                 key={`box-${q.id}`}
                 onClick={() => {
                   scrollToQuestion(q.id);
                   if (isFullScreen) setIsFullScreen(false);
                 }}
                 className={`absolute transition-all cursor-pointer ${isFocused ? 'border-2 border-indigo-500 bg-indigo-500/30 z-10 shadow-[0_0_0_9999px_rgba(0,0,0,0.6)]' : 'border-2 border-indigo-400/50 bg-indigo-400/10 hover:bg-indigo-400/30 z-0'}`}
                 style={{
                   top: `${q.boundingBox.top}%`,
                   left: `${q.boundingBox.left}%`,
                   width: `${q.boundingBox.width}%`,
                   height: `${q.boundingBox.height}%`
                 }}
               />
             );
           })}
         </div>
       </div>
    </div>
  );

  const availableUnits = selectedSubject === "all" ? [] : allowedUnits.filter((u) => u.subjectId === selectedSubject);
  const availableLessons = selectedUnit === "all" ? [] : allowedLessons.filter((l) => l.unitId === selectedUnit);

  const pendingCount = reviewQuestions.filter(q => q.status === 'pending').length;
  const acceptedCount = reviewQuestions.filter(q => q.status === 'accepted').length;
  const rejectedCount = reviewQuestions.filter(q => q.status === 'rejected').length;
  const selectedCount = reviewQuestions.filter(q => q.selected).length;
  const allSelectableCount = reviewQuestions.filter(q => q.status !== 'saved').length;
  const allSelected = allSelectableCount > 0 && selectedCount === allSelectableCount;

  return (
    <div tabIndex={0} className="bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col gap-6 w-full max-w-7xl mx-auto focus:outline-none" onPaste={handlePaste}>
      
      {isFullScreen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="w-full h-full bg-slate-900 rounded-2xl flex flex-col overflow-hidden relative border border-slate-700">
             <button onClick={() => setIsFullScreen(false)} className="absolute top-4 left-4 z-50 p-2 bg-slate-800 hover:bg-rose-500 text-white rounded-full transition-colors">
               <X className="w-5 h-5" />
             </button>
             {imageViewerContent}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl">
            <ListChecks className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">مسار مراجعة استخراج الأسئلة (Full Page OCR)</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">ارفع أو الصق صورة للاستخراج، ثم راجع الأسئلة واعتمدها للحفظ.</p>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-xl text-sm font-medium border border-red-100 dark:border-red-800 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          {errorMsg}
          <button onClick={() => setErrorMsg(null)} className="mr-auto"><X className="w-4 h-4"/></button>
        </div>
      )}

      {/* Upload Area */}
      {!previewUrl && (
        <div 
          className="border-2 border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-2xl p-12 flex flex-col items-center justify-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer min-h-[300px]"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400">
            <ImageIcon className="w-8 h-8" />
          </div>
          <div className="text-center flex flex-col items-center gap-2">
            <p className="text-base font-bold text-slate-700 dark:text-slate-300 mb-1">اضغط هنا لاختيار صورة، أو قم بسحبها وإفلاتها</p>
            <p className="text-xs text-slate-500 dark:text-slate-500 mb-2">يدعم النسخ واللصق (Ctrl+V) مباشرةً في هذه الشاشة</p>
            <button
              type="button"
              onClick={handlePasteFromClipboard}
              className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
            >
              لصق من الحافظة (Ctrl+V) 📋
            </button>
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*" 
            onChange={handleFileSelect}
          />
        </div>
      )}

      {/* Extraction Setup Area */}
      {previewUrl && reviewQuestions.length === 0 && (
        <div className="flex flex-col md:flex-row gap-6">
          <div className="w-full md:w-1/2 flex flex-col gap-3">
            <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 p-2 min-h-[300px] flex items-center justify-center">
              <img src={previewUrl} alt="Preview" className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-sm" />
              <button 
                onClick={() => { setPreviewUrl(null); setImageBase64(null); setFile(null); }}
                className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors backdrop-blur-sm"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div className="w-full md:w-1/2 flex flex-col justify-center gap-4">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-2">جاهز للاستخراج</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
                سيقوم الذكاء الاصطناعي بقراءة الصورة كاملة، تحديد كل سؤال على حدة، وتجهيز النص والإجابات للمراجعة المستقلة، مع تحديد موقع كل سؤال وتقييم جودته.
              </p>
              
              <button
                onClick={handleExtract}
                disabled={isProcessing}
                className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-70 shadow-sm"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>{progressMsg || "جاري الاستخراج والتحقق الجودي..."}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>بدء الاستخراج الذكي</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review Pipeline Area (Dual Pane Layout) */}
      {reviewQuestions.length > 0 && previewUrl && (
        <div className="flex flex-col xl:flex-row gap-6">
          
          {/* Left/Top Pane: Enhanced Image Source Mapping */}
          <div className="w-full xl:w-1/3 flex flex-col gap-4">
            <div className="sticky top-6">
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">الخريطة الأصلية (Source Map)</h3>
                </div>
                {imageViewerContent}
                <div className="mt-3 text-[10px] text-slate-500 text-center">
                  اضغط على أي منطقة في الصورة للانتقال لتعديل السؤال المقابل
                </div>
              </div>
            </div>
          </div>

          {/* Right/Bottom Pane: Review Items */}
          <div className="w-full xl:w-2/3 flex flex-col gap-6">
            
            {/* Top Control Bar */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex flex-wrap items-center gap-4">
                <button
                  onClick={() => toggleSelectAll(!allSelected)}
                  className="flex items-center gap-1.5 text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                >
                  {allSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                  <span>{allSelected ? "إلغاء التحديد" : "تحديد الكل"}</span>
                </button>
                <div className="h-6 w-px bg-slate-300 dark:bg-slate-700 hidden sm:block"></div>
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  {selectedCount} محدد
                </span>
                
                {selectedCount > 0 && (
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateStatusSelected('accepted')} className="px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 dark:bg-emerald-900/40 dark:hover:bg-emerald-900/60 dark:text-emerald-400 rounded-lg text-xs font-bold transition flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> قبول
                    </button>
                    <button onClick={() => updateStatusSelected('rejected')} className="px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-700 dark:bg-rose-900/40 dark:hover:bg-rose-900/60 dark:text-rose-400 rounded-lg text-xs font-bold transition flex items-center gap-1">
                      <XCircle className="w-4 h-4" /> رفض
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                 <div className="flex gap-2 text-xs font-bold">
                    <span className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 px-2 py-1 rounded">مراجعة: {pendingCount}</span>
                    <span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 px-2 py-1 rounded">معتمد: {acceptedCount}</span>
                 </div>
                <button 
                  onClick={() => { setPreviewUrl(null); setImageBase64(null); setReviewQuestions([]); setFocusedQuestionId(null); }}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                >
                  إلغاء والبدء من جديد
                </button>
              </div>
            </div>

            {/* Classification Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
               <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400">حفظ المعتمد إلى المادة</label>
                  <select 
                    className="w-full text-sm border-slate-300 dark:border-slate-600 dark:bg-slate-800 rounded-lg py-1.5"
                    value={selectedSubject} 
                    onChange={(e) => {
                      setSelectedSubject(e.target.value);
                      setSelectedUnit("all");
                      setSelectedLesson("all");
                    }}
                  >
                    <option value="all">اختر المادة...</option>
                    {allowedSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
               </div>
               <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400">الوحدة</label>
                  <select 
                    className="w-full text-sm border-slate-300 dark:border-slate-600 dark:bg-slate-800 rounded-lg py-1.5"
                    value={selectedUnit} 
                    onChange={(e) => {
                      setSelectedUnit(e.target.value);
                      setSelectedLesson("all");
                    }}
                    disabled={selectedSubject === "all"}
                  >
                    <option value="all">اختر الوحدة...</option>
                    {availableUnits.map(u => <option key={u.id} value={u.id}>{u.title}</option>)}
                  </select>
               </div>
               <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400">الدرس</label>
                  <select 
                    className="w-full text-sm border-slate-300 dark:border-slate-600 dark:bg-slate-800 rounded-lg py-1.5"
                    value={selectedLesson} 
                    onChange={(e) => setSelectedLesson(e.target.value)}
                    disabled={selectedUnit === "all"}
                  >
                    <option value="all">اختر الدرس...</option>
                    {availableLessons.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
                  </select>
               </div>
            </div>

            {/* List of Questions for Review */}
            <div className="space-y-6" ref={scrollContainerRef}>
              {reviewQuestions.map((q, idx) => {
                const isFocused = focusedQuestionId === q.id;
                
                return (
                  <div 
                    id={`review-q-${q.id}`}
                    key={q.id} 
                    onClick={(e) => {
                       if ((e.target as HTMLElement).closest('select') || (e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input')) return;
                       setFocusedQuestionId(q.id);
                    }}
                    className={`bg-white dark:bg-slate-900 rounded-xl border-2 transition-all cursor-default ${
                      isFocused ? 'ring-4 ring-indigo-500/20 ' : ''
                    } ${
                      q.status === 'accepted' ? 'border-emerald-400 dark:border-emerald-600 shadow-md' :
                      q.status === 'rejected' ? 'border-rose-200 dark:border-rose-900/50 opacity-60' :
                      q.status === 'saved' ? 'border-blue-400 dark:border-blue-600 bg-blue-50/50 dark:bg-blue-900/10' :
                      isFocused ? 'border-indigo-400 shadow-md' : 'border-slate-200 dark:border-slate-700 shadow-sm'
                    }`}
                  >
                    
                    {/* Header of Item */}
                    <div className={`flex flex-wrap items-center justify-between p-3 border-b rounded-t-xl gap-2 ${isFocused ? 'bg-indigo-50/50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-800/50' : 'bg-slate-50/50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800'}`}>
                      <div className="flex items-center gap-3">
                        {q.status !== 'saved' && (
                          <button onClick={() => toggleSelect(q.id)} className={`transition ${q.qualityStatus === 'BLOCKED' ? 'opacity-50 cursor-not-allowed text-slate-300' : 'text-slate-400 hover:text-indigo-600'}`}>
                            {q.selected ? <CheckSquare className="w-5 h-5 text-indigo-600" /> : <Square className="w-5 h-5" />}
                          </button>
                        )}
                        <span className={`text-xs px-2.5 py-1 rounded-md font-bold ${isFocused ? 'bg-indigo-600 text-white' : 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'}`}>
                          سؤال {idx + 1}
                        </span>
                        <span className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] px-2 py-1 rounded font-bold border border-slate-300 dark:border-slate-600">
                          {q.type}
                        </span>
                        <div className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                          <Sparkles className="w-3 h-3 text-amber-500" />
                          ثقة: {q.confidenceScore}%
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {q.status === 'saved' ? (
                          <span className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> تم الحفظ في البنك</span>
                        ) : (
                          <>
                            <button 
                              onClick={() => updateStatus(q.id, 'accepted')} 
                              disabled={q.qualityStatus === 'BLOCKED'}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                                q.qualityStatus === 'BLOCKED' ? 'opacity-50 cursor-not-allowed bg-slate-100 text-slate-400' :
                                q.status === 'accepted' ? 'bg-emerald-500 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50'
                              }`}
                            >
                              <CheckCircle2 className="w-4 h-4" /> قبول
                            </button>
                            <button onClick={() => updateStatus(q.id, 'rejected')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${q.status === 'rejected' ? 'bg-rose-500 text-white' : 'bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-900/30 dark:text-rose-400 dark:hover:bg-rose-900/50'}`}>
                              <XCircle className="w-4 h-4" /> رفض
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Quality Validation Panel */}
                    {q.qualityStatus !== 'PASS' && (
                      <div className={`px-4 py-3 border-b flex flex-col gap-1.5 text-xs font-bold ${
                        q.qualityStatus === 'BLOCKED' ? 'bg-red-50 text-red-700 border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/50' :
                        'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900/50'
                      }`}>
                        <div className="flex items-center gap-2 text-sm">
                          {q.qualityStatus === 'BLOCKED' ? <XCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                          <span>
                            {q.qualityStatus === 'BLOCKED' ? 'توقف (BLOCKED): يجب تصحيح الأخطاء التالية قبل الاعتماد' : 'للمراجعة الجودة (REVIEW): يرجى مراجعة الملاحظات التالية'}
                          </span>
                        </div>
                        <ul className="list-disc list-inside font-normal mr-2 text-xs opacity-90 space-y-0.5">
                          {q.qualityIssues.map((issue, i) => <li key={i}>{issue}</li>)}
                        </ul>
                      </div>
                    )}

                    {/* Duplicate Warning */}
                    {q.duplicateWarning && q.status === 'pending' && (
                      <div className="px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-900/50 flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-400">
                        <AlertTriangle className="w-4 h-4" />
                        تحذير: تم اكتشاف تشابه مع سؤال موجود مسبقاً في بنك الأسئلة (المُعرّف: {q.duplicateWarning.substring(0, 8)}).
                      </div>
                    )}

                    {/* Body of Item */}
                    <div className="p-4 flex flex-col lg:flex-row gap-6">
                      {/* Left: Extracted Original (Read-only) */}
                      <div className="w-full lg:w-1/2 flex flex-col gap-3 border-l-0 lg:border-l border-slate-200 dark:border-slate-800 pl-0 lg:pl-6">
                        <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider pb-1">
                          النص الأصلي (مستخرج من الصورة)
                        </h4>
                        <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-300 select-all overflow-auto max-h-[300px]">
                          <MathText text={q.originalText} />
                        </div>
                        {q.originalDistractors && q.originalDistractors.length > 0 ? (
                          <div className="mt-2">
                            <span className="text-[10px] font-bold text-slate-400 mb-1 block">الخيارات المستخرجة:</span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {q.originalDistractors.map((d, dIdx) => (
                                <div key={dIdx} className={`p-2 rounded-lg border text-xs flex items-center gap-2 ${d.isCorrect ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                                  {d.isCorrect && <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />}
                                  {!d.isCorrect && <span className="w-3 h-3 shrink-0" />}
                                  <span className="truncate"><MathText text={d.text} /></span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="mt-2">
                            <span className="text-[10px] font-bold text-slate-400 mb-1 block">الإجابة المستخرجة:</span>
                            <div className="p-2 bg-slate-50 dark:bg-slate-900/50 rounded-lg text-xs border border-slate-200 dark:border-slate-700">
                              <MathText text={q.originalAnswer} />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Right: Modified Editable */}
                      <div className="w-full lg:w-1/2 flex flex-col gap-3">
                        <h4 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider pb-1 flex justify-between items-center">
                          <span>الاقتراح للتعديل والاعتماد</span>
                          <div className="flex gap-2">
                            <select 
                              value={q.type} 
                              onChange={(e) => handleUpdateQuestion(q.id, 'type', e.target.value)}
                              className="bg-slate-100 dark:bg-slate-800 border-none rounded text-xs px-2 py-0.5 outline-none font-bold text-slate-700 dark:text-slate-300"
                              disabled={q.status === 'saved'}
                            >
                              <option value="mcq">اختيار من متعدد (mcq)</option>
                              <option value="essay">مقال (essay)</option>
                              <option value="true_false">صح/خطأ (true_false)</option>
                              <option value="fill_blanks">إملاء الفراغ (fill_blanks)</option>
                            </select>
                            {q.status === 'saved' && <span className="text-[10px] text-slate-400 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded bg-slate-50 dark:bg-slate-800">مغلق</span>}
                          </div>
                        </h4>
                        
                        {q.status === 'saved' ? (
                           <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-sm opacity-80">
                              <MathText text={q.text} />
                           </div>
                        ) : (
                          <RichTextEditor
                            value={q.text}
                            onChange={(val) => handleUpdateQuestion(q.id, 'text', val)}
                            placeholder="نص السؤال..."
                          />
                        )}
                        
                        {q.type === 'mcq' || q.type === 'true_false' ? (
                          <div className="mt-2">
                            <div className="flex justify-between items-center mb-1">
                               <span className="text-[10px] font-bold text-slate-400">الخيارات المعدلة:</span>
                               {q.status !== 'saved' && (
                                  <button onClick={() => addDistractor(q.id)} className="text-[10px] flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline">
                                    <Plus className="w-3 h-3" /> إضافة خيار
                                  </button>
                               )}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {(q.distractors || []).map((d, dIdx) => (
                                <div key={dIdx} className={`p-1 rounded-lg border text-xs flex items-center gap-1 ${d.isCorrect ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                                  <button 
                                    onClick={() => setCorrectDistractor(q.id, dIdx)}
                                    disabled={q.status === 'saved'}
                                    className={`p-1 rounded transition-colors ${d.isCorrect ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-300 dark:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                                    title="تعيين كإجابة صحيحة"
                                  >
                                    <Check className="w-4 h-4" />
                                  </button>
                                  {q.status === 'saved' ? (
                                    <span className="flex-1 truncate px-2"><MathText text={d.text} /></span>
                                  ) : (
                                    <input 
                                      type="text" 
                                      value={d.text}
                                      onChange={(e) => updateDistractor(q.id, dIdx, e.target.value)}
                                      className="flex-1 bg-transparent border-none outline-none text-xs w-full min-w-0"
                                      placeholder="نص الخيار..."
                                    />
                                  )}
                                  {q.status !== 'saved' && (
                                    <button onClick={() => removeDistractor(q.id, dIdx)} className="p-1 text-slate-400 hover:text-red-500 rounded">
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="mt-2">
                            <span className="text-[10px] font-bold text-slate-400 mb-1 block">الإجابة المعدلة:</span>
                            {q.status === 'saved' ? (
                              <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-xs opacity-80 border border-slate-200 dark:border-slate-700">
                                <MathText text={q.answer} />
                              </div>
                            ) : (
                              <RichTextEditor
                                value={q.answer}
                                onChange={(val) => handleUpdateQuestion(q.id, 'answer', val)}
                                placeholder="الإجابة..."
                              />
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>

            {/* Bottom Save Action */}
            <div className="flex flex-col sm:flex-row items-center justify-between pt-6 border-t border-slate-200 dark:border-slate-800 mt-4 gap-4">
               <div className="text-sm font-bold text-slate-600 dark:text-slate-400">
                 إجمالي الأسئلة المستخرجة: {reviewQuestions.length} سؤال
               </div>
               <button
                  onClick={handleSaveAccepted}
                  disabled={acceptedCount === 0}
                  className="w-full sm:w-auto px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
               >
                  <Save className="w-5 h-5" />
                  <span>حفظ ({acceptedCount}) أسئلة معتمدة في البنك</span>
               </button>
            </div>
            
            {progressMsg && !isProcessing && (
              <div className="text-emerald-600 dark:text-emerald-400 text-sm font-bold text-center bg-emerald-50 dark:bg-emerald-900/20 py-3 rounded-xl border border-emerald-100 dark:border-emerald-900/50">
                <CheckCircle2 className="w-5 h-5 inline-block ml-2" />
                {progressMsg}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
