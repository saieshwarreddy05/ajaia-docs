import { NextRequest, NextResponse } from 'next/server';
import { handleApiError, jsonError, requireAuthUser } from '@/lib/api-utils';
import { getDb } from '@/lib/db';
import { createDocument, getDocumentForUser, updateDocument } from '@/lib/documents';
import { parseImportedFile } from '@/lib/file-import';

export async function POST(req: NextRequest) {
  const auth = await requireAuthUser();
  if (auth.response) return auth.response;

  try {
    const formData = await req.formData();
    const file = formData.get('file');
    const targetDocId = formData.get('documentId');

    if (!(file instanceof File)) {
      return jsonError(400, 'Please select a .txt, .md, or .docx file to upload.');
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const parsed = await parseImportedFile(file.name, buffer);

    const db = getDb();

    // If documentId is specified, import/append into the existing draft (owner/editor only)
    if (typeof targetDocId === 'string' && targetDocId.trim()) {
      const existing = getDocumentForUser(db, targetDocId.trim(), auth.user.id);
      const separator =
        existing.contentHtml.trim() && existing.contentHtml.trim() !== '<p></p>' ? '<hr />' : '';
      const combined = `${existing.contentHtml}${separator}${parsed.contentHtml}`;
      const updated = updateDocument(db, existing.id, auth.user.id, {
        contentHtml: combined,
      });
      return NextResponse.json({ document: updated, mode: 'appended' }, { status: 200 });
    }

    // Otherwise create a brand new editable document from the uploaded file
    const created = createDocument(db, auth.user.id, {
      title: parsed.title,
      contentHtml: parsed.contentHtml,
      sourceFilename: file.name,
    });

    return NextResponse.json({ document: created, mode: 'created' }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
