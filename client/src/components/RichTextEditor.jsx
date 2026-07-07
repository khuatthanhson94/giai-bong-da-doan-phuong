import { useEffect, useRef } from "react";
import api from "../api/client";
import { getFullUrl } from "../utils/url";

export default function RichTextEditor({ value, onChange }) {
  const containerRef = useRef(null);
  const quillRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Create editor sub-container
    const editorContainer = document.createElement("div");
    containerRef.current.appendChild(editorContainer);

    // Initialize Quill
    const quill = new window.Quill(editorContainer, {
      theme: "snow",
      modules: {
        toolbar: [
          [{ header: [1, 2, 3, false] }],
          ["bold", "italic", "underline", "strike"],
          [{ color: [] }, { background: [] }],
          [{ list: "ordered" }, { list: "bullet" }],
          ["link", "image", "video"],
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

    // Custom Image Handler for file uploading
    const toolbar = quill.getModule("toolbar");
    toolbar.addHandler("image", () => {
      const input = document.createElement("input");
      input.setAttribute("type", "file");
      input.setAttribute("accept", "image/*");
      input.click();

      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) return;

        try {
          // Upload to server
          const res = await api.upload(file);
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

  return (
    <div className="flex flex-col border border-gray-300 rounded-lg overflow-hidden bg-white shadow-sm">
      <div ref={containerRef} className="min-h-[350px] max-h-[600px] overflow-y-auto" />
    </div>
  );
}

