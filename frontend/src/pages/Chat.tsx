import { useEffect, useRef, useState } from 'react'
import type { ChatSession, Message } from '../types/chat'
import './Chat.css'

interface Props {
  sessions: ChatSession[]
  activeSession: ChatSession
  activeId: string
  streamingData: Map<string, Message[]>
  activeStreams: Map<string, AbortController>
  onSend: (sessionId: string, text: string, baseMessages: Message[]) => void
  onStop: (sessionId: string) => void
  onNewChat: () => string
  onSwitch: (id: string) => void
  onClearSession: (sessionId: string) => Promise<void>
}

export default function Chat({
  sessions, activeSession, activeId, streamingData, activeStreams,
  onSend, onStop, onNewChat, onSwitch, onClearSession,
}: Props) {
  const [input, setInput] = useState('')
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editText, setEditText] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  // Messages to display: live streaming data if available, else persisted session messages
  const messages = streamingData.get(activeId) ?? activeSession.messages
  const busy = activeStreams.has(activeId)

  // Reset edit state when switching sessions
  useEffect(() => {
    setEditingIndex(null)
    setEditText('')
    setInput('')
  }, [activeId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = () => {
    const text = input.trim()
    if (!text || busy) return
    setInput('')
    onSend(activeId, text, messages)
  }

  const handleNewChat = () => {
    onNewChat()
  }

  const startEdit = (index: number) => {
    setEditingIndex(index)
    setEditText(messages[index].content)
  }

  const cancelEdit = () => {
    setEditingIndex(null)
    setEditText('')
  }

  const confirmEdit = async () => {
    if (editingIndex === null || !editText.trim()) return
    const trimmed = editText.trim()
    const base = messages.slice(0, editingIndex)
    setEditingIndex(null)
    setEditText('')
    // Clear backend session memory so context stays consistent with visible messages
    await onClearSession(activeId)
    onSend(activeId, trimmed, base)
  }

  return (
    <div className="chat-page">
      {/* Session sidebar */}
      <aside className="chat-sidebar">
        <button className="new-chat-btn" onClick={handleNewChat}>
          + New chat
        </button>
        <div className="session-list">
          {sessions
            .filter(s => s.messages.length > 0 || s.id === activeId)
            .map(s => (
              <button
                key={s.id}
                className={`session-item ${s.id === activeId ? 'active' : ''}`}
                onClick={() => onSwitch(s.id)}
                title={s.title}
              >
                <span className="session-title">{s.title}</span>
                <div className="session-meta">
                  <span className="session-date">
                    {new Date(s.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>
                  {activeStreams.has(s.id) && <span className="session-stream-dot" />}
                </div>
              </button>
            ))}
        </div>
      </aside>

      {/* Main chat area */}
      <div className="chat-main">
        <div className="chat-window">
          {messages.length === 0 ? (
            <div className="chat-empty">Ask anything about your ingested documents.</div>
          ) : (
            messages.map((m, i) => (
              <div key={i} className={`chat-bubble ${m.role}`}>
                <div className="bubble-meta">
                  <span className="bubble-role">{m.role === 'user' ? 'You' : 'PrivateMind'}</span>
                </div>

                {editingIndex === i ? (
                  <div className="edit-area">
                    <textarea
                      className="edit-input"
                      value={editText}
                      onChange={e => setEditText(e.target.value)}
                      rows={3}
                      autoFocus
                    />
                    <div className="edit-actions">
                      <button className="edit-confirm-btn" onClick={confirmEdit}>Resend</button>
                      <button className="edit-cancel-btn" onClick={cancelEdit}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p>
                      {m.content || (m.streaming ? <span className="typing-indicator">●●●</span> : '')}
                    </p>
                    {/* Pencil edit button sits below the bubble */}
                    {m.role === 'user' && !busy && editingIndex === null && (
                      <button className="edit-btn" onClick={() => startEdit(i)} title="Edit message">
                        ✎ Edit
                      </button>
                    )}
                  </>
                )}

                {m.sources && m.sources.length > 0 && (
                  <div className="source-list">
                    <span className="source-label">Sources:</span>
                    {m.sources.map((s, j) => (
                      <span key={j} className="source-chip">{s}</span>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        <div className="chat-input-row">
          <input
            className="chat-input"
            type="text"
            placeholder="Ask a question…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !busy && handleSend()}
            disabled={busy || editingIndex !== null}
          />
          {busy ? (
            <button className="stop-btn" onClick={() => onStop(activeId)}>■ Stop</button>
          ) : (
            <button className="send-btn" onClick={handleSend} disabled={!input.trim() || editingIndex !== null}>
              Send
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
