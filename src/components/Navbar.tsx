'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Check, ChevronDown, FileText, LogOut, UserPlus } from 'lucide-react';
import type { PublicUser } from '@/lib/auth';

interface NavbarProps {
  currentUser: PublicUser;
  teamUsers?: PublicUser[];
}

const DEMO_EMAILS = new Set(['alice@ajaia.test', 'bob@ajaia.test', 'carol@ajaia.test']);

export function Navbar({ currentUser, teamUsers = [] }: NavbarProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [switchError, setSwitchError] = useState<string | null>(null);

  async function handleQuickSwitch(target: PublicUser) {
    if (target.id === currentUser.id) {
      setMenuOpen(false);
      return;
    }

    if (!DEMO_EMAILS.has(target.email)) {
      setMenuOpen(false);
      router.push(`/login?email=${encodeURIComponent(target.email)}`);
      return;
    }

    setSwitchError(null);
    setSwitchingId(target.id);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: target.email, password: 'ajaia-demo' }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setSwitchError(data.error || 'Could not switch user.');
        return;
      }
      setMenuOpen(false);
      router.refresh();
      window.location.reload();
    } finally {
      setSwitchingId(null);
    }
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  const demoAccounts = teamUsers.filter((u) => DEMO_EMAILS.has(u.email));

  return (
    <header className="no-print sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2.5 text-slate-900 transition hover:opacity-85"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
            <FileText className="h-4 w-4" />
          </span>
          <span className="text-base font-semibold tracking-tight">Ajaia Docs</span>
          <span className="hidden rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 sm:inline-block">
            Workspace
          </span>
        </Link>

        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            className="flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-1.5 pr-3 text-sm font-medium text-slate-700 shadow-xs transition hover:bg-slate-50"
            aria-expanded={menuOpen}
            aria-label="Account switcher"
          >
            <span
              className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold text-white"
              style={{ backgroundColor: currentUser.avatarColor }}
            >
              {currentUser.name.charAt(0).toUpperCase()}
            </span>
            <span className="hidden max-w-[140px] truncate sm:inline">{currentUser.name}</span>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </button>

          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setMenuOpen(false)}
                aria-hidden="true"
              />
              <div className="absolute right-0 z-20 mt-2 w-72 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
                <div className="border-b border-slate-100 px-3 py-2">
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                    Signed in as
                  </p>
                  <p className="mt-0.5 truncate text-sm font-semibold text-slate-900">
                    {currentUser.name}
                  </p>
                  <p className="truncate text-xs text-slate-500">{currentUser.email}</p>
                </div>

                {demoAccounts.length > 0 && (
                  <div className="border-b border-slate-100 py-1.5">
                    <p className="px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-slate-400">
                      Quick Switch Demo User
                    </p>
                    {demoAccounts.map((user) => {
                      const isCurrent = user.id === currentUser.id;
                      return (
                        <button
                          key={user.id}
                          type="button"
                          disabled={switchingId === user.id}
                          onClick={() => handleQuickSwitch(user)}
                          className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition hover:bg-slate-50 disabled:opacity-60"
                        >
                          <div className="flex min-w-0 items-center gap-2.5">
                            <span
                              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                              style={{ backgroundColor: user.avatarColor }}
                            >
                              {user.name.charAt(0).toUpperCase()}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate font-medium text-slate-800">{user.name}</p>
                              <p className="truncate text-xs text-slate-500">{user.email}</p>
                            </div>
                          </div>
                          {isCurrent && <Check className="h-4 w-4 shrink-0 text-blue-600" />}
                        </button>
                      );
                    })}
                  </div>
                )}

                {switchError && (
                  <p className="px-3 py-1.5 text-xs text-red-600">{switchError}</p>
                )}

                <div className="pt-1">
                  <Link
                    href="/login"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
                  >
                    <UserPlus className="h-4 w-4 text-slate-400" />
                    Sign in with another account
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-600 transition hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
