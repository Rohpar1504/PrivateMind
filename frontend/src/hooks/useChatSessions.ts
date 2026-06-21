import { useCallback, useEffect, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import type { ChatSession, Message } from '../types/chat'

const STORAGE_KEY = 'pm_chat_sessions'

function load(): ChatSession[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
  } catch {
    return []
  }
}

function makeSession(): ChatSession {
  return { id: uuidv4(), title: 'New chat', messages: [], createdAt: new Date().toISOString() }
}

export function useChatSessions() {
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const saved = load()
    return saved.length > 0 ? saved : [makeSession()]
  })

  const [activeId, setActiveId] = useState<string>(() => {
    const saved = load()
    return saved.length > 0 ? saved[0].id : ''
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))
  }, [sessions])

  useEffect(() => {
    if (sessions.length > 0 && !sessions.find(s => s.id === activeId)) {
      setActiveId(sessions[0].id)
    }
  }, [sessions, activeId])

  const activeSession = sessions.find(s => s.id === activeId) ?? sessions[0]

  const newChat = useCallback((): string => {
    const s = makeSession()
    setSessions(prev => [s, ...prev])
    setActiveId(s.id)
    return s.id
  }, [])

  const switchSession = useCallback((id: string) => setActiveId(id), [])

  // Saves messages AND moves the session to the top of the list
  const saveMessages = useCallback((sessionId: string, messages: Message[]) => {
    setSessions(prev => {
      const session = prev.find(s => s.id === sessionId)
      if (!session) return prev
      const firstUser = messages.find(m => m.role === 'user')
      const title = firstUser ? firstUser.content.slice(0, 45) : session.title
      const updated = { ...session, messages, title }
      return [updated, ...prev.filter(s => s.id !== sessionId)]
    })
  }, [])

  const deleteSession = useCallback(
    (id: string) => {
      setSessions(prev => {
        const next = prev.filter(s => s.id !== id)
        if (next.length === 0) {
          const fresh = makeSession()
          setActiveId(fresh.id)
          return [fresh]
        }
        if (id === activeId) setActiveId(next[0].id)
        return next
      })
    },
    [activeId],
  )

  return { sessions, activeSession, activeId, newChat, switchSession, saveMessages, deleteSession }
}
