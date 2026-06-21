import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import './Chat.css'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const SESSION_ID = uuidv4()

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')

  const handleSend = () => {
    if (!input.trim()) return
    setMessages(prev => [...prev, { role: 'user', content: input }])
    setInput('')
    // TODO (M2): POST /chat with session_id + message, stream response
    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Chat is not yet implemented — coming in M2.' }])
    }, 300)
  }

  return (
    <div className="chat-page">
      <div className="page-header">
        <h1 className="page-title">Chat</h1>
        <p className="page-subtitle">Ask questions grounded in your notes. Session ID: <code>{SESSION_ID.slice(0, 8)}…</code></p>
      </div>

      <div className="chat-window">
        {messages.length === 0 ? (
          <div className="chat-empty">Ask anything about your ingested documents.</div>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={`chat-bubble ${m.role}`}>
              <span className="bubble-role">{m.role === 'user' ? 'You' : 'PrivateMind'}</span>
              <p>{m.content}</p>
            </div>
          ))
        )}
      </div>

      <div className="chat-input-row">
        <input
          className="chat-input"
          type="text"
          placeholder="Ask a question…"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
        />
        <button className="send-btn" onClick={handleSend} disabled={!input.trim()}>Send</button>
      </div>
    </div>
  )
}
