import { useEffect, useState } from 'react'
import { ReviewCard, getCompletedCards, getDueCards, submitRating } from '../api'
import './Review.css'

type Tab = 'due' | 'completed'

function CardItem({
  card,
  onRate,
  disabled,
}: {
  card: ReviewCard
  onRate: (id: string, rating: 'easy' | 'hard') => void
  disabled: boolean
}) {
  return (
    <div className="review-card">
      <div className="review-card-header">
        <span className="review-doc-badge">{card.document_title}</span>
        <span className="review-interval">Next in {card.interval_days}d · Rep {card.repetitions}</span>
      </div>
      <p className="review-chunk-text">{card.chunk_text}</p>
      <div className="review-actions">
        <button
          className="rating-btn hard"
          disabled={disabled}
          onClick={() => onRate(card.sm2_id, 'hard')}
        >
          Hard
        </button>
        <button
          className="rating-btn easy"
          disabled={disabled}
          onClick={() => onRate(card.sm2_id, 'easy')}
        >
          Easy
        </button>
      </div>
    </div>
  )
}

function StudyCard({
  card,
  index,
  total,
  onRate,
  disabled,
}: {
  card: ReviewCard
  index: number
  total: number
  onRate: (id: string, rating: 'easy' | 'hard') => void
  disabled: boolean
}) {
  return (
    <div className="study-view">
      <div className="study-progress-bar">
        <div className="study-progress-fill" style={{ width: `${(index / total) * 100}%` }} />
      </div>
      <p className="study-counter">{index + 1} of {total}</p>

      <div className="study-card">
        <span className="review-doc-badge">{card.document_title}</span>
        <p className="study-chunk-text">{card.chunk_text}</p>
      </div>

      <div className="study-actions">
        <button className="rating-btn hard" disabled={disabled} onClick={() => onRate(card.sm2_id, 'hard')}>
          Hard
        </button>
        <button className="rating-btn easy" disabled={disabled} onClick={() => onRate(card.sm2_id, 'easy')}>
          Easy
        </button>
      </div>
    </div>
  )
}

export default function Review() {
  const [tab, setTab] = useState<Tab>('due')
  const [studyMode, setStudyMode] = useState(() => localStorage.getItem('studyMode') === 'true')
  const [dueCards, setDueCards] = useState<ReviewCard[]>([])
  const [completedCards, setCompletedCards] = useState<ReviewCard[]>([])
  const [loading, setLoading] = useState(true)
  const [rating, setRating] = useState<string | null>(null) // id of card being rated
  const [studyIndex, setStudyIndex] = useState(0)
  const [easyCount, setEasyCount] = useState(0)
  const [hardCount, setHardCount] = useState(0)

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [due, completed] = await Promise.all([getDueCards(), getCompletedCards()])
      setDueCards(due)
      setCompletedCards(completed)
    } catch {
      // silently ignore — backend may be warming up
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAll() }, [])

  const toggleStudyMode = () => {
    const next = !studyMode
    setStudyMode(next)
    localStorage.setItem('studyMode', String(next))
    setStudyIndex(0)
  }

  const handleRate = async (sm2Id: string, r: 'easy' | 'hard') => {
    setRating(sm2Id)
    try {
      await submitRating(sm2Id, r)
      if (r === 'easy') setEasyCount(c => c + 1)
      else setHardCount(c => c + 1)

      if (studyMode) {
        // Advance to next card or stay at same index when list shrinks
        const remaining = dueCards.filter(c => c.sm2_id !== sm2Id)
        setDueCards(remaining)
        if (studyIndex >= remaining.length && remaining.length > 0) {
          setStudyIndex(remaining.length - 1)
        }
      } else {
        setDueCards(prev => prev.filter(c => c.sm2_id !== sm2Id))
      }
      // Refresh completed list
      getCompletedCards().then(setCompletedCards).catch(() => {})
    } catch {
      // keep card in list on error
    } finally {
      setRating(null)
    }
  }

  const doneForToday = !loading && dueCards.length === 0

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
        <button className={tab === 'due' ? 'tab-btn active' : 'tab-btn'} onClick={() => setTab('due')}>
          Due Today
          {dueCards.length > 0 && <span className="tab-count">{dueCards.length}</span>}
        </button>
        <button className={tab === 'completed' ? 'tab-btn active' : 'tab-btn'} onClick={() => setTab('completed')}>
          Completed
          {completedCards.length > 0 && <span className="tab-count">{completedCards.length}</span>}
        </button>
      </div>

      {tab === 'due' && (
        <>
          {loading && <div className="placeholder-card">Loading…</div>}

          {!loading && doneForToday && (
            <div className="done-card">
              <span className="done-icon">✓</span>
              <p className="done-title">You're all caught up for today!</p>
              {(easyCount + hardCount) > 0 && (
                <p className="done-sub">{easyCount} easy · {hardCount} hard reviewed this session</p>
              )}
            </div>
          )}

          {!loading && !doneForToday && studyMode && dueCards[studyIndex] && (
            <StudyCard
              card={dueCards[studyIndex]}
              index={studyIndex}
              total={dueCards.length}
              onRate={handleRate}
              disabled={rating !== null}
            />
          )}

          {!loading && !doneForToday && !studyMode && (
            <div className="review-list">
              {dueCards.map(card => (
                <CardItem
                  key={card.sm2_id}
                  card={card}
                  onRate={handleRate}
                  disabled={rating === card.sm2_id}
                />
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'completed' && (
        <>
          {loading && <div className="placeholder-card">Loading…</div>}
          {!loading && completedCards.length === 0 && (
            <div className="placeholder-card">No reviews completed today yet.</div>
          )}
          {!loading && completedCards.length > 0 && (
            <div className="review-list">
              {completedCards.map(card => (
                <div key={card.sm2_id} className="review-card completed-card">
                  <div className="review-card-header">
                    <span className="review-doc-badge">{card.document_title}</span>
                    <span className="review-interval">Next in {card.interval_days}d · Rep {card.repetitions}</span>
                  </div>
                  <p className="review-chunk-text">{card.chunk_text}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
