import { useState, useEffect, useRef, useCallback } from 'react'
import { news } from '../../../../utils/api'
import { Badge, SectionHeader, ActionButton, getCsrfToken } from '../DashboardShared'

type NewsItem = {
  id: number
  title: string
  tag: string
  description: string
  thumbnail: string
  published_at: string
  is_published: boolean
}

const EMPTY_FORM = {
  title: '',
  tag: 'announcement',
  description: '',
  published_at: '',
  is_published: true,
}

// ── ImageCropModal ─────────────────────────────────────────────────────────────
// Crop area matches the NewsCard thumbnail: h-48 fixed height inside a ~2:1 card.
// We use exactly 2:1 (width:height) so what you see in the cropper is what
// appears on the news page — no surprises.
function ImageCropModal({
  src,
  onConfirm,
  onCancel,
}: {
  src: string
  onConfirm: (blob: Blob) => void
  onCancel: () => void
}) {
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const previewRef = useRef<HTMLCanvasElement>(null)
  const imgRef     = useRef<HTMLImageElement | null>(null)

  const [zoom,        setZoom]        = useState(1)
  const [offset,      setOffset]      = useState({ x: 0, y: 0 })
  const [dragging,    setDragging]    = useState(false)
  const [dragStart,   setDragStart]   = useState({ x: 0, y: 0 })
  const [imgLoaded,   setImgLoaded]   = useState(false)
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 })

  // ── Crop canvas dimensions ─────────────────────────────────────────────────
  // NewsCard thumbnail: full card width × h-48 (192 px).
  // Inside a 3-col grid at max-w-7xl (1280 px) with px-6 gaps the card is
  // roughly 390 px wide → 390/192 ≈ 2.03.  We normalise to exactly 2:1.
  // The preview canvas is kept at a comfortable 320 × 160 px on screen;
  // the export canvas is 800 × 400 px (2× retina-ready).
  const CW = 320   // preview canvas width  (px on screen)
  const CH = 160   // preview canvas height — exactly CW/2, matching 2:1 ratio

  const EXPORT_W = 800
  const EXPORT_H = 400  // 800/2 = 400, same 2:1

  // ── Load image ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      imgRef.current = img
      setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight })
      // Fit the image so it fully covers the crop area (cover behaviour)
      const fitZoom = Math.max(CW / img.naturalWidth, CH / img.naturalHeight)
      setZoom(fitZoom)
      setOffset({ x: 0, y: 0 })
      setImgLoaded(true)
    }
    img.src = src
  }, [src])

  // ── Draw preview ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!imgLoaded || !imgRef.current || !previewRef.current) return
    const ctx = previewRef.current.getContext('2d')
    if (!ctx) return
    const img     = imgRef.current
    const scaledW = img.naturalWidth  * zoom
    const scaledH = img.naturalHeight * zoom
    ctx.clearRect(0, 0, CW, CH)
    ctx.drawImage(img, (CW - scaledW) / 2 + offset.x, (CH - scaledH) / 2 + offset.y, scaledW, scaledH)
  }, [zoom, offset, imgLoaded])

  // ── Clamp pan so image always fills the crop area ───────────────────────────
  const clampOffset = useCallback((ox: number, oy: number, z: number) => {
    if (!imgRef.current) return { x: ox, y: oy }
    const scaledW = imgRef.current.naturalWidth  * z
    const scaledH = imgRef.current.naturalHeight * z
    const maxX = Math.max(0, (scaledW - CW) / 2)
    const maxY = Math.max(0, (scaledH - CH) / 2)
    return {
      x: Math.max(-maxX, Math.min(maxX, ox)),
      y: Math.max(-maxY, Math.min(maxY, oy)),
    }
  }, [])

  // ── Mouse / wheel handlers ──────────────────────────────────────────────────
  const handleMouseDown = (e: React.MouseEvent) => {
    setDragging(true)
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y })
  }
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return
    setOffset(clampOffset(e.clientX - dragStart.x, e.clientY - dragStart.y, zoom))
  }
  const handleMouseUp   = () => setDragging(false)
  const handleWheel     = (e: React.WheelEvent) => {
    e.preventDefault()
    const newZoom = Math.max(0.5, Math.min(4, zoom + (-e.deltaY * 0.001) * zoom))
    setZoom(newZoom)
    setOffset(clampOffset(offset.x, offset.y, newZoom))
  }

  // ── Export ──────────────────────────────────────────────────────────────────
  const handleConfirm = () => {
    if (!imgRef.current || !canvasRef.current) return
    const canvas  = canvasRef.current
    canvas.width  = EXPORT_W
    canvas.height = EXPORT_H
    const ctx     = canvas.getContext('2d')
    if (!ctx) return
    const scaleX  = EXPORT_W / CW
    const scaleY  = EXPORT_H / CH
    const img     = imgRef.current
    const scaledW = img.naturalWidth  * zoom * scaleX
    const scaledH = img.naturalHeight * zoom * scaleY
    ctx.drawImage(
      img,
      (EXPORT_W - scaledW) / 2 + offset.x * scaleX,
      (EXPORT_H - scaledH) / 2 + offset.y * scaleY,
      scaledW,
      scaledH,
    )
    canvas.toBlob(blob => { if (blob) onConfirm(blob) }, 'image/jpeg', 0.92)
  }

  const fitZoom =
    naturalSize.w && naturalSize.h
      ? Math.max(CW / naturalSize.w, CH / naturalSize.h)
      : 1

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.90)', backdropFilter: 'blur(6px)' }}
    >
      <div className="bg-[#0f001a] border border-white/10 rounded-3xl w-full max-w-sm shadow-2xl shadow-purple-900/40 overflow-hidden">

        {/* Header */}
        <div className="px-6 pt-5 pb-3 border-b border-white/8">
          <h3
            className="text-white font-black text-base uppercase tracking-wide"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            Adjust Thumbnail
          </h3>
          {/* Remind the editor exactly what ratio they're targeting */}
          <p className="text-white/30 text-[10px] tracking-widest mt-0.5">
            2 : 1 ratio · matches the news card thumbnail · drag to reposition · scroll to zoom
          </p>
        </div>

        {/* Crop area */}
        <div className="p-6 flex flex-col items-center gap-5">
          <div
            className="relative select-none rounded-xl overflow-hidden border border-white/20"
            style={{ width: CW, height: CH, background: '#0a0015' }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
          >
            <canvas
              ref={previewRef}
              width={CW}
              height={CH}
              className="absolute inset-0"
              style={{ cursor: dragging ? 'grabbing' : 'grab', display: imgLoaded ? 'block' : 'none' }}
            />
            {!imgLoaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {/* Inset glow border */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ boxShadow: 'inset 0 0 0 1px rgba(168,85,247,0.4)' }}
            />
          </div>

          {/* Zoom slider */}
          <div className="w-full flex items-center gap-3">
            <svg className="w-4 h-4 text-white/30 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input
              type="range"
              min={fitZoom}
              max={fitZoom * 3}
              step={0.01}
              value={zoom}
              onChange={e => {
                const z = parseFloat(e.target.value)
                setZoom(z)
                setOffset(clampOffset(offset.x, offset.y, z))
              }}
              className="flex-1 accent-purple-500"
              style={{ cursor: 'pointer' }}
            />
            <svg className="w-5 h-5 text-white/30 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-white/8">
          <button
            onClick={handleConfirm}
            disabled={!imgLoaded}
            className="flex-1 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-black py-2.5 rounded-xl text-xs tracking-widest uppercase transition-all duration-200 cursor-pointer"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            Apply Thumbnail
          </button>
          <button
            onClick={onCancel}
            className="px-5 bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white font-bold py-2.5 rounded-xl text-xs tracking-widest uppercase transition-all duration-200 cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Hidden export canvas */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}

// ── NewsForm ───────────────────────────────────────────────────────────────────
function NewsForm({
  initial,
  isEdit,
  onSaved,
  onCancel,
}: {
  initial: typeof EMPTY_FORM & { id?: number; thumbnail?: string }
  isEdit: boolean
  onSaved: () => void
  onCancel: () => void
}) {
  const [form, setForm] = useState({
    title:        initial.title        || '',
    tag:          initial.tag          || 'announcement',
    description:  initial.description  || '',
    published_at: initial.published_at || '',
    is_published: initial.is_published !== false,
  })
  const [thumbnailFile,    setThumbnailFile]    = useState<File | null>(null)
  const [thumbnailPreview, setThumbnailPreview] = useState<string>(initial.thumbnail || '')
  const [cropSrc,          setCropSrc]          = useState<string | null>(null)
  const [saving,           setSaving]           = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Open crop modal on file pick — never use the raw file directly
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setCropSrc(URL.createObjectURL(file))
    e.target.value = '' // reset so re-selecting same file fires onChange again
  }

  const handleCropConfirm = (blob: Blob) => {
    const croppedFile = new File([blob], 'thumbnail.jpg', { type: 'image/jpeg' })
    setThumbnailFile(croppedFile)
    setThumbnailPreview(URL.createObjectURL(blob))
    setCropSrc(null)
  }

  const removeFile = () => {
    setThumbnailFile(null)
    setThumbnailPreview(initial.thumbnail || '')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const save = async () => {
    if (!form.title || !form.description || !form.published_at) return
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('title',        form.title)
      fd.append('tag',          form.tag)
      fd.append('description',  form.description)
      fd.append('published_at', form.published_at)
      fd.append('is_published', form.is_published ? 'true' : 'false')
      if (thumbnailFile) fd.append('thumbnail', thumbnailFile)

      const url    = isEdit ? `/api/news/${initial.id}/` : '/api/news/create/'
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

  const inputClass =
    'bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500/60 w-full'

  return (
    <>
      {cropSrc && (
        <ImageCropModal
          src={cropSrc}
          onConfirm={handleCropConfirm}
          onCancel={() => setCropSrc(null)}
        />
      )}

      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
        <h3
          className="text-white font-black text-sm uppercase tracking-widest mb-4"
          style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
        >
          {isEdit ? `Editing — ${initial.title}` : 'New Post'}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          <div className="md:col-span-2">
            <label className="block text-white/40 text-xs font-bold tracking-widest uppercase mb-1">Title *</label>
            <input
              placeholder="Post title"
              value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-white/40 text-xs font-bold tracking-widest uppercase mb-1">Tag</label>
            <select
              value={form.tag}
              onChange={e => setForm(p => ({ ...p, tag: e.target.value }))}
              className={inputClass + ' cursor-pointer'}
            >
              {['announcement', 'award', 'community', 'match', 'roster', 'update'].map(t => (
                <option key={t} value={t} className="bg-[#1a0030]">
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-white/40 text-xs font-bold tracking-widest uppercase mb-1">Publish Date *</label>
            <input
              type="date"
              value={form.published_at}
              max="2099-12-31"
              onChange={e => setForm(p => ({ ...p, published_at: e.target.value }))}
              className={inputClass}
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-white/40 text-xs font-bold tracking-widest uppercase mb-1">Description *</label>
            <textarea
              placeholder="Write the post content…"
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              className={inputClass + ' h-28 resize-none'}
            />
          </div>

          {/* ── Thumbnail ── */}
          <div className="md:col-span-2">
            <label className="block text-white/40 text-xs font-bold tracking-widest uppercase mb-2">
              Thumbnail Image
              <span className="ml-2 text-white/20 normal-case tracking-normal font-normal">2:1 ratio</span>
            </label>

            <div className="flex items-start gap-4">
              {/*
                Preview box: mirrors NewsCard exactly.
                NewsCard thumbnail is `h-48` inside a full-width card.
                We show a 256 × 128 px preview here (same 2:1, compact).
              */}
              <div
                className="rounded-xl border-2 border-dashed border-white/10 overflow-hidden shrink-0 cursor-pointer hover:border-purple-500/50 transition-colors"
                style={{ width: 192, height: 96 }}   /* 2:1 */
                onClick={() => fileInputRef.current?.click()}
              >
                {thumbnailPreview ? (
                  <img src={thumbnailPreview} className="w-full h-full object-cover" alt="preview" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-white/20 text-xs text-center px-2">Click to upload</span>
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-white/5 border border-white/10 hover:border-purple-500/40 text-white/60 hover:text-white text-xs font-bold px-4 py-2 rounded-lg tracking-wider uppercase transition-all duration-200"
                >
                  {thumbnailFile ? 'Change Image' : 'Choose Image'}
                </button>

                {thumbnailFile && (
                  <p className="text-white/30 text-xs">{thumbnailFile.name}</p>
                )}

                {/* Re-crop: re-open modal with the already-cropped blob */}
                {thumbnailFile && (
                  <button
                    type="button"
                    onClick={() => setCropSrc(URL.createObjectURL(thumbnailFile))}
                    className="text-purple-400/60 hover:text-purple-400 text-xs font-bold tracking-wider uppercase transition-colors block"
                  >
                    ✦ Re-crop
                  </button>
                )}

                {thumbnailFile && (
                  <button
                    type="button"
                    onClick={removeFile}
                    className="text-red-400/60 hover:text-red-400 text-xs transition-colors block"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Published toggle */}
          <div className="md:col-span-2 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setForm(p => ({ ...p, is_published: !p.is_published }))}
              className={`w-10 h-6 rounded-full transition-colors duration-200 relative ${
                form.is_published ? 'bg-purple-600' : 'bg-white/10'
              }`}
            >
              <span
                className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200"
                style={{ left: form.is_published ? '18px' : '2px' }}
              />
            </button>
            <span className="text-white/50 text-xs font-bold tracking-widest uppercase">
              {form.is_published ? 'Published' : 'Draft'}
            </span>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={save}
            disabled={saving || !form.title || !form.description || !form.published_at}
            className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black px-6 py-2.5 rounded-lg text-xs tracking-widest uppercase transition-all duration-200"
          >
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Save Post'}
          </button>
          <ActionButton variant="ghost" onClick={onCancel}>Cancel</ActionButton>
        </div>
      </div>
    </>
  )
}

// ── NewsSection ────────────────────────────────────────────────────────────────
export default function NewsSection() {
  const [data,     setData]     = useState<NewsItem[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<NewsItem | null>(null)

  const load = () => {
    ;(news.listAll() as Promise<any>).then(r => setData(r.news || [])).catch(() => {})
  }

  useEffect(() => { load() }, [])

  const remove = async (id: number) => {
    if (!confirm('Delete this post?')) return
    await news.delete(id)
    load()
  }

  const toggle = async (id: number, is_published: boolean) => {
    await news.update(id, { is_published: !is_published })
    load()
  }

  const openAdd  = () => { setEditItem(null); setShowForm(true) }
  const openEdit = (item: NewsItem) => { setEditItem(item); setShowForm(true) }

  const handleSaved  = () => { setShowForm(false); setEditItem(null); load() }
  const handleCancel = () => { setShowForm(false); setEditItem(null) }

  return (
    <div>
      <SectionHeader
        title="News"
        action={
          <ActionButton onClick={showForm && !editItem ? handleCancel : openAdd}>
            {showForm && !editItem ? 'Cancel' : '+ New Post'}
          </ActionButton>
        }
      />

      {showForm && (
        <NewsForm
          initial={
            editItem
              ? {
                  id:           editItem.id,
                  title:        editItem.title,
                  tag:          editItem.tag,
                  description:  editItem.description,
                  published_at: editItem.published_at,
                  is_published: editItem.is_published,
                  thumbnail:    editItem.thumbnail,
                }
              : { title: '', tag: 'announcement', description: '', published_at: '', is_published: true }
          }
          isEdit={!!editItem}
          onSaved={handleSaved}
          onCancel={handleCancel}
        />
      )}

      <div className="space-y-3">
        {data.length === 0 && <p className="text-white/30 text-sm">No news posts yet.</p>}
        {data.map((n: NewsItem) => (
          <div key={n.id} className="bg-white/5 border border-white/8 rounded-2xl px-6 py-4 flex items-center gap-4">
            {n.thumbnail && (
              <img src={n.thumbnail} className="w-16 h-12 object-cover rounded-lg opacity-70 shrink-0" alt="" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1 flex-wrap">
                <span className="text-white font-bold truncate">{n.title}</span>
                <Badge color="purple">{n.tag}</Badge>
                {!n.is_published && <Badge color="gray">Draft</Badge>}
              </div>
              <p className="text-white/40 text-xs truncate">
                {n.published_at} · {n.description.slice(0, 80)}…
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <ActionButton onClick={() => openEdit(n)}>Edit</ActionButton>
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