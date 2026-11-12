import { NextRequest, NextResponse } from 'next/server';
import { handleApiError, requireAuthUser } from '@/lib/api-utils';
import { getDb } from '@/lib/db';
import {
  getDocumentForUser,
  revokeDocumentShare,
  upsertDocumentShare,
} from '@/lib/documents';
import { revokeShareSchema, upsertShareSchema } from '@/lib/validation';

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuthUser();
  if (auth.response) return auth.response;

  try {
    const { id } = await context.params;
    const doc = getDocumentForUser(getDb(), id, auth.user.id);
    return NextResponse.json({ shares: doc.shares });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuthUser();
  if (auth.response) return auth.response;

  try {
    const { id } = await context.params;
    const body = await req.json();
    const { email, role } = upsertShareSchema.parse(body);
    const shares = upsertDocumentShare(getDb(), id, auth.user.id, email, role);
    return NextResponse.json({ shares });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuthUser();
  if (auth.response) return auth.response;

  try {
    const { id } = await context.params;
    const body = await req.json();
    const { userId } = revokeShareSchema.parse(body);
    const shares = revokeDocumentShare(getDb(), id, auth.user.id, userId);
    return NextResponse.json({ shares });
  } catch (err) {
    return handleApiError(err);
  }
}
