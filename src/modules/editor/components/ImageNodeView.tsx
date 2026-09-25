import React, { useCallback, useRef, useState, useEffect } from 'react';
import { NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import { AlignCenter, AlignLeft, AlignRight, PencilLine, Trash2 } from 'lucide-react';

export const ImageNodeView: React.FC<NodeViewProps> = ({
  node,
  updateAttributes,
  selected,
  editor,
  getPos
}) => {
  const { src, alt, width, height, textAlign } = node.attrs;
  const [isResizing, setIsResizing] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Fallback to text-align if style isn't directly on the node attrs, 
  // though Tiptap TextAlign extension adds `textAlign` attr to the node.
  const align = textAlign || 'center'; 
  const isSelected = selected;

  // Resize logic
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing || !imgRef.current) return;
      const rect = imgRef.current.getBoundingClientRect();
      // Only resizing width for aspect ratio lock
      // If aligned left/right, calculate from the appropriate edge? 
      // For simplicity, just use distance from left edge of image
      const newWidth = Math.max(50, e.clientX - rect.left);
      updateAttributes({ width: `${newWidth}px`, height: null });
    },
    [isResizing, updateAttributes]
  );

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  const handleClick = useCallback(() => {
    if (typeof getPos === 'function') {
      editor.commands.setNodeSelection(getPos());
    }
  }, [editor, getPos]);

  const runTool = (callback: () => void) => (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    callback();
  };

  const editAltText = () => {
    const nextAlt = window.prompt('اكتب وصفًا مختصرًا للصورة لسهولة الوصول والتصدير:', alt || '');
    if (nextAlt !== null) updateAttributes({ alt: nextAlt.trim() });
  };

  // Determine flex justification based on alignment
  let justifyClass = 'justify-center';
  if (align === 'left') justifyClass = 'justify-start';
  if (align === 'right') justifyClass = 'justify-end';

  return (
    <NodeViewWrapper className={`flex w-full my-4 ${justifyClass}`} as="div" onClick={handleClick} style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
      <div className="relative inline-block" style={{ maxWidth: '100%', userSelect: 'none', breakInside: 'avoid', pageBreakInside: 'avoid' }}>
        {isSelected && editor.isEditable && (
          <div
            className="absolute bottom-full left-1/2 z-30 mb-3 flex max-w-[calc(100vw-24px)] -translate-x-1/2 items-center gap-1 overflow-x-auto whitespace-nowrap rounded-xl border border-slate-200 bg-white/95 p-1.5 text-slate-700 shadow-xl backdrop-blur dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-200"
            dir="rtl"
            role="toolbar"
            aria-label="أدوات الصورة"
          >
            <span className="px-1 text-[11px] font-extrabold text-blue-700 dark:text-blue-300">الصورة</span>
            <button type="button" onMouseDown={runTool(() => updateAttributes({ textAlign: 'right' }))} className="rounded-lg p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800" title="محاذاة لليمين"><AlignRight className="h-4 w-4" /></button>
            <button type="button" onMouseDown={runTool(() => updateAttributes({ textAlign: 'center' }))} className="rounded-lg p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800" title="توسيط"><AlignCenter className="h-4 w-4" /></button>
            <button type="button" onMouseDown={runTool(() => updateAttributes({ textAlign: 'left' }))} className="rounded-lg p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800" title="محاذاة لليسار"><AlignLeft className="h-4 w-4" /></button>
            <span className="mx-0.5 h-5 w-px bg-slate-200 dark:bg-slate-700" />
            <button type="button" onMouseDown={runTool(() => updateAttributes({ width: '25%', height: null }))} className="rounded-lg px-2 py-1 text-[11px] font-bold hover:bg-slate-100 dark:hover:bg-slate-800" title="حجم صغير">25%</button>
            <button type="button" onMouseDown={runTool(() => updateAttributes({ width: '50%', height: null }))} className="rounded-lg px-2 py-1 text-[11px] font-bold hover:bg-slate-100 dark:hover:bg-slate-800" title="حجم متوسط">50%</button>
            <button type="button" onMouseDown={runTool(() => updateAttributes({ width: '100%', height: null }))} className="rounded-lg px-2 py-1 text-[11px] font-bold hover:bg-slate-100 dark:hover:bg-slate-800" title="عرض كامل">100%</button>
            <span className="mx-0.5 h-5 w-px bg-slate-200 dark:bg-slate-700" />
            <button type="button" onMouseDown={runTool(editAltText)} className="rounded-lg p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800" title="تعديل وصف الصورة"><PencilLine className="h-4 w-4" /></button>
            <button type="button" onMouseDown={runTool(() => editor.chain().focus().deleteSelection().run())} className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950/40" title="حذف الصورة"><Trash2 className="h-4 w-4" /></button>
          </div>
        )}
        <img
          ref={imgRef}
          src={src}
          alt={alt || "صورة الدرس"}
          width={width ? parseInt(width) : undefined}
          height={height ? parseInt(height) : undefined}
          style={{
            width: width || 'auto',
            height: height || 'auto',
            maxWidth: '100%',
            maxHeight: '650px',
            objectFit: 'contain',
            display: 'block',
            pageBreakInside: 'avoid',
            breakInside: 'avoid',
          }}
          className={`rounded-md transition-all outline outline-2 outline-offset-2 shadow-xs ${isSelected ? 'outline-blue-500' : 'outline-transparent'} ${isResizing ? 'opacity-80' : ''}`}
          draggable={false}
        />
        {isSelected && (
          <div
            className="absolute -right-3 -bottom-3 w-6 h-6 bg-white border-2 border-blue-500 rounded-full cursor-nwse-resize z-10 flex items-center justify-center shadow-sm"
            onMouseDown={handleMouseDown}
          >
             <div className="w-2 h-2 bg-blue-500 rounded-full" />
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
};
