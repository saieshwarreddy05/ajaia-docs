'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowRight, FileText, Loader2 } from 'lucide-react';

interface LoginClientProps {
  initialEmail?: string;
}

const DEMO_USERS = [
  {
    name: 'Alice Chen',
    email: 'alice@ajaia.test',
    roleHint: 'Owns launch brief & onboarding notes',
    color: '#2563eb',
  },
  {
    name: 'Bob Patel',
    email: 'bob@ajaia.test',
    roleHint: 'Editor on launch brief · Owns API spec',
    color: '#059669',
  },
  {
    name: 'Carol Rivera',
    email: 'carol@ajaia.test',
    roleHint: 'Viewer (read-only) on launch brief',
    color: '#7c3aed',
  },
];

export function LoginClient({ initialEmail = '' }: LoginClientProps) {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoLoadingEmail, setDemoLoadingEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDemoLogin(demoEmail: string) {
    setError(null);
    setDemoLoadingEmail(demoEmail);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: demoEmail, password: 'ajaia-demo' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Could not sign in.');
        return;
      }
      router.push('/');
      router.refresh();
    } catch {
      setError('Network error while signing in.');
    } finally {
      setDemoLoadingEmail(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const payload = mode === 'login' ? { email, password } : { name, email, password };
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Authentication failed.');
        return;
      }
      router.push('/');
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-4xl">
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm">
            <FileText className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900">Ajaia Docs</h1>
          <p className="mt-1.5 text-sm text-slate-600">
            Lightweight collaborative document editor with rich text, file import, and role-based sharing.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Quick Demo Accounts */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
            <h2 className="text-base font-semibold text-slate-900">Quick Demo Access</h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              Sign in as a seeded team member with one click (password:{' '}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-700">ajaia-demo</code>
              ) to test document ownership and sharing permissions immediately.
            </p>

            <div className="mt-4 space-y-2.5">
              {DEMO_USERS.map((u) => (
                <button
                  key={u.email}
                  type="button"
                  disabled={demoLoadingEmail !== null || loading}
                  onClick={() => void handleDemoLogin(u.email)}
                  className="flex w-full items-center justify-between rounded-xl border border-slate-200 p-3 text-left transition hover:border-blue-300 hover:bg-blue-50/40 disabled:opacity-60"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
                      style={{ backgroundColor: u.color }}
                    >
                      {u.name.charAt(0)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{u.name}</p>
                      <p className="truncate text-xs text-slate-500">{u.email}</p>
                      <p className="mt-0.5 truncate text-[11px] text-slate-400">{u.roleHint}</p>
                    </div>
                  </div>
                  {demoLoadingEmail === u.email ? (
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin text-blue-600" />
                  ) : (
                    <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Standard Sign In / Create Account */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
            <div className="flex rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError(null);
                }}
                className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition ${
                  mode === 'login' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setError(null);
                }}
                className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition ${
                  mode === 'register' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                }`}
              >
                Create Account
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              {mode === 'register' && (
                <div>
                  <label htmlFor="auth-name" className="block text-xs font-medium text-slate-700">
                    Full Name
                  </label>
                  <input
                    id="auth-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Alex Morgan"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              )}

              <div>
                <label htmlFor="auth-email" className="block text-xs font-medium text-slate-700">
                  Email Address
                </label>
                <input
                  id="auth-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@ajaia.test"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label htmlFor="auth-password" className="block text-xs font-medium text-slate-700">
                  Password
                </label>
                <input
                  id="auth-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'register' ? 'At least 6 characters' : 'Enter password'}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || demoLoadingEmail !== null}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {mode === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
