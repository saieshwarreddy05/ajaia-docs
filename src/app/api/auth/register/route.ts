import { NextRequest, NextResponse } from 'next/server';
import { handleApiError, jsonError } from '@/lib/api-utils';
import { registerUser, setSessionCookie } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { registerSchema } from '@/lib/validation';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password } = registerSchema.parse(body);

    const result = registerUser(getDb(), name, email, password);
    if (result.error || !result.user) {
      return jsonError(409, result.error || 'Could not register account.');
    }

    await setSessionCookie(result.user.id);
    return NextResponse.json({ user: result.user }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
