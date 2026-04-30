// ShopSection.tsx
import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Badge, SectionHeader, ActionButton, FilterSelect,
  FilterOption, getCsrfToken, SearchBar, Pagination,
} from '../DashboardShared'

// ── Types ─────────────────────────────────────────────────────────────────────

type Variant = { size: string; color: string; stock: number }

type GalleryImage = { id: number; url: string; display_order: number }

type Product = {
  id: number
  name: string
  description: string
  price: string
  category: string
  banner: string
  variants: Variant[]
  images: GalleryImage[]
  track_stock: boolean          // ← NEW
  total_stock: number | null    // null when track_stock=false
  is_active: boolean
  is_featured: boolean
  display_order: number
}

type Order = {
  id: number
  product_id: number | null
  product_name: string
  product_banner: string
  variant_size: string
  variant_color: string
  quantity: number
  full_name: string
  email: string
  phone: string
  wilaya: string
  wilaya_label: string
  address: string
  status: string
  notes: string
  submitted_at: string
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  jersey: 'Jersey', hoodie: 'Hoodie', cap: 'Cap', accessory: 'Accessory', other: 'Other',
}

const ORDER_STATUS_COLORS: Record<string, 'gray' | 'yellow' | 'purple' | 'green' | 'red'> = {
  pending: 'yellow', confirmed: 'purple', shipped: 'purple', delivered: 'green', cancelled: 'red',
}

const getCsrf  = getCsrfToken
const PAGE_SIZE = 8

// ── VariantEditor ─────────────────────────────────────────────────────────────

function VariantEditor({
  variants,
  onChange,
  trackStock,
}: {
  variants: Variant[]
  onChange: (v: Variant[]) => void
  trackStock: boolean
}) {
  const add    = () => onChange([...variants, { size: '', color: '', stock: 0 }])
  const remove = (i: number) => onChange(variants.filter((_, idx) => idx !== i))
  const update = (i: number, field: keyof Variant, value: string | number) =>
    onChange(variants.map((v, idx) => (idx === i ? { ...v, [field]: value } : v)))

  const inputClass =
    'bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white text-xs ' +
    'focus:outline-none focus:border-purple-500/60 w-full placeholder-white/20'

  return (
    <div className="space-y-2">
      {/* Column headers */}
      <div className={`grid gap-2 mb-1 ${trackStock ? 'grid-cols-[1fr_1fr_80px_28px]' : 'grid-cols-[1fr_1fr_28px]'}`}>
        {['Size', 'Color', ...(trackStock ? ['Stock'] : []), ''].map(h => (
          <span key={h} className="text-white/25 text-[9px] font-bold tracking-widest uppercase px-1">{h}</span>
        ))}
      </div>

      {variants.map((v, i) => (
        <div
          key={i}
          className={`grid gap-2 items-center ${trackStock ? 'grid-cols-[1fr_1fr_80px_28px]' : 'grid-cols-[1fr_1fr_28px]'}`}
        >
          <input
            placeholder="Size (e.g. M)"
            value={v.size}
            onChange={e => update(i, 'size', e.target.value)}
            className={inputClass}
          />
          <input
            placeholder="Color (e.g. black)"
            value={v.color}
            onChange={e => update(i, 'color', e.target.value)}
            className={inputClass}
          />
          {/* Stock column only visible when tracking is on */}
          {trackStock && (
            <input
              type="number"
              min="0"
              placeholder="Stock"
              value={v.stock}
              onChange={e => update(i, 'stock', parseInt(e.target.value) || 0)}
              className={inputClass}
            />
          )}
          <button
            type="button"
            onClick={() => remove(i)}
            className="w-7 h-7 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20
                       text-red-400/70 hover:text-red-400 flex items-center justify-center transition-all cursor-pointer"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={add}
        className="flex items-center gap-1.5 text-purple-400/60 hover:text-purple-400
                   text-[10px] font-bold tracking-widest uppercase transition-colors cursor-pointer mt-1"
      >
        <span className="text-base leading-none">+</span> Add Variant
      </button>
    </div>
  )
}

// ── GalleryEditor ─────────────────────────────────────────────────────────────
// Handles both existing DB images (have an `id`) and newly staged files.

type StagedImage = { file: File; previewUrl: string; key: string }

function GalleryEditor({
  existing,          // already saved images from DB
  staged,            // newly queued files (not yet uploaded)
  onRemoveExisting,  // ask parent to delete from DB
  onAddStaged,       // user picked new files
  onRemoveStaged,    // user cancelled a queued file
}: {
  existing: GalleryImage[]
  staged: StagedImage[]
  onRemoveExisting: (img: GalleryImage) => void
  onAddStaged: (files: File[]) => void
  onRemoveStaged: (key: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handlePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length) onAddStaged(files)
    // reset so same file can be re-added if removed
    e.target.value = ''
  }

  const thumbClass =
    'relative w-20 h-20 rounded-xl overflow-hidden border border-white/10 shrink-0 group'

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {/* Existing saved images */}
        {existing.map(img => (
          <div key={img.id} className={thumbClass}>
            <img src={img.url} className="w-full h-full object-cover" alt="" />
            {/* Overlay delete button */}
            <button
              type="button"
              onClick={() => onRemoveExisting(img)}
              className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100
                         transition-opacity flex items-center justify-center cursor-pointer"
            >
              <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}

        {/* Staged (not yet uploaded) images */}
        {staged.map(s => (
          <div key={s.key} className={thumbClass + ' border-dashed border-purple-500/40'}>
            <img src={s.previewUrl} className="w-full h-full object-cover" alt="" />
            {/* "new" badge */}
            <span className="absolute bottom-1 left-1 text-[8px] font-black px-1 py-0.5 rounded
                             bg-purple-600/80 text-white tracking-wider">
              NEW
            </span>
            <button
              type="button"
              onClick={() => onRemoveStaged(s.key)}
              className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100
                         transition-opacity flex items-center justify-center cursor-pointer"
            >
              <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}

        {/* Add button */}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-20 h-20 rounded-xl border-2 border-dashed border-white/15
                     hover:border-purple-500/50 flex flex-col items-center justify-center
                     gap-1 text-white/20 hover:text-purple-400 transition-all cursor-pointer shrink-0"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          <span className="text-[9px] font-bold tracking-wider">Add</span>
        </button>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handlePick}
        />
      </div>

      {(existing.length > 0 || staged.length > 0) && (
        <p className="text-white/20 text-[10px] mt-2">
          Hover a thumbnail and click × to remove · New images upload on save
        </p>
      )}
    </div>
  )
}

// ── ProductModal ──────────────────────────────────────────────────────────────

function ProductModal({
  initial,
  isEdit,
  onSave,
  onClose,
}: {
  initial: Partial<Product>
  isEdit: boolean
  onSave: (fd: FormData, deletedImageIds: number[]) => Promise<void>
  onClose: () => void
}) {
  const [form, setForm] = useState({
    name:          initial.name          || '',
    description:   initial.description   || '',
    price:         initial.price         || '',
    category:      initial.category      || 'jersey',
    is_active:     initial.is_active     !== false,
    is_featured:   initial.is_featured   || false,
    track_stock:   initial.track_stock   !== false,   // ← NEW (default true)
    display_order: initial.display_order ?? 0,
  })
  const [variants,      setVariants]      = useState<Variant[]>(initial.variants || [])
  const [bannerFile,    setBannerFile]    = useState<File | null>(null)
  const [bannerPreview, setBannerPreview] = useState(initial.banner || '')
  const bannerRef = useRef<HTMLInputElement>(null)

  // Gallery state
  const [existingImages,  setExistingImages]  = useState<GalleryImage[]>(initial.images || [])
  const [stagedImages,    setStagedImages]    = useState<StagedImage[]>([])
  const [deletedImageIds, setDeletedImageIds] = useState<number[]>([])

  const [saving, setSaving] = useState(false)

  const inputClass =
    'bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-xs ' +
    'focus:outline-none focus:border-purple-500/60 w-full placeholder-white/20'
  const selectClass =
    'bg-[#1a0030] border border-white/10 rounded-lg px-3 py-2 text-white text-xs ' +
    'focus:outline-none focus:border-purple-500/60 w-full cursor-pointer'
  const labelClass = 'block text-white/40 text-[10px] font-bold tracking-widest uppercase mb-1'

  const handleBannerFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null
    setBannerFile(f)
    setBannerPreview(f ? URL.createObjectURL(f) : (initial.banner || ''))
  }

  // Gallery callbacks
  const handleRemoveExisting = (img: GalleryImage) => {
    setExistingImages(prev => prev.filter(i => i.id !== img.id))
    setDeletedImageIds(prev => [...prev, img.id])
  }

  const handleAddStaged = (files: File[]) => {
    const next: StagedImage[] = files.map(f => ({
      file:       f,
      previewUrl: URL.createObjectURL(f),
      key:        `${f.name}-${Date.now()}-${Math.random()}`,
    }))
    setStagedImages(prev => [...prev, ...next])
  }

  const handleRemoveStaged = (key: string) => {
    setStagedImages(prev => {
      const found = prev.find(s => s.key === key)
      if (found) URL.revokeObjectURL(found.previewUrl)
      return prev.filter(s => s.key !== key)
    })
  }

  const handleSubmit = async () => {
    if (!form.name || !form.price) return
    setSaving(true)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => fd.append(k, String(v)))
      fd.append('variants', JSON.stringify(variants))
      if (bannerFile) fd.append('banner', bannerFile)

      // Append staged gallery images as gallery_0, gallery_1, …
      stagedImages.forEach((s, i) => fd.append(`gallery_${i}`, s.file))

      await onSave(fd, deletedImageIds)
      onClose()
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  // Toggle helper
  const toggle = (key: keyof typeof form) =>
    setForm(p => ({ ...p, [key]: !(p as any)[key] }))

  const TOGGLES = [
    { key: 'is_active',   on: 'Active',    off: 'Inactive',     sub: 'Visible in shop', color: 'bg-purple-600' },
    { key: 'is_featured', on: 'Featured',  off: 'Not Featured', sub: 'Shown in hero',   color: 'bg-yellow-500' },
    { key: 'track_stock', on: 'Tracking Stock', off: 'Stock Tracking Off', sub: form.track_stock ? 'Stock counts enforced' : 'Always shown as available', color: 'bg-blue-500' },
  ] as const

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="bg-[#0f001a] border border-white/10 rounded-3xl w-full max-w-2xl shadow-2xl shadow-purple-900/30 flex flex-col"
        style={{ maxHeight: 'min(92vh, 800px)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/8">
          <div>
            <h3
              className="text-white font-black text-lg uppercase tracking-wide"
              style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
            >
              {isEdit ? `Edit — ${initial.name}` : 'Add Product'}
            </h3>
            <p className="text-white/25 text-[10px] tracking-widest mt-0.5">
              {isEdit ? 'Update product details' : 'Create a new shop product'}
            </p>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white transition-colors text-xl cursor-pointer">✕</button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-6" style={{ scrollbarWidth: 'none' }}>

          {/* ── Banner ── */}
          <div>
            <label className={labelClass}>Primary / Banner Image</label>
            <div className="flex items-start gap-4">
              <div
                className="w-36 h-36 rounded-2xl border-2 border-dashed border-white/10 flex items-center
                           justify-center overflow-hidden shrink-0 cursor-pointer hover:border-purple-500/40
                           transition-colors bg-white/3"
                onClick={() => bannerRef.current?.click()}
              >
                {bannerPreview ? (
                  <img src={bannerPreview} className="w-full h-full object-cover" alt="preview" />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-white/20 p-4">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M13.5 12h.008v.008H13.5V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                    </svg>
                    <span className="text-[9px] text-center">Click to upload</span>
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-2">
                <input ref={bannerRef} type="file" accept="image/*" onChange={handleBannerFile} className="hidden" />
                <button
                  type="button"
                  onClick={() => bannerRef.current?.click()}
                  className="bg-white/5 border border-white/10 hover:border-purple-500/40 text-white/60
                             hover:text-white text-[10px] font-bold px-3 py-2 rounded-lg tracking-wider
                             uppercase transition-all cursor-pointer"
                >
                  {bannerFile ? 'Change Image' : 'Choose Image'}
                </button>
                {bannerFile && (
                  <p className="text-white/30 text-[10px] truncate">{bannerFile.name}</p>
                )}
              </div>
            </div>
          </div>

          {/* ── Gallery images ── */}
          <div>
            <label className={labelClass}>
              Gallery Images
              <span className="normal-case text-white/20 ml-1">
                ({existingImages.length + stagedImages.length} image{existingImages.length + stagedImages.length !== 1 ? 's' : ''})
              </span>
            </label>
            <GalleryEditor
              existing={existingImages}
              staged={stagedImages}
              onRemoveExisting={handleRemoveExisting}
              onAddStaged={handleAddStaged}
              onRemoveStaged={handleRemoveStaged}
            />
          </div>

          {/* ── Basic info ── */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className={labelClass}>Product Name *</label>
              <input
                placeholder="e.g. NBL Esport Official Jersey 2026"
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Price (DZD) *</label>
              <input
                type="number" min="0" step="0.01" placeholder="e.g. 4500"
                value={form.price}
                onChange={e => setForm(p => ({ ...p, price: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Category</label>
              <select
                value={form.category}
                onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                className={selectClass}
              >
                {Object.entries(CATEGORY_LABELS).map(([v, l]) => (
                  <option key={v} value={v} className="bg-[#1a0030]">{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Display Order</label>
              <input
                type="number" min="0"
                value={form.display_order}
                onChange={e => setForm(p => ({ ...p, display_order: parseInt(e.target.value) || 0 }))}
                className={inputClass}
              />
            </div>
            <div className="col-span-2">
              <label className={labelClass}>Description</label>
              <textarea
                placeholder="Describe the product — material, fit, design details…"
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                className={inputClass + ' h-24 resize-none'}
              />
            </div>
          </div>

          {/* ── Variants ── */}
          <div>
            <label className={labelClass}>
              Variants
              <span className="normal-case text-white/20 ml-1">(size / color{form.track_stock ? ' / stock' : ''})</span>
            </label>
            <VariantEditor
              variants={variants}
              onChange={setVariants}
              trackStock={form.track_stock}
            />
          </div>

          {/* ── Toggles ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {TOGGLES.map(({ key, on, off, sub, color }) => (
              <div key={key} className="flex items-center gap-3 bg-white/3 border border-white/8 rounded-xl p-3">
                <button
                  type="button"
                  onClick={() => toggle(key)}
                  className={`w-9 h-5 rounded-full transition-colors duration-200 relative shrink-0
                              ${(form as any)[key] ? color : 'bg-white/10'}`}
                >
                  <span
                    className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200"
                    style={{ left: (form as any)[key] ? '16px' : '2px' }}
                  />
                </button>
                <div>
                  <p className="text-white/50 text-[10px] font-bold tracking-widest uppercase">
                    {(form as any)[key] ? on : off}
                  </p>
                  <p className="text-white/20 text-[10px]">{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-white/8">
          <button
            onClick={handleSubmit}
            disabled={saving || !form.name || !form.price}
            className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed
                       text-white font-black px-6 py-2.5 rounded-xl text-xs tracking-widest uppercase
                       transition-all cursor-pointer"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Product'}
          </button>
          <ActionButton variant="ghost" onClick={onClose}>Cancel</ActionButton>
        </div>
      </div>
    </div>
  )
}

// ── OrderModal ────────────────────────────────────────────────────────────────
// (unchanged from original — included for completeness)

function OrderModal({
  order,
  onSave,
  onClose,
}: {
  order: Order
  onSave: (id: number, data: { status: string; notes: string }) => Promise<void>
  onClose: () => void
}) {
  const [status, setStatus] = useState(order.status)
  const [notes,  setNotes]  = useState(order.notes || '')
  const [saving, setSaving] = useState(false)

  const selectClass =
    'bg-[#1a0030] border border-white/10 rounded-lg px-3 py-2 text-white text-xs ' +
    'focus:outline-none focus:border-purple-500/60 w-full cursor-pointer'

  const STATUS_STEPS = ['pending', 'confirmed', 'shipped', 'delivered']
  const currentStep  = STATUS_STEPS.indexOf(status)

  const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    pending:   { label: 'Pending',   color: '#fbbf24', bg: 'rgba(251,191,36,0.15)'  },
    confirmed: { label: 'Confirmed', color: '#a855f7', bg: 'rgba(168,85,247,0.15)'  },
    shipped:   { label: 'Shipped',   color: '#60a5fa', bg: 'rgba(96,165,250,0.15)'  },
    delivered: { label: 'Delivered', color: '#34d399', bg: 'rgba(52,211,153,0.15)'  },
    cancelled: { label: 'Cancelled', color: '#f87171', bg: 'rgba(248,113,113,0.15)' },
  }

  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(order.id, { status, notes })
      onClose()
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  const formattedDate = (() => {
    try {
      return new Date(order.submitted_at).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    } catch {
      return order.submitted_at
    }
  })()

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="bg-[#0f001a] border border-white/10 rounded-3xl w-full max-w-lg shadow-2xl shadow-purple-900/30 flex flex-col"
        style={{ maxHeight: 'min(90vh, 680px)' }}
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/8">
          <div>
            <h3
              className="text-white font-black text-lg uppercase tracking-wide"
              style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
            >
              Order #{order.id}
            </h3>
            <p className="text-white/25 text-[10px] tracking-widest mt-0.5">{formattedDate}</p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className="text-xs font-bold tracking-widest uppercase px-3 py-1.5 rounded-full"
              style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}40` }}
            >
              {cfg.label}
            </span>
            <button onClick={onClose} className="text-white/30 hover:text-white transition-colors text-xl cursor-pointer">✕</button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-5" style={{ scrollbarWidth: 'none' }}>
          {/* Progress tracker */}
          {status !== 'cancelled' && (
            <div className="relative">
              <div className="flex items-center justify-between relative">
                <div className="absolute left-0 right-0 top-3.5 h-0.5 bg-white/10 z-0" />
                <div
                  className="absolute left-0 top-3.5 h-0.5 z-0 transition-all duration-500"
                  style={{
                    width:      `${currentStep <= 0 ? 0 : (currentStep / (STATUS_STEPS.length - 1)) * 100}%`,
                    background: cfg.color,
                  }}
                />
                {STATUS_STEPS.map((s, i) => {
                  const done = i <= currentStep
                  const sCfg = STATUS_CONFIG[s]
                  return (
                    <div key={s} className="flex flex-col items-center gap-1.5 z-10">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all duration-300"
                        style={{
                          background:   done ? sCfg.bg : 'rgba(255,255,255,0.05)',
                          borderColor:  done ? sCfg.color : 'rgba(255,255,255,0.15)',
                        }}
                      >
                        {done ? (
                          <svg className="w-3.5 h-3.5" style={{ color: sCfg.color }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-white/20" />
                        )}
                      </div>
                      <span
                        className="text-[9px] font-bold tracking-widest uppercase"
                        style={{ color: done ? sCfg.color : 'rgba(255,255,255,0.2)' }}
                      >
                        {sCfg.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Product info */}
          <div className="flex items-center gap-4 bg-white/4 border border-white/8 rounded-2xl p-4">
            {order.product_banner ? (
              <img src={order.product_banner} className="w-16 h-16 rounded-xl object-cover shrink-0 border border-white/10" alt="" />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-purple-900/30 border border-purple-500/20 flex items-center justify-center shrink-0">
                <span className="text-purple-400 text-xl">🛒</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-sm truncate">{order.product_name}</p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {order.variant_size && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/20">
                    {order.variant_size}
                  </span>
                )}
                {order.variant_color && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/8 text-white/50 border border-white/10">
                    {order.variant_color}
                  </span>
                )}
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/8 text-white/50 border border-white/10">
                  Qty: {order.quantity}
                </span>
              </div>
            </div>
          </div>

          {/* Customer details */}
          <div className="space-y-2">
            <p className="text-white/30 text-[10px] font-bold tracking-widest uppercase mb-2">Customer</p>
            {[
              { label: 'Name',    value: order.full_name },
              { label: 'Email',   value: order.email },
              { label: 'Phone',   value: order.phone },
              { label: 'Wilaya',  value: order.wilaya_label || order.wilaya },
              { label: 'Address', value: order.address },
            ].filter(r => r.value).map(row => (
              <div key={row.label} className="flex justify-between items-start py-2 border-b border-white/5 gap-3">
                <span className="text-white/35 text-xs font-bold tracking-widest uppercase shrink-0">{row.label}</span>
                <span className="text-white text-xs text-right">{row.value}</span>
              </div>
            ))}
          </div>

          {/* Status update */}
          <div>
            <label className="block text-white/40 text-[10px] font-bold tracking-widest uppercase mb-1">Update Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)} className={selectClass}>
              {Object.entries(STATUS_CONFIG).map(([v, c]) => (
                <option key={v} value={v} className="bg-[#1a0030]">{c.label}</option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-white/40 text-[10px] font-bold tracking-widest uppercase mb-1">Staff Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Internal notes about this order…"
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-xs placeholder-white/20
                         focus:outline-none focus:border-purple-500/60 resize-none h-20 w-full"
            />
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-white/8">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-black px-6
                       py-2.5 rounded-xl text-xs tracking-widest uppercase transition-all cursor-pointer"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
          <ActionButton variant="ghost" onClick={onClose}>Close</ActionButton>
        </div>
      </div>
    </div>
  )
}

// ── ProductCard ───────────────────────────────────────────────────────────────

function ProductCard({
  product,
  onEdit,
  onDelete,
}: {
  product: Product
  onEdit: () => void
  onDelete: () => void
}) {
  const trackStock = product.track_stock
  const totalStock = product.total_stock   // null when not tracking

  // Stock badge logic
  const stockLabel = !trackStock
    ? 'Always Available'
    : totalStock === 0
    ? 'Out of Stock'
    : `${totalStock} in stock`

  const stockColor = !trackStock
    ? '#60a5fa'                                           // blue = no tracking
    : totalStock === 0 ? '#f87171'                        // red
    : (totalStock ?? 0) < 5 ? '#fbbf24'                  // yellow
    : '#34d399'                                           // green

  return (
    <div
      className={`relative border border-white/8 rounded-2xl overflow-hidden flex flex-col
                  transition-all duration-200 hover:border-purple-500/30 ${!product.is_active ? 'opacity-50' : ''}`}
      style={{ background: '#0c001a' }}
    >
      {/* Banner */}
      <div className="relative h-44 shrink-0 overflow-hidden">
        {product.banner ? (
          <img src={product.banner} className="w-full h-full object-cover" alt={product.name} />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: 'rgba(168,85,247,0.1)' }}>
            <span className="text-white/10 font-black text-5xl" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              {product.name.charAt(0)}
            </span>
          </div>
        )}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, #0c001a 0%, transparent 60%)' }} />

        {/* Top-left badges */}
        <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap max-w-[60%]">
          {product.is_featured && (
            <span
              className="text-[9px] font-black tracking-widest uppercase px-2 py-1 rounded-full"
              style={{ background: 'rgba(251,191,36,0.2)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)' }}
            >
              ★ Featured
            </span>
          )}
          {!product.is_active && (
            <span className="text-[9px] font-black tracking-widest uppercase px-2 py-1 rounded-full bg-black/60 text-white/40 border border-white/10">
              Inactive
            </span>
          )}
          {/* Stock tracking indicator */}
          {!trackStock && (
            <span
              className="text-[9px] font-black tracking-widest uppercase px-2 py-1 rounded-full"
              style={{ background: 'rgba(96,165,250,0.15)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.25)' }}
            >
              ∞ No Tracking
            </span>
          )}
        </div>

        {/* Stock badge top-right */}
        <div className="absolute top-3 right-3">
          <span
            className="text-[9px] font-black tracking-widest uppercase px-2 py-1 rounded-full"
            style={{ background: `${stockColor}18`, color: stockColor, border: `1px solid ${stockColor}30` }}
          >
            {stockLabel}
          </span>
        </div>

        {/* Gallery image count badge */}
        {(product.images?.length ?? 0) > 0 && (
          <div className="absolute bottom-3 right-3">
            <span className="text-[9px] font-bold px-2 py-1 rounded-full bg-black/50 text-white/50 border border-white/10 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {product.images.length}
            </span>
          </div>
        )}
      </div>

      <div className="p-4 flex flex-col flex-1 gap-3">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3
              className="text-white font-black text-sm uppercase leading-tight line-clamp-2"
              style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
            >
              {product.name}
            </h3>
            <span
              className="text-white font-black text-base shrink-0"
              style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#a855f7' }}
            >
              {parseInt(product.price).toLocaleString()} <span className="text-xs text-white/40">DZD</span>
            </span>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/8 text-white/40 border border-white/10 mt-1 inline-block">
            {CATEGORY_LABELS[product.category] || product.category}
          </span>
        </div>

        {/* Variant pills */}
        {product.variants.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {product.variants.slice(0, 4).map((v, i) => (
              <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-white/30 border border-white/8">
                {[v.size, v.color].filter(Boolean).join(' / ')}
                {trackStock && ` (${v.stock})`}
              </span>
            ))}
            {product.variants.length > 4 && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-white/25">
                +{product.variants.length - 4}
              </span>
            )}
          </div>
        )}

        <div className="flex gap-2 mt-auto pt-2 border-t border-white/5">
          <button
            onClick={onEdit}
            className="flex-1 bg-white/5 hover:bg-purple-500/15 border border-white/10 hover:border-purple-500/30
                       text-white/60 hover:text-white text-[10px] font-black py-2 rounded-lg tracking-widest
                       uppercase transition-all cursor-pointer"
          >
            Edit
          </button>
          <button
            onClick={onDelete}
            className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400/70
                       hover:text-red-400 text-[10px] font-black px-3 py-2 rounded-lg tracking-widest
                       uppercase transition-all cursor-pointer"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

// ── ShopSection ───────────────────────────────────────────────────────────────

export default function ShopSection() {
  const [tab, setTab] = useState<'products' | 'orders'>('products')

  // Products state
  const [products,       setProducts]       = useState<Product[]>([])
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)

  // Orders state
  const [orders,          setOrders]          = useState<Order[]>([])
  const [reviewingOrder,  setReviewingOrder]  = useState<Order | null>(null)
  const [orderFilter,     setOrderFilter]     = useState('')
  const [orderSearch,     setOrderSearch]     = useState('')
  const [orderPage,       setOrderPage]       = useState(1)

  // ── Loaders ────────────────────────────────────────────────────────────────

  const loadProducts = useCallback(() => {
    fetch('/api/shop/all/', { credentials: 'include' })
      .then(r => r.json())
      .then(r => setProducts(r.products || []))
      .catch(() => {})
  }, [])

  const loadOrders = useCallback(() => {
    const qs = orderFilter ? `?status=${orderFilter}` : ''
    fetch(`/api/shop/orders/${qs}`, { credentials: 'include' })
      .then(r => r.json())
      .then(r => setOrders(r.orders || []))
      .catch(() => {})
  }, [orderFilter])

  useEffect(() => { loadProducts() }, [loadProducts])
  useEffect(() => { if (tab === 'orders') loadOrders() }, [tab, loadOrders])

  // ── Product CRUD ───────────────────────────────────────────────────────────

  const handleAddProduct = async (fd: FormData, _deletedIds: number[]) => {
    await fetch('/api/shop/create/', {
      method:      'POST',
      credentials: 'include',
      headers:     { 'X-CSRFToken': getCsrf() },
      body:        fd,
    })
    loadProducts()
  }

  const handleEditProduct = async (fd: FormData, deletedImageIds: number[]) => {
    if (!editingProduct) return

    // 1. Delete removed gallery images
    await Promise.all(
      deletedImageIds.map(imgId =>
        fetch(`/api/shop/${editingProduct.id}/images/${imgId}/delete/`, {
          method:      'DELETE',
          credentials: 'include',
          headers:     { 'X-CSRFToken': getCsrf() },
        })
      )
    )

    // 2. Update product (includes any new gallery_N files)
    await fetch(`/api/shop/${editingProduct.id}/update/`, {
      method:      'PATCH',
      credentials: 'include',
      headers:     { 'X-CSRFToken': getCsrf() },
      body:        fd,
    })

    loadProducts()
  }

  const handleDeleteProduct = async (id: number, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
    await fetch(`/api/shop/${id}/delete/`, {
      method:      'DELETE',
      credentials: 'include',
      headers:     { 'X-CSRFToken': getCsrf() },
    })
    loadProducts()
  }

  // ── Order CRUD ─────────────────────────────────────────────────────────────

  const handleSaveOrder = async (id: number, data: { status: string; notes: string }) => {
    await fetch(`/api/shop/orders/${id}/`, {
      method:      'PATCH',
      credentials: 'include',
      headers:     { 'X-CSRFToken': getCsrf(), 'Content-Type': 'application/json' },
      body:        JSON.stringify(data),
    })
    loadOrders()
  }

  const handleDeleteOrder = async (id: number) => {
    if (!confirm('Delete this order permanently?')) return
    await fetch(`/api/shop/orders/${id}/delete/`, {
      method:      'DELETE',
      credentials: 'include',
      headers:     { 'X-CSRFToken': getCsrf() },
    })
    loadOrders()
  }

  // ── Filtered orders ────────────────────────────────────────────────────────

  const filteredOrders = orders.filter(o => {
    if (!orderSearch) return true
    const q = orderSearch.toLowerCase()
    return (
      o.full_name.toLowerCase().includes(q) ||
      o.email.toLowerCase().includes(q) ||
      o.phone.includes(q) ||
      o.product_name.toLowerCase().includes(q)
    )
  })

  const orderTotalPages  = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE))
  const displayedOrders  = filteredOrders.slice((orderPage - 1) * PAGE_SIZE, orderPage * PAGE_SIZE)

  const orderStats = {
    total:     orders.length,
    pending:   orders.filter(o => o.status === 'pending').length,
    confirmed: orders.filter(o => o.status === 'confirmed').length,
    shipped:   orders.filter(o => o.status === 'shipped').length,
    delivered: orders.filter(o => o.status === 'delivered').length,
  }

  const STATUS_DOT: Record<string, string> = {
    pending: '#fbbf24', confirmed: '#a855f7', shipped: '#60a5fa',
    delivered: '#34d399', cancelled: '#f87171',
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Tab header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-1">
          {([['products', '🛍 Products'], ['orders', '📦 Orders']] as const).map(([t, l]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-lg text-xs font-black tracking-widest uppercase transition-all duration-150 cursor-pointer
                ${tab === t ? 'bg-purple-600/30 text-purple-300 border border-purple-500/30' : 'text-white/35 hover:text-white/60'}`}
            >
              {l}
              {t === 'orders' && orderStats.pending > 0 && (
                <span className="ml-2 inline-flex items-center justify-center w-4 h-4 rounded-full bg-yellow-500/20 text-yellow-400 text-[9px] font-black border border-yellow-500/30">
                  {orderStats.pending}
                </span>
              )}
            </button>
          ))}
        </div>

        {tab === 'products' && (
          <ActionButton onClick={() => setShowAddProduct(true)}>+ Add Product</ActionButton>
        )}
      </div>

      {/* ══ PRODUCTS TAB ══════════════════════════════════════════════════════ */}
      {tab === 'products' && (
        <>
          {products.length === 0 ? (
            <div className="border border-dashed border-white/10 rounded-2xl p-16 text-center">
              <div className="text-white/10 text-6xl mb-4">🛍</div>
              <p className="text-white/25 text-sm tracking-widest uppercase mb-6">No products yet</p>
              <button
                onClick={() => setShowAddProduct(true)}
                className="bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300
                           font-black px-6 py-3 rounded-xl text-xs tracking-widest uppercase transition-all cursor-pointer"
              >
                Add Your First Product →
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {products.map(p => (
                <ProductCard
                  key={p.id}
                  product={p}
                  onEdit={() => setEditingProduct(p)}
                  onDelete={() => handleDeleteProduct(p.id, p.name)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ══ ORDERS TAB ════════════════════════════════════════════════════════ */}
      {tab === 'orders' && (
        <>
          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
            {[
              { label: 'Total',     val: orderStats.total,     color: '#a855f7' },
              { label: 'Pending',   val: orderStats.pending,   color: '#fbbf24' },
              { label: 'Confirmed', val: orderStats.confirmed, color: '#a855f7' },
              { label: 'Shipped',   val: orderStats.shipped,   color: '#60a5fa' },
              { label: 'Delivered', val: orderStats.delivered, color: '#34d399' },
            ].map(s => (
              <div key={s.label} className="bg-white/4 border border-white/8 rounded-2xl p-4 text-center">
                <p className="text-white/30 text-[10px] font-bold tracking-widest uppercase mb-1">{s.label}</p>
                <p className="font-black text-2xl" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: s.color }}>
                  {s.val}
                </p>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <SearchBar
              value={orderSearch}
              onChange={v => { setOrderSearch(v); setOrderPage(1) }}
              placeholder="Search orders…"
            />
            <FilterSelect value={orderFilter} onChange={v => { setOrderFilter(v); setOrderPage(1) }}>
              <FilterOption value="">All Statuses</FilterOption>
              <FilterOption value="pending">Pending</FilterOption>
              <FilterOption value="confirmed">Confirmed</FilterOption>
              <FilterOption value="shipped">Shipped</FilterOption>
              <FilterOption value="delivered">Delivered</FilterOption>
              <FilterOption value="cancelled">Cancelled</FilterOption>
            </FilterSelect>
          </div>

          {/* Order list */}
          <div className="space-y-2">
            {displayedOrders.length === 0 && (
              <div className="bg-white/4 border border-white/8 rounded-2xl p-10 text-center">
                <p className="text-white/25 text-sm">No orders found.</p>
              </div>
            )}
            {displayedOrders.map(o => {
              const dotColor     = STATUS_DOT[o.status] || '#fff'
              const formattedDate = (() => {
                try {
                  return new Date(o.submitted_at).toLocaleDateString('en-GB', {
                    day: 'numeric', month: 'short', year: 'numeric',
                  })
                } catch {
                  return o.submitted_at
                }
              })()

              return (
                <div
                  key={o.id}
                  className="bg-white/4 border border-white/8 rounded-2xl px-5 py-4 flex items-center gap-4
                             hover:border-purple-500/20 transition-colors"
                >
                  <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-white/10 bg-purple-900/20 flex items-center justify-center">
                    {o.product_banner
                      ? <img src={o.product_banner} className="w-full h-full object-cover" alt="" />
                      : <span className="text-purple-400 text-lg">🛒</span>
                    }
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="text-white font-bold text-sm">{o.full_name}</span>
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"
                        style={{ background: `${dotColor}15`, color: dotColor, border: `1px solid ${dotColor}30` }}
                      >
                        <span className="w-1 h-1 rounded-full" style={{ background: dotColor }} />
                        {o.status}
                      </span>
                    </div>
                    <p className="text-white/40 text-xs truncate">
                      {o.product_name}
                      {o.variant_size  && ` · ${o.variant_size}`}
                      {o.variant_color && ` / ${o.variant_color}`}
                      {` · Qty: ${o.quantity}`}
                      {o.wilaya_label  && ` · ${o.wilaya_label}`}
                    </p>
                    <p className="text-white/20 text-[10px] mt-0.5">{formattedDate} · {o.email}</p>
                  </div>

                  <div className="flex gap-2 shrink-0">
                    <ActionButton onClick={() => setReviewingOrder(o)}>Manage</ActionButton>
                    <ActionButton variant="danger" onClick={() => handleDeleteOrder(o.id)}>Delete</ActionButton>
                  </div>
                </div>
              )
            })}
          </div>

          <Pagination page={orderPage} totalPages={orderTotalPages} onPage={setOrderPage} />
        </>
      )}

      {/* ── Modals ── */}
      {showAddProduct && (
        <ProductModal
          initial={{}}
          isEdit={false}
          onSave={handleAddProduct}
          onClose={() => setShowAddProduct(false)}
        />
      )}
      {editingProduct && (
        <ProductModal
          initial={editingProduct}
          isEdit={true}
          onSave={handleEditProduct}
          onClose={() => setEditingProduct(null)}
        />
      )}
      {reviewingOrder && (
        <OrderModal
          order={reviewingOrder}
          onSave={handleSaveOrder}
          onClose={() => setReviewingOrder(null)}
        />
      )}
    </div>
  )
}