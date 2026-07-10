import { useEffect, useRef, useState } from "react";
import api from "../api/client";
import { getFullUrl } from "../utils/url";
import { resizeImage } from "../utils/imageResize";

const emojiCategories = {
  sports: {
    label: "⚽ Thể thao",
    items: ["⚽", "🏆", "🥇", "🥈", "🥉", "👟", "⏱️", "📢", "🚩", "🏃", "👕", "🥅", "🔥", "⚡"]
  },
  symbols: {
    label: "⭐ Ký tự",
    items: ["★", "☆", "✦", "✧", "✔", "✘", "✓", "✕", "✖", "❤", "✨", "⭐", "💡", "📌", "📍", "⏳", "📅", "📝", "🔔", "👑"]
  },
  arrows: {
    label: "➡️ Hướng",
    items: ["➡️", "⬅️", "⬆️", "⬇️", "↗️", "↘️", "⏩", "⏪", "▶️", "👉", "👈", "☝️", "👇", "✅", "❌", "ℹ️"]
  },
  faces: {
    label: "😀 Cảm xúc",
    items: ["😀", "😁", "😂", "🤣", "😃", "😄", "😅", "😆", "😉", "😊", "😋", "😎", "😍", "😘", "👍", "👏", "🤝", "🙏"]
  }
};

export default function RichTextEditor({ value, onChange }) {
  const containerRef = useRef(null);
  const quillRef = useRef(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeTab, setActiveTab] = useState("sports");
  const [isFullScreen, setIsFullScreen] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    // Register inline styles for alignment so it works on public pages natively
    if (window.Quill) {
      const AlignStyle = window.Quill.import("attributors/style/align");
      window.Quill.register(AlignStyle, true);
    }

    // Create editor sub-container
    const editorContainer = document.createElement("div");
    containerRef.current.appendChild(editorContainer);

    // Initialize Quill with full rich editing features like news platforms
    const quill = new window.Quill(editorContainer, {
      theme: "snow",
      modules: {
        toolbar: [
          [{ font: [] }, { size: ["small", false, "large", "huge"] }],
          [{ header: [1, 2, 3, 4, false] }],
          ["bold", "italic", "underline", "strike", "blockquote", "code-block"],
          [{ color: [] }, { background: [] }],
          [{ list: "ordered" }, { list: "bullet" }],
          [{ align: [] }],
          ["link", "image", "video", "emoji"],
          ["clean"],
        ],
      },
    });

    quillRef.current = quill;

    // Set initial content
    if (value) {
      quill.root.innerHTML = value;
    }

    // Set change handler
    quill.on("text-change", () => {
      const html = quill.root.innerHTML;
      onChange(html === "<p><br></p>" ? "" : html);
    });

    // Style and configure custom emoji toolbar button
    const parent = containerRef.current.parentNode;
    const emojiButton = parent.querySelector(".ql-emoji");
    if (emojiButton) {
      emojiButton.innerHTML = '<span style="font-size: 16px; line-height: 1; display: block;">😀</span>';
      emojiButton.title = "Chèn biểu tượng đặc biệt / Emoji";
      emojiButton.style.display = "flex";
      emojiButton.style.alignItems = "center";
      emojiButton.style.justifyContent = "center";
    }

    const toolbar = quill.getModule("toolbar");
    toolbar.addHandler("emoji", () => {
      setShowEmojiPicker((prev) => !prev);
    });

    // Custom Image Handler for file uploading with compression
    toolbar.addHandler("image", () => {
      const input = document.createElement("input");
      input.setAttribute("type", "file");
      input.setAttribute("accept", "image/*");
      input.click();

      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) return;

        try {
          // Resize to max 1000x1000 for news content images
          const resizedFile = await resizeImage(file, 1000, 1000);
          // Upload to server
          const res = await api.upload(resizedFile);
          const url = getFullUrl(res.url);

          // Insert into editor
          const range = quill.getSelection();
          if (range) {
            quill.insertEmbed(range.index, "image", url);
            quill.setSelection(range.index + 1);
          } else {
            quill.insertEmbed(quill.getLength(), "image", url);
          }
        } catch (err) {
          console.error("Failed to upload image inside rich editor:", err);
          alert("Tải ảnh lên thất bại: " + err.message);
        }
      };
    });

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, []);

  // Sync external updates (like form resets or edit click load)
  useEffect(() => {
    if (quillRef.current && value !== quillRef.current.root.innerHTML) {
      quillRef.current.root.innerHTML = value || "";
    }
  }, [value]);

  const insertEmoji = (emojiSymbol) => {
    if (!quillRef.current) return;
    const quill = quillRef.current;
    const range = quill.getSelection();
    if (range) {
      quill.insertText(range.index, emojiSymbol);
      quill.setSelection(range.index + emojiSymbol.length);
    } else {
      quill.insertText(quill.getLength() - 1, emojiSymbol);
    }
  };

  const getWordAndCharCount = (html) => {
    if (!html) return { words: 0, chars: 0 };
    const cleanText = html.replace(/<[^>]*>/g, "").trim();
    if (!cleanText) return { words: 0, chars: 0 };
    const words = cleanText.split(/\s+/).filter(Boolean).length;
    const chars = cleanText.length;
    return { words, chars };
  };

  const { words, chars } = getWordAndCharCount(value);

  return (
    <div className={`flex flex-col border border-gray-300 rounded-xl overflow-hidden bg-white shadow-sm relative modern-editor ${isFullScreen ? 'fullscreen' : ''}`}>
      {/* Scope specific styling for a premium document editor look */}
      <style dangerouslySetInnerHTML={{ __html: `
        .modern-editor .ql-toolbar.ql-snow {
          border: 1px solid #e5e7eb;
          border-top-left-radius: 0.75rem;
          border-top-right-radius: 0.75rem;
          background-color: #f9fafb;
          padding: 0.75rem;
          display: flex;
          flex-wrap: wrap;
          gap: 0.25rem;
        }
        .modern-editor .ql-container.ql-snow {
          border: 1px solid #e5e7eb;
          border-top: none;
          border-bottom-left-radius: 0px;
          border-bottom-right-radius: 0px;
          background-color: #ffffff;
          font-family: 'Inter', system-ui, sans-serif;
          font-size: 15px;
          color: #1f2937;
        }
        .modern-editor .ql-editor {
          padding: 2rem;
          min-height: 380px;
          max-height: 600px;
          line-height: 1.75;
        }
        .modern-editor .ql-snow.ql-toolbar button:hover,
        .modern-editor .ql-snow.ql-toolbar button.ql-active,
        .modern-editor .ql-snow.ql-toolbar .ql-picker-label:hover,
        .modern-editor .ql-snow.ql-toolbar .ql-picker-label.ql-active {
          color: #0066cc !important;
          background-color: #eff6ff;
          border-radius: 0.375rem;
        }
        .modern-editor .ql-snow.ql-toolbar button:hover .ql-stroke,
        .modern-editor .ql-snow.ql-toolbar button.ql-active .ql-stroke {
          stroke: #0066cc !important;
        }
        .modern-editor .ql-snow.ql-toolbar button:hover .ql-fill,
        .modern-editor .ql-snow.ql-toolbar button.ql-active .ql-fill {
          fill: #0066cc !important;
        }
        
        /* Fullscreen editor styling */
        .modern-editor.fullscreen {
          position: fixed !important;
          inset: 0 !important;
          z-index: 9999 !important;
          width: 100vw !important;
          height: 100vh !important;
          border-radius: 0 !important;
          padding: 1.5rem !important;
          background-color: #f1f5f9 !important;
          display: flex !important;
          flex-direction: column !important;
        }
        .modern-editor.fullscreen .ql-toolbar.ql-snow {
          border-top-left-radius: 0.75rem;
          border-top-right-radius: 0.75rem;
        }
        .modern-editor.fullscreen .ql-container.ql-snow {
          flex: 1 !important;
          height: auto !important;
          max-height: none !important;
          border-bottom: 1px solid #e5e7eb !important;
        }
        .modern-editor.fullscreen .ql-editor {
          max-height: none !important;
          height: 100% !important;
          padding: 3rem 12% !important; /* Centered writing sheet layout */
          background-color: #ffffff !important;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03) !important;
          max-width: 1000px;
          margin: 0 auto;
          width: 100%;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}} />

      {/* Editor Container */}
      <div ref={containerRef} className="flex-1 overflow-y-auto" />

      {/* Custom absolute Emoji Popover */}
      {showEmojiPicker && (
        <div className="absolute top-[48px] right-2 z-50 bg-white border border-gray-200 rounded-xl shadow-xl p-4 w-72 animate-fade-in">
          <div className="flex justify-between items-center border-b pb-2 mb-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Ký tự đặc biệt & Emoji</span>
            <button
              type="button"
              onClick={() => setShowEmojiPicker(false)}
              className="text-gray-400 hover:text-gray-600 text-xs font-bold"
            >
              Đóng ✕
            </button>
          </div>
          {/* Tabs */}
          <div className="flex border-b mb-3 overflow-x-auto pb-1 gap-1 no-scrollbar flex-nowrap">
            {Object.entries(emojiCategories).map(([key, cat]) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                className={`px-2 py-1 text-xs rounded-md transition-all whitespace-nowrap ${
                  activeTab === key ? "bg-primary text-white font-semibold" : "text-gray-500 hover:bg-gray-100"
                }`}
              >
                {cat.label.split(" ")[0]} {cat.label.split(" ")[1]}
              </button>
            ))}
          </div>
          {/* Grid */}
          <div className="grid grid-cols-6 gap-2 max-h-40 overflow-y-auto p-2 bg-gray-50 rounded-lg border">
            {emojiCategories[activeTab].items.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => insertEmoji(emoji)}
                className="text-xl p-1.5 hover:bg-white hover:shadow-sm rounded-md transition duration-150 flex items-center justify-center hover:scale-110 active:scale-95"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Editor Status Bar */}
      <div className="bg-gray-50 border-t border-gray-200 px-4 py-2 flex items-center justify-between text-xs text-gray-500 font-medium select-none z-10">
        <div className="flex items-center gap-4">
          <span>Số từ: <strong className="text-gray-700">{words}</strong></span>
          <span className="w-1 h-1 bg-gray-300 rounded-full" />
          <span>Ký tự: <strong className="text-gray-700">{chars}</strong></span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (confirm("Bạn có chắc chắn muốn xóa toàn bộ nội dung?")) {
                if (quillRef.current) quillRef.current.root.innerHTML = "";
              }
            }}
            className="text-red-500 hover:text-red-700 transition px-2 py-1 rounded hover:bg-red-50 font-semibold"
          >
            Xóa hết 🧹
          </button>
          <button
            type="button"
            onClick={() => setIsFullScreen((prev) => !prev)}
            className="bg-primary/10 text-primary hover:bg-primary/20 transition px-3 py-1 rounded-md flex items-center gap-1 font-bold"
          >
            {isFullScreen ? "Thu nhỏ 🗗" : "Toàn màn hình 🖵"}
          </button>
        </div>
      </div>
    </div>
  );
}
