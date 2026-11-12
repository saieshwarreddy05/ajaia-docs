# AI-Native Workflow Note

## Tools Used
- **Antigravity Coding Agent (Gemini 3.8 Flash):** Used as an interactive pair-programming partner for scaffolding the Next.js App Router structure, drafting SQLite schema/repository helpers, wiring TipTap toolbar controls, generating automated Vitest tests, and reviewing edge cases.

## Where AI Materially Sped Up Work
1. **End-to-End Vertical Slice Scaffolding:** Quickly generated consistent TypeScript interfaces, Zod schemas, and Next.js API route handlers (`/api/auth/*`, `/api/documents/*`, `/api/documents/[id]/shares`) without manual boilerplate drift.
2. **File Import & Export Pipeline:** Accelerated integration of `mammoth` (`.docx`), `marked` (`.md`), `sanitize-html`, and `turndown` (`.md` export) with uniform error handling (`400`, `413`, `415`).
3. **Automated Test Harness:** Built an in-memory stored-ZIP `.docx` generator inside `tests/file-import.test.ts` so `mammoth` parsing could be verified end-to-end without committing binary fixture files.

## What AI-Generated Output Was Changed or Rejected
1. **Rejected Real-Time WebSocket / CRDT Scope:** Initial ideation considered adding a WebSocket/Yjs server for multi-cursor editing. I deliberately rejected this to protect core reliability, authorization, and UX polish within the 4–6 hour timebox.
2. **Avoided `node:sqlite` in Favor of `better-sqlite3`:** Although Node 26 supports `node:sqlite`, production Node runtimes on PaaS hosts (such as Render or Railway) frequently default to Node 20/22 where `node:sqlite` is missing or experimental. Choosing `better-sqlite3` guarantees consistent behavior locally and in deployment.
3. **Hardened HTML Import/Save Path:** Rather than passing `.docx` or `.md` HTML directly into TipTap or storing raw client HTML, I added a strict `sanitizeRichHtml()` allowlist (`sanitize-html`) on both file import and document save, and verified XSS `<script>` stripping in automated tests.
4. **Fixed TipTap SSR Hydration Behavior:** Configured `useEditor({ immediatelyRender: false })` in `DocumentEditorClient.tsx` so Next.js SSR does not raise hydration mismatches.

## Verification & Quality Checks
- **Automated Tests (`npm test`):** Verified 8 tests across `tests/documents-and-sharing.test.ts` and `tests/file-import.test.ts` covering authentication, signed session tokens, CRUD persistence, RBAC (`Owner` / `Editor` / `Viewer` / unauthorized `403`), `.txt`/`.md`/`.docx` parsing, and XSS sanitization.
- **Static Analysis & Build (`npm run typecheck`, `npm run build`):** Verified zero TypeScript errors and clean production bundling.
- **End-to-End Browser Verification:** Tested creating, renaming, formatting, autosaving, importing `.txt`/`.md`/`.docx` files, exporting Markdown/PDF, and switching between Alice (`Owner`), Bob (`Editor`), and Carol (`Viewer`) in the running app.
