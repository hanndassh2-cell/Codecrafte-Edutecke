import React, { useState, useEffect } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { RichTextEditor } from "../../editor/components/RichTextEditor";

interface QuestionTextBuilderProps {
  value: string;
  onChange: (newValue: string) => void;
  title?: string;
  description?: string;
  placeholderPrefix?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: (collapsed: boolean) => void;
  className?: string;
  customPreview?: React.ReactNode;
  inputStyle?: "minimal" | "full";
  lineSpacing?: number;
  onLineSpacingChange?: (val: number) => void;
}

export const QuestionTextBuilder: React.FC<QuestionTextBuilderProps> = ({
  value,
  onChange,
  title,
  description,
  placeholderPrefix,
  collapsible = true,
  defaultCollapsed = false,
  isCollapsed: externalIsCollapsed,
  onToggleCollapse,
  className = "",
  customPreview,
  inputStyle,
  lineSpacing,
  onLineSpacingChange,
}) => {
  const [isCollapsedInternal, setIsCollapsedInternal] = useState<boolean>(
    collapsible ? defaultCollapsed : false,
  );

  const isCollapsed =
    externalIsCollapsed !== undefined
      ? externalIsCollapsed
      : isCollapsedInternal;

  const handleToggleCollapsed = (newCollapsedState: boolean) => {
    setIsCollapsedInternal(newCollapsedState);
    if (onToggleCollapse) {
      onToggleCollapse(newCollapsedState);
    }
  };

  useEffect(() => {
    if (collapsible) {
      setIsCollapsedInternal(defaultCollapsed);
    }
  }, [defaultCollapsed, collapsible]);

  const toggleOpen = () => {
    if (collapsible) {
      handleToggleCollapsed(!isCollapsed);
    }
  };

  return (
    <div
      className={`flex flex-col bg-white dark:bg-slate-900 border ${
        isCollapsed
          ? "border-slate-200 dark:border-slate-800"
          : "border-blue-300 dark:border-blue-900 shadow-md ring-1 ring-blue-500/10"
      } rounded-xl overflow-hidden transition-all duration-300 ease-in-out ${className}`}
    >
      {(title || description || collapsible) && (
        <div
          className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-800 transition-colors ${
            collapsible ? "cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800" : ""
          }`}
          onClick={toggleOpen}
        >
          <div className="flex flex-col gap-1">
            {title && (
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                {title}
              </h4>
            )}
            {description && (
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {description}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 mt-2 sm:mt-0">
            {collapsible && (
              <button
                type="button"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 dark:hover:text-slate-200 dark:hover:bg-slate-700 transition-colors"
                title={isCollapsed ? "توسيع" : "طي"}
              >
                {isCollapsed ? (
                  <ChevronDown className="w-5 h-5" />
                ) : (
                  <ChevronUp className="w-5 h-5" />
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {!isCollapsed && (
        <div className="flex flex-col flex-1 p-3 bg-white dark:bg-slate-900 min-h-[250px]">
          <RichTextEditor
            value={value}
            lineSpacing={lineSpacing}
            onLineSpacingChange={onLineSpacingChange}
            onChange={onChange}
            placeholder={placeholderPrefix ? `${placeholderPrefix}...` : "اكتب النص أو المحتوى هنا..."}
          />
        </div>
      )}
    </div>
  );
};
