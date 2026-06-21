import { useCallback, useEffect, useRef, useState } from 'react'
import { NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'
import FloatingChat from './components/FloatingChat'
import { useChatSessions } from './hooks/useChatSessions'
import { clearChatSession, streamChat } from './api'
import type { Message } from './types/chat'
import AddDocument from './pages/AddDocument'
import Chat from './pages/Chat'
import Home from './pages/Home'
import Review from './pages/Review'
import Search from './pages/Search'
import Settings from './pages/Settings'
import './App.css'

interface Notification {
  id: string
  sessionId: string
  title: string
}

const NAV_ITEMS = [
  { to: '/', label: 'Home', end: true },
  { to: '/add', label: 'Add Document' },
  { to: '/search', label: 'Search' },
  { to: '/chat', label: 'Chat' },
  { to: '/review', label: 'Review' },
  { to: '/settings', label: 'Settings' },
]

export default function App() {
  const location = useLocation()
  const navigate = useNavigate()
  const { sessions, activeSession, activeId, newChat, switchSession, saveMessages } =
    useChatSessions()

  // Live messages while streaming — keyed by sessionId
  const [streamingData, setStreamingData] = useState<Map<string, Message[]>>(new Map())
  // Active abort controllers — keyed by sessionId
  const [activeStreams, setActiveStreams] = useState<Map<string, AbortController>>(new Map())
  // Toast notifications for background stream completions
  const [notifications, setNotifications] = useState<Notification[]>([])

  // Refs so async callbacks always see current values without stale closures
  const activeIdRef = useRef(activeId)
  useEffect(() => { activeIdRef.current = activeId }, [activeId])
  const sessionsRef = useRef(sessions)
  useEffect(() => { sessionsRef.current = sessions }, [sessions])

  const sendMessage = useCallback(
    async (sessionId: string, text: string, baseMessages: Message[]) => {
      if (activeStreams.has(sessionId)) return

      const withUser: Message[] = [...baseMessages, { role: 'user', content: text }]
      const withAssistant: Message[] = [
        ...withUser,
        { role: 'assistant', content: '', streaming: true },
      ]

      setStreamingData(prev => new Map(prev).set(sessionId, withAssistant))

      const controller = new AbortController()
      setActiveStreams(prev => new Map(prev).set(sessionId, controller))

      // Accumulate tokens in a local variable — avoids stale state in callbacks
      let current = withAssistant

      await streamChat(
        sessionId,
        text,
        (token) => {
          current = current.map((m, i) =>
            i === current.length - 1 && m.role === 'assistant'
              ? { ...m, content: m.content + token }
              : m,
          )
          setStreamingData(prev => new Map(prev).set(sessionId, current))
        },
        (sources) => {
          current = current.map((m, i) =>
            i === current.length - 1 && m.role === 'assistant' ? { ...m, sources } : m,
          )
          setStreamingData(prev => new Map(prev).set(sessionId, current))
        },
        () => {
          const final = current.map((m, i) =>
            i === current.length - 1 && m.role === 'assistant'
              ? { ...m, streaming: false }
              : m,
          )
          saveMessages(sessionId, final)
          setStreamingData(prev => { const n = new Map(prev); n.delete(sessionId); return n })
          setActiveStreams(prev => { const n = new Map(prev); n.delete(sessionId); return n })

          // Notify if the stream finished in the background
          if (sessionId !== activeIdRef.current) {
            const session = sessionsRef.current.find(s => s.id === sessionId)
            const title = session?.title ?? 'Chat'
            const notifId = uuidv4()
            setNotifications(prev => [...prev, { id: notifId, sessionId, title }])
            setTimeout(
              () => setNotifications(prev => prev.filter(n => n.id !== notifId)),
              6000,
            )
          }
        },
        (err) => {
          const final = current.map((m, i) =>
            i === current.length - 1 && m.role === 'assistant'
              ? { ...m, content: `Error: ${err}`, streaming: false }
              : m,
          )
          saveMessages(sessionId, final)
          setStreamingData(prev => { const n = new Map(prev); n.delete(sessionId); return n })
          setActiveStreams(prev => { const n = new Map(prev); n.delete(sessionId); return n })
        },
        controller.signal,
      )
    },
    [activeStreams, saveMessages],
  )

  const stopStream = useCallback((sessionId: string) => {
    activeStreams.get(sessionId)?.abort()
  }, [activeStreams])

  const handleNotificationClick = (notif: Notification) => {
    switchSession(notif.sessionId)
    navigate('/chat')
    setNotifications(prev => prev.filter(n => n.id !== notif.id))
  }

  const onChatPage = location.pathname === '/chat'

  return (
    <div className="app-shell">
      <nav className="sidebar">
        <div className="sidebar-logo">PrivateMind</div>
        <ul className="sidebar-nav">
          {NAV_ITEMS.map(({ to, label, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
              >
                {label}
                {label === 'Chat' && activeStreams.size > 0 && (
                  <span className="nav-stream-dot" title="Generating…" />
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <main className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/add" element={<AddDocument />} />
          <Route path="/search" element={<Search />} />
          <Route
            path="/chat"
            element={
              <Chat
                sessions={sessions}
                activeSession={activeSession}
                activeId={activeId}
                streamingData={streamingData}
                activeStreams={activeStreams}
                onSend={sendMessage}
                onStop={stopStream}
                onNewChat={newChat}
                onSwitch={switchSession}
                onClearSession={clearChatSession}
              />
            }
          />
          <Route path="/review" element={<Review />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>

      {!onChatPage && (
        <FloatingChat
          activeSession={activeSession}
          activeId={activeId}
          streamingData={streamingData}
          activeStreams={activeStreams}
          onSend={sendMessage}
          onStop={stopStream}
          onNewChat={newChat}
        />
      )}

      {/* Toast notifications for background completions */}
      <div className="notif-stack">
        {notifications.map(notif => (
          <button
            key={notif.id}
            className="notif-toast"
            onClick={() => handleNotificationClick(notif)}
          >
            <span className="notif-dot" />
            <span className="notif-text">
              Reply ready in <strong>{notif.title}</strong>
            </span>
            <span className="notif-arrow">→</span>
          </button>
        ))}
      </div>
    </div>
  )
}
