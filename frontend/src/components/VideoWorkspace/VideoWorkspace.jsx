import { useState, useRef, useEffect, useMemo } from 'react'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { Send, Youtube, Loader2, MessageSquare, ArrowLeft, Info, RefreshCw } from 'lucide-react'
import useWorkspaceStore from '../../store/useWorkspaceStore'

const GENAI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY
const YT_API_KEY = import.meta.env.VITE_YT_API_KEY

export default function VideoWorkspace() {
  const [url, setUrl] = useState('')
  const [submittedUrl, setSubmittedUrl] = useState('')
  const [videoMeta, setVideoMeta] = useState(null)
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Paste a YouTube link below and we can start an AI-powered discussion using Gemini 3 Flash." }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const setAppMode = useWorkspaceStore((s) => s.setAppMode)
  const chatBottomRef = useRef(null)

  // Extract Video ID
  const videoId = useMemo(() => {
    if (!submittedUrl) return null
    const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/
    const match = submittedUrl.match(regExp)
    return (match && match[2].length === 11) ? match[2] : null
  }, [submittedUrl])

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const fetchVideoMetaData = async (videoUrl) => {
    try {
      const vidMatch = videoUrl.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([^& \n<]+)/)?.[1]
      if (!vidMatch || !YT_API_KEY) return null
      const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${vidMatch}&key=${YT_API_KEY}`)
      const data = await response.json()
      return data.items?.[0]?.snippet || null
    } catch (err) {
      console.error(err)
      return null
    }
  }

  const handleUrlSubmit = async (e) => {
    e.preventDefault()
    if (!url.trim()) return
    
    setLoading(true)
    const meta = await fetchVideoMetaData(url.trim())
    setVideoMeta(meta)
    setSubmittedUrl(url.trim())
    setLoading(false)

    setMessages(prev => [
      ...prev, 
      { role: 'assistant', content: `Video analyzed${meta ? `: "${meta.title}"` : ""}. What would you like to ask about this?` }
    ])
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMsg = input.trim()
    setInput('')
    
    const newMessages = [...messages, { role: 'user', content: userMsg }]
    setMessages(newMessages)
    setLoading(true)

    try {
      if (!GENAI_API_KEY) throw new Error("Missing Gemini API Key")
      const genAI = new GoogleGenerativeAI(GENAI_API_KEY)
      // Per User Request: Using Gemini 3 Flash Preview model
      const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' })

      // Build history correctly (skipping welcome)
      const firstUserIndex = newMessages.findIndex(m => m.role === 'user')
      let history = []
      if (firstUserIndex !== -1) {
          const historicalTurns = newMessages.slice(firstUserIndex, -1)
          history = historicalTurns.map(m => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.content }]
          }))
      }

      const chat = model.startChat({ history })

      // System-like context
      const context = videoMeta 
        ? `[VIDEO CONTEXT] TITLE: ${videoMeta.title}. DESCRIPTION: ${videoMeta.description.substring(0, 1500)}. URL: ${submittedUrl}. `
        : `[VIDEO CONTEXT] URL: ${submittedUrl}. `

      const result = await chat.sendMessage(`${context}\n\nUSER QUESTION: ${userMsg}`)
      const response = await result.response
      
      setMessages(prev => [...prev, { role: 'assistant', content: response.text() }])
    } catch (err) {
      console.error(err)
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${err.message}` }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      display: 'flex', height: '100%', width: '100%',
      background: '#0a0a0d', position: 'relative', overflow: 'hidden'
    }}>
      <button 
        onClick={() => setAppMode('normal')}
        style={{
          position: 'absolute', top: 16, left: 16, zIndex: 100,
          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 8, padding: '10px 18px', color: '#8A8F98', fontSize: 13,
          display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
          backdropFilter: 'blur(10px)'
        }}
      >
        <ArrowLeft size={16} /> Tutor Panel
      </button>

      {/* Main Content Area */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '60px 24px', borderRight: '1px solid rgba(255,255,255,0.06)',
        overflowY: 'auto'
      }}>
        {!submittedUrl || !videoId ? (
          <div style={{ maxWidth: 500, width: '100%', textAlign: 'center', marginTop: '15vh' }}>
            <div style={{
                width: 72, height: 72, borderRadius: 20, background: 'rgba(239, 68, 68, 0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 24px', color: '#EF4444'
            }}>
                <Youtube size={36} />
            </div>
            <h1 style={{ color: '#fff', fontSize: 32, fontWeight: 800, marginBottom: 12 }}>Analyze Video</h1>
            <p style={{ color: '#8A8F98', fontSize: 16, marginBottom: 32 }}>Enter a YouTube URL to begin an AI-powered discussion.</p>
            <form onSubmit={handleUrlSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <input 
                type="text"
                placeholder="https://www.youtube.com/watch?v=..."
                value={url}
                onChange={e => setUrl(e.target.value)}
                style={{
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 12, padding: '16px 20px', color: '#fff', fontSize: 15, outline: 'none'
                }}
              />
              <button 
                type="submit"
                disabled={loading}
                style={{
                  background: 'linear-gradient(135deg, #EF4444, #B91C1C)', color: '#fff', 
                  border: 'none', borderRadius: 12, padding: '16px', fontWeight: 700,
                  cursor: 'pointer', transition: 'all 0.2s'
                }}
              >
                {loading ? 'Processing...' : 'Analyze Video'}
              </button>
            </form>
          </div>
        ) : (
          <div style={{ width: '100%', maxWidth: 1000, display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ position: 'relative', width: '100%', paddingBottom: '56.25%', borderRadius: 20, overflow: 'hidden', background: '#000', boxShadow: '0 30px 60px rgba(0,0,0,0.5)' }}>
              <iframe
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&origin=${window.location.origin}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>

            <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 16, padding: 24, border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <Youtube size={18} color="#EF4444" />
                <h2 style={{ color: '#fff', fontSize: 18, fontWeight: 700 }}>{videoMeta?.title || 'Video Content'}</h2>
              </div>
              <p style={{ color: '#8A8F98', fontSize: 14, lineHeight: 1.6, maxHeight: 120, overflowY: 'auto' }}>
                {videoMeta?.description || 'Reading video description for context...'}
              </p>
              <div style={{ marginTop: 20, padding: '10px 16px', background: 'rgba(94,106,210,0.08)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
                <Info size={14} color="#5E6AD2" />
                <span style={{ fontSize: 12, color: '#A5AFFF' }}>
                  Grounded by Metadata & Gemini 3 Flash.
                </span>
              </div>
            </div>
            
            <button 
              onClick={() => { setSubmittedUrl(''); setVideoMeta(null); }}
              style={{ alignSelf: 'center', background: 'transparent', border: 'none', color: '#8A8F98', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <RefreshCw size={14} /> Paste Another Link
            </button>
          </div>
        )}
      </div>

      {/* Sidebar Chat */}
      <div style={{
        width: 420, display: 'flex', flexDirection: 'column',
        background: 'linear-gradient(180deg, #0d0d10 0%, #030305 100%)',
        borderLeft: '1px solid rgba(255,255,255,0.06)'
      }}>
        <div style={{ padding: 24, borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <MessageSquare size={18} color="#5E6AD2" />
          <span style={{ color: '#fff', fontWeight: 600, fontSize: 16 }}>Discussion</span>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {messages.map((m, i) => (
            <div 
              key={i}
              style={{
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '90%',
                background: m.role === 'user' ? '#5E6AD2' : 'rgba(255,255,255,0.04)',
                color: '#fff', padding: '14px 18px', borderRadius: 18,
                fontSize: 14, lineHeight: 1.6,
                borderBottomRightRadius: m.role === 'user' ? 2 : 18,
                borderBottomLeftRadius: m.role === 'assistant' ? 2 : 18
              }}
            >
              {m.content}
            </div>
          ))}
          {loading && (
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', color: '#8A8F98', fontSize: 13, paddingLeft: 8 }}>
              <div className="dot-typing" />
              <span>Analyzing...</span>
              <style>{`.dot-typing { width: 4px; height: 4px; border-radius: 2px; background-color: #5E6AD2; animation: dotTyping 1.5s infinite linear; } @keyframes dotTyping { 0% { box-shadow: 10px 0 0 -2px, 20px 0 0 -2px, 30px 0 0 -2px; } 30% { box-shadow: 10px -2px 0 0, 20px 0 0 -2px, 30px 0 0 -2px; } 60% { box-shadow: 10px 0 0 -2px, 20px -2px 0 0, 30px 0 0 -2px; } 90% { box-shadow: 10px 0 0 -2px, 20px 0 0 -2px, 30px -2px 0 0; } }`}</style>
            </div>
          )}
          <div ref={chatBottomRef} />
        </div>

        <div style={{ padding: 24 }}>
          <form onSubmit={handleSendMessage} style={{
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 16, display: 'flex', alignItems: 'center', padding: '10px 10px 10px 20px'
          }}>
            <textarea
              rows={1}
              placeholder="Ask a question..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(e); } }}
              style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: 14, outline: 'none', flex: 1, resize: 'none' }}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              style={{
                width: 36, height: 36, borderRadius: 10, background: input.trim() ? '#5E6AD2' : 'transparent',
                border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', opacity: input.trim() ? 1 : 0.3
              }}
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
