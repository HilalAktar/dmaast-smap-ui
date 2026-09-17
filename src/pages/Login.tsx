import { useState, FormEvent } from 'react';
import { LogIn, AlertCircle, Info } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const result = login(username, password);
    if (!result.ok) {
      setError(result.error ?? 'Sign-in failed.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-50 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center">
          <img src="/dmaast_logo.png" alt="SMAP" className="w-14 h-14" />
          <h1 className="mt-4 text-2xl font-semibold text-surface-900">SMAP</h1>
          <p className="mt-1 text-sm text-surface-500">DMaaST Platform</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-8 rounded-xl border border-surface-200 bg-white p-6 shadow-card"
        >
          <label className="block">
            <span className="text-sm font-medium text-surface-700">User name</span>
            <input
              type="text"
              value={username}
              autoFocus
              autoComplete="username"
              onChange={(e) => {
                setUsername(e.target.value);
                setError(null);
              }}
              className="mt-1.5 w-full rounded-lg border border-surface-300 bg-white px-3 py-2 text-sm text-surface-900 placeholder-surface-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="e.g. kam.manager"
            />
          </label>

          <label className="mt-4 block">
            <span className="text-sm font-medium text-surface-700">Password</span>
            <input
              type="password"
              value={password}
              autoComplete="current-password"
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
              }}
              className="mt-1.5 w-full rounded-lg border border-surface-300 bg-white px-3 py-2 text-sm text-surface-900 placeholder-surface-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="••••••••"
            />
          </label>

          {error && (
            <div
              role="alert"
              className="mt-4 flex items-start gap-2 rounded-lg border border-alert-critical/30 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-primary-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            <LogIn className="h-4 w-4" />
            Sign in
          </button>

          <button
            type="button"
            onClick={() => setShowHint((v) => !v)}
            className="mt-4 w-full text-center text-xs text-surface-500 underline-offset-2 hover:text-surface-700 hover:underline"
          >
            {showHint ? 'Hide demo accounts' : 'Show demo accounts'}
          </button>

          {showHint && (
            <div className="mt-3 rounded-lg bg-surface-50 px-3 py-2.5 text-xs leading-relaxed text-surface-600">
              <p className="font-medium text-surface-700">KAM use case</p>
              <p className="font-mono">kam.manager · kam.engineer · kam.operator — demo1234</p>
              <p className="font-mono">kam.admin — admin1234</p>
              <p className="mt-2 font-medium text-surface-700">JPB use case</p>
              <p className="font-mono">jpb.manager · jpb.engineer · jpb.operator — demo1234</p>
              <p className="font-mono">jpb.admin — admin1234</p>
            </div>
          )}
        </form>

        <div className="mt-4 flex items-start gap-2 rounded-lg border border-surface-200 bg-white px-3 py-2.5 text-xs leading-relaxed text-surface-500">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            <span className="font-semibold text-surface-600">Demo authentication.</span> This
            prototype has no backend. Accounts are stored in the browser only and are not
            secured — sign-in exists to demonstrate role- and use-case-based views.
          </span>
        </div>
      </div>
    </div>
  );
}
