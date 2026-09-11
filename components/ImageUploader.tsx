'use client';

import React, { useState, useRef } from 'react';

interface ImageUploaderProps {
  label?: string;
  currentImage?: string;
  onUpload: (url: string) => void;
  folder?: string;
}

export default function ImageUploader({
  label = 'Upload Image',
  currentImage = '',
  onUpload,
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(currentImage);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size (max 8MB)
    if (file.size > 8 * 1024 * 1024) {
      setError('File size exceeds 8MB limit.');
      return;
    }

    setError(null);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setPreview(data.url);
      onUpload(data.url);
    } catch (err: any) {
      console.error('Upload failed:', err);
      setError(err?.message || 'Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleManualUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPreview(val);
    onUpload(val);
  };

  return (
    <div className="image-uploader">
      {label && <label className="uploader-label">{label}</label>}

      <div className="uploader-box">
        {preview ? (
          <div className="uploader-preview">
            <img src={preview} alt="Uploaded preview" />
            <button
              type="button"
              className="uploader-remove"
              onClick={() => {
                setPreview('');
                onUpload('');
              }}
              title="Remove image"
            >
              ✕
            </button>
          </div>
        ) : (
          <div
            className="uploader-dropzone"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="uploader-icon">☁️</div>
            <span>Click to upload to Cloudinary (PNG, JPG, WebP)</span>
            <small>Max 8MB</small>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </div>

      {uploading && (
        <div className="uploader-status">
          <span className="spinner"></span> Uploading to Cloudinary...
        </div>
      )}

      {error && <div className="uploader-error">⚠️ {error}</div>}

      <div className="uploader-url-input" style={{ marginTop: '8px' }}>
        <input
          type="url"
          placeholder="Or paste direct image URL (https://...)"
          value={preview}
          onChange={handleManualUrlChange}
          style={{ fontSize: '12px', padding: '8px 12px' }}
        />
      </div>
    </div>
  );
}
