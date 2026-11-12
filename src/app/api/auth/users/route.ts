import { NextResponse } from 'next/server';
import { requireAuthUser } from '@/lib/api-utils';
import { listAllUsers } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET() {
  const auth = await requireAuthUser();
  if (auth.response) return auth.response;

  const users = listAllUsers(getDb());
  return NextResponse.json({ users });
}
