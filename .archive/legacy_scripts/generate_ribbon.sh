#!/bin/bash
cat << 'HEADER' > src/modules/editor/components/EditorRibbon.tsx
import React, { useState, useRef } from "react";
import { Popover } from "../../../components/ui/Popover";
import { PortalDropdown } from "../../../components/ui/PortalDropdown";
import { Editor } from "@tiptap/react";
import { motion, AnimatePresence } from "motion/react";
import {
  Folder, Save, Eye, FileDown, Printer, Home, PlusCircle, FlaskConical, Layers, Sparkles, Clipboard, Database, RefreshCw, Wand2, Highlighter, Strikethrough, Palette, Rows, Columns, Minus, Combine, Split, PaintBucket, Heading, Plus, ChevronDown, ChevronUp, Target, Lightbulb, BookOpen, CheckSquare, Activity, StickyNote, HelpCircle, Settings, Lock, ArrowUp, ArrowDown, Unlock, Copy, Trash2, X, Check, AlignRight, AlignCenter, AlignLeft, AlignJustify, Heading1, Heading2, Heading3, Bold, Italic, Underline, Baseline, Type, Image as ImageIcon, Table as TableIcon, Sigma, Link as LinkIcon, Video, FileText, Undo, Redo, List, ListOrdered, BetweenVerticalEnd, GripVertical, ZoomOut, ZoomIn, Layout, ChevronLeft, Maximize2, FileCheck, PanelLeft, PanelRight, Sliders, RotateCcw, Ruler
} from "lucide-react";

export interface EditorRibbonProps {
  activeRibbonTab: "file" | "home" | "insert" | "layout" | "questions" | "review" | "view";
  setActiveRibbonTab: (tab: any) => void;
  activeEditor: Editor | null;
  paragraphs?: any[];
  setParagraphs?: (p: any[]) => void;
  setActiveParagraphId?: (id: string) => void;
  setActiveMainTab?: (tab: string) => void;
  onSave?: () => void;
  lastSaved?: string | null;
  onPreview?: () => void;
  onExportWord?: () => void;
  onExportPdf?: () => void;
  onPrint?: () => void;
  setIsImageModalOpen?: (v: boolean) => void;
  setIsTableModalOpen?: (v: boolean) => void;
  setIsLinkModalOpen?: (v: boolean) => void;
  isDistributorProcessing?: boolean;
  setIsDistributorProcessing?: (v: boolean) => void;
  setIsDistributorOpen?: (v: boolean) => void;
  isFocusReadingMode?: boolean;
  setIsFocusReadingMode?: (v: boolean) => void;
  isNavCollapsed?: boolean;
  onToggleNav?: () => void;
  isPreviewCollapsed?: boolean;
  onTogglePreview?: () => void;
  showRuler?: boolean;
  setShowRuler?: (v: boolean) => void;
  setIsRulerModalOpen?: (v: boolean) => void;
  zoomLevel?: number;
  setZoomLevel?: React.Dispatch<React.SetStateAction<number>>;
  setIsAiAssistantOpen?: (v: boolean) => void;
  setIsQuickPasteModalOpen?: (v: boolean) => void;
  setIsQuestionParserOpen?: (v: boolean) => void;
  setIsQuestionHubOpen?: (v: boolean) => void;
  setQuestionHubTab?: (tab: any) => void;
}

export const EditorRibbon: React.FC<EditorRibbonProps> = ({
  activeRibbonTab, setActiveRibbonTab, activeEditor, paragraphs = [], setParagraphs = () => {},
  setActiveParagraphId = () => {}, setActiveMainTab, onSave, lastSaved, onPreview, onExportWord,
  onExportPdf, onPrint, setIsImageModalOpen = () => {}, setIsTableModalOpen = () => {}, setIsLinkModalOpen = () => {},
  isDistributorProcessing, setIsDistributorProcessing, setIsDistributorOpen,
  isFocusReadingMode, setIsFocusReadingMode, isNavCollapsed, onToggleNav,
  isPreviewCollapsed, onTogglePreview, showRuler, setShowRuler, setIsRulerModalOpen,
  zoomLevel = 100, setZoomLevel, setIsAiAssistantOpen, setIsQuickPasteModalOpen,
  setIsQuestionParserOpen, setIsQuestionHubOpen, setQuestionHubTab
}) => {
  const [showFileMenuDropdown, setShowFileMenuDropdown] = useState(false);
  const fileMenuRef = useRef<HTMLDivElement>(null);
  const mathMenuRef = useRef<HTMLDivElement>(null);
  const cardMenuRef = useRef<HTMLDivElement>(null);
  const questionMenuRef = useRef<HTMLDivElement>(null);
  const [isBulletMenuOpen, setIsBulletMenuOpen] = useState(false);
  const [showTextColorPopover, setShowTextColorPopover] = useState(false);
  const [showHighlightPopover, setShowHighlightPopover] = useState(false);
  const [showMathPopover, setShowMathPopover] = useState(false);
  const [showChemPopover, setShowChemPopover] = useState(false);
  const [showQuestionDropdown, setShowQuestionDropdown] = useState(false);
  const [showNewCardDropdown, setShowNewCardDropdown] = useState(false);
  const [showTablePopover, setShowTablePopover] = useState(false);
  const [showCellBgPopover, setShowCellBgPopover] = useState(false);
  const [showHeadingDropdown, setShowHeadingDropdown] = useState(false);
  const [showAiDropdown, setShowAiDropdown] = useState(false);

  const validEditor = activeEditor;
  const formatActiveEditor = (action: (ed: Editor) => void) => {
    if (!validEditor) return;
    action(validEditor);
  };

  const CARD_TYPES = [
    { type: "intro", title: "مقدمة", icon: <BookOpen className="w-3.5 h-3.5 text-blue-500" /> },
  ];
  const onAddQuestion = () => {};
  const attachedQuestions: any[] = [];
  const insertFullLessonStructure = () => {};
  const expandAllCards = (cards: any[]) => {};
  const collapseAllCards = (cards: any[]) => {};
  const setIsPickerOpen = (v: boolean) => {};

  return (
    <>
HEADER

sed -n '944,2035p' src/modules/editor/components/EditorPanel.tsx >> src/modules/editor/components/EditorRibbon.tsx

cat << 'FOOTER' >> src/modules/editor/components/EditorRibbon.tsx
    </>
  );
};
FOOTER

npx tsc --noEmit --jsx react src/modules/editor/components/EditorRibbon.tsx
