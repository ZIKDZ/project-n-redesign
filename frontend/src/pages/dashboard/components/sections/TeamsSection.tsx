import { useState, useEffect, useRef } from 'react'
import { teams, players, games as gamesApi } from '../../../../utils/api'
import { SectionHeader, ActionButton, getCsrfToken } from '../DashboardShared'

// ── RosterCard ────────────────────────────────────────────────────────────────
function RosterCard({
  team,
  gamesList,
  onManage,
  onDelete,
}: {
  team: any
  gamesList: any[]
  onManage: () => void
  onDelete: () => void
}) {
  const game = gamesList.find(g => g.slug === team.game)
  const accentColor = (() => {
    const oc = game?.overlay_color || ''
    const m = oc.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
    if (m) return `rgb(${m[1]},${m[2]},${m[3]})`
    return '#a855f7'
  })()
  const bg = `${accentColor}1e`

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
            <span
              className="font-black text-5xl select-none"
              style={{ color: accentColor, opacity: 0.25, fontFamily: "'Barlow Condensed', sans-serif" }}
            >
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
            <span
              className="font-black text-xl select-none"
              style={{ color: accentColor, fontFamily: "'Barlow Condensed', sans-serif" }}
            >
              {initials}
            </span>
          )}
        </div>
      </div>

      <div className="pt-8 px-4 pb-4 flex flex-col flex-1 gap-3">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3
              className="text-white font-black text-base leading-tight uppercase"
              style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
            >
              {team.name}
            </h3>
            <span
              className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full shrink-0 mt-0.5"
              style={{ background: bg, color: accentColor, border: `1px solid ${accentColor}40` }}
            >
              {game?.title ?? team.game}
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
              <div
                key={i}
                className="h-1 flex-1 rounded-full"
                style={{ background: i < filled ? accentColor : 'rgba(255,255,255,0.08)' }}
              />
            ))}
          </div>
        </div>

        {team.igl && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold tracking-widest uppercase text-white/30">IGL</span>
            <div className="flex items-center gap-1.5">
              <div
                className="w-5 h-5 rounded-md overflow-hidden flex items-center justify-center text-[10px] font-black"
                style={{ background: bg, color: accentColor }}
              >
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
                style={{ background: bg, color: accentColor }}
                title={p.username}
              >
                {p.avatar
                  ? <img src={p.avatar} className="w-full h-full object-cover" alt={p.username} />
                  : p.username[0]?.toUpperCase()
                }
              </div>
            ))}
            {subs.length > 0 && (
              <span className="text-[10px] text-white/25 font-bold pl-1">
                +{subs.length} sub{subs.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
        ) : (
          <p className="text-white/20 text-[10px] tracking-wider">No players assigned yet</p>
        )}

        <div className="flex gap-2 mt-auto pt-2 border-t border-white/5">
          <button
            onClick={onManage}
            className="flex-1 bg-white/5 hover:bg-purple-500/15 border border-white/10 hover:border-purple-500/30 text-white/60 hover:text-white text-[10px] font-black py-2 rounded-lg tracking-widest uppercase transition-all duration-200"
          >
            Manage
          </button>
          <button
            onClick={onDelete}
            className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400/70 hover:text-red-400 text-[10px] font-black px-3 py-2 rounded-lg tracking-widest uppercase transition-all duration-200"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

// ── ImageUploadField ──────────────────────────────────────────────────────────
function ImageUploadField({
  label,
  preview,
  file,
  inputRef,
  accept,
  onChange,
  onRemove,
  shape = 'banner',
}: {
  label: string
  preview: string
  file: File | null
  inputRef: React.RefObject<HTMLInputElement | null>
  accept: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onRemove: () => void
  shape?: 'banner' | 'logo'
}) {
  const labelClass = 'block text-white/40 text-[10px] font-bold tracking-widest uppercase mb-1'
  return (
    <div className="col-span-2">
      <label className={labelClass}>{label}</label>
      <div className="flex items-start gap-4">
        <div
          className={`border-2 border-dashed border-white/10 flex items-center justify-center overflow-hidden shrink-0 cursor-pointer hover:border-purple-500/50 transition-colors ${
            shape === 'logo' ? 'w-14 h-14 rounded-xl' : 'w-36 h-20 rounded-xl'
          }`}
          onClick={() => inputRef.current?.click()}
          title="Click to upload"
        >
          {preview ? (
            <img src={preview} className="w-full h-full object-cover" alt={label} />
          ) : (
            <div className="flex flex-col items-center gap-1 text-white/20">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M13.5 12h.008v.008H13.5V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
              <span className="text-[9px]">Upload</span>
            </div>
          )}
        </div>
        <div className="flex-1 space-y-1.5">
          <input ref={inputRef} type="file" accept={accept} onChange={onChange} className="hidden" />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="bg-white/5 border border-white/10 hover:border-purple-500/40 text-white/60 hover:text-white text-[10px] font-bold px-3 py-1.5 rounded-lg tracking-wider uppercase transition-all duration-200"
            >
              {file ? 'Change' : 'Choose File'}
            </button>
            {file && (
              <button type="button" onClick={onRemove} className="text-red-400/60 hover:text-red-400 text-[10px] transition-colors">
                Remove
              </button>
            )}
          </div>
          {file && <p className="text-white/30 text-[10px] truncate max-w-[200px]">{file.name}</p>}
        </div>
      </div>
    </div>
  )
}

// ── RosterModal ───────────────────────────────────────────────────────────────
function RosterModal({
  initial,
  isEdit,
  playersList,
  gamesList,
  onSave,
  onClose,
}: {
  initial: any
  isEdit: boolean
  playersList: any[]
  gamesList: any[]
  onSave: (fd: FormData) => Promise<void>
  onClose: () => void
}) {
  const [form, setForm] = useState({
    name:        initial.name        || '',
    game:        initial.game        || (gamesList[0]?.slug ?? ''),
    description: initial.description || '',
    max_players: initial.max_players ?? 5,
    igl_id:      initial.igl_id      ?? '',
    visibility:  initial.visibility  || 'public',
    is_active:   initial.is_active   ?? true,
  })

  const [bannerFile,    setBannerFile]    = useState<File | null>(null)
  const [bannerPreview, setBannerPreview] = useState<string>(initial.banner_url || '')
  const bannerRef = useRef<HTMLInputElement>(null)

  const [logoFile,    setLogoFile]    = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string>(initial.logo_url || '')
  const logoRef = useRef<HTMLInputElement>(null)

  const [saving, setSaving] = useState(false)

  const gamePlayers = playersList.filter(p => p.game === form.game && p.status === 'active')
  const inputClass = 'bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-purple-500/60 w-full placeholder-white/20'
  const labelClass = 'block text-white/40 text-[10px] font-bold tracking-widest uppercase mb-1'

  const handleSubmit = async () => {
    if (!form.name || !form.game) return
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('name',        form.name)
      fd.append('game',        form.game)
      fd.append('description', form.description)
      fd.append('max_players', String(Number(form.max_players)))
      fd.append('igl_id',      form.igl_id ? String(form.igl_id) : '')
      fd.append('visibility',  form.visibility)
      fd.append('is_active',   form.is_active ? 'true' : 'false')
      if (bannerFile) fd.append('banner', bannerFile)
      if (logoFile)   fd.append('logo',   logoFile)
      await onSave(fd)
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
        style={{ maxHeight: 'min(88vh, 680px)' }}
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-white/8">
          <div>
            <h3
              className="text-white font-black text-base uppercase tracking-wide"
              style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
            >
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
              <input
                placeholder="e.g. NBL Valorant Main"
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Game *</label>
              {gamesList.length === 0 ? (
                <div className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white/30 text-xs">
                  Loading games…
                </div>
              ) : (
                <select
                  value={form.game}
                  onChange={e => setForm(p => ({ ...p, game: e.target.value, igl_id: '' }))}
                  className={inputClass + ' cursor-pointer'}
                >
                  {gamesList.map(g => (
                    <option key={g.slug} value={g.slug} className="bg-[#1a0030]">
                      {g.title}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label className={labelClass}>Max Players</label>
              <input
                type="number"
                min="1"
                max="20"
                value={form.max_players}
                onChange={e => setForm(p => ({ ...p, max_players: Number(e.target.value) }))}
                className={inputClass}
              />
            </div>
            <div className="col-span-2">
              <label className={labelClass}>In-Game Leader (IGL)</label>
              <select
                value={form.igl_id}
                onChange={e => setForm(p => ({ ...p, igl_id: e.target.value }))}
                className={inputClass + ' cursor-pointer'}
              >
                <option value="" className="bg-[#1a0030]">No IGL assigned</option>
                {gamePlayers.map(p => (
                  <option key={p.id} value={p.id} className="bg-[#1a0030]">
                    {p.username} ({p.role})
                  </option>
                ))}
              </select>
              {gamePlayers.length === 0 && form.game && (
                <p className="text-white/20 text-[10px] mt-1">
                  No active {gamesList.find(g => g.slug === form.game)?.title ?? form.game} players found.
                </p>
              )}
            </div>

            <ImageUploadField
              label="Banner Image"
              preview={bannerPreview}
              file={bannerFile}
              inputRef={bannerRef}
              accept="image/*"
              onChange={e => {
                const file = e.target.files?.[0] || null
                setBannerFile(file)
                setBannerPreview(file ? URL.createObjectURL(file) : (initial.banner_url || ''))
              }}
              onRemove={() => {
                setBannerFile(null)
                setBannerPreview(initial.banner_url || '')
                if (bannerRef.current) bannerRef.current.value = ''
              }}
              shape="banner"
            />

            <ImageUploadField
              label="Logo / Icon"
              preview={logoPreview}
              file={logoFile}
              inputRef={logoRef}
              accept="image/*"
              onChange={e => {
                const file = e.target.files?.[0] || null
                setLogoFile(file)
                setLogoPreview(file ? URL.createObjectURL(file) : (initial.logo_url || ''))
              }}
              onRemove={() => {
                setLogoFile(null)
                setLogoPreview(initial.logo_url || '')
                if (logoRef.current) logoRef.current.value = ''
              }}
              shape="logo"
            />

            <div className="col-span-2">
              <label className={labelClass}>Description</label>
              <textarea
                placeholder="Short description about this roster…"
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                className={inputClass + ' h-16 resize-none'}
              />
            </div>

            <div className="col-span-2 grid grid-cols-2 gap-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setForm(p => ({ ...p, visibility: p.visibility === 'public' ? 'hidden' : 'public' }))}
                  className={`w-9 h-5 rounded-full transition-colors duration-200 relative shrink-0 ${form.visibility === 'public' ? 'bg-green-600' : 'bg-white/10'}`}
                >
                  <span
                    className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200"
                    style={{ left: form.visibility === 'public' ? '16px' : '2px' }}
                  />
                </button>
                <div>
                  <p className="text-white/50 text-[10px] font-bold tracking-widest uppercase">
                    {form.visibility === 'public' ? 'Public' : 'Hidden'}
                  </p>
                  <p className="text-white/20 text-[10px]">Visible on public site</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
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
                <div>
                  <p className="text-white/50 text-[10px] font-bold tracking-widest uppercase">
                    {form.is_active ? 'Active' : 'Inactive'}
                  </p>
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
          <button
            onClick={handleSubmit}
            disabled={saving || !form.name || !form.game}
            className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black px-6 py-2.5 rounded-xl text-xs tracking-widest uppercase transition-all duration-200"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Roster'}
          </button>
          <ActionButton variant="ghost" onClick={onClose}>Cancel</ActionButton>
        </div>
      </div>
    </div>
  )
}

// ── TeamsSection ──────────────────────────────────────────────────────────────
export default function TeamsSection() {
  const [data,        setData]       = useState<any[]>([])
  const [playersList, setPlayersList] = useState<any[]>([])
  const [gamesList,   setGamesList]  = useState<any[]>([])
  const [showAdd,     setShowAdd]    = useState(false)
  const [editing,     setEditing]    = useState<any | null>(null)
  const [filterGame,  setFilterGame] = useState('')
  const [filterVis,   setFilterVis]  = useState('')

  const getCsrf = getCsrfToken

  const load = () => {
    ;(teams.listAll()    as Promise<any>).then(r => setData(r.teams      || [])).catch(() => {})
    ;(players.listAll()  as Promise<any>).then(r => setPlayersList(r.players || [])).catch(() => {})
    ;(gamesApi.listAll() as Promise<any>).then(r => setGamesList(r.games  || [])).catch(() => {})
  }

  useEffect(() => { load() }, [])

  const handleAdd = async (fd: FormData) => {
    await fetch('/api/teams/create/', {
      method: 'POST', credentials: 'include',
      headers: { 'X-CSRFToken': getCsrf() }, body: fd,
    })
    load()
  }

  const handleEdit = async (fd: FormData) => {
    if (!editing) return
    await fetch(`/api/teams/${editing.id}/`, {
      method: 'PATCH', credentials: 'include',
      headers: { 'X-CSRFToken': getCsrf() }, body: fd,
    })
    load()
  }

  const remove = async (id: number, name: string) => {
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
            <select
              value={filterGame}
              onChange={e => setFilterGame(e.target.value)}
              className="bg-white/5 border border-white/10 text-white text-xs px-3 py-2 rounded-lg cursor-pointer"
            >
              <option value="">All Games</option>
              {gamesList.map(g => (
                <option key={g.slug} value={g.slug} className="bg-[#1a0030]">{g.title}</option>
              ))}
            </select>
            <select
              value={filterVis}
              onChange={e => setFilterVis(e.target.value)}
              className="bg-white/5 border border-white/10 text-white text-xs px-3 py-2 rounded-lg cursor-pointer"
            >
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
          <button
            onClick={() => setShowAdd(true)}
            className="mt-4 text-purple-400 text-xs font-bold tracking-widest uppercase hover:text-purple-300 transition-colors"
          >
            Create your first roster →
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {displayed.map(t => (
            <RosterCard
              key={t.id}
              team={t}
              gamesList={gamesList}
              onManage={() => setEditing(t)}
              onDelete={() => remove(t.id, t.name)}
            />
          ))}
        </div>
      )}

      {showAdd && (
        <RosterModal initial={{}} isEdit={false} playersList={playersList} gamesList={gamesList}
          onSave={handleAdd} onClose={() => setShowAdd(false)} />
      )}
      {editing && (
        <RosterModal initial={editing} isEdit={true} playersList={playersList} gamesList={gamesList}
          onSave={handleEdit} onClose={() => setEditing(null)} />
      )}
    </div>
  )
}