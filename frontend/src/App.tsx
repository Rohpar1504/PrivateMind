import { useCallback, useEffect, useRef, useState } from 'react'
import { NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'
import FloatingChat from './components/FloatingChat'
import { useChatSessions } from './hooks/useChatSessions'
import { type AppMode, clearMode, getMode } from './hooks/useMode'
import { clearChatSession, streamChat } from './api'
import type { Message } from './types/chat'
import AddDocument from './pages/AddDocument'
import Chat from './pages/Chat'
import Home from './pages/Home'
import Onboarding from './pages/Onboarding'
import Review from './pages/Review'
import Search from './pages/Search'
import Settings from './pages/Settings'
import Todo from './pages/Todo'
import './App.css'

interface Notification {
  id: string
  sessionId: string
  title: string
}

interface NavItem {
  to: string
  label: string
  end?: boolean
}

function getNavItems(mode: AppMode): NavItem[] {
  const base: NavItem[] = [
    { to: '/', label: 'Home', end: true },
    { to: '/add', label: 'Add Document' },
    { to: '/search', label: 'Search' },
    { to: '/chat', label: 'Chat' },
  ]
  if (mode === 'educational') base.push({ to: '/review', label: 'Review' })
  if (mode === 'business') base.push({ to: '/todo', label: 'To-Do' })
  base.push({ to: '/settings', label: 'Settings' })
  return base
}

export default function App() {
  const location = useLocation()
  const navigate = useNavigate()

  const [mode, setModeState] = useState<AppMode | null>(() => getMode())

  const { sessions, activeSession, activeId, newChat, switchSession, saveMessages } =
    useChatSessions()

  const [streamingData, setStreamingData] = useState<Map<string, Message[]>>(new Map())
  const [activeStreams, setActiveStreams] = useState<Map<string, AbortController>>(new Map())
  const [notifications, setNotifications] = useState<Notification[]>([])

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

  const handleOnboardingDone = (chosen: AppMode) => {
    setModeState(chosen)
  }

  const handleResetMode = () => {
    clearMode()
    setModeState(null)
  }

  const onChatPage = location.pathname === '/chat'

  // Show onboarding until mode is chosen
  if (!mode) {
    return <Onboarding onDone={handleOnboardingDone} />
  }

  const navItems = getNavItems(mode)

  return (
    <div className="app-shell">
      <nav className="sidebar">
        <div className="sidebar-logo">PrivateMind</div>
        <ul className="sidebar-nav">
          {navItems.map(({ to, label, end }) => (
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
        <div className="sidebar-mode-badge">
          {mode.charAt(0).toUpperCase() + mode.slice(1)} mode
        </div>
      </nav>

      <main className="main-content">
        <Routes>
          <Route path="/" element={<Home mode={mode} />} />
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
          {mode === 'educational' && <Route path="/review" element={<Review />} />}
          {mode === 'business' && <Route path="/todo" element={<Todo />} />}
          <Route path="/settings" element={<Settings mode={mode} onResetMode={handleResetMode} />} />
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
