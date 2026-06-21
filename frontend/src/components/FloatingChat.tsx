import { useEffect, useRef, useState } from 'react'
import type { ChatSession, Message } from '../types/chat'
import './FloatingChat.css'

interface Props {
  activeSession: ChatSession
  activeId: string
  streamingData: Map<string, Message[]>
  activeStreams: Map<string, AbortController>
  onSend: (sessionId: string, text: string, baseMessages: Message[]) => void
  onStop: (sessionId: string) => void
  onNewChat: () => string
}

export default function FloatingChat({
  activeSession, activeId, streamingData, activeStreams, onSend, onStop, onNewChat,
}: Props) {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  // Messages to display: live streaming data if available, else persisted session messages
  const messages = streamingData.get(activeId) ?? activeSession.messages
  const busy = activeStreams.has(activeId)
  const recentMessages = messages.slice(-8)

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  // Auto-open panel when a reply arrives while closed
  useEffect(() => {
    if (!busy && messages.length > 0 && !open) {
      // Do nothing — user can click bubble to open; we only auto-open if they had it open
    }
  }, [busy])

  const handleSend = () => {
    const text = input.trim()
    if (!text || busy) return
    setInput('')
    onSend(activeId, text, messages)
  }

  const handleNewChat = () => {
    onNewChat()
  }

  return (
    <div className="floating-chat">
      {open && (
        <div className="floating-panel">
          <div className="floating-header">
            <span className="floating-title">PrivateMind</span>
            <div className="floating-header-actions">
              <button className="floating-new-btn" onClick={handleNewChat} title="New chat">✦</button>
              <button className="floating-close-btn" onClick={() => setOpen(false)}>✕</button>
            </div>
          </div>

          <div className="floating-messages">
            {recentMessages.length === 0 ? (
              <div className="floating-empty">Ask anything about your notes.</div>
            ) : (
              recentMessages.map((m, i) => (
                <div key={i} className={`floating-bubble ${m.role}`}>
                  <p>
                    {m.content || (m.streaming ? <span className="typing-indicator">●●●</span> : '')}
                  </p>
                  {m.sources && m.sources.length > 0 && (
                    <div className="floating-sources">
                      {m.sources.map((s, j) => <span key={j} className="source-chip">{s}</span>)}
                    </div>
                  )}
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>

          <div className="floating-input-row">
            <input
              className="floating-input"
              type="text"
              placeholder="Ask a question…"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !busy && handleSend()}
              disabled={busy}
            />
            {busy ? (
              <button className="floating-stop-btn" onClick={() => onStop(activeId)}>■</button>
            ) : (
              <button className="floating-send-btn" onClick={handleSend} disabled={!input.trim()}>↑</button>
            )}
          </div>
        </div>
      )}

      <button
        className={`floating-bubble-btn ${busy ? 'pulsing' : ''}`}
        onClick={() => setOpen(o => !o)}
        title="Open chat"
      >
        💬
      </button>
    </div>
  )
}
