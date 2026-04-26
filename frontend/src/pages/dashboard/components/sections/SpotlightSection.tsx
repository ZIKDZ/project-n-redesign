import { useState, useEffect, useRef } from 'react'
import { spotlight } from '../../../../utils/api'
import { Badge, SectionHeader, ActionButton, getCsrfToken } from '../DashboardShared'

// ── Upload helper with progress ───────────────────────────────────────────────
function uploadWithProgress(
  url: string,
  method: string,
  fd: FormData,
  csrfToken: string,
  onProgress: (pct: number) => void
): Promise<any> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open(method, url)
    xhr.withCredentials = true
    xhr.setRequestHeader('X-CSRFToken', csrfToken)

    xhr.upload.addEventListener('progress', e => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
    })

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText))
        } catch {
          resolve({})
        }
      } else {
        try {
          reject(new Error(JSON.parse(xhr.responseText).error || `HTTP ${xhr.status}`))
        } catch {
          reject(new Error(`HTTP ${xhr.status}`))
        }
      }
    })

    xhr.addEventListener('error', () => reject(new Error('Network error')))
    xhr.send(fd)
  })
}

// ── ProgressBar ───────────────────────────────────────────────────────────────
function ProgressBar({ pct }: { pct: number }) {
  if (pct === 0 || pct === 100) return null
  return (
    <div className="mt-3">
      <div className="flex justify-between items-center mb-1">
        <span className="text-white/40 text-[10px] font-bold tracking-widest uppercase">Uploading…</span>
        <span className="text-purple-300 text-[10px] font-bold">{pct}%</span>
      </div>
      <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-purple-600 to-violet-400 rounded-full transition-all duration-150"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

// ── VideoPreview ──────────────────────────────────────────────────────────────
// Static video preview (shows first frame, no autoplay)
function VideoPreview({
  src,
  className = '',
}: {
  src: string
  className?: string
}) {
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setFailed(false)
  }, [src])

  if (failed) {
    return (
      <div className={`flex items-center justify-center bg-black/30 ${className}`}>
        <span className="text-purple-400 text-xl">▶</span>
      </div>
    )
  }

  return (
    <video
      src={src}
      className={className}
      preload="metadata"
      onError={() => setFailed(true)}
    />
  )
}

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

  const initialMediaType: 'video' | 'image' = initial?.media_type || 'image'
  const initialVideoUrl = initialMediaType === 'video' ? (initial?.media_url || '') : ''
  const initialImageUrl = initialMediaType === 'image' ? (initial?.media_url || '') : ''

  const [mediaType, setMediaType] = useState<'video' | 'image'>(initialMediaType)
  const [form, setForm] = useState({
    title: initial?.title || '',
    video_url: initialVideoUrl,
    image_url: initialImageUrl,
    href: initial?.href || '',
    pill_label: initial?.pill_label || 'MATCH DAY · ROCKET LEAGUE',
    duration: initial?.duration || 8,
    is_active: initial?.is_active !== false,
    display_order: initial?.display_order ?? nextOrder,
  })

  const [file, setFile] = useState<File | null>(null)
  const [previewSrc, setPreviewSrc] = useState<string>('')
  const [uploadPct, setUploadPct] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const fileRef = useRef<HTMLInputElement>(null)
  const previewObjectUrlRef = useRef<string>('')

  const clearPreviewObjectUrl = () => {
    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current)
      previewObjectUrlRef.current = ''
    }
  }

  useEffect(() => {
    return () => {
      clearPreviewObjectUrl()
    }
  }, [])

  const handleMediaTypeChange = (t: 'video' | 'image') => {
    setMediaType(t)
    setFile(null)
    setPreviewSrc('')
    clearPreviewObjectUrl()
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null
    setFile(f)

    clearPreviewObjectUrl()

    if (!f) {
      setPreviewSrc('')
      return
    }

    const objectUrl = URL.createObjectURL(f)
    previewObjectUrlRef.current = objectUrl
    setPreviewSrc(objectUrl)
  }

  const inputClass =
    'bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-purple-500/60 w-full placeholder-white/20'
  const labelClass = 'block text-white/40 text-[10px] font-bold tracking-widest uppercase mb-1'

  const handleSave = async () => {
    setError('')
    setSaving(true)
    setUploadPct(0)

    try {
      const fd = new FormData()
      fd.append('media_type', mediaType)
      fd.append('title', form.title)
      fd.append('href', form.href)
      fd.append('pill_label', form.pill_label)
      fd.append('duration', String(form.duration))
      fd.append('is_active', form.is_active ? 'true' : 'false')
      fd.append('display_order', String(form.display_order))

      if (mediaType === 'video') {
        fd.append('video_url', form.video_url)
        if (file) fd.append('video_file', file)
      } else {
        fd.append('image_url', form.image_url)
        if (file) fd.append('image_file', file)
      }

      const url = isEdit ? `/api/spotlight/${initial.id}/` : '/api/spotlight/create/'
      const method = isEdit ? 'PATCH' : 'POST'

      await uploadWithProgress(url, method, fd, getCsrf(), pct => setUploadPct(pct))
      setUploadPct(100)
      onSaved()
    } catch (e: any) {
      setError(e.message || 'Upload failed')
      setUploadPct(0)
    } finally {
      setSaving(false)
    }
  }

  const currentImageSrc = previewSrc || form.image_url
  const currentVideoSrc = previewSrc || form.video_url
  const currentUrlField = mediaType === 'video' ? form.video_url : form.image_url

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

        {/* Media type toggle */}
        <div className="md:col-span-2">
          <label className={labelClass}>Media Type</label>
          <div className="flex gap-2">
            {(['image', 'video'] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => handleMediaTypeChange(t)}
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

        {/* URL field */}
        <div>
          <label className={labelClass}>
            {mediaType === 'video' ? 'Video URL (.mp4 / .webm)' : 'Image URL'}
            <span className="normal-case text-white/20 ml-1">(fallback if no file)</span>
          </label>
          <input
            placeholder={
              mediaType === 'video'
                ? 'https://cdn.example.com/video.mp4'
                : 'https://cdn.example.com/banner.jpg'
            }
            value={currentUrlField}
            onChange={e =>
              setForm(p =>
                mediaType === 'video'
                  ? { ...p, video_url: e.target.value }
                  : { ...p, image_url: e.target.value }
              )
            }
            className={inputClass}
          />
        </div>

        {/* File upload / Preview */}
        <div>
          <label className={labelClass}>Upload File</label>
          <div className="space-y-2">
            {/* Image preview box */}
            {mediaType === 'image' && (
              <div
                className="w-full h-24 rounded-xl border-2 border-dashed border-white/10 flex items-center justify-center overflow-hidden cursor-pointer hover:border-purple-500/50 transition-colors bg-white/5"
                onClick={() => fileRef.current?.click()}
              >
                {currentImageSrc ? (
                  <img
                    src={currentImageSrc}
                    alt="preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-white/20">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M13.5 12h.008v.008H13.5V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                      />
                    </svg>
                    <span className="text-[10px]">Click to upload image</span>
                  </div>
                )}
              </div>
            )}

            {/* Video preview box */}
            {mediaType === 'video' && (
              <div
                className="w-full h-24 rounded-xl border-2 border-dashed border-white/10 overflow-hidden cursor-pointer hover:border-purple-500/50 transition-colors bg-white/5 relative"
                onClick={() => fileRef.current?.click()}
              >
                {currentVideoSrc ? (
                  <>
                    <VideoPreview
                      src={currentVideoSrc}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/30 pointer-events-none flex items-center justify-center">
                      <span className="text-white text-2xl drop-shadow">▶</span>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-white/20">
                    <span className="text-2xl">▶</span>
                    <span className="text-[10px]">Click to upload video</span>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-500/40 text-white/50 hover:text-white text-[10px] font-bold px-3 py-2 rounded-lg tracking-wider uppercase transition-all duration-200"
              >
                {file ? 'Change File' : `Choose ${mediaType === 'video' ? 'Video' : 'Image'}`}
              </button>

              {file && (
                <button
                  type="button"
                  onClick={() => {
                    setFile(null)
                    setPreviewSrc('')
                    clearPreviewObjectUrl()
                    if (fileRef.current) fileRef.current.value = ''
                  }}
                  className="text-red-400/60 hover:text-red-400 text-[10px] transition-colors"
                >
                  Remove
                </button>
              )}
            </div>

            {file && (
              <p className="text-white/40 text-[10px] truncate max-w-[200px]">
                {mediaType === 'video' ? '▶ ' : '🖼 '}
                {file.name}
              </p>
            )}

            <input
              ref={fileRef}
              type="file"
              accept={mediaType === 'video' ? 'video/mp4,video/webm,video/*' : 'image/*'}
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
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

        {/* Click-through URL */}
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
          <label className={labelClass}>Duration (seconds)</label>
          <input
            type="number"
            min={2}
            max={60}
            value={form.duration}
            onChange={e => setForm(p => ({ ...p, duration: Number(e.target.value) }))}
            className={inputClass}
          />
        </div>

        {/* Display order */}
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
            className={`w-9 h-5 rounded-full transition-colors duration-200 relative shrink-0 ${
              form.is_active ? 'bg-purple-600' : 'bg-white/10'
            }`}
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

        {/* Progress bar */}
        {saving && (
          <div className="md:col-span-2">
            <ProgressBar pct={uploadPct} />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="md:col-span-2">
            <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              ⚠ {error}
            </p>
          </div>
        )}
      </div>

      <div className="flex gap-3 mt-5">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-black px-6 py-2.5 rounded-xl text-xs tracking-widest uppercase transition-all"
          style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
        >
          {saving ? `Uploading… ${uploadPct > 0 ? uploadPct + '%' : ''}` : isEdit ? 'Save Changes' : 'Add Slide'}
        </button>
        <ActionButton variant="ghost" onClick={onCancel}>
          Cancel
        </ActionButton>
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
    ;(spotlight.listAll() as Promise<any>)
      .then(r => setData(r.slides || []))
      .catch(() => {})
  }

  useEffect(() => {
    load()
  }, [])

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
          <ActionButton
            onClick={() => {
              setEditingSlide(null)
              setShowForm(v => !v)
            }}
          >
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
          onSaved={() => {
            setShowForm(false)
            setEditingSlide(null)
            load()
          }}
          onCancel={() => {
            setShowForm(false)
            setEditingSlide(null)
          }}
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
            className={`bg-white/5 border border-white/8 rounded-2xl p-5 flex items-center gap-4 transition-opacity ${
              !s.is_active ? 'opacity-40' : ''
            }`}
          >
            {/* Thumbnail preview */}
            <div className="w-24 h-16 rounded-xl overflow-hidden shrink-0 border border-white/10 bg-black/30 flex items-center justify-center relative">
              {s.media_url ? (
                s.media_type === 'video' ? (
                  <>
                    <VideoPreview
                      src={s.media_url}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center pointer-events-none">
                      <span className="text-white text-lg drop-shadow">▶</span>
                    </div>
                  </>
                ) : (
                  <img
                    src={s.media_url}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={e => {
                      ;(e.currentTarget as HTMLImageElement).style.display = 'none'
                    }}
                  />
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
                {s.href && <span className="ml-2 text-purple-400/60">→ {s.href.slice(0, 40)}</span>}
                <span className="ml-2 text-white/20">
                  {s.duration}s · order {s.display_order}
                </span>
              </p>
              {s.media_url && (
                <p className="text-white/20 text-[10px] mt-0.5 truncate max-w-xs">
                  {s.media_url.slice(0, 60)}
                  {s.media_url.length > 60 ? '…' : ''}
                </p>
              )}
            </div>

            <div className="flex gap-2 shrink-0">
              <ActionButton variant="ghost" onClick={() => toggleActive(s.id, s.is_active)}>
                {s.is_active ? 'Hide' : 'Show'}
              </ActionButton>
              <ActionButton
                onClick={() => {
                  setShowForm(false)
                  setEditingSlide(s)
                }}
              >
                Edit
              </ActionButton>
              <ActionButton variant="danger" onClick={() => remove(s.id, s.title)}>
                Delete
              </ActionButton>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}