// ShopSection.tsx
import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Badge, SectionHeader, ActionButton, FilterSelect,
  FilterOption, getCsrfToken, SearchBar, Pagination,
} from '../DashboardShared'

// ── Types ─────────────────────────────────────────────────────────────────────

type VariantAttribute = {
  name: string
}

type Variant = {
  id: string
  attribute: string  // e.g. "Size"
  value: string      // e.g. "S"
  stock: number
}

type VariantConfig = {
  attributes: VariantAttribute[]
  variants: Variant[]
}

type CustomField = {
  label: string
  placeholder: string
  required: boolean
}

type GalleryImage = { id: number; url: string; display_order: number }

type StagedImage = { file: File; previewUrl: string; key: string }

type Product = {
  id: number
  name: string
  description: string
  price: string
  category: string
  banner: string
  variant_config: VariantConfig
  custom_fields: CustomField[]
  images: GalleryImage[]
  track_stock: boolean
  total_stock: number | null
  is_active: boolean
  is_featured: boolean
  display_order: number
}

type Order = {
  id: number
  product_id: number | null
  product_name: string
  product_banner: string
  variant_values: Record<string, string>
  variant_display: string
  quantity: number
  custom_field_values: Record<string, string>
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
  jersey: 'Jersey',
  hoodie: 'Hoodie',
  cap: 'Cap',
  accessory: 'Accessory',
  other: 'Other',
}

const getCsrf = getCsrfToken
const PAGE_SIZE = 8

// ── Shared input styles ───────────────────────────────────────────────────────

const inputCls =
  'bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-xs ' +
  'focus:outline-none focus:border-purple-500/60 w-full placeholder-white/20'

const selectCls =
  'bg-[#1a0030] border border-white/10 rounded-lg px-3 py-2 text-white text-xs ' +
  'focus:outline-none focus:border-purple-500/60 w-full cursor-pointer'

const labelCls = 'block text-white/40 text-[10px] font-bold tracking-widest uppercase mb-1'

// ── VariantBuilder ────────────────────────────────────────────────────────────

function VariantBuilder({
  config,
  onChange,
  trackStock,
}: {
  config: VariantConfig
  onChange: (cfg: VariantConfig) => void
  trackStock: boolean
}) {
  const attributes = config.attributes || []
  const variants   = config.variants   || []

  // ── Add attribute state ──
  const [addingAttr, setAddingAttr]   = useState(false)
  const [newAttrName, setNewAttrName] = useState('')

  // ── Add variant state ──
  const [addingVariant, setAddingVariant]       = useState(false)
  const [newVariantAttr, setNewVariantAttr]     = useState('')
  const [newVariantValue, setNewVariantValue]   = useState('')
  const [newVariantStock, setNewVariantStock]   = useState(0)

  // Group variants by attribute name for display
  const variantsByAttr: Record<string, Variant[]> = {}
  for (const v of variants) {
    if (!variantsByAttr[v.attribute]) variantsByAttr[v.attribute] = []
    variantsByAttr[v.attribute].push(v)
  }

  // ── Handlers: attributes ──
  const handleSaveAttribute = () => {
    const name = newAttrName.trim()
    if (!name) return
    if (attributes.some(a => a.name.toLowerCase() === name.toLowerCase())) return
    onChange({ ...config, attributes: [...attributes, { name }] })
    setNewAttrName('')
    setAddingAttr(false)
  }

  const handleRemoveAttribute = (attrName: string) => {
    if (!confirm(`Remove attribute "${attrName}" and all its variants?`)) return
    onChange({
      attributes: attributes.filter(a => a.name !== attrName),
      variants:   variants.filter(v => v.attribute !== attrName),
    })
  }

  // ── Handlers: variants ──
  const openAddVariant = () => {
    setAddingVariant(true)
    if (attributes.length > 0 && !newVariantAttr) {
      setNewVariantAttr(attributes[0].name)
    }
  }

  const handleSaveVariant = () => {
    if (!newVariantAttr || !newVariantValue.trim()) return
    const exists = variants.some(
      v =>
        v.attribute === newVariantAttr &&
        v.value.toLowerCase() === newVariantValue.trim().toLowerCase()
    )
    if (exists) return
    const newVariant: Variant = {
      id:        `var_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      attribute: newVariantAttr,
      value:     newVariantValue.trim(),
      stock:     newVariantStock,
    }
    onChange({ ...config, variants: [...variants, newVariant] })
    setNewVariantValue('')
    setNewVariantStock(0)
    setAddingVariant(false)
  }

  const handleRemoveVariant = (id: string) => {
    onChange({ ...config, variants: variants.filter(v => v.id !== id) })
  }

  const handleStockChange = (id: string, stock: number) => {
    onChange({
      ...config,
      variants: variants.map(v => (v.id === id ? { ...v, stock } : v)),
    })
  }

  const cancelAddAttr = () => { setAddingAttr(false); setNewAttrName('') }
  const cancelAddVariant = () => {
    setAddingVariant(false)
    setNewVariantValue('')
    setNewVariantStock(0)
  }

  return (
    <div className="space-y-6">

      {/* ── Attributes section ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-white/70 text-xs font-bold tracking-widest uppercase">Attributes</p>
            <p className="text-white/25 text-[10px] mt-0.5">
              Define the types of variants your product has (e.g. Size, Color)
            </p>
          </div>
          {!addingAttr && (
            <button
              type="button"
              onClick={() => setAddingAttr(true)}
              className="text-purple-400/70 hover:text-purple-400 text-[10px] font-bold
                         tracking-widest uppercase transition-colors cursor-pointer
                         flex items-center gap-1"
            >
              <span className="text-base leading-none">+</span> Add Attribute
            </button>
          )}
        </div>

        {/* Empty state */}
        {attributes.length === 0 && !addingAttr && (
          <div className="border border-dashed border-white/10 rounded-xl p-5 text-center">
            <p className="text-white/20 text-[10px] tracking-widest uppercase mb-2">
              No attributes yet
            </p>
            <button
              type="button"
              onClick={() => setAddingAttr(true)}
              className="text-purple-400/50 hover:text-purple-400 text-[10px] font-bold
                         tracking-widest uppercase transition-colors cursor-pointer"
            >
              + Add your first attribute
            </button>
          </div>
        )}

        {/* Attribute list */}
        <div className="space-y-2">
          {attributes.map(attr => (
            <div
              key={attr.name}
              className="flex items-center gap-3 bg-white/5 border border-white/8
                         rounded-xl px-4 py-3"
            >
              <div className="flex-1 min-w-0">
                <span className="text-white text-xs font-bold">{attr.name}</span>
                <span className="text-white/25 text-[10px] ml-2">
                  {variantsByAttr[attr.name]?.length ?? 0} variant
                  {(variantsByAttr[attr.name]?.length ?? 0) !== 1 ? 's' : ''}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleRemoveAttribute(attr.name)}
                className="text-red-400/40 hover:text-red-400 transition-colors cursor-pointer shrink-0"
                title={`Remove ${attr.name}`}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"
                  stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>

        {/* Add attribute inline form */}
        {addingAttr && (
          <div className="mt-2 bg-white/5 border border-purple-500/20 rounded-xl p-4
                          flex items-end gap-3">
            <div className="flex-1">
              <label className={labelCls}>Attribute Name *</label>
              <input
                autoFocus
                placeholder="e.g. Size, Color, Material…"
                value={newAttrName}
                onChange={e => setNewAttrName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleSaveAttribute()
                  if (e.key === 'Escape') cancelAddAttr()
                }}
                className={inputCls}
              />
            </div>
            <button
              type="button"
              onClick={handleSaveAttribute}
              disabled={!newAttrName.trim()}
              className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40
                         disabled:cursor-not-allowed text-white font-black px-4 py-2
                         rounded-lg text-xs tracking-widest uppercase transition-all
                         cursor-pointer shrink-0"
            >
              Save
            </button>
            <button
              type="button"
              onClick={cancelAddAttr}
              className="bg-white/5 hover:bg-white/10 border border-white/10
                         text-white/50 hover:text-white font-bold px-4 py-2
                         rounded-lg text-xs tracking-widest uppercase transition-all
                         cursor-pointer shrink-0"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* ── Divider ── */}
      {attributes.length > 0 && <div className="border-t border-white/8" />}

      {/* ── Variants section ── */}
      {attributes.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-white/70 text-xs font-bold tracking-widest uppercase">Variants</p>
              <p className="text-white/25 text-[10px] mt-0.5">
                Add individual variant values per attribute
              </p>
            </div>
            {!addingVariant && (
              <button
                type="button"
                onClick={openAddVariant}
                className="text-purple-400/70 hover:text-purple-400 text-[10px] font-bold
                           tracking-widest uppercase transition-colors cursor-pointer
                           flex items-center gap-1"
              >
                <span className="text-base leading-none">+</span> Add Variant
              </button>
            )}
          </div>

          {/* Empty state */}
          {variants.length === 0 && !addingVariant && (
            <div className="border border-dashed border-white/10 rounded-xl p-5 text-center">
              <p className="text-white/20 text-[10px] tracking-widest uppercase mb-2">
                No variants yet
              </p>
              <button
                type="button"
                onClick={openAddVariant}
                className="text-purple-400/50 hover:text-purple-400 text-[10px] font-bold
                           tracking-widest uppercase transition-colors cursor-pointer"
              >
                + Add your first variant
              </button>
            </div>
          )}

          {/* Variants grouped by attribute */}
          <div className="space-y-4">
            {attributes.map(attr => {
              const attrVariants = variantsByAttr[attr.name] || []
              if (attrVariants.length === 0) return null
              return (
                <div key={attr.name}>
                  <p className="text-white/35 text-[10px] font-bold tracking-widest
                                uppercase mb-2">
                    {attr.name}
                  </p>
                  <div className="space-y-1.5">
                    {attrVariants.map(variant => (
                      <div
                        key={variant.id}
                        className="flex items-center gap-3 bg-white/5 border border-white/8
                                   rounded-xl px-4 py-2.5"
                      >
                        {/* Value pill */}
                        <span className="bg-purple-500/15 border border-purple-500/25
                                         text-purple-300 text-[10px] font-bold px-2.5 py-1
                                         rounded-lg tracking-wide min-w-[2.5rem] text-center">
                          {variant.value}
                        </span>

                        {/* Stock */}
                        {trackStock && (
                          <div className="flex items-center gap-2 ml-auto">
                            <label className="text-white/25 text-[10px] tracking-widest uppercase shrink-0">
                              Stock
                            </label>
                            <input
                              type="number"
                              min={0}
                              value={variant.stock}
                              onChange={e =>
                                handleStockChange(
                                  variant.id,
                                  Math.max(0, parseInt(e.target.value) || 0)
                                )
                              }
                              className="bg-white/5 border border-white/10 rounded-lg px-2 py-1
                                         text-white text-xs text-center focus:outline-none
                                         focus:border-purple-500/60 w-16"
                            />
                          </div>
                        )}

                        {/* Remove */}
                        <button
                          type="button"
                          onClick={() => handleRemoveVariant(variant.id)}
                          className={`text-red-400/40 hover:text-red-400 transition-colors
                                      cursor-pointer shrink-0 ${trackStock ? 'ml-2' : 'ml-auto'}`}
                          title="Remove variant"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"
                            stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round"
                              d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Add variant inline form */}
          {addingVariant && (
            <div className="mt-3 bg-white/5 border border-purple-500/20 rounded-xl p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {/* Attribute picker */}
                <div>
                  <label className={labelCls}>Attribute *</label>
                  <select
                    value={newVariantAttr}
                    onChange={e => setNewVariantAttr(e.target.value)}
                    className={selectCls}
                  >
                    {attributes.map(a => (
                      <option key={a.name} value={a.name} className="bg-[#1a0030] text-white">
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Value input */}
                <div>
                  <label className={labelCls}>Value *</label>
                  <input
                    autoFocus
                    placeholder={
                      newVariantAttr === 'Size'  ? 'e.g. S, M, L, XL' :
                      newVariantAttr === 'Color' ? 'e.g. Black, Red'   : 'e.g. value'
                    }
                    value={newVariantValue}
                    onChange={e => setNewVariantValue(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleSaveVariant()
                      if (e.key === 'Escape') cancelAddVariant()
                    }}
                    className={inputCls}
                  />
                </div>
              </div>

              {/* Stock — only if tracking */}
              {trackStock && (
                <div className="w-32">
                  <label className={labelCls}>Stock</label>
                  <input
                    type="number"
                    min={0}
                    value={newVariantStock}
                    onChange={e =>
                      setNewVariantStock(Math.max(0, parseInt(e.target.value) || 0))
                    }
                    className={inputCls}
                  />
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleSaveVariant}
                  disabled={!newVariantAttr || !newVariantValue.trim()}
                  className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40
                             disabled:cursor-not-allowed text-white font-black px-4 py-2
                             rounded-lg text-xs tracking-widest uppercase transition-all
                             cursor-pointer"
                >
                  Save Variant
                </button>
                <button
                  type="button"
                  onClick={cancelAddVariant}
                  className="bg-white/5 hover:bg-white/10 border border-white/10
                             text-white/50 hover:text-white font-bold px-4 py-2
                             rounded-lg text-xs tracking-widest uppercase transition-all
                             cursor-pointer"
                >
                  Cancel
                </button>
                <span className="text-white/15 text-[10px] ml-1 hidden sm:inline">
                  Press Enter to save quickly
                </span>
              </div>
            </div>
          )}

          {/* Quick "add another" link when not in form */}
          {!addingVariant && variants.length > 0 && (
            <button
              type="button"
              onClick={openAddVariant}
              className="mt-3 flex items-center gap-1.5 text-purple-400/50 hover:text-purple-400
                         text-[10px] font-bold tracking-widest uppercase transition-colors
                         cursor-pointer"
            >
              <span className="text-base leading-none">+</span> Add Another Variant
            </button>
          )}
        </div>
      )}

      {/* ── Summary footer ── */}
      {variants.length > 0 && (
        <div className="bg-white/3 border border-white/6 rounded-xl px-4 py-3
                        flex items-center gap-3">
          <span className="text-white/25 text-[10px] tracking-widest uppercase">Total</span>
          <span className="text-white/60 text-xs font-bold">
            {variants.length} variant{variants.length !== 1 ? 's' : ''}
          </span>
          {trackStock && (
            <>
              <span className="text-white/15">·</span>
              <span className="text-white/40 text-xs">
                {variants.reduce((s, v) => s + (v.stock || 0), 0)} units total stock
              </span>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── CustomFieldEditor ─────────────────────────────────────────────────────────

function CustomFieldEditor({
  fields,
  onChange,
}: {
  fields: CustomField[]
  onChange: (f: CustomField[]) => void
}) {
  const add    = () => onChange([...fields, { label: '', placeholder: '', required: false }])
  const remove = (i: number) => onChange(fields.filter((_, idx) => idx !== i))
  const update = <K extends keyof CustomField>(i: number, key: K, val: CustomField[K]) =>
    onChange(fields.map((f, idx) => (idx === i ? { ...f, [key]: val } : f)))

  return (
    <div className="space-y-3">
      <p className="text-white/25 text-[10px] tracking-widest">
        These fields appear as text inputs on the product page when a customer places an order.
        Use them for things like jersey back names, numbers, or personalisation details.
      </p>

      {fields.map((f, i) => (
        <div key={i} className="bg-white/3 border border-white/8 rounded-xl p-3 space-y-2">
          <div className="grid grid-cols-[1fr_1fr_28px] gap-2 items-start">
            <div>
              <label className={labelCls}>Field Label</label>
              <input
                placeholder="e.g. Back Name"
                value={f.label}
                onChange={e => update(i, 'label', e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Placeholder</label>
              <input
                placeholder="e.g. SMITH"
                value={f.placeholder}
                onChange={e => update(i, 'placeholder', e.target.value)}
                className={inputCls}
              />
            </div>
            <div className="pt-5">
              <button
                type="button"
                onClick={() => remove(i)}
                className="w-7 h-7 rounded-lg bg-red-500/10 hover:bg-red-500/20
                           border border-red-500/20 text-red-400/70 hover:text-red-400
                           flex items-center justify-center transition-all cursor-pointer"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24"
                  stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => update(i, 'required', !f.required)}
              className={`w-8 h-4 rounded-full transition-colors duration-200 relative shrink-0
                          ${f.required ? 'bg-purple-600' : 'bg-white/10'}`}
            >
              <span
                className="absolute top-0.5 w-3 h-3 rounded-full bg-white shadow
                           transition-all duration-200"
                style={{ left: f.required ? '13px' : '2px' }}
              />
            </button>
            <span className="text-white/35 text-[10px] font-bold tracking-widest uppercase">
              {f.required ? 'Required' : 'Optional'}
            </span>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={add}
        className="flex items-center gap-1.5 text-purple-400/60 hover:text-purple-400
                   text-[10px] font-bold tracking-widest uppercase transition-colors cursor-pointer"
      >
        <span className="text-base leading-none">+</span> Add Custom Field
      </button>
    </div>
  )
}

// ── GalleryEditor ─────────────────────────────────────────────────────────────

function GalleryEditor({
  existing,
  staged,
  onRemoveExisting,
  onAddStaged,
  onRemoveStaged,
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
    e.target.value = ''
  }

  const thumbClass =
    'relative w-20 h-20 rounded-xl overflow-hidden border border-white/10 shrink-0 group'

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {existing.map(img => (
          <div key={img.id} className={thumbClass}>
            <img src={img.url} className="w-full h-full object-cover" alt="" />
            <button
              type="button"
              onClick={() => onRemoveExisting(img)}
              className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100
                         transition-opacity flex items-center justify-center cursor-pointer"
            >
              <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24"
                stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}

        {staged.map(s => (
          <div key={s.key} className={thumbClass + ' border-dashed border-purple-500/40'}>
            <img src={s.previewUrl} className="w-full h-full object-cover" alt="" />
            <span className="absolute bottom-1 left-1 text-[8px] font-black px-1 py-0.5
                             rounded bg-purple-600/80 text-white tracking-wider">
              NEW
            </span>
            <button
              type="button"
              onClick={() => onRemoveStaged(s.key)}
              className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100
                         transition-opacity flex items-center justify-center cursor-pointer"
            >
              <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24"
                stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-20 h-20 rounded-xl border-2 border-dashed border-white/15
                     hover:border-purple-500/50 flex flex-col items-center justify-center
                     gap-1 text-white/20 hover:text-purple-400 transition-all cursor-pointer shrink-0"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24"
            stroke="currentColor" strokeWidth={1.5}>
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
  const [tab, setTab] = useState<'general' | 'variants' | 'custom' | 'settings'>('general')
  const backdropRef   = useRef<HTMLDivElement>(null)

  const [form, setForm] = useState({
    name:          initial.name          || '',
    description:   initial.description   || '',
    price:         initial.price         || '',
    category:      initial.category      || 'jersey',
    is_active:     initial.is_active     !== false,
    is_featured:   initial.is_featured   || false,
    track_stock:   initial.track_stock   !== false,
    display_order: initial.display_order ?? 0,
  })

  const [variantConfig, setVariantConfig] = useState<VariantConfig>(() => {
    const raw = initial.variant_config
    if (!raw) return { attributes: [], variants: [] }
    // Normalise: handle both old schema (values array) and new schema (flat variants)
    return {
      attributes: (raw.attributes || []).map((a: any) => ({ name: a.name })),
      variants:   (raw.variants   || []).map((v: any) => ({
        id:        v.id        || `var_${Math.random().toString(36).slice(2)}`,
        attribute: v.attribute || '',
        value:     v.value     || '',
        stock:     v.stock     ?? 0,
      })).filter((v: any) => v.attribute && v.value),
    }
  })

  const [customFields, setCustomFields]   = useState<CustomField[]>(initial.custom_fields || [])
  const [bannerFile, setBannerFile]       = useState<File | null>(null)
  const [bannerPreview, setBannerPreview] = useState(initial.banner || '')
  const bannerRef = useRef<HTMLInputElement>(null)

  const [existingImages, setExistingImages]   = useState<GalleryImage[]>(initial.images || [])
  const [stagedImages, setStagedImages]       = useState<StagedImage[]>([])
  const [deletedImageIds, setDeletedImageIds] = useState<number[]>([])
  const [saving, setSaving]                   = useState(false)

  const handleBannerFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null
    setBannerFile(f)
    setBannerPreview(f ? URL.createObjectURL(f) : (initial.banner || ''))
  }

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
      fd.append('variant_config', JSON.stringify(variantConfig))
      fd.append('custom_fields', JSON.stringify(customFields))
      if (bannerFile) fd.append('banner', bannerFile)
      stagedImages.forEach((s, i) => fd.append(`gallery_${i}`, s.file))
      await onSave(fd, deletedImageIds)
      onClose()
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  const toggle = (key: keyof typeof form) =>
    setForm(p => ({ ...p, [key]: !(p as any)[key] }))

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === backdropRef.current && window.getSelection()?.toString() === '') onClose()
  }

  const TOGGLES = [
    { key: 'is_active',   on: 'Active',           off: 'Inactive',           sub: 'Visible in shop' },
    { key: 'is_featured', on: 'Featured',          off: 'Not Featured',       sub: 'Shown in hero' },
    {
      key: 'track_stock',
      on:  'Tracking Stock',
      off: 'Stock Tracking Off',
      sub: form.track_stock ? 'Stock counts enforced' : 'Always shown as available',
    },
  ] as const

  const TABS = [
    { id: 'general',  label: '🎨 General' },
    { id: 'variants', label: `📦 Variants${variantConfig.variants.length ? ` (${variantConfig.variants.length})` : ''}` },
    { id: 'custom',   label: `✏️ Custom Fields${customFields.length ? ` (${customFields.length})` : ''}` },
    { id: 'settings', label: '⚙ Settings' },
  ] as const

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(4px)' }}
      onClick={handleBackdropClick}
    >
      <div
        className="bg-[#13001f] border border-white/10 rounded-3xl w-full max-w-2xl shadow-2xl
                   shadow-purple-900/30 flex flex-col my-auto"
        style={{ maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-white/8 shrink-0">
          <div>
            <h3
              className="text-white font-black text-base uppercase tracking-wide"
              style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
            >
              {isEdit ? `Edit — ${initial.name}` : 'Add Product'}
            </h3>
            <p className="text-white/30 text-[10px] tracking-widest mt-0.5">
              {isEdit ? 'Update product details' : 'Create a new shop product'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white/30 hover:text-white transition-colors text-xl cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 pt-3 pb-1 flex-wrap shrink-0">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as typeof tab)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black tracking-widest uppercase
                          transition-all duration-150 cursor-pointer
                ${tab === t.id
                  ? 'bg-purple-600/25 text-purple-300 border border-purple-500/30'
                  : 'text-white/30 hover:text-white/60'
                }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div
          className="overflow-y-auto flex-1 px-6 py-3"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >

          {/* ── GENERAL TAB ── */}
          {tab === 'general' && (
            <div className="space-y-5">
              {/* Banner */}
              <div>
                <label className={labelCls}>Primary / Banner Image</label>
                <div className="flex items-start gap-4">
                  <div
                    className="w-40 h-40 rounded-2xl border-2 border-dashed border-white/10
                               flex items-center justify-center overflow-hidden shrink-0
                               cursor-pointer hover:border-purple-500/40 transition-colors bg-white/3"
                    onClick={() => bannerRef.current?.click()}
                  >
                    {bannerPreview ? (
                      <img src={bannerPreview} className="w-full h-full object-cover" alt="preview" />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-white/20 p-4">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24"
                          stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round"
                            d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M13.5 12h.008v.008H13.5V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                        </svg>
                        <span className="text-[9px] text-center">Click to upload</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <input
                      ref={bannerRef}
                      type="file"
                      accept="image/*"
                      onChange={handleBannerFile}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => bannerRef.current?.click()}
                      className="bg-white/5 border border-white/10 hover:border-purple-500/40
                                 text-white/60 hover:text-white text-[10px] font-bold px-3 py-2
                                 rounded-lg tracking-wider uppercase transition-all cursor-pointer w-full"
                    >
                      {bannerFile ? 'Change Image' : 'Choose Image'}
                    </button>
                    {bannerFile && (
                      <p className="text-white/30 text-[10px] truncate">{bannerFile.name}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Gallery */}
              <div>
                <label className={labelCls}>
                  Gallery Images
                  <span className="normal-case text-white/20 ml-1">
                    ({existingImages.length + stagedImages.length})
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

              {/* Basic info */}
              <div className="space-y-3">
                <div>
                  <label className={labelCls}>Product Name *</label>
                  <input
                    placeholder="e.g. NBL Esport Official Jersey 2026"
                    value={form.name}
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Price (DZD) *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="e.g. 4500"
                    value={form.price}
                    onChange={e => setForm(p => ({ ...p, price: e.target.value }))}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Category</label>
                  <select
                    value={form.category}
                    onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                    className={selectCls}
                  >
                    {Object.entries(CATEGORY_LABELS).map(([v, l]) => (
                      <option key={v} value={v} className="bg-[#1a0030]">{l}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Display Order</label>
                  <input
                    type="number"
                    min="0"
                    value={form.display_order}
                    onChange={e =>
                      setForm(p => ({ ...p, display_order: parseInt(e.target.value) || 0 }))
                    }
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Description</label>
                  <textarea
                    placeholder="Describe the product — material, fit, design details…"
                    value={form.description}
                    onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                    className={inputCls + ' h-20 resize-none'}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── VARIANTS TAB ── */}
          {tab === 'variants' && (
            <div className="py-1">
              <p className="text-white/25 text-xs tracking-widest mb-4">
                Create variant attributes (e.g. Size, Color) then add individual values for each.
                {form.track_stock ? ' Stock is tracked per variant.' : ''}
              </p>
              <VariantBuilder
                config={variantConfig}
                onChange={setVariantConfig}
                trackStock={form.track_stock}
              />
            </div>
          )}

          {/* ── CUSTOM FIELDS TAB ── */}
          {tab === 'custom' && (
            <div className="py-1">
              <CustomFieldEditor fields={customFields} onChange={setCustomFields} />
            </div>
          )}

          {/* ── SETTINGS TAB ── */}
          {tab === 'settings' && (
            <div className="space-y-3 py-1">
              <p className="text-white/25 text-xs tracking-widest">
                Product behavior and visibility
              </p>
              {TOGGLES.map(({ key, on, off, sub }) => (
                <div
                  key={key}
                  className="flex items-center gap-3 bg-white/3 border border-white/8 rounded-xl p-3"
                >
                  <button
                    type="button"
                    onClick={() => toggle(key)}
                    className={`w-9 h-5 rounded-full transition-colors duration-200 relative shrink-0
                                ${(form as any)[key] ? 'bg-purple-600' : 'bg-white/10'}`}
                  >
                    <span
                      className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow
                                 transition-all duration-200"
                      style={{ left: (form as any)[key] ? '16px' : '2px' }}
                    />
                  </button>
                  <div className="flex-1">
                    <p className="text-white/50 text-[10px] font-bold tracking-widest uppercase">
                      {(form as any)[key] ? on : off}
                    </p>
                    <p className="text-white/20 text-[10px] mt-0.5">{sub}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-white/8 shrink-0">
          <button
            onClick={handleSubmit}
            disabled={saving || !form.name || !form.price}
            className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40
                       disabled:cursor-not-allowed text-white font-black px-6 py-2.5
                       rounded-xl text-xs tracking-widest uppercase transition-all cursor-pointer"
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
  const [notes, setNotes]   = useState(order.notes || '')
  const [saving, setSaving] = useState(false)
  const backdropRef         = useRef<HTMLDivElement>(null)

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

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === backdropRef.current && window.getSelection()?.toString() === '') onClose()
  }

  const formattedDate = (() => {
    try {
      return new Date(order.submitted_at).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    } catch { return order.submitted_at }
  })()

  const customEntries = Object.entries(order.custom_field_values || {}).filter(([, v]) => v)
  const variantEntries = Object.entries(order.variant_values || {}).filter(([, v]) => v)

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(4px)' }}
      onClick={handleBackdropClick}
    >
      <div
        className="bg-[#13001f] border border-white/10 rounded-3xl w-full max-w-lg shadow-2xl
                   shadow-purple-900/30 flex flex-col my-auto"
        style={{ maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-white/8 shrink-0">
          <div>
            <h3
              className="text-white font-black text-base uppercase tracking-wide"
              style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
            >
              Order #{order.id}
            </h3>
            <p className="text-white/30 text-[10px] tracking-widest mt-0.5">{formattedDate}</p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className="text-xs font-bold tracking-widest uppercase px-3 py-1.5 rounded-full"
              style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}40` }}
            >
              {cfg.label}
            </span>
            <button
              onClick={onClose}
              className="text-white/30 hover:text-white transition-colors text-xl cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        <div
          className="overflow-y-auto flex-1 px-6 py-4 space-y-5"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {/* Progress tracker */}
          {status !== 'cancelled' && (
            <div className="relative">
              <div className="flex items-center justify-between relative">
                <div className="absolute left-0 right-0 top-3.5 h-0.5 bg-white/10 z-0" />
                <div
                  className="absolute left-0 top-3.5 h-0.5 z-0 transition-all duration-500"
                  style={{
                    width: `${currentStep <= 0 ? 0 : (currentStep / (STATUS_STEPS.length - 1)) * 100}%`,
                    background: cfg.color,
                  }}
                />
                {STATUS_STEPS.map((s, i) => {
                  const done = i <= currentStep
                  const sCfg = STATUS_CONFIG[s]
                  return (
                    <div key={s} className="flex flex-col items-center gap-1.5 z-10">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center
                                   border-2 transition-all duration-300"
                        style={{
                          background:   done ? sCfg.bg : 'rgba(255,255,255,0.05)',
                          borderColor:  done ? sCfg.color : 'rgba(255,255,255,0.15)',
                        }}
                      >
                        {done ? (
                          <svg className="w-3.5 h-3.5" style={{ color: sCfg.color }}
                            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
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
              <img src={order.product_banner}
                className="w-16 h-16 rounded-xl object-cover shrink-0 border border-white/10"
                alt="" />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-purple-900/30 border border-purple-500/20
                              flex items-center justify-center shrink-0">
                <span className="text-purple-400 text-xl">🛒</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-sm truncate">{order.product_name}</p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {order.variant_display && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full
                                   bg-purple-500/15 text-purple-300 border border-purple-500/20">
                    {order.variant_display}
                  </span>
                )}
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full
                                 bg-white/8 text-white/50 border border-white/10">
                  Qty: {order.quantity}
                </span>
              </div>
            </div>
          </div>

          {/* Variant values */}
          {variantEntries.length > 0 && (
            <div className="bg-blue-500/8 border border-blue-500/20 rounded-2xl p-4 space-y-2">
              <p className="text-blue-300/60 text-[10px] font-bold tracking-widest uppercase mb-3">
                Variant Details
              </p>
              {variantEntries.map(([label, value]) => (
                <div
                  key={label}
                  className="flex justify-between items-start py-1.5 border-b border-white/5
                             gap-3 last:border-0"
                >
                  <span className="text-white/35 text-xs font-bold tracking-widest uppercase shrink-0">
                    {label}
                  </span>
                  <span className="text-white text-xs text-right font-bold">{value}</span>
                </div>
              ))}
            </div>
          )}

          {/* Custom field values */}
          {customEntries.length > 0 && (
            <div className="bg-purple-500/8 border border-purple-500/20 rounded-2xl p-4 space-y-2">
              <p className="text-purple-300/60 text-[10px] font-bold tracking-widest uppercase mb-3">
                Personalisation
              </p>
              {customEntries.map(([label, value]) => (
                <div
                  key={label}
                  className="flex justify-between items-start py-1.5 border-b border-white/5
                             gap-3 last:border-0"
                >
                  <span className="text-white/35 text-xs font-bold tracking-widest uppercase shrink-0">
                    {label}
                  </span>
                  <span className="text-white text-xs text-right font-bold">{value}</span>
                </div>
              ))}
            </div>
          )}

          {/* Customer details */}
          <div className="space-y-2">
            <p className="text-white/30 text-[10px] font-bold tracking-widest uppercase mb-2">
              Customer
            </p>
            {[
              { label: 'Name',    value: order.full_name },
              { label: 'Email',   value: order.email },
              { label: 'Phone',   value: order.phone },
              { label: 'Wilaya',  value: order.wilaya_label || order.wilaya },
              { label: 'Address', value: order.address },
            ]
              .filter(r => r.value)
              .map(row => (
                <div
                  key={row.label}
                  className="flex justify-between items-start py-2 border-b border-white/5 gap-3"
                >
                  <span className="text-white/35 text-xs font-bold tracking-widest uppercase shrink-0">
                    {row.label}
                  </span>
                  <span className="text-white text-xs text-right">{row.value}</span>
                </div>
              ))}
          </div>

          {/* Status update */}
          <div>
            <label className="block text-white/40 text-[10px] font-bold tracking-widest uppercase mb-1">
              Update Status
            </label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              className={selectCls}
            >
              {Object.entries(STATUS_CONFIG).map(([v, c]) => (
                <option key={v} value={v} className="bg-[#1a0030]">{c.label}</option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-white/40 text-[10px] font-bold tracking-widest uppercase mb-1">
              Staff Notes
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Internal notes about this order…"
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-xs
                         placeholder-white/20 focus:outline-none focus:border-purple-500/60
                         resize-none h-20 w-full"
            />
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-white/8 shrink-0">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white
                       font-black px-6 py-2.5 rounded-xl text-xs tracking-widest uppercase
                       transition-all cursor-pointer"
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
  const totalStock = product.total_stock

  const stockLabel =
    !trackStock    ? 'Always Available'  :
    totalStock === 0 ? 'Out of Stock'   :
    `${totalStock} in stock`

  const stockColor =
    !trackStock              ? '#60a5fa' :
    totalStock === 0         ? '#f87171' :
    (totalStock ?? 0) < 5   ? '#fbbf24' : '#34d399'

  // Build a readable variant summary for the card
  const variantSummary = (() => {
    const attrs    = product.variant_config?.attributes || []
    const variants = product.variant_config?.variants   || []
    if (attrs.length === 0 || variants.length === 0) return null
    return attrs.map(attr => {
      const values = variants
        .filter(v => v.attribute === attr.name)
        .map(v => v.value)
      return { attr: attr.name, values }
    })
  })()

  return (
    <div
      className={`relative border border-white/8 rounded-2xl overflow-hidden flex flex-col
                  transition-all duration-200 hover:border-purple-500/30
                  ${!product.is_active ? 'opacity-50' : ''}`}
      style={{ background: '#0c001a' }}
    >
      {/* Banner */}
      <div className="relative h-44 shrink-0 overflow-hidden">
        {product.banner ? (
          <img src={product.banner} className="w-full h-full object-cover" alt={product.name} />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: 'rgba(168,85,247,0.1)' }}
          >
            <span
              className="text-white/10 font-black text-5xl"
              style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
            >
              {product.name.charAt(0)}
            </span>
          </div>
        )}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to top, #0c001a 0%, transparent 60%)' }}
        />

        {/* Top-left badges */}
        <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap max-w-[60%]">
          {product.is_featured && (
            <span
              className="text-[9px] font-black tracking-widest uppercase px-2 py-1 rounded-full"
              style={{
                background: 'rgba(251,191,36,0.2)',
                color: '#fbbf24',
                border: '1px solid rgba(251,191,36,0.3)',
              }}
            >
              ★ Featured
            </span>
          )}
          {!product.is_active && (
            <span className="text-[9px] font-black tracking-widest uppercase px-2 py-1
                             rounded-full bg-black/60 text-white/40 border border-white/10">
              Inactive
            </span>
          )}
          {!trackStock && (
            <span
              className="text-[9px] font-black tracking-widest uppercase px-2 py-1 rounded-full"
              style={{
                background: 'rgba(96,165,250,0.15)',
                color: '#60a5fa',
                border: '1px solid rgba(96,165,250,0.25)',
              }}
            >
              ∞ No Tracking
            </span>
          )}
          {(product.custom_fields?.length ?? 0) > 0 && (
            <span
              className="text-[9px] font-black tracking-widest uppercase px-2 py-1 rounded-full"
              style={{
                background: 'rgba(168,85,247,0.15)',
                color: '#c084fc',
                border: '1px solid rgba(168,85,247,0.25)',
              }}
            >
              ✏ {product.custom_fields.length} field{product.custom_fields.length > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Stock badge */}
        <div className="absolute top-3 right-3">
          <span
            className="text-[9px] font-black tracking-widest uppercase px-2 py-1 rounded-full"
            style={{
              background: `${stockColor}18`,
              color: stockColor,
              border: `1px solid ${stockColor}30`,
            }}
          >
            {stockLabel}
          </span>
        </div>

        {/* Gallery count */}
        {(product.images?.length ?? 0) > 0 && (
          <div className="absolute bottom-3 right-3">
            <span className="text-[9px] font-bold px-2 py-1 rounded-full bg-black/50
                             text-white/50 border border-white/10 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24"
                stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
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
              {parseInt(product.price).toLocaleString()}{' '}
              <span className="text-xs text-white/40">DZD</span>
            </span>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/8
                           text-white/40 border border-white/10 mt-1 inline-block">
            {CATEGORY_LABELS[product.category] || product.category}
          </span>
        </div>

        {/* Variant summary */}
        {variantSummary && variantSummary.length > 0 && (
          <div className="space-y-1">
            {variantSummary.map(({ attr, values }) => (
              <div key={attr} className="flex items-center gap-1.5 flex-wrap">
                <span className="text-white/25 text-[9px] font-bold tracking-widest uppercase shrink-0">
                  {attr}:
                </span>
                {values.slice(0, 5).map(v => (
                  <span
                    key={v}
                    className="text-[9px] px-1.5 py-0.5 rounded bg-white/5
                               text-white/40 border border-white/8"
                  >
                    {v}
                  </span>
                ))}
                {values.length > 5 && (
                  <span className="text-[9px] text-white/20">+{values.length - 5}</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Custom fields summary */}
        {(product.custom_fields?.length ?? 0) > 0 && (
          <div className="flex flex-wrap gap-1">
            {product.custom_fields.map((f, i) => (
              <span
                key={i}
                className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/10
                           text-purple-400/60 border border-purple-500/15"
              >
                {f.label}{f.required ? ' *' : ''}
              </span>
            ))}
          </div>
        )}

        <div className="flex gap-2 mt-auto pt-2 border-t border-white/5">
          <button
            onClick={onEdit}
            className="flex-1 bg-white/5 hover:bg-purple-500/15 border border-white/10
                       hover:border-purple-500/30 text-white/60 hover:text-white text-[10px]
                       font-black py-2 rounded-lg tracking-widest uppercase transition-all
                       cursor-pointer"
          >
            Edit
          </button>
          <button
            onClick={onDelete}
            className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/20
                       text-red-400/70 hover:text-red-400 text-[10px] font-black px-3 py-2
                       rounded-lg tracking-widest uppercase transition-all cursor-pointer"
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

  const [products, setProducts]           = useState<Product[]>([])
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)

  const [orders, setOrders]               = useState<Order[]>([])
  const [reviewingOrder, setReviewingOrder] = useState<Order | null>(null)
  const [orderFilter, setOrderFilter]     = useState('')
  const [orderSearch, setOrderSearch]     = useState('')
  const [orderPage, setOrderPage]         = useState(1)

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

  const handleAddProduct = async (fd: FormData, _deletedIds: number[]) => {
    await fetch('/api/shop/create/', {
      method: 'POST',
      credentials: 'include',
      headers: { 'X-CSRFToken': getCsrf() },
      body: fd,
    })
    loadProducts()
  }

  const handleEditProduct = async (fd: FormData, deletedImageIds: number[]) => {
    if (!editingProduct) return
    await Promise.all(
      deletedImageIds.map(imgId =>
        fetch(`/api/shop/${editingProduct.id}/images/${imgId}/delete/`, {
          method: 'DELETE',
          credentials: 'include',
          headers: { 'X-CSRFToken': getCsrf() },
        })
      )
    )
    await fetch(`/api/shop/${editingProduct.id}/update/`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'X-CSRFToken': getCsrf() },
      body: fd,
    })
    loadProducts()
  }

  const handleDeleteProduct = async (id: number, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
    await fetch(`/api/shop/${id}/delete/`, {
      method: 'DELETE',
      credentials: 'include',
      headers: { 'X-CSRFToken': getCsrf() },
    })
    loadProducts()
  }

  const handleSaveOrder = async (id: number, data: { status: string; notes: string }) => {
    await fetch(`/api/shop/orders/${id}/`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'X-CSRFToken': getCsrf(), 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    loadOrders()
  }

  const handleDeleteOrder = async (id: number) => {
    if (!confirm('Delete this order permanently?')) return
    await fetch(`/api/shop/orders/${id}/delete/`, {
      method: 'DELETE',
      credentials: 'include',
      headers: { 'X-CSRFToken': getCsrf() },
    })
    loadOrders()
  }

  const filteredOrders = orders.filter(o => {
    if (!orderSearch) return true
    const q = orderSearch.toLowerCase()
    return (
      o.full_name.toLowerCase().includes(q)    ||
      o.email.toLowerCase().includes(q)         ||
      o.phone.includes(q)                        ||
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
    pending:   '#fbbf24',
    confirmed: '#a855f7',
    shipped:   '#60a5fa',
    delivered: '#34d399',
    cancelled: '#f87171',
  }

  return (
    <div>
      {/* Tab switcher */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-1">
          {([
            ['products', '🛍 Products'],
            ['orders',   '📦 Orders'],
          ] as const).map(([t, l]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-lg text-xs font-black tracking-widest uppercase
                          transition-all duration-150 cursor-pointer
                ${tab === t
                  ? 'bg-purple-600/30 text-purple-300 border border-purple-500/30'
                  : 'text-white/35 hover:text-white/60'
                }`}
            >
              {l}
              {t === 'orders' && orderStats.pending > 0 && (
                <span className="ml-2 inline-flex items-center justify-center w-4 h-4 rounded-full
                                 bg-yellow-500/20 text-yellow-400 text-[9px] font-black
                                 border border-yellow-500/30">
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

      {/* ── Products tab ── */}
      {tab === 'products' && (
        <>
          {products.length === 0 ? (
            <div className="border border-dashed border-white/10 rounded-2xl p-16 text-center">
              <div className="text-white/10 text-6xl mb-4">🛍</div>
              <p className="text-white/25 text-sm tracking-widest uppercase mb-6">No products yet</p>
              <button
                onClick={() => setShowAddProduct(true)}
                className="bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30
                           text-purple-300 font-black px-6 py-3 rounded-xl text-xs tracking-widest
                           uppercase transition-all cursor-pointer"
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

      {/* ── Orders tab ── */}
      {tab === 'orders' && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
            {[
              { label: 'Total',     val: orderStats.total,     color: '#a855f7' },
              { label: 'Pending',   val: orderStats.pending,   color: '#fbbf24' },
              { label: 'Confirmed', val: orderStats.confirmed, color: '#a855f7' },
              { label: 'Shipped',   val: orderStats.shipped,   color: '#60a5fa' },
              { label: 'Delivered', val: orderStats.delivered, color: '#34d399' },
            ].map(s => (
              <div
                key={s.label}
                className="bg-white/4 border border-white/8 rounded-2xl p-4 text-center"
              >
                <p className="text-white/30 text-[10px] font-bold tracking-widest uppercase mb-1">
                  {s.label}
                </p>
                <p
                  className="font-black text-2xl"
                  style={{ fontFamily: "'Barlow Condensed', sans-serif", color: s.color }}
                >
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
            <FilterSelect
              value={orderFilter}
              onChange={v => { setOrderFilter(v); setOrderPage(1) }}
            >
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
              const dotColor = STATUS_DOT[o.status] || '#fff'
              const formattedDate = (() => {
                try {
                  return new Date(o.submitted_at).toLocaleDateString('en-GB', {
                    day: 'numeric', month: 'short', year: 'numeric',
                  })
                } catch { return o.submitted_at }
              })()
              const firstCustom = Object.entries(o.custom_field_values || {}).find(([, v]) => v)

              return (
                <div
                  key={o.id}
                  className="bg-white/4 border border-white/8 rounded-2xl px-5 py-4
                             flex items-center gap-4 hover:border-purple-500/20 transition-colors"
                >
                  <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-white/10
                                  bg-purple-900/20 flex items-center justify-center">
                    {o.product_banner ? (
                      <img src={o.product_banner} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <span className="text-purple-400 text-lg">🛒</span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="text-white font-bold text-sm">{o.full_name}</span>
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full
                                   flex items-center gap-1"
                        style={{
                          background: `${dotColor}15`,
                          color: dotColor,
                          border: `1px solid ${dotColor}30`,
                        }}
                      >
                        <span className="w-1 h-1 rounded-full" style={{ background: dotColor }} />
                        {o.status}
                      </span>
                    </div>
                    <p className="text-white/40 text-xs truncate">
                      {o.product_name}
                      {o.variant_display && ` · ${o.variant_display}`}
                      {` · Qty: ${o.quantity}`}
                      {o.wilaya_label && ` · ${o.wilaya_label}`}
                    </p>
                    {firstCustom && (
                      <p className="text-purple-400/50 text-[10px] mt-0.5 truncate">
                        ✏ {firstCustom[0]}:{' '}
                        <span className="text-purple-300/70">{firstCustom[1]}</span>
                      </p>
                    )}
                    <p className="text-white/20 text-[10px] mt-0.5">
                      {formattedDate} · {o.email}
                    </p>
                  </div>

                  <div className="flex gap-2 shrink-0">
                    <ActionButton onClick={() => setReviewingOrder(o)}>Manage</ActionButton>
                    <ActionButton variant="danger" onClick={() => handleDeleteOrder(o.id)}>
                      Delete
                    </ActionButton>
                  </div>
                </div>
              )
            })}
          </div>

          <Pagination page={orderPage} totalPages={orderTotalPages} onPage={setOrderPage} />
        </>
      )}

      {/* Modals */}
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