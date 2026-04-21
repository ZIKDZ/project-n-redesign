import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth } from '../utils/api'
import { useAuth } from '../App'
import { asset } from '../utils/asset'

export default function Login() {
  const { user, setUser } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Already logged in → go straight to dashboard
  useEffect(() => {
    if (user) navigate('/dashboard', { replace: true })
  }, [user, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await auth.login(username, password) as any
      if (data.success) {
        setUser(data.user)
        navigate('/dashboard', { replace: true })
      }
    } catch (err: any) {
      setError(err.message || 'Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  const inputClass =
    'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm focus:outline-none focus:border-purple-500/60 focus:bg-purple-500/5 transition-all duration-200'

  return (
    <div className="min-h-screen bg-[#0d0014] flex items-center justify-center px-4">
      {/* Background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <img src={asset("images/logo.svg")} alt="NBLEsport" className="w-14 h-14 mx-auto mb-4" style={{ filter: 'brightness(0) invert(1)' }} />
          <h1 className="text-white font-black text-2xl uppercase tracking-widest" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
            NBL<span className="text-purple-400">ESPORT</span>
          </h1>
          <p className="text-white/30 text-xs tracking-widest uppercase mt-1">Staff Dashboard</p>
        </div>

        {/* Card */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-8">
          <h2 className="text-white font-bold text-lg mb-6 tracking-wide">Sign in</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-white/50 text-xs font-bold tracking-widest uppercase mb-2">Username</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                placeholder="your username"
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-white/50 text-xs font-bold tracking-widest uppercase mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className={inputClass}
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black py-3.5 rounded-xl text-sm tracking-widest uppercase transition-all duration-200 hover:shadow-xl hover:shadow-purple-500/30 mt-2"
              style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="text-center text-white/20 text-xs mt-6">
          <a href="/" className="hover:text-purple-400 transition-colors">← Back to site</a>
        </p>
      </div>
    </div>
  )
}
