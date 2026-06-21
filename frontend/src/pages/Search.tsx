import { useState } from 'react'
import { DocumentMeta, getDocumentFileUrl, searchDocumentsByTitle, searchDocs } from '../api'
import './Search.css'

type SearchMode = 'chunk' | 'document'

interface ChunkResult {
  document_id: string
  document_title: string
  chunk_text: string
  score: number
}

export default function Search() {
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<SearchMode>('chunk')
  const [chunkResults, setChunkResults] = useState<ChunkResult[]>([])
  const [docResults, setDocResults] = useState<DocumentMeta[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState('')

  const handleSearch = async () => {
    if (!query.trim()) return
    setLoading(true)
    setError('')
    try {
      if (mode === 'chunk') {
        const data = await searchDocs(query)
        setChunkResults(data.results)
      } else {
        const data = await searchDocumentsByTitle(query)
        setDocResults(data)
      }
      setSearched(true)
    } catch {
      setError('Search failed. Make sure the backend is running.')
    } finally {
      setLoading(false)
    }
  }

  const openDocument = (doc: DocumentMeta) => {
    if (doc.source_path.startsWith('http')) {
      window.open(doc.source_path, '_blank', 'noopener,noreferrer')
    } else {
      window.open(getDocumentFileUrl(doc.id), '_blank', 'noopener,noreferrer')
    }
  }

  const hasResults = mode === 'chunk' ? chunkResults.length > 0 : docResults.length > 0

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Search</h1>
        <p className="page-subtitle">Find anything across your knowledge base.</p>
      </div>

      <div className="search-bar-wrap">
        <input
          type="text"
          className="search-input"
          placeholder={mode === 'chunk' ? 'Search by meaning…' : 'Search by document name or tag…'}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
        />
        <div className="mode-toggle">
          <button
            className={`mode-pill ${mode === 'chunk' ? 'active' : ''}`}
            onClick={() => { setMode('chunk'); setSearched(false) }}
          >
            By chunk
          </button>
          <button
            className={`mode-pill ${mode === 'document' ? 'active' : ''}`}
            onClick={() => { setMode('document'); setSearched(false) }}
          >
            By document
          </button>
        </div>
        <button className="search-btn" disabled={!query || loading} onClick={handleSearch}>
          {loading ? 'Searching…' : 'Search'}
        </button>
      </div>

      {error && <div className="search-error">{error}</div>}

      {searched && !hasResults && !loading && (
        <div className="placeholder-card">No results found. Try a different query or ingest more documents.</div>
      )}

      {mode === 'chunk' && chunkResults.length > 0 && (
        <div className="results-list">
          {chunkResults.map((r, i) => (
            <div key={i} className="result-card">
              <div className="result-header">
                <span className="result-title">{r.document_title}</span>
                <span className="result-score">{(r.score * 100).toFixed(0)}% match</span>
              </div>
              <p className="result-chunk">{r.chunk_text}</p>
            </div>
          ))}
        </div>
      )}

      {mode === 'document' && docResults.length > 0 && (
        <div className="results-list">
          {docResults.map((doc) => (
            <div key={doc.id} className="result-card doc-card">
              <div className="result-header">
                <span className="result-title">{doc.title}</span>
                <div className="doc-card-actions">
                  <span className="file-type-badge">{doc.file_type}</span>
                  <button className="open-btn" onClick={() => openDocument(doc)}>Open ↗</button>
                </div>
              </div>
              {doc.summary && <p className="result-chunk">{doc.summary}</p>}
              {doc.tags.length > 0 && (
                <div className="tag-list">
                  {doc.tags.map(t => <span key={t} className="tag">{t}</span>)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
