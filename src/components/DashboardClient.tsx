'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import {
  FileText,
  FileUp,
  FolderOpen,
  Loader2,
  Pencil,
  Plus,
  Search,
  Share2,
  Trash2,
  Users,
} from 'lucide-react';
import type { PublicUser } from '@/lib/auth';
import type { DocumentDetail, DocumentSummary } from '@/lib/documents';
import { Navbar } from './Navbar';
import { UploadModal } from './UploadModal';

interface DashboardClientProps {
  currentUser: PublicUser;
  teamUsers: PublicUser[];
  initialOwned: DocumentSummary[];
  initialShared: DocumentSummary[];
}

type FilterTab = 'all' | 'owned' | 'shared';

export function DashboardClient({
  currentUser,
  teamUsers,
  initialOwned,
  initialShared,
}: DashboardClientProps) {
  const router = useRouter();
  const [owned, setOwned] = useState<DocumentSummary[]>(initialOwned);
  const [shared, setShared] = useState<DocumentSummary[]>(initialShared);
  const [tab, setTab] = useState<FilterTab>('all');
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const normalizedQuery = query.trim().toLowerCase();

  const filteredOwned = useMemo(() => {
    if (!normalizedQuery) return owned;
    return owned.filter(
      (d) =>
        d.title.toLowerCase().includes(normalizedQuery) ||
        d.preview.toLowerCase().includes(normalizedQuery)
    );
  }, [owned, normalizedQuery]);

  const filteredShared = useMemo(() => {
    if (!normalizedQuery) return shared;
    return shared.filter(
      (d) =>
        d.title.toLowerCase().includes(normalizedQuery) ||
        d.preview.toLowerCase().includes(normalizedQuery) ||
        d.owner.name.toLowerCase().includes(normalizedQuery)
    );
  }, [shared, normalizedQuery]);

  async function handleCreateDoc() {
    setError(null);
    setCreating(true);
    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Untitled Document' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Could not create document.');
        return;
      }
      const created = data.document as DocumentDetail;
      router.push(`/docs/${created.id}`);
    } catch {
      setError('Network error while creating document.');
    } finally {
      setCreating(false);
    }
  }

  async function handleSaveRename(docId: string) {
    const trimmed = renameValue.trim();
    if (!trimmed) {
      setRenamingId(null);
      return;
    }

    setBusyId(docId);
    setError(null);
    try {
      const res = await fetch(`/api/documents/${docId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Could not rename document.');
        return;
      }
      const updated = data.document as DocumentDetail;
      setOwned((prev) =>
        prev.map((d) =>
          d.id === docId ? { ...d, title: updated.title, updatedAt: updated.updatedAt } : d
        )
      );
      setShared((prev) =>
        prev.map((d) =>
          d.id === docId ? { ...d, title: updated.title, updatedAt: updated.updatedAt } : d
        )
      );
    } finally {
      setBusyId(null);
      setRenamingId(null);
    }
  }

  async function handleDeleteDoc(doc: DocumentSummary) {
    if (!window.confirm(`Delete "${doc.title}"? This action cannot be undone.`)) {
      return;
    }

    setBusyId(doc.id);
    setError(null);
    try {
      const res = await fetch(`/api/documents/${doc.id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Could not delete document.');
        return;
      }
      setOwned((prev) => prev.filter((d) => d.id !== doc.id));
    } finally {
      setBusyId(null);
    }
  }

  function renderDocCard(doc: DocumentSummary) {
    const isOwner = doc.accessRole === 'owner';
    const canRename = isOwner || doc.accessRole === 'editor';
    const isRenaming = renamingId === doc.id;

    return (
      <div
        key={doc.id}
        className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-2xs transition hover:border-blue-300 hover:shadow-sm"
      >
        <div>
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-2.5">
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                  isOwner ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'
                }`}
              >
                <FileText className="h-4 w-4" />
              </span>

              {isRenaming ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void handleSaveRename(doc.id);
                  }}
                  className="flex flex-1 items-center gap-1.5"
                >
                  <input
                    type="text"
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={() => void handleSaveRename(doc.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') setRenamingId(null);
                    }}
                    className="w-full rounded-md border border-blue-400 px-2 py-1 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </form>
              ) : (
                <Link
                  href={`/docs/${doc.id}`}
                  className="min-w-0 flex-1 text-sm font-semibold text-slate-900 hover:text-blue-600"
                >
                  <span className="line-clamp-1">{doc.title}</span>
                </Link>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
              {canRename && !isRenaming && (
                <button
                  type="button"
                  onClick={() => {
                    setRenamingId(doc.id);
                    setRenameValue(doc.title);
                  }}
                  className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  title="Rename document"
                  aria-label={`Rename ${doc.title}`}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}
              {isOwner && (
                <button
                  type="button"
                  disabled={busyId === doc.id}
                  onClick={() => void handleDeleteDoc(doc)}
                  className="rounded-md p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                  title="Delete document"
                  aria-label={`Delete ${doc.title}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          <Link href={`/docs/${doc.id}`} className="mt-3 block">
            <p className="line-clamp-2 min-h-[2.5rem] text-xs leading-relaxed text-slate-500">
              {doc.preview}
            </p>
          </Link>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-[11px]">
          <div className="flex flex-wrap items-center gap-1.5">
            {isOwner ? (
              <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 font-medium text-blue-700">
                Owned by you
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">
                <Users className="h-3 w-3" />
                {doc.owner.name} · <span className="capitalize">{doc.accessRole}</span>
              </span>
            )}

            {isOwner && doc.shareCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
                <Share2 className="h-2.5 w-2.5" />
                Shared ({doc.shareCount})
              </span>
            )}

            {doc.sourceFilename && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-500">
                {doc.sourceFilename}
              </span>
            )}
          </div>

          <span className="text-slate-400">
            {new Date(doc.updatedAt).toLocaleDateString()}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar currentUser={currentUser} teamUsers={teamUsers} />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {/* Hero Action Header */}
        <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Your Documents
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Create rich-text drafts, import <code className="text-xs">.txt</code>,{' '}
              <code className="text-xs">.md</code>, or <code className="text-xs">.docx</code> files,
              and share with teammates.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setUploadOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-2xs transition hover:bg-slate-50"
            >
              <FileUp className="h-4 w-4 text-slate-500" />
              Upload File
            </button>
            <button
              type="button"
              onClick={() => void handleCreateDoc()}
              disabled={creating}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-blue-700 disabled:opacity-60"
            >
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              New Document
            </button>
          </div>
        </div>

        {/* Filter Tabs & Search */}
        <div className="mt-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
            {(
              [
                { id: 'all', label: `All (${owned.length + shared.length})` },
                { id: 'owned', label: `My Documents (${owned.length})` },
                { id: 'shared', label: `Shared with me (${shared.length})` },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-medium transition ${
                  tab === item.id
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search documents…"
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* My Documents Section */}
        {(tab === 'all' || tab === 'owned') && (
          <section className="mt-7">
            <div className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-blue-600" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                My Documents
              </h2>
            </div>

            {filteredOwned.length === 0 ? (
              <div className="mt-3 rounded-xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center">
                <p className="text-sm font-medium text-slate-700">
                  {normalizedQuery
                    ? 'No owned documents match your search.'
                    : 'You haven’t created any documents yet.'}
                </p>
                {!normalizedQuery && (
                  <p className="mt-1 text-xs text-slate-500">
                    Click &ldquo;New Document&rdquo; or upload a .txt, .md, or .docx file to get started.
                  </p>
                )}
              </div>
            ) : (
              <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredOwned.map(renderDocCard)}
              </div>
            )}
          </section>
        )}

        {/* Shared With Me Section */}
        {(tab === 'all' || tab === 'shared') && (
          <section className="mt-9">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-emerald-600" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                Shared with me
              </h2>
            </div>

            {filteredShared.length === 0 ? (
              <div className="mt-3 rounded-xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center">
                <p className="text-sm font-medium text-slate-700">
                  {normalizedQuery
                    ? 'No shared documents match your search.'
                    : 'No documents have been shared with you yet.'}
                </p>
                {!normalizedQuery && (
                  <p className="mt-1 text-xs text-slate-500">
                    Switch demo users from the top-right menu to share a document with{' '}
                    <span className="font-medium">{currentUser.email}</span>.
                  </p>
                )}
              </div>
            ) : (
              <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredShared.map(renderDocCard)}
              </div>
            )}
          </section>
        )}
      </main>

      <UploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onImported={(doc) => {
          router.push(`/docs/${doc.id}`);
        }}
      />
    </div>
  );
}
