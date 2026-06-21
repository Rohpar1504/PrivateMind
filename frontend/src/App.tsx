import { Routes, Route, NavLink } from 'react-router-dom'
import Home from './pages/Home'
import AddDocument from './pages/AddDocument'
import Search from './pages/Search'
import Chat from './pages/Chat'
import Review from './pages/Review'
import Settings from './pages/Settings'
import './App.css'

const NAV_ITEMS = [
  { to: '/', label: 'Home', end: true },
  { to: '/add', label: 'Add Document' },
  { to: '/search', label: 'Search' },
  { to: '/chat', label: 'Chat' },
  { to: '/review', label: 'Review' },
  { to: '/settings', label: 'Settings' },
]

export default function App() {
  return (
    <div className="app-shell">
      <nav className="sidebar">
        <div className="sidebar-logo">PrivateMind</div>
        <ul className="sidebar-nav">
          {NAV_ITEMS.map(({ to, label, end }) => (
            <li key={to}>
              <NavLink to={to} end={end} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/add" element={<AddDocument />} />
          <Route path="/search" element={<Search />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/review" element={<Review />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  )
}
