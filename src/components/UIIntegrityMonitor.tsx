import React, { useEffect, useRef } from "react";
import { processHtmlWithMath, formatPastedEquation } from "./MathText";

/**
 * UI Integrity Monitor
 * A global observer that watches the entire DOM and intercepts paste events.
 * 
 * 1. Automatically intercepts raw LaTeX, HTML, and MathML during Paste.
 * 2. Scans text nodes for raw math/HTML that escaped the standard rendering pipeline.
 * 3. Applies the unified MathText engine to fix rendering anomalies dynamically.
 */
export const UIIntegrityMonitor: React.FC = () => {
  const isEnabled = useRef(true);

  useEffect(() => {
    if (!isEnabled.current) return;

    // --- 1. Global Paste Interceptor Pipeline ---
    const handlePaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;
      
      const isInputOrTextarea = target.tagName === "INPUT" || target.tagName === "TEXTAREA";
      const isContentEditable = target.isContentEditable || target.closest("[contenteditable='true']");
      
      if (!isInputOrTextarea && !isContentEditable) return;

      // CRITICAL: Skip Tiptap editors because they have their own SmartPaste engine
      // which handles LaTeX and HTML cleanly. Intercepting here breaks Tiptap's paste.
      if (target.closest('.ProseMirror') || target.classList.contains('ProseMirror')) {
         return;
      }

      const clipboardData = e.clipboardData;
      if (!clipboardData) return;

      const html = clipboardData.getData("text/html");
      const text = clipboardData.getData("text/plain");
      
      // Check if there is potential raw math, MathML, or word math in the clipboard
      const hasMathIndicators = text && (
        text.includes("<mml:math") || 
        text.includes("<m:oMath") || 
        text.includes("\u25A0") || 
        text.includes("■") ||
        text.includes("\\begin{") ||
        text.includes("\\(") ||
        text.includes("\\[") ||
        text.includes("$$")
      );

      if (hasMathIndicators) {
        console.info("[UI Integrity Monitor] Intercepted math content in paste buffer. Normalizing via unified engine...");
        const cleanedText = formatPastedEquation(text);
        
        if (cleanedText !== text) {
          e.preventDefault();
          
          if (isContentEditable) {
            document.execCommand("insertText", false, cleanedText);
          } else if (isInputOrTextarea) {
             const input = target as HTMLInputElement | HTMLTextAreaElement;
             const start = input.selectionStart || 0;
             const end = input.selectionEnd || 0;
             const val = input.value;
             input.value = val.substring(0, start) + cleanedText + val.substring(end);
             input.setSelectionRange(start + cleanedText.length, start + cleanedText.length);
             // Trigger React change event
             const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
             if (nativeInputValueSetter && input.tagName === "INPUT") {
                 nativeInputValueSetter.call(input, input.value);
             } else {
                 const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;
                 if (nativeTextAreaValueSetter) nativeTextAreaValueSetter.call(input, input.value);
             }
             input.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }
      }
    };

    window.addEventListener("paste", handlePaste, true);

    // --- 2. Central UI Integrity DOM Mutation Observer ---
    let mutationTimeout: NodeJS.Timeout | null = null;
    let pendingNodes = new Set<Node>();

    const processPendingNodes = () => {
      const nodesToProcess = Array.from(pendingNodes);
      pendingNodes.clear();

      for (const textNode of nodesToProcess) {
        if (!textNode.parentNode || !document.contains(textNode)) continue;
        
        const parent = textNode.parentNode as HTMLElement;
        
        // Skip already processing/processed or editable areas
        if (
          parent.isContentEditable ||
          parent.closest("[contenteditable='true']") ||
          parent.tagName === "TEXTAREA" ||
          parent.tagName === "INPUT" ||
          parent.tagName === "CODE" ||
          parent.tagName === "PRE" ||
          parent.tagName === "SCRIPT" ||
          parent.tagName === "STYLE" ||
          parent.closest(".ui-integrity-fixed") ||
          parent.closest(".math-text-container") ||
          parent.closest(".katex")
        ) {
          continue;
        }

        const val = textNode.nodeValue || "";
        // Only target meaningful length to avoid perf issues, except when it contains math delimiters
        if (val.trim().length < 2) continue;


        // Check for <li> elements and ensure they have a container block context to protect emojis/markers.
        if (parent.tagName === "LI" && !parent.classList.contains("list-item-normalized")) {
          parent.classList.add("list-item-normalized");
          if (!parent.style.position || parent.style.position === "static") {
            parent.style.position = "relative";
          }
        }

        // Detect raw LaTeX patterns: $$...$$, $...$, \[...\], \(...\)
        const hasRawLatex = /\$\$.+?\$\$|\$[^\s].+?[^\s]\$|\\\[.+?\\\]|\\\(.+?\\\)/s.test(val);
        // Detect raw basic HTML leaks (avoiding pure text like "< 5")
        const hasRawHTML = /(?:<p>|<strong>|<em>|<ul>|<li>|<b>|<i>|<span>|<div>|<br\s*\/?>)/i.test(val) && !val.includes("<mml:");

        if (hasRawLatex || hasRawHTML) {
           console.warn("[UI Integrity Monitor] Anomaly detected: Raw LaTeX/HTML leaked to presentation layer. Auto-fixing...", {
             snippet: val.substring(0, 80) + (val.length > 80 ? "..." : ""),
             parentTag: parent.tagName
           });

           const span = document.createElement("span");
           span.className = "ui-integrity-fixed math-text-container inline-block"; // mark as fixed
           // Use the unified rendering pipeline to process the raw string
           span.innerHTML = processHtmlWithMath(val);
           
           try {
             // Replace the text node safely
             parent.replaceChild(span, textNode);
           } catch (e) {
             console.error("[UI Integrity Monitor] Failed to apply fix:", e);
           }
        }
      }
    };

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "childList") {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === Node.TEXT_NODE) {
              pendingNodes.add(node);
            } else if (node.nodeType === Node.ELEMENT_NODE) {
              const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, null);
              let textNode;
              while ((textNode = walker.nextNode())) {
                pendingNodes.add(textNode);
              }
            }
          });
        } else if (mutation.type === "characterData") {
           pendingNodes.add(mutation.target);
        }
      }
      
      if (pendingNodes.size > 0) {
        if (mutationTimeout) clearTimeout(mutationTimeout);
        mutationTimeout = setTimeout(processPendingNodes, 100);
      }
    });

    // Run an initial scan
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
    let initialNode;
    while ((initialNode = walker.nextNode())) {
      pendingNodes.add(initialNode);
    }
    processPendingNodes();

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });

    return () => {
      window.removeEventListener("paste", handlePaste, true);
      observer.disconnect();
      if (mutationTimeout) clearTimeout(mutationTimeout);
    };
  }, []);

  return null;
};
