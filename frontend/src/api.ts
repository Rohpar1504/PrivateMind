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
