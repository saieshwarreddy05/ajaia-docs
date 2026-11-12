import { NextRequest, NextResponse } from 'next/server';
import { handleApiError, requireAuthUser } from '@/lib/api-utils';
import { getDb } from '@/lib/db';
import { createDocument, listUserDocuments } from '@/lib/documents';
import { createDocumentSchema } from '@/lib/validation';

export async function GET() {
  const auth = await requireAuthUser();
  if (auth.response) return auth.response;

  const docs = listUserDocuments(getDb(), auth.user.id);
  return NextResponse.json(docs);
}

export async function POST(req: NextRequest) {
  const auth = await requireAuthUser();
  if (auth.response) return auth.response;

  try {
    const body = await req.json().catch(() => ({}));
    const input = createDocumentSchema.parse(body);
    const doc = createDocument(getDb(), auth.user.id, input);
    return NextResponse.json({ document: doc }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
