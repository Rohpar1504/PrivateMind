import './Settings.css'

export default function Settings() {
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Configure your local AI models and preferences.</p>
      </div>

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
