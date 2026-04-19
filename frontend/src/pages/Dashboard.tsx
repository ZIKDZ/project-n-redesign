import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../App'
import { auth, joins, matches, news, players, teams, games, spotlight } from '../utils/api'

// ── Types ─────────────────────────────────────────────────────────────────────
type Section = 'overview' | 'joins' | 'matches' | 'news' | 'players' | 'teams' | 'games' | 'spotlight'

// ── Sidebar ───────────────────────────────────────────────────────────────────
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

// ── Small reusable components ─────────────────────────────────────────────────
function Badge({ children, color = 'purple' }: { children: React.ReactNode; color?: 'purple' | 'green' | 'red' | 'yellow' | 'gray' }) {
  const colors = {
    purple: 'bg-purple-500/15 text-purple-300 border-purple-500/25',
    green:  'bg-green-500/15  text-green-400  border-green-500/25',
    red:    'bg-red-500/15    text-red-400    border-red-500/25',
    yellow: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/25',
    gray:   'bg-white/5       text-white/40   border-white/10',
  }
  return (
    <span className={`inline-flex items-center text-xs font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${colors[color]}`}>
      {children}
    </span>
  )
}

function StatCard({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
      <p className="text-white/40 text-xs font-bold tracking-widest uppercase mb-2">{label}</p>
      <p className="text-white font-black text-4xl" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{value}</p>
      {sub && <p className="text-white/30 text-xs mt-1">{sub}</p>}
    </div>
  )
}

function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-white font-black text-2xl uppercase tracking-wide" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{title}</h2>
      {action}
    </div>
  )
}

function ActionButton({ onClick, children, variant = 'primary', disabled }: { onClick: () => void; children: React.ReactNode; variant?: 'primary' | 'danger' | 'ghost'; disabled?: boolean }) {
  const styles = {
    primary: 'bg-purple-600 hover:bg-purple-500 text-white',
    danger:  'bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30',
    ghost:   'bg-white/5 hover:bg-white/10 text-white/60 border border-white/10',
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`text-xs font-bold px-4 py-2 rounded-lg tracking-wider uppercase transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed ${styles[variant]}`}
    >
      {children}
    </button>
  )
}

// ── Overview section ──────────────────────────────────────────────────────────
function Overview() {
  const [counts, setCounts] = useState({ joins: 0, matches: 0, news: 0, players: 0, teams: 0 })

  useEffect(() => {
    Promise.all([
      joins.list() as Promise<any>,
      matches.list() as Promise<any>,
      news.listAll() as Promise<any>,
      players.listAll() as Promise<any>,
      teams.listAll() as Promise<any>,
    ]).then(([j, m, n, p, t]) => {
      setCounts({
        joins:   j.joins?.length   ?? 0,
        matches: m.matches?.length ?? 0,
        news:    n.news?.length    ?? 0,
        players: p.players?.length ?? 0,
        teams:   t.teams?.length   ?? 0,
      })
    }).catch(() => {})
  }, [])

  return (
    <div>
      <SectionHeader title="Overview" />
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        <StatCard label="Join Requests" value={counts.joins} />
        <StatCard label="Matches"       value={counts.matches} />
        <StatCard label="News Posts"    value={counts.news} />
        <StatCard label="Players"       value={counts.players} />
        <StatCard label="Teams"         value={counts.teams} />
      </div>
    </div>
  )
}

// ── Joins section ─────────────────────────────────────────────────────────────
function JoinsSection() {
  const [data, setData] = useState<any[]>([])
  const [filter, setFilter] = useState('')
  const [reviewed, setReviewed] = useState<any | null>(null)

  const load = () => {
    (joins.list(filter || undefined) as Promise<any>)
      .then(r => setData(r.joins || []))
      .catch(() => {})
  }

  useEffect(() => { load() }, [filter])

  const openReview = async (j: any) => {
    if (j.status === 'pending') {
      await joins.updateStatus(j.id, { status: 'reviewing' })
      load()
    }
    setReviewed({ ...j, status: j.status === 'pending' ? 'reviewing' : j.status })
  }

  const handleAccept = async () => {
    if (!reviewed) return
    await joins.accept(reviewed.id)
    setReviewed(null)
    load()
  }

  const handleReject = async () => {
    if (!reviewed) return
    await joins.updateStatus(reviewed.id, { status: 'rejected' })
    setReviewed(null)
    load()
  }

  const statusColor = (s: string) =>
    s === 'accepted' ? 'green' : s === 'rejected' ? 'red' : s === 'reviewing' ? 'yellow' : 'gray'

  const GAME_LABELS: Record<string, string> = {
    rocket_league: 'Rocket League',
    valorant: 'Valorant',
    fortnite: 'Fortnite',
  }

  return (
    <div>
      <SectionHeader
        title="Join Requests"
        action={
          <select
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="bg-white/5 border border-white/10 text-white text-xs px-3 py-2 rounded-lg"
          >
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="reviewing">Reviewing</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
          </select>
        }
      />

      <div className="space-y-3">
        {data.length === 0 && <p className="text-white/30 text-sm">No join requests found.</p>}
        {data.map((j: any) => (
          <div key={j.id} className="bg-white/5 border border-white/8 rounded-2xl p-5 flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <span className="text-white font-bold">{j.username}</span>
                <Badge color={statusColor(j.status)}>{j.status}</Badge>
                <Badge color="purple">{GAME_LABELS[j.game] ?? j.game}</Badge>
              </div>
              <p className="text-white/40 text-xs">
                {j.ingame_username} · {j.rank} · {j.discord_username} · {j.email}
              </p>
              <p className="text-white/20 text-xs mt-1">{new Date(j.submitted_at).toLocaleDateString()}</p>
            </div>
            <div className="flex items-center gap-2">
              {j.status !== 'accepted' && j.status !== 'rejected' && (
                <ActionButton onClick={() => openReview(j)}>Review</ActionButton>
              )}
              {j.status === 'accepted' && (
                <span className="text-xs text-green-400 font-bold tracking-wider uppercase">Added to roster</span>
              )}
              {j.status === 'rejected' && (
                <span className="text-xs text-red-400/60 font-bold tracking-wider uppercase">Rejected</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {reviewed && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setReviewed(null) }}
        >
          <div className="bg-[#13001f] border border-white/10 rounded-3xl p-8 w-full max-w-md shadow-2xl shadow-purple-900/30">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white font-black text-xl uppercase tracking-wide" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                Application Review
              </h3>
              <button onClick={() => setReviewed(null)} className="text-white/30 hover:text-white transition-colors text-xl">✕</button>
            </div>
            <div className="space-y-3 mb-8">
              {[
                { label: 'Username',     value: reviewed.username },
                { label: 'In-Game Name', value: reviewed.ingame_username },
                { label: 'Game',         value: GAME_LABELS[reviewed.game] ?? reviewed.game },
                { label: 'Rank',         value: reviewed.rank },
                { label: 'Discord',      value: reviewed.discord_username },
                { label: 'Email',        value: reviewed.email },
                { label: 'Submitted',    value: new Date(reviewed.submitted_at).toLocaleDateString() },
              ].map(row => (
                <div key={row.label} className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-white/40 text-xs font-bold tracking-widest uppercase">{row.label}</span>
                  <span className="text-white text-sm font-semibold">{row.value}</span>
                </div>
              ))}
            </div>
            <textarea
              placeholder="Internal notes (optional)…"
              defaultValue={reviewed.notes}
              onBlur={e => joins.updateStatus(reviewed.id, { notes: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none focus:border-purple-500/60 resize-none h-20 mb-6"
            />
            <div className="flex gap-3">
              <button onClick={handleAccept}
                className="flex-1 bg-green-600 hover:bg-green-500 text-white font-black py-3 rounded-xl text-sm tracking-widest uppercase transition-all duration-200"
                style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>Accept</button>
              <button onClick={handleReject}
                className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 font-black py-3 rounded-xl text-sm tracking-widest uppercase transition-all duration-200"
                style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>Reject</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Matches section ───────────────────────────────────────────────────────────
function MatchesSection() {
  const [data, setData] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ rival: '', match_type: 'tournament', game: 'rocket_league', date: '', time: '', status: 'upcoming', score: '', winner: '' })

  const load = () => {
    (matches.list() as Promise<any>).then(r => setData(r.matches || [])).catch(() => {})
  }

  useEffect(() => { load() }, [])

  const save = async () => {
    if (!form.rival || !form.date || !form.time) return
    await matches.create(form)
    setShowForm(false)
    setForm({ rival: '', match_type: 'tournament', game: 'rocket_league', date: '', time: '', status: 'upcoming', score: '', winner: '' })
    load()
  }

  const remove = async (id: number) => {
    if (!confirm('Delete this match?')) return
    await matches.delete(id)
    load()
  }

  const statusColor = (s: string) =>
    s === 'live' ? 'red' : s === 'completed' ? 'green' : 'purple'

  const inputClass = 'bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500/60 w-full'

  return (
    <div>
      <SectionHeader
        title="Matches"
        action={<ActionButton onClick={() => setShowForm(v => !v)}>+ New Match</ActionButton>}
      />

      {showForm && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6 grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { key: 'rival', placeholder: 'Rival team', type: 'text' },
            { key: 'date',  placeholder: 'Date', type: 'date' },
            { key: 'time',  placeholder: 'Time', type: 'time' },
            { key: 'score', placeholder: 'Score e.g. 3 — 1', type: 'text' },
          ].map(f => (
            <input key={f.key} type={f.type} placeholder={f.placeholder}
              value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
              className={inputClass} />
          ))}
          {[
            { key: 'game', opts: [['rocket_league','Rocket League'],['valorant','Valorant'],['fortnite','Fortnite']] },
            { key: 'match_type', opts: [['tournament','Tournament'],['practice','Practice'],['scrim','Scrim'],['friendly','Friendly']] },
            { key: 'status', opts: [['upcoming','Upcoming'],['live','Live'],['completed','Completed']] },
            { key: 'winner', opts: [['','No winner yet'],['nbl','NBL'],['rival','Rival'],['draw','Draw']] },
          ].map(s => (
            <select key={s.key} value={(form as any)[s.key]} onChange={e => setForm(p => ({ ...p, [s.key]: e.target.value }))}
              className={inputClass + ' cursor-pointer'}>
              {s.opts.map(([v, l]) => <option key={v} value={v} className="bg-[#1a0030]">{l}</option>)}
            </select>
          ))}
          <div className="col-span-full flex gap-3">
            <ActionButton onClick={save}>Save Match</ActionButton>
            <ActionButton variant="ghost" onClick={() => setShowForm(false)}>Cancel</ActionButton>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {data.length === 0 && <p className="text-white/30 text-sm">No matches yet.</p>}
        {data.map((m: any) => (
          <div key={m.id} className="bg-white/5 border border-white/8 rounded-2xl px-6 py-4 flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <span className="text-white font-bold">NBL vs {m.rival}</span>
                <Badge color={statusColor(m.status)}>{m.status}</Badge>
                <Badge color="purple">{m.game.replace('_', ' ')}</Badge>
                <Badge color="gray">{m.match_type}</Badge>
              </div>
              <p className="text-white/40 text-xs">
                {m.date} · {m.time} {m.score && `· ${m.score}`} {m.winner && `· Winner: ${m.winner}`}
              </p>
            </div>
            <ActionButton variant="danger" onClick={() => remove(m.id)}>Delete</ActionButton>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── News section ──────────────────────────────────────────────────────────────
function getCsrfToken(): string {
  const value = `; ${document.cookie}`
  const parts = value.split(`; csrftoken=`)
  if (parts.length === 2) return parts.pop()!.split(';').shift() || ''
  return ''
}

function NewsSection() {
  const [data, setData] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    title: '',
    tag: 'announcement',
    description: '',
    published_at: '',
    is_published: true,
  })
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  const [thumbnailPreview, setThumbnailPreview] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const load = () => {
    (news.listAll() as Promise<any>).then(r => setData(r.news || [])).catch(() => {})
  }

  useEffect(() => { load() }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    setThumbnailFile(file)
    if (file) {
      setThumbnailPreview(URL.createObjectURL(file))
    } else {
      setThumbnailPreview('')
    }
  }

  const resetForm = () => {
    setForm({ title: '', tag: 'announcement', description: '', published_at: '', is_published: true })
    setThumbnailFile(null)
    setThumbnailPreview('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const save = async () => {
    if (!form.title || !form.description || !form.published_at) return
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('title', form.title)
      fd.append('tag', form.tag)
      fd.append('description', form.description)
      fd.append('published_at', form.published_at)
      fd.append('is_published', form.is_published ? 'true' : 'false')
      if (thumbnailFile) fd.append('thumbnail', thumbnailFile)

      await fetch('/api/news/create/', {
        method: 'POST',
        credentials: 'include',
        headers: { 'X-CSRFToken': getCsrfToken() },
        body: fd,
      })
      setShowForm(false)
      resetForm()
      load()
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id: number) => {
    if (!confirm('Delete this post?')) return
    await news.delete(id)
    load()
  }

  const toggle = async (id: number, is_published: boolean) => {
    await news.update(id, { is_published: !is_published })
    load()
  }

  const inputClass = 'bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500/60 w-full'

  return (
    <div>
      <SectionHeader
        title="News"
        action={<ActionButton onClick={() => { setShowForm(v => !v); if (showForm) resetForm() }}>
          {showForm ? 'Cancel' : '+ New Post'}
        </ActionButton>}
      />

      {showForm && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-white/40 text-xs font-bold tracking-widest uppercase mb-1">Title *</label>
              <input placeholder="Post title" value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className="block text-white/40 text-xs font-bold tracking-widest uppercase mb-1">Tag</label>
              <select value={form.tag} onChange={e => setForm(p => ({ ...p, tag: e.target.value }))} className={inputClass + ' cursor-pointer'}>
                {['announcement','award','community','match','roster','update'].map(t => (
                  <option key={t} value={t} className="bg-[#1a0030]">{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-white/40 text-xs font-bold tracking-widest uppercase mb-1">Publish Date *</label>
              <input type="date" value={form.published_at} max="2099-12-31"
                onChange={e => setForm(p => ({ ...p, published_at: e.target.value }))} className={inputClass} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-white/40 text-xs font-bold tracking-widest uppercase mb-1">Description *</label>
              <textarea placeholder="Write the post content…" value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                className={inputClass + ' h-28 resize-none'} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-white/40 text-xs font-bold tracking-widest uppercase mb-2">Thumbnail Image</label>
              <div className="flex items-start gap-4">
                <div className="w-32 h-20 rounded-xl border-2 border-dashed border-white/10 flex items-center justify-center overflow-hidden shrink-0 cursor-pointer hover:border-purple-500/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}>
                  {thumbnailPreview
                    ? <img src={thumbnailPreview} className="w-full h-full object-cover" alt="preview" />
                    : <span className="text-white/20 text-xs text-center px-2">Click to upload</span>}
                </div>
                <div className="flex-1">
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                  <button type="button" onClick={() => fileInputRef.current?.click()}
                    className="bg-white/5 border border-white/10 hover:border-purple-500/40 text-white/60 hover:text-white text-xs font-bold px-4 py-2 rounded-lg tracking-wider uppercase transition-all duration-200">
                    {thumbnailFile ? 'Change Image' : 'Choose Image'}
                  </button>
                  {thumbnailFile && <p className="text-white/30 text-xs mt-2">{thumbnailFile.name}</p>}
                  {thumbnailFile && (
                    <button type="button"
                      onClick={() => { setThumbnailFile(null); setThumbnailPreview(''); if (fileInputRef.current) fileInputRef.current.value = '' }}
                      className="text-red-400/60 hover:text-red-400 text-xs mt-1 transition-colors">Remove</button>
                  )}
                </div>
              </div>
            </div>
            <div className="md:col-span-2 flex items-center gap-3">
              <button type="button" onClick={() => setForm(p => ({ ...p, is_published: !p.is_published }))}
                className={`w-10 h-6 rounded-full transition-colors duration-200 relative ${form.is_published ? 'bg-purple-600' : 'bg-white/10'}`}>
                <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200"
                  style={{ left: form.is_published ? '18px' : '2px' }} />
              </button>
              <span className="text-white/50 text-xs font-bold tracking-widest uppercase">
                {form.is_published ? 'Published' : 'Draft'}
              </span>
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={save} disabled={saving || !form.title || !form.description || !form.published_at}
              className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black px-6 py-2.5 rounded-lg text-xs tracking-widest uppercase transition-all duration-200">
              {saving ? 'Saving…' : 'Save Post'}
            </button>
            <ActionButton variant="ghost" onClick={() => { setShowForm(false); resetForm() }}>Cancel</ActionButton>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {data.length === 0 && <p className="text-white/30 text-sm">No news posts yet.</p>}
        {data.map((n: any) => (
          <div key={n.id} className="bg-white/5 border border-white/8 rounded-2xl px-6 py-4 flex items-center gap-4">
            {n.thumbnail && <img src={n.thumbnail} className="w-16 h-12 object-cover rounded-lg opacity-70 shrink-0" alt="" />}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1 flex-wrap">
                <span className="text-white font-bold truncate">{n.title}</span>
                <Badge color="purple">{n.tag}</Badge>
                {!n.is_published && <Badge color="gray">Draft</Badge>}
              </div>
              <p className="text-white/40 text-xs truncate">{n.published_at} · {n.description.slice(0, 80)}…</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <ActionButton variant="ghost" onClick={() => toggle(n.id, n.is_published)}>
                {n.is_published ? 'Unpublish' : 'Publish'}
              </ActionButton>
              <ActionButton variant="danger" onClick={() => remove(n.id)}>Delete</ActionButton>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Players section ───────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, 'green' | 'yellow' | 'gray'> = {
  active: 'green',
  suspended: 'yellow',
  inactive: 'gray',
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  suspended: 'Suspended',
  inactive: 'Inactive',
}

type PlayerData = {
  id: number
  username: string
  ingame_username: string
  avatar: string
  bio: string
  game: string
  game_id: number | null
  game_title: string
  role: string
  rank: string
  status: string
  team: string | null
  team_id: number | null
  discord_username: string
  first_name: string
  last_name: string
  age: number | null
  email: string
  phone: string
  address: string
  joined_at: string
}

const EMPTY_PLAYER: Omit<PlayerData, 'id' | 'joined_at'> = {
  username: '',
  ingame_username: '',
  avatar: '',
  bio: '',
  game: '',
  game_id: null,
  game_title: '',
  role: 'player',
  rank: '',
  status: 'active',
  team: null,
  team_id: null,
  discord_username: '',
  first_name: '',
  last_name: '',
  age: null,
  email: '',
  phone: '',
  address: '',
}

function PlayerModal({
  initial,
  isEdit,
  gamesList,
  teamsList,
  onSave,
  onClose,
}: {
  initial: typeof EMPTY_PLAYER & { id?: number }
  isEdit: boolean
  gamesList: any[]
  teamsList: any[]
  onSave: (data: any, avatarFile: File | null) => Promise<void>
  onClose: () => void
}) {
  const [tab, setTab] = useState<'profile' | 'personal'>('profile')
  const [form, setForm] = useState(initial)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState(initial.avatar || '')
  const [saving, setSaving] = useState(false)
  const avatarRef = useRef<HTMLInputElement>(null)

  const handleGameChange = (slug: string) => {
    setForm(p => ({ ...p, game: slug, game_id: null, rank: '' }))
  }

  const selectedGame = gamesList.find(g => g.slug === form.game)
  const ranks: string[] = selectedGame?.ranks || []

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    setAvatarFile(file)
    if (file) setAvatarPreview(URL.createObjectURL(file))
    else setAvatarPreview(initial.avatar || '')
  }

  const handleSubmit = async () => {
    if (!form.username) return
    setSaving(true)
    try {
      await onSave(form, avatarFile)
      onClose()
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  const inputClass = 'bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-purple-500/60 w-full placeholder-white/20'
  const labelClass = 'block text-white/40 text-[10px] font-bold tracking-widest uppercase mb-1'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="bg-[#13001f] border border-white/10 rounded-3xl w-full max-w-lg shadow-2xl shadow-purple-900/30 flex flex-col"
        style={{ maxHeight: 'min(88vh, 660px)' }}
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-white/8">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl border-2 border-dashed border-white/15 flex items-center justify-center overflow-hidden cursor-pointer hover:border-purple-500/50 transition-colors shrink-0"
              onClick={() => avatarRef.current?.click()}
              title="Click to change avatar"
            >
              {avatarPreview
                ? <img src={avatarPreview} className="w-full h-full object-cover" alt="avatar" />
                : <span className="text-white/20 text-lg font-black">
                    {form.username ? form.username[0].toUpperCase() : '?'}
                  </span>
              }
            </div>
            <input ref={avatarRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
            <div>
              <h3 className="text-white font-black text-base uppercase tracking-wide" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                {isEdit ? `Edit — ${initial.username}` : 'Add Player'}
              </h3>
              <p className="text-white/25 text-[10px] tracking-widest">
                {isEdit ? 'Update player information' : 'Fill in player details'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white transition-colors text-xl">✕</button>
        </div>

        <div className="flex gap-1 px-6 pt-3 pb-1">
          {(['profile', 'personal'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-black tracking-widest uppercase transition-all duration-150 ${
                tab === t
                  ? 'bg-purple-600/25 text-purple-300 border border-purple-500/30'
                  : 'text-white/30 hover:text-white/60'
              }`}
            >
              {t === 'profile' ? '⚡ Profile' : '👤 Personal'}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-3" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {tab === 'profile' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Username *</label>
                <input placeholder="e.g. NebX" value={form.username}
                  onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                  className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>In-Game Username *</label>
                <input placeholder="e.g. Neb#1234" value={form.ingame_username}
                  onChange={e => setForm(p => ({ ...p, ingame_username: e.target.value }))}
                  className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Game</label>
                <select value={form.game} onChange={e => handleGameChange(e.target.value)}
                  className={inputClass + ' cursor-pointer'}>
                  <option value="" className="bg-[#1a0030]">Select game</option>
                  {gamesList.map(g => (
                    <option key={g.slug} value={g.slug} className="bg-[#1a0030]">{g.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Rank</label>
                {ranks.length > 0 ? (
                  <select value={form.rank} onChange={e => setForm(p => ({ ...p, rank: e.target.value }))}
                    disabled={!form.game}
                    className={inputClass + ' cursor-pointer disabled:opacity-40'}>
                    <option value="" className="bg-[#1a0030]">Select rank</option>
                    {ranks.map(r => <option key={r} value={r} className="bg-[#1a0030]">{r}</option>)}
                  </select>
                ) : (
                  <input placeholder="e.g. Diamond" value={form.rank}
                    onChange={e => setForm(p => ({ ...p, rank: e.target.value }))}
                    className={inputClass} />
                )}
              </div>
              <div>
                <label className={labelClass}>Role</label>
                <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                  className={inputClass + ' cursor-pointer'}>
                  {[['player','Player'],['captain','Captain'],['coach','Coach'],['substitute','Substitute'],['content_creator','Content Creator']].map(([v, l]) => (
                    <option key={v} value={v} className="bg-[#1a0030]">{l}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Status</label>
                <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                  className={inputClass + ' cursor-pointer'}>
                  <option value="active" className="bg-[#1a0030]">Active</option>
                  <option value="suspended" className="bg-[#1a0030]">Suspended</option>
                  <option value="inactive" className="bg-[#1a0030]">Inactive</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className={labelClass}>Team</label>
                <select value={form.team_id ?? ''} onChange={e => setForm(p => ({ ...p, team_id: e.target.value ? Number(e.target.value) : null }))}
                  className={inputClass + ' cursor-pointer'}>
                  <option value="" className="bg-[#1a0030]">No team</option>
                  {teamsList.map((t: any) => (
                    <option key={t.id} value={t.id} className="bg-[#1a0030]">{t.name}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className={labelClass}>Discord Username</label>
                <input placeholder="e.g. nebx#0000" value={form.discord_username}
                  onChange={e => setForm(p => ({ ...p, discord_username: e.target.value }))}
                  className={inputClass} />
              </div>
              <div className="col-span-2">
                <label className={labelClass}>Bio</label>
                <textarea placeholder="Short player bio…" value={form.bio}
                  onChange={e => setForm(p => ({ ...p, bio: e.target.value }))}
                  className={inputClass + ' h-16 resize-none'} />
              </div>
              <div className="col-span-2">
                <p className="text-white/20 text-[10px]">
                  💡 Click the avatar circle at the top to upload a photo
                </p>
              </div>
            </div>
          )}

          {tab === 'personal' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>First Name</label>
                <input placeholder="e.g. Yacine" value={form.first_name}
                  onChange={e => setForm(p => ({ ...p, first_name: e.target.value }))}
                  className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Last Name</label>
                <input placeholder="e.g. Benzema" value={form.last_name}
                  onChange={e => setForm(p => ({ ...p, last_name: e.target.value }))}
                  className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Age</label>
                <input type="number" min="10" max="99" placeholder="e.g. 21" value={form.age ?? ''}
                  onChange={e => setForm(p => ({ ...p, age: e.target.value ? Number(e.target.value) : null }))}
                  className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Email</label>
                <input type="email" placeholder="e.g. player@email.com" value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Phone</label>
                <input placeholder="e.g. +213 555 123456" value={form.phone}
                  onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                  className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Address</label>
                <input placeholder="e.g. Algiers, Algeria" value={form.address}
                  onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
                  className={inputClass} />
              </div>
              <div className="col-span-2 pt-2">
                <p className="text-white/15 text-[10px] tracking-wide">
                  🔒 Personal information is only visible to staff members and is never shared publicly.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-white/8">
          <button
            onClick={handleSubmit}
            disabled={saving || !form.username}
            className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black px-6 py-2.5 rounded-xl text-xs tracking-widest uppercase transition-all duration-200"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Player'}
          </button>
          <ActionButton variant="ghost" onClick={onClose}>Cancel</ActionButton>
        </div>
      </div>
    </div>
  )
}

function StatusDropdown({
  currentStatus,
  onSelect,
}: {
  currentStatus: string
  onSelect: (status: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const OPTIONS: [string, string, string][] = [
    ['active',    'bg-green-400',  'Active'],
    ['suspended', 'bg-yellow-400', 'Suspend'],
    ['inactive',  'bg-gray-500',   'Deactivate'],
  ]

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className="bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white text-xs font-bold px-3 py-2 rounded-lg tracking-wider uppercase transition-all duration-200 flex items-center gap-1.5"
      >
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
          currentStatus === 'active'
            ? 'bg-green-400'
            : currentStatus === 'suspended'
            ? 'bg-yellow-400'
            : 'bg-gray-500'
        }`} />
        {STATUS_LABELS[currentStatus] ?? 'Status'}
        <span className={`transition-transform duration-150 ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-30 bg-[#1a0030] border border-white/12 rounded-xl shadow-2xl shadow-black/50 overflow-hidden min-w-[140px]"
          style={{ marginTop: '4px' }}
        >
          {OPTIONS.map(([val, dotColor, label]) => (
            <button
              key={val}
              onClick={() => { onSelect(val); setOpen(false) }}
              className={`flex items-center gap-2.5 w-full text-left px-4 py-2.5 text-xs font-bold tracking-wider uppercase transition-colors hover:bg-purple-500/15 ${
                currentStatus === val ? 'text-purple-400 bg-purple-500/10' : 'text-white/55'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function PlayersSection() {
  const [data, setData] = useState<PlayerData[]>([])
  const [gamesList, setGamesList] = useState<any[]>([])
  const [teamsList, setTeamsList] = useState<any[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<PlayerData | null>(null)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterGame, setFilterGame] = useState('')

  const load = () => {
    ;(players.listAll() as Promise<any>).then(r => setData(r.players || [])).catch(() => {})
    ;(games.listAll() as Promise<any>).then(r => setGamesList(r.games || [])).catch(() => {})
    ;(teams.listAll() as Promise<any>).then(r => setTeamsList(r.teams || [])).catch(() => {})
  }

  useEffect(() => { load() }, [])

  const getCsrf = () =>
    document.cookie.split('; ').find(c => c.startsWith('csrftoken='))?.split('=')[1] || ''

  const buildFormData = (form: any, avatarFile: File | null) => {
    const fd = new FormData()
    Object.entries(form).forEach(([k, v]) => {
      if (v !== null && v !== undefined) fd.append(k, String(v))
    })
    if (avatarFile) fd.append('avatar', avatarFile)
    return fd
  }

  const handleAdd = async (form: any, avatarFile: File | null) => {
    const fd = buildFormData(form, avatarFile)
    await fetch('/api/players/create/', {
      method: 'POST',
      credentials: 'include',
      headers: { 'X-CSRFToken': getCsrf() },
      body: fd,
    })
    load()
  }

  const handleEdit = async (form: any, avatarFile: File | null) => {
    if (!editing) return
    const fd = buildFormData(form, avatarFile)
    await fetch(`/api/players/${editing.id}/`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'X-CSRFToken': getCsrf() },
      body: fd,
    })
    load()
  }

  const remove = async (id: number, name: string) => {
    if (!confirm(`Permanently remove ${name}? This cannot be undone.`)) return
    await players.delete(id)
    load()
  }

  const quickStatus = async (id: number, status: string) => {
    await players.update(id, { status })
    load()
  }

  const displayed = data.filter(p => {
    if (filterStatus && p.status !== filterStatus) return false
    if (filterGame && p.game !== filterGame) return false
    return true
  })

  return (
    <div>
      <SectionHeader
        title="Players"
        action={
          <div className="flex items-center gap-2">
            <select value={filterGame} onChange={e => setFilterGame(e.target.value)}
              className="bg-white/5 border border-white/10 text-white text-xs px-3 py-2 rounded-lg cursor-pointer">
              <option value="">All Games</option>
              {gamesList.map(g => <option key={g.slug} value={g.slug} className="bg-[#1a0030]">{g.title}</option>)}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="bg-white/5 border border-white/10 text-white text-xs px-3 py-2 rounded-lg cursor-pointer">
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="inactive">Inactive</option>
            </select>
            <ActionButton onClick={() => setShowAdd(true)}>+ Add Player</ActionButton>
          </div>
        }
      />

      <div className="space-y-2">
        {displayed.length === 0 && (
          <p className="text-white/30 text-sm py-4">No players found.</p>
        )}
        {displayed.map((p: PlayerData) => (
          <div
            key={p.id}
            className={`bg-white/5 border border-white/8 rounded-2xl px-5 py-4 flex items-center gap-4 transition-opacity ${
              p.status === 'inactive' ? 'opacity-40' : p.status === 'suspended' ? 'opacity-70' : ''
            }`}
          >
            <div className="w-11 h-11 rounded-xl overflow-hidden shrink-0 border border-white/10 bg-purple-900/30 flex items-center justify-center">
              {p.avatar
                ? (
                  <img
                    src={p.avatar.startsWith('http') ? p.avatar : p.avatar}
                    className="w-full h-full object-cover"
                    alt={p.username}
                    onError={e => {
                      (e.currentTarget as HTMLImageElement).style.display = 'none'
                      const parent = e.currentTarget.parentElement
                      if (parent) {
                        const span = document.createElement('span')
                        span.className = 'text-purple-300 text-sm font-black'
                        span.textContent = p.username[0]?.toUpperCase() ?? '?'
                        parent.appendChild(span)
                      }
                    }}
                  />
                )
                : <span className="text-purple-300 text-sm font-black">{p.username[0]?.toUpperCase() ?? '?'}</span>
              }
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                <span className="text-white font-bold text-sm">{p.username}</span>
                <Badge color={STATUS_COLORS[p.status] || 'gray'}>{STATUS_LABELS[p.status]}</Badge>
                <Badge color="purple">{p.role}</Badge>
                {p.game_title && <Badge color="gray">{p.game_title}</Badge>}
                {p.team && <Badge color="yellow">{p.team}</Badge>}
              </div>
              <p className="text-white/35 text-xs truncate">
                {p.ingame_username}
                {p.rank && ` · ${p.rank}`}
                {p.discord_username && ` · ${p.discord_username}`}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <StatusDropdown
                currentStatus={p.status}
                onSelect={status => quickStatus(p.id, status)}
              />
              <ActionButton onClick={() => setEditing(p)}>Manage</ActionButton>
              <ActionButton variant="danger" onClick={() => remove(p.id, p.username)}>Remove</ActionButton>
            </div>
          </div>
        ))}
      </div>

      {showAdd && (
        <PlayerModal
          initial={EMPTY_PLAYER as any}
          isEdit={false}
          gamesList={gamesList}
          teamsList={teamsList}
          onSave={handleAdd}
          onClose={() => setShowAdd(false)}
        />
      )}

      {editing && (
        <PlayerModal
          initial={editing}
          isEdit={true}
          gamesList={gamesList}
          teamsList={teamsList}
          onSave={handleEdit}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}

// ── Teams (Rosters) section ────────────────────────────────────────────────────
const GAME_COLORS_TEAM: Record<string, { bg: string; accent: string }> = {
  rocket_league: { bg: 'rgba(96,184,255,0.12)',  accent: '#60b8ff' },
  valorant:      { bg: 'rgba(255,112,128,0.12)', accent: '#ff7080' },
  fortnite:      { bg: 'rgba(255,215,0,0.12)',   accent: '#ffd700' },
}

const GAME_LABEL_TEAM: Record<string, string> = {
  rocket_league: 'Rocket League',
  valorant:      'Valorant',
  fortnite:      'Fortnite',
}

function RosterCard({
  team,
  onManage,
  onDelete,
}: {
  team: any
  onManage: () => void
  onDelete: () => void
}) {
  const { bg, accent } = GAME_COLORS_TEAM[team.game] || { bg: 'rgba(168,85,247,0.12)', accent: '#a855f7' }

  const initials = team.name
    .split(' ')
    .slice(0, 2)
    .map((w: string) => w[0]?.toUpperCase() ?? '')
    .join('')

  const totalSlots  = team.max_players || 5
  const mainPlayers = team.players     || []
  const subs        = team.substitutes || []
  const filled      = mainPlayers.length

  return (
    <div
      className="relative border border-white/10 rounded-2xl overflow-hidden flex flex-col transition-all duration-200 hover:border-purple-500/30"
      style={{ background: '#0f0020' }}
    >
      <div className="h-28 relative shrink-0" style={{ background: bg }}>
        {team.banner_url ? (
          <img src={team.banner_url} alt={team.name} className="w-full h-full object-cover opacity-60" />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: bg }}>
            <span className="font-black text-5xl select-none" style={{ color: accent, opacity: 0.25, fontFamily: "'Barlow Condensed', sans-serif" }}>
              {initials}
            </span>
          </div>
        )}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, #0f0020 0%, transparent 60%)' }} />
        {team.visibility === 'hidden' && (
          <span className="absolute top-2 right-2 text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full bg-black/50 text-white/40 border border-white/10">
            Hidden
          </span>
        )}
        <div
          className="absolute bottom-0 left-4 translate-y-1/2 w-12 h-12 rounded-xl border-2 border-[#0f0020] flex items-center justify-center overflow-hidden shrink-0"
          style={{ background: bg }}
        >
          {team.logo_url ? (
            <img src={team.logo_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="font-black text-xl select-none" style={{ color: accent, fontFamily: "'Barlow Condensed', sans-serif" }}>
              {initials}
            </span>
          )}
        </div>
      </div>

      <div className="pt-8 px-4 pb-4 flex flex-col flex-1 gap-3">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-white font-black text-base leading-tight uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              {team.name}
            </h3>
            <span
              className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full shrink-0 mt-0.5"
              style={{ background: bg, color: accent, border: `1px solid ${accent}40` }}
            >
              {GAME_LABEL_TEAM[team.game] ?? team.game}
            </span>
          </div>
          {team.description && (
            <p className="text-white/35 text-xs mt-1 line-clamp-2">{team.description}</p>
          )}
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-white/30 text-[10px] font-bold tracking-widest uppercase">Roster</span>
            <span className="text-white/40 text-[10px]">{filled}/{totalSlots}</span>
          </div>
          <div className="flex gap-1">
            {Array.from({ length: totalSlots }).map((_, i) => (
              <div key={i} className="h-1 flex-1 rounded-full" style={{ background: i < filled ? accent : 'rgba(255,255,255,0.08)' }} />
            ))}
          </div>
        </div>

        {team.igl && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold tracking-widest uppercase text-white/30">IGL</span>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-md overflow-hidden flex items-center justify-center text-[10px] font-black" style={{ background: bg, color: accent }}>
                {team.igl.avatar
                  ? <img src={team.igl.avatar} className="w-full h-full object-cover" alt="" />
                  : team.igl.username[0]?.toUpperCase()
                }
              </div>
              <span className="text-white/60 text-xs font-semibold">{team.igl.username}</span>
            </div>
          </div>
        )}

        {mainPlayers.length > 0 ? (
          <div className="flex items-center gap-1 flex-wrap">
            {mainPlayers.map((p: any) => (
              <div
                key={p.id}
                className="w-7 h-7 rounded-lg overflow-hidden flex items-center justify-center text-[10px] font-black border border-white/10"
                style={{ background: bg, color: accent }}
                title={p.username}
              >
                {p.avatar
                  ? <img src={p.avatar} className="w-full h-full object-cover" alt={p.username} />
                  : p.username[0]?.toUpperCase()
                }
              </div>
            ))}
            {subs.length > 0 && (
              <span className="text-[10px] text-white/25 font-bold pl-1">+{subs.length} sub{subs.length > 1 ? 's' : ''}</span>
            )}
          </div>
        ) : (
          <p className="text-white/20 text-[10px] tracking-wider">No players assigned yet</p>
        )}

        <div className="flex gap-2 mt-auto pt-2 border-t border-white/5">
          <button onClick={onManage} className="flex-1 bg-white/5 hover:bg-purple-500/15 border border-white/10 hover:border-purple-500/30 text-white/60 hover:text-white text-[10px] font-black py-2 rounded-lg tracking-widest uppercase transition-all duration-200">
            Manage
          </button>
          <button onClick={onDelete} className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400/70 hover:text-red-400 text-[10px] font-black px-3 py-2 rounded-lg tracking-widest uppercase transition-all duration-200">
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

function RosterModal({
  initial,
  isEdit,
  playersList,
  onSave,
  onClose,
}: {
  initial: any
  isEdit: boolean
  playersList: any[]
  onSave: (data: any) => Promise<void>
  onClose: () => void
}) {
  const [form, setForm] = useState({
    name:        initial.name        || '',
    game:        initial.game        || 'rocket_league',
    description: initial.description || '',
    banner_url:  initial.banner_url  || '',
    logo_url:    initial.logo_url    || '',
    max_players: initial.max_players ?? 5,
    igl_id:      initial.igl_id      ?? '',
    visibility:  initial.visibility  || 'public',
    is_active:   initial.is_active   ?? true,
  })
  const [saving, setSaving] = useState(false)

  const gamePlayers = playersList.filter(p => p.game === form.game && p.status === 'active')

  const inputClass = 'bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-purple-500/60 w-full placeholder-white/20'
  const labelClass = 'block text-white/40 text-[10px] font-bold tracking-widest uppercase mb-1'

  const handleSubmit = async () => {
    if (!form.name || !form.game) return
    setSaving(true)
    try {
      await onSave({ ...form, igl_id: form.igl_id || null, max_players: Number(form.max_players) })
      onClose()
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="bg-[#13001f] border border-white/10 rounded-3xl w-full max-w-lg shadow-2xl shadow-purple-900/30 flex flex-col"
        style={{ maxHeight: 'min(88vh, 640px)' }}
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-white/8">
          <div>
            <h3 className="text-white font-black text-base uppercase tracking-wide" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              {isEdit ? `Edit — ${initial.name}` : 'Create Roster'}
            </h3>
            <p className="text-white/25 text-[10px] tracking-widest">
              {isEdit ? 'Update roster details' : 'Set up a new team roster'}
            </p>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white transition-colors text-xl">✕</button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className={labelClass}>Roster Name *</label>
              <input placeholder="e.g. NBL Valorant Main" value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Game *</label>
              <select value={form.game} onChange={e => setForm(p => ({ ...p, game: e.target.value, igl_id: '' }))}
                className={inputClass + ' cursor-pointer'}>
                <option value="rocket_league" className="bg-[#1a0030]">Rocket League</option>
                <option value="valorant"      className="bg-[#1a0030]">Valorant</option>
                <option value="fortnite"      className="bg-[#1a0030]">Fortnite</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Max Players</label>
              <input type="number" min="1" max="20" value={form.max_players}
                onChange={e => setForm(p => ({ ...p, max_players: Number(e.target.value) }))} className={inputClass} />
            </div>
            <div className="col-span-2">
              <label className={labelClass}>In-Game Leader (IGL)</label>
              <select value={form.igl_id} onChange={e => setForm(p => ({ ...p, igl_id: e.target.value }))}
                className={inputClass + ' cursor-pointer'}>
                <option value="" className="bg-[#1a0030]">No IGL assigned</option>
                {gamePlayers.map(p => (
                  <option key={p.id} value={p.id} className="bg-[#1a0030]">{p.username} ({p.role})</option>
                ))}
              </select>
              {gamePlayers.length === 0 && (
                <p className="text-white/20 text-[10px] mt-1">No active {GAME_LABEL_TEAM[form.game] ?? form.game} players found.</p>
              )}
            </div>
            <div className="col-span-2">
              <label className={labelClass}>Banner Image URL</label>
              <input placeholder="https://…" value={form.banner_url}
                onChange={e => setForm(p => ({ ...p, banner_url: e.target.value }))} className={inputClass} />
              {form.banner_url && (
                <img src={form.banner_url} alt="preview" className="mt-2 w-full h-16 object-cover rounded-xl border border-white/10 opacity-70" />
              )}
            </div>
            <div className="col-span-2">
              <label className={labelClass}>Logo / Icon URL</label>
              <input placeholder="https://…" value={form.logo_url}
                onChange={e => setForm(p => ({ ...p, logo_url: e.target.value }))} className={inputClass} />
            </div>
            <div className="col-span-2">
              <label className={labelClass}>Description</label>
              <textarea placeholder="Short description about this roster…" value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                className={inputClass + ' h-16 resize-none'} />
            </div>
            <div className="col-span-2 grid grid-cols-2 gap-3">
              <div className="flex items-center gap-3">
                <button type="button"
                  onClick={() => setForm(p => ({ ...p, visibility: p.visibility === 'public' ? 'hidden' : 'public' }))}
                  className={`w-9 h-5 rounded-full transition-colors duration-200 relative shrink-0 ${form.visibility === 'public' ? 'bg-green-600' : 'bg-white/10'}`}>
                  <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200"
                    style={{ left: form.visibility === 'public' ? '16px' : '2px' }} />
                </button>
                <div>
                  <p className="text-white/50 text-[10px] font-bold tracking-widest uppercase">{form.visibility === 'public' ? 'Public' : 'Hidden'}</p>
                  <p className="text-white/20 text-[10px]">Visible on public site</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button type="button"
                  onClick={() => setForm(p => ({ ...p, is_active: !p.is_active }))}
                  className={`w-9 h-5 rounded-full transition-colors duration-200 relative shrink-0 ${form.is_active ? 'bg-purple-600' : 'bg-white/10'}`}>
                  <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200"
                    style={{ left: form.is_active ? '16px' : '2px' }} />
                </button>
                <div>
                  <p className="text-white/50 text-[10px] font-bold tracking-widest uppercase">{form.is_active ? 'Active' : 'Inactive'}</p>
                  <p className="text-white/20 text-[10px]">Roster is competing</p>
                </div>
              </div>
            </div>
            <div className="col-span-2">
              <p className="text-white/15 text-[10px] tracking-wide">
                Players are assigned to rosters via the Players section. The IGL must be an active player for this game.
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-white/8">
          <button onClick={handleSubmit} disabled={saving || !form.name}
            className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black px-6 py-2.5 rounded-xl text-xs tracking-widest uppercase transition-all duration-200"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Roster'}
          </button>
          <ActionButton variant="ghost" onClick={onClose}>Cancel</ActionButton>
        </div>
      </div>
    </div>
  )
}

function TeamsSection() {
  const [data, setData]               = useState<any[]>([])
  const [playersList, setPlayersList] = useState<any[]>([])
  const [showAdd, setShowAdd]         = useState(false)
  const [editing, setEditing]         = useState<any | null>(null)
  const [filterGame, setFilterGame]   = useState('')
  const [filterVis, setFilterVis]     = useState('')

  const load = () => {
    ;(teams.listAll()   as Promise<any>).then(r => setData(r.teams     || [])).catch(() => {})
    ;(players.listAll() as Promise<any>).then(r => setPlayersList(r.players || [])).catch(() => {})
  }

  useEffect(() => { load() }, [])

  const handleAdd  = async (payload: any) => { await teams.create(payload); load() }
  const handleEdit = async (payload: any) => { if (!editing) return; await teams.update(editing.id, payload); load() }
  const remove     = async (id: number, name: string) => {
    if (!confirm(`Delete roster "${name}"? Players will not be removed.`)) return
    await teams.delete(id)
    load()
  }

  const displayed = data.filter(t => {
    if (filterGame && t.game       !== filterGame) return false
    if (filterVis  && t.visibility !== filterVis)  return false
    return true
  })

  return (
    <div>
      <SectionHeader
        title="Rosters"
        action={
          <div className="flex items-center gap-2">
            <select value={filterGame} onChange={e => setFilterGame(e.target.value)}
              className="bg-white/5 border border-white/10 text-white text-xs px-3 py-2 rounded-lg cursor-pointer">
              <option value="">All Games</option>
              <option value="rocket_league">Rocket League</option>
              <option value="valorant">Valorant</option>
              <option value="fortnite">Fortnite</option>
            </select>
            <select value={filterVis} onChange={e => setFilterVis(e.target.value)}
              className="bg-white/5 border border-white/10 text-white text-xs px-3 py-2 rounded-lg cursor-pointer">
              <option value="">All</option>
              <option value="public">Public</option>
              <option value="hidden">Hidden</option>
            </select>
            <ActionButton onClick={() => setShowAdd(true)}>+ New Roster</ActionButton>
          </div>
        }
      />

      {displayed.length === 0 ? (
        <div className="text-center py-16 border border-white/5 rounded-2xl">
          <p className="text-white/20 text-sm tracking-wider">No rosters found.</p>
          <button onClick={() => setShowAdd(true)} className="mt-4 text-purple-400 text-xs font-bold tracking-widest uppercase hover:text-purple-300 transition-colors">
            Create your first roster →
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {displayed.map(t => (
            <RosterCard key={t.id} team={t} onManage={() => setEditing(t)} onDelete={() => remove(t.id, t.name)} />
          ))}
        </div>
      )}

      {showAdd && (
        <RosterModal initial={{}} isEdit={false} playersList={playersList} onSave={handleAdd} onClose={() => setShowAdd(false)} />
      )}
      {editing && (
        <RosterModal initial={editing} isEdit={true} playersList={playersList} onSave={handleEdit} onClose={() => setEditing(null)} />
      )}
    </div>
  )
}

// ── Games section ─────────────────────────────────────────────────────────────
const EMPTY_GAME_FORM = {
  title: '',
  slug: '',
  publisher: '',
  genre: '',
  banner: '',
  overlay_color: '',
  is_active: true,
  registration_open: false,
  display_order: -1 as number,
  ranks: [] as string[],
}

function GameFormModal({
  initial,
  isEdit,
  onSave,
  onClose,
  autoOrder,
}: {
  initial: typeof EMPTY_GAME_FORM
  isEdit: boolean
  onSave: (data: any) => Promise<void>
  onClose: () => void
  autoOrder: number
}) {
  const [form, setForm] = useState(initial)
  const [ranksText, setRanksText] = useState((initial.ranks ?? []).join('\n'))
  const [saving, setSaving] = useState(false)

  const inputClass = 'bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-purple-500/60 w-full'

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value
    if (!isEdit) {
      const slug = title.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
      setForm(p => ({ ...p, title, slug }))
    } else {
      setForm(p => ({ ...p, title }))
    }
  }

  const handleSubmit = async () => {
    if (!form.title || !form.slug) return
    setSaving(true)
    try {
      const ranks = ranksText.split('\n').map(r => r.trim()).filter(Boolean)
      const display_order = form.display_order === -1 ? autoOrder : form.display_order
      await onSave({ ...form, ranks, display_order })
      onClose()
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.80)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="bg-[#13001f] rounded-3xl w-full max-w-xl shadow-2xl shadow-purple-900/30 flex flex-col"
        style={{ maxHeight: 'min(85vh, 600px)' }}
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <h3 className="text-white font-black text-lg uppercase tracking-wide" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
            {isEdit ? 'Manage Game' : 'Add Game'}
          </h3>
          <button onClick={onClose} className="text-white/30 hover:text-white transition-colors text-xl">✕</button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-white/40 text-[10px] font-bold tracking-widest uppercase mb-1">Title *</label>
              <input placeholder="e.g. Rocket League" value={form.title} onChange={handleTitleChange} className={inputClass} />
            </div>
            <div>
              <label className="block text-white/40 text-[10px] font-bold tracking-widest uppercase mb-1">
                Slug * {!isEdit && <span className="normal-case text-white/20">(auto)</span>}
              </label>
              <input placeholder="e.g. RL" value={form.slug}
                onChange={e => setForm(p => ({ ...p, slug: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') }))}
                className={inputClass} />
            </div>
            <div>
              <label className="block text-white/40 text-[10px] font-bold tracking-widest uppercase mb-1">Publisher</label>
              <input placeholder="e.g. Psyonix" value={form.publisher}
                onChange={e => setForm(p => ({ ...p, publisher: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className="block text-white/40 text-[10px] font-bold tracking-widest uppercase mb-1">Genre</label>
              <input placeholder="e.g. Tactical FPS" value={form.genre}
                onChange={e => setForm(p => ({ ...p, genre: e.target.value }))} className={inputClass} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-white/40 text-[10px] font-bold tracking-widest uppercase mb-1">Banner Image URL</label>
              <input placeholder="https://…" value={form.banner}
                onChange={e => setForm(p => ({ ...p, banner: e.target.value }))} className={inputClass} />
              {form.banner && (
                <img src={form.banner} alt="preview" className="mt-2 w-full h-20 object-cover rounded-xl border border-white/10 opacity-80" />
              )}
            </div>
            <div>
              <label className="block text-white/40 text-[10px] font-bold tracking-widest uppercase mb-1">Overlay Color</label>
              <input placeholder="rgba(0,48,135,0.4)" value={form.overlay_color}
                onChange={e => setForm(p => ({ ...p, overlay_color: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className="block text-white/40 text-[10px] font-bold tracking-widest uppercase mb-1">
                Display Order
                {form.display_order === -1 && <span className="normal-case text-white/20 ml-1">(auto → {autoOrder})</span>}
              </label>
              <input type="number" min="0" placeholder={`auto (${autoOrder})`}
                value={form.display_order === -1 ? '' : form.display_order}
                onChange={e => setForm(p => ({ ...p, display_order: e.target.value === '' ? -1 : parseInt(e.target.value) || 0 }))}
                className={inputClass} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-white/40 text-[10px] font-bold tracking-widest uppercase mb-1">
                Ranks <span className="normal-case text-white/20">(one per line)</span>
              </label>
              <textarea placeholder={"Bronze I\nBronze II\nSilver I\nGold I\n…"} value={ranksText}
                onChange={e => setRanksText(e.target.value)}
                className={inputClass + ' h-24 resize-none font-mono text-xs'} />
              <p className="text-white/20 text-[10px] mt-1">
                {ranksText.split('\n').filter(r => r.trim()).length} rank(s) defined
              </p>
            </div>
            <div className="md:col-span-2 grid grid-cols-2 gap-3">
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setForm(p => ({ ...p, is_active: !p.is_active }))}
                  className={`w-9 h-5 rounded-full transition-colors duration-200 relative shrink-0 ${form.is_active ? 'bg-purple-600' : 'bg-white/10'}`}>
                  <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200"
                    style={{ left: form.is_active ? '16px' : '2px' }} />
                </button>
                <div>
                  <p className="text-white/50 text-[10px] font-bold tracking-widest uppercase">{form.is_active ? 'Active' : 'Inactive'}</p>
                  <p className="text-white/20 text-[10px]">Shown in games showcase</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setForm(p => ({ ...p, registration_open: !p.registration_open }))}
                  className={`w-9 h-5 rounded-full transition-colors duration-200 relative shrink-0 ${form.registration_open ? 'bg-green-600' : 'bg-white/10'}`}>
                  <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200"
                    style={{ left: form.registration_open ? '16px' : '2px' }} />
                </button>
                <div>
                  <p className="text-white/50 text-[10px] font-bold tracking-widest uppercase">{form.registration_open ? 'Recruiting' : 'Closed'}</p>
                  <p className="text-white/20 text-[10px]">Shown in join form</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4">
          <button onClick={handleSubmit} disabled={saving || !form.title || !form.slug}
            className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black px-6 py-2 rounded-xl text-xs tracking-widest uppercase transition-all duration-200"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Game'}
          </button>
          <ActionButton variant="ghost" onClick={onClose}>Cancel</ActionButton>
        </div>
      </div>
    </div>
  )
}

function GamesSection() {
  const [data, setData] = useState<any[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingGame, setEditingGame] = useState<typeof EMPTY_GAME_FORM | null>(null)

  const load = () => {
    (games.listAll() as Promise<any>).then(r => setData(r.games || [])).catch(() => {})
  }

  useEffect(() => { load() }, [])

  const nextOrder = data.length > 0 ? Math.max(...data.map((g: any) => g.display_order ?? 0)) + 1 : 0

  const handleAdd  = async (payload: any) => { await games.create(payload); load() }
  const handleEdit = async (payload: any) => { if (!editingGame) return; await games.update((editingGame as any).id, payload); load() }
  const openEdit   = (g: any) => setEditingGame({ ...EMPTY_GAME_FORM, ...g })
  const remove     = async (id: number) => {
    if (!confirm('Delete this game? This will affect related join requests.')) return
    await games.delete(id)
    load()
  }

  return (
    <div>
      <SectionHeader
        title="Games"
        action={<ActionButton onClick={() => setShowAddModal(true)}>+ Add Game</ActionButton>}
      />

      <div className="space-y-3">
        {data.length === 0 && <p className="text-white/30 text-sm">No games yet.</p>}
        {data.map((g: any) => (
          <div key={g.id} className={`bg-white/5 border border-white/8 rounded-2xl p-5 flex items-center gap-4 transition-opacity ${!g.is_active ? 'opacity-50' : ''}`}>
            <div className="w-24 h-16 rounded-xl shrink-0 overflow-hidden border border-white/10">
              {g.banner
                ? <img src={g.banner} alt={g.title} className="w-full h-full object-cover" />
                : <div className="w-full h-full bg-white/5 flex items-center justify-center">
                    <span className="text-white/20 text-xl font-black">{g.title.charAt(0)}</span>
                  </div>
              }
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1 flex-wrap">
                <span className="text-white font-bold">{g.title}</span>
                <Badge color="purple">{g.slug}</Badge>
                {!g.is_active && <Badge color="gray">Inactive</Badge>}
                {g.is_active && g.registration_open  && <Badge color="green">Recruiting</Badge>}
                {g.is_active && !g.registration_open && <Badge color="gray">Closed</Badge>}
              </div>
              <p className="text-white/40 text-xs">
                {[g.genre, g.publisher].filter(Boolean).join(' · ')}
                {g.ranks?.length > 0 && ` · ${g.ranks.length} ranks`}
                {` · Order: ${g.display_order}`}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <ActionButton variant="ghost" onClick={() => openEdit(g)}>Manage</ActionButton>
              <ActionButton variant="danger" onClick={() => remove(g.id)}>Delete</ActionButton>
            </div>
          </div>
        ))}
      </div>

      {showAddModal && (
        <GameFormModal initial={EMPTY_GAME_FORM} isEdit={false} onSave={handleAdd} onClose={() => setShowAddModal(false)} autoOrder={nextOrder} />
      )}
      {editingGame && (
        <GameFormModal initial={editingGame} isEdit={true} onSave={handleEdit} onClose={() => setEditingGame(null)} autoOrder={nextOrder} />
      )}
    </div>
  )
}

// ── Spotlight section ─────────────────────────────────────────────────────────
function SpotlightSection() {
  const [data, setData] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingSlide, setEditingSlide] = useState<any | null>(null)

  const load = () => {
    ;(spotlight.listAll() as Promise<any>).then(r => setData(r.slides || [])).catch(() => {})
  }

  useEffect(() => { load() }, [])

  const getCsrf = () =>
    document.cookie.split('; ').find(c => c.startsWith('csrftoken='))?.split('=')[1] || ''

  const remove = async (id: number, name: string) => {
    if (!confirm(`Delete "${name || 'this slide'}"?`)) return
    await spotlight.delete(id)
    load()
  }

  const toggleActive = async (id: number, is_active: boolean) => {
    await spotlight.update(id, { is_active: !is_active })
    load()
  }

  return (
    <div>
      <SectionHeader
        title="Spotlight"
        action={
          <ActionButton onClick={() => { setEditingSlide(null); setShowForm(v => !v) }}>
            {showForm ? 'Cancel' : '+ Add Slide'}
          </ActionButton>
        }
      />

      <p className="text-white/30 text-xs mb-6 tracking-wide">
        These slides cycle inside the hero floating card on the landing page. Supports videos (mp4/webm) and images. Click-through links are optional.
      </p>

      {(showForm || editingSlide) && (
        <SlideFormCard
          initial={editingSlide}
          getCsrf={getCsrf}
          onSaved={() => { setShowForm(false); setEditingSlide(null); load() }}
          onCancel={() => { setShowForm(false); setEditingSlide(null) }}
          nextOrder={data.length}
        />
      )}

      <div className="space-y-3 mt-4">
        {data.length === 0 && !showForm && !editingSlide && (
          <div className="bg-white/5 border border-white/8 rounded-2xl p-8 text-center">
            <p className="text-white/30 text-sm mb-2">No spotlight slides yet.</p>
            <p className="text-white/15 text-xs">Add a video or image to replace the default floating card on the landing page.</p>
          </div>
        )}
        {data.map((s: any) => (
          <div
            key={s.id}
            className={`bg-white/5 border border-white/8 rounded-2xl p-5 flex items-center gap-4 transition-opacity ${!s.is_active ? 'opacity-40' : ''}`}
          >
            {/* Thumbnail */}
            <div className="w-24 h-16 rounded-xl overflow-hidden shrink-0 border border-white/10 bg-black/30 flex items-center justify-center">
              {s.media_url ? (
                s.media_type === 'video'
                  ? (
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-purple-400 text-xl">▶</span>
                      <span className="text-white/30 text-[9px] tracking-widest uppercase">Video</span>
                    </div>
                  )
                  : <img src={s.media_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white/20 text-xs">No media</span>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1 flex-wrap">
                <span className="text-white font-bold text-sm truncate">{s.title || `Slide #${s.id}`}</span>
                <Badge color={s.media_type === 'video' ? 'purple' : 'yellow'}>{s.media_type}</Badge>
                {!s.is_active && <Badge color="gray">Hidden</Badge>}
              </div>
              <p className="text-white/35 text-xs truncate">
                {s.pill_label}
                {s.href && <span className="ml-2 text-purple-400/60">→ {s.href.slice(0, 40)}…</span>}
                <span className="ml-2 text-white/20">{s.duration}s · order {s.display_order}</span>
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-2 shrink-0">
              <ActionButton variant="ghost" onClick={() => toggleActive(s.id, s.is_active)}>
                {s.is_active ? 'Hide' : 'Show'}
              </ActionButton>
              <ActionButton onClick={() => { setShowForm(false); setEditingSlide(s) }}>Edit</ActionButton>
              <ActionButton variant="danger" onClick={() => remove(s.id, s.title)}>Delete</ActionButton>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Slide form (add / edit) ───────────────────────────────────────────────────
function SlideFormCard({
  initial,
  getCsrf,
  onSaved,
  onCancel,
  nextOrder,
}: {
  initial: any
  getCsrf: () => string
  onSaved: () => void
  onCancel: () => void
  nextOrder: number
}) {
  const isEdit = !!initial?.id
  const [mediaType, setMediaType] = useState<'video' | 'image'>(initial?.media_type || 'video')
  const [form, setForm] = useState({
    title:         initial?.title      || '',
    video_url:     initial?.media_type === 'video' ? (initial?.media_url || '') : '',
    image_url:     initial?.media_type === 'image' ? (initial?.media_url || '') : '',
    href:          initial?.href        || '',
    pill_label:    initial?.pill_label  || 'MATCH DAY · ROCKET LEAGUE',
    duration:      initial?.duration    || 8,
    is_active:     initial?.is_active  !== false,
    display_order: initial?.display_order ?? nextOrder,
  })
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const inputClass = 'bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-purple-500/60 w-full placeholder-white/20'
  const labelClass = 'block text-white/40 text-[10px] font-bold tracking-widest uppercase mb-1'

  const handleSave = async () => {
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('media_type',    mediaType)
      fd.append('title',         form.title)
      fd.append('href',          form.href)
      fd.append('pill_label',    form.pill_label)
      fd.append('duration',      String(form.duration))
      fd.append('is_active',     form.is_active ? 'true' : 'false')
      fd.append('display_order', String(form.display_order))

      if (mediaType === 'video') {
        fd.append('video_url', form.video_url)
        if (file) fd.append('video_file', file)
      } else {
        fd.append('image_url', form.image_url)
        if (file) fd.append('image_file', file)
      }

      const url    = isEdit ? `/api/spotlight/${initial.id}/` : '/api/spotlight/create/'
      const method = isEdit ? 'PATCH' : 'POST'

      await fetch(url, {
        method,
        credentials: 'include',
        headers: { 'X-CSRFToken': getCsrf() },
        body: fd,
      })
      onSaved()
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white/5 border border-purple-500/20 rounded-2xl p-6 mb-4">
      <h3
        className="text-white font-black text-sm uppercase tracking-wide mb-4"
        style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
      >
        {isEdit ? 'Edit Slide' : 'New Spotlight Slide'}
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Internal title */}
        <div className="md:col-span-2">
          <label className={labelClass}>Internal Title (staff only)</label>
          <input
            placeholder="e.g. Season 5 Trailer"
            value={form.title}
            onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
            className={inputClass}
          />
        </div>

        {/* Media type tabs */}
        <div className="md:col-span-2">
          <label className={labelClass}>Media Type</label>
          <div className="flex gap-2">
            {(['video', 'image'] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => { setMediaType(t); setFile(null) }}
                className={`px-4 py-1.5 rounded-lg text-xs font-black tracking-widest uppercase transition-all duration-150 ${
                  mediaType === t
                    ? 'bg-purple-600/25 text-purple-300 border border-purple-500/30'
                    : 'text-white/30 hover:text-white/60 bg-white/5 border border-white/10'
                }`}
              >
                {t === 'video' ? '▶ Video' : '🖼 Image'}
              </button>
            ))}
          </div>
        </div>

        {/* URL input */}
        <div>
          <label className={labelClass}>{mediaType === 'video' ? 'Video URL (.mp4 / .webm)' : 'Image URL'}</label>
          <input
            placeholder={mediaType === 'video' ? 'https://cdn.example.com/video.mp4' : 'https://cdn.example.com/banner.jpg'}
            value={mediaType === 'video' ? form.video_url : form.image_url}
            onChange={e => setForm(p =>
              mediaType === 'video'
                ? { ...p, video_url: e.target.value }
                : { ...p, image_url: e.target.value }
            )}
            className={inputClass}
          />
        </div>

        {/* File upload */}
        <div>
          <label className={labelClass}>Or Upload File</label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-500/40 text-white/50 hover:text-white text-xs font-bold px-3 py-2 rounded-lg tracking-wider uppercase transition-all duration-200"
            >
              {file ? 'Change' : 'Choose File'}
            </button>
            {file && <span className="text-white/30 text-xs truncate max-w-[140px]">{file.name}</span>}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept={mediaType === 'video' ? 'video/mp4,video/webm' : 'image/*'}
            onChange={e => setFile(e.target.files?.[0] || null)}
            className="hidden"
          />
        </div>

        {/* Pill label */}
        <div>
          <label className={labelClass}>Pill Label</label>
          <input
            placeholder="MATCH DAY · ROCKET LEAGUE"
            value={form.pill_label}
            onChange={e => setForm(p => ({ ...p, pill_label: e.target.value }))}
            className={inputClass}
          />
        </div>

        {/* Click-through link */}
        <div>
          <label className={labelClass}>Click-Through URL (optional)</label>
          <input
            placeholder="https://…"
            value={form.href}
            onChange={e => setForm(p => ({ ...p, href: e.target.value }))}
            className={inputClass}
          />
        </div>

        {/* Duration */}
        <div>
          <label className={labelClass}>Duration (seconds, images only)</label>
          <input
            type="number"
            min={2}
            max={60}
            value={form.duration}
            onChange={e => setForm(p => ({ ...p, duration: Number(e.target.value) }))}
            className={inputClass}
          />
        </div>

        {/* Order */}
        <div>
          <label className={labelClass}>Display Order</label>
          <input
            type="number"
            min={0}
            value={form.display_order}
            onChange={e => setForm(p => ({ ...p, display_order: Number(e.target.value) }))}
            className={inputClass}
          />
        </div>

        {/* Active toggle */}
        <div className="md:col-span-2 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setForm(p => ({ ...p, is_active: !p.is_active }))}
            className={`w-9 h-5 rounded-full transition-colors duration-200 relative shrink-0 ${form.is_active ? 'bg-purple-600' : 'bg-white/10'}`}
          >
            <span
              className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200"
              style={{ left: form.is_active ? '16px' : '2px' }}
            />
          </button>
          <span className="text-white/40 text-[10px] font-bold tracking-widest uppercase">
            {form.is_active ? 'Visible on site' : 'Hidden'}
          </span>
        </div>
      </div>

      <div className="flex gap-3 mt-5">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-black px-6 py-2.5 rounded-xl text-xs tracking-widest uppercase transition-all"
          style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
        >
          {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Slide'}
        </button>
        <ActionButton variant="ghost" onClick={onCancel}>Cancel</ActionButton>
      </div>
    </div>
  )
}

// ── Dashboard shell ───────────────────────────────────────────────────────────
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

  return (
    <div className="min-h-screen bg-[#0d0014] text-white flex" style={{ fontFamily: "'Barlow', sans-serif", zoom: 1.4 }}>

      <aside className={`fixed inset-y-0 left-0 z-40 w-60 bg-[#0a0010] border-r border-white/8 flex flex-col transition-transform duration-200
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        <div className="px-6 py-5 border-b border-white/8">
          <a href="/" className="flex items-center gap-3">
            <img src="/images/logo.svg" alt="" className="w-8 h-8" style={{ filter: 'brightness(0) invert(1)' }} />
            <div>
              <span className="block text-white font-black tracking-wider text-base" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                NBL<span className="text-purple-400">ESPORT</span>
              </span>
              <span className="block text-purple-400/50 text-xs tracking-widest">Dashboard</span>
            </div>
          </a>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => { setSection(item.id); setSidebarOpen(false) }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold tracking-wide transition-all duration-150
                ${section === item.id
                  ? 'bg-purple-600/25 text-purple-300 border border-purple-500/30'
                  : 'text-white/40 hover:text-white/70 hover:bg-white/5'}`}
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

      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/60 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <main className="flex-1 md:ml-60 min-h-screen">
        <div className="sticky top-0 z-20 bg-[#0d0014]/90 backdrop-blur border-b border-white/8 px-6 py-4 flex items-center justify-between md:hidden">
          <button onClick={() => setSidebarOpen(true)} className="text-white/60 hover:text-white">
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
  )
}