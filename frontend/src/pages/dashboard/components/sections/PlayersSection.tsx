import { useState, useEffect, useRef, useCallback } from 'react'
import { players, games, teams } from '../../../../utils/api'
import { Badge, SectionHeader, ActionButton, FilterSelect, FilterOption, getCsrfToken, SearchBar, Pagination } from '../DashboardShared'

// ── Constants ─────────────────────────────────────────────────────────────────
const PAGE_SIZE = 10

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

// ── ImageCropModal ────────────────────────────────────────────────────────────
// Discord-style crop: circular preview, drag to reposition, scroll to zoom
function ImageCropModal({
  src,
  onConfirm,
  onCancel,
}: {
  src: string
  onConfirm: (blob: Blob) => void
  onCancel: () => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const previewRef = useRef<HTMLCanvasElement>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [imgLoaded, setImgLoaded] = useState(false)
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 })

  const CANVAS_WIDTH = 280
  const CANVAS_HEIGHT = 220  // ~1.27:1 aspect ratio to match player card avatar section

  // Load image
  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      imgRef.current = img
      setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight })
      // Fit to canvas initially
      const fitZoom = Math.max(
        CANVAS_WIDTH / img.naturalWidth,
        CANVAS_HEIGHT / img.naturalHeight
      )
      setZoom(fitZoom)
      setOffset({ x: 0, y: 0 })
      setImgLoaded(true)
    }
    img.src = src
  }, [src])

  // Draw preview whenever zoom/offset/imgLoaded changes
  useEffect(() => {
    if (!imgLoaded || !imgRef.current || !previewRef.current) return
    const ctx = previewRef.current.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    const img = imgRef.current
    const scaledW = img.naturalWidth * zoom
    const scaledH = img.naturalHeight * zoom

    const drawX = (CANVAS_WIDTH - scaledW) / 2 + offset.x
    const drawY = (CANVAS_HEIGHT - scaledH) / 2 + offset.y

    ctx.drawImage(img, drawX, drawY, scaledW, scaledH)
  }, [zoom, offset, imgLoaded])

  // Clamp offset so image always covers the rectangle
  const clampOffset = useCallback((ox: number, oy: number, z: number) => {
    if (!imgRef.current) return { x: ox, y: oy }
    const scaledW = imgRef.current.naturalWidth * z
    const scaledH = imgRef.current.naturalHeight * z
    const maxX = Math.max(0, (scaledW - CANVAS_WIDTH) / 2)
    const maxY = Math.max(0, (scaledH - CANVAS_HEIGHT) / 2)
    return {
      x: Math.max(-maxX, Math.min(maxX, ox)),
      y: Math.max(-maxY, Math.min(maxY, oy)),
    }
  }, [])

  const handleMouseDown = (e: React.MouseEvent) => {
    setDragging(true)
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return
    const raw = { x: e.clientX - dragStart.x, y: e.clientY - dragStart.y }
    setOffset(clampOffset(raw.x, raw.y, zoom))
  }

  const handleMouseUp = () => setDragging(false)

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const delta = -e.deltaY * 0.001
    const newZoom = Math.max(0.5, Math.min(4, zoom + delta * zoom))
    const clamped = clampOffset(offset.x, offset.y, newZoom)
    setZoom(newZoom)
    setOffset(clamped)
  }

  const handleZoomSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newZoom = parseFloat(e.target.value)
    const clamped = clampOffset(offset.x, offset.y, newZoom)
    setZoom(newZoom)
    setOffset(clamped)
  }

  const handleConfirm = () => {
    if (!imgRef.current || !canvasRef.current) return
    const canvas = canvasRef.current
    const OUTPUT_W = 400
    const OUTPUT_H = 320  // 1.25:1 aspect ratio
    canvas.width = OUTPUT_W
    canvas.height = OUTPUT_H
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Draw the same composition but scaled to OUTPUT
    const scaleX = OUTPUT_W / CANVAS_WIDTH
    const scaleY = OUTPUT_H / CANVAS_HEIGHT
    const img = imgRef.current
    const scaledW = img.naturalWidth * zoom * scaleX
    const scaledH = img.naturalHeight * zoom * scaleY
    const drawX = (OUTPUT_W - scaledW) / 2 + offset.x * scaleX
    const drawY = (OUTPUT_H - scaledH) / 2 + offset.y * scaleY

    // No clipping — rectangular
    ctx.drawImage(img, drawX, drawY, scaledW, scaledH)

    canvas.toBlob(
      blob => { if (blob) onConfirm(blob) },
      'image/jpeg',
      0.92
    )
  }

  // Touch support
  const touchStartRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null)
  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0]
    touchStartRef.current = { x: t.clientX, y: t.clientY, ox: offset.x, oy: offset.y }
  }
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return
    const t = e.touches[0]
    const raw = {
      x: touchStartRef.current.ox + (t.clientX - touchStartRef.current.x),
      y: touchStartRef.current.oy + (t.clientY - touchStartRef.current.y),
    }
    setOffset(clampOffset(raw.x, raw.y, zoom))
  }

  const fitZoom = naturalSize.w && naturalSize.h
    ? Math.max(CANVAS_WIDTH / naturalSize.w, CANVAS_HEIGHT / naturalSize.h)
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
            Adjust Profile Photo
          </h3>
          <p className="text-white/30 text-[10px] tracking-widest mt-0.5">
            Drag to reposition · Scroll or pinch to zoom
          </p>
        </div>

        <div className="p-6 flex flex-col items-center gap-5">
          {/* Rectangular crop area — matching player card avatar dimensions */}
          <div
            className="relative select-none rounded-xl overflow-hidden border border-white/20"
            style={{
              width: CANVAS_WIDTH,
              height: CANVAS_HEIGHT,
              background: '#0a0015',
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={() => { touchStartRef.current = null }}
          >
            {/* Background checkerboard */}
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `
                  linear-gradient(45deg, #1a0030 25%, transparent 25%),
                  linear-gradient(-45deg, #1a0030 25%, transparent 25%),
                  linear-gradient(45deg, transparent 75%, #1a0030 75%),
                  linear-gradient(-45deg, transparent 75%, #1a0030 75%)
                `,
                backgroundSize: '16px 16px',
                backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
                backgroundColor: '#0d0020',
              }}
            />

            {/* Preview canvas — rectangular, no clipping */}
            <canvas
              ref={previewRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              className="absolute inset-0"
              style={{
                cursor: dragging ? 'grabbing' : 'grab',
                display: imgLoaded ? 'block' : 'none',
              }}
            />

            {/* Loading state */}
            {!imgLoaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {/* Border overlay */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                boxShadow: 'inset 0 0 0 1px rgba(168,85,247,0.4), 0 0 0 9999px rgba(0,0,0,0.3)',
              }}
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
              onChange={handleZoomSlider}
              className="flex-1 accent-purple-500"
              style={{ cursor: 'pointer' }}
            />
            <svg className="w-5 h-5 text-white/30 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
          </div>

          <p className="text-white/20 text-[10px] tracking-wide text-center">
            This is how your photo will appear on the roster page
          </p>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-white/8">
          <button
            onClick={handleConfirm}
            disabled={!imgLoaded}
            className="flex-1 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-black py-2.5 rounded-xl text-xs tracking-widest uppercase transition-all duration-200"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            Apply Photo
          </button>
          <button
            onClick={onCancel}
            className="px-5 bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white font-bold py-2.5 rounded-xl text-xs tracking-widest uppercase transition-all duration-200"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Hidden output canvas */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
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
        className="bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white text-xs font-bold px-3 py-2 rounded-lg tracking-wider uppercase transition-all duration-200 flex items-center gap-1.5 cursor-pointer"
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
              className={`flex items-center gap-2.5 w-full text-left px-4 py-2.5 text-xs font-bold tracking-wider uppercase transition-colors hover:bg-purple-500/15 cursor-pointer ${
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
  onSave: (data: any, avatarFile: File | null, clearAvatar: boolean) => Promise<void>
  onClose: () => void
}) {
  const [tab, setTab] = useState<'profile' | 'personal'>('profile')
  const [form, setForm] = useState(initial)

  // Avatar state
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState(initial.avatar || '')
  const [clearAvatar, setClearAvatar] = useState(false)
  const [cropSrc, setCropSrc] = useState<string | null>(null)

  const [saving, setSaving] = useState(false)
  const avatarRef = useRef<HTMLInputElement>(null)

  const handleGameChange = (slug: string) => {
    setForm(p => ({ ...p, game: slug, game_id: null, rank: '' }))
  }

  const selectedGame = gamesList.find(g => g.slug === form.game)
  const ranks: string[] = selectedGame?.ranks || []

  // When user picks a file, open the crop modal
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setCropSrc(url)
    // Reset input so same file can be re-selected
    e.target.value = ''
  }

  const handleCropConfirm = (blob: Blob) => {
    const croppedFile = new File([blob], 'avatar.jpg', { type: 'image/jpeg' })
    setAvatarFile(croppedFile)
    setAvatarPreview(URL.createObjectURL(blob))
    setClearAvatar(false)
    setCropSrc(null)
  }

  const handleRemoveAvatar = () => {
    setAvatarFile(null)
    setAvatarPreview('')
    setClearAvatar(true)
    if (avatarRef.current) avatarRef.current.value = ''
  }

  const handleSubmit = async () => {
    if (!form.username) return
    setSaving(true)
    try {
      await onSave(form, avatarFile, clearAvatar)
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

  const hasAvatar = avatarPreview && !clearAvatar

  return (
    <>
      {/* Crop modal — rendered above player modal */}
      {cropSrc && (
        <ImageCropModal
          src={cropSrc}
          onConfirm={handleCropConfirm}
          onCancel={() => setCropSrc(null)}
        />
      )}

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
              {/* Avatar with edit/remove overlay */}
              <div className="relative shrink-0 group/av">
                <div
                  className="w-12 h-12 rounded-xl border-2 border-dashed border-white/15 flex items-center justify-center overflow-hidden cursor-pointer hover:border-purple-500/50 transition-colors"
                  onClick={() => avatarRef.current?.click()}
                  title="Click to change avatar"
                >
                  {hasAvatar ? (
                    <img src={avatarPreview} className="w-full h-full object-cover" alt="avatar" />
                  ) : (
                    <span className="text-white/20 text-lg font-black">
                      {form.username ? form.username[0].toUpperCase() : '?'}
                    </span>
                  )}
                </div>

                {/* Remove button — shows on hover if there's an avatar */}
                {hasAvatar && (
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); handleRemoveAvatar() }}
                    title="Remove photo"
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 hover:bg-red-400 border-2 border-[#13001f] flex items-center justify-center transition-all duration-150 opacity-0 group-hover/av:opacity-100 z-10"
                  >
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              <input ref={avatarRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />

              <div>
                <h3
                  className="text-white font-black text-base uppercase tracking-wide"
                  style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
                >
                  {isEdit ? `Edit — ${initial.username}` : 'Add Player'}
                </h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-white/25 text-[10px] tracking-widest">
                    {isEdit ? 'Update player information' : 'Fill in player details'}
                  </p>
                  {/* Avatar action hint */}
                  <span className="text-purple-400/40 text-[10px]">·</span>
                  <button
                    type="button"
                    onClick={() => avatarRef.current?.click()}
                    className="text-purple-400/60 hover:text-purple-400 text-[10px] tracking-widest transition-colors cursor-pointer"
                  >
                    {hasAvatar ? 'Change photo' : 'Add photo'}
                  </button>
                  {hasAvatar && (
                    <>
                      <span className="text-white/20 text-[10px]">·</span>
                      <button
                        type="button"
                        onClick={handleRemoveAvatar}
                        className="text-red-400/60 hover:text-red-400 text-[10px] tracking-widest transition-colors cursor-pointer"
                      >
                        Remove
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
            <button onClick={onClose} className="text-white/30 hover:text-white transition-colors text-xl cursor-pointer">✕</button>
          </div>

          <div className="flex gap-1 px-6 pt-3 pb-1">
            {(['profile', 'personal'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black tracking-widest uppercase transition-all duration-150 cursor-pointer ${
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
                  {(() => {
                    const filteredTeams = form.game
                      ? teamsList.filter((t: any) => t.game === form.game)
                      : teamsList
                    const currentTeamValid = filteredTeams.some((t: any) => t.id === form.team_id)
                    return (
                      <select
                        value={currentTeamValid ? (form.team_id ?? '') : ''}
                        onChange={e => setForm(p => ({ ...p, team_id: e.target.value ? Number(e.target.value) : null }))}
                        className={selectClass + (!form.game ? ' opacity-50' : '')}
                      >
                        <option value="" className="bg-[#1a0030] text-white">
                          {form.game ? 'No team' : 'Select a game first'}
                        </option>
                        {filteredTeams.map((t: any) => (
                          <option key={t.id} value={t.id} className="bg-[#1a0030] text-white">{t.name}</option>
                        ))}
                      </select>
                    )
                  })()}
                  {form.game && teamsList.filter((t: any) => t.game === form.game).length === 0 && (
                    <p className="text-white/20 text-[10px] mt-1">
                      No {gamesList.find(g => g.slug === form.game)?.title ?? form.game} rosters exist yet.
                    </p>
                  )}
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

                {/* Avatar status indicator */}
                <div className="col-span-2">
                  <div
                    className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-200 hover:border-purple-500/30"
                    style={{
                      background: hasAvatar ? 'rgba(168,85,247,0.06)' : 'rgba(255,255,255,0.03)',
                      borderColor: hasAvatar ? 'rgba(168,85,247,0.25)' : 'rgba(255,255,255,0.08)',
                    }}
                    onClick={() => avatarRef.current?.click()}
                  >
                    {/* Mini avatar preview */}
                    <div className="w-10 h-10 rounded-lg overflow-hidden border border-white/10 flex items-center justify-center shrink-0"
                      style={{ background: hasAvatar ? undefined : 'rgba(255,255,255,0.03)' }}>
                      {hasAvatar ? (
                        <img src={avatarPreview} className="w-full h-full object-cover" alt="" />
                      ) : clearAvatar ? (
                        <svg className="w-5 h-5 text-red-400/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                        </svg>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-white/60 text-[11px] font-bold tracking-widest uppercase">
                        {clearAvatar
                          ? 'Photo will be removed'
                          : hasAvatar
                          ? 'Photo ready — click to change'
                          : 'No photo — click to upload'}
                      </p>
                      <p className="text-white/20 text-[10px] mt-0.5">
                        {clearAvatar
                          ? 'Save to apply'
                          : 'Photo is cropped and shown on the roster page'}
                      </p>
                    </div>

                    {clearAvatar ? (
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); setClearAvatar(false); setAvatarPreview(initial.avatar || '') }}
                        className="text-white/30 hover:text-white text-[10px] font-bold tracking-widest uppercase shrink-0 transition-colors cursor-pointer"
                      >
                        Undo
                      </button>
                    ) : hasAvatar ? (
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); handleRemoveAvatar() }}
                        className="text-red-400/50 hover:text-red-400 text-[10px] font-bold tracking-widest uppercase shrink-0 transition-colors cursor-pointer"
                      >
                        Remove
                      </button>
                    ) : (
                      <svg className="w-4 h-4 text-white/20 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                      </svg>
                    )}
                  </div>
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
              className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black px-6 py-2.5 rounded-xl text-xs tracking-widest uppercase transition-all duration-200 cursor-pointer"
              style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
            >
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Player'}
            </button>
            <ActionButton variant="ghost" onClick={onClose}>Cancel</ActionButton>
          </div>
        </div>
      </div>
    </>
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
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const getCsrf = getCsrfToken

  const load = () => {
    ;(players.listAll() as Promise<any>).then(r => setData(r.players || [])).catch(() => {})
    ;(games.listAll() as Promise<any>).then(r => setGamesList(r.games || [])).catch(() => {})
    ;(teams.listAll() as Promise<any>).then(r => setTeamsList(r.teams || [])).catch(() => {})
  }

  useEffect(() => { load() }, [])
  useEffect(() => { setPage(1) }, [filterStatus, filterGame, search])

  const buildFormData = (form: any, avatarFile: File | null, clearAvatar: boolean) => {
    const fd = new FormData()
    Object.entries(form).forEach(([k, v]) => {
      if (v !== null && v !== undefined) fd.append(k, String(v))
    })
    if (clearAvatar) {
      fd.append('clear_avatar', 'true')
    } else if (avatarFile) {
      fd.append('avatar', avatarFile)
    }
    return fd
  }

  const handleAdd = async (form: any, avatarFile: File | null, clearAvatar: boolean) => {
    const fd = buildFormData(form, avatarFile, clearAvatar)
    await fetch('/api/players/create/', {
      method: 'POST', credentials: 'include',
      headers: { 'X-CSRFToken': getCsrf() }, body: fd,
    })
    load()
  }

  const handleEdit = async (form: any, avatarFile: File | null, clearAvatar: boolean) => {
    if (!editing) return
    const fd = buildFormData(form, avatarFile, clearAvatar)
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

  const filtered = data.filter(p => {
    if (filterStatus && p.status !== filterStatus) return false
    if (filterGame && p.game !== filterGame) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        p.username.toLowerCase().includes(q) ||
        p.ingame_username.toLowerCase().includes(q) ||
        (p.first_name + ' ' + p.last_name).toLowerCase().includes(q) ||
        p.discord_username.toLowerCase().includes(q)
      )
    }
    return true
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const displayed = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div>
      <SectionHeader
        title="Players"
        action={
          <div className="flex items-center gap-2 flex-wrap">
            <SearchBar value={search} onChange={setSearch} placeholder="Search players…" />
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

      <p className="text-white/25 text-xs mb-3 tracking-wide">
        {filtered.length === 0
          ? 'No players found'
          : `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filtered.length)} of ${filtered.length} player${filtered.length !== 1 ? 's' : ''}`}
      </p>

      <div className="space-y-2">
        {displayed.length === 0 && (
          <div className="bg-white/5 border border-white/8 rounded-2xl p-8 text-center">
            <p className="text-white/30 text-sm">
              {search ? `No players match "${search}"` : 'No players found.'}
            </p>
          </div>
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

      <Pagination page={page} totalPages={totalPages} onPage={setPage} />

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