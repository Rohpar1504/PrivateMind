const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000"

export async function ingestFile(formData: FormData) {
  const res = await fetch(`${BASE}/ingest`, { method: "POST", body: formData })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail ?? "Ingest failed")
  }
  return res.json()
}

export async function searchDocs(q: string, topK = 6) {
  const res = await fetch(`${BASE}/search?q=${encodeURIComponent(q)}&top_k=${topK}`)
  if (!res.ok) throw new Error("Search failed")
  return res.json()
}

export async function searchDocumentsByTitle(q: string) {
  const res = await fetch(`${BASE}/documents/search?q=${encodeURIComponent(q)}`)
  if (!res.ok) throw new Error("Document search failed")
  return res.json() as Promise<DocumentMeta[]>
}

export async function listDocuments() {
  const res = await fetch(`${BASE}/documents`)
  if (!res.ok) throw new Error("Failed to fetch documents")
  return res.json() as Promise<DocumentMeta[]>
}

export async function deleteDocument(id: string) {
  const res = await fetch(`${BASE}/documents/${id}`, { method: "DELETE" })
  if (!res.ok) throw new Error("Delete failed")
}

export function getDocumentFileUrl(id: string) {
  return `${BASE}/documents/${id}/file`
}

export async function streamChat(
  sessionId: string,
  message: string,
  onToken: (token: string) => void,
  onSources: (sources: string[]) => void,
  onDone: () => void,
  onError: (err: string) => void,
  signal?: AbortSignal,
) {
  try {
    const res = await fetch(`${BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, message }),
      signal,
    })
    if (!res.ok || !res.body) {
      onError('Chat request failed.')
      return
    }
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const payload = JSON.parse(line.slice(6))
        if (payload.type === 'token') onToken(payload.content)
        else if (payload.type === 'sources') onSources(payload.content)
        else if (payload.type === 'done') onDone()
      }
    }
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      onDone() // user stopped — treat as clean finish
      return
    }
    onError(e instanceof Error ? e.message : 'Unknown error')
  }
}

export async function clearChatSession(sessionId: string) {
  await fetch(`${BASE}/chat/${sessionId}`, { method: 'DELETE' })
}

export interface ReviewCard {
  sm2_id: string
  document_id: string
  document_title: string
  chunk_id: string | null
  chunk_text: string
  interval_days: number
  repetitions: number
  next_review_date: string
}

export interface ReviewStats {
  due: number
  reviewed_today: number
}

export async function getDueCards(): Promise<ReviewCard[]> {
  const res = await fetch(`${BASE}/review/due`)
  if (!res.ok) throw new Error('Failed to fetch due cards')
  return res.json()
}

export async function getCompletedCards(): Promise<ReviewCard[]> {
  const res = await fetch(`${BASE}/review/completed`)
  if (!res.ok) throw new Error('Failed to fetch completed cards')
  return res.json()
}

export async function getReviewStats(): Promise<ReviewStats> {
  const res = await fetch(`${BASE}/review/stats`)
  if (!res.ok) throw new Error('Failed to fetch review stats')
  return res.json()
}

export async function submitRating(sm2Id: string, rating: 'easy' | 'hard'): Promise<ReviewCard> {
  const res = await fetch(`${BASE}/review/${sm2Id}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rating }),
  })
  if (!res.ok) throw new Error('Failed to submit rating')
  return res.json()
}

export interface DocumentMeta {
  id: string
  source_path: string
  file_type: string
  title: string
  summary: string
  tags: string[]
  created_at: string
  updated_at: string
  last_accessed_at: string | null
  file_path: string | null
}
