# Architecture Note — Ajaia Docs

## 1. Product Goal & Prioritization

The goal was to ship a coherent, reliable collaborative document slice within a 4–6 hour timebox rather than a shallow clone of every Google Docs feature. I prioritized four core pillars:

1. **Responsive Rich-Text Editing:** Using TipTap (ProseMirror) rather than raw `contentEditable` ensures predictable selection, list nesting, undo/redo history, and clean HTML serialization across browsers.
2. **Trustworthy Persistence & Authorization:** Every document mutation, share change, and read check is enforced server-side against SQLite, not just hidden in the UI.
3. **Practical File Import & Export:** Supporting `.txt`, `.md`, and `.docx` imports gives users a real productivity entry point, paired with Markdown (`.md`) and print-ready PDF export.
4. **Zero-Friction Evaluation:** Seeded demo users with a top-bar account switcher let reviewers verify `Owner` vs. `Editor` vs. `Viewer` sharing flows in seconds while still backing sessions with signed `httpOnly` cookies and `scrypt` password hashes.

---

## 2. System Architecture

```
Browser (Next.js App Router + TipTap React Editor)
  ├── /login                -> Quick demo login + email/password sign-in & registration
  ├── /                     -> Dashboard ("My Documents" vs. "Shared with me", search, upload)
  └── /docs/[id]            -> Rich-text editor, autosave, import-into-draft, share modal, export
        │
        ▼ (JSON / Multipart FormData over HTTP)
Next.js Route Handlers (/api/*)
  ├── /api/auth/*           -> Signed HMAC-SHA256 httpOnly session cookie (scrypt passwords)
  ├── /api/documents/*      -> Zod validation + HTML sanitization + RBAC authorization
  ├── /api/documents/import -> Parses .txt, .md (marked), .docx (mammoth) -> sanitized HTML
  └── /api/documents/[id]/export -> Turndown HTML -> Markdown download
        │
        ▼
SQLite (better-sqlite3, WAL mode, foreign keys enabled)
  ├── users
  ├── documents
  └── document_shares (role IN ('viewer', 'editor'))
```

---

## 3. Data Model & Access Control

- **`users`**: `id`, `name`, `email` (unique), `password_hash` (`scrypt` salt:hash), `avatar_color`, `created_at`.
- **`documents`**: `id`, `title`, `content_html`, `owner_id` (FK -> `users.id`), `source_filename`, `created_at`, `updated_at`.
- **`document_shares`**: `id`, `document_id` (FK -> `documents.id`), `user_id` (FK -> `users.id`), `role` (`'viewer' | 'editor'`), unique `(document_id, user_id)`.

### Authorization Rules (`src/lib/documents.ts`)

| Action | Owner | Editor | Viewer | Non-shared User |
| :--- | :---: | :---: | :---: | :---: |
| View & Export Document | Yes | Yes | Yes | `403` |
| Edit Title & Rich-Text Body / Import into Draft | Yes | Yes | `403` | `403` |
| Grant / Update / Revoke Shares | Yes | `403` | `403` | `403` |
| Delete Document | Yes | `403` | `403` | `403` |

---

## 4. Key Tradeoffs & Deliberate Cuts

- **SQLite (`better-sqlite3`) vs. External Postgres/Supabase:** SQLite makes local setup zero-config (`npm install && npm run dev`) and works reliably on persistent Node hosts (Render/Railway). The tradeoff is single-node write serialization; migrating `src/lib/documents.ts` to Postgres/Drizzle is straightforward because all SQL queries are isolated in `src/lib/`.
- **Debounced Autosave + Explicit Save vs. Real-Time CRDTs (Yjs):** Real-time multi-cursor editing via WebSockets/CRDTs adds significant infrastructure and conflict-state complexity. Debounced autosave (900ms) plus `Cmd/Ctrl+S` covers single-editor and asynchronous team workflows cleanly within the timebox.
- **Sanitized HTML vs. TipTap JSON Storage:** Storing sanitized HTML (`sanitize-html`) allows unified rendering across TipTap edits, `.docx`/`.md` imports, and `.md` export (`turndown`) with strong XSS protection.

---

## 5. Next Steps (With 2–4 More Hours)

1. **Optimistic Concurrency Control:** Send `expectedUpdatedAt` on `PATCH /api/documents/[id]` and return `409 Conflict` if another collaborator saved newer edits.
2. **Document Version History:** Snapshot `documents.content_html` on major saves into a `document_versions` table with one-click restore.
3. **Live Presence & Real-Time Sync:** Add a Yjs WebSocket provider (e.g., Hocuspocus) for live multi-cursor collaboration.
