/**
 * App root — renders AuthPage when unauthenticated, WorkspacePage when authenticated.
 */

import useAuthStore from './store/useAuthStore.js';
import AuthPage from './components/Auth/AuthPage.jsx';
import WorkspacePage from './pages/WorkspacePage.jsx';

export default function App() {
  const token = useAuthStore((s) => s.token);

  if (!token) {
    return <AuthPage />;
  }

  return <WorkspacePage />;
}
