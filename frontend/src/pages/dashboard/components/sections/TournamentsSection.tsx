import { useState, useEffect, useRef, useCallback } from 'react'
import { tournaments as tournamentsApi, games as gamesApi } from '../../../../utils/api'
import {
  Badge,
  SectionHeader,
  ActionButton,
  FilterSelect,
  FilterOption,
  getCsrfToken,
  Modal,
  ModalHeader,
  ModalTabs,
  ModalBody,
  ModalFooter,
} from '../DashboardShared'

const getCsrf = getCsrfToken

// ── Types ─────────────────────────────────────────────────────────────────────
type Placement = { id?: number; placement: string; reward_text: string; display_order: number }

type TournamentForm = {
  name: string
  game_id: number | ''
  format: 'solo' | 'team'
  team_size: number | ''
  bracket_type: string
  status: 'draft' | 'open' | 'closed' | 'in_progress' | 'completed'
  description: string
  rules: string
  requirements: string
  banner_url: string
  registration_open_at: string
  registration_deadline: string
  start_date: string
  max_participants: number | ''
}

const EMPTY_FORM: TournamentForm = {
  name: '',
  game_id: '',
  format: 'solo',
  team_size: '',
  bracket_type: 'single_elim',
  status: 'draft',
  description: '',
  rules: '',
  requirements: '',
  banner_url: '',
  registration_open_at: '',
  registration_deadline: '',
  start_date: '',
  max_participants: '',
}

const STATUS_CONFIG: Record<string, { label: string; color: 'gray' | 'green' | 'yellow' | 'red' | 'purple' }> = {
  draft:       { label: 'Draft',    color: 'gray' },
  open:        { label: 'Open',     color: 'green' },
  closed:      { label: 'Closed',   color: 'yellow' },
  in_progress: { label: 'Live',     color: 'red' },
  completed:   { label: 'Completed', color: 'purple' },
}

// datetime-local <-> ISO helpers ------------------------------------------------
function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
function fromLocalInput(local: string): string {
  if (!local) return ''
  return new Date(local).toISOString()
}

// ── PlacementsEditor ──────────────────────────────────────────────────────────
function PlacementsEditor({ placements, onChange }: { placements: Placement[]; onChange: (p: Placement[]) => void }) {
  const inputClass = 'bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-purple-500/60 w-full placeholder-white/20'
  const labelClass = 'block text-white/40 text-[10px] font-bold tracking-widest uppercase mb-1'

  const add = () => onChange([...placements, { placement: '', reward_text: '', display_order: placements.length }])
  const remove = (i: number) => onChange(placements.filter((_, idx) => idx !== i).map((p, idx) => ({ ...p, display_order: idx })))
  const update = <K extends keyof Placement>(i: number, key: K, val: Placement[K]) =>
    onChange(placements.map((p, idx) => idx === i ? { ...p, [key]: val } : p))

  return (
    <div className="space-y-3">
      <p className="text-white/25 text-[10px] tracking-widest">
        Define prize placements shown publicly on the tournament page (e.g. 1st, 2nd, 3rd-4th).
      </p>
      {placements.length === 0 && (
        <div className="border border-dashed border-white/10 rounded-xl p-5 text-center">
          <p className="text-white/20 text-[10px] tracking-widest uppercase mb-2">No placements yet</p>
        </div>
      )}
      {placements.map((p, i) => (
        <div key={i} className="bg-white/3 border border-white/8 rounded-xl p-3">
          <div className="grid grid-cols-[1fr_1fr_28px] gap-2 items-start">
            <div>
              <label className={labelClass}>Placement</label>
              <input placeholder="e.g. 1st" value={p.placement} onChange={e => update(i, 'placement', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Reward</label>
              <input placeholder="e.g. 15,000 DZD" value={p.reward_text} onChange={e => update(i, 'reward_text', e.target.value)} className={inputClass} />
            </div>
            <div className="pt-5">
              <button type="button" onClick={() => remove(i)}
                className="w-7 h-7 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400/70 hover:text-red-400 flex items-center justify-center transition-all cursor-pointer">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      ))}
      <button type="button" onClick={add}
        className="flex items-center gap-1.5 text-purple-400/60 hover:text-purple-400 text-[10px] font-bold tracking-widest uppercase transition-colors cursor-pointer">
        <span className="text-base leading-none">+</span> Add Placement
      </button>
    </div>
  )
}

// ── TournamentModal ───────────────────────────────────────────────────────────
type TTab = 'general' | 'prizes' | 'timing'

function TournamentModal({
  initial,
  isEdit,
  gamesList,
  onSave,
  onClose,
}: {
  initial: Partial<TournamentForm> & { id?: number; placements?: Placement[]; banner?: string }
  isEdit: boolean
  gamesList: any[]
  onSave: (form: TournamentForm, placements: Placement[], bannerFile: File | null) => Promise<void>
  onClose: () => void
}) {
  const [tab, setTab] = useState<TTab>('general')

  const [form, setForm] = useState<TournamentForm>({
    name: initial.name || '',
    game_id: initial.game_id ?? '',
    format: (initial.format as any) || 'solo',
    team_size: initial.team_size ?? '',
    bracket_type: initial.bracket_type || 'single_elim',
    status: (initial.status as any) || 'draft',
    description: initial.description || '',
    rules: initial.rules || '',
    requirements: initial.requirements || '',
    banner_url: initial.banner_url || '',
    registration_open_at: toLocalInput(initial.registration_open_at as any),
    registration_deadline: toLocalInput(initial.registration_deadline as any),
    start_date: toLocalInput(initial.start_date as any),
    max_participants: initial.max_participants ?? '',
  })

  const [placements, setPlacements] = useState<Placement[]>(initial.placements || [])
  const [bannerFile, setBannerFile] = useState<File | null>(null)
  const [bannerPreview, setBannerPreview] = useState(initial.banner || '')
  const bannerRef = useRef<HTMLInputElement>(null)
  const [saving, setSaving] = useState(false)

  const inputClass = 'bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-purple-500/60 w-full placeholder-white/20'
  const selectClass = 'bg-[#1a0030] border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-purple-500/60 w-full cursor-pointer'
  const labelClass = 'block text-white/40 text-[10px] font-bold tracking-widest uppercase mb-1'

  const handleBannerFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null
    setBannerFile(f)
    setBannerPreview(f ? URL.createObjectURL(f) : (initial.banner || ''))
  }

  const handleSubmit = async () => {
    if (!form.name) return
    setSaving(true)
    try {
      await onSave(form, placements, bannerFile)
      onClose()
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }

  const TABS = [
    { id: 'general' as const, label: '🏆 General' },
    { id: 'prizes'  as const, label: `🎁 Prizes${placements.length ? ` (${placements.length})` : ''}` },
    { id: 'timing'  as const, label: '⏱ Timing' },
  ]

  return (
    <Modal size="md" onClose={onClose}>
      <ModalHeader
        title={isEdit ? `Edit — ${initial.name}` : 'Create Tournament'}
        subtitle={isEdit ? 'Update tournament details' : 'Set up a new custom tournament'}
        onClose={onClose}
      />

      <ModalTabs tabs={TABS} active={tab} onChange={setTab} />

      <ModalBody>
        {/* ── GENERAL ── */}
        {tab === 'general' && (
          <div className="space-y-4">
            {/* Banner */}
            <div>
              <label className={labelClass}>Banner Image</label>
              <div className="flex items-start gap-4">
                <div
                  className="w-40 h-24 rounded-xl border-2 border-dashed border-white/10 flex items-center justify-center overflow-hidden shrink-0 cursor-pointer hover:border-purple-500/40 transition-colors bg-white/3"
                  onClick={() => bannerRef.current?.click()}
                >
                  {bannerPreview ? (
                    <img src={bannerPreview} className="w-full h-full object-cover" alt="preview" />
                  ) : (
                    <span className="text-white/20 text-[10px] text-center px-2">Click to upload</span>
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <input ref={bannerRef} type="file" accept="image/*" onChange={handleBannerFile} className="hidden" />
                  <button type="button" onClick={() => bannerRef.current?.click()}
                    className="bg-white/5 border border-white/10 hover:border-purple-500/40 text-white/60 hover:text-white text-[10px] font-bold px-3 py-2 rounded-lg tracking-wider uppercase transition-all cursor-pointer">
                    {bannerFile ? 'Change Image' : 'Choose Image'}
                  </button>
                  <input
                    placeholder="…or paste an image URL"
                    value={form.banner_url}
                    onChange={e => { setForm(p => ({ ...p, banner_url: e.target.value })); if (!bannerFile) setBannerPreview(e.target.value) }}
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            <div>
              <label className={labelClass}>Tournament Name *</label>
              <input placeholder="e.g. NBL Winter Cup" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className={inputClass} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Game</label>
                <select value={form.game_id} onChange={e => setForm(p => ({ ...p, game_id: e.target.value ? Number(e.target.value) : '' }))} className={selectClass}>
                  <option value="" className="bg-[#1a0030]">Multi-game / unassigned</option>
                  {gamesList.map(g => (
                    <option key={g.id} value={g.id} className="bg-[#1a0030]">{g.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Status</label>
                <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as any }))} className={selectClass}>
                  {Object.entries(STATUS_CONFIG).map(([v, c]) => (
                    <option key={v} value={v} className="bg-[#1a0030]">{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Format</label>
                <select value={form.format} onChange={e => setForm(p => ({ ...p, format: e.target.value as any }))} className={selectClass}>
                  <option value="solo" className="bg-[#1a0030]">Solo</option>
                  <option value="team" className="bg-[#1a0030]">Team</option>
                </select>
              </div>
              {form.format === 'team' && (
                <div>
                  <label className={labelClass}>Team Size</label>
                  <input type="number" min="1" max="20" placeholder="e.g. 5" value={form.team_size}
                    onChange={e => setForm(p => ({ ...p, team_size: e.target.value ? Number(e.target.value) : '' }))} className={inputClass} />
                </div>
              )}
              <div>
                <label className={labelClass}>Max Participants</label>
                <input type="number" min="2" placeholder="Leave blank for unlimited" value={form.max_participants}
                  onChange={e => setForm(p => ({ ...p, max_participants: e.target.value ? Number(e.target.value) : '' }))} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Bracket Type</label>
                <select value={form.bracket_type} onChange={e => setForm(p => ({ ...p, bracket_type: e.target.value }))} className={selectClass}>
                  <option value="single_elim" className="bg-[#1a0030]">Single Elimination</option>
                </select>
              </div>
            </div>

            <div>
              <label className={labelClass}>Description</label>
              <textarea placeholder="Short public summary shown on cards and the hero section…" value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className={inputClass + ' h-20 resize-none'} />
            </div>
            <div>
              <label className={labelClass}>Rules</label>
              <textarea placeholder="Full ruleset players should read before registering…" value={form.rules}
                onChange={e => setForm(p => ({ ...p, rules: e.target.value }))} className={inputClass + ' h-24 resize-none'} />
            </div>
            <div>
              <label className={labelClass}>Entry Requirements</label>
              <textarea placeholder="e.g. Minimum rank Platinum, must be 16+…" value={form.requirements}
                onChange={e => setForm(p => ({ ...p, requirements: e.target.value }))} className={inputClass + ' h-16 resize-none'} />
            </div>
          </div>
        )}

        {/* ── PRIZES ── */}
        {tab === 'prizes' && (
          <PlacementsEditor placements={placements} onChange={setPlacements} />
        )}

        {/* ── TIMING ── */}
        {tab === 'timing' && (
          <div className="space-y-4">
            <p className="text-white/25 text-[10px] tracking-widest">
              All times are saved in your browser's local timezone and converted automatically.
            </p>
            <div>
              <label className={labelClass}>Registration Opens</label>
              <input type="datetime-local" value={form.registration_open_at}
                onChange={e => setForm(p => ({ ...p, registration_open_at: e.target.value }))}
                className={inputClass} style={{ colorScheme: 'dark' }} />
              <p className="text-white/15 text-[10px] mt-1">Leave blank to open immediately once status is set to "Open".</p>
            </div>
            <div>
              <label className={labelClass}>Registration Deadline</label>
              <input type="datetime-local" value={form.registration_deadline}
                onChange={e => setForm(p => ({ ...p, registration_deadline: e.target.value }))}
                className={inputClass} style={{ colorScheme: 'dark' }} />
            </div>
            <div>
              <label className={labelClass}>Tournament Start</label>
              <input type="datetime-local" value={form.start_date}
                onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))}
                className={inputClass} style={{ colorScheme: 'dark' }} />
            </div>
          </div>
        )}
      </ModalBody>

      <ModalFooter
        onSave={handleSubmit}
        onClose={onClose}
        saving={saving}
        disabled={!form.name}
        saveLabel={isEdit ? 'Save Changes' : 'Create Tournament'}
      />
    </Modal>
  )
}

// ── TournamentRow ─────────────────────────────────────────────────────────────
function TournamentRow({
  t, gamesList, onManage, onDelete,
}: {
  t: any; gamesList: any[]; onManage: () => void; onDelete: () => void
}) {
  const game = gamesList.find(g => g.id === t.game_id || g.slug === t.game)
  const sc = STATUS_CONFIG[t.status] || STATUS_CONFIG.draft

  return (
    <div className="bg-white/5 border border-white/8 rounded-2xl px-5 py-4 flex items-center gap-4">
      <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-white/10 bg-purple-900/20 flex items-center justify-center">
        {t.banner ? (
          <img src={t.banner} className="w-full h-full object-cover" alt="" />
        ) : (
          <span className="text-white/20 font-black text-lg" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
            {t.name.charAt(0)}
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-1 flex-wrap">
          <span className="text-white font-bold">{t.name}</span>
          <Badge color={sc.color}>{sc.label}</Badge>
          <Badge color="purple">{game?.title || t.game_title || 'Multi-game'}</Badge>
          <Badge color="gray">{t.format === 'team' ? 'Team' : 'Solo'}</Badge>
        </div>
        <p className="text-white/40 text-xs">
          {t.participant_count ?? 0}{t.max_participants ? `/${t.max_participants}` : ''} registered
          {t.registration_deadline && ` · Closes ${new Date(t.registration_deadline).toLocaleDateString()}`}
          {t.placements?.length > 0 && ` · ${t.placements.length} prize${t.placements.length > 1 ? 's' : ''}`}
        </p>
      </div>

      <div className="flex gap-2 shrink-0">
        <ActionButton onClick={onManage}>Manage</ActionButton>
        <ActionButton variant="danger" onClick={onDelete}>Delete</ActionButton>
      </div>
    </div>
  )
}

// ── TournamentsSection ────────────────────────────────────────────────────────
export default function TournamentsSection() {
  const [data, setData] = useState<any[]>([])
  const [gamesList, setGamesList] = useState<any[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterGame, setFilterGame] = useState('')

  const load = useCallback(() => {
    (tournamentsApi.listAll() as Promise<any>).then(r => setData(r.tournaments || [])).catch(() => {})
    ;(gamesApi.listAll() as Promise<any>).then(r => setGamesList(r.games || [])).catch(() => {})
  }, [])

  useEffect(() => { load() }, [load])

  const buildPayload = (form: TournamentForm) => ({
    name: form.name,
    game_id: form.game_id || null,
    format: form.format,
    team_size: form.format === 'team' ? (form.team_size || null) : null,
    bracket_type: form.bracket_type,
    status: form.status,
    description: form.description,
    rules: form.rules,
    requirements: form.requirements,
    banner_url: form.banner_url,
    registration_open_at: fromLocalInput(form.registration_open_at) || null,
    registration_deadline: fromLocalInput(form.registration_deadline) || null,
    start_date: fromLocalInput(form.start_date) || null,
    max_participants: form.max_participants || null,
  })

  const syncPlacements = async (
    tournamentId: number,
    placements: Placement[],
    existing: Placement[],
  ) => {
    // Deletes: existing rows whose id no longer appears in placements
    const keptIds = new Set(placements.filter(p => p.id).map(p => p.id))
    const toDelete = existing.filter(p => p.id && !keptIds.has(p.id))
    await Promise.all(toDelete.map(p => tournamentsApi.deletePlacement(tournamentId, p.id!)))

    // Creates / updates
    for (const p of placements) {
      if (!p.placement.trim()) continue
      if (p.id) {
        await tournamentsApi.updatePlacement(tournamentId, p.id, {
          placement: p.placement, reward_text: p.reward_text, display_order: p.display_order,
        })
      } else {
        await tournamentsApi.createPlacement(tournamentId, {
          placement: p.placement, reward_text: p.reward_text, display_order: p.display_order,
        })
      }
    }
  }

  const handleAdd = async (form: TournamentForm, placements: Placement[], bannerFile: File | null) => {
    let created: any
    if (bannerFile) {
      const fd = new FormData()
      const payload = buildPayload(form)
      Object.entries(payload).forEach(([k, v]) => fd.append(k, v === null ? '' : String(v)))
      fd.append('banner', bannerFile)
      created = await tournamentsApi.createMultipart(fd)
    } else {
      created = await tournamentsApi.create(buildPayload(form))
    }
    if (created?.id) {
      await syncPlacements(created.id, placements, [])
    }
    load()
  }

  const handleEdit = async (form: TournamentForm, placements: Placement[], bannerFile: File | null) => {
    if (!editing) return
    if (bannerFile) {
      const fd = new FormData()
      const payload = buildPayload(form)
      Object.entries(payload).forEach(([k, v]) => fd.append(k, v === null ? '' : String(v)))
      fd.append('banner', bannerFile)
      await tournamentsApi.updateMultipart(editing.id, fd)
    } else {
      await tournamentsApi.update(editing.id, buildPayload(form))
    }
    await syncPlacements(editing.id, placements, editing.placements || [])
    load()
  }

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete tournament "${name}"? This cannot be undone.`)) return
    await tournamentsApi.delete(id)
    load()
  }

  const displayed = data.filter(t => {
    if (filterStatus && t.status !== filterStatus) return false
    if (filterGame && t.game !== filterGame) return false
    return true
  })

  return (
    <div>
      <SectionHeader
        title="Tournaments"
        action={
          <div className="flex items-center gap-2 flex-wrap">
            <FilterSelect value={filterGame} onChange={setFilterGame}>
              <FilterOption value="">All Games</FilterOption>
              {gamesList.map(g => <FilterOption key={g.slug} value={g.slug}>{g.title}</FilterOption>)}
            </FilterSelect>
            <FilterSelect value={filterStatus} onChange={setFilterStatus}>
              <FilterOption value="">All Statuses</FilterOption>
              {Object.entries(STATUS_CONFIG).map(([v, c]) => <FilterOption key={v} value={v}>{c.label}</FilterOption>)}
            </FilterSelect>
            <ActionButton onClick={() => setShowAdd(true)}>+ New Tournament</ActionButton>
          </div>
        }
      />

      {displayed.length === 0 ? (
        <div className="text-center py-16 border border-white/5 rounded-2xl">
          <p className="text-white/20 text-sm tracking-wider">No tournaments found.</p>
          <button onClick={() => setShowAdd(true)}
            className="mt-4 text-purple-400 text-xs font-bold tracking-widest uppercase hover:text-purple-300 transition-colors cursor-pointer">
            Create your first tournament →
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map(t => (
            <TournamentRow
              key={t.id}
              t={t}
              gamesList={gamesList}
              onManage={() => setEditing(t)}
              onDelete={() => handleDelete(t.id, t.name)}
            />
          ))}
        </div>
      )}

      {showAdd && (
        <TournamentModal
          initial={{}}
          isEdit={false}
          gamesList={gamesList}
          onSave={handleAdd}
          onClose={() => setShowAdd(false)}
        />
      )}
      {editing && (
        <TournamentModal
          initial={{
            ...editing,
            game_id: gamesList.find(g => g.slug === editing.game)?.id ?? '',
          }}
          isEdit={true}
          gamesList={gamesList}
          onSave={handleEdit}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}
