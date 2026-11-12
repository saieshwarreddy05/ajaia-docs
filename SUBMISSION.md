# Submission Checklist — Ajaia LLC AI-Native Full Stack Developer Assignment

**Candidate:** Sai Nandyala (`saiernandyala@gmail.com`)  
**Project:** Ajaia Docs (`ajaia-docs`)

---

## Included Materials

- **Source Code:** `./ajaia-docs/` (Next.js App Router + TipTap + SQLite + Vitest)
- **Setup & Run Guide:** [`README.md`](./README.md)
- **Architecture Note:** [`ARCHITECTURE.md`](./ARCHITECTURE.md)
- **AI-Native Workflow Note:** [`AI_WORKFLOW.md`](./AI_WORKFLOW.md)
- **Walkthrough Video URL:** [`walkthrough-video-url.txt`](./walkthrough-video-url.txt)
- **Deployment Configs:** [`render.yaml`](./render.yaml), [`Dockerfile`](./Dockerfile), [`.env.example`](./.env.example)

---

## Live Deployment & Walkthrough Links

- **GitHub Repository:** https://github.com/saieshwarreddy05/ajaia-docs
- **Live Product URL:** `<ADD_LIVE_DEPLOYMENT_URL_HERE>`
- **Walkthrough Video URL:** https://www.loom.com/share/bcd9cc383fdc465fbd7ed87bfbf41093 *(also saved in `walkthrough-video-url.txt`)*

---

## Seeded Test Accounts (for Reviewing Sharing Flows)

All demo accounts share password **`ajaia-demo`** (and can also be switched with one click from `/login` or the top-right account menu):

- `alice@ajaia.test` — **Alice Chen** (Owns *Q4 Product Launch Brief* and *Engineering Onboarding Notes*)
- `bob@ajaia.test` — **Bob Patel** (Editor on *Q4 Product Launch Brief*; Owns *API Design & Tradeoffs*)
- `carol@ajaia.test` — **Carol Rivera** (Viewer / read-only on *Q4 Product Launch Brief*)

---

## Status Summary

### What Is Working
- Document creation, inline renaming, rich-text editing (Bold, Italic, Underline, Headings H1–H3, Bulleted/Numbered Lists, Blockquote, Code, Undo/Redo), debounced autosave, manual save (`Cmd/Ctrl+S`), and reopening from SQLite.
- File upload for `.txt`, `.md`, and `.docx` (up to 5 MB) both as a new editable document and imported into an existing draft, with server-side validation and HTML sanitization.
- Document sharing with explicit ownership, `Editor` / `Viewer` role management, collaborator revocation, and clear UI separation between **My Documents** and **Shared with me**.
- **Stretch Enhancement:** Export to Markdown (`.md`) and print-ready PDF (`window.print()`).
- Automated Vitest suite covering persistence, RBAC permissions, auth tokens, and file import/sanitization.

### Intentional Scope Cuts / Incomplete
- Real-time simultaneous multi-cursor collaboration (WebSockets/CRDTs) is intentionally omitted in favor of reliable autosave and server-enforced access control.
- Binary file attachments that are not converted into document text (e.g., PDFs or images) are rejected with clear format guidance (`.txt`, `.md`, `.docx` supported).

### What I Would Build Next (2–4 Hours)
1. Optimistic concurrency control (`updatedAt` conflict detection) when multiple editors edit asynchronously.
2. Document version history snapshots with diff preview and one-click restore.
3. Real-time presence and collaborative editing via Yjs + WebSockets.
