import crypto from 'crypto';
import type Database from 'better-sqlite3';
import { PublicUser } from './auth';
import { extractPlainTextPreview, sanitizeRichHtml, ShareRole } from './validation';

export type AccessRole = 'owner' | ShareRole;

export interface DocumentSummary {
  id: string;
  title: string;
  preview: string;
  owner: PublicUser;
  accessRole: AccessRole;
  shareCount: number;
  sourceFilename: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentShareEntry {
  shareId: string;
  user: PublicUser;
  role: ShareRole;
  createdAt: string;
}

export interface DocumentDetail {
  id: string;
  title: string;
  contentHtml: string;
  owner: PublicUser;
  accessRole: AccessRole;
  sourceFilename: string | null;
  shares: DocumentShareEntry[];
  createdAt: string;
  updatedAt: string;
}

export class DocAccessError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = 'DocAccessError';
  }
}

interface RawDocWithOwner {
  id: string;
  title: string;
  content_html: string;
  source_filename: string | null;
  created_at: string;
  updated_at: string;
  owner_id: string;
  owner_name: string;
  owner_email: string;
  owner_avatar_color: string;
  share_role: ShareRole | null;
  share_count: number;
}

function mapSummary(row: RawDocWithOwner, accessRole: AccessRole): DocumentSummary {
  return {
    id: row.id,
    title: row.title,
    preview: extractPlainTextPreview(row.content_html),
    owner: {
      id: row.owner_id,
      name: row.owner_name,
      email: row.owner_email,
      avatarColor: row.owner_avatar_color,
    },
    accessRole,
    shareCount: row.share_count,
    sourceFilename: row.source_filename,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function listUserDocuments(
  db: Database.Database,
  userId: string
): { owned: DocumentSummary[]; shared: DocumentSummary[] } {
  const ownedRows = db
    .prepare(
      `SELECT d.id, d.title, d.content_html, d.source_filename, d.created_at, d.updated_at,
              u.id AS owner_id, u.name AS owner_name, u.email AS owner_email, u.avatar_color AS owner_avatar_color,
              NULL AS share_role,
              (SELECT COUNT(*) FROM document_shares ds WHERE ds.document_id = d.id) AS share_count
       FROM documents d
       JOIN users u ON u.id = d.owner_id
       WHERE d.owner_id = ?
       ORDER BY d.updated_at DESC`
    )
    .all(userId) as RawDocWithOwner[];

  const sharedRows = db
    .prepare(
      `SELECT d.id, d.title, d.content_html, d.source_filename, d.created_at, d.updated_at,
              u.id AS owner_id, u.name AS owner_name, u.email AS owner_email, u.avatar_color AS owner_avatar_color,
              ds.role AS share_role,
              (SELECT COUNT(*) FROM document_shares ds2 WHERE ds2.document_id = d.id) AS share_count
       FROM document_shares ds
       JOIN documents d ON d.id = ds.document_id
       JOIN users u ON u.id = d.owner_id
       WHERE ds.user_id = ? AND d.owner_id != ?
       ORDER BY d.updated_at DESC`
    )
    .all(userId, userId) as RawDocWithOwner[];

  return {
    owned: ownedRows.map((row) => mapSummary(row, 'owner')),
    shared: sharedRows.map((row) => mapSummary(row, row.share_role || 'viewer')),
  };
}

export function getSharesForDocument(
  db: Database.Database,
  documentId: string
): DocumentShareEntry[] {
  const rows = db
    .prepare(
      `SELECT ds.id AS share_id, ds.role, ds.created_at,
              u.id AS user_id, u.name, u.email, u.avatar_color
       FROM document_shares ds
       JOIN users u ON u.id = ds.user_id
       WHERE ds.document_id = ?
       ORDER BY ds.created_at ASC`
    )
    .all(documentId) as Array<{
    share_id: string;
    role: ShareRole;
    created_at: string;
    user_id: string;
    name: string;
    email: string;
    avatar_color: string;
  }>;

  return rows.map((row) => ({
    shareId: row.share_id,
    role: row.role,
    createdAt: row.created_at,
    user: {
      id: row.user_id,
      name: row.name,
      email: row.email,
      avatarColor: row.avatar_color,
    },
  }));
}

export function resolveAccessRole(
  db: Database.Database,
  documentId: string,
  userId: string
): { ownerId: string; accessRole: AccessRole } {
  const doc = db
    .prepare('SELECT id, owner_id FROM documents WHERE id = ?')
    .get(documentId) as { id: string; owner_id: string } | undefined;

  if (!doc) {
    throw new DocAccessError(404, 'Document not found.');
  }

  if (doc.owner_id === userId) {
    return { ownerId: doc.owner_id, accessRole: 'owner' };
  }

  const share = db
    .prepare('SELECT role FROM document_shares WHERE document_id = ? AND user_id = ?')
    .get(documentId, userId) as { role: ShareRole } | undefined;

  if (!share) {
    throw new DocAccessError(403, 'You do not have access to this document.');
  }

  return { ownerId: doc.owner_id, accessRole: share.role };
}

export function getDocumentForUser(
  db: Database.Database,
  documentId: string,
  userId: string
): DocumentDetail {
  const { accessRole } = resolveAccessRole(db, documentId, userId);

  const row = db
    .prepare(
      `SELECT d.id, d.title, d.content_html, d.source_filename, d.created_at, d.updated_at,
              u.id AS owner_id, u.name AS owner_name, u.email AS owner_email, u.avatar_color AS owner_avatar_color
       FROM documents d
       JOIN users u ON u.id = d.owner_id
       WHERE d.id = ?`
    )
    .get(documentId) as Omit<RawDocWithOwner, 'share_role' | 'share_count'> | undefined;

  if (!row) {
    throw new DocAccessError(404, 'Document not found.');
  }

  return {
    id: row.id,
    title: row.title,
    contentHtml: row.content_html,
    owner: {
      id: row.owner_id,
      name: row.owner_name,
      email: row.owner_email,
      avatarColor: row.owner_avatar_color,
    },
    accessRole,
    sourceFilename: row.source_filename,
    shares: getSharesForDocument(db, documentId),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createDocument(
  db: Database.Database,
  ownerId: string,
  input: { title?: string; contentHtml?: string; sourceFilename?: string | null }
): DocumentDetail {
  const id = `doc-${crypto.randomUUID()}`;
  const now = new Date().toISOString();
  const title = input.title?.trim() || 'Untitled Document';
  const contentHtml = sanitizeRichHtml(input.contentHtml ?? '<p></p>');

  db.prepare(
    `INSERT INTO documents (id, title, content_html, owner_id, source_filename, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(id, title, contentHtml, ownerId, input.sourceFilename ?? null, now, now);

  return getDocumentForUser(db, id, ownerId);
}

export function updateDocument(
  db: Database.Database,
  documentId: string,
  userId: string,
  updates: { title?: string; contentHtml?: string }
): DocumentDetail {
  const { accessRole } = resolveAccessRole(db, documentId, userId);

  if (accessRole === 'viewer') {
    throw new DocAccessError(403, 'Viewers have read-only access and cannot edit this document.');
  }

  const current = db
    .prepare('SELECT title, content_html FROM documents WHERE id = ?')
    .get(documentId) as { title: string; content_html: string } | undefined;

  if (!current) {
    throw new DocAccessError(404, 'Document not found.');
  }

  const nextTitle = updates.title !== undefined ? updates.title.trim() : current.title;
  const nextHtml =
    updates.contentHtml !== undefined ? sanitizeRichHtml(updates.contentHtml) : current.content_html;
  const now = new Date().toISOString();

  db.prepare('UPDATE documents SET title = ?, content_html = ?, updated_at = ? WHERE id = ?').run(
    nextTitle,
    nextHtml,
    now,
    documentId
  );

  return getDocumentForUser(db, documentId, userId);
}

export function deleteDocument(
  db: Database.Database,
  documentId: string,
  userId: string
): void {
  const { accessRole } = resolveAccessRole(db, documentId, userId);
  if (accessRole !== 'owner') {
    throw new DocAccessError(403, 'Only the document owner can delete this document.');
  }

  db.prepare('DELETE FROM documents WHERE id = ?').run(documentId);
}

export function upsertDocumentShare(
  db: Database.Database,
  documentId: string,
  actingUserId: string,
  collaboratorEmail: string,
  role: ShareRole
): DocumentShareEntry[] {
  const { accessRole } = resolveAccessRole(db, documentId, actingUserId);
  if (accessRole !== 'owner') {
    throw new DocAccessError(403, 'Only the document owner can manage sharing.');
  }

  const normalizedEmail = collaboratorEmail.trim().toLowerCase();
  const targetUser = db
    .prepare('SELECT id, name, email, avatar_color FROM users WHERE email = ?')
    .get(normalizedEmail) as
    | { id: string; name: string; email: string; avatar_color: string }
    | undefined;

  if (!targetUser) {
    throw new DocAccessError(
      404,
      `No user found with email "${normalizedEmail}". Try alice@ajaia.test, bob@ajaia.test, or carol@ajaia.test.`
    );
  }

  if (targetUser.id === actingUserId) {
    throw new DocAccessError(400, 'You already own this document.');
  }

  const existing = db
    .prepare('SELECT id FROM document_shares WHERE document_id = ? AND user_id = ?')
    .get(documentId, targetUser.id) as { id: string } | undefined;

  if (existing) {
    db.prepare('UPDATE document_shares SET role = ? WHERE id = ?').run(role, existing.id);
  } else {
    db.prepare(
      `INSERT INTO document_shares (id, document_id, user_id, role, created_at)
       VALUES (?, ?, ?, ?, ?)`
    ).run(`share-${crypto.randomUUID()}`, documentId, targetUser.id, role, new Date().toISOString());
  }

  return getSharesForDocument(db, documentId);
}

export function revokeDocumentShare(
  db: Database.Database,
  documentId: string,
  actingUserId: string,
  targetUserId: string
): DocumentShareEntry[] {
  const { accessRole } = resolveAccessRole(db, documentId, actingUserId);
  if (accessRole !== 'owner') {
    throw new DocAccessError(403, 'Only the document owner can revoke sharing.');
  }

  const result = db
    .prepare('DELETE FROM document_shares WHERE document_id = ? AND user_id = ?')
    .run(documentId, targetUserId);

  if (result.changes === 0) {
    throw new DocAccessError(404, 'Collaborator share not found.');
  }

  return getSharesForDocument(db, documentId);
}
