import { useState } from 'react'
import { ingestFile } from '../api'
import './AddDocument.css'

type Status = 'idle' | 'loading' | 'success' | 'error'

export default function AddDocument() {
  const [mode, setMode] = useState<'file' | 'url'>('file')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [tags, setTags] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [result, setResult] = useState<{ title: string; summary: string; chunk_count: number } | null>(null)
  const [error, setError] = useState('')

  const canSubmit = mode === 'file' ? !!selectedFile : !!url.trim()

  const handleSubmit = async () => {
    setStatus('loading')
    setError('')
    setResult(null)
    try {
      const fd = new FormData()
      if (mode === 'file' && selectedFile) fd.append('file', selectedFile)
      if (mode === 'url') fd.append('url', url)
      if (title) fd.append('title', title)
      if (tags) fd.append('tags', tags)
      const data = await ingestFile(fd)
      setResult(data)
      setStatus('success')
      setSelectedFile(null)
      setUrl('')
      setTitle('')
      setTags('')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error')
      setStatus('error')
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Add Document</h1>
        <p className="page-subtitle">Ingest a file or web page into your knowledge base.</p>
      </div>

      <div className="ingest-card">
        <div className="mode-tabs">
          <button className={mode === 'file' ? 'tab active' : 'tab'} onClick={() => setMode('file')}>File</button>
          <button className={mode === 'url' ? 'tab active' : 'tab'} onClick={() => setMode('url')}>Web page</button>
        </div>

        {mode === 'file' ? (
          <div className={`dropzone ${selectedFile ? 'has-file' : ''}`}>
            {selectedFile
              ? <p className="dropzone-hint">{selectedFile.name}</p>
              : <>
                  <p className="dropzone-hint">Drag and drop a file here, or click to select</p>
                  <p className="dropzone-types">PDF · TXT · MD · DOCX</p>
                </>
            }
            <input
              type="file"
              accept=".pdf,.txt,.md,.docx"
              className="file-input"
              onChange={e => setSelectedFile(e.target.files?.[0] ?? null)}
            />
          </div>
        ) : (
          <input
            type="url"
            placeholder="https://example.com/article"
            className="url-input"
            value={url}
            onChange={e => setUrl(e.target.value)}
          />
        )}

        <div className="meta-fields">
          <div className="field">
            <label>Title <span className="optional">(optional — auto-detected if blank)</span></label>
            <input type="text" placeholder="My document title" value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div className="field">
            <label>Tags <span className="optional">(comma-separated)</span></label>
            <input type="text" placeholder="research, ml, notes" value={tags} onChange={e => setTags(e.target.value)} />
          </div>
        </div>

        <button className="ingest-btn" disabled={!canSubmit || status === 'loading'} onClick={handleSubmit}>
          {status === 'loading' ? 'Ingesting…' : 'Ingest'}
        </button>

        {status === 'success' && result && (
          <div className="ingest-result success">
            <strong>✓ Ingested: {result.title}</strong>
            <p>{result.summary}</p>
            <span className="chunk-count">{result.chunk_count} chunks stored</span>
          </div>
        )}

        {status === 'error' && (
          <div className="ingest-result error">{error}</div>
        )}
      </div>
    </div>
  )
}
