import { NextRequest, NextResponse } from 'next/server';
import { handleApiError, requireAuthUser } from '@/lib/api-utils';
import { getDb } from '@/lib/db';
import { deleteDocument, getDocumentForUser, updateDocument } from '@/lib/documents';
import { updateDocumentSchema } from '@/lib/validation';

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuthUser();
  if (auth.response) return auth.response;

  try {
    const { id } = await context.params;
    const document = getDocumentForUser(getDb(), id, auth.user.id);
    return NextResponse.json({ document });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuthUser();
  if (auth.response) return auth.response;

  try {
    const { id } = await context.params;
    const body = await req.json();
    const updates = updateDocumentSchema.parse(body);
    const document = updateDocument(getDb(), id, auth.user.id, updates);
    return NextResponse.json({ document });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuthUser();
  if (auth.response) return auth.response;

  try {
    const { id } = await context.params;
    deleteDocument(getDb(), id, auth.user.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
