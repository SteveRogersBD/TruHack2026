/**
 * Sidebar — session list, new-session form, user info, logout.
 * 240px wide, full viewport height.
 */

import { useState, useEffect, useCallback } from 'react';
import { get, post, del } from '../../api/client.js';
import useAuthStore from '../../store/useAuthStore.js';
import useWorkspaceStore from '../../store/useWorkspaceStore.js';
import { extractStructuredFromMessages } from '../../utils/structured.js';

/** Compact spinner */
function MiniSpinner() {
  return (
    <svg
      className="animate-spin h-4 w-4 text-primary"
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

/** Single session row in the sidebar list */
function SessionItem({ session, isActive, onSelect, onDelete }) {
  const [hovered, setHovered] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete(e) {
    e.stopPropagation();
    if (!window.confirm(`Delete "${session.title}"?`)) return;
    setDeleting(true);
    try {
      await onDelete(session.id);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(session)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={
        'w-full text-left px-3 py-2.5 rounded-xl transition-all duration-200 group relative ' +
        (isActive
          ? 'bg-primary/15 border border-primary/30'
          : 'hover:bg-surface-container-high border border-transparent')
      }
      aria-current={isActive ? 'true' : undefined}
    >
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0 flex-1">
          <p
            className={
              'text-sm font-medium truncate ' +
              (isActive ? 'text-primary' : 'text-on-background')
            }
          >
            {session.title || 'Untitled Session'}
          </p>
          {session.learning_goal && (
            <p className="text-xs text-on-surface-variant truncate mt-0.5">
              {session.learning_goal}
            </p>
          )}
        </div>

        {/* Delete button — visible on hover or active */}
        {(hovered || isActive) && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="flex-shrink-0 p-1 rounded-lg hover:bg-error/20 text-on-surface-variant hover:text-error transition-all duration-150"
            aria-label={`Delete session ${session.title}`}
          >
            {deleting ? (
              <MiniSpinner />
            ) : (
              <span className="icon text-base leading-none">delete</span>
            )}
          </button>
        )}
      </div>
    </button>
  );
}

/** Inline new-session form */
function NewSessionForm({ onCancel, onCreate }) {
  const [title, setTitle] = useState('');
  const [goal, setGoal] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleCreate(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await post('/sessions', {
        title: title.trim() || 'New Session',
        learning_goal: goal.trim() || undefined,
      });
      await onCreate(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    'w-full px-3 py-2 rounded-lg bg-surface-container-high border border-outline-variant ' +
    'text-on-background placeholder-on-surface-variant text-xs ' +
    'focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all duration-150';

  return (
    <form
      onSubmit={handleCreate}
      className="mx-2 mb-2 p-3 rounded-xl border border-outline-variant"
      style={{ background: 'rgba(20,31,56,0.9)' }}
    >
      <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">
        New Session
      </p>

      {error && (
        <p className="text-xs text-error mb-2">{error}</p>
      )}

      <div className="space-y-2">
        <input
          type="text"
          placeholder="Session title…"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={inputClass}
          autoFocus
        />
        <input
          type="text"
          placeholder="Learning goal (optional)…"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          className={inputClass}
        />
      </div>

      <div className="flex gap-2 mt-3">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 py-1.5 rounded-lg text-xs font-semibold text-white transition-all duration-150 flex items-center justify-center gap-1 disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, #3bbffa, #8a95ff)' }}
        >
          {loading ? <MiniSpinner /> : null}
          {loading ? 'Creating…' : 'Create'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 rounded-lg text-xs text-on-surface-variant hover:text-on-background hover:bg-surface-container-high transition-all duration-150"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function Sidebar() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const sessions = useWorkspaceStore((s) => s.sessions);
  const currentSession = useWorkspaceStore((s) => s.currentSession);
  const setSessions = useWorkspaceStore((s) => s.setSessions);
  const setCurrentSession = useWorkspaceStore((s) => s.setCurrentSession);
  const setMessages = useWorkspaceStore((s) => s.setMessages);
  const setStructured = useWorkspaceStore((s) => s.setStructured);
  const setLoading = useWorkspaceStore((s) => s.setLoading);
  const addMessage = useWorkspaceStore((s) => s.addMessage);
  const setSessionMode = useWorkspaceStore((s) => s.setSessionMode);

  const [showNewForm, setShowNewForm] = useState(false);
  const [listLoading, setListLoading] = useState(false);

  /** Fetches all sessions from the API */
  const loadSessions = useCallback(async () => {
    setListLoading(true);
    try {
      const data = await get('/sessions');
      setSessions(data.sessions || []);
    } catch {
      // silently fail — user will see empty list
    } finally {
      setListLoading(false);
    }
  }, [setSessions]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  /** Loads a session's details and messages, sets it as current */
  const handleSelectSession = useCallback(
    async (session) => {
      setLoading(true);
      setStructured(null);
      try {
        const [sessionData, messagesData] = await Promise.all([
          get(`/sessions/${session.id}`),
          get(`/sessions/${session.id}/messages`),
        ]);
        setCurrentSession(sessionData);
        const nextMessages = messagesData.messages || [];
        setMessages(nextMessages);
        setStructured(extractStructuredFromMessages(nextMessages));
      } catch {
        setCurrentSession(session);
        setMessages([]);
      } finally {
        setLoading(false);
      }
    },
    [setCurrentSession, setMessages, setLoading, setStructured]
  );

  /** Handles deletion and removes from list */
  const handleDelete = useCallback(
    async (sessionId) => {
      await del(`/sessions/${sessionId}`);
      setSessions(sessions.filter((s) => s.id !== sessionId));
      if (currentSession?.id === sessionId) {
        setCurrentSession(null);
        setMessages([]);
        setStructured(null);
      }
    },
    [sessions, currentSession, setSessions, setCurrentSession, setMessages, setStructured]
  );

  /**
   * Called after a new session is created.
   * Adds it to the list, selects it, and sends the first chat message if there is a goal.
   */
  const handleCreate = useCallback(
    async (newSession) => {
      setSessions([newSession, ...sessions]);
      setShowNewForm(false);
      await handleSelectSession(newSession);

      // Send initial learning-goal message
      if (newSession.learning_goal) {
        try {
          const { reply, structured, mode } = await post(
            `/sessions/${newSession.id}/chat`,
            {
              message: `My learning goal is: ${newSession.learning_goal}. I'm ready to start!`,
            }
          );
          setSessionMode(newSession.id, mode);
          addMessage({
            id: reply.id || crypto.randomUUID(),
            session_id: newSession.id,
            role: 'user',
            content: `My learning goal is: ${newSession.learning_goal}. I'm ready to start!`,
            meta: {},
            created_at: new Date().toISOString(),
          });
          addMessage(reply);
          if (structured) {
            setStructured(structured);
          }
        } catch {
          // non-fatal — user can chat manually
        }
      }
    },
    [sessions, setSessions, handleSelectSession, addMessage, setStructured, setSessionMode]
  );

  return (
    <aside
      className="flex flex-col h-full"
      style={{
        width: '240px',
        minWidth: '240px',
        background: '#0f1930',
        borderRight: '1px solid rgba(64,72,93,0.5)',
      }}
    >
      {/* Logo */}
      <div className="px-4 pt-5 pb-4 flex items-center gap-2.5 flex-shrink-0">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, #3bbffa, #8a95ff)',
          }}
          aria-hidden="true"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 36 36"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M18 4L20.5 14.5L31 12L23.5 19.5L28 30L18 24L8 30L12.5 19.5L5 12L15.5 14.5L18 4Z"
              fill="white"
              fillOpacity="0.95"
            />
          </svg>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-on-background font-bold text-base tracking-tight">
            Scholar
          </span>
          <span
            className="text-xs px-1.5 py-0.5 rounded-full font-mono"
            style={{
              background: 'rgba(59,191,250,0.15)',
              color: '#3bbffa',
              fontSize: '10px',
            }}
          >
            v1.0
          </span>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-4 h-px bg-outline-variant opacity-40 flex-shrink-0" />

      {/* New Session button */}
      <div className="px-3 py-3 flex-shrink-0">
        {!showNewForm ? (
          <button
            type="button"
            onClick={() => setShowNewForm(true)}
            className="w-full py-2.5 px-3 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all duration-200 hover:brightness-110 active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, rgba(59,191,250,0.2), rgba(138,149,255,0.2))',
              border: '1px solid rgba(59,191,250,0.3)',
              color: '#3bbffa',
            }}
          >
            <span className="icon text-xl leading-none">add</span>
            <span>New Session</span>
          </button>
        ) : null}
      </div>

      {/* Inline new-session form */}
      {showNewForm && (
        <NewSessionForm
          onCancel={() => setShowNewForm(false)}
          onCreate={handleCreate}
        />
      )}

      {/* Sessions list */}
      <div className="flex-1 overflow-y-auto px-3 pb-2 space-y-1">
        <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider px-1 pb-1.5 flex items-center gap-1.5">
          <span className="icon text-sm leading-none">history</span>
          Sessions
          {listLoading && <MiniSpinner />}
        </p>

        {!listLoading && sessions.length === 0 && (
          <div className="px-1 py-6 text-center">
            <span className="icon text-3xl text-on-surface-variant opacity-40 block mb-2">
              school
            </span>
            <p className="text-xs text-on-surface-variant">
              No sessions yet.
              <br />
              Click "New Session" to begin!
            </p>
          </div>
        )}

        {sessions.map((session) => (
          <SessionItem
            key={session.id}
            session={session}
            isActive={currentSession?.id === session.id}
            onSelect={handleSelectSession}
            onDelete={handleDelete}
          />
        ))}
      </div>

      {/* User info at bottom */}
      <div
        className="flex-shrink-0 px-3 py-3 border-t"
        style={{ borderColor: 'rgba(64,72,93,0.4)' }}
      >
        <div className="flex items-center gap-2.5">
          {/* Avatar initials */}
          <div
            className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white"
            style={{
              background: 'linear-gradient(135deg, #3bbffa, #8a95ff)',
            }}
            aria-hidden="true"
          >
            {user?.email?.[0]?.toUpperCase() || 'U'}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-on-background truncate">
              {user?.email || 'User'}
            </p>
            <p className="text-xs text-on-surface-variant capitalize">
              {user?.role || 'student'}
            </p>
          </div>

          <button
            type="button"
            onClick={logout}
            title="Sign out"
            className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-error/10 transition-all duration-200"
            aria-label="Sign out"
          >
            <span className="icon text-base leading-none">logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
