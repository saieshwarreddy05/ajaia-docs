import { NextRequest, NextResponse } from 'next/server';
import { handleApiError, jsonError } from '@/lib/api-utils';
import { authenticateUser, setSessionCookie } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { loginSchema } from '@/lib/validation';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = loginSchema.parse(body);

    const user = authenticateUser(getDb(), email, password);
    if (!user) {
      return jsonError(401, 'Invalid email or password.');
    }

    await setSessionCookie(user.id);
    return NextResponse.json({ user });
  } catch (err) {
    return handleApiError(err);
  }
}
