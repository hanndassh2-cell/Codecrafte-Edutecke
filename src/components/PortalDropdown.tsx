import React, { useEffect, useState, useRef, ReactNode } from "react";
import { createPortal } from "react-dom";

interface PortalDropdownProps {
  trigger: ReactNode;
  children: ReactNode;
  className?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const PortalDropdown: React.FC<PortalDropdownProps> = ({
  trigger,
  children,
  className = "",
  open,
  onOpenChange,
}) => {
  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = open ?? internalIsOpen;
  const setIsOpen = (nextOpen: boolean) => {
    if (open === undefined) setInternalIsOpen(nextOpen);
    onOpenChange?.(nextOpen);
  };
  const [coords, setCoords] = useState({ top: 0, left: 0, right: 0, bottom: 0 });
  const [direction, setDirection] = useState<"down" | "up">("down");

  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      
      if (spaceBelow < 300 && spaceAbove > spaceBelow) {
        setDirection("up");
        setCoords({ top: rect.top, left: rect.left, right: rect.right, bottom: rect.top });
      } else {
        setDirection("down");
        setCoords({ top: rect.bottom, left: rect.left, right: rect.right, bottom: rect.bottom });
      }
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    const closeOnScroll = (event: Event) => {
      if (!(event.target instanceof Node) || !dropdownRef.current?.contains(event.target)) setIsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); setIsOpen(false); triggerRef.current?.querySelector("button")?.focus(); }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      window.addEventListener("scroll", closeOnScroll, true);
      window.addEventListener("keydown", closeOnEscape, true);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", closeOnScroll, true);
      window.removeEventListener("keydown", closeOnEscape, true);
    };
  }, [isOpen]);

  // Recursively add onClick to all button children in children to close the dropdown
  // A simpler way is just to close on any click inside the dropdown that is a button
  const handleDropdownClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("li") || target.closest("[data-close]")) {
      setIsOpen(false);
    }
  };

  return (
    <>
      <div 
        ref={triggerRef} 
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="inline-block"
      >
        {trigger}
      </div>
      {isOpen &&
        createPortal(
          <div
            ref={dropdownRef}
            onClick={handleDropdownClick}
            className={`fixed z-[9999] flex flex-col dir-rtl ${className}`}
            style={{
              top: direction === "down" ? coords.top + 4 : "auto",
              bottom: direction === "up" ? window.innerHeight - coords.bottom + 4 : "auto",
              right: Math.max(8, Math.min(window.innerWidth - coords.right, window.innerWidth - 304)),
              maxWidth: "calc(100vw - 16px)",
              maxHeight: "calc(100vh - 24px)",
              overflowY: "auto",
            }}
          >
            {children}
          </div>,
          document.body
        )}
    </>
  );
};
