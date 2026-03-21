/**
 * ChatBar — Zone 4. Always visible, pinned to the bottom of the content area.
 * Row 1: suggestion chips (horizontally scrollable).
 * Row 2: input field + Send button.
 * Collapsible message history above.
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { Send, ChevronUp, ChevronDown, ThumbsUp, ThumbsDown, Sparkles } from 'lucide-react'
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
          width: 22,
          height: 22,
          borderRadius: '50%',
          background: 'rgba(94,106,210,0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Sparkles size={10} color="#5E6AD2" />
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '6px 10px',
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
        gap: 6,
        padding: '3px 12px',
      }}
    >
      {!isUser && (
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: '50%',
            background: 'rgba(94,106,210,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            marginBottom: 2,
          }}
        >
          <Sparkles size={9} color="#5E6AD2" />
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, maxWidth: '80%', alignItems: isUser ? 'flex-end' : 'flex-start' }}>
        <div
          style={
            isUser
              ? {
                  background: 'linear-gradient(135deg, #5E6AD2 0%, #6B78E8 100%)',
                  boxShadow: '0 2px 8px rgba(94,106,210,0.25)',
                  color: '#fff',
                  borderRadius: '12px 12px 3px 12px',
                  padding: '7px 12px',
                  fontSize: 13,
                  lineHeight: 1.5,
                }
              : {
                  background: 'rgba(255,255,255,0.04)',
                  border: '0.5px solid rgba(255,255,255,0.08)',
                  borderLeft: '2px solid rgba(94,106,210,0.3)',
                  color: '#EDEDEF',
                  borderRadius: '12px 12px 12px 3px',
                  padding: '7px 12px',
                  fontSize: 13,
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
            style={{ display: 'flex', gap: 2, transitionDuration: '150ms' }}
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
                  padding: 3,
                  borderRadius: 5,
                  border: 'none',
                  background: 'transparent',
                  color: feedback === type ? activeColor : '#555555',
                  cursor: 'pointer',
                  transition: 'color 150ms ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = activeColor }}
                onMouseLeave={(e) => { e.currentTarget.style.color = feedback === type ? activeColor : '#555555' }}
              >
                <Icon size={11} />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Main ChatBar ─────────────────────────────────────────────────── */
export default function ChatBar({ sessionId, onNewStructured }) {
  const messages      = useWorkspaceStore((s) => s.messages)
  const isSending     = useWorkspaceStore((s) => s.isSending)
  const structured    = useWorkspaceStore((s) => s.structured)
  const addMessage    = useWorkspaceStore((s) => s.addMessage)
  const setSending    = useWorkspaceStore((s) => s.setSending)
  const setStructured = useWorkspaceStore((s) => s.setStructured)

  const [input, setInput]             = useState('')
  const [historyOpen, setHistoryOpen] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    if (historyOpen) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isSending, historyOpen])

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
  const hasHistory  = messages.length > 0

  return (
    <div
      style={{
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(180deg, #0c0c0f 0%, #0a0a0d 100%)',
        borderTop: '0.5px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* ── History toggle button ───────────────────────── */}
      {hasHistory && (
        <button
          type="button"
          onClick={() => setHistoryOpen((v) => !v)}
          aria-label={historyOpen ? 'Hide chat history' : 'Show chat history'}
          aria-expanded={historyOpen}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '6px 16px',
            background: 'transparent',
            border: 'none',
            borderBottom: historyOpen ? '0.5px solid rgba(255,255,255,0.06)' : 'none',
            color: '#555555',
            fontSize: 11,
            cursor: 'pointer',
            transition: 'color 150ms ease',
            alignSelf: 'flex-start',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#AAAAAA' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#555555' }}
        >
          {historyOpen ? <ChevronDown size={11} /> : <ChevronUp size={11} />}
          {historyOpen ? 'Hide history' : `${messages.length} message${messages.length !== 1 ? 's' : ''}`}
        </button>
      )}

      {/* ── Collapsible history ─────────────────────────── */}
      {historyOpen && (
        <div
          style={{
            maxHeight: 300,
            overflowY: 'auto',
            borderBottom: '0.5px solid rgba(255,255,255,0.06)',
            paddingBottom: 4,
          }}
        >
          {messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)}
          {isSending && <ThinkingDots />}
          <div ref={bottomRef} />
        </div>
      )}

      {/* ── Row 1: Suggestion chips ─────────────────────── */}
      {suggestions.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 12px 4px',
            overflowX: 'auto',
            scrollbarWidth: 'none',
          }}
          role="list"
          aria-label="Suggested follow-ups"
        >
          {suggestions.map((text, i) => (
            <button
              key={i}
              type="button"
              role="listitem"
              onClick={() => sendMessage(text)}
              disabled={isSending}
              style={{
                flexShrink: 0,
                padding: '4px 12px',
                fontSize: 11,
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
                  e.currentTarget.style.boxShadow = '0 0 0 1px rgba(255,255,255,0.15)'
                  e.currentTarget.style.color = '#EDEDEF'
                  e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'none'
                e.currentTarget.style.color = '#888888'
                e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
              }}
              onMouseDown={(e) => {
                if (!isSending) e.currentTarget.style.transform = 'scale(0.97)'
              }}
              onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
            >
              {text} ↗
            </button>
          ))}
        </div>
      )}

      {/* ── Row 2: Input + Send ─────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '10px 14px',
        }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) }
          }}
          disabled={!sessionId || isSending}
          placeholder={isSending ? 'Thinking...' : 'Ask a question or type a follow-up...'}
          aria-label="Chat input"
          style={{
            flex: 1,
            height: 38,
            fontSize: 13,
            padding: '0 10px',
            borderRadius: 8,
            background: 'rgba(255,255,255,0.04)',
            border: '0.5px solid rgba(255,255,255,0.10)',
            color: '#EDEDEF',
            outline: 'none',
            fontFamily: 'inherit',
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
          aria-label="Send message"
          style={{
            height: 38,
            padding: '0 14px',
            fontSize: 12,
            fontWeight: 500,
            borderRadius: 8,
            border: 'none',
            background: canSend && sessionId ? 'rgba(94,106,210,0.9)' : 'rgba(255,255,255,0.06)',
            color: canSend && sessionId ? '#fff' : '#555555',
            cursor: canSend && sessionId ? 'pointer' : 'not-allowed',
            opacity: canSend && sessionId ? 1 : 0.4,
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            transition: 'all 200ms cubic-bezier(0.16,1,0.3,1)',
            boxShadow: canSend && sessionId ? '0 0 18px rgba(94,106,210,0.4)' : 'none',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            if (canSend && sessionId) {
              e.currentTarget.style.background = 'rgba(94,106,210,1)'
              e.currentTarget.style.boxShadow = '0 0 24px rgba(94,106,210,0.55)'
            }
          }}
          onMouseLeave={(e) => {
            if (canSend && sessionId) {
              e.currentTarget.style.background = 'rgba(94,106,210,0.9)'
              e.currentTarget.style.boxShadow = '0 0 18px rgba(94,106,210,0.4)'
            }
          }}
          onMouseDown={(e) => {
            if (canSend && sessionId) e.currentTarget.style.transform = 'scale(0.97)'
          }}
          onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
        >
          {isSending
            ? <span style={{ display: 'flex', gap: 2 }}>
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
              </span>
            : <>
                <Send size={12} />
                Send
              </>
          }
        </button>
      </div>
    </div>
  )
}
