/**
 * ChatSidebar — Always visible right panel for conversation history and input.
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { Send, ThumbsUp, ThumbsDown, Sparkles, Globe, X, Paperclip } from 'lucide-react'
import { post } from '../../api/client.js'
import useWorkspaceStore from '../../store/useWorkspaceStore.js'
import { formatModeLabel, inferChatMode, isYoutubeUrl, normalizeUrl } from '../../utils/chatMode.js'
import { buildResourcePreviewStructured } from '../../utils/resourcePreview.js'
import { isStructuredResponse } from '../../utils/structured.js'

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

function SearchResultsRail({ results }) {
  const kind = results?.kind
  const items = Array.isArray(results?.items) ? results.items : []
  if (!kind || items.length === 0) return null

  return (
    <div
      style={{
        display: 'flex',
        gap: 10,
        overflowX: 'auto',
        paddingBottom: 4,
        maxWidth: '100%',
      }}
    >
      {items.map((item, idx) => {
        const href = item.pdf_url || item.url
        const title = item.title || `${kind} result ${idx + 1}`
        const subtitle =
          kind === 'image'
            ? item.source
            : kind === 'video'
              ? [item.channel, item.duration].filter(Boolean).join(' • ')
              : [item.authors, item.publication].filter(Boolean).join(' • ')

        return (
          <a
            key={`${href}-${idx}`}
            href={href}
            target="_blank"
            rel="noreferrer"
            style={{
              minWidth: kind === 'image' ? 220 : 260,
              maxWidth: kind === 'image' ? 220 : 260,
              textDecoration: 'none',
              color: 'inherit',
              borderRadius: 12,
              overflow: 'hidden',
              border: '0.5px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.04)',
              display: 'flex',
              flexDirection: 'column',
              flexShrink: 0,
            }}
          >
            {(item.thumbnail || (kind === 'image' && item.url)) && (
              <div
                style={{
                  height: kind === 'image' ? 148 : 132,
                  background: '#0c0d12',
                  overflow: 'hidden',
                }}
              >
                <img
                  src={item.thumbnail || item.url}
                  alt={title}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                  }}
                />
              </div>
            )}

            <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontSize: 13, lineHeight: 1.35, color: '#EDEDEF', fontWeight: 500 }}>
                {title}
              </div>
              {subtitle && (
                <div style={{ fontSize: 11, lineHeight: 1.4, color: '#8A8F98' }}>
                  {subtitle}
                </div>
              )}
              {item.snippet && (
                <div style={{ fontSize: 11, lineHeight: 1.4, color: '#B6BAC4' }}>
                  {item.snippet}
                </div>
              )}
            </div>
          </a>
        )
      })}
    </div>
  )
}

/* ── Rich Message Content ───────────────────────────────────────── */
function RichMessage({ content, isUser }) {
  if (typeof content !== 'string') return content

  const parts = content.split(/(!?\[.*?\]\(.*?\))/g)

  return (
    <div style={{ wordBreak: 'break-word' }}>
      {parts.map((part, i) => {
        const imgMatch = part.match(/^!\[(.*?)\]\((.*?)\)$/)
        if (imgMatch) {
          return (
            <div key={i} style={{ marginTop: 8, marginBottom: 8, overflow: 'hidden', borderRadius: 8 }}>
              <img 
                src={imgMatch[2]} 
                alt={imgMatch[1]} 
                style={{ width: '100%', display: 'block', borderRadius: 8 }} 
                loading="lazy"
              />
            </div>
          )
        }

        const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/)
        if (linkMatch) {
          const url = linkMatch[2]
          const label = linkMatch[1]
          
          if (url.includes('youtube.com') || url.includes('youtu.be')) {
            let videoId = ''
            if (url.includes('v=')) videoId = url.split('v=')[1]?.split('&')[0]
            else if (url.includes('youtu.be/')) videoId = url.split('youtu.be/')[1]?.split('?')[0]
            else if (url.includes('embed/')) videoId = url.split('embed/')[1]?.split('?')[0]

            if (videoId) {
              const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
              return (
                <div key={i} style={{ marginTop: 8, marginBottom: 8, borderRadius: 12, overflow: 'hidden', position: 'relative' }}>
                  <a href={url} target="_blank" rel="noreferrer" style={{ display: 'block', textDecoration: 'none' }}>
                    <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', background: '#111' }}>
                      <img 
                        src={thumbnailUrl} 
                        alt={label} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => {
                          e.target.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
                        }}
                      />
                      <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '50px',
                        height: '50px',
                        background: 'rgba(255, 0, 0, 0.8)',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
                        transition: 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                      }}>
                        <div style={{
                          width: 0,
                          height: 0,
                          borderTop: '10px solid transparent',
                          borderBottom: '10px solid transparent',
                          borderLeft: '18px solid #fff',
                          marginLeft: '4px'
                        }} />
                      </div>
                    </div>
                    {label && (
                      <div style={{
                        padding: '10px 14px',
                        background: 'rgba(255,255,255,0.03)',
                        borderTop: '1px solid rgba(255,255,255,0.05)',
                        fontSize: '0.85rem',
                        color: '#A5AFFF',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {label}
                      </div>
                    )}
                  </a>
                </div>
              )
            }
          }

          return (
            <a 
              key={i} 
              href={url} 
              target="_blank" 
              rel="noreferrer" 
              style={{ color: isUser ? '#fff' : '#A5AFFF', textDecoration: 'underline' }}
            >
              {label}
            </a>
          )
        }

        return <span key={i}>{part}</span>
      })}
    </div>
  )
}

/* ── Message bubble ─────────────────────────────────────────────── */
function MessageBubble({ message }) {
  const isUser = message.role === 'user'
  const [feedback, setFeedback] = useState(null)
  const searchResults = !isUser ? message?.meta?.search_results : null

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
          <RichMessage content={displayContent} isUser={isUser} />
        </div>

        {!isUser && searchResults && <SearchResultsRail results={searchResults} />}

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
  const currentSession = useWorkspaceStore((s) => s.currentSession)
  const addMessage    = useWorkspaceStore((s) => s.addMessage)
  const setSending    = useWorkspaceStore((s) => s.setSending)
  const setStructured = useWorkspaceStore((s) => s.setStructured)
  const setSessionMode = useWorkspaceStore((s) => s.setSessionMode)

  const [input, setInput] = useState('')
  const [attachedUrl, setAttachedUrl] = useState('')
  const bottomRef = useRef(null)

  // Auto-scroll on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isSending])

  const handleAttachUrl = useCallback(() => {
    const url = normalizeUrl(prompt("Paste your YouTube or Web URL:") || '')
    if (!url) return
    setAttachedUrl(url)
    const preview = buildResourcePreviewStructured(url)
    if (preview) {
      setStructured(preview)
      onNewStructured?.(preview)
    }
  }, [setStructured, onNewStructured])

  const sendMessage = useCallback(async (text) => {
    let trimmed = text.trim()
    const normalizedAttachedUrl = normalizeUrl(attachedUrl)
    const activeSessionId = sessionId
    if (!trimmed && normalizedAttachedUrl) {
      trimmed = "Can you help me with this attached link?"
    }
    if (!trimmed || !activeSessionId || isSending) return
    const outboundMessage = normalizedAttachedUrl
      ? `${trimmed}\n\nAttached URL: ${normalizedAttachedUrl}`
      : trimmed
    
    addMessage({
      id: crypto.randomUUID(),
      session_id: activeSessionId,
      role: 'user',
      content: outboundMessage,
      meta: {},
      created_at: new Date().toISOString(),
    })
    setInput('')
    setSending(true)
    try {
      const endpoint = normalizedAttachedUrl
        ? (isYoutubeUrl(normalizedAttachedUrl)
            ? `/sessions/${activeSessionId}/youtube/analyze`
            : `/sessions/${activeSessionId}/webpage/analyze`)
        : `/sessions/${activeSessionId}/chat`
      const payload = normalizedAttachedUrl
        ? { message: trimmed, url: normalizedAttachedUrl }
        : { message: outboundMessage, url: undefined }
      const data = await post(endpoint, payload)
      setSessionMode(activeSessionId, data.mode)
      addMessage(data.reply)
      setAttachedUrl('') // clear after send
      const nextStructured = isStructuredResponse(data.structured)
        ? data.structured
        : (isStructuredResponse(data.reply?.meta) ? data.reply.meta : null)
      if (nextStructured) {
        setStructured(nextStructured)
        onNewStructured?.(nextStructured)
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
  }, [sessionId, isSending, attachedUrl, currentSession, addMessage, setSending, setStructured, setSessionMode, onNewStructured])

  const suggestions = structured?.follow_up_suggestions ?? []
  const canSend     = (input.trim().length > 0 || attachedUrl) && !isSending

  return (
    <div
      style={{
        width: 380,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(180deg, #0d0d10 0%, #0a0a0d 100%)',
        borderLeft: '0.5px solid rgba(255,255,255,0.06)',
        borderRadius: '0 14px 14px 0',
        height: '100%',
      }}
    >
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
        <span
          style={{
            marginLeft: 'auto',
            fontSize: 11,
            padding: '2px 8px',
            borderRadius: 999,
            background: 'rgba(94,106,210,0.14)',
            border: '0.5px solid rgba(94,106,210,0.3)',
            color: '#A5AFFF',
          }}
        >
          {formatModeLabel(currentSession?.mode || 'general')}
        </span>
      </div>

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

      <div
        style={{
          padding: '12px 16px',
          borderTop: '0.5px solid rgba(255,255,255,0.06)',
          background: '#0a0a0d',
          position: 'relative'
        }}
      >
        {attachedUrl && (
          <div
            style={{
              marginBottom: 10,
              padding: '6px 12px',
              background: 'rgba(94,106,210,0.1)',
              border: '0.5px solid rgba(94,106,210,0.2)',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'between',
              gap: 8,
            }}
          >
            <Globe size={12} color="#5E6AD2" />
            <span style={{ fontSize: 11, color: '#5E6AD2', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {attachedUrl}
            </span>
            <button 
              onClick={() => setAttachedUrl('')}
              style={{ background: 'transparent', border: 'none', color: '#5E6AD2', cursor: 'pointer', padding: 2 }}
            >
              <X size={12} />
            </button>
          </div>
        )}

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
            onClick={handleAttachUrl}
            title="Attach URL"
            style={{
              height: 42,
              width: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              border: 'none',
              color: attachedUrl ? '#5E6AD2' : '#555555',
              cursor: 'pointer',
              transition: 'color 150ms ease',
            }}
          >
            <Paperclip size={16} />
          </button>

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
