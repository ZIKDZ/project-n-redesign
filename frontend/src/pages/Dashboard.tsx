import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../App'
import { auth, joins, matches, news, players, teams } from '../utils/api'

// ── Types ─────────────────────────────────────────────────────────────────────
type Section = 'overview' | 'joins' | 'matches' | 'news' | 'players' | 'teams'

// ── Sidebar ───────────────────────────────────────────────────────────────────
const NAV_ITEMS: { id: Section; label: string; icon: string }[] = [
  { id: 'overview',  label: 'Overview',      icon: '⬡' },
  { id: 'joins',     label: 'Join Requests', icon: '✦' },
  { id: 'matches',   label: 'Matches',       icon: '⚡' },
  { id: 'news',      label: 'News',          icon: '◈' },
  { id: 'players',   label: 'Players',       icon: '◉' },
  { id: 'teams',     label: 'Teams',         icon: '◈' },
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

function ActionButton({ onClick, children, variant = 'primary' }: { onClick: () => void; children: React.ReactNode; variant?: 'primary' | 'danger' | 'ghost' }) {
  const styles = {
    primary: 'bg-purple-600 hover:bg-purple-500 text-white',
    danger:  'bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30',
    ghost:   'bg-white/5 hover:bg-white/10 text-white/60 border border-white/10',
  }
  return (
    <button
      onClick={onClick}
      className={`text-xs font-bold px-4 py-2 rounded-lg tracking-wider uppercase transition-all duration-200 ${styles[variant]}`}
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
  const [reviewed, setReviewed] = useState<any | null>(null) // join being reviewed in modal

  const load = () => {
    (joins.list(filter || undefined) as Promise<any>)
      .then(r => setData(r.joins || []))
      .catch(() => {})
  }

  useEffect(() => { load() }, [filter])

  const setStatus = async (id: number, status: string) => {
    await joins.updateStatus(id, { status })
    load()
  }

  const openReview = async (j: any) => {
    // mark as reviewing if still pending
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

      {/* List */}
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
              {/* Review button — hidden once accepted/rejected */}
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

      {/* Review Modal */}
      {reviewed && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setReviewed(null) }}
        >
          <div className="bg-[#13001f] border border-white/10 rounded-3xl p-8 w-full max-w-md shadow-2xl shadow-purple-900/30">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white font-black text-xl uppercase tracking-wide" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                Application Review
              </h3>
              <button onClick={() => setReviewed(null)} className="text-white/30 hover:text-white transition-colors text-xl">✕</button>
            </div>

            {/* Player info */}
            <div className="space-y-3 mb-8">
              {[
                { label: 'Username',       value: reviewed.username },
                { label: 'In-Game Name',   value: reviewed.ingame_username },
                { label: 'Game',           value: GAME_LABELS[reviewed.game] ?? reviewed.game },
                { label: 'Rank',           value: reviewed.rank },
                { label: 'Discord',        value: reviewed.discord_username },
                { label: 'Email',          value: reviewed.email },
                { label: 'Submitted',      value: new Date(reviewed.submitted_at).toLocaleDateString() },
              ].map(row => (
                <div key={row.label} className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-white/40 text-xs font-bold tracking-widest uppercase">{row.label}</span>
                  <span className="text-white text-sm font-semibold">{row.value}</span>
                </div>
              ))}
            </div>

            {/* Notes */}
            <textarea
              placeholder="Internal notes (optional)…"
              defaultValue={reviewed.notes}
              onBlur={e => joins.updateStatus(reviewed.id, { notes: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none focus:border-purple-500/60 resize-none h-20 mb-6"
            />

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleAccept}
                className="flex-1 bg-green-600 hover:bg-green-500 text-white font-black py-3 rounded-xl text-sm tracking-widest uppercase transition-all duration-200"
                style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
              >
                Accept
              </button>
              <button
                onClick={handleReject}
                className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 font-black py-3 rounded-xl text-sm tracking-widest uppercase transition-all duration-200"
                style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
              >
                Reject
              </button>
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
function NewsSection() {
  const [data, setData] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', tag: 'announcement', description: '', thumbnail_url: '', published_at: '', is_published: true })

  const load = () => {
    (news.listAll() as Promise<any>).then(r => setData(r.news || [])).catch(() => {})
  }

  useEffect(() => { load() }, [])

  const save = async () => {
    await news.create(form)
    setShowForm(false)
    setForm({ title: '', tag: 'announcement', description: '', thumbnail_url: '', published_at: '', is_published: true })
    load()
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
        action={<ActionButton onClick={() => setShowForm(v => !v)}>+ New Post</ActionButton>}
      />

      {showForm && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <input placeholder="Title" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className={inputClass} />
          <input type="date" value={form.published_at} onChange={e => setForm(p => ({ ...p, published_at: e.target.value }))} className={inputClass} />
          <input placeholder="Thumbnail URL" value={form.thumbnail_url} onChange={e => setForm(p => ({ ...p, thumbnail_url: e.target.value }))} className={inputClass} />
          <select value={form.tag} onChange={e => setForm(p => ({ ...p, tag: e.target.value }))} className={inputClass + ' cursor-pointer'}>
            {['announcement','award','community','match','roster','update'].map(t => (
              <option key={t} value={t} className="bg-[#1a0030]">{t}</option>
            ))}
          </select>
          <textarea placeholder="Description" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            className={inputClass + ' md:col-span-2 h-24 resize-none'} />
          <div className="md:col-span-2 flex gap-3">
            <ActionButton onClick={save}>Save Post</ActionButton>
            <ActionButton variant="ghost" onClick={() => setShowForm(false)}>Cancel</ActionButton>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {data.length === 0 && <p className="text-white/30 text-sm">No news posts yet.</p>}
        {data.map((n: any) => (
          <div key={n.id} className="bg-white/5 border border-white/8 rounded-2xl px-6 py-4 flex items-center gap-4">
            {n.thumbnail && <img src={n.thumbnail} className="w-16 h-12 object-cover rounded-lg opacity-70" alt="" />}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <span className="text-white font-bold">{n.title}</span>
                <Badge color="purple">{n.tag}</Badge>
                {!n.is_published && <Badge color="gray">Draft</Badge>}
              </div>
              <p className="text-white/40 text-xs">{n.published_at} · {n.description.slice(0, 80)}…</p>
            </div>
            <div className="flex gap-2">
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
function PlayersSection() {
  const [data, setData] = useState<any[]>([])
  const [teamsList, setTeamsList] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ username: '', ingame_username: '', game: 'rocket_league', role: 'player', rank: '', discord_username: '', email: '', team_id: '', bio: '' })

  const load = () => {
    (players.listAll() as Promise<any>).then(r => setData(r.players || [])).catch(() => {})
    ;(teams.listAll() as Promise<any>).then(r => setTeamsList(r.teams || [])).catch(() => {})
  }

  useEffect(() => { load() }, [])

  const save = async () => {
    await players.create({ ...form, team_id: form.team_id ? Number(form.team_id) : null })
    setShowForm(false)
    setForm({ username: '', ingame_username: '', game: 'rocket_league', role: 'player', rank: '', discord_username: '', email: '', team_id: '', bio: '' })
    load()
  }

  const remove = async (id: number) => {
    if (!confirm('Remove this player?')) return
    await players.delete(id)
    load()
  }

  const toggleActive = async (id: number, is_active: boolean) => {
    await players.update(id, { is_active: !is_active })
    load()
  }

  const inputClass = 'bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500/60 w-full'

  return (
    <div>
      <SectionHeader
        title="Players"
        action={<ActionButton onClick={() => setShowForm(v => !v)}>+ Add Player</ActionButton>}
      />

      {showForm && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6 grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { key: 'username', ph: 'Username' },
            { key: 'ingame_username', ph: 'In-game name' },
            { key: 'rank', ph: 'Rank' },
            { key: 'discord_username', ph: 'Discord' },
            { key: 'email', ph: 'Email' },
          ].map(f => (
            <input key={f.key} placeholder={f.ph} value={(form as any)[f.key]}
              onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} className={inputClass} />
          ))}
          {[
            { key: 'game', opts: [['rocket_league','Rocket League'],['valorant','Valorant'],['fortnite','Fortnite']] },
            { key: 'role', opts: [['player','Player'],['captain','Captain'],['coach','Coach'],['substitute','Substitute'],['content_creator','Content Creator']] },
          ].map(s => (
            <select key={s.key} value={(form as any)[s.key]} onChange={e => setForm(p => ({ ...p, [s.key]: e.target.value }))}
              className={inputClass + ' cursor-pointer'}>
              {s.opts.map(([v, l]) => <option key={v} value={v} className="bg-[#1a0030]">{l}</option>)}
            </select>
          ))}
          <select value={form.team_id} onChange={e => setForm(p => ({ ...p, team_id: e.target.value }))}
            className={inputClass + ' cursor-pointer'}>
            <option value="" className="bg-[#1a0030]">No team</option>
            {teamsList.map((t: any) => <option key={t.id} value={t.id} className="bg-[#1a0030]">{t.name}</option>)}
          </select>
          <textarea placeholder="Bio (optional)" value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))}
            className={inputClass + ' col-span-full h-20 resize-none'} />
          <div className="col-span-full flex gap-3">
            <ActionButton onClick={save}>Save Player</ActionButton>
            <ActionButton variant="ghost" onClick={() => setShowForm(false)}>Cancel</ActionButton>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {data.length === 0 && <p className="text-white/30 text-sm">No players yet.</p>}
        {data.map((p: any) => (
          <div key={p.id} className={`bg-white/5 border border-white/8 rounded-2xl px-6 py-4 flex items-center gap-4 ${!p.is_active ? 'opacity-40' : ''}`}>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <span className="text-white font-bold">{p.username}</span>
                <Badge color="purple">{p.role}</Badge>
                <Badge color="gray">{p.game.replace('_', ' ')}</Badge>
                {p.team && <Badge color="yellow">{p.team}</Badge>}
              </div>
              <p className="text-white/40 text-xs">{p.ingame_username} · {p.rank} {p.discord_username && `· ${p.discord_username}`}</p>
            </div>
            <div className="flex gap-2">
              <ActionButton variant="ghost" onClick={() => toggleActive(p.id, p.is_active)}>
                {p.is_active ? 'Deactivate' : 'Activate'}
              </ActionButton>
              <ActionButton variant="danger" onClick={() => remove(p.id)}>Delete</ActionButton>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Teams section ─────────────────────────────────────────────────────────────
function TeamsSection() {
  const [data, setData] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', game: 'rocket_league', description: '' })

  const load = () => {
    (teams.listAll() as Promise<any>).then(r => setData(r.teams || [])).catch(() => {})
  }

  useEffect(() => { load() }, [])

  const save = async () => {
    await teams.create(form)
    setShowForm(false)
    setForm({ name: '', game: 'rocket_league', description: '' })
    load()
  }

  const remove = async (id: number) => {
    if (!confirm('Delete this team?')) return
    await teams.delete(id)
    load()
  }

  const inputClass = 'bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500/60 w-full'

  return (
    <div>
      <SectionHeader
        title="Teams"
        action={<ActionButton onClick={() => setShowForm(v => !v)}>+ New Team</ActionButton>}
      />

      {showForm && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <input placeholder="Team name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className={inputClass} />
          <select value={form.game} onChange={e => setForm(p => ({ ...p, game: e.target.value }))} className={inputClass + ' cursor-pointer'}>
            <option value="rocket_league" className="bg-[#1a0030]">Rocket League</option>
            <option value="valorant" className="bg-[#1a0030]">Valorant</option>
            <option value="fortnite" className="bg-[#1a0030]">Fortnite</option>
          </select>
          <textarea placeholder="Description (optional)" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            className={inputClass + ' md:col-span-2 h-20 resize-none'} />
          <div className="md:col-span-2 flex gap-3">
            <ActionButton onClick={save}>Save Team</ActionButton>
            <ActionButton variant="ghost" onClick={() => setShowForm(false)}>Cancel</ActionButton>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {data.length === 0 && <p className="text-white/30 text-sm">No teams yet.</p>}
        {data.map((t: any) => (
          <div key={t.id} className="bg-white/5 border border-white/8 rounded-2xl px-6 py-4">
            <div className="flex items-center gap-4 mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <span className="text-white font-bold text-lg">{t.name}</span>
                  <Badge color="purple">{t.game.replace('_', ' ')}</Badge>
                  {!t.is_active && <Badge color="gray">Inactive</Badge>}
                </div>
                {t.description && <p className="text-white/40 text-xs mt-1">{t.description}</p>}
              </div>
              <ActionButton variant="danger" onClick={() => remove(t.id)}>Delete</ActionButton>
            </div>
            {t.players?.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2 pt-3 border-t border-white/5">
                {t.players.map((p: any) => (
                  <span key={p.id} className="text-xs text-white/50 bg-white/5 px-2.5 py-1 rounded-full">
                    {p.username} · {p.role}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
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
    overview: <Overview />,
    joins:    <JoinsSection />,
    matches:  <MatchesSection />,
    news:     <NewsSection />,
    players:  <PlayersSection />,
    teams:    <TeamsSection />,
  }

  return (
    <div className="min-h-screen bg-[#0d0014] text-white flex" style={{ fontFamily: "'Barlow', sans-serif" }}>

      {/* ── Sidebar ── */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-60 bg-[#0a0010] border-r border-white/8 flex flex-col transition-transform duration-200
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>

        {/* Logo */}
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

        {/* Nav */}
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

        {/* User + logout */}
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
            className="w-full text-xs font-bold tracking-widest uppercase text-white/30 hover:text-red-400 transition-colors py-2"
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/60 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Main content ── */}
      <main className="flex-1 md:ml-60 min-h-screen">
        {/* Top bar */}
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
