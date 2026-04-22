import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../App'
import { auth } from '../../utils/api'
import { asset } from '../../utils/asset'

// ── Section imports ───────────────────────────────────────────────────────────
import Overview         from './components/sections/Overview'
import JoinsSection     from './components/sections/JoinsSection'
import MatchesSection   from './components/sections/MatchesSection'
import NewsSection      from './components/sections/NewsSection'
import PlayersSection   from './components/sections/PlayersSection'
import TeamsSection     from './components/sections/TeamsSection'
import GamesSection     from './components/sections/GamesSection'
import SpotlightSection from './components/sections/SpotlightSection'

// ── Types ─────────────────────────────────────────────────────────────────────
type Section = 'overview' | 'joins' | 'matches' | 'news' | 'players' | 'teams' | 'games' | 'spotlight'

const NAV_ITEMS: { id: Section; label: string; icon: string }[] = [
  { id: 'overview',  label: 'Overview',      icon: '⬡' },
  { id: 'joins',     label: 'Join Requests', icon: '✦' },
  { id: 'matches',   label: 'Matches',       icon: '⚡' },
  { id: 'news',      label: 'News',          icon: '◈' },
  { id: 'players',   label: 'Players',       icon: '◉' },
  { id: 'teams',     label: 'Teams',         icon: '◈' },
  { id: 'games',     label: 'Games',         icon: '🎮' },
  { id: 'spotlight', label: 'Spotlight',     icon: '▶' },
]

const SECTIONS: Record<Section, React.ReactNode> = {
  overview:  <Overview />,
  joins:     <JoinsSection />,
  matches:   <MatchesSection />,
  news:      <NewsSection />,
  players:   <PlayersSection />,
  teams:     <TeamsSection />,
  games:     <GamesSection />,
  spotlight: <SpotlightSection />,
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user, setUser } = useAuth()
  const navigate = useNavigate()
  const [section, setSection] = useState<Section>('overview')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = async () => {
    await auth.logout()
    setUser(null)
    navigate('/login', { replace: true })
  }

  return (
    // ── Outer scale wrapper ──────────────────────────────────────────────────
    <div
      style={{
        width: `${(100 / 1.4).toFixed(4)}vw`,
        height: `${(100 / 1.4).toFixed(4)}vh`,
        transform: 'scale(1.4)',
        transformOrigin: 'top left',
        overflow: 'hidden',
        position: 'fixed',   // fixed so it never contributes to document scroll
        top: 0,
        left: 0,
      }}
    >
      <div
        className="min-h-screen bg-[#0d0014] text-white flex"
        style={{ fontFamily: "'Barlow', sans-serif", width: '100%', height: '100%' }}
      >
        <style>{`
          ::-webkit-scrollbar { display: none; }
          * { scrollbar-width: none; }
        `}</style>

        {/* ── Sidebar ───────────────────────────────────────────────────── */}
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-60 bg-[#0a0010] border-r border-white/8 flex flex-col transition-transform duration-200 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } md:translate-x-0`}
        >
          <div className="px-6 py-5 border-b border-white/8">
            <a href="/" className="flex items-center gap-3 cursor-pointer">
              <img
                src={asset('images/logo.svg')}
                alt=""
                className="w-8 h-8"
                style={{ filter: 'brightness(0) invert(1)' }}
              />
              <div>
                <span
                  className="block text-white font-black tracking-wider text-base"
                  style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
                >
                  NBL<span className="text-purple-400">ESPORT</span>
                </span>
                <span className="block text-purple-400/50 text-xs tracking-widest">Dashboard</span>
              </div>
            </a>
          </div>

          <nav
            className="flex-1 px-3 py-4 space-y-1 overflow-y-auto"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
          >
            {NAV_ITEMS.map(item => (
              <button
                key={item.id}
                onClick={() => { setSection(item.id); setSidebarOpen(false) }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold tracking-wide transition-all duration-150 cursor-pointer ${
                  section === item.id
                    ? 'bg-purple-600/25 text-purple-300 border border-purple-500/30'
                    : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                }`}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>

          <div className="px-4 py-4 border-t border-white/8">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-purple-300 text-xs font-bold">
                {user?.username?.[0]?.toUpperCase()}
              </div>
              <div>
                <p className="text-white text-sm font-semibold">{user?.username}</p>
                <p className="text-white/30 text-xs">Staff</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full text-xs font-bold tracking-widest uppercase text-white/30 hover:text-red-400 transition-all py-2 cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </aside>

        {/* Sidebar overlay (mobile) */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/60 md:hidden cursor-pointer"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* ── Main content ──────────────────────────────────────────────── */}
        <main
          className="flex-1 md:ml-60 overflow-y-auto"
          style={{
            height: `${(100 / 1.4).toFixed(4)}vh`,
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          } as React.CSSProperties}
        >
          {/* Mobile top bar */}
          <div className="sticky top-0 z-20 bg-[#0d0014]/90 backdrop-blur border-b border-white/8 px-6 py-4 flex items-center justify-between md:hidden">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-white/60 hover:text-white cursor-pointer"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <span className="text-white font-bold text-sm uppercase tracking-wider">
              {NAV_ITEMS.find(n => n.id === section)?.label}
            </span>
            <div className="w-6" />
          </div>

          <div className="px-6 md:px-10 py-8 max-w-6xl">
            {SECTIONS[section]}
          </div>
        </main>
      </div>
    </div>
  )
}