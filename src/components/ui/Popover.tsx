import React, { useRef, useState, useEffect, ReactNode } from "react";
import { createPortal } from "react-dom";

interface PopoverProps {
  trigger: ReactNode;
  content: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  className?: string;
  position?: "bottom-left" | "bottom-right" | "top-left" | "top-right";
}

export const Popover: React.FC<PopoverProps> = ({
  trigger,
  content,
  isOpen,
  onClose,
  className = "",
  position = "bottom-right",
}) => {
  const triggerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: -9999, left: -9999, width: 0 });

  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom,
        left: rect.left,
        width: rect.width,
      });
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node) &&
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen && popoverRef.current && triggerRef.current) {
      const popoverRect = popoverRef.current.getBoundingClientRect();
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      let newLeft = triggerRect.left;
      let newTop = triggerRect.bottom + 4;
      
      if (position.includes("right")) {
        newLeft = triggerRect.right - popoverRect.width;
      }
      
      if (newLeft < 10) newLeft = 10;
      if (newLeft + popoverRect.width > viewportWidth - 10) {
        newLeft = viewportWidth - popoverRect.width - 10;
      }
      
      if (newTop + popoverRect.height > viewportHeight - 10) {
        newTop = triggerRect.top - popoverRect.height - 4; 
      }
      
      if (newLeft !== coords.left || newTop !== coords.top) {
        setCoords(prev => ({ ...prev, left: newLeft, top: newTop }));
      }
    }
  }, [isOpen, content, position]);

  return (
    <>
      <div ref={triggerRef} className="inline-block" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
        {trigger}
      </div>
      {isOpen &&
        createPortal(
          <div
            ref={popoverRef}
            className={`fixed z-[9999] opacity-0 transition-opacity duration-150 ${coords.top !== -9999 ? 'opacity-100' : ''} ${className}`}
            style={{
              top: `${Math.max(0, coords.top)}px`,
              left: `${Math.max(0, coords.left)}px`,
            }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {content}
          </div>,
          document.body
        )}
    </>
  );
};
