import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listDocuments } from '../api'
import './Home.css'

export default function Home() {
  const [docCount, setDocCount] = useState<number | null>(null)
  const dueCount = 0 // TODO (M3): fetch from /review/due

  useEffect(() => {
    listDocuments().then((docs: unknown[]) => setDocCount(docs.length)).catch(() => setDocCount(0))
  }, [])

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
          <span className="stat-value">{docCount ?? '—'}</span>
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
    </div>
  )
}
