/**
 * TopNav — horizontal sessions bar pinned to the top of the app.
 * Replaces the left sidebar. Sessions are horizontal scrollable tabs.
 * Scholar logo left | sessions middle | + new | user right
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, Trash2, LogOut, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { get, post, del } from '../../api/client.js'
import useAuthStore from '../../store/useAuthStore.js'
import useWorkspaceStore from '../../store/useWorkspaceStore.js'

/* ── Spinner ──────────────────────────────────────────────────────── */
function Spinner() {
  return (
    <div
      style={{
        width: 12, height: 12,
        border: '1.5px solid rgba(255,255,255,0.15)',
        borderTopColor: '#5E6AD2',
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
        flexShrink: 0,
      }}
    />
  )
}

/* ── Session tab pill ─────────────────────────────────────────────── */
function SessionTab({ session, isActive, onSelect, onDelete }) {
  const [deleting, setDeleting] = useState(false)
  const [hovered, setHovered]   = useState(false)

  async function handleDelete(e) {
    e.stopPropagation()
    if (!window.confirm(`Delete "${session.title}"?`)) return
    setDeleting(true)
    try { await onDelete(session.id) } finally { setDeleting(false) }
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(session)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-current={isActive ? 'true' : undefined}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '0 12px',
        height: 32,
        borderRadius: 8,
        border: `1px solid ${isActive ? 'rgba(94,106,210,0.4)' : 'rgba(255,255,255,0.07)'}`,
        background: isActive
          ? 'linear-gradient(135deg, rgba(94,106,210,0.18) 0%, rgba(94,106,210,0.08) 100%)'
          : 'rgba(255,255,255,0.04)',
        boxShadow: isActive
          ? 'inset 0 0 0 1px rgba(94,106,210,0.35), 0 0 12px rgba(94,106,210,0.12)'
          : 'none',
        color: isActive ? '#A5AFFF' : '#8A8F98',
        fontSize: 12,
        fontWeight: isActive ? 500 : 400,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        flexShrink: 0,
        transition: 'all 200ms cubic-bezier(0.16,1,0.3,1)',
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
          e.currentTarget.style.color = '#CCCCCC'
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
          e.currentTarget.style.color = '#8A8F98'
        }
      }}
      onMouseDown={(e) => { if (!isActive) e.currentTarget.style.transform = 'scale(0.97)' }}
      onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
    >
      <span style={{
        width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
        background: isActive ? '#5E6AD2' : 'rgba(255,255,255,0.15)',
        transition: 'background 200ms cubic-bezier(0.16,1,0.3,1)',
      }} />

      <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {session.title || 'Untitled'}
      </span>

      {/* Delete button — appears on hover */}
      {(hovered || isActive) && (
        <span
          role="button"
          tabIndex={0}
          onClick={handleDelete}
          onKeyDown={(e) => e.key === 'Enter' && handleDelete(e)}
          aria-label={`Delete ${session.title}`}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 14, height: 14, borderRadius: 3, marginLeft: 2,
            color: 'rgba(255,255,255,0.3)',
            transition: 'color 200ms cubic-bezier(0.16,1,0.3,1)',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#F87171' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.3)' }}
        >
          {deleting ? <Spinner /> : <X size={10} />}
        </span>
      )}
    </button>
  )
}

/* ── New session inline form ──────────────────────────────────────── */
function NewSessionPopover({ onClose, onCreate }) {
  const [title,   setTitle]   = useState('')
  const [goal,    setGoal]    = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)
  const ref = useRef(null)

  useEffect(() => {
    ref.current?.querySelector('input')?.focus()
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  async function handleCreate(e) {
    e.preventDefault()
    setError(null); setLoading(true)
    try {
      const data = await post('/sessions', {
        title: title.trim() || 'New Session',
        learning_goal: goal.trim() || undefined,
      })
      await onCreate(data)
      onClose()
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  const inputStyle = {
    width: '100%', height: 32, padding: '0 10px', fontSize: 12,
    borderRadius: 7,
    background: 'rgba(255,255,255,0.05)',
    border: '0.5px solid rgba(255,255,255,0.12)',
    color: '#EDEDEF', outline: 'none',
    transition: 'border-color 200ms cubic-bezier(0.16,1,0.3,1)',
    fontFamily: 'inherit',
  }

  return (
    <div
      ref={ref}
      style={{
        position: 'absolute', top: 'calc(100% + 8px)', left: 0,
        width: 260, zIndex: 100,
        background: '#1A1A20',
        border: '0.5px solid rgba(255,255,255,0.12)',
        borderRadius: 12,
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        padding: 14,
      }}
    >
      <p style={{ fontSize: 11, fontWeight: 600, color: '#8A8F98', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
        New Session
      </p>
      {error && <p style={{ fontSize: 11, color: '#F87171', marginBottom: 8 }}>{error}</p>}
      <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          <label style={{ fontSize: 10, color: '#666', marginBottom: 3, display: 'block' }}>Title</label>
          <input
            type="text" placeholder="Session title…" value={title}
            onChange={(e) => setTitle(e.target.value)} style={inputStyle}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(94,106,210,0.5)' }}
            onBlur={(e)  => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)' }}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          <label style={{ fontSize: 10, color: '#666', marginBottom: 3, display: 'block' }}>Learning Goal</label>
          <input
            type="text" placeholder="Learning goal (optional)…" value={goal}
            onChange={(e) => setGoal(e.target.value)} style={inputStyle}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(94,106,210,0.5)' }}
            onBlur={(e)  => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)' }}
          />
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
          <button
            type="submit" disabled={loading}
            style={{
              flex: 1, height: 32, borderRadius: 7, border: 'none', fontSize: 12, fontWeight: 500,
              background: 'rgba(94,106,210,0.9)', color: '#fff',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              transition: 'all 200ms cubic-bezier(0.16,1,0.3,1)',
            }}
          >
            {loading && <Spinner />}
            {loading ? 'Creating…' : 'Create'}
          </button>
          <button
            type="button" onClick={onClose}
            style={{
              padding: '0 12px', height: 32, borderRadius: 7, fontSize: 12,
              background: 'rgba(255,255,255,0.05)',
              border: '0.5px solid rgba(255,255,255,0.1)',
              color: '#8A8F98', cursor: 'pointer',
              transition: 'all 200ms cubic-bezier(0.16,1,0.3,1)',
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

/* ── Main TopNav ──────────────────────────────────────────────────── */
export default function TopNav() {
  const user    = useAuthStore((s) => s.user)
  const logout  = useAuthStore((s) => s.logout)

  const sessions           = useWorkspaceStore((s) => s.sessions)
  const currentSession     = useWorkspaceStore((s) => s.currentSession)
  const setSessions        = useWorkspaceStore((s) => s.setSessions)
  const setCurrentSession  = useWorkspaceStore((s) => s.setCurrentSession)
  const setMessages        = useWorkspaceStore((s) => s.setMessages)
  const setStructured      = useWorkspaceStore((s) => s.setStructured)
  const setLoading         = useWorkspaceStore((s) => s.setLoading)
  const addMessage         = useWorkspaceStore((s) => s.addMessage)

  const [showNew,     setShowNew]     = useState(false)
  const [listLoading, setListLoading] = useState(false)
  const scrollRef = useRef(null)

  const loadSessions = useCallback(async () => {
    setListLoading(true)
    try { const d = await get('/sessions'); setSessions(d.sessions || []) }
    catch {} finally { setListLoading(false) }
  }, [setSessions])

  useEffect(() => { loadSessions() }, [loadSessions])

  const handleSelect = useCallback(async (session) => {
    setLoading(true); setStructured(null)
    try {
      const [sd, md] = await Promise.all([
        get(`/sessions/${session.id}`),
        get(`/sessions/${session.id}/messages`),
      ])
      setCurrentSession(sd)
      setMessages(md.messages || [])
    } catch {
      setCurrentSession(session); setMessages([])
    } finally { setLoading(false) }
  }, [setCurrentSession, setMessages, setLoading, setStructured])

  const handleDelete = useCallback(async (id) => {
    await del(`/sessions/${id}`)
    setSessions(sessions.filter((s) => s.id !== id))
    if (currentSession?.id === id) {
      setCurrentSession(null); setMessages([]); setStructured(null)
    }
  }, [sessions, currentSession, setSessions, setCurrentSession, setMessages, setStructured])

  const handleCreate = useCallback(async (newSession) => {
    setSessions([newSession, ...sessions])
    await handleSelect(newSession)
    if (newSession.learning_goal) {
      try {
        const { reply, structured } = await post(`/sessions/${newSession.id}/chat`, {
          message: `My learning goal is: ${newSession.learning_goal}. I'm ready to start!`,
        })
        addMessage({ id: reply.id || crypto.randomUUID(), session_id: newSession.id, role: 'user', content: `My learning goal is: ${newSession.learning_goal}. I'm ready to start!`, meta: {}, created_at: new Date().toISOString() })
        addMessage(reply)
        if (structured) setStructured(structured)
      } catch {}
    }
  }, [sessions, setSessions, handleSelect, addMessage, setStructured])

  function scrollLeft()  { scrollRef.current?.scrollBy({ left: -200, behavior: 'smooth' }) }
  function scrollRight() { scrollRef.current?.scrollBy({ left:  200, behavior: 'smooth' }) }

  return (
    <header
      style={{
        height: 48, flexShrink: 0,
        display: 'flex', alignItems: 'center', gap: 12,
        background: 'linear-gradient(90deg, #0d0d10 0%, #0e0e12 100%)',
        borderRadius: 12,
        padding: '0 16px',
        position: 'relative', zIndex: 50,
        boxShadow: '0 2px 16px rgba(0,0,0,0.4), inset 0 0 0 0.5px rgba(255,255,255,0.07)',
      }}
    >
      {/* Brand mark */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8, flexShrink: 0,
          background: 'linear-gradient(135deg, #5E6AD2, #818CF8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 16px rgba(94,106,210,0.5)',
        }}>
          <svg width="14" height="14" viewBox="0 0 36 36" fill="none">
            <path d="M18 4L20.5 14.5L31 12L23.5 19.5L28 30L18 24L8 30L12.5 19.5L5 12L15.5 14.5L18 4Z" fill="white" fillOpacity="0.95" />
          </svg>
        </div>
        <span style={{ fontSize: 15, fontWeight: 700, color: '#EDEDEF', letterSpacing: '-0.02em' }}>
          Scholar
        </span>
      </div>

      {/* Divider */}
      <div style={{ width: '0.5px', height: 20, background: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />

      {/* Scroll left */}
      {sessions.length > 4 && (
        <button type="button" onClick={scrollLeft} aria-label="Scroll sessions left"
          style={{ background: 'none', border: 'none', color: '#8A8F98', cursor: 'pointer', padding: 2, flexShrink: 0, transition: 'all 200ms cubic-bezier(0.16,1,0.3,1)' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#EDEDEF' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#8A8F98' }}
        >
          <ChevronLeft size={14} />
        </button>
      )}

      {/* Sessions scroll area */}
      <div
        ref={scrollRef}
        style={{
          flex: 1, display: 'flex', alignItems: 'center', gap: 5,
          overflowX: 'auto', scrollbarWidth: 'none',
          minWidth: 0,
        }}
      >
        {listLoading && <Spinner />}
        {!listLoading && sessions.length === 0 && (
          <span style={{ fontSize: 12, color: '#4B5060' }}>No sessions yet — create one</span>
        )}
        {sessions.map((s) => (
          <SessionTab
            key={s.id} session={s}
            isActive={currentSession?.id === s.id}
            onSelect={handleSelect}
            onDelete={handleDelete}
          />
        ))}
      </div>

      {/* Scroll right */}
      {sessions.length > 4 && (
        <button type="button" onClick={scrollRight} aria-label="Scroll sessions right"
          style={{ background: 'none', border: 'none', color: '#8A8F98', cursor: 'pointer', padding: 2, flexShrink: 0, transition: 'all 200ms cubic-bezier(0.16,1,0.3,1)' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#EDEDEF' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#8A8F98' }}
        >
          <ChevronRight size={14} />
        </button>
      )}

      {/* Divider */}
      <div style={{ width: '0.5px', height: 20, background: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />

      {/* New session button */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <button
          type="button"
          onClick={() => setShowNew((v) => !v)}
          aria-label="New session"
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '0 12px', height: 30, borderRadius: 8,
            background: showNew ? 'rgba(94,106,210,0.2)' : 'rgba(94,106,210,0.1)',
            border: '0.5px solid rgba(94,106,210,0.3)',
            color: '#A5AFFF', fontSize: 12, fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 200ms cubic-bezier(0.16,1,0.3,1)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(94,106,210,0.2)' }}
          onMouseLeave={(e) => { if (!showNew) e.currentTarget.style.background = 'rgba(94,106,210,0.1)' }}
        >
          <Plus size={13} />
          New
        </button>
        {showNew && (
          <NewSessionPopover onClose={() => setShowNew(false)} onCreate={handleCreate} />
        )}
      </div>

      {/* User info + logout */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <div style={{
          width: 26, height: 26, borderRadius: '50%',
          background: 'linear-gradient(135deg, #5E6AD2, #818CF8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 700, color: '#fff',
          flexShrink: 0,
        }}>
          {user?.email?.[0]?.toUpperCase() || 'U'}
        </div>
        <span
          title={user?.email}
          style={{ fontSize: 12, color: '#8A8F98', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        >
          {user?.email || 'User'}
        </span>
        <button
          type="button" onClick={logout} aria-label="Sign out" title="Sign out"
          style={{
            background: 'none', border: 'none', color: '#4B5060', cursor: 'pointer',
            padding: 3, display: 'flex',
            transition: 'all 200ms cubic-bezier(0.16,1,0.3,1)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#F87171' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#4B5060' }}
        >
          <LogOut size={14} />
        </button>
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </header>
  )
}
