'use client';

import React, { useState, useRef } from 'react';
import JSZip from 'jszip';
import { createGalleryPhoto } from '@/lib/firestore';
import { GalleryPhoto } from '@/lib/types';

interface ZipGalleryUploaderProps {
  onPhotoAdded: (photo: GalleryPhoto) => void;
  showToast: (msg: string) => void;
}

interface UploadedItem {
  name: string;
  url: string;
  caption: string;
}

interface FailedItem {
  name: string;
  error: string;
}

function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return 'image/gif';
    case 'avif':
      return 'image/avif';
    default:
      return 'image/jpeg';
  }
}

function formatFilenameToCaption(filename: string): string {
  // Remove file extension
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
  // Replace underscores and dashes with spaces
  const spaced = nameWithoutExt.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  // Capitalize words
  return spaced
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Client-side image optimization to prevent exceeding Vercel 4.5MB serverless body payload limit
async function optimizeImageForUpload(file: File): Promise<File> {
  // If file is already <= 1.5MB, upload directly
  if (file.size <= 1.5 * 1024 * 1024) {
    return file;
  }

  // If running in environment without window/Image, fallback to original file
  if (typeof window === 'undefined' || typeof Image === 'undefined') {
    return file;
  }

  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const MAX_DIM = 2048;
      let { width, height } = img;

      if (width > MAX_DIM || height > MAX_DIM) {
        if (width > height) {
          height = Math.round((height * MAX_DIM) / width);
          width = MAX_DIM;
        } else {
          width = Math.round((width * MAX_DIM) / height);
          height = MAX_DIM;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob || blob.size >= file.size) {
            resolve(file);
          } else {
            const optimized = new File(
              [blob],
              file.name.replace(/\.[^.]+$/, '.jpg'),
              { type: 'image/jpeg' }
            );
            resolve(optimized);
          }
        },
        'image/jpeg',
        0.88
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };

    img.src = objectUrl;
  });
}

export default function ZipGalleryUploader({ onPhotoAdded, showToast }: ZipGalleryUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState<'idle' | 'extracting' | 'uploading' | 'completed' | 'error'>('idle');
  const [captionPrefix, setCaptionPrefix] = useState('');
  const [zipFileName, setZipFileName] = useState('');
  const [totalCount, setTotalCount] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentFileName, setCurrentFileName] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [uploadedItems, setUploadedItems] = useState<UploadedItem[]>([]);
  const [failedItems, setFailedItems] = useState<FailedItem[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isCancelledRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetUploader = () => {
    setStatus('idle');
    setZipFileName('');
    setTotalCount(0);
    setCurrentIndex(0);
    setCurrentFileName('');
    setProgressPercent(0);
    setUploadedItems([]);
    setFailedItems([]);
    setErrorMessage(null);
    isCancelledRef.current = false;
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCancel = () => {
    isCancelledRef.current = true;
    setStatus('completed');
    showToast('Upload batch paused / cancelled.');
  };

  const processZipFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.zip')) {
      setStatus('error');
      setErrorMessage('Please select a valid .zip archive file.');
      return;
    }

    resetUploader();
    setZipFileName(file.name);
    setStatus('extracting');
    setErrorMessage(null);
    isCancelledRef.current = false;

    try {
      const zip = await JSZip.loadAsync(file);
      const validImageExt = /\.(jpe?g|png|webp|gif|avif)$/i;
      const entriesToProcess: { name: string; entry: JSZip.JSZipObject }[] = [];

      zip.forEach((relativePath, zipEntry) => {
        if (zipEntry.dir) return;
        // Ignore macOS resource forks and hidden files
        if (
          relativePath.includes('__MACOSX') ||
          relativePath.startsWith('.') ||
          relativePath.includes('/.')
        ) {
          return;
        }

        const basename = relativePath.split('/').pop() || relativePath;
        if (basename.startsWith('.')) return;

        if (validImageExt.test(basename)) {
          entriesToProcess.push({ name: basename, entry: zipEntry });
        }
      });

      if (entriesToProcess.length === 0) {
        setStatus('error');
        setErrorMessage('No valid image files (JPG, PNG, WebP) were found inside this ZIP file.');
        return;
      }

      setTotalCount(entriesToProcess.length);
      setStatus('uploading');

      const uploadedList: UploadedItem[] = [];
      const failedList: FailedItem[] = [];

      for (let i = 0; i < entriesToProcess.length; i++) {
        if (isCancelledRef.current) break;

        const { name, entry } = entriesToProcess[i];
        setCurrentIndex(i + 1);
        setCurrentFileName(name);
        setProgressPercent(Math.round(((i) / entriesToProcess.length) * 100));

        try {
          // 1. Extract file blob from zip
          const rawBlob = await entry.async('blob');
          const mime = getMimeType(name);
          const rawFile = new File([rawBlob], name, { type: mime });

          // 2. Optimize image if needed (ensures request payload stays within Vercel limits)
          const fileToUpload = await optimizeImageForUpload(rawFile);

          // 3. Upload to Cloudinary via Next.js API route
          const formData = new FormData();
          formData.append('file', fileToUpload);

          const res = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          });

          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error || 'Server upload failed');
          }

          // 4. Generate caption
          let caption = formatFilenameToCaption(name);
          if (captionPrefix.trim()) {
            caption = `${captionPrefix.trim()} — ${caption}`;
          }

          // 5. Save to Firestore gallery collection
          const created = await createGalleryPhoto({
            src: data.url,
            alt: caption,
            caption: caption,
          });

          // 6. Notify parent state so UI updates in real-time
          onPhotoAdded(created);

          const item: UploadedItem = { name, url: data.url, caption };
          uploadedList.push(item);
          setUploadedItems([...uploadedList]);
        } catch (err: any) {
          console.error(`Failed uploading ${name}:`, err);
          const failed: FailedItem = { name, error: err?.message || 'Upload error' };
          failedList.push(failed);
          setFailedItems([...failedList]);
        }

        setProgressPercent(Math.round(((i + 1) / entriesToProcess.length) * 100));
      }

      setStatus('completed');
      if (uploadedList.length > 0) {
        showToast(`🎉 Successfully uploaded ${uploadedList.length} photos to the Chapter Gallery!`);
      }
    } catch (err: any) {
      console.error('Error processing zip:', err);
      setStatus('error');
      setErrorMessage(err?.message || 'Failed to read ZIP file. It might be corrupt or unsupported.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processZipFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processZipFile(file);
    }
  };

  return (
    <div className="zip-gallery-uploader admin-subcard" style={{ marginBottom: '36px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📦</span> Bulk ZIP Photo Uploader
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--dim, #64748b)' }}>
            Upload a .zip file containing event photos. They will be automatically extracted, uploaded to Cloudinary, and added to the gallery.
          </p>
        </div>
        {status === 'completed' && (
          <button type="button" onClick={resetUploader} className="btn secondary" style={{ fontSize: '12px' }}>
            + Upload Another ZIP
          </button>
        )}
      </div>

      {/* Caption Prefix Input (optional) */}
      {status === 'idle' && (
        <div className="form-group" style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
            Event Title / Caption Prefix <span style={{ fontWeight: 400, color: 'var(--muted, #94a3b8)' }}>(Optional)</span>
          </label>
          <input
            type="text"
            value={captionPrefix}
            onChange={(e) => setCaptionPrefix(e.target.value)}
            placeholder="e.g. IEEE Tech Conclave 2026 (will prefix filenames, e.g. 'IEEE Tech Conclave 2026 — Keynote')"
            style={{ width: '100%', padding: '10px 14px', borderRadius: '8px' }}
          />
        </div>
      )}

      {/* Idle / Dropzone State */}
      {status === 'idle' && (
        <div
          className={`uploader-dropzone ${isDragging ? 'dragging' : ''}`}
          style={{
            border: isDragging ? '2px dashed var(--blue, #00629B)' : '2px dashed var(--line, #e2e8f0)',
            background: isDragging ? 'rgba(0, 98, 155, 0.08)' : 'var(--paper, #f8fafc)',
            padding: '36px 20px',
            borderRadius: '14px',
            cursor: 'pointer',
            textAlign: 'center',
            transition: 'all 0.2s ease',
          }}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div style={{ fontSize: '40px', marginBottom: '8px' }}>🗜️</div>
          <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ink, #1e293b)' }}>
            Click to choose a .ZIP archive or drag & drop here
          </span>
          <small style={{ color: 'var(--muted, #94a3b8)', marginTop: '4px' }}>
            Supports ZIP files containing JPG, JPEG, PNG, or WebP images
          </small>
        </div>
      )}

      {/* Extracting Status */}
      {status === 'extracting' && (
        <div style={{ textAlign: 'center', padding: '32px 20px', background: 'var(--paper, #f8fafc)', borderRadius: '12px' }}>
          <div className="spinner" style={{ margin: '0 auto 12px' }}></div>
          <h4 style={{ margin: '0 0 6px', fontSize: '15px' }}>Extracting archive &quot;{zipFileName}&quot;...</h4>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--dim, #64748b)' }}>Scanning for images inside the zip...</p>
        </div>
      )}

      {/* Uploading Status with Live Progress */}
      {status === 'uploading' && (
        <div style={{ padding: '24px', background: 'var(--paper, #f8fafc)', borderRadius: '12px', border: '1px solid var(--line, #e2e8f0)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div>
              <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--ink, #1e293b)' }}>
                Uploading images to Cloudinary &amp; Gallery:
              </span>
              <span style={{ marginLeft: '8px', fontSize: '13px', color: 'var(--blue, #00629B)', fontWeight: 600 }}>
                {currentIndex} / {totalCount} ({progressPercent}%)
              </span>
            </div>
            <button
              type="button"
              onClick={handleCancel}
              className="btn secondary"
              style={{ fontSize: '12px', padding: '4px 12px', color: '#dc2626' }}
            >
              Stop / Pause
            </button>
          </div>

          {/* Progress Rail */}
          <div
            style={{
              width: '100%',
              height: '10px',
              background: 'rgba(0, 0, 0, 0.08)',
              borderRadius: '999px',
              overflow: 'hidden',
              marginBottom: '12px',
            }}
          >
            <div
              style={{
                width: `${progressPercent}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #00629B, #FF6C0C)',
                borderRadius: '999px',
                transition: 'width 0.25s ease-out',
                boxShadow: '0 0 8px rgba(0, 98, 155, 0.5)',
              }}
            ></div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--dim, #64748b)' }}>
            <span className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px' }}></span>
            <span>Current: <strong>{currentFileName}</strong></span>
          </div>

          {/* Live mini preview grid of recently uploaded items */}
          {uploadedItems.length > 0 && (
            <div style={{ marginTop: '18px', paddingTop: '16px', borderTop: '1px solid var(--line, #e2e8f0)' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '8px', color: 'var(--ink, #1e293b)' }}>
                Uploaded so far ({uploadedItems.length}):
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', maxHeight: '110px', overflowY: 'auto' }}>
                {uploadedItems.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: 'var(--white, #ffffff)',
                      border: '1px solid var(--line, #e2e8f0)',
                      padding: '4px 8px',
                      borderRadius: '8px',
                      fontSize: '11px',
                    }}
                  >
                    <img src={item.url} alt={item.name} style={{ width: '22px', height: '22px', objectFit: 'cover', borderRadius: '4px' }} />
                    <span style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.caption}
                    </span>
                    <span style={{ color: '#16a34a' }}>✓</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Completed State */}
      {status === 'completed' && (
        <div style={{ padding: '24px', background: 'rgba(22, 163, 74, 0.06)', borderRadius: '12px', border: '1px solid rgba(22, 163, 74, 0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <span style={{ fontSize: '24px' }}>🎉</span>
            <div>
              <h4 style={{ margin: 0, fontSize: '16px', color: '#15803d' }}>
                ZIP Upload Complete!
              </h4>
              <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--ink, #1e293b)' }}>
                Successfully uploaded <strong>{uploadedItems.length}</strong> photo{uploadedItems.length === 1 ? '' : 's'} from &quot;{zipFileName}&quot;.
              </p>
            </div>
          </div>

          {failedItems.length > 0 && (
            <div style={{ marginTop: '12px', padding: '10px', background: 'rgba(220, 38, 38, 0.08)', borderRadius: '8px', fontSize: '12px', color: '#b91c1c' }}>
              ⚠️ {failedItems.length} photo{failedItems.length === 1 ? '' : 's'} could not be uploaded:
              <ul style={{ margin: '4px 0 0', paddingLeft: '20px' }}>
                {failedItems.map((f, i) => (
                  <li key={i}>{f.name}: {f.error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Error State */}
      {status === 'error' && (
        <div style={{ padding: '16px', background: 'rgba(220, 38, 38, 0.08)', borderRadius: '10px', border: '1px solid rgba(220, 38, 38, 0.2)', marginTop: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#b91c1c', fontSize: '13px', fontWeight: 600 }}>
              <span>⚠️</span>
              <span>{errorMessage || 'Failed to process ZIP file.'}</span>
            </div>
            <button type="button" onClick={resetUploader} className="btn secondary" style={{ fontSize: '11px', padding: '4px 10px' }}>
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".zip,application/zip,application/x-zip-compressed,multipart/x-zip"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
    </div>
  );
}
