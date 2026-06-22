import { useState } from 'react'
import { AppMode, setMode } from '../hooks/useMode'
import './Onboarding.css'

interface ModeOption {
  mode: AppMode
  icon: string
  title: string
  description: string
  includes: string[]
  excludes: string[]
}

const OPTIONS: ModeOption[] = [
  {
    mode: 'educational',
    icon: '🎓',
    title: 'Educational',
    description: 'Studying, research, or learning. Review your notes with spaced repetition so nothing is forgotten.',
    includes: ['Document library', 'Semantic search', 'AI chat', 'Spaced repetition review'],
    excludes: [],
  },
  {
    mode: 'personal',
    icon: '🧠',
    title: 'Personal',
    description: 'Personal notes, ideas, and bookmarks. Organise your thoughts and ask questions about them.',
    includes: ['Document library', 'Semantic search', 'AI chat'],
    excludes: ['Review section'],
  },
  {
    mode: 'business',
    icon: '💼',
    title: 'Business',
    description: 'Running a business or project. Manage documents and track tasks with due dates.',
    includes: ['Document library', 'Semantic search', 'AI chat', 'To-Do checklist'],
    excludes: ['Review section'],
  },
]

interface Props {
  onDone: (mode: AppMode) => void
}

export default function Onboarding({ onDone }: Props) {
  const [selected, setSelected] = useState<AppMode | null>(null)

  const confirm = () => {
    if (!selected) return
    setMode(selected)
    onDone(selected)
  }

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-modal">
        <div className="onboarding-header">
          <h1 className="onboarding-title">Welcome to PrivateMind</h1>
          <p className="onboarding-subtitle">
            What will you primarily use PrivateMind for? We'll tailor the experience to fit.
          </p>
        </div>

        <div className="onboarding-options">
          {OPTIONS.map(opt => (
            <button
              key={opt.mode}
              className={`onboarding-card ${selected === opt.mode ? 'selected' : ''}`}
              onClick={() => setSelected(opt.mode)}
            >
              <span className="onboarding-icon">{opt.icon}</span>
              <div className="onboarding-card-body">
                <span className="onboarding-card-title">{opt.title}</span>
                <p className="onboarding-card-desc">{opt.description}</p>
                <ul className="onboarding-features">
                  {opt.includes.map(f => (
                    <li key={f} className="feature-include">✓ {f}</li>
                  ))}
                </ul>
              </div>
              {selected === opt.mode && <span className="onboarding-check">✓</span>}
            </button>
          ))}
        </div>

        <button
          className="onboarding-confirm"
          disabled={!selected}
          onClick={confirm}
        >
          Get started
        </button>
      </div>
    </div>
  )
}
