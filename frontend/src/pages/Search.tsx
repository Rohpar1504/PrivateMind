import { useState } from 'react'
import { searchDocs } from '../api'
import './Search.css'

interface SearchResult {
  document_id: string
  document_title: string
  chunk_text: string
  score: number
}

export default function Search() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState('')

  const handleSearch = async () => {
    if (!query.trim()) return
    setLoading(true)
    setError('')
    try {
      const data = await searchDocs(query)
      setResults(data.results)
      setSearched(true)
    } catch {
      setError('Search failed. Make sure the backend is running.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Search</h1>
        <p className="page-subtitle">Find anything across your knowledge base by meaning, not just keywords.</p>
      </div>

      <div className="search-bar-wrap">
        <input
          type="text"
          className="search-input"
          placeholder="What do you want to find?"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
        />
        <button className="search-btn" disabled={!query || loading} onClick={handleSearch}>
          {loading ? 'Searching…' : 'Search'}
        </button>
      </div>

      {error && <div className="search-error">{error}</div>}

      {searched && results.length === 0 && !loading && (
        <div className="placeholder-card">No results found. Try a different query or ingest more documents.</div>
      )}

      {results.length > 0 && (
        <div className="results-list">
          {results.map((r, i) => (
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
    </div>
  )
}
