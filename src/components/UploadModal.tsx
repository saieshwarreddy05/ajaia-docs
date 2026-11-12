'use client';

import { useRef, useState } from 'react';
import { FileUp, Loader2, X } from 'lucide-react';
import type { DocumentDetail } from '@/lib/documents';

interface UploadModalProps {
  open: boolean;
  onClose: () => void;
  /** When set, imports the file into the active document instead of creating a new one. */
  targetDocumentId?: string;
  onImported: (doc: DocumentDetail, mode: 'created' | 'appended') => void;
}

export function UploadModal({
  open,
  onClose,
  targetDocumentId,
  onImported,
}: UploadModalProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function processFile(file: File) {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (!['txt', 'md', 'docx'].includes(ext)) {
      setError('Unsupported file type. Please choose a .txt, .md, or .docx file.');
      return;
    }

    if (file.size === 0) {
      setError('This file is empty.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('File exceeds the 5 MB upload limit.');
      return;
    }

    setError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (targetDocumentId) {
        formData.append('documentId', targetDocumentId);
      }

      const res = await fetch('/api/documents/import', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Could not import file.');
        return;
      }

      onImported(data.document as DocumentDetail, data.mode);
      onClose();
    } catch {
      setError('Network error while uploading file. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upload-modal-title"
    >
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between">
          <div>
            <h2 id="upload-modal-title" className="text-lg font-semibold text-slate-900">
              {targetDocumentId ? 'Import File into Current Draft' : 'Upload & Convert Document'}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {targetDocumentId
                ? 'Append formatted content from a local file into this document.'
                : 'Convert a local file into a new editable Ajaia document.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={uploading}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close upload dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const file = e.dataTransfer.files?.[0];
            if (file) void processFile(file);
          }}
          className={`mt-5 flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition ${
            dragging
              ? 'border-blue-500 bg-blue-50/70'
              : 'border-slate-200 bg-slate-50/60 hover:border-slate-300'
          }`}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="text-sm font-medium text-slate-700">Parsing and importing document…</p>
            </div>
          ) : (
            <>
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                <FileUp className="h-6 w-6" />
              </span>
              <p className="mt-3 text-sm font-medium text-slate-800">
                Drag &amp; drop your file here, or{' '}
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="font-semibold text-blue-600 underline decoration-blue-300 underline-offset-2 hover:text-blue-700"
                >
                  browse files
                </button>
              </p>
              <p className="mt-1.5 text-xs text-slate-500">
                Supported formats: <span className="font-medium text-slate-700">.txt</span>,{' '}
                <span className="font-medium text-slate-700">.md</span>,{' '}
                <span className="font-medium text-slate-700">.docx</span> (max 5 MB)
              </p>
            </>
          )}

          <input
            ref={inputRef}
            type="file"
            accept=".txt,.md,.docx"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void processFile(file);
              e.target.value = '';
            }}
          />
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={uploading}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
