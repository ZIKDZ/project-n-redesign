import { useState, useEffect } from 'react'
import { teams, players, games as gamesApi } from '../../../../utils/api'
import { SectionHeader, ActionButton } from '../DashboardShared'

// ── helpers ───────────────────────────────────────────────────────────────────

/** Parse an overlay_color like "rgba(96,184,255,0.4)" → usable bg + accent */
function colorsFromGame(game: any): { bg: string; accent: string } {
  if (!game) return { bg: 'rgba(168,85,247,0.12)', accent: '#a855f7' }
  const oc: string = game.overlay_color || ''
  const m = oc.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  if (m) {
    const [, r, g, b] = m
    return {
      bg: `rgba(${r},${g},${b},0.12)`,
      accent: `rgb(${r},${g},${b})`,
    }
  }
  return { bg: 'rgba(168,85,247,0.12)', accent: '#a855f7' }
}

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
  const gameObj = gamesList.find(g => g.slug === team.game)
  const { bg, accent } = colorsFromGame(gameObj)

  const initials = team.name
    .split(' ')
    .slice(0, 2)
    .map((w: string) => w[0]?.toUpperCase() ?? '')
    .join('')

  const totalSlots = team.max_players || 5
  const mainPlayers = team.players || []
  const subs = team.substitutes || []
  const filled = mainPlayers.length
  const gameLabel = gameObj?.title ?? team.game

  return (
    <div
      className="relative border border-white/10 rounded-2xl overflow-hidden flex flex-col transition-all duration-200 hover:border-purple-500/30"
      style={{ background: '#0f0020' }}
    >
      {/* Banner */}
      <div className="h-28 relative shrink-0" style={{ background: bg }}>
        {team.banner_url ? (
          <img src={team.banner_url} alt={team.name} className="w-full h-full object-cover opacity-60" />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: bg }}>
            <span
              className="font-black text-5xl select-none"
              style={{ color: accent, opacity: 0.25, fontFamily: "'Barlow Condensed', sans-serif" }}
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

        {/* Logo / letter avatar */}
        <div
          className="absolute bottom-0 left-4 translate-y-1/2 w-12 h-12 rounded-xl border-2 border-[#0f0020] flex items-center justify-center overflow-hidden shrink-0"
          style={{ background: bg }}
        >
          {team.logo_url ? (
            <img src={team.logo_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <span
              className="font-black text-xl select-none"
              style={{ color: accent, fontFamily: "'Barlow Condensed', sans-serif" }}
            >
              {initials}
            </span>
          )}
        </div>
      </div>

      {/* Body */}
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
              style={{ background: bg, color: accent, border: `1px solid ${accent}40` }}
            >
              {gameLabel}
            </span>
          </div>
          {team.description && (
            <p className="text-white/35 text-xs mt-1 line-clamp-2">{team.description}</p>
          )}
        </div>

        {/* Capacity bar */}
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
                style={{ background: i < filled ? accent : 'rgba(255,255,255,0.08)' }}
              />
            ))}
          </div>
        </div>

        {/* IGL */}
        {team.igl && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold tracking-widest uppercase text-white/30">IGL</span>
            <div className="flex items-center gap-1.5">
              <div
                className="w-5 h-5 rounded-md overflow-hidden flex items-center justify-center text-[10px] font-black"
                style={{ background: bg, color: accent }}
              >
                {team.igl.avatar
                  ? <img src={team.igl.avatar} className="w-full h-full object-cover" alt="" />
                  : team.igl.username[0]?.toUpperCase()}
              </div>
              <span className="text-white/60 text-xs font-semibold">{team.igl.username}</span>
            </div>
          </div>
        )}

        {/* Players row */}
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
                  : p.username[0]?.toUpperCase()}
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

        {/* Actions */}
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

// ── RosterModal ───────────────────────────────────────────────────────────────
function RosterModal({
  initial,
  isEdit,
  gamesList,
  playersList,
  onSave,
  onClose,
}: {
  initial: any
  isEdit: boolean
  gamesList: any[]
  playersList: any[]
  onSave: (data: any) => Promise<void>
  onClose: () => void
}) {
  const [form, setForm] = useState({
    name:        initial.name        || '',
    game:        initial.game        || (gamesList[0]?.slug ?? ''),
    description: initial.description || '',
    banner_url:  initial.banner_url  || '',
    logo_url:    initial.logo_url    || '',
    max_players: initial.max_players ?? 5,
    igl_id:      initial.igl_id      ?? '',
    visibility:  initial.visibility  || 'public',
    is_active:   initial.is_active   ?? true,
  })
  const [saving, setSaving] = useState(false)

  // Players for this game only
  const gamePlayers = playersList.filter(p => p.game === form.game && p.status === 'active')
  const selectedGame = gamesList.find(g => g.slug === form.game)
  const gameLabel = selectedGame?.title ?? form.game

  const inputClass = 'bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-purple-500/60 w-full placeholder-white/20'
  const labelClass = 'block text-white/40 text-[10px] font-bold tracking-widest uppercase mb-1'

  const handleSubmit = async () => {
    if (!form.name || !form.game) return
    setSaving(true)
    try {
      await onSave({
        ...form,
        igl_id: form.igl_id || null,
        max_players: Number(form.max_players),
      })
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
        {/* Header */}
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

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-6 py-4" style={{ scrollbarWidth: 'none' }}>
          <div className="grid grid-cols-2 gap-3">

            {/* Name */}
            <div className="col-span-2">
              <label className={labelClass}>Roster Name *</label>
              <input
                placeholder="e.g. NBL Valorant Main"
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                className={inputClass}
              />
            </div>

            {/* Game — loaded from API */}
            <div>
              <label className={labelClass}>Game *</label>
              {gamesList.length === 0 ? (
                <div className={inputClass + ' text-white/30 cursor-not-allowed'}>Loading games…</div>
              ) : (
                <select
                  value={form.game}
                  onChange={e => setForm(p => ({ ...p, game: e.target.value, igl_id: '' }))}
                  className={inputClass + ' cursor-pointer'}
                >
                  <option value="" disabled className="bg-[#1a0030]">Select a game</option>
                  {gamesList.map(g => (
                    <option key={g.slug} value={g.slug} className="bg-[#1a0030]">
                      {g.title}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Max Players */}
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

            {/* IGL */}
            <div className="col-span-2">
              <label className={labelClass}>In-Game Leader (IGL)</label>
              <select
                value={form.igl_id}
                onChange={e => setForm(p => ({ ...p, igl_id: e.target.value }))}
                disabled={!form.game}
                className={inputClass + ' cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed'}
              >
                <option value="" className="bg-[#1a0030]">No IGL assigned</option>
                {gamePlayers.map(p => (
                  <option key={p.id} value={p.id} className="bg-[#1a0030]">
                    {p.username} ({p.role})
                  </option>
                ))}
              </select>
              {form.game && gamePlayers.length === 0 && (
                <p className="text-white/20 text-[10px] mt-1">
                  No active {gameLabel} players found. Add players first.
                </p>
              )}
            </div>

            {/* Banner URL */}
            <div className="col-span-2">
              <label className={labelClass}>Banner Image URL</label>
              <input
                placeholder="https://…"
                value={form.banner_url}
                onChange={e => setForm(p => ({ ...p, banner_url: e.target.value }))}
                className={inputClass}
              />
              {form.banner_url && (
                <img
                  src={form.banner_url}
                  alt="preview"
                  className="mt-2 w-full h-16 object-cover rounded-xl border border-white/10 opacity-70"
                />
              )}
            </div>

            {/* Logo URL */}
            <div className="col-span-2">
              <label className={labelClass}>Logo / Icon URL</label>
              <input
                placeholder="https://…"
                value={form.logo_url}
                onChange={e => setForm(p => ({ ...p, logo_url: e.target.value }))}
                className={inputClass}
              />
            </div>

            {/* Description */}
            <div className="col-span-2">
              <label className={labelClass}>Description</label>
              <textarea
                placeholder="Short description about this roster…"
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                className={inputClass + ' h-16 resize-none'}
              />
            </div>

            {/* Toggles */}
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
                💡 Players are assigned to rosters via the Players section. The IGL must be an active player for this game.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
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
  const [gamesList,   setGamesList]  = useState<any[]>([])
  const [playersList, setPlayersList] = useState<any[]>([])
  const [showAdd,     setShowAdd]    = useState(false)
  const [editing,     setEditing]    = useState<any | null>(null)
  const [filterGame,  setFilterGame] = useState('')
  const [filterVis,   setFilterVis]  = useState('')

  const load = () => {
    ;(teams.listAll()       as Promise<any>).then(r => setData(r.teams     || [])).catch(() => {})
    ;(players.listAll()     as Promise<any>).then(r => setPlayersList(r.players || [])).catch(() => {})
    ;(gamesApi.listAll()    as Promise<any>).then(r => setGamesList(r.games   || [])).catch(() => {})
  }

  useEffect(() => { load() }, [])

  const handleAdd = async (payload: any) => {
    await teams.create(payload)
    load()
  }

  const handleEdit = async (payload: any) => {
    if (!editing) return
    await teams.update(editing.id, payload)
    load()
  }

  const remove = async (id: number, name: string) => {
    if (!confirm(`Delete roster "${name}"? Players will not be removed.`)) return
    await teams.delete(id)
    load()
  }

  const displayed = data.filter(t => {
    if (filterGame && t.game !== filterGame) return false
    if (filterVis  && t.visibility !== filterVis)  return false
    return true
  })

  return (
    <div>
      <SectionHeader
        title="Rosters"
        action={
          <div className="flex items-center gap-2">
            {/* Game filter — dynamic from API */}
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
        <RosterModal
          initial={{}}
          isEdit={false}
          gamesList={gamesList}
          playersList={playersList}
          onSave={handleAdd}
          onClose={() => setShowAdd(false)}
        />
      )}

      {editing && (
        <RosterModal
          initial={editing}
          isEdit={true}
          gamesList={gamesList}
          playersList={playersList}
          onSave={handleEdit}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}