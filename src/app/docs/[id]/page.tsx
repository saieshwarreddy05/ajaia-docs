import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Lock } from 'lucide-react';
import { DocumentEditorClient } from '@/components/DocumentEditorClient';
import { Navbar } from '@/components/Navbar';
import { getCurrentUser, listAllUsers } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { DocAccessError, getDocumentForUser } from '@/lib/documents';

export const dynamic = 'force-dynamic';

export default async function DocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const db = getDb();
  const user = await getCurrentUser(db);
  if (!user) {
    redirect('/login');
  }

  const { id } = await params;
  const teamUsers = listAllUsers(db);

  try {
    const document = getDocumentForUser(db, id, user.id);
    return (
      <DocumentEditorClient
        initialDocument={document}
        currentUser={user}
        teamUsers={teamUsers}
      />
    );
  } catch (err) {
    const message =
      err instanceof DocAccessError
        ? err.message
        : 'This document could not be loaded.';
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar currentUser={user} teamUsers={teamUsers} />
        <main className="mx-auto max-w-lg px-4 py-20 text-center">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xs">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600">
              <Lock className="h-6 w-6" />
            </span>
            <h1 className="mt-4 text-lg font-semibold text-slate-900">Access Unavailable</h1>
            <p className="mt-2 text-sm text-slate-600">{message}</p>
            <Link
              href="/"
              className="mt-6 inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Back to Documents
            </Link>
          </div>
        </main>
      </div>
    );
  }
}
