import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

export interface DbUser {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  avatar_color: string;
  created_at: string;
}

export interface DbDocument {
  id: string;
  title: string;
  content_html: string;
  owner_id: string;
  source_filename: string | null;
  created_at: string;
  updated_at: string;
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, keyHex] = storedHash.split(':');
  if (!salt || !keyHex) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  const keyBuf = Buffer.from(keyHex, 'hex');
  if (derived.length !== keyBuf.length) return false;
  return crypto.timingSafeEqual(derived, keyBuf);
}

export function initializeSchema(db: Database.Database): void {
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      avatar_color TEXT NOT NULL DEFAULT '#2563eb',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content_html TEXT NOT NULL DEFAULT '<p></p>',
      owner_id TEXT NOT NULL,
      source_filename TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS document_shares (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('viewer', 'editor')),
      created_at TEXT NOT NULL,
      UNIQUE (document_id, user_id),
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_documents_owner ON documents(owner_id);
    CREATE INDEX IF NOT EXISTS idx_shares_doc ON document_shares(document_id);
    CREATE INDEX IF NOT EXISTS idx_shares_user ON document_shares(user_id);
  `);
}

export const DEMO_PASSWORD = 'ajaia-demo';

export function seedDatabase(db: Database.Database): void {
  const countRow = db.prepare('SELECT COUNT(*) AS count FROM users').get() as { count: number };
  if (countRow.count > 0) return;

  const now = new Date().toISOString();
  const demoHash = hashPassword(DEMO_PASSWORD);

  const insertUser = db.prepare(`
    INSERT INTO users (id, name, email, password_hash, avatar_color, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertDoc = db.prepare(`
    INSERT INTO documents (id, title, content_html, owner_id, source_filename, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertShare = db.prepare(`
    INSERT INTO document_shares (id, document_id, user_id, role, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  const seedTx = db.transaction(() => {
    insertUser.run('user-alice', 'Alice Chen', 'alice@ajaia.test', demoHash, '#2563eb', now);
    insertUser.run('user-bob', 'Bob Patel', 'bob@ajaia.test', demoHash, '#059669', now);
    insertUser.run('user-carol', 'Carol Rivera', 'carol@ajaia.test', demoHash, '#7c3aed', now);

    insertDoc.run(
      'doc-launch-brief',
      'Q4 Product Launch Brief',
      `<h1>Q4 Product Launch Brief</h1><p>Welcome to <strong>Ajaia Docs</strong> — a focused collaborative workspace built for fast team alignment.</p><h2>Key Objectives</h2><ul><li>Ship a reliable rich-text editor with <strong>bold</strong>, <em>italic</em>, <u>underline</u>, headings, and lists.</li><li>Support importing existing <code>.txt</code>, <code>.md</code>, and <code>.docx</code> drafts directly into editable pages.</li><li>Keep ownership and sharing permissions explicit between <strong>Owners</strong>, <strong>Editors</strong>, and <strong>Viewers</strong>.</li></ul><h2>Launch Checklist</h2><ol><li>Finalize onboarding copy with design</li><li>Verify file upload sanitization and persistence</li><li>Share rollout notes with team stakeholders</li></ol>`,
      'user-alice',
      null,
      now,
      now
    );

    insertDoc.run(
      'doc-onboarding',
      'Engineering Onboarding Notes',
      `<h1>Engineering Onboarding Notes</h1><p>Use this private draft to organize first-week setup tasks, architecture links, and team contacts.</p><ul><li>Clone repository and run <code>npm install</code></li><li>Review <em>ARCHITECTURE.md</em> for data model decisions</li><li>Try importing a <code>.docx</code> or <code>.md</code> spec from the dashboard</li></ul>`,
      'user-alice',
      null,
      now,
      now
    );

    insertDoc.run(
      'doc-api-spec',
      'API Design & Tradeoffs',
      `<h1>API Design &amp; Tradeoffs</h1><p>Prepared by <strong>Bob Patel</strong> and shared with Alice for collaborative editing.</p><h2>Access Control Model</h2><ul><li><strong>Owner</strong>: full read, write, share management, and delete rights.</li><li><strong>Editor</strong>: can edit title and rich-text body, plus export to Markdown or PDF.</li><li><strong>Viewer</strong>: read-only access with export support.</li></ul>`,
      'user-bob',
      null,
      now,
      now
    );

    insertShare.run('share-1', 'doc-launch-brief', 'user-bob', 'editor', now);
    insertShare.run('share-2', 'doc-launch-brief', 'user-carol', 'viewer', now);
    insertShare.run('share-3', 'doc-api-spec', 'user-alice', 'editor', now);
  });

  seedTx();
}

export function createDatabase(dbPath: string, seed = true): Database.Database {
  if (dbPath !== ':memory:') {
    const dir = path.dirname(dbPath);
    fs.mkdirSync(dir, { recursive: true });
  }
  const db = new Database(dbPath);
  initializeSchema(db);
  if (seed) {
    seedDatabase(db);
  }
  return db;
}

declare global {
  var __ajaiaDb: Database.Database | undefined;
}

export function getDb(): Database.Database {
  if (!globalThis.__ajaiaDb) {
    const dbPath =
      process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'ajaia-docs.db');
    globalThis.__ajaiaDb = createDatabase(dbPath, true);
  }
  return globalThis.__ajaiaDb;
}
