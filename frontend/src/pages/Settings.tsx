import type { AppMode } from '../hooks/useMode'
import './Settings.css'

const MODE_LABELS: Record<AppMode, string> = {
  educational: 'Educational',
  personal: 'Personal',
  business: 'Business',
}

const MODE_DESCRIPTIONS: Record<AppMode, string> = {
  educational: 'Full app with spaced repetition review.',
  personal: 'Document library and AI chat — no review section.',
  business: 'Document library, AI chat, and To-Do checklist.',
}

interface Props {
  mode: AppMode
  onResetMode: () => void
}

export default function Settings({ mode, onResetMode }: Props) {
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Configure your local AI models and preferences.</p>
      </div>

      {/* Mode section */}
      <h2 className="section-title" style={{ marginBottom: 12 }}>Use-case mode</h2>
      <div className="settings-card" style={{ marginBottom: 32 }}>
        <div className="setting-row">
          <div className="setting-info">
            <span className="setting-label">Current mode</span>
            <span className="setting-desc">{MODE_DESCRIPTIONS[mode]}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
            <span className="mode-pill">{MODE_LABELS[mode]}</span>
            <button className="mode-change-btn" onClick={onResetMode}>
              Change mode
            </button>
          </div>
        </div>
      </div>

      {/* Model section */}
      <h2 className="section-title" style={{ marginBottom: 12 }}>AI models</h2>
      <div className="settings-card">
        <div className="setting-row">
          <div className="setting-info">
            <span className="setting-label">Ollama model</span>
            <span className="setting-desc">The LLM used for chat, summaries, and relationship extraction. Must be pulled via Ollama first.</span>
          </div>
          <select className="setting-select" disabled>
            {/* TODO (M4): fetch available models from GET /settings + Ollama tags API */}
            <option>llama3</option>
            <option>mistral</option>
          </select>
        </div>

        <div className="setting-row">
          <div className="setting-info">
            <span className="setting-label">Embedding model</span>
            <span className="setting-desc">HuggingFace sentence-transformers model used for semantic search. Set at startup via EMBED_MODEL env var.</span>
          </div>
          <span className="setting-value-static">all-MiniLM-L6-v2</span>
        </div>
      </div>
    </div>
  )
}
