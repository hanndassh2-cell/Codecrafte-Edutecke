import React, { useState, useEffect, useRef } from "react";
import { ChevronRight, ChevronLeft } from "lucide-react";

interface ResizableSidebarProps {
  children: React.ReactNode;
  storageKey: string;
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  position?: "left" | "right";
  collapsible?: boolean;
}

export const ResizableSidebar: React.FC<ResizableSidebarProps> = ({
  children,
  storageKey,
  defaultWidth = 240,
  minWidth = 200,
  maxWidth = 600,
  position = "right",
  collapsible = true,
}) => {
  const [width, setWidth] = useState(defaultWidth);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const isResizing = useRef(false);

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      setWidth(Math.max(minWidth, Math.min(maxWidth, parseInt(saved, 10))));
    }
    const savedCollapsed = localStorage.getItem(storageKey + "_collapsed");
    if (collapsible && savedCollapsed === "true") {
      setIsCollapsed(true);
    } else if (!collapsible) {
      setIsCollapsed(false);
    }
  }, [storageKey, minWidth, maxWidth, collapsible]);

  useEffect(() => {
    if (!collapsible && isCollapsed) {
      setIsCollapsed(false);
    }
  }, [collapsible]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isCollapsed) return;
    e.preventDefault();
    isResizing.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      
      let newWidth = width;
      if (position === "right") {
        newWidth = window.innerWidth - e.clientX;
      } else {
        newWidth = e.clientX;
      }
      newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
      setWidth(newWidth);
    };

    const handleMouseUp = () => {
      if (isResizing.current) {
        isResizing.current = false;
        document.body.style.cursor = "default";
        document.body.style.userSelect = "auto";
        localStorage.setItem(storageKey, width.toString());
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [width, minWidth, maxWidth, position, storageKey]);

  const toggleCollapse = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    localStorage.setItem(storageKey + "_collapsed", next.toString());
  };

  return (
    <div
      style={{ width: isCollapsed ? '0px' : `${width}px` }}
      className={`shrink-0 h-full flex flex-col relative transition-all duration-300 z-[40] overflow-visible ${
        position === "right" ? "border-l border-slate-200 dark:border-slate-800" : "border-r border-slate-200 dark:border-slate-800"
      }`}
    >
      {!isCollapsed && (
        <div className="w-full h-full overflow-hidden flex flex-col min-w-0">
          {children}
        </div>
      )}

      {/* Resizer Handle */}
      {!isCollapsed && (
        <div
          onMouseDown={handleMouseDown}
          className={`absolute top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500/50 active:bg-blue-600 z-[50] transition-colors ${
            position === "right" ? "-left-0.5" : "-right-0.5"
          }`}
        />
      )}

      {/* Collapse Toggle Button */}
      {collapsible && (
        <button
          onClick={toggleCollapse}
          className={`absolute top-1/2 -translate-y-1/2 w-6 h-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 z-[51] shadow-sm ${
            position === "right"
              ? isCollapsed ? "right-0 rounded-l-md border-r-0" : "-left-3 rounded-full"
              : isCollapsed ? "left-0 rounded-r-md border-l-0" : "-right-3 rounded-full"
          }`}
        >
          {position === "right" ? (
            isCollapsed ? <ChevronLeft className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />
          ) : (
            isCollapsed ? <ChevronRight className="w-4 h-4 text-slate-500" /> : <ChevronLeft className="w-4 h-4 text-slate-500" />
          )}
        </button>
      )}
    </div>
  );
};
