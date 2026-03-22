/**
 * ChatSidebar — Always visible right panel for conversation history and input.
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { Send, ThumbsUp, ThumbsDown, Sparkles } from 'lucide-react'
import { post } from '../../api/client.js'
import useWorkspaceStore from '../../store/useWorkspaceStore.js'

/* ── Thinking dots ──────────────────────────────────────────────── */
function ThinkingDots() {
  return (
    <div
      className="flex items-end gap-2 px-3 py-2"
      aria-live="polite"
      aria-label="Tutor is thinking"
      style={{ animation: 'fadeIn 200ms ease' }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          background: 'rgba(94,106,210,0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Sparkles size={12} color="#5E6AD2" />
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '8px 12px',
          borderRadius: '12px 12px 12px 3px',
          background: 'rgba(255,255,255,0.04)',
          border: '0.5px solid rgba(255,255,255,0.08)',
        }}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: '#8A8F98',
              display: 'block',
              animation: 'dotBounce 1.2s ease-in-out infinite',
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </div>
    </div>
  )
}

/* ── Message bubble ─────────────────────────────────────────────── */
function MessageBubble({ message }) {
  const isUser = message.role === 'user'
  const [feedback, setFeedback] = useState(null)

  let displayContent = message.content
  if (!isUser && typeof message.content === 'string') {
    try {
      const p = JSON.parse(message.content)
      if (p?.speech) displayContent = p.speech
    } catch {}
  }

  return (
    <div
      className="group"
      style={{
        display: 'flex',
        flexDirection: isUser ? 'row-reverse' : 'row',
        alignItems: 'flex-end',
        gap: 8,
        padding: '6px 16px',
      }}
    >
      {!isUser && (
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: 'rgba(94,106,210,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            marginBottom: 2,
          }}
        >
          <Sparkles size={12} color="#5E6AD2" />
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxWidth: '85%', alignItems: isUser ? 'flex-end' : 'flex-start' }}>
        <div
          style={
            isUser
              ? {
                  background: 'linear-gradient(135deg, #5E6AD2 0%, #6B78E8 100%)',
                  boxShadow: '0 2px 8px rgba(94,106,210,0.25)',
                  color: '#fff',
                  borderRadius: '14px 14px 4px 14px',
                  padding: '10px 14px',
                  fontSize: 14,
                  lineHeight: 1.5,
                }
              : {
                  background: 'rgba(255,255,255,0.04)',
                  border: '0.5px solid rgba(255,255,255,0.08)',
                  borderLeft: '2px solid rgba(94,106,210,0.3)',
                  color: '#EDEDEF',
                  borderRadius: '14px 14px 14px 4px',
                  padding: '10px 14px',
                  fontSize: 14,
                  lineHeight: 1.5,
                }
          }
        >
          {displayContent}
        </div>

        {/* AI feedback — only visible on hover */}
        {!isUser && (
          <div
            className="opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ display: 'flex', gap: 4, transitionDuration: '150ms', paddingLeft: 4 }}
          >
            {[
              { type: 'up',   Icon: ThumbsUp,   activeColor: '#34D399' },
              { type: 'down', Icon: ThumbsDown, activeColor: '#F87171' },
            ].map(({ type, Icon, activeColor }) => (
              <button
                key={type}
                type="button"
                aria-label={type === 'up' ? 'Mark helpful' : 'Mark not helpful'}
                onClick={() => setFeedback(type)}
                style={{
                  padding: 4,
                  borderRadius: 6,
                  border: 'none',
                  background: 'transparent',
                  color: feedback === type ? activeColor : '#555555',
                  cursor: 'pointer',
                  transition: 'color 150ms ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = activeColor }}
                onMouseLeave={(e) => { e.currentTarget.style.color = feedback === type ? activeColor : '#555555' }}
              >
                <Icon size={13} />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Main ChatSidebar ─────────────────────────────────────────────── */
export default function ChatSidebar({ sessionId, onNewStructured }) {
  const messages      = useWorkspaceStore((s) => s.messages)
  const isSending     = useWorkspaceStore((s) => s.isSending)
  const structured    = useWorkspaceStore((s) => s.structured)
  const addMessage    = useWorkspaceStore((s) => s.addMessage)
  const setSending    = useWorkspaceStore((s) => s.setSending)
  const setStructured = useWorkspaceStore((s) => s.setStructured)

  const [input, setInput] = useState('')
  const bottomRef = useRef(null)

  // Auto-scroll on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isSending])

  const sendMessage = useCallback(async (text) => {
    const trimmed = text.trim()
    if (!trimmed || !sessionId || isSending) return
    addMessage({
      id: crypto.randomUUID(),
      session_id: sessionId,
      role: 'user',
      content: trimmed,
      meta: {},
      created_at: new Date().toISOString(),
    })
    setInput('')
    setSending(true)
    try {
      const data = await post(`/sessions/${sessionId}/chat`, { message: trimmed })
      addMessage(data.reply)
      if (data.structured) {
        setStructured(data.structured)
        onNewStructured?.(data.structured)
      }
    } catch (err) {
      addMessage({
        id: crypto.randomUUID(),
        session_id: sessionId,
        role: 'assistant',
        content: `Sorry, I ran into an error: ${err.message}`,
        meta: {},
        created_at: new Date().toISOString(),
      })
    } finally {
      setSending(false)
    }
  }, [sessionId, isSending, addMessage, setSending, setStructured, onNewStructured])

  const suggestions = structured?.follow_up_suggestions ?? []
  const canSend     = input.trim().length > 0 && !isSending

  return (
    <div
      style={{
        width: 380,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(180deg, #0d0d10 0%, #0a0a0d 100%)',
        borderLeft: '0.5px solid rgba(255,255,255,0.06)',
        borderRadius: '0 14px 14px 0', // rounded right edges if part of main container
        height: '100%',
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '16px 20px',
          borderBottom: '0.5px solid rgba(255,255,255,0.05)',
          background: '#0a0a0d',
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 500, color: '#EDEDEF' }}>
          Chat Session
        </span>
      </div>

      {/* ── Chat History ── */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 0',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        {messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)}
        {isSending && <ThinkingDots />}
        <div ref={bottomRef} style={{ paddingBottom: 16 }} />
      </div>

      {/* ── Input Area ── */}
      <div
        style={{
          padding: '12px 16px',
          borderTop: '0.5px solid rgba(255,255,255,0.06)',
          background: '#0a0a0d',
        }}
      >
        {/* Suggestion chips */}
        {suggestions.length > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginBottom: 10,
              overflowX: 'auto',
              scrollbarWidth: 'none',
              paddingBottom: 4,
            }}
          >
            {suggestions.map((text, i) => (
              <button
                key={i}
                type="button"
                onClick={() => sendMessage(text)}
                disabled={isSending}
                style={{
                  flexShrink: 0,
                  padding: '6px 14px',
                  fontSize: 12,
                  borderRadius: 99,
                  background: 'rgba(255,255,255,0.04)',
                  border: '0.5px solid rgba(255,255,255,0.10)',
                  color: '#888888',
                  whiteSpace: 'nowrap',
                  cursor: isSending ? 'not-allowed' : 'pointer',
                  opacity: isSending ? 0.4 : 1,
                  transition: 'all 150ms ease',
                }}
                onMouseEnter={(e) => {
                  if (!isSending) {
                    e.currentTarget.style.color = '#EDEDEF'
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'
                    e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#888888'
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)'
                  e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                }}
              >
                {text} ↗
              </button>
            ))}
          </div>
        )}

        {/* Text Input Row */}
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) }
            }}
            disabled={!sessionId || isSending}
            placeholder={isSending ? 'Thinking...' : 'Ask a question...'}
            style={{
              flex: 1,
              height: 42,
              fontSize: 14,
              padding: '0 14px',
              borderRadius: 8,
              background: 'rgba(255,255,255,0.04)',
              border: '0.5px solid rgba(255,255,255,0.10)',
              color: '#EDEDEF',
              outline: 'none',
              transition: 'border-color 150ms ease',
              opacity: (!sessionId || isSending) ? 0.5 : 1,
            }}
            onFocus={(e)  => { e.currentTarget.style.borderColor = 'rgba(94,106,210,0.6)' }}
            onBlur={(e)   => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)' }}
          />

          <button
            type="button"
            onClick={() => sendMessage(input)}
            disabled={!canSend || !sessionId}
            style={{
              height: 42,
              width: 42,
              borderRadius: 8,
              border: 'none',
              background: canSend && sessionId ? 'rgba(94,106,210,0.9)' : 'rgba(255,255,255,0.06)',
              color: canSend && sessionId ? '#fff' : '#555555',
              cursor: canSend && sessionId ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 200ms cubic-bezier(0.16,1,0.3,1)',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              if (canSend && sessionId) {
                e.currentTarget.style.background = 'rgba(94,106,210,1)'
              }
            }}
            onMouseLeave={(e) => {
              if (canSend && sessionId) {
                e.currentTarget.style.background = 'rgba(94,106,210,0.9)'
              }
            }}
          >
            {isSending
              ? <div style={{ display: 'flex', gap: 2 }}>
                  {[0,1,2].map(i => (
                    <span
                      key={i}
                      style={{
                        width: 3, height: 3, borderRadius: '50%', background: '#8A8F98',
                        animation: 'dotBounce 1.2s ease-in-out infinite',
                        animationDelay: `${i * 0.2}s`,
                      }}
                    />
                  ))}
                </div>
              : <Send size={16} style={{ marginLeft: -2 }} />
            }
          </button>
        </div>
      </div>
    </div>
  )
}
