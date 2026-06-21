import { useState } from 'react'
import './Review.css'

type Tab = 'due' | 'completed'

export default function Review() {
  const [tab, setTab] = useState<Tab>('due')
  const [studyMode, setStudyMode] = useState(() => localStorage.getItem('studyMode') === 'true')

  const toggleStudyMode = () => {
    const next = !studyMode
    setStudyMode(next)
    localStorage.setItem('studyMode', String(next))
  }

  return (
    <div>
      <div className="page-header">
        <div className="review-header-row">
          <div>
            <h1 className="page-title">Review</h1>
            <p className="page-subtitle">Notes due for review based on the Ebbinghaus forgetting curve.</p>
          </div>
          <label className="study-mode-toggle">
            <input type="checkbox" checked={studyMode} onChange={toggleStudyMode} />
            <span>Study Mode</span>
          </label>
        </div>
      </div>

      <div className="tab-bar">
        <button className={tab === 'due' ? 'tab-btn active' : 'tab-btn'} onClick={() => setTab('due')}>Due Today</button>
        <button className={tab === 'completed' ? 'tab-btn active' : 'tab-btn'} onClick={() => setTab('completed')}>Completed</button>
      </div>

      {tab === 'due' && (
        <div className="placeholder-card">
          {studyMode
            ? 'Flashcard review will appear here once documents are ingested (M3).'
            : 'Notes due for review will appear here once documents are ingested (M3).'}
        </div>
      )}

      {tab === 'completed' && (
        <div className="placeholder-card">
          Completed reviews will appear here (M3).
        </div>
      )}
    </div>
  )
}
