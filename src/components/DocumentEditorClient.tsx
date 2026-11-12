'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Download,
  Eye,
  FileUp,
  Loader2,
  Printer,
  Save,
  Share2,
} from 'lucide-react';
import type { PublicUser } from '@/lib/auth';
import type { DocumentDetail, DocumentShareEntry } from '@/lib/documents';
import { EditorToolbar } from './EditorToolbar';
import { Navbar } from './Navbar';
import { ShareModal } from './ShareModal';
import { UploadModal } from './UploadModal';

interface DocumentEditorClientProps {
  initialDocument: DocumentDetail;
  currentUser: PublicUser;
  teamUsers: PublicUser[];
}

type SaveStatus = 'saved' | 'unsaved' | 'saving' | 'error';

export function DocumentEditorClient({
  initialDocument,
  currentUser,
  teamUsers,
}: DocumentEditorClientProps) {
  const [doc, setDoc] = useState<DocumentDetail>(initialDocument);
  const [title, setTitle] = useState(initialDocument.title);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);

  const readOnly = doc.accessRole === 'viewer';

  const latestTitleRef = useRef(initialDocument.title);
  const latestHtmlRef = useRef(initialDocument.contentHtml);
  const lastSavedRef = useRef({
    title: initialDocument.title,
    html: initialDocument.contentHtml,
  });
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSavingRef = useRef(false);

  const computeStats = useCallback((plainText: string) => {
    const trimmed = plainText.trim();
    setCharCount(plainText.length);
    setWordCount(trimmed ? trimmed.split(/\s+/).length : 0);
  }, []);

  const persistChanges = useCallback(
    async (explicit = false) => {
      if (readOnly || isSavingRef.current) return;

      const trimmedTitle = latestTitleRef.current.trim() || 'Untitled Document';
      const nextHtml = latestHtmlRef.current;

      if (
        !explicit &&
        trimmedTitle === lastSavedRef.current.title &&
        nextHtml === lastSavedRef.current.html
      ) {
        setSaveStatus('saved');
        return;
      }

      isSavingRef.current = true;
      setSaveStatus('saving');
      setSaveError(null);

      try {
        const res = await fetch(`/api/documents/${doc.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: trimmedTitle,
            contentHtml: nextHtml,
          }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setSaveStatus('error');
          setSaveError(data.error || 'Failed to save changes.');
          return;
        }

        const updated = data.document as DocumentDetail;
        lastSavedRef.current = {
          title: updated.title,
          html: updated.contentHtml,
        };
        setDoc(updated);
        if (latestTitleRef.current !== updated.title) {
          setTitle(updated.title);
          latestTitleRef.current = updated.title;
        }
        setSaveStatus('saved');
      } catch {
        setSaveStatus('error');
        setSaveError('Network error while saving.');
      } finally {
        isSavingRef.current = false;
      }
    },
    [doc.id, readOnly]
  );

  const scheduleAutosave = useCallback(() => {
    if (readOnly) return;
    setSaveStatus('unsaved');
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }
    autosaveTimerRef.current = setTimeout(() => {
      void persistChanges(false);
    }, 900);
  }, [persistChanges, readOnly]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      Placeholder.configure({
        placeholder: 'Start writing your document…',
      }),
    ],
    content: initialDocument.contentHtml,
    editable: !readOnly,
    immediatelyRender: false,
    onCreate: ({ editor: created }) => {
      computeStats(created.getText());
    },
    onUpdate: ({ editor: updated }) => {
      latestHtmlRef.current = updated.getHTML();
      computeStats(updated.getText());
      scheduleAutosave();
    },
  });

  // Keyboard shortcut Cmd/Ctrl+S
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
        void persistChanges(true);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [persistChanges]);

  // Warn before closing tab if unsaved changes exist
  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (saveStatus === 'unsaved' || saveStatus === 'saving') {
        e.preventDefault();
        e.returnValue = '';
      }
    }
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [saveStatus]);

  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, []);

  const roleBadge = useMemo(() => {
    if (doc.accessRole === 'owner') {
      return {
        label: 'Owner',
        cls: 'bg-blue-50 text-blue-700 border-blue-200',
      };
    }
    if (doc.accessRole === 'editor') {
      return {
        label: `Shared by ${doc.owner.name} · Editor`,
        cls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      };
    }
    return {
      label: `Shared by ${doc.owner.name} · Viewer (Read-only)`,
      cls: 'bg-amber-50 text-amber-800 border-amber-200',
    };
  }, [doc.accessRole, doc.owner.name]);

  function handleTitleChange(nextValue: string) {
    setTitle(nextValue);
    latestTitleRef.current = nextValue;
    scheduleAutosave();
  }

  function handleTitleBlur() {
    if (!title.trim()) {
      setTitle('Untitled Document');
      latestTitleRef.current = 'Untitled Document';
    }
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    void persistChanges(false);
  }

  function handleImportedIntoDraft(updatedDoc: DocumentDetail) {
    setDoc(updatedDoc);
    latestHtmlRef.current = updatedDoc.contentHtml;
    lastSavedRef.current = {
      title: updatedDoc.title,
      html: updatedDoc.contentHtml,
    };
    if (editor) {
      editor.commands.setContent(updatedDoc.contentHtml, { emitUpdate: false });
      computeStats(editor.getText());
    }
    setSaveStatus('saved');
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-100/80">
      <Navbar currentUser={currentUser} teamUsers={teamUsers} />

      {/* Document Action Bar */}
      <div className="no-print border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Link
              href="/"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
              title="Back to documents"
              aria-label="Back to documents"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                {readOnly ? (
                  <h1 className="truncate text-base font-semibold text-slate-900">{title}</h1>
                ) : (
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    onBlur={handleTitleBlur}
                    maxLength={160}
                    aria-label="Document title"
                    className="min-w-[180px] max-w-md flex-1 rounded-md border border-transparent px-2 py-0.5 text-base font-semibold text-slate-900 transition hover:border-slate-200 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                )}

                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${roleBadge.cls}`}
                >
                  {roleBadge.label}
                </span>

                {doc.sourceFilename && (
                  <span className="hidden rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600 md:inline-block">
                    Imported: {doc.sourceFilename}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Save Status */}
            {!readOnly && (
              <div className="flex items-center gap-2 text-xs">
                {saveStatus === 'saving' && (
                  <span className="inline-flex items-center gap-1 text-slate-500">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Saving…
                  </span>
                )}
                {saveStatus === 'saved' && (
                  <span className="inline-flex items-center gap-1 text-emerald-600">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Saved
                  </span>
                )}
                {saveStatus === 'unsaved' && (
                  <span className="text-amber-600">Unsaved changes</span>
                )}
                {saveStatus === 'error' && (
                  <span className="inline-flex items-center gap-1 text-red-600" title={saveError || ''}>
                    <AlertCircle className="h-3.5 w-3.5" />
                    {saveError || 'Save failed'}
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => {
                    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
                    void persistChanges(true);
                  }}
                  disabled={saveStatus === 'saving'}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-2xs transition hover:bg-slate-50 disabled:opacity-50"
                >
                  <Save className="h-3.5 w-3.5" />
                  Save
                </button>
              </div>
            )}

            {/* Import into draft */}
            {!readOnly && (
              <button
                type="button"
                onClick={() => setImportOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-2xs transition hover:bg-slate-50"
                title="Import content from .txt, .md, or .docx into this document"
              >
                <FileUp className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Import</span>
              </button>
            )}

            {/* Export Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setExportMenuOpen((prev) => !prev)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-2xs transition hover:bg-slate-50"
              >
                <Download className="h-3.5 w-3.5" />
                Export
              </button>
              {exportMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setExportMenuOpen(false)}
                    aria-hidden="true"
                  />
                  <div className="absolute right-0 z-20 mt-1.5 w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
                    <a
                      href={`/api/documents/${doc.id}/export?format=md`}
                      onClick={() => setExportMenuOpen(false)}
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      <Download className="h-3.5 w-3.5 text-slate-400" />
                      Download Markdown (.md)
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        setExportMenuOpen(false);
                        setTimeout(() => window.print(), 50);
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      <Printer className="h-3.5 w-3.5 text-slate-400" />
                      Print / Save as PDF
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Share Button */}
            <button
              type="button"
              onClick={() => setShareOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-medium text-white shadow-xs transition hover:bg-blue-700"
            >
              <Share2 className="h-3.5 w-3.5" />
              Share
              {doc.shares.length > 0 && (
                <span className="rounded-full bg-blue-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  {doc.shares.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Viewer banner */}
      {readOnly && (
        <div className="no-print border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs font-medium text-amber-800">
          <span className="inline-flex items-center gap-1.5">
            <Eye className="h-3.5 w-3.5" />
            You have Viewer (read-only) access to this document. Export to Markdown or PDF is enabled.
          </span>
        </div>
      )}

      {/* Rich-Text Formatting Toolbar */}
      <EditorToolbar editor={editor} readOnly={readOnly} />

      {/* Document Page Canvas */}
      <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <div className="print-sheet mx-auto max-w-4xl rounded-xl border border-slate-200/90 bg-white px-8 py-10 shadow-sm sm:px-14 sm:py-12">
          <div className="hidden print:mb-6 print:block print:border-b print:border-slate-200 print:pb-3">
            <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
            <p className="mt-1 text-xs text-slate-500">Owner: {doc.owner.name}</p>
          </div>

          <EditorContent editor={editor} />
        </div>
      </main>

      {/* Footer Status Bar */}
      <footer className="no-print border-t border-slate-200 bg-white px-4 py-2 text-xs text-slate-500 sm:px-6">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <span>
            {wordCount} {wordCount === 1 ? 'word' : 'words'} · {charCount} characters
          </span>
          <span>Last updated {new Date(doc.updatedAt).toLocaleString()}</span>
        </div>
      </footer>

      <ShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        documentId={doc.id}
        documentTitle={title}
        owner={doc.owner}
        accessRole={doc.accessRole}
        shares={doc.shares}
        teamUsers={teamUsers}
        onSharesUpdated={(shares: DocumentShareEntry[]) =>
          setDoc((prev) => ({ ...prev, shares }))
        }
      />

      <UploadModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        targetDocumentId={doc.id}
        onImported={(updatedDoc) => handleImportedIntoDraft(updatedDoc)}
      />
    </div>
  );
}
