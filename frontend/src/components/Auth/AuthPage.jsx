/**
 * AuthPage — centered auth card with Login / Register toggle.
 * Handles both flows against the Scholar backend.
 */

import { useState, useCallback } from 'react';
import { post } from '../../api/client.js';
import useAuthStore from '../../store/useAuthStore.js';

/** Spinner SVG used during async operations */
function Spinner() {
  return (
    <svg
      className="animate-spin h-5 w-5 text-white"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v8H4z"
      />
    </svg>
  );
}

/** Scholar brand mark */
function BrandMark() {
  return (
    <div className="flex flex-col items-center gap-3 mb-8">
      {/* Animated brain/star icon */}
      <div
        className="relative w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{
          background: 'linear-gradient(135deg, #3bbffa 0%, #8a95ff 100%)',
          boxShadow: '0 0 40px rgba(59,191,250,0.35)',
        }}
      >
        <svg
          width="36"
          height="36"
          viewBox="0 0 36 36"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          {/* Star burst */}
          <path
            d="M18 4L20.5 14.5L31 12L23.5 19.5L28 30L18 24L8 30L12.5 19.5L5 12L15.5 14.5L18 4Z"
            fill="white"
            fillOpacity="0.95"
          />
          {/* Brain dots */}
          <circle cx="13" cy="18" r="2" fill="white" fillOpacity="0.5" />
          <circle cx="23" cy="18" r="2" fill="white" fillOpacity="0.5" />
          <circle cx="18" cy="22" r="1.5" fill="white" fillOpacity="0.4" />
        </svg>

        {/* Sparkle top-right */}
        <span
          className="absolute -top-1 -right-1 text-yellow-300 text-xs animate-pulse"
          aria-hidden="true"
        >
          ✦
        </span>
      </div>

      <div className="text-center">
        <h1 className="text-3xl font-bold text-on-background tracking-tight">
          Scholar
        </h1>
        <p className="text-on-surface-variant text-sm mt-1">
          Your AI-powered learning workspace
        </p>
      </div>
    </div>
  );
}

export default function AuthPage() {
  const [tab, setTab] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const login = useAuthStore((s) => s.login);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setError(null);
      setLoading(true);

      try {
        let data;
        if (tab === 'login') {
          data = await post('/auth/login', { email, password });
        } else {
          data = await post('/auth/register', { email, password, role });
        }
        login(data.access_token, data.user);
        window.location.hash = '';
      } catch (err) {
        setError(err.message || 'Authentication failed. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    [tab, email, password, role, login]
  );

  const inputClass =
    'w-full px-4 py-3 rounded-xl bg-surface-container-high border border-outline-variant ' +
    'text-on-background placeholder-on-surface-variant ' +
    'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent ' +
    'transition-all duration-200 text-sm';

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background:
          'radial-gradient(ellipse at 50% 0%, rgba(59,191,250,0.12) 0%, #060e20 60%)',
      }}
    >
      {/* Ambient blobs */}
      <div
        className="pointer-events-none fixed top-0 left-1/4 w-96 h-96 rounded-full opacity-20 blur-3xl"
        style={{ background: 'radial-gradient(circle, #3bbffa, transparent)' }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none fixed bottom-0 right-1/4 w-80 h-80 rounded-full opacity-15 blur-3xl"
        style={{ background: 'radial-gradient(circle, #8a95ff, transparent)' }}
        aria-hidden="true"
      />

      <div
        className="relative w-full max-w-md"
        style={{
          background: 'rgba(15,25,48,0.85)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(64,72,93,0.6)',
          borderRadius: '24px',
          boxShadow:
            '0 25px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(59,191,250,0.05)',
        }}
      >
        <div className="p-8">
          <BrandMark />

          {/* Error toast */}
          {error && (
            <div
              className="mb-6 px-4 py-3 rounded-xl text-sm flex items-start gap-2"
              style={{
                background: 'rgba(255,113,108,0.12)',
                border: '1px solid rgba(255,113,108,0.3)',
                color: '#ff716c',
              }}
              role="alert"
            >
              <span className="icon text-lg leading-none flex-shrink-0">
                error
              </span>
              <span>{error}</span>
            </div>
          )}

          {/* Tab switcher */}
          <div
            className="flex rounded-xl p-1 mb-6"
            style={{ background: 'rgba(20,31,56,0.8)' }}
          >
            {['login', 'register'].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setTab(t);
                  setError(null);
                }}
                className={
                  'flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-200 ' +
                  (tab === t
                    ? 'bg-surface-container-high text-on-background shadow-sm'
                    : 'text-on-surface-variant hover:text-on-background')
                }
              >
                {t === 'login' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Email */}
            <div>
              <label
                htmlFor="auth-email"
                className="block text-xs font-medium text-on-surface-variant mb-1.5 uppercase tracking-wider"
              >
                Email
              </label>
              <input
                id="auth-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={inputClass}
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="auth-password"
                className="block text-xs font-medium text-on-surface-variant mb-1.5 uppercase tracking-wider"
              >
                Password
              </label>
              <input
                id="auth-password"
                type="password"
                autoComplete={
                  tab === 'login' ? 'current-password' : 'new-password'
                }
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={inputClass}
              />
            </div>

            {/* Role selector — register only */}
            {tab === 'register' && (
              <div>
                <label
                  htmlFor="auth-role"
                  className="block text-xs font-medium text-on-surface-variant mb-1.5 uppercase tracking-wider"
                >
                  Role
                </label>
                <select
                  id="auth-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className={inputClass + ' cursor-pointer'}
                  style={{ background: '#141f38' }}
                >
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                </select>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className={
                'w-full py-3 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 ' +
                'transition-all duration-200 mt-2 ' +
                (loading
                  ? 'opacity-70 cursor-not-allowed'
                  : 'hover:brightness-110 active:scale-[0.98]')
              }
              style={{
                background: 'linear-gradient(135deg, #3bbffa 0%, #8a95ff 100%)',
                color: '#fff',
                boxShadow: loading
                  ? 'none'
                  : '0 4px 20px rgba(59,191,250,0.35)',
              }}
            >
              {loading ? (
                <>
                  <Spinner />
                  <span>
                    {tab === 'login' ? 'Signing in…' : 'Creating account…'}
                  </span>
                </>
              ) : (
                <span>{tab === 'login' ? 'Sign In' : 'Create Account'}</span>
              )}
            </button>
          </form>

          {/* Bypass / demo login */}
          <button
            type="button"
            onClick={() => {
              login('demo_token', {
                id: 'demo',
                email: 'demo@scholar.local',
                role: 'student',
                created_at: new Date().toISOString(),
              });
              window.location.hash = '';
            }}
            className="w-full mt-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 hover:brightness-110 active:scale-[0.98]"
            style={{
              background: 'rgba(59,191,250,0.08)',
              border: '1px solid rgba(59,191,250,0.25)',
              color: '#3bbffa',
            }}
          >
            Continue as Guest (Demo)
          </button>

          {/* Footer toggle hint */}
          <p className="text-center text-xs text-on-surface-variant mt-6">
            {tab === 'login' ? "Don't have an account? " : 'Already a member? '}
            <button
              type="button"
              onClick={() => {
                setTab(tab === 'login' ? 'register' : 'login');
                setError(null);
              }}
              className="text-primary hover:underline font-medium"
            >
              {tab === 'login' ? 'Register' : 'Sign In'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
