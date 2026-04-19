import { useState, useEffect } from 'react'
import { games } from '../../../../utils/api'
import { Badge, SectionHeader, ActionButton } from '../DashboardShared'

// ── Constants ─────────────────────────────────────────────────────────────────
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

// ── GameFormModal ─────────────────────────────────────────────────────────────
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

  const inputClass =
    'bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-purple-500/60 w-full'

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
          <h3
            className="text-white font-black text-lg uppercase tracking-wide"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
          >
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
              <input
                placeholder="e.g. rocket_league"
                value={form.slug}
                onChange={e => setForm(p => ({ ...p, slug: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') }))}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-white/40 text-[10px] font-bold tracking-widest uppercase mb-1">Publisher</label>
              <input
                placeholder="e.g. Psyonix"
                value={form.publisher}
                onChange={e => setForm(p => ({ ...p, publisher: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-white/40 text-[10px] font-bold tracking-widest uppercase mb-1">Genre</label>
              <input
                placeholder="e.g. Tactical FPS"
                value={form.genre}
                onChange={e => setForm(p => ({ ...p, genre: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-white/40 text-[10px] font-bold tracking-widest uppercase mb-1">Banner Image URL</label>
              <input
                placeholder="https://…"
                value={form.banner}
                onChange={e => setForm(p => ({ ...p, banner: e.target.value }))}
                className={inputClass}
              />
              {form.banner && (
                <img src={form.banner} alt="preview" className="mt-2 w-full h-20 object-cover rounded-xl border border-white/10 opacity-80" />
              )}
            </div>
            <div>
              <label className="block text-white/40 text-[10px] font-bold tracking-widest uppercase mb-1">Overlay Color</label>
              <input
                placeholder="rgba(0,48,135,0.4)"
                value={form.overlay_color}
                onChange={e => setForm(p => ({ ...p, overlay_color: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-white/40 text-[10px] font-bold tracking-widest uppercase mb-1">
                Display Order
                {form.display_order === -1 && (
                  <span className="normal-case text-white/20 ml-1">(auto → {autoOrder})</span>
                )}
              </label>
              <input
                type="number"
                min="0"
                placeholder={`auto (${autoOrder})`}
                value={form.display_order === -1 ? '' : form.display_order}
                onChange={e =>
                  setForm(p => ({ ...p, display_order: e.target.value === '' ? -1 : parseInt(e.target.value) || 0 }))
                }
                className={inputClass}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-white/40 text-[10px] font-bold tracking-widest uppercase mb-1">
                Ranks <span className="normal-case text-white/20">(one per line)</span>
              </label>
              <textarea
                placeholder={'Bronze I\nBronze II\nSilver I\nGold I\n…'}
                value={ranksText}
                onChange={e => setRanksText(e.target.value)}
                className={inputClass + ' h-24 resize-none font-mono text-xs'}
              />
              <p className="text-white/20 text-[10px] mt-1">
                {ranksText.split('\n').filter(r => r.trim()).length} rank(s) defined
              </p>
            </div>
            <div className="md:col-span-2 grid grid-cols-2 gap-3">
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
                  <p className="text-white/20 text-[10px]">Shown in games showcase</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setForm(p => ({ ...p, registration_open: !p.registration_open }))}
                  className={`w-9 h-5 rounded-full transition-colors duration-200 relative shrink-0 ${form.registration_open ? 'bg-green-600' : 'bg-white/10'}`}
                >
                  <span
                    className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200"
                    style={{ left: form.registration_open ? '16px' : '2px' }}
                  />
                </button>
                <div>
                  <p className="text-white/50 text-[10px] font-bold tracking-widest uppercase">
                    {form.registration_open ? 'Recruiting' : 'Closed'}
                  </p>
                  <p className="text-white/20 text-[10px]">Shown in join form</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4">
          <button
            onClick={handleSubmit}
            disabled={saving || !form.title || !form.slug}
            className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black px-6 py-2 rounded-xl text-xs tracking-widest uppercase transition-all duration-200"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Game'}
          </button>
          <ActionButton variant="ghost" onClick={onClose}>Cancel</ActionButton>
        </div>
      </div>
    </div>
  )
}

// ── GamesSection ──────────────────────────────────────────────────────────────
export default function GamesSection() {
  const [data, setData] = useState<any[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingGame, setEditingGame] = useState<typeof EMPTY_GAME_FORM | null>(null)

  const load = () => {
    ;(games.listAll() as Promise<any>).then(r => setData(r.games || [])).catch(() => {})
  }

  useEffect(() => { load() }, [])

  const nextOrder = data.length > 0 ? Math.max(...data.map((g: any) => g.display_order ?? 0)) + 1 : 0

  const handleAdd  = async (payload: any) => { await games.create(payload); load() }
  const handleEdit = async (payload: any) => {
    if (!editingGame) return
    await games.update((editingGame as any).id, payload)
    load()
  }
  const openEdit = (g: any) => setEditingGame({ ...EMPTY_GAME_FORM, ...g })
  const remove = async (id: number) => {
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
          <div
            key={g.id}
            className={`bg-white/5 border border-white/8 rounded-2xl p-5 flex items-center gap-4 transition-opacity ${!g.is_active ? 'opacity-50' : ''}`}
          >
            <div className="w-24 h-16 rounded-xl shrink-0 overflow-hidden border border-white/10">
              {g.banner
                ? <img src={g.banner} alt={g.title} className="w-full h-full object-cover" />
                : (
                  <div className="w-full h-full bg-white/5 flex items-center justify-center">
                    <span className="text-white/20 text-xl font-black">{g.title.charAt(0)}</span>
                  </div>
                )
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
        <GameFormModal
          initial={EMPTY_GAME_FORM}
          isEdit={false}
          onSave={handleAdd}
          onClose={() => setShowAddModal(false)}
          autoOrder={nextOrder}
        />
      )}
      {editingGame && (
        <GameFormModal
          initial={editingGame}
          isEdit={true}
          onSave={handleEdit}
          onClose={() => setEditingGame(null)}
          autoOrder={nextOrder}
        />
      )}
    </div>
  )
}
