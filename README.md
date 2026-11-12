# Ajaia Docs — Lightweight Collaborative Document Editor

A focused, full-stack collaborative document workspace built with **Next.js (App Router)**, **TipTap (ProseMirror)**, **SQLite (`better-sqlite3`)**, and **Tailwind CSS**.

Built by **Sai Nandyala** (`saiernandyala@gmail.com`) for the Ajaia LLC AI-Native Full Stack Developer Assignment.

---

## Core Capabilities

1. **Document Creation & Rich-Text Editing**
   - Create new documents, rename documents inline (from both the dashboard and editor header), and delete owned documents.
   - Rich-text editing powered by TipTap: **Bold**, **Italic**, **Underline**, **Strikethrough**, **Inline Code**, **Normal / H1 / H2 / H3**, **Bulleted & Numbered Lists**, **Blockquotes**, and **Undo / Redo**.
   - Debounced auto-save (~900ms), manual **Save** button (`Cmd/Ctrl + S`), live save status indicator, and word/character count.

2. **File Upload & Import**
   - Upload **`.txt`**, **`.md`**, or **`.docx`** files (up to **5 MB**) via drag-and-drop or file picker.
   - **Dashboard Upload:** Converts the uploaded file into a brand-new editable document while preserving headings, lists, bold/italic formatting, and paragraphs.
   - **In-Editor Import:** Appends formatted content from a `.txt`, `.md`, or `.docx` file directly into the active draft.
   - All imported HTML is sanitized server-side with `sanitize-html` to prevent XSS.
   - *Supported file types:* `.txt`, `.md`, and `.docx` only (enforced in both UI and server API with clear error messages for unsupported, empty, or oversized files).

3. **Sharing & Access Control**
   - Explicit ownership (`Owner`) and collaborator roles (`Editor` and `Viewer`).
   - Dashboard clearly separates **My Documents** from **Shared with me** with owner/role badges.
   - Share modal lets owners grant access by email (with quick-select chips for workspace teammates), update roles between `Editor` and `Viewer`, or revoke access.
   - **Viewer** access enforces read-only mode in the editor UI and `403` protection on write/delete/share API endpoints.

4. **Persistence & Export (Stretch)**
   - SQLite persistence via `better-sqlite3` (`./data/ajaia-docs.db` locally, or configurable via `DATABASE_PATH`).
   - Automatic schema initialization and idempotent seeding on first boot.
   - **Export to Markdown (`.md`)** via `turndown` and **Print / Save as PDF** with dedicated `@media print` styling.

---

## Seeded Test Accounts

All seeded demo accounts use the password **`ajaia-demo`** and can also be switched with one click from the login screen or the top-right account menu:

| Name | Email | Password | Seeded Documents / Access |
| :--- | :--- | :--- | :--- |
| **Alice Chen** | `alice@ajaia.test` | `ajaia-demo` | Owns *Q4 Product Launch Brief* (shared) & *Engineering Onboarding Notes* (private); Editor on *API Design & Tradeoffs* |
| **Bob Patel** | `bob@ajaia.test` | `ajaia-demo` | Owns *API Design & Tradeoffs*; Editor on *Q4 Product Launch Brief* |
| **Carol Rivera** | `carol@ajaia.test` | `ajaia-demo` | Viewer (read-only) on *Q4 Product Launch Brief* |

You can also create new accounts via the **Create Account** tab on `/login`.

---

## Local Setup & Run Instructions

### Prerequisites
- **Node.js >= 20** (tested on Node 26)
- **npm**

### Steps

```bash
# 1. Install dependencies
npm install

# 2. (Optional) Configure environment variables
cp .env.example .env

# 3. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). On first request, SQLite automatically initializes `./data/ajaia-docs.db` and seeds the demo users and sample documents.

### Running Tests & Production Build

```bash
# Run automated unit & integration tests (Vitest)
npm test

# Run TypeScript typechecking
npm run typecheck

# Build and start production server
npm run build
npm start
```

---

## Deployment (Render / Railway / Docker)

The app is ready to deploy as a persistent Node service with SQLite:

- **Render:** Included [`render.yaml`](./render.yaml) configures a Node web service with a persistent disk mounted at `/var/data`, `DATABASE_PATH=/var/data/ajaia-docs.db`, healthcheck `/api/health`, and auto-generated `SESSION_SECRET`.
- **Railway / Docker:** Included [`Dockerfile`](./Dockerfile) builds the production Next.js bundle and stores SQLite at `DATABASE_PATH` (mount a volume at `/var/data`).
- **Environment variables:**
  - `DATABASE_PATH` — path to SQLite DB file (defaults to `./data/ajaia-docs.db`)
  - `SESSION_SECRET` — strong random string used to sign `httpOnly` session cookies

---

## Scope & Next Steps

- **What is working end-to-end:** Auth + quick demo user switching, document creation/rename/edit/save/reopen/delete, rich-text formatting (bold, italic, underline, headings, lists, blockquote, code, undo/redo), `.txt`/`.md`/`.docx` import (new doc or append to draft), role-based sharing (`Owner`, `Editor`, `Viewer`) with revocation, SQLite persistence, Markdown download, and print-ready PDF export.
- **Intentional scope cuts:** No WebSocket/CRDT simultaneous multi-cursor editing, no comment threads, and no binary attachment storage outside parsed document imports.
- **Next with 2–4 more hours:** Document version history snapshots with diff/restore, optimistic concurrency control (`updatedAt` conflict check) when two editors edit simultaneously, and real-time presence / collaborative editing via Yjs + WebSockets.
