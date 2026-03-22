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
import { extractStructuredFromMessages } from '../../utils/structured.js'

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
        setHovered(true)
        if (!isActive) {
          e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
          e.currentTarget.style.color = '#CCCCCC'
        }
      }}
      onMouseLeave={(e) => {
        setHovered(false)
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
  const resetTransientState = useWorkspaceStore((s) => s.resetTransientState)
  const appMode             = useWorkspaceStore((s) => s.appMode)
  const setAppMode          = useWorkspaceStore((s) => s.setAppMode)

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
    resetTransientState()
    setAppMode('normal')
    setLoading(true)
    setStructured(null)
    setMessages([])
    try {
      const [sd, md] = await Promise.all([
        get(`/sessions/${session.id}`),
        get(`/sessions/${session.id}/messages`),
      ])
      setCurrentSession(sd)
      const nextMessages = md.messages || []
      setMessages(nextMessages)
      setStructured(extractStructuredFromMessages(nextMessages))
    } catch {
      setCurrentSession(session); setMessages([])
    } finally { setLoading(false) }
  }, [resetTransientState, setCurrentSession, setMessages, setLoading, setStructured, setAppMode])

  const handleDelete = useCallback(async (id) => {
    await del(`/sessions/${id}`)
    setSessions(sessions.filter((s) => s.id !== id))
    if (currentSession?.id === id) {
      resetTransientState()
      setCurrentSession(null); setMessages([]); setStructured(null)
    }
  }, [sessions, currentSession, resetTransientState, setSessions, setCurrentSession, setMessages, setStructured])

  const handleCreate = useCallback(async (customTitle = 'New Chat', mode = 'normal') => {
    setAppMode(mode)
    resetTransientState()
    setLoading(true)
    setStructured(null)
    setMessages([])
    try {
      const data = await post('/sessions', { title: customTitle })
      setSessions([data, ...sessions])
      setCurrentSession(data)
    } catch {} finally {
      setLoading(false)
    }
  }, [sessions, resetTransientState, setSessions, setCurrentSession, setMessages, setStructured, setLoading, setAppMode])

  function scrollLeft()  { scrollRef.current?.scrollBy({ left: -200, behavior: 'smooth' }) }
  function scrollRight() { scrollRef.current?.scrollBy({ left:  200, behavior: 'smooth' }) }
  function handleLogout() {
    logout()
    window.location.hash = ''
  }

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
            isActive={currentSession?.id === s.id && appMode === 'normal'}
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

      {/* New session button with options */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <button
          type="button"
          onClick={() => setShowNew(!showNew)}
          aria-label="New session options"
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '0 12px', height: 30, borderRadius: 8,
            background: 'rgba(94,106,210,0.1)',
            border: '0.5px solid rgba(94,106,210,0.3)',
            color: '#A5AFFF', fontSize: 12, fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 200ms cubic-bezier(0.16,1,0.3,1)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(94,106,210,0.2)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(94,106,210,0.1)' }}
        >
          <Plus size={13} />
          New
        </button>

        {showNew && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: 8,
              width: 160,
              background: '#0d0d12',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 10,
              boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
              zIndex: 100,
              padding: 6,
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            <button
              onClick={() => {
                setShowNew(false)
                handleCreate('Study Session', 'normal')
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 10px', borderRadius: 6,
                background: 'transparent', border: 'none',
                color: '#EDEDEF', fontSize: 12, textAlign: 'left',
                cursor: 'pointer',
                transition: 'background 150ms ease',
                width: '100%',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/></svg>
              Chat
            </button>
            <button
              onClick={() => {
                setShowNew(false)
                setAppMode('attachment')
                setCurrentSession(null)
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 10px', borderRadius: 6,
                background: 'transparent', border: 'none',
                color: '#EDEDEF', fontSize: 12, textAlign: 'left',
                cursor: 'pointer',
                transition: 'background 150ms ease',
                width: '100%',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.51a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
              Attachment
            </button>
          </div>
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
          type="button" onClick={handleLogout} aria-label="Sign out" title="Sign out"
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
