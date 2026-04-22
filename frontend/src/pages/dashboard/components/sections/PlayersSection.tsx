import { useState, useEffect, useRef } from 'react'
import { players, games, teams } from '../../../../utils/api'
import { Badge, SectionHeader, ActionButton, FilterSelect, FilterOption, getCsrfToken } from '../DashboardShared'

// ── Constants ─────────────────────────────────────────────────────────────────
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

// ── StatusDropdown ────────────────────────────────────────────────────────────
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
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
            currentStatus === 'active'
              ? 'bg-green-400'
              : currentStatus === 'suspended'
              ? 'bg-yellow-400'
              : 'bg-gray-500'
          }`}
        />
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

// ── PlayerModal ───────────────────────────────────────────────────────────────
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

  const inputClass =
    'bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-purple-500/60 w-full placeholder-white/20'
  const selectClass =
    'bg-[#1a0030] border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-purple-500/60 w-full cursor-pointer'
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
              <h3
                className="text-white font-black text-base uppercase tracking-wide"
                style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
              >
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
                <input
                  placeholder="e.g. NebX"
                  value={form.username}
                  onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>In-Game Username *</label>
                <input
                  placeholder="e.g. Neb#1234"
                  value={form.ingame_username}
                  onChange={e => setForm(p => ({ ...p, ingame_username: e.target.value }))}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Game</label>
                <select
                  value={form.game}
                  onChange={e => handleGameChange(e.target.value)}
                  className={selectClass}
                >
                  <option value="" className="bg-[#1a0030] text-white">Select game</option>
                  {gamesList.map(g => (
                    <option key={g.slug} value={g.slug} className="bg-[#1a0030] text-white">{g.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Rank</label>
                {ranks.length > 0 ? (
                  <select
                    value={form.rank}
                    onChange={e => setForm(p => ({ ...p, rank: e.target.value }))}
                    disabled={!form.game}
                    className={selectClass + ' disabled:opacity-40'}
                  >
                    <option value="" className="bg-[#1a0030] text-white">Select rank</option>
                    {ranks.map(r => (
                      <option key={r} value={r} className="bg-[#1a0030] text-white">{r}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    placeholder="e.g. Diamond"
                    value={form.rank}
                    onChange={e => setForm(p => ({ ...p, rank: e.target.value }))}
                    className={inputClass}
                  />
                )}
              </div>
              <div>
                <label className={labelClass}>Role</label>
                <select
                  value={form.role}
                  onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                  className={selectClass}
                >
                  {[
                    ['player', 'Player'],
                    ['captain', 'Captain'],
                    ['coach', 'Coach'],
                    ['substitute', 'Substitute'],
                    ['content_creator', 'Content Creator'],
                  ].map(([v, l]) => (
                    <option key={v} value={v} className="bg-[#1a0030] text-white">{l}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Status</label>
                <select
                  value={form.status}
                  onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                  className={selectClass}
                >
                  <option value="active" className="bg-[#1a0030] text-white">Active</option>
                  <option value="suspended" className="bg-[#1a0030] text-white">Suspended</option>
                  <option value="inactive" className="bg-[#1a0030] text-white">Inactive</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className={labelClass}>Team</label>
                <select
                  value={form.team_id ?? ''}
                  onChange={e => setForm(p => ({ ...p, team_id: e.target.value ? Number(e.target.value) : null }))}
                  className={selectClass}
                >
                  <option value="" className="bg-[#1a0030] text-white">No team</option>
                  {teamsList.map((t: any) => (
                    <option key={t.id} value={t.id} className="bg-[#1a0030] text-white">{t.name}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className={labelClass}>Discord Username</label>
                <input
                  placeholder="e.g. nebx#0000"
                  value={form.discord_username}
                  onChange={e => setForm(p => ({ ...p, discord_username: e.target.value }))}
                  className={inputClass}
                />
              </div>
              <div className="col-span-2">
                <label className={labelClass}>Bio</label>
                <textarea
                  placeholder="Short player bio…"
                  value={form.bio}
                  onChange={e => setForm(p => ({ ...p, bio: e.target.value }))}
                  className={inputClass + ' h-16 resize-none'}
                />
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
                  onChange={e => setForm(p => ({ ...p, first_name: e.target.value }))} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Last Name</label>
                <input placeholder="e.g. Benzema" value={form.last_name}
                  onChange={e => setForm(p => ({ ...p, last_name: e.target.value }))} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Age</label>
                <input type="number" min="10" max="99" placeholder="e.g. 21"
                  value={form.age ?? ''}
                  onChange={e => setForm(p => ({ ...p, age: e.target.value ? Number(e.target.value) : null }))}
                  className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Email</label>
                <input type="email" placeholder="e.g. player@email.com" value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Phone</label>
                <input placeholder="e.g. +213 555 123456" value={form.phone}
                  onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Address</label>
                <input placeholder="e.g. Algiers, Algeria" value={form.address}
                  onChange={e => setForm(p => ({ ...p, address: e.target.value }))} className={inputClass} />
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

// ── PlayersSection ────────────────────────────────────────────────────────────
export default function PlayersSection() {
  const [data, setData] = useState<PlayerData[]>([])
  const [gamesList, setGamesList] = useState<any[]>([])
  const [teamsList, setTeamsList] = useState<any[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<PlayerData | null>(null)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterGame, setFilterGame] = useState('')

  const getCsrf = getCsrfToken

  const load = () => {
    ;(players.listAll() as Promise<any>).then(r => setData(r.players || [])).catch(() => {})
    ;(games.listAll() as Promise<any>).then(r => setGamesList(r.games || [])).catch(() => {})
    ;(teams.listAll() as Promise<any>).then(r => setTeamsList(r.teams || [])).catch(() => {})
  }

  useEffect(() => { load() }, [])

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
      method: 'POST', credentials: 'include',
      headers: { 'X-CSRFToken': getCsrf() }, body: fd,
    })
    load()
  }

  const handleEdit = async (form: any, avatarFile: File | null) => {
    if (!editing) return
    const fd = buildFormData(form, avatarFile)
    await fetch(`/api/players/${editing.id}/`, {
      method: 'PATCH', credentials: 'include',
      headers: { 'X-CSRFToken': getCsrf() }, body: fd,
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
            <FilterSelect value={filterGame} onChange={setFilterGame}>
              <FilterOption value="">All Games</FilterOption>
              {gamesList.map(g => (
                <FilterOption key={g.slug} value={g.slug}>{g.title}</FilterOption>
              ))}
            </FilterSelect>
            <FilterSelect value={filterStatus} onChange={setFilterStatus}>
              <FilterOption value="">All Statuses</FilterOption>
              <FilterOption value="active">Active</FilterOption>
              <FilterOption value="suspended">Suspended</FilterOption>
              <FilterOption value="inactive">Inactive</FilterOption>
            </FilterSelect>
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
                    src={p.avatar}
                    className="w-full h-full object-cover"
                    alt={p.username}
                    onError={e => {
                      ;(e.currentTarget as HTMLImageElement).style.display = 'none'
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
              <StatusDropdown currentStatus={p.status} onSelect={status => quickStatus(p.id, status)} />
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