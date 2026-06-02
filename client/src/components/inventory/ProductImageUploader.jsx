import React, { useState, useRef } from 'react';
import { Upload, Button, Spin, Tooltip, Modal } from 'antd';
import { ImagePlus, X, Star, StarOff, Trash2, GripVertical, Eye, AlertCircle } from 'lucide-react';
import axiosInstance from '../../api/axiosInstance';
import toast from 'react-hot-toast';

/**
 * ProductImageUploader
 *
 * Props:
 *  - value: Array of { url, isPrimary, publicId? } — controlled externally
 *  - onChange: (newImages) => void — called whenever image list changes
 *  - maxImages: number (default 8)
 *  - disabled: boolean
 */
const ProductImageUploader = ({ value = [], onChange, maxImages = 8, disabled = false }) => {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [previewSrc, setPreviewSrc] = useState(null);
  const fileInputRef = useRef(null);

  const uploadFile = async (file) => {
    // Validate type & size
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) {
      toast.error(`"${file.name}" is not a supported image type. Use JPG, PNG, WEBP, or GIF.`);
      return null;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(`"${file.name}" exceeds 5MB limit.`);
      return null;
    }

    const formData = new FormData();
    formData.append('image', file);

    const res = await axiosInstance.post('/upload/product-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });

    return res.data?.data || res.data;
  };

  const handleFiles = async (files) => {
    if (disabled) return;
    const remaining = maxImages - value.length;
    if (remaining <= 0) {
      toast.error(`Maximum ${maxImages} images allowed.`);
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remaining);
    setUploading(true);
    const toastId = toast.loading(`Uploading ${filesToUpload.length} image(s)...`);

    const uploaded = [];
    for (const file of filesToUpload) {
      try {
        const result = await uploadFile(file);
        if (result) {
          uploaded.push({
            url: result.url,
            filename: result.filename,
            isPrimary: value.length === 0 && uploaded.length === 0, // first image = primary
          });
        }
      } catch (err) {
        toast.error(`Failed to upload "${file.name}": ${err.response?.data?.message || err.message}`);
      }
    }

    toast.dismiss(toastId);
    if (uploaded.length > 0) {
      toast.success(`${uploaded.length} image(s) uploaded!`);
      onChange([...value, ...uploaded]);
    }
    setUploading(false);
  };

  const handleInputChange = (e) => {
    if (e.target.files?.length) handleFiles(e.target.files);
    e.target.value = ''; // reset so same file can be re-selected
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
  };

  const removeImage = async (idx) => {
    const img = value[idx];
    // Try to delete from server if we have a filename
    if (img.filename) {
      try {
        await axiosInstance.delete(`/upload/product-image/${img.filename}`);
      } catch (_) { /* ignore — file may not exist */ }
    }
    const updated = value.filter((_, i) => i !== idx);
    // Ensure there's always one primary
    if (img.isPrimary && updated.length > 0) updated[0].isPrimary = true;
    onChange(updated);
  };

  const setPrimary = (idx) => {
    const updated = value.map((img, i) => ({ ...img, isPrimary: i === idx }));
    onChange(updated);
  };

  const canUpload = !disabled && value.length < maxImages;

  return (
    <div className="space-y-3">
      {/* Drop zone — only shown if there's room for more images */}
      {canUpload && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => !uploading && fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 select-none ${
            dragOver
              ? 'border-emerald-400 bg-emerald-50 scale-[1.01]'
              : 'border-slate-300 bg-slate-50 hover:border-emerald-400 hover:bg-emerald-50/30'
          } ${uploading ? 'pointer-events-none opacity-70' : ''}`}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Spin size="large" />
              <p className="text-sm text-slate-500 font-medium">Uploading...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center">
                <ImagePlus size={26} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700">
                  Drop images here or <span className="text-emerald-600 underline underline-offset-2">browse</span>
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  JPG, PNG, WEBP, GIF · Max 5MB each · Up to {maxImages} images
                </p>
              </div>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
            multiple
            className="hidden"
            onChange={handleInputChange}
            disabled={uploading}
          />
        </div>
      )}

      {/* Image grid */}
      {value.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {value.map((img, idx) => (
            <div
              key={img.url || idx}
              className={`group relative rounded-xl overflow-hidden border-2 transition-all duration-200 ${
                img.isPrimary
                  ? 'border-emerald-400 shadow-md shadow-emerald-100'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              {/* Image */}
              <div className="aspect-square bg-slate-100">
                <img
                  src={img.url}
                  alt={`Product image ${idx + 1}`}
                  className="w-full h-full object-cover"
                  onError={(e) => { e.target.src = 'https://via.placeholder.com/200?text=Error'; }}
                />
              </div>

              {/* Primary badge */}
              {img.isPrimary && (
                <div className="absolute top-1.5 left-1.5 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow">
                  <Star size={10} /> Primary
                </div>
              )}

              {/* Overlay actions (show on hover) */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                <Tooltip title="Preview">
                  <button
                    type="button"
                    onClick={() => setPreviewSrc(img.url)}
                    className="w-8 h-8 rounded-full bg-white/90 hover:bg-white flex items-center justify-center shadow transition-transform hover:scale-110"
                  >
                    <Eye size={14} className="text-slate-700" />
                  </button>
                </Tooltip>
                {!img.isPrimary && (
                  <Tooltip title="Set as primary">
                    <button
                      type="button"
                      onClick={() => setPrimary(idx)}
                      className="w-8 h-8 rounded-full bg-emerald-500/90 hover:bg-emerald-500 flex items-center justify-center shadow transition-transform hover:scale-110"
                    >
                      <Star size={14} className="text-white" />
                    </button>
                  </Tooltip>
                )}
                {!disabled && (
                  <Tooltip title="Remove image">
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="w-8 h-8 rounded-full bg-red-500/90 hover:bg-red-500 flex items-center justify-center shadow transition-transform hover:scale-110"
                    >
                      <Trash2 size={14} className="text-white" />
                    </button>
                  </Tooltip>
                )}
              </div>

              {/* Index label */}
              <div className="absolute bottom-1 right-1.5 text-[10px] text-slate-400 bg-white/80 rounded px-1 font-medium">
                {idx + 1}/{value.length}
              </div>
            </div>
          ))}

          {/* Add more button when there are existing images */}
          {canUpload && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="aspect-square rounded-xl border-2 border-dashed border-slate-300 hover:border-emerald-400 hover:bg-emerald-50/30 flex flex-col items-center justify-center gap-1 transition-all duration-200 group"
            >
              <ImagePlus size={22} className="text-slate-300 group-hover:text-emerald-500 transition-colors" />
              <span className="text-[11px] text-slate-400 group-hover:text-emerald-600 font-medium transition-colors">Add more</span>
            </button>
          )}
        </div>
      )}

      {/* Count indicator */}
      {value.length > 0 && (
        <p className="text-xs text-slate-400 flex items-center gap-1.5">
          <AlertCircle size={12} />
          {value.length}/{maxImages} images uploaded · Click ★ to set primary (shown as thumbnail)
        </p>
      )}

      {/* Preview Modal */}
      <Modal
        open={!!previewSrc}
        onCancel={() => setPreviewSrc(null)}
        footer={null}
        centered
        width={600}
        bodyStyle={{ padding: 0, borderRadius: 12, overflow: 'hidden' }}
      >
        {previewSrc && (
          <img src={previewSrc} alt="Preview" className="w-full h-auto max-h-[80vh] object-contain" />
        )}
      </Modal>
    </div>
  );
};

export default ProductImageUploader;
