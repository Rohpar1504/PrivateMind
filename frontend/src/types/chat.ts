export interface Message {
  role: 'user' | 'assistant'
  content: string
  sources?: string[]
  streaming?: boolean
}

export interface ChatSession {
  id: string
  title: string
  messages: Message[]
  createdAt: string
}
