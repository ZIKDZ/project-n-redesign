import { Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect, createContext, useContext } from 'react'
import { auth } from './utils/api'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Dashboard from './pages/dashboard/Dashboard'
import RosterPage from './pages/RosterPage'
import NewsArticlePage from './pages/NewsArticlePage'
import PlayerPage from './pages/PlayerPage'

// ── Auth context ──────────────────────────────────────────────────────────────
interface AuthUser {
  username: string
  is_staff: boolean
}

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  setUser: (user: AuthUser | null) => void
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  setUser: () => {},
})

export function useAuth() {
  return useContext(AuthContext)
}

// ── Protected route wrapper ───────────────────────────────────────────────────
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen bg-[#0d0014] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    auth.me()
      .then((data) => {
        if (data.authenticated && data.user) setUser(data.user)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, setUser }}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/roster/:gameSlug" element={<RosterPage />} />
        <Route path="/player/:id" element={<PlayerPage />} />
        <Route path="/news/:id" element={<NewsArticlePage />} />
        <Route
          path="/dashboard/*"
          element={
            <RequireAuth>
              <Dashboard />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthContext.Provider>
  )
}