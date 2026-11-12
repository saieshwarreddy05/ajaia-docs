import { redirect } from 'next/navigation';
import { LoginClient } from '@/components/LoginClient';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) {
    redirect('/');
  }

  const params = await searchParams;
  return <LoginClient initialEmail={params.email || ''} />;
}
