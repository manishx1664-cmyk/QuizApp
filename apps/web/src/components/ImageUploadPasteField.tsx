import React, { useState, useRef } from 'react';
import { Image as ImageIcon, Upload, X, Loader2, Link as LinkIcon, Clipboard } from 'lucide-react';
import { api } from '../services/api';

interface ImageUploadPasteFieldProps {
  imageUrl?: string;
  onChange: (url: string) => void;
  label?: string;
}

export const ImageUploadPasteField: React.FC<ImageUploadPasteFieldProps> = ({
  imageUrl,
  onChange,
  label = 'Question Image (Optional)'
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInputVal, setUrlInputVal] = useState('');
  const [pasteNotice, setPasteNotice] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file upload
  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    setIsUploading(true);
    try {
      const res = await api.uploadImage(file);
      onChange(res.url);
    } catch (err: any) {
      console.error('Image upload failed:', err);
      alert('Failed to upload image: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  // Handle Clipboard Paste (Ctrl+V)
  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (file) {
          setIsUploading(true);
          try {
            const reader = new FileReader();
            reader.onload = async (event) => {
              const base64 = event.target?.result as string;
              if (base64) {
                const res = await api.uploadImageBase64(base64);
                onChange(res.url);
                setPasteNotice(true);
                setTimeout(() => setPasteNotice(false), 2500);
              }
            };
            reader.readAsDataURL(file);
          } catch (err: any) {
            console.error('Base64 image upload error:', err);
          } finally {
            setIsUploading(false);
          }
        }
        break;
      }
    }
  };

  // Handle Drag & Drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="space-y-2" onPaste={handlePaste}>
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
          <ImageIcon className="w-3.5 h-3.5 text-brand-500" />
          <span>{label}</span>
        </label>
        <div className="flex items-center gap-2">
          {imageUrl && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="text-[11px] font-semibold text-rose-500 hover:text-rose-600 flex items-center gap-0.5"
            >
              <X className="w-3 h-3" /> Remove Image
            </button>
          )}
          {!imageUrl && (
            <button
              type="button"
              onClick={() => setShowUrlInput(!showUrlInput)}
              className="text-[11px] font-semibold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
            >
              <LinkIcon className="w-3 h-3" />
              {showUrlInput ? 'Hide URL Input' : 'Add Image URL'}
            </button>
          )}
        </div>
      </div>

      {imageUrl ? (
        <div className="relative rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-100 dark:bg-slate-900/50 group max-h-64 flex items-center justify-center p-2">
          <img
            src={imageUrl}
            alt="Question Diagram or Illustration"
            className="max-h-56 max-w-full rounded-xl object-contain shadow-sm"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute top-3 right-3 p-1.5 rounded-full bg-slate-900/80 text-white hover:bg-rose-600 transition-colors shadow-lg"
            title="Delete Image"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Paste & Drop Zone */}
          <div
            tabIndex={0}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`p-4 rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-2 ${
              isDragging
                ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/30'
                : 'border-slate-300 dark:border-slate-700 hover:border-brand-400 bg-slate-50/50 dark:bg-slate-800/30'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleFileUpload(e.target.files[0]);
                }
              }}
            />

            {isUploading ? (
              <div className="flex items-center gap-2 text-xs font-bold text-brand-600">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Uploading image...</span>
              </div>
            ) : (
              <>
                <div className="w-9 h-9 rounded-xl bg-brand-100 dark:bg-brand-950/70 text-brand-600 flex items-center justify-center">
                  <Upload className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    Paste image from clipboard (<kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-mono text-[10px]">Ctrl+V</kbd>) or click to upload
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Supports PNG, JPG, WEBP, GIF screenshots & diagrams
                  </div>
                </div>
              </>
            )}
          </div>

          {pasteNotice && (
            <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <Clipboard className="w-3.5 h-3.5" /> Image pasted and uploaded successfully!
            </div>
          )}

          {/* Optional URL Input */}
          {showUrlInput && (
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                placeholder="https://example.com/image.png or /uploads/..."
                value={urlInputVal}
                onChange={(e) => setUrlInputVal(e.target.value)}
                className="flex-1 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
              />
              <button
                type="button"
                onClick={() => {
                  if (urlInputVal.trim()) {
                    onChange(urlInputVal.trim());
                    setUrlInputVal('');
                    setShowUrlInput(false);
                  }
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold"
              >
                Apply
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
