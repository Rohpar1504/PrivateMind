import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { DocumentMeta, getDocumentFileUrl, listDocuments } from '../api'
import './Home.css'

type SortOption = 'newest' | 'oldest' | 'alpha' | 'recent'

const SORT_LABELS: Record<SortOption, string> = {
  newest: 'Newest to Oldest',
  oldest: 'Oldest to Newest',
  alpha: 'Alphabetical',
  recent: 'Most Recently Viewed',
}

function sortDocs(docs: DocumentMeta[], sort: SortOption): DocumentMeta[] {
  return [...docs].sort((a, b) => {
    switch (sort) {
      case 'newest':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      case 'oldest':
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      case 'alpha':
        return a.title.localeCompare(b.title)
      case 'recent': {
        const ta = a.last_accessed_at ? new Date(a.last_accessed_at).getTime() : 0
        const tb = b.last_accessed_at ? new Date(b.last_accessed_at).getTime() : 0
        return tb - ta
      }
    }
  })
}

export default function Home() {
  const [docs, setDocs] = useState<DocumentMeta[]>([])
  const [sort, setSort] = useState<SortOption>('newest')
  const dueCount = 0 // TODO (M3): fetch from /review/due

  useEffect(() => {
    listDocuments().then(setDocs).catch(() => setDocs([]))
  }, [])

  const sorted = useMemo(() => sortDocs(docs, sort), [docs, sort])

  const openDocument = (doc: DocumentMeta) => {
    if (doc.source_path.startsWith('http')) {
      window.open(doc.source_path, '_blank', 'noopener,noreferrer')
    } else {
      window.open(getDocumentFileUrl(doc.id), '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Your local AI second brain — fully offline.</p>
      </div>

      {dueCount > 0 && (
        <Link to="/review" className="review-banner">
          {dueCount} note{dueCount !== 1 ? 's' : ''} due for review today →
        </Link>
      )}

      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-value">{docs.length}</span>
          <span className="stat-label">Documents ingested</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">—</span>
          <span className="stat-label">Due for review</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">—</span>
          <span className="stat-label">Reviews completed</span>
        </div>
      </div>

      <div className="quick-actions">
        <h2 className="section-title">Quick actions</h2>
        <div className="action-grid">
          <Link to="/add" className="action-card">
            <span className="action-icon">＋</span>
            <span>Add document</span>
          </Link>
          <Link to="/search" className="action-card">
            <span className="action-icon">⌕</span>
            <span>Search notes</span>
          </Link>
          <Link to="/chat" className="action-card">
            <span className="action-icon">💬</span>
            <span>Start chat</span>
          </Link>
          <Link to="/review" className="action-card">
            <span className="action-icon">↻</span>
            <span>Review queue</span>
          </Link>
        </div>
      </div>

      <div className="doc-library">
        <div className="doc-library-header">
          <h2 className="section-title" style={{ margin: 0 }}>Your documents</h2>
          <div className="sort-select-wrap">
            <select
              className="sort-select"
              value={sort}
              onChange={e => setSort(e.target.value as SortOption)}
            >
              {(Object.keys(SORT_LABELS) as SortOption[]).map(k => (
                <option key={k} value={k}>{SORT_LABELS[k]}</option>
              ))}
            </select>
          </div>
        </div>

        {sorted.length === 0 ? (
          <div className="placeholder-card">
            No documents yet. <Link to="/add">Add your first document →</Link>
          </div>
        ) : (
          <div className="doc-grid">
            {sorted.map(doc => (
              <div key={doc.id} className="doc-card">
                <div className="doc-card-top">
                  <span className="doc-file-badge">{doc.file_type}</span>
                  <button className="doc-open-btn" onClick={() => openDocument(doc)} title="Open original">
                    ↗
                  </button>
                </div>
                <p className="doc-title">{doc.title}</p>
                {doc.summary && <p className="doc-summary">{doc.summary}</p>}
                {doc.tags.length > 0 && (
                  <div className="doc-tags">
                    {doc.tags.map(t => <span key={t} className="doc-tag">{t}</span>)}
                  </div>
                )}
                <span className="doc-date">
                  Added {new Date(doc.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
