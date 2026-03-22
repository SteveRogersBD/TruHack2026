/**
 * TutorPanel — right-side chat interface with messages, follow-up chips,
 * and a textarea input.
 */

import {
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import { post } from '../../api/client.js';
import useWorkspaceStore from '../../store/useWorkspaceStore.js';
import { Globe, X, Paperclip } from 'lucide-react';
import { formatModeLabel, inferChatMode, isYoutubeUrl, normalizeUrl } from '../../utils/chatMode.js';
import { buildResourcePreviewStructured } from '../../utils/resourcePreview.js';
import { isStructuredResponse } from '../../utils/structured.js';

/* ------------------------------------------------------------------ */
/* Thinking indicator                                                    */
/* ------------------------------------------------------------------ */

function ThinkingDots() {
  return (
    <div className="flex items-end gap-1 px-4 py-3">
      <div
        className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs"
        style={{ background: 'rgba(138,149,255,0.2)', color: '#8a95ff' }}
        aria-hidden="true"
      >
        <span className="icon text-base leading-none">auto_awesome</span>
      </div>
      <div
        className="px-3 py-2.5 rounded-2xl rounded-bl-sm flex items-center gap-1"
        style={{ background: '#141f38', border: '1px solid rgba(64,72,93,0.4)' }}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-on-surface-variant"
            style={{
              animation: 'dotBounce 1.2s ease-in-out infinite',
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes dotBounce {
          0%, 100% { transform: translateY(0); opacity: 0.4; }
          50% { transform: translateY(-5px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Timestamp tooltip helper                                              */
/* ------------------------------------------------------------------ */

function formatTime(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

/* ------------------------------------------------------------------ */
/* Message bubble                                                        */
/* ------------------------------------------------------------------ */

function MessageBubble({ message }) {
  const isUser = message.role === 'user';
  const [showTime, setShowTime] = useState(false);

  // Extract speech text from assistant messages that might be JSON
  let displayContent = message.content;
  if (!isUser && typeof message.content === 'string') {
    try {
      const parsed = JSON.parse(message.content);
      if (parsed?.speech) displayContent = parsed.speech;
    } catch {
      // content is plain text
    }
  }

  return (
    <div
      className={`flex items-end gap-2 px-4 py-1 transition-all duration-150 ${isUser ? 'flex-row-reverse' : 'flex-row'
        }`}
      onMouseEnter={() => setShowTime(true)}
      onMouseLeave={() => setShowTime(false)}
    >
      {/* Avatar dot */}
      {!isUser && (
        <div
          className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs mb-1"
          style={{
            background: 'rgba(138,149,255,0.2)',
            color: '#8a95ff',
            border: '1px solid rgba(138,149,255,0.25)',
          }}
          aria-hidden="true"
        >
          <span className="icon text-sm leading-none">auto_awesome</span>
        </div>
      )}

      <div className={`flex flex-col gap-0.5 max-w-[75%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`px-3.5 py-2.5 text-sm leading-relaxed ${isUser
              ? 'rounded-2xl rounded-br-sm text-white'
              : 'rounded-2xl rounded-bl-sm text-on-background'
            }`}
          style={
            isUser
              ? {
                background: 'linear-gradient(135deg, #3bbffa, #8a95ff)',
              }
              : {
                background: '#141f38',
                border: '1px solid rgba(64,72,93,0.4)',
              }
          }
        >
          {displayContent}
        </div>

        {/* Timestamp on hover */}
        <span
          className={`text-xs text-on-surface-variant/60 transition-opacity duration-150 ${showTime ? 'opacity-100' : 'opacity-0'
            }`}
        >
          {formatTime(message.created_at)}
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Follow-up suggestion chips                                            */
/* ------------------------------------------------------------------ */

function SuggestionChips({ suggestions, onSelect, disabled }) {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div
      className="px-4 py-2 flex items-center gap-2 overflow-x-auto flex-shrink-0"
      style={{ borderTop: '1px solid rgba(64,72,93,0.3)' }}
    >
      <span className="icon text-sm text-on-surface-variant flex-shrink-0">
        lightbulb
      </span>
      {suggestions.map((text, idx) => (
        <button
          key={idx}
          type="button"
          onClick={() => onSelect(text)}
          disabled={disabled}
          className="flex-shrink-0 text-xs px-3 py-1.5 rounded-full border transition-all duration-200 hover:border-primary/60 hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: 'rgba(59,191,250,0.06)',
            borderColor: 'rgba(59,191,250,0.25)',
            color: '#a3aac4',
            whiteSpace: 'nowrap',
          }}
        >
          {text}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main TutorPanel                                                       */
/* ------------------------------------------------------------------ */

/**
 * @param {{ sessionId: string, onNewStructured: (s: object) => void }} props
 */
export default function TutorPanel({ sessionId, onNewStructured }) {
  const messages = useWorkspaceStore((s) => s.messages);
  const isSending = useWorkspaceStore((s) => s.isSending);
  const structured = useWorkspaceStore((s) => s.structured);
  const currentSession = useWorkspaceStore((s) => s.currentSession);
  const addMessage = useWorkspaceStore((s) => s.addMessage);
  const setSending = useWorkspaceStore((s) => s.setSending);
  const setStructured = useWorkspaceStore((s) => s.setStructured);
  const setSessionMode = useWorkspaceStore((s) => s.setSessionMode);

  const [input, setInput] = useState('');
  const [attachedUrl, setAttachedUrl] = useState('');
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const lineHeight = 20;
    const maxHeight = lineHeight * 4 + 16; // 4 rows + padding
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
  }, [input]);

  const handleAttachUrl = useCallback(() => {
    const url = normalizeUrl(prompt("Paste your YouTube or Web URL:") || '');
    if (!url) return;
    setAttachedUrl(url);
    const preview = buildResourcePreviewStructured(url);
    if (preview) {
      setStructured(preview);
      if (onNewStructured) onNewStructured(preview);
    }
  }, [setStructured, onNewStructured]);

  const sendMessage = useCallback(
    async (text) => {
      let trimmed = text.trim();
      const normalizedAttachedUrl = normalizeUrl(attachedUrl);
      const activeSessionId = sessionId;
      if (!trimmed && normalizedAttachedUrl) {
        trimmed = "Can you help me with this attached link?";
      }
      if (!trimmed || !activeSessionId || isSending) return;
      const outboundMessage = normalizedAttachedUrl
        ? `${trimmed}\n\nAttached URL: ${normalizedAttachedUrl}`
        : trimmed;
      const mode = inferChatMode({
        text: trimmed,
        attachedUrl: normalizedAttachedUrl,
        currentMode: currentSession?.mode,
        currentCode: currentSession?.current_code,
      });

      // Optimistically add user message
      const tempUserMsg = {
        id: crypto.randomUUID(),
        session_id: activeSessionId,
        role: 'user',
        content: outboundMessage,
        meta: {},
        created_at: new Date().toISOString(),
      };
      addMessage(tempUserMsg);
      setInput('');
      setSending(true);

      try {
        const endpoint = normalizedAttachedUrl
          ? (isYoutubeUrl(normalizedAttachedUrl)
              ? `/sessions/${activeSessionId}/youtube/analyze`
              : `/sessions/${activeSessionId}/webpage/analyze`)
          : `/sessions/${activeSessionId}/chat`;
        const payload = normalizedAttachedUrl
          ? { message: trimmed, url: normalizedAttachedUrl }
          : { message: outboundMessage, url: undefined, mode };
        const data = await post(endpoint, payload);

        setSessionMode(activeSessionId, data.mode);
        addMessage(data.reply);
        setAttachedUrl('');

        const nextStructured = isStructuredResponse(data.structured)
          ? data.structured
          : (isStructuredResponse(data.reply?.meta) ? data.reply.meta : null);

        if (nextStructured) {
          setStructured(nextStructured);
          if (onNewStructured) onNewStructured(nextStructured);
        }
      } catch (err) {
        // Add error pseudo-message
        addMessage({
          id: crypto.randomUUID(),
          session_id: sessionId,
          role: 'assistant',
          content: `Sorry, I encountered an error: ${err.message}`,
          meta: {},
          created_at: new Date().toISOString(),
        });
      } finally {
        setSending(false);
      }
    },
    [sessionId, isSending, attachedUrl, currentSession, addMessage, setSending, setStructured, setSessionMode, onNewStructured]
  );

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  const suggestions = structured?.follow_up_suggestions || [];
  const canSend = (input.trim().length > 0 || attachedUrl) && !isSending;

  return (
    <div
      className="flex flex-col h-full"
      style={{
        background: '#0f1930',
        borderLeft: '1px solid rgba(64,72,93,0.4)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-4 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(64,72,93,0.4)' }}
      >
        <span className="icon text-primary text-xl leading-none">forum</span>
        <span className="text-sm font-semibold text-on-background">
          Tutor Chat
        </span>
        <span className="ml-auto text-xs px-2 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary">
          {formatModeLabel(currentSession?.mode || 'general')}
        </span>
        {isSending && (
          <span className="text-xs text-on-surface-variant animate-pulse flex items-center gap-1">
            <span className="icon text-sm">psychology</span>
            Thinking…
          </span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-2">
        {messages.length === 0 && !isSending && (
          <div className="flex flex-col items-center justify-center h-full text-center px-6 opacity-60">
            <span className="icon text-4xl text-on-surface-variant mb-3">
              chat_bubble_outline
            </span>
            <p className="text-sm text-on-surface-variant">
              No messages yet. Ask the tutor anything!
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {isSending && <ThinkingDots />}

        <div ref={bottomRef} />
      </div>

      {/* Follow-up suggestions */}
      <SuggestionChips
        suggestions={suggestions}
        onSelect={(text) => sendMessage(text)}
        disabled={isSending}
      />

      {/* Attached URL Preview */}
      {attachedUrl && (
        <div className="px-4 py-2 flex items-center gap-2 bg-primary/10 border-t border-primary/20">
          <Globe size={14} className="text-primary" />
          <span className="text-xs text-primary flex-1 truncate">{attachedUrl}</span>
          <button onClick={() => setAttachedUrl('')} className="text-primary hover:text-primary-light">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Input area */}
      <div
        className="flex-shrink-0 p-3"
        style={{ borderTop: '1px solid rgba(64,72,93,0.4)' }}
      >
        <div
          className="flex items-end gap-2 rounded-xl px-3 py-2"
          style={{
            background: '#141f38',
            border: '1px solid rgba(64,72,93,0.5)',
            transition: 'border-color 0.2s',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'rgba(59,191,250,0.4)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'rgba(64,72,93,0.5)';
          }}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask the tutor a question… (Shift+Enter for newline)"
            rows={1}
            disabled={!sessionId || isSending}
            className="flex-1 bg-transparent text-sm text-on-background placeholder-on-surface-variant resize-none outline-none leading-5 disabled:opacity-50"
            style={{ maxHeight: '80px', overflowY: 'auto' }}
            aria-label="Chat input"
          />

          <button
            type="button"
            onClick={handleAttachUrl}
            title="Attach URL"
            className={`p-2 rounded-lg transition-colors ${attachedUrl ? 'text-primary bg-primary/10' : 'text-on-surface-variant hover:bg-white/5'}`}
          >
            <Paperclip size={18} />
          </button>

          <button
            type="button"
            onClick={() => sendMessage(input)}
            disabled={!canSend || !sessionId}
            className={
              'flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 ' +
              (canSend && sessionId
                ? 'hover:brightness-110 active:scale-90'
                : 'opacity-30 cursor-not-allowed')
            }
            style={
              canSend && sessionId
                ? {
                  background: 'linear-gradient(135deg, #3bbffa, #8a95ff)',
                  color: '#fff',
                }
                : {
                  background: 'rgba(64,72,93,0.3)',
                  color: '#a3aac4',
                }
            }
            aria-label="Send message"
          >
            <span className="icon text-lg leading-none">send</span>
          </button>
        </div>

        <p className="text-xs text-on-surface-variant/40 mt-1 text-center">
          Enter to send &middot; Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
