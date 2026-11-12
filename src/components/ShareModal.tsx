'use client';

import { useState } from 'react';
import { Crown, Loader2, Trash2, UserPlus, Users, X } from 'lucide-react';
import type { PublicUser } from '@/lib/auth';
import type { AccessRole, DocumentShareEntry } from '@/lib/documents';
import type { ShareRole } from '@/lib/validation';

interface ShareModalProps {
  open: boolean;
  onClose: () => void;
  documentId: string;
  documentTitle: string;
  owner: PublicUser;
  accessRole: AccessRole;
  shares: DocumentShareEntry[];
  teamUsers: PublicUser[];
  onSharesUpdated: (shares: DocumentShareEntry[]) => void;
}

export function ShareModal({
  open,
  onClose,
  documentId,
  documentTitle,
  owner,
  accessRole,
  shares,
  teamUsers,
  onSharesUpdated,
}: ShareModalProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<ShareRole>('editor');
  const [submitting, setSubmitting] = useState(false);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const isOwner = accessRole === 'owner';
  const sharedUserIds = new Set(shares.map((s) => s.user.id));
  const suggestedUsers = teamUsers.filter(
    (u) => u.id !== owner.id && !sharedUserIds.has(u.id)
  );

  async function handleGrantShare(targetEmail: string, targetRole: ShareRole) {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/documents/${documentId}/shares`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail, role: targetRole }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Could not update sharing permissions.');
        return;
      }
      onSharesUpdated(data.shares as DocumentShareEntry[]);
      setEmail('');
    } catch {
      setError('Network error while sharing document.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdateRole(collaboratorEmail: string, nextRole: ShareRole, userId: string) {
    setError(null);
    setBusyUserId(userId);
    try {
      const res = await fetch(`/api/documents/${documentId}/shares`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: collaboratorEmail, role: nextRole }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Could not update role.');
        return;
      }
      onSharesUpdated(data.shares as DocumentShareEntry[]);
    } finally {
      setBusyUserId(null);
    }
  }

  async function handleRevoke(userId: string) {
    setError(null);
    setBusyUserId(userId);
    try {
      const res = await fetch(`/api/documents/${documentId}/shares`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Could not revoke access.');
        return;
      }
      onSharesUpdated(data.shares as DocumentShareEntry[]);
    } finally {
      setBusyUserId(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-modal-title"
    >
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 id="share-modal-title" className="truncate text-lg font-semibold text-slate-900">
              Share &ldquo;{documentTitle}&rdquo;
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {isOwner
                ? 'Grant workspace members Editor or Viewer access.'
                : 'Only the document owner can modify sharing settings.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close sharing dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {isOwner && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (email.trim()) void handleGrantShare(email.trim(), role);
            }}
            className="mt-5 space-y-3"
          >
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Colleague email (e.g. bob@ajaia.test)"
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as ShareRole)}
                aria-label="Access role"
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
              </select>
              <button
                type="submit"
                disabled={submitting || !email.trim()}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-xs transition hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
                Share
              </button>
            </div>

            {suggestedUsers.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-slate-500">Quick select:</span>
                {suggestedUsers.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => setEmail(u.email)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: u.avatarColor }}
                    />
                    {u.name}
                  </button>
                ))}
              </div>
            )}
          </form>
        )}

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-5">
          <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <Users className="h-3.5 w-3.5" />
            People with access
          </h3>

          <ul className="mt-2.5 divide-y divide-slate-100 rounded-xl border border-slate-200">
            {/* Document Owner */}
            <li className="flex items-center justify-between px-3.5 py-2.5">
              <div className="flex min-w-0 items-center gap-2.5">
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                  style={{ backgroundColor: owner.avatarColor }}
                >
                  {owner.name.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">{owner.name}</p>
                  <p className="truncate text-xs text-slate-500">{owner.email}</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">
                <Crown className="h-3 w-3" />
                Owner
              </span>
            </li>

            {/* Collaborators */}
            {shares.length === 0 ? (
              <li className="px-3.5 py-3 text-sm text-slate-500">
                Not shared with anyone else yet.
              </li>
            ) : (
              shares.map((entry) => (
                <li
                  key={entry.shareId}
                  className="flex items-center justify-between gap-2 px-3.5 py-2.5"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                      style={{ backgroundColor: entry.user.avatarColor }}
                    >
                      {entry.user.name.charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {entry.user.name}
                      </p>
                      <p className="truncate text-xs text-slate-500">{entry.user.email}</p>
                    </div>
                  </div>

                  {isOwner ? (
                    <div className="flex items-center gap-1.5">
                      <select
                        value={entry.role}
                        disabled={busyUserId === entry.user.id}
                        onChange={(e) =>
                          void handleUpdateRole(
                            entry.user.email,
                            e.target.value as ShareRole,
                            entry.user.id
                          )
                        }
                        aria-label={`Role for ${entry.user.name}`}
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 focus:border-blue-500 focus:outline-none"
                      >
                        <option value="editor">Editor</option>
                        <option value="viewer">Viewer</option>
                      </select>
                      <button
                        type="button"
                        disabled={busyUserId === entry.user.id}
                        onClick={() => void handleRevoke(entry.user.id)}
                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                        title="Revoke access"
                        aria-label={`Revoke access for ${entry.user.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium capitalize text-slate-700">
                      {entry.role}
                    </span>
                  )}
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
