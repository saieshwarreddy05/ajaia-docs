import { redirect } from 'next/navigation';
import { DashboardClient } from '@/components/DashboardClient';
import { getCurrentUser, listAllUsers } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { listUserDocuments } from '@/lib/documents';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const db = getDb();
  const user = await getCurrentUser(db);
  if (!user) {
    redirect('/login');
  }

  const { owned, shared } = listUserDocuments(db, user.id);
  const teamUsers = listAllUsers(db);

  return (
    <DashboardClient
      currentUser={user}
      teamUsers={teamUsers}
      initialOwned={owned}
      initialShared={shared}
    />
  );
}
