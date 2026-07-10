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

  return (
    <div className="flex flex-col border border-gray-300 rounded-lg overflow-hidden bg-white shadow-sm relative">
      <div ref={containerRef} className="min-h-[350px] max-h-[600px] overflow-y-auto" />
      
      {/* Absolute positioned interactive Emoji/Symbols Popover */}
      {showEmojiPicker && (
        <div className="absolute top-[42px] right-2 z-50 bg-white border border-gray-200 rounded-xl shadow-xl p-4 w-72 animate-fade-in">
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
          {/* Category Tabs */}
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
          {/* Emojis Grid */}
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
    </div>
  );
}
