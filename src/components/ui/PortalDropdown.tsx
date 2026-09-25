import React, { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";

interface PortalDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement | null>;
  children: React.ReactNode;
  className?: string;
  position?: "bottom-left" | "bottom-right" | "top-left" | "top-right";
  offset?: number;
}

export const PortalDropdown: React.FC<PortalDropdownProps> = ({
  isOpen,
  onClose,
  triggerRef,
  children,
  className = "",
  position = "bottom-right", // In RTL, "bottom-right" usually means align right edge
  offset = 4,
}) => {
  const [coords, setCoords] = useState({ top: -9999, left: -9999 });
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let rafId: number;

    const updatePosition = () => {
      if (isOpen && triggerRef.current && dropdownRef.current) {
        const triggerRect = triggerRef.current.getBoundingClientRect();
        const dropdownRect = dropdownRef.current.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let top = triggerRect.bottom + offset;
        let left = triggerRect.right - dropdownRect.width; // Default to bottom-right alignment (RTL friendly)

        if (position === "bottom-left") {
          left = triggerRect.left;
        }

        // Boundary checks
        if (left < 10) left = 10;
        if (left + dropdownRect.width > viewportWidth - 10) {
          left = viewportWidth - dropdownRect.width - 10;
        }

        if (top + dropdownRect.height > viewportHeight - 10) {
          // Flip to top if not enough space at bottom
          top = triggerRect.top - dropdownRect.height - offset;
        }
        
        // Prevent top from going off screen if flipped
        if (top < 10) top = 10;

        setCoords({ top, left });
      }
    };

    const handleScrollOrResize = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(updatePosition);
    };

    if (isOpen) {
        // Need a small timeout to let the dropdown render and get its width
        setTimeout(updatePosition, 0);
        
        window.addEventListener("resize", handleScrollOrResize);
        window.addEventListener("scroll", handleScrollOrResize, true);
    }

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener("resize", handleScrollOrResize);
      window.removeEventListener("scroll", handleScrollOrResize, true);
    };
  }, [isOpen, triggerRef, offset, position]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        isOpen &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose, triggerRef]);

  if (!isOpen) return null;

  return createPortal(
    <div
      ref={dropdownRef}
      className={`fixed z-[9999] opacity-0 transition-opacity duration-150 ${
        coords.top !== -9999 ? "opacity-100" : ""
      } ${className}`}
      style={{
        top: Math.max(0, coords.top),
        left: Math.max(0, coords.left),
      }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {children}
    </div>,
    document.body
  );
};
