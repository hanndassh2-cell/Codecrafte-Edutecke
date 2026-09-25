import React, { useState, useEffect, useRef } from "react";
import { Search, Image as ImageIcon, Video, FileText, Settings, X, Plus, Shapes, Sigma, Table, Copy, Trash2 } from "lucide-react";
import { writeToClipboard } from "../../../utils/clipboard";
import { getStoredData, setStoredData } from "../../../services/storage";

interface MediaItem {
  id: string;
  type: string;
  url: string;
  name: string;
  createdAt: string;
}

export const MediaLibraryPanel = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const [activeTab, setActiveTab] = useState("images");
  const [searchQuery, setSearchQuery] = useState("");
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadMedia = () => {
    try {
      const stored = getStoredData<MediaItem[]>("edutech_media_library_v1", []);
      setMediaItems(stored);
    } catch (e) {
      console.error("Failed to load media items:", e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadMedia();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleRefresh = () => {
      loadMedia();
    };
    window.addEventListener("refresh-media-library", handleRefresh);
    return () => {
      window.removeEventListener("refresh-media-library", handleRefresh);
    };
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const base64 = event.target?.result as string;
          if (base64) {
            const newItem: MediaItem = {
              id: "media-" + Date.now() + "-" + Math.random().toString(36).substring(2, 9),
              type: "image",
              url: base64,
              name: file.name || "صورة مرفوعة",
              createdAt: new Date().toISOString()
            };
            const updated = [newItem, ...mediaItems].slice(0, 10);
            setStoredData("edutech_media_library_v1", updated);
            setMediaItems(updated);
          }
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const deleteItem = (id: string) => {
    const updated = mediaItems.filter(item => item.id !== id);
    setStoredData("edutech_media_library_v1", updated);
    setMediaItems(updated);
  };

  const copyToClipboard = async (url: string) => {
    try {
      await writeToClipboard("", url);
      alert("تم نسخ رابط/كود الصورة بنجاح! يمكنك الآن لصقها في أي مكان.");
    } catch (err: any) {
      alert(err.message || "حدث خطأ أثناء النسخ");
    }
  };

  const filteredItems = mediaItems.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = item.type === (activeTab === "images" ? "image" : activeTab);
    return matchesSearch && matchesTab;
  });

  if (!isOpen) return null;

  return (
    <div className="w-80 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0 shadow-[-2px_0_10px_rgba(0,0,0,0.02)] z-20 transition-all duration-300" dir="rtl">
      <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
        <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          مكتبة الوسائط المدمجة
        </h3>
        <button onClick={onClose} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-500 transition cursor-pointer">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-3 border-b border-slate-100 dark:border-slate-800 relative">
        <Search className="w-4 h-4 text-slate-400 absolute right-6 top-1/2 -translate-y-1/2" />
        <input 
          type="text" 
          placeholder="ابحث في الوسائط..." 
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-3 pr-10 py-2 rounded-lg border-none bg-slate-100 dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100"
        />
      </div>

      <div className="flex overflow-x-auto p-2 gap-2 border-b border-slate-100 dark:border-slate-800 hide-scrollbar shrink-0">
        <button onClick={() => setActiveTab("images")} className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${activeTab === "images" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"}`}>صور</button>
        <button onClick={() => setActiveTab("graphics")} className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${activeTab === "graphics" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"}`}>رسومات</button>
        <button onClick={() => setActiveTab("video")} className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${activeTab === "video" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"}`}>فيديو</button>
        <button onClick={() => setActiveTab("files")} className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${activeTab === "files" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"}`}>ملفات (PDF/Word)</button>
        <button onClick={() => setActiveTab("math")} className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${activeTab === "math" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"}`}>معادلات</button>
        <button onClick={() => setActiveTab("tables")} className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${activeTab === "tables" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"}`}>جداول</button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {filteredItems.length === 0 ? (
          <div className="text-center p-8 text-slate-400 text-sm flex flex-col items-center justify-center gap-2 h-full">
            {activeTab === "images" && <ImageIcon className="w-8 h-8 opacity-50 text-slate-400" />}
            {activeTab === "graphics" && <Shapes className="w-8 h-8 opacity-50 text-slate-400" />}
            {activeTab === "video" && <Video className="w-8 h-8 opacity-50 text-slate-400" />}
            {activeTab === "files" && <FileText className="w-8 h-8 opacity-50 text-slate-400" />}
            {activeTab === "math" && <Sigma className="w-8 h-8 opacity-50 text-slate-400" />}
            {activeTab === "tables" && <Table className="w-8 h-8 opacity-50 text-slate-400" />}
            <span>لا توجد عناصر ملصقة أو مرفوعة حالياً</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredItems.map((item) => (
              <div 
                key={item.id} 
                className="group relative border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-950 flex flex-col hover:shadow-sm transition cursor-grab active:cursor-grabbing"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/plain", JSON.stringify({
                    type: "images",
                    title: `📷 صورة: ${item.name}`,
                    body: `<div style="text-align:center;"><img src="${item.url}" alt="${item.name}" style="max-width:100%; height:auto; border-radius:12px; margin:0 auto;" /></div>`
                  }));
                }}
              >
                <div className="aspect-video relative bg-white dark:bg-slate-900 flex items-center justify-center overflow-hidden">
                  <img src={item.url} alt={item.name} className="object-contain max-h-full max-w-full" />
                </div>
                <div className="p-2 flex flex-col flex-1 min-w-0">
                  <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 truncate" title={item.name}>
                    {item.name}
                  </span>
                  <div className="flex items-center justify-between mt-1">
                    <button onClick={() => copyToClipboard(item.url)} className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition cursor-pointer" title="نسخ الكود/الرابط للتعامل">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => deleteItem(item.id)} className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition cursor-pointer" title="حذف">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-4 border-t border-slate-100 dark:border-slate-800">
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileUpload} 
          accept="image/*" 
          className="hidden" 
          multiple
        />
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          رفع صورة جديدة يدوياً
        </button>
      </div>
    </div>
  );
};
