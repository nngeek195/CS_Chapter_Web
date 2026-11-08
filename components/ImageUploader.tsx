'use client';

import { authHeaders } from '@/lib/authHeaders';
import React, { useState, useRef } from 'react';
import Icon from '@/components/ui/Icon';

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
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please drop an image file (PNG, JPG or WebP).');
      return;
    }
    uploadFile(file);
  };

  const uploadFile = async (file: File) => {

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
        headers: await authHeaders(),
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
              aria-label="Remove image"
            >
              <Icon name="x" size={14} />
            </button>
          </div>
        ) : (
          <div
            className="uploader-dropzone"
            role="button"
            tabIndex={0}
            aria-label={`${label || 'Image'}: click or drop a file to upload`}
            onClick={() => !uploading && fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if ((e.key === 'Enter' || e.key === ' ') && !uploading) {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            style={{
              borderColor: dragOver ? 'var(--blue)' : undefined,
              background: dragOver ? 'rgba(0, 98, 155, 0.06)' : undefined,
              transform: dragOver ? 'scale(1.01)' : undefined,
              transition: 'border-color 0.2s, background 0.2s, transform 0.2s',
              opacity: uploading ? 0.6 : 1,
              cursor: uploading ? 'progress' : 'pointer',
            }}
          >
            <div
              className="icon-tile"
              style={{ transform: dragOver ? 'translateY(-3px) scale(1.08)' : undefined, marginBottom: '4px' }}
            >
              {uploading ? <span className="spinner" /> : <Icon name="upload" size={20} />}
            </div>
            <span>{dragOver ? 'Drop to upload' : 'Click to upload or drag and drop'}</span>
            <small>PNG, JPG or WebP · up to 8 MB</small>
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
          <span className="spinner"></span> Uploading image…
        </div>
      )}

      {error && (
        <div className="uploader-error" role="alert" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Icon name="alert" size={14} /> {error}
        </div>
      )}

      <div className="uploader-url-input input-icon" style={{ marginTop: '8px' }}>
        <Icon name="link" size={14} />
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
