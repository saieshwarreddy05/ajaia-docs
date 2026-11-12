import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { getCurrentUser, PublicUser } from './auth';
import { DocAccessError } from './documents';
import { FileImportError } from './file-import';

export function jsonError(status: number, error: string, details?: unknown) {
  return NextResponse.json(details ? { error, details } : { error }, { status });
}

export async function requireAuthUser(): Promise<
  { user: PublicUser; response?: never } | { user?: never; response: NextResponse }
> {
  const user = await getCurrentUser();
  if (!user) {
    return { response: jsonError(401, 'Authentication required. Please sign in.') };
  }
  return { user };
}

export function handleApiError(err: unknown) {
  if (err instanceof DocAccessError || err instanceof FileImportError) {
    return jsonError(err.status, err.message);
  }
  if (err instanceof ZodError) {
    const firstIssue = err.issues[0]?.message || 'Invalid request payload.';
    return jsonError(400, firstIssue, err.issues);
  }
  if (err instanceof SyntaxError) {
    return jsonError(400, 'Malformed JSON request body.');
  }
  console.error('Unhandled API error:', err);
  return jsonError(500, 'An unexpected server error occurred.');
}
