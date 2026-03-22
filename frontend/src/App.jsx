/**
 * App root — renders AuthPage or WorkspacePage with a minimal logged-out entry.
 */

import { useState, useEffect } from 'react';
import useAuthStore from './store/useAuthStore.js';
import AuthPage from './components/Auth/AuthPage.jsx';
import WorkspacePage from './pages/WorkspacePage.jsx';

export default function App() {
  const token = useAuthStore((s) => s.token);
  const [route, setRoute] = useState(window.location.hash);

  useEffect(() => {
    const onHashChange = () => setRoute(window.location.hash);
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  if (!token) {
    if (route === '#login') {
      return <AuthPage />;
    }
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background:
            'radial-gradient(circle at top, rgba(59,191,250,0.14) 0%, rgba(8,8,11,1) 42%), linear-gradient(160deg, #08080b 0%, #060608 50%, #07070a 100%)',
          padding: '24px',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '460px',
            borderRadius: '28px',
            padding: '40px 32px',
            background: 'rgba(12,18,30,0.82)',
            border: '1px solid rgba(138,149,255,0.18)',
            boxShadow: '0 30px 80px rgba(0,0,0,0.45), 0 0 0 1px rgba(59,191,250,0.06)',
            backdropFilter: 'blur(18px)',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '68px',
              height: '68px',
              margin: '0 auto 18px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, #3bbffa 0%, #8a95ff 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 18px 40px rgba(59,191,250,0.28)',
              color: '#fff',
              fontSize: '28px',
              fontWeight: 800,
            }}
          >
            S
          </div>

          <h1
            style={{
              margin: '0 0 10px',
              color: '#F4F7FB',
              fontSize: '32px',
              fontWeight: 800,
              letterSpacing: '-0.03em',
            }}
          >
            Scholar
          </h1>

          <p
            style={{
              margin: '0 0 28px',
              color: '#A7B0C0',
              fontSize: '15px',
              lineHeight: 1.6,
            }}
          >
            Your AI learning workspace for guided explanations, visual whiteboards,
            and hands-on problem solving.
          </p>

          <button
            onClick={() => {
              window.location.hash = 'login';
            }}
            style={{
              background: 'linear-gradient(135deg, #3bbffa 0%, #8a95ff 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: '14px',
              padding: '14px 24px',
              fontSize: '15px',
              fontWeight: 700,
              cursor: 'pointer',
              minWidth: '160px',
              boxShadow: '0 14px 36px rgba(59,191,250,0.28)',
            }}
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return <WorkspacePage />;
}
