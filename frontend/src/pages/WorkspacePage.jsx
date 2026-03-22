/**
 * WorkspacePage — four-zone layout per design spec.
 *
 * Zone 1 │ Zone 2 (tab bar)
 *         │ Zone 3 (canvas or IDE)
 *         │ Zone 4 (chat bar — always visible)
 */
import { useState, useCallback } from 'react'
import {
  LayoutPanelLeft, Code2, Maximize2, Columns2,
  MousePointerClick,
} from 'lucide-react'
import { post } from '../api/client.js'
import useWorkspaceStore from '../store/useWorkspaceStore.js'

import TopNav        from '../components/TopNav/TopNav.jsx'
import AvatarSidebar from '../components/AvatarSidebar/AvatarSidebar.jsx'
import Canvas        from '../components/Canvas/Canvas.jsx'
import CodeEditor    from '../components/IDE/CodeEditor.jsx'
import ChatSidebar   from '../components/ChatSidebar/ChatSidebar.jsx'
import VideoWorkspace from '../components/VideoWorkspace/VideoWorkspace.jsx'
import { useSpeech } from '../components/Avatar/Avatar.jsx'
import { formatModeLabel, inferChatMode } from '../utils/chatMode.js'
import { isStructuredResponse } from '../utils/structured.js'

/* ------------------------------------------------------------------ */
/* Empty / first-visit                                                  */
/* ------------------------------------------------------------------ */
const STARTERS = [
  { icon: Code2,        label: 'Explain binary search',     desc: 'Visual step-by-step' },
  { icon: LayoutPanelLeft, label: 'How does TCP/IP work?',  desc: 'Network diagrams' },
  { icon: Code2,        label: 'Teach me quicksort',        desc: 'Animated sorting' },
  { icon: LayoutPanelLeft, label: 'Gradient descent',       desc: 'ML optimization chart' },
  { icon: Code2,        label: 'React hooks explained',     desc: 'Code examples' },
  { icon: LayoutPanelLeft, label: 'Krebs cycle',            desc: 'Step diagrams' },
]

function EmptyState({ onStartChat }) {
  const [msg, setMsg] = useState('')

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
        overflow: 'auto',
      }}
    >
      <p style={{ fontSize: 22, fontWeight: 600, color: '#EDEDEF', marginBottom: 6 }}>
        Hi, I'm your AI tutor.
      </p>
      <p style={{ fontSize: 13, color: '#8A8F98', marginBottom: 28 }}>
        Type a message to start a new learning session.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (msg.trim()) onStartChat(msg)
        }}
        style={{ width: '100%', maxWidth: 480, position: 'relative', marginBottom: 32 }}
      >
        <input
          type="text"
          autoFocus
          placeholder="Message your tutor..."
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          style={{
            width: '100%',
            padding: '14px 20px',
            borderRadius: 12,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#fff',
            fontSize: 14,
            outline: 'none',
          }}
        />
        <button
          type="submit"
          disabled={!msg.trim()}
          style={{
            position: 'absolute',
            right: 8,
            top: '50%',
            transform: 'translateY(-50%)',
            background: '#5E6AD2',
            border: 'none',
            borderRadius: 8,
            padding: '6px 14px',
            color: '#fff',
            cursor: msg.trim() ? 'pointer' : 'not-allowed',
            opacity: msg.trim() ? 1 : 0.5,
            fontSize: 12,
            fontWeight: 500,
            transition: 'opacity 0.2s',
          }}
        >
          Send
        </button>
      </form>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 10,
          width: '100%',
          maxWidth: 480,
        }}
      >
        {STARTERS.map((t) => (
          <div
            key={t.label}
            onClick={() => onStartChat(`Teach me about ${t.label}`)}
            style={{
              padding: 14,
              borderRadius: 12,
              background: 'rgba(255,255,255,0.03)',
              border: '0.5px solid rgba(255,255,255,0.08)',
              cursor: 'pointer',
              transition: 'all 200ms cubic-bezier(0.16,1,0.3,1)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'
              e.currentTarget.style.transform = 'translateY(-1px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            <t.icon size={18} color="#5E6AD2" style={{ marginBottom: 8, display: 'block' }} />
            <div style={{ fontSize: 12, fontWeight: 500, color: '#EDEDEF', marginBottom: 3 }}>
              {t.label}
            </div>
            <div style={{ fontSize: 11, color: '#8A8F98' }}>{t.desc}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Zone 2 — Tab bar                                                     */
/* ------------------------------------------------------------------ */
function TabBar({ activeTab, onTabChange, isSplit, onSplitToggle }) {
  const tabs = [
    { id: 'canvas', label: 'Canvas', Icon: LayoutPanelLeft },
    { id: 'ide',    label: 'IDE',    Icon: Code2 },
  ]

  return (
    <div
      style={{
        height: 38,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'stretch',
        background: 'linear-gradient(90deg, #0d0d10 0%, #0e0e13 100%)',
        borderBottom: '0.5px solid rgba(255,255,255,0.06)',
        padding: '0 12px',
      }}
    >
      {/* Tabs */}
      {tabs.map(({ id, label, Icon }) => {
        const active = isSplit || activeTab === id
        return (
          <button
            key={id}
            type="button"
            onClick={() => !isSplit && onTabChange(id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '0 10px',
              fontSize: 12,
              fontWeight: active ? 600 : 400,
              color: active ? '#A5AFFF' : '#8A8F98',
              background: 'transparent',
              border: 'none',
              borderBottom: active ? '2px solid #5E6AD2' : '2px solid transparent',
              cursor: isSplit ? 'default' : 'pointer',
              transition: 'color 150ms ease, border-color 150ms ease',
              marginBottom: -1,
            }}
            onMouseEnter={(e) => {
              if (!active && !isSplit) e.currentTarget.style.color = '#CCCCCC'
            }}
            onMouseLeave={(e) => {
              if (!active && !isSplit) e.currentTarget.style.color = '#8A8F98'
            }}
          >
            <Icon size={13} />
            {label}
          </button>
        )
      })}

      <div style={{ flex: 1 }} />

      {/* Split button */}
      <button
        type="button"
        onClick={onSplitToggle}
        title="Toggle split view"
        aria-label="Toggle split view"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '0 8px',
          fontSize: 12,
          background: isSplit ? 'rgba(94,106,210,0.12)' : 'transparent',
          color: isSplit ? '#7B87E8' : '#8A8F98',
          border: 'none',
          borderRadius: 5,
          cursor: 'pointer',
          transition: 'all 150ms ease',
          margin: '4px 0',
        }}
        onMouseEnter={(e) => {
          if (!isSplit) e.currentTarget.style.color = '#CCCCCC'
        }}
        onMouseLeave={(e) => {
          if (!isSplit) e.currentTarget.style.color = '#8A8F98'
        }}
      >
        <Columns2 size={13} />
        {isSplit ? 'Stack' : 'Split'}
      </button>

      {/* Fullscreen placeholder */}
      <button
        type="button"
        title="Fullscreen"
        aria-label="Fullscreen canvas"
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '0 6px',
          background: 'transparent',
          color: '#8A8F98',
          border: 'none',
          borderRadius: 5,
          cursor: 'pointer',
          transition: 'color 150ms ease',
          margin: '4px 0 4px 2px',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = '#CCCCCC' }}
        onMouseLeave={(e) => { e.currentTarget.style.color = '#8A8F98' }}
      >
        <Maximize2 size={13} />
      </button>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Session header (inside Zone 3, above content)                        */
/* ------------------------------------------------------------------ */
function SessionHeader({ session, onTitleSave }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal]         = useState(session.title || '')

  function commit() {
    setEditing(false)
    if (val.trim() && val.trim() !== session.title) onTitleSave(val.trim())
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 20px',
        flexShrink: 0,
        borderBottom: '0.5px solid rgba(255,255,255,0.05)',
        background: '#0a0a0d',
      }}
    >
      {editing ? (
        <input
          type="text"
          autoFocus
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit()
            if (e.key === 'Escape') setEditing(false)
          }}
          style={{
            fontSize: 13,
            fontWeight: 500,
            background: 'transparent',
            border: 'none',
            borderBottom: '1px solid rgba(94,106,210,0.5)',
            color: '#EDEDEF',
            outline: 'none',
            padding: '1px 0',
            flex: 1,
            maxWidth: 280,
          }}
        />
      ) : (
        <button
          type="button"
          onClick={() => { setVal(session.title || ''); setEditing(true) }}
          title="Click to rename"
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: '#EDEDEF',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            transition: 'color 150ms ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#AAAAAA' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#EDEDEF' }}
        >
          {session.title || 'Untitled Session'}
        </button>
      )}

      {session.learning_goal && (
        <span
          style={{
            fontSize: 11,
            padding: '2px 8px',
            borderRadius: 99,
            background: 'rgba(94,106,210,0.18)',
            color: '#A5AFFF',
            border: '0.5px solid rgba(94,106,210,0.35)',
            flexShrink: 0,
            maxWidth: 200,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={session.learning_goal}
        >
          {session.learning_goal}
        </span>
      )}
      <span
        style={{
          fontSize: 11,
          padding: '2px 8px',
          borderRadius: 99,
          background: 'rgba(59,191,250,0.12)',
          color: '#7AD9FF',
          border: '0.5px solid rgba(59,191,250,0.3)',
          flexShrink: 0,
        }}
      >
        {formatModeLabel(session.mode || 'general')}
      </span>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Zone 3 — Content wrapper (adds step indicator + click hint)          */
/* ------------------------------------------------------------------ */
function ContentWrapper({ structured, canvasStep, children }) {
  const canvasActions = structured?.canvas_actions || []
  const total         = canvasActions.length

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        overflow: 'hidden',
        padding: 16,
        gap: 8,
      }}
    >
      {/* Actual content (canvas or IDE) */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', borderRadius: 8 }}>
        {children}
      </div>

      {/* Click hint */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 5,
          flexShrink: 0,
        }}
      >
        <MousePointerClick size={11} color="#4B5060" />
        <span style={{ fontSize: 11, color: '#4B5060' }}>
          Click any element to ask about it
        </span>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Main WorkspacePage                                                    */
/* ------------------------------------------------------------------ */
export default function WorkspacePage() {
  const sessions            = useWorkspaceStore((s) => s.sessions)
  const setSessions         = useWorkspaceStore((s) => s.setSessions)
  const setCurrentSession   = useWorkspaceStore((s) => s.setCurrentSession)
  const setMessages         = useWorkspaceStore((s) => s.setMessages)
  const currentSession      = useWorkspaceStore((s) => s.currentSession)
  const structured          = useWorkspaceStore((s) => s.structured)
  const isExecuting         = useWorkspaceStore((s) => s.isExecuting)
  const isLoading           = useWorkspaceStore((s) => s.isLoading)
  const addMessage          = useWorkspaceStore((s) => s.addMessage)
  const setExecuting        = useWorkspaceStore((s) => s.setExecuting)
  const setStructured       = useWorkspaceStore((s) => s.setStructured)
  const updateSessionInList = useWorkspaceStore((s) => s.updateSessionInList)
  const setSessionMode      = useWorkspaceStore((s) => s.setSessionMode)
  const setSessionCode      = useWorkspaceStore((s) => s.setSessionCode)
  const setLoading          = useWorkspaceStore((s) => s.setLoading)
  const appMode             = useWorkspaceStore((s) => s.appMode)

  const [activeTab,        setActiveTab]        = useState('canvas')
  const [isSplit,          setIsSplit]          = useState(false)
  const [canvasStep,       setCanvasStep]       = useState(0)
  const [executionResult,  setExecutionResult]  = useState(null)
  const [autoPlay,         setAutoPlay]         = useState(false)
  const [isMuted,          setIsMuted]          = useState(false)
  const [speed,            setSpeed]            = useState('1x')

  const { speak, stop, isSpeaking } = useSpeech()

  const emotion       = structured?.emotion       || 'idle'
  const canvasActions = structured?.canvas_actions || []

  /* Steps for the sidebar tracker */
  const steps = canvasActions.map((a, i) => ({
    title: a.label || a.type || `Step ${i + 1}`,
    state: i < canvasStep ? 'completed' : i === canvasStep ? 'active' : 'upcoming',
  }))

  const handleNewStructured = useCallback((s, sessionIdOverride) => {
    setStructured(s)
    setCanvasStep(0)
    setAutoPlay(true)
    if (s?.canvas_mode === 'split') {
      setIsSplit(true)
      setActiveTab('canvas')
    } else if (s?.canvas_mode === 'code') {
      setIsSplit(false)
      setActiveTab('ide')
    } else {
      setActiveTab('canvas')
    }
    const codeAction = s?.canvas_actions?.find((action) => action?.type === 'code' && action?.content)
    const targetSessionId = sessionIdOverride || currentSession?.id
    if (codeAction && targetSessionId) {
      setSessionCode(targetSessionId, codeAction.content)
    }
    if (s?.speech && !isMuted) speak(s.speech)
  }, [setStructured, speak, isMuted, currentSession, setSessionCode])

  const handleExecute = useCallback(async (code, language) => {
    if (!currentSession?.id || isExecuting) return
    setExecuting(true)
    setExecutionResult(null)
    try {
      const data = await post(`/sessions/${currentSession.id}/execute`, { code, language })
      setSessionMode(currentSession.id, data.mode)
      setSessionCode(currentSession.id, code)
      setExecutionResult(data.execution)
      if (data.reply)      addMessage(data.reply)
      if (data.structured) handleNewStructured(data.structured, currentSession.id)
    } catch (err) {
      setExecutionResult({ output: '', error: err.message, success: false, execution_time_ms: 0 })
    } finally {
      setExecuting(false)
    }
  }, [currentSession, isExecuting, setExecuting, setSessionMode, setSessionCode, addMessage, handleNewStructured])

  const handleTitleSave = useCallback(async (newTitle) => {
    if (!currentSession?.id) return
    updateSessionInList({ ...currentSession, title: newTitle })
  }, [currentSession, updateSessionInList])

  const handleStartChat = useCallback(async (message) => {
    setLoading(true)
    try {
      // Dynamic title based on message snippet
      const snippet = message.length > 25 ? message.substring(0, 25) + '...' : message
      const sessionTitle = `Session: ${snippet}`
      
      const newSession = await post('/sessions', { title: sessionTitle })
      setSessions([newSession, ...sessions])
      setCurrentSession(newSession)
      setMessages([])
      setStructured(null)

      const mode = inferChatMode({ text: message, currentMode: newSession.mode })
      const { reply, structured: s, mode: resolvedMode } = await post(`/sessions/${newSession.id}/chat`, { message, mode })
      setSessionMode(newSession.id, resolvedMode)
      addMessage({
          id: crypto.randomUUID(),
          session_id: newSession.id,
          role: 'user',
          content: message,
          created_at: new Date().toISOString()
      })
      addMessage(reply)
      const nextStructured = isStructuredResponse(s)
        ? s
        : (isStructuredResponse(reply?.meta) ? reply.meta : null)
      if (nextStructured) handleNewStructured(nextStructured, newSession.id)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [sessions, setSessions, setCurrentSession, setMessages, setStructured, setSessionMode, addMessage, setLoading, handleNewStructured])

  /* ── Content renderer ── */
  function renderContent() {
    const canvasEl = (
      <Canvas
        actions={canvasActions}
        currentStep={canvasStep}
        onStepChange={(s) => { setCanvasStep(s); setAutoPlay(false) }}
        autoPlay={autoPlay}
      />
    )
    const ideEl = (
      <CodeEditor
        sessionId={currentSession.id}
        initialCode={currentSession.current_code || ''}
        onExecute={handleExecute}
        isExecuting={isExecuting}
        executionResult={executionResult}
      />
    )

    if (isSplit) {
      return (
        <ContentWrapper structured={structured} canvasStep={canvasStep}>
          <div
            style={{
              display: 'flex',
              height: '100%',
            }}
          >
            <div style={{ flex: 1, minWidth: 0, borderRight: '0.5px solid rgba(255,255,255,0.06)' }}>
              {canvasEl}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              {ideEl}
            </div>
          </div>
        </ContentWrapper>
      )
    }

    if (activeTab === 'ide') {
      return (
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', padding: 16 }}>
          {ideEl}
        </div>
      )
    }

    return (
      <ContentWrapper structured={structured} canvasStep={canvasStep}>
        {canvasEl}
      </ContentWrapper>
    )
  }

  /* ── Loading state ── */
  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          background: 'linear-gradient(160deg, #08080b 0%, #060608 50%, #07070a 100%)',
          padding: 10,
          gap: 8,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <TopNav />
        <div style={{ display: 'flex', flex: 1, minHeight: 0, gap: 8, position: 'relative', zIndex: 1 }}>
          <AvatarSidebar emotion="thinking" isSpeaking={false} />
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  border: '2px solid rgba(94,106,210,0.3)',
                  borderTopColor: '#5E6AD2',
                  animation: 'spin 0.8s linear infinite',
                }}
              />
              <p style={{ fontSize: 12, color: '#8A8F98' }}>Loading session…</p>
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden',
        background: 'linear-gradient(160deg, #08080b 0%, #060608 50%, #07070a 100%)',
        padding: 10,
        gap: 8,
        position: 'relative',
      }}
    >
      {/* Ambient blobs */}
      <div
        style={{
          position: 'absolute',
          top: '-20%',
          left: '-10%',
          width: '45vw',
          height: '45vw',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(94,106,210,0.07) 0%, transparent 70%)',
          filter: 'blur(60px)',
          animation: 'blobDrift 18s ease-in-out infinite',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          right: '-5%',
          width: '40vw',
          height: '40vw',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(96,165,250,0.05) 0%, transparent 70%)',
          filter: 'blur(60px)',
          animation: 'blobDrift 18s ease-in-out infinite',
          animationDelay: '8s',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* ── Top nav (sessions) ── */}
      <div style={{ position: 'relative', zIndex: 10 }}>
        <TopNav />
      </div>

      {/* ── Main row: Avatar + Content ── */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0, gap: 8, position: 'relative', zIndex: 1 }}>

      {/* ── Zone 1: Avatar sidebar ── */}
      <AvatarSidebar
        emotion={emotion}
        isSpeaking={isSpeaking}
        isMuted={isMuted}
        speed={speed}
        onMuteToggle={() => setIsMuted((v) => { if (!v) stop(); return !v })}
        onSpeedChange={setSpeed}
        steps={steps}
      />

      {/* ── Zones 2–4: Content + Chat ── */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          borderRadius: 14,
          boxShadow: '0 2px 24px rgba(0,0,0,0.5), inset 0 0 0 0.5px rgba(255,255,255,0.06)',
          position: 'relative',
          zIndex: 1,
          overflow: 'hidden',
        }}
      >
        {/* Middle Canvas / IDE */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            background: 'linear-gradient(180deg, #0f0f13 0%, #0d0d10 100%)',
          }}
        >
        {/* Zone 2: Tab bar */}
        {currentSession && (
          <>
            <SessionHeader session={currentSession} onTitleSave={handleTitleSave} />
            <TabBar
              activeTab={activeTab}
              onTabChange={setActiveTab}
              isSplit={isSplit}
              onSplitToggle={() => setIsSplit((v) => !v)}
            />
          </>
        )}

        {/* Zone 3: Active content */}
        {appMode === 'attachment' ? (
          <VideoWorkspace />
        ) : !currentSession ? (
          <EmptyState onStartChat={handleStartChat} />
        ) : (
          <div
            style={{
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {renderContent()}
          </div>
        )}

        </div>

        {/* Right Side: Chat Session */}
        {currentSession && appMode === 'normal' && (
          <ChatSidebar
            sessionId={currentSession.id}
            onNewStructured={handleNewStructured}
          />
        )}
      </div>

      </div>
    </div>
  )
}
