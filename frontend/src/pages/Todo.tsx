import { useEffect, useRef, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import './Todo.css'

export interface TodoItem {
  id: string
  text: string
  done: boolean
  dueDate?: string
  createdAt: string
}

const STORAGE_KEY = 'pm_todos'

function loadTodos(): TodoItem[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
  } catch {
    return []
  }
}

function saveTodos(todos: TodoItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos))
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function isDueToday(item: TodoItem) {
  return !item.done && item.dueDate === todayStr()
}

function isOverdue(item: TodoItem) {
  return !item.done && item.dueDate && item.dueDate < todayStr()
}

export function getTodoDueCount(): number {
  const todos = loadTodos()
  return todos.filter(t => isDueToday(t) || isOverdue(t)).length
}

export default function Todo() {
  const [todos, setTodos] = useState<TodoItem[]>(loadTodos)
  const [text, setText] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'done'>('active')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { saveTodos(todos) }, [todos])

  const add = () => {
    const trimmed = text.trim()
    if (!trimmed) return
    setTodos(prev => [
      { id: uuidv4(), text: trimmed, done: false, dueDate: dueDate || undefined, createdAt: new Date().toISOString() },
      ...prev,
    ])
    setText('')
    setDueDate('')
    inputRef.current?.focus()
  }

  const toggle = (id: string) => {
    setTodos(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t))
  }

  const remove = (id: string) => {
    setTodos(prev => prev.filter(t => t.id !== id))
  }

  const clearDone = () => {
    setTodos(prev => prev.filter(t => !t.done))
  }

  const filtered = todos.filter(t => {
    if (filter === 'active') return !t.done
    if (filter === 'done') return t.done
    return true
  })

  const dueNow = todos.filter(t => isDueToday(t) || isOverdue(t)).length
  const doneCount = todos.filter(t => t.done).length

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">To-Do</h1>
        <p className="page-subtitle">Track tasks for your business or project.</p>
      </div>

      {dueNow > 0 && (
        <div className="todo-due-banner">
          {dueNow} task{dueNow !== 1 ? 's' : ''} due today or overdue
        </div>
      )}

      {/* Add form */}
      <div className="todo-add-form">
        <input
          ref={inputRef}
          className="todo-input"
          placeholder="Add a task…"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
        />
        <input
          type="date"
          className="todo-date-input"
          value={dueDate}
          min={todayStr()}
          onChange={e => setDueDate(e.target.value)}
          title="Due date (optional)"
        />
        <button className="todo-add-btn" onClick={add} disabled={!text.trim()}>
          Add
        </button>
      </div>

      {/* Filter tabs */}
      <div className="todo-filter-bar">
        {(['active', 'all', 'done'] as const).map(f => (
          <button
            key={f}
            className={`todo-filter-btn ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f === 'done' && doneCount > 0 && (
              <span className="todo-filter-count">{doneCount}</span>
            )}
          </button>
        ))}
        {doneCount > 0 && (
          <button className="todo-clear-done" onClick={clearDone}>
            Clear completed
          </button>
        )}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="placeholder-card">
          {filter === 'done' ? 'No completed tasks.' : 'Nothing here — add a task above.'}
        </div>
      ) : (
        <ul className="todo-list">
          {filtered.map(item => (
            <li
              key={item.id}
              className={`todo-item ${item.done ? 'done' : ''} ${isOverdue(item) ? 'overdue' : ''} ${isDueToday(item) ? 'due-today' : ''}`}
            >
              <button
                className="todo-checkbox"
                onClick={() => toggle(item.id)}
                aria-label={item.done ? 'Mark incomplete' : 'Mark complete'}
              >
                {item.done ? '✓' : ''}
              </button>
              <div className="todo-item-body">
                <span className="todo-item-text">{item.text}</span>
                {item.dueDate && (
                  <span className="todo-due-label">
                    {isOverdue(item) ? '⚠ Overdue · ' : isDueToday(item) ? '● Due today · ' : ''}
                    {new Date(item.dueDate + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>
                )}
              </div>
              <button className="todo-remove-btn" onClick={() => remove(item.id)} aria-label="Delete task">
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
