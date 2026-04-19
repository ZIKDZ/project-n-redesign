import { useState, useEffect, useRef } from 'react'
import { spotlight } from '../../../../utils/api'
import { Badge, SectionHeader, ActionButton, getCsrfToken } from '../DashboardShared'

// ── SlideFormCard ─────────────────────────────────────────────────────────────
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

  const inputClass =
    'bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-purple-500/60 w-full placeholder-white/20'
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
        <div className="md:col-span-2">
          <label className={labelClass}>Internal Title (staff only)</label>
          <input
            placeholder="e.g. Season 5 Trailer"
            value={form.title}
            onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
            className={inputClass}
          />
        </div>

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

        <div>
          <label className={labelClass}>{mediaType === 'video' ? 'Video URL (.mp4 / .webm)' : 'Image URL'}</label>
          <input
            placeholder={mediaType === 'video' ? 'https://cdn.example.com/video.mp4' : 'https://cdn.example.com/banner.jpg'}
            value={mediaType === 'video' ? form.video_url : form.image_url}
            onChange={e =>
              setForm(p =>
                mediaType === 'video' ? { ...p, video_url: e.target.value } : { ...p, image_url: e.target.value }
              )
            }
            className={inputClass}
          />
        </div>

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

        <div>
          <label className={labelClass}>Pill Label</label>
          <input
            placeholder="MATCH DAY · ROCKET LEAGUE"
            value={form.pill_label}
            onChange={e => setForm(p => ({ ...p, pill_label: e.target.value }))}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Click-Through URL (optional)</label>
          <input
            placeholder="https://…"
            value={form.href}
            onChange={e => setForm(p => ({ ...p, href: e.target.value }))}
            className={inputClass}
          />
        </div>

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

// ── SpotlightSection ──────────────────────────────────────────────────────────
export default function SpotlightSection() {
  const [data, setData] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingSlide, setEditingSlide] = useState<any | null>(null)

  const load = () => {
    ;(spotlight.listAll() as Promise<any>).then(r => setData(r.slides || [])).catch(() => {})
  }

  useEffect(() => { load() }, [])

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
        These slides cycle inside the hero floating card on the landing page. Supports videos (mp4/webm) and images.
        Click-through links are optional.
      </p>

      {(showForm || editingSlide) && (
        <SlideFormCard
          initial={editingSlide}
          getCsrf={getCsrfToken}
          onSaved={() => { setShowForm(false); setEditingSlide(null); load() }}
          onCancel={() => { setShowForm(false); setEditingSlide(null) }}
          nextOrder={data.length}
        />
      )}

      <div className="space-y-3 mt-4">
        {data.length === 0 && !showForm && !editingSlide && (
          <div className="bg-white/5 border border-white/8 rounded-2xl p-8 text-center">
            <p className="text-white/30 text-sm mb-2">No spotlight slides yet.</p>
            <p className="text-white/15 text-xs">
              Add a video or image to replace the default floating card on the landing page.
            </p>
          </div>
        )}
        {data.map((s: any) => (
          <div
            key={s.id}
            className={`bg-white/5 border border-white/8 rounded-2xl p-5 flex items-center gap-4 transition-opacity ${!s.is_active ? 'opacity-40' : ''}`}
          >
            <div className="w-24 h-16 rounded-xl overflow-hidden shrink-0 border border-white/10 bg-black/30 flex items-center justify-center">
              {s.media_url ? (
                s.media_type === 'video' ? (
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-purple-400 text-xl">▶</span>
                    <span className="text-white/30 text-[9px] tracking-widest uppercase">Video</span>
                  </div>
                ) : (
                  <img src={s.media_url} alt="" className="w-full h-full object-cover" />
                )
              ) : (
                <span className="text-white/20 text-xs">No media</span>
              )}
            </div>

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
