import { useState, useEffect, useRef } from 'react'
import { matches } from '../../../../utils/api'
import { Badge, SectionHeader, ActionButton, getCsrfToken } from '../DashboardShared'

const EMPTY_FORM = {
  rival: '',
  rival_logo_url: '',
  match_type: 'tournament',
  game: 'rocket_league',
  date: '',
  time: '',
  status: 'upcoming',
  score: '',
  winner: '',
}

function MatchForm({
  initial,
  onSaved,
  onCancel,
}: {
  initial: typeof EMPTY_FORM & { id?: number }
  onSaved: () => void
  onCancel: () => void
}) {
  const isEdit = !!initial.id
  const [form, setForm] = useState(initial)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string>(
    (initial as any).rival_logo || initial.rival_logo_url || ''
  )
  const [saving, setSaving] = useState(false)
  const logoRef = useRef<HTMLInputElement>(null)

  const inputClass =
    'bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500/60 w-full'

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    setLogoFile(file)
    if (file) setLogoPreview(URL.createObjectURL(file))
    else setLogoPreview(form.rival_logo_url)
  }

  const handleSave = async () => {
    if (!form.rival || !form.date || !form.time) return
    setSaving(true)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => {
        if (k !== 'id') fd.append(k, String(v ?? ''))
      })
      if (logoFile) fd.append('rival_logo', logoFile)

      const url = isEdit ? `/api/matches/${initial.id}/` : '/api/matches/create/'
      const method = isEdit ? 'PATCH' : 'POST'

      await fetch(url, {
        method,
        credentials: 'include',
        headers: { 'X-CSRFToken': getCsrfToken() },
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
        {isEdit ? 'Edit Match' : 'New Match'}
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {/* Rival name */}
        <div>
          <label className="block text-white/40 text-[10px] font-bold tracking-widest uppercase mb-1">Rival *</label>
          <input
            placeholder="Team name"
            value={form.rival}
            onChange={e => setForm(p => ({ ...p, rival: e.target.value }))}
            className={inputClass}
          />
        </div>

        {/* Date */}
        <div>
          <label className="block text-white/40 text-[10px] font-bold tracking-widest uppercase mb-1">Date *</label>
          <input
            type="date"
            value={form.date}
            onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
            className={inputClass}
          />
        </div>

        {/* Time */}
        <div>
          <label className="block text-white/40 text-[10px] font-bold tracking-widest uppercase mb-1">Time *</label>
          <input
            type="time"
            value={form.time}
            onChange={e => setForm(p => ({ ...p, time: e.target.value }))}
            className={inputClass}
          />
        </div>

        {/* Game */}
        <div>
          <label className="block text-white/40 text-[10px] font-bold tracking-widest uppercase mb-1">Game</label>
          <select
            value={form.game}
            onChange={e => setForm(p => ({ ...p, game: e.target.value }))}
            className={inputClass + ' cursor-pointer'}
          >
            {[['rocket_league', 'Rocket League'], ['valorant', 'Valorant'], ['fortnite', 'Fortnite']].map(([v, l]) => (
              <option key={v} value={v} className="bg-[#1a0030]">{l}</option>
            ))}
          </select>
        </div>

        {/* Match type */}
        <div>
          <label className="block text-white/40 text-[10px] font-bold tracking-widest uppercase mb-1">Type</label>
          <select
            value={form.match_type}
            onChange={e => setForm(p => ({ ...p, match_type: e.target.value }))}
            className={inputClass + ' cursor-pointer'}
          >
            {[['tournament', 'Tournament'], ['practice', 'Practice'], ['scrim', 'Scrim'], ['friendly', 'Friendly']].map(([v, l]) => (
              <option key={v} value={v} className="bg-[#1a0030]">{l}</option>
            ))}
          </select>
        </div>

        {/* Status */}
        <div>
          <label className="block text-white/40 text-[10px] font-bold tracking-widest uppercase mb-1">Status</label>
          <select
            value={form.status}
            onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
            className={inputClass + ' cursor-pointer'}
          >
            {[['upcoming', 'Upcoming'], ['live', 'Live'], ['completed', 'Completed']].map(([v, l]) => (
              <option key={v} value={v} className="bg-[#1a0030]">{l}</option>
            ))}
          </select>
        </div>

        {/* Score */}
        <div>
          <label className="block text-white/40 text-[10px] font-bold tracking-widest uppercase mb-1">Score</label>
          <input
            placeholder="e.g. 3 — 1"
            value={form.score}
            onChange={e => setForm(p => ({ ...p, score: e.target.value }))}
            className={inputClass}
          />
        </div>

        {/* Winner */}
        <div>
          <label className="block text-white/40 text-[10px] font-bold tracking-widest uppercase mb-1">Winner</label>
          <select
            value={form.winner}
            onChange={e => setForm(p => ({ ...p, winner: e.target.value }))}
            className={inputClass + ' cursor-pointer'}
          >
            {[['', 'No winner yet'], ['nbl', 'NBL'], ['rival', 'Rival'], ['draw', 'Draw']].map(([v, l]) => (
              <option key={v} value={v} className="bg-[#1a0030]">{l}</option>
            ))}
          </select>
        </div>

        {/* Rival Logo */}
        <div className="col-span-full">
          <label className="block text-white/40 text-[10px] font-bold tracking-widest uppercase mb-1">
            Rival Logo
          </label>
          <div className="flex items-center gap-4">
            {/* Preview */}
            <div
              className="w-14 h-14 rounded-xl border-2 border-dashed border-white/10 flex items-center justify-center overflow-hidden shrink-0 cursor-pointer hover:border-purple-500/50 transition-colors bg-white/5"
              onClick={() => logoRef.current?.click()}
            >
              {logoPreview ? (
                <img src={logoPreview} alt="logo" className="w-full h-full object-contain p-1" />
              ) : (
                <span className="text-white/20 text-xs text-center leading-tight px-1">Logo</span>
              )}
            </div>

            <div className="flex flex-col gap-2 flex-1">
              {/* URL input */}
              <input
                placeholder="https://… (logo URL)"
                value={form.rival_logo_url}
                onChange={e => {
                  setForm(p => ({ ...p, rival_logo_url: e.target.value }))
                  if (!logoFile) setLogoPreview(e.target.value)
                }}
                className={inputClass + ' text-xs'}
              />
              {/* File upload */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => logoRef.current?.click()}
                  className="bg-white/5 border border-white/10 hover:border-purple-500/40 text-white/50 hover:text-white text-xs font-bold px-3 py-1.5 rounded-lg tracking-wider uppercase transition-all duration-200"
                >
                  {logoFile ? 'Change File' : 'Upload File'}
                </button>
                {logoFile && (
                  <>
                    <span className="text-white/30 text-xs truncate max-w-[160px]">{logoFile.name}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setLogoFile(null)
                        setLogoPreview(form.rival_logo_url)
                        if (logoRef.current) logoRef.current.value = ''
                      }}
                      className="text-red-400/60 hover:text-red-400 text-xs transition-colors"
                    >
                      Remove
                    </button>
                  </>
                )}
              </div>
            </div>

            <input
              ref={logoRef}
              type="file"
              accept="image/*"
              onChange={handleLogoChange}
              className="hidden"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-3 mt-5">
        <button
          onClick={handleSave}
          disabled={saving || !form.rival || !form.date || !form.time}
          className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black px-6 py-2.5 rounded-xl text-xs tracking-widest uppercase transition-all"
          style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
        >
          {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Match'}
        </button>
        <ActionButton variant="ghost" onClick={onCancel}>Cancel</ActionButton>
      </div>
    </div>
  )
}

const statusColor = (s: string): 'red' | 'green' | 'purple' =>
  s === 'live' ? 'red' : s === 'completed' ? 'green' : 'purple'

export default function MatchesSection() {
  const [data, setData] = useState<any[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)

  const load = () => {
    ;(matches.list() as Promise<any>).then(r => setData(r.matches || [])).catch(() => {})
  }

  useEffect(() => { load() }, [])

  const remove = async (id: number) => {
    if (!confirm('Delete this match?')) return
    await matches.delete(id)
    load()
  }

  return (
    <div>
      <SectionHeader
        title="Matches"
        action={
          <ActionButton onClick={() => { setEditing(null); setShowAdd(v => !v) }}>
            {showAdd ? 'Cancel' : '+ New Match'}
          </ActionButton>
        }
      />

      {showAdd && !editing && (
        <MatchForm
          initial={EMPTY_FORM as any}
          onSaved={() => { setShowAdd(false); load() }}
          onCancel={() => setShowAdd(false)}
        />
      )}

      {editing && (
        <MatchForm
          initial={editing}
          onSaved={() => { setEditing(null); load() }}
          onCancel={() => setEditing(null)}
        />
      )}

      <div className="space-y-3">
        {data.length === 0 && <p className="text-white/30 text-sm">No matches yet.</p>}
        {data.map((m: any) => (
          <div
            key={m.id}
            className="bg-white/5 border border-white/8 rounded-2xl px-5 py-4 flex items-center gap-4"
          >
            {/* Rival logo */}
            <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
              {m.rival_logo ? (
                <img src={m.rival_logo} alt={m.rival} className="w-full h-full object-contain p-0.5" />
              ) : (
                <span className="text-white/30 font-black text-sm" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                  {m.rival.charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1 flex-wrap">
                <span className="text-white font-bold">NBL vs {m.rival}</span>
                <Badge color={statusColor(m.status)}>{m.status}</Badge>
                <Badge color="purple">{m.game.replace('_', ' ')}</Badge>
                <Badge color="gray">{m.match_type}</Badge>
              </div>
              <p className="text-white/40 text-xs">
                {m.date} · {m.time}
                {m.score && ` · ${m.score}`}
                {m.winner && ` · Winner: ${m.winner}`}
              </p>
            </div>

            <div className="flex gap-2 shrink-0">
              <ActionButton onClick={() => { setShowAdd(false); setEditing({ ...EMPTY_FORM, ...m }) }}>
                Edit
              </ActionButton>
              <ActionButton variant="danger" onClick={() => remove(m.id)}>Delete</ActionButton>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
