import { useState, useCallback, useEffect, useRef } from 'react'
import { getCsrfToken } from '../../DashboardShared'
import { inputCls, labelCls, selectCls } from './types'

const getCsrf = getCsrfToken

// ── Types ─────────────────────────────────────────────────────────────────────

interface Coupon {
  id: number
  code: string
  discount_type: 'fixed' | 'percentage'
  value: string
  allowed_products: number[]
  minimum_order_amount: string
  expiration_date: string | null
  is_active: boolean
  created_at: string
}

interface Product {
  id: number
  name: string
  category: string
  banner: string
}

interface CouponForm {
  code: string
  discount_type: 'fixed' | 'percentage'
  value: string
  allowed_products: number[]
  minimum_order_amount: string
  expiration_date: string
  is_active: boolean
}

const EMPTY_FORM: CouponForm = {
  code: '',
  discount_type: 'percentage',
  value: '',
  allowed_products: [],
  minimum_order_amount: '0',
  expiration_date: '',
  is_active: true,
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function isExpired(dateStr: string | null): boolean {
  if (!dateStr) return false
  return new Date(dateStr) < new Date(new Date().toDateString())
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
    })
  } catch { return dateStr }
}

// ── ProductPicker ─────────────────────────────────────────────────────────────

function ProductPicker({
  selected,
  products,
  onChange,
}: {
  selected: number[]
  products: Product[]
  onChange: (ids: number[]) => void
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

  const toggle = (id: number) => {
    onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id])
  }

  const selectedNames = selected.length === 0
    ? 'All products'
    : selected.length === 1
    ? products.find(p => p.id === selected[0])?.name ?? '1 product'
    : `${selected.length} products selected`

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`${inputCls} flex items-center justify-between gap-2 text-left cursor-pointer`}
        style={{ background: 'rgba(255,255,255,0.05)' }}
      >
        <span className={selected.length === 0 ? 'text-white/40' : 'text-white'}>
          {selectedNames}
        </span>
        <svg
          className={`w-3.5 h-3.5 text-white/30 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute z-50 top-full left-0 right-0 mt-1 rounded-xl border border-white/10 overflow-hidden shadow-2xl shadow-black/50"
          style={{ background: '#1a0030', maxHeight: '220px', overflowY: 'auto' }}
        >
          {/* "All products" option */}
          <button
            type="button"
            onClick={() => { onChange([]); setOpen(false) }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 text-left text-xs transition-colors cursor-pointer ${
              selected.length === 0
                ? 'bg-purple-600/25 text-purple-300'
                : 'text-white/60 hover:bg-white/5 hover:text-white'
            }`}
          >
            <span
              className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                selected.length === 0
                  ? 'bg-purple-600 border-purple-500'
                  : 'border-white/20'
              }`}
            >
              {selected.length === 0 && (
                <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </span>
            <span className="font-bold tracking-wide">All products</span>
          </button>

          <div className="border-t border-white/8" />

          {products.map(p => {
            const checked = selected.includes(p.id)
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => toggle(p.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left text-xs transition-colors cursor-pointer ${
                  checked ? 'bg-purple-600/15 text-purple-200' : 'text-white/55 hover:bg-white/5 hover:text-white'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                    checked ? 'bg-purple-600 border-purple-500' : 'border-white/20'
                  }`}
                >
                  {checked && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </span>
                {p.banner && (
                  <img src={p.banner} alt="" className="w-6 h-6 rounded object-cover shrink-0 opacity-70" />
                )}
                <span className="truncate font-medium">{p.name}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── CouponModal ───────────────────────────────────────────────────────────────

function CouponModal({
  initial,
  isEdit,
  products,
  onSave,
  onClose,
}: {
  initial: Partial<Coupon>
  isEdit: boolean
  products: Product[]
  onSave: (data: CouponForm) => Promise<void>
  onClose: () => void
}) {
  const backdropRef = useRef<HTMLDivElement>(null)
  const [form, setForm] = useState<CouponForm>({
    code:                 initial.code             || '',
    discount_type:        initial.discount_type    || 'percentage',
    value:                initial.value            || '',
    allowed_products:     initial.allowed_products || [],
    minimum_order_amount: initial.minimum_order_amount || '0',
    expiration_date:      initial.expiration_date  || '',
    is_active:            initial.is_active        !== false,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const set = <K extends keyof CouponForm>(key: K, val: CouponForm[K]) =>
    setForm(p => ({ ...p, [key]: val }))

  const handleSubmit = async () => {
    if (!form.code.trim() || !form.value) {
      setError('Code and discount value are required.')
      return
    }
    if (form.discount_type === 'percentage' && (parseFloat(form.value) < 0 || parseFloat(form.value) > 100)) {
      setError('Percentage value must be between 0 and 100.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await onSave(form)
      onClose()
    } catch (e: any) {
      setError(e.message || 'Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === backdropRef.current && window.getSelection()?.toString() === '') onClose()
  }

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    const code   = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
    set('code', code)
  }

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(4px)' }}
      onClick={handleBackdrop}
    >
      <div
        className="bg-[#13001f] border border-white/10 rounded-3xl w-full max-w-lg shadow-2xl shadow-purple-900/30 flex flex-col my-auto"
        style={{ maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-white/8 shrink-0">
          <div>
            <h3
              className="text-white font-black text-base uppercase tracking-wide"
              style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
            >
              {isEdit ? `Edit — ${initial.code}` : 'New Coupon'}
            </h3>
            <p className="text-white/30 text-[10px] tracking-widest mt-0.5">
              {isEdit ? 'Update coupon details' : 'Create a discount coupon'}
            </p>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white transition-colors text-xl cursor-pointer">✕</button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5" style={{ scrollbarWidth: 'none' }}>

          {/* Code */}
          <div>
            <label className={labelCls}>Coupon Code *</label>
            <div className="flex gap-2">
              <input
                placeholder="e.g. SUMMER20"
                value={form.code}
                onChange={e => set('code', e.target.value.toUpperCase())}
                className={inputCls + ' flex-1 font-mono tracking-widest'}
                style={{ letterSpacing: '0.15em' }}
              />
              <button
                type="button"
                onClick={generateCode}
                title="Generate random code"
                className="bg-white/5 border border-white/10 hover:border-purple-500/40 hover:bg-purple-500/10
                           text-white/50 hover:text-purple-300 text-[10px] font-black px-3 py-2 rounded-lg
                           tracking-wider uppercase transition-all cursor-pointer whitespace-nowrap"
              >
                Random
              </button>
            </div>
          </div>

          {/* Type + Value */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Discount Type *</label>
              <select
                value={form.discount_type}
                onChange={e => set('discount_type', e.target.value as 'fixed' | 'percentage')}
                className={selectCls}
              >
                <option value="percentage" className="bg-[#1a0030]">Percentage (%)</option>
                <option value="fixed"      className="bg-[#1a0030]">Fixed Amount (DZD)</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>
                Value * {form.discount_type === 'percentage' ? '(0–100 %)' : '(DZD)'}
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max={form.discount_type === 'percentage' ? 100 : undefined}
                  step={form.discount_type === 'percentage' ? 1 : 0.01}
                  placeholder={form.discount_type === 'percentage' ? '20' : '500'}
                  value={form.value}
                  onChange={e => set('value', e.target.value)}
                  className={inputCls + ' pr-8'}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 text-[10px] font-bold pointer-events-none">
                  {form.discount_type === 'percentage' ? '%' : 'DZD'}
                </span>
              </div>
            </div>
          </div>

          {/* Minimum order amount */}
          <div>
            <label className={labelCls}>Minimum Order Amount (DZD)</label>
            <div className="relative">
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0 — no minimum"
                value={form.minimum_order_amount}
                onChange={e => set('minimum_order_amount', e.target.value)}
                className={inputCls + ' pr-12'}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 text-[10px] font-bold pointer-events-none">DZD</span>
            </div>
            <p className="text-white/20 text-[10px] mt-1">Leave as 0 to allow on any order value.</p>
          </div>

          {/* Allowed products */}
          <div>
            <label className={labelCls}>
              Applies To
              {form.allowed_products.length > 0 && (
                <button
                  type="button"
                  onClick={() => set('allowed_products', [])}
                  className="ml-2 text-purple-400/60 hover:text-purple-400 text-[10px] normal-case font-bold transition-colors cursor-pointer"
                >
                  (clear — use all)
                </button>
              )}
            </label>
            <ProductPicker
              selected={form.allowed_products}
              products={products}
              onChange={ids => set('allowed_products', ids)}
            />
            <p className="text-white/20 text-[10px] mt-1">
              {form.allowed_products.length === 0
                ? 'Coupon applies to every product in the store.'
                : `Restricted to ${form.allowed_products.length} selected product${form.allowed_products.length > 1 ? 's' : ''}.`}
            </p>
          </div>

          {/* Expiration */}
          <div>
            <label className={labelCls}>Expiration Date</label>
            <input
              type="date"
              value={form.expiration_date}
              onChange={e => set('expiration_date', e.target.value)}
              className={inputCls}
              style={{ colorScheme: 'dark' }}
            />
            <p className="text-white/20 text-[10px] mt-1">Leave blank for no expiry.</p>
          </div>

          {/* Active toggle */}
          <div className="flex items-center gap-3 bg-white/3 border border-white/8 rounded-xl p-3">
            <button
              type="button"
              onClick={() => set('is_active', !form.is_active)}
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
              <p className="text-white/20 text-[10px] mt-0.5">
                {form.is_active ? 'Coupon can be applied at checkout' : 'Coupon is disabled'}
              </p>
            </div>
          </div>

          {error && (
            <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
              ⚠ {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-white/8 shrink-0">
          <button
            onClick={handleSubmit}
            disabled={saving || !form.code.trim() || !form.value}
            className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed
                       text-white font-black px-6 py-2.5 rounded-xl text-xs tracking-widest uppercase
                       transition-all cursor-pointer"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Coupon'}
          </button>
          <button
            onClick={onClose}
            className="bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white
                       text-xs font-bold px-4 py-2 rounded-lg tracking-wider uppercase transition-all
                       duration-200 cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ── CouponCard ────────────────────────────────────────────────────────────────

function CouponCard({
  coupon,
  products,
  onEdit,
  onDelete,
  onToggle,
}: {
  coupon: Coupon
  products: Product[]
  onEdit: () => void
  onDelete: () => void
  onToggle: () => void
}) {
  const expired    = isExpired(coupon.expiration_date)
  const effectivelyActive = coupon.is_active && !expired

  const allowedNames = coupon.allowed_products.length === 0
    ? null
    : coupon.allowed_products
        .map(id => products.find(p => p.id === id)?.name ?? `#${id}`)
        .slice(0, 3)

  const extraCount = coupon.allowed_products.length > 3
    ? coupon.allowed_products.length - 3
    : 0

  return (
    <div
      className={`relative border rounded-2xl p-5 flex flex-col gap-4 transition-all duration-200
        hover:border-purple-500/25 ${!effectivelyActive ? 'opacity-55' : ''}`}
      style={{ background: '#0c001a', borderColor: 'rgba(255,255,255,0.08)' }}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Code */}
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span
              className="font-black text-white text-xl tracking-widest font-mono"
              style={{ fontFamily: 'monospace, monospace', letterSpacing: '0.12em' }}
            >
              {coupon.code}
            </span>
            {/* Copy button */}
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(coupon.code)}
              title="Copy code"
              className="text-white/20 hover:text-purple-400 transition-colors cursor-pointer p-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
              </svg>
            </button>
          </div>

          {/* Discount badge */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className="inline-flex items-center text-[10px] font-black tracking-widest uppercase px-2.5 py-1 rounded-full"
              style={
                coupon.discount_type === 'percentage'
                  ? { background: 'rgba(168,85,247,0.2)', color: '#c084fc', border: '1px solid rgba(168,85,247,0.35)' }
                  : { background: 'rgba(52,211,153,0.15)', color: '#34d399', border: '1px solid rgba(52,211,153,0.3)' }
              }
            >
              {coupon.discount_type === 'percentage'
                ? `${coupon.value}% off`
                : `${parseInt(coupon.value).toLocaleString()} DZD off`}
            </span>

            {parseFloat(coupon.minimum_order_amount) > 0 && (
              <span className="text-[10px] text-white/30 font-bold">
                min {parseInt(coupon.minimum_order_amount).toLocaleString()} DZD
              </span>
            )}
          </div>
        </div>

        {/* Status pill */}
        <div className="shrink-0">
          {expired ? (
            <span className="text-[10px] font-black tracking-widest uppercase px-2.5 py-1 rounded-full bg-red-500/15 text-red-400 border border-red-500/25">
              Expired
            </span>
          ) : coupon.is_active ? (
            <span className="text-[10px] font-black tracking-widest uppercase px-2.5 py-1 rounded-full bg-green-500/15 text-green-400 border border-green-500/25 flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-green-400 animate-pulse" />
              Active
            </span>
          ) : (
            <span className="text-[10px] font-black tracking-widest uppercase px-2.5 py-1 rounded-full bg-white/5 text-white/30 border border-white/10">
              Inactive
            </span>
          )}
        </div>
      </div>

      {/* Details row */}
      <div className="grid grid-cols-2 gap-3 text-[10px]">
        <div>
          <p className="text-white/25 font-bold tracking-widest uppercase mb-1">Applies To</p>
          {allowedNames === null ? (
            <p className="text-white/50 font-semibold">All products</p>
          ) : (
            <div className="space-y-0.5">
              {allowedNames.map(name => (
                <p key={name} className="text-white/50 font-semibold truncate">{name}</p>
              ))}
              {extraCount > 0 && (
                <p className="text-white/30">+{extraCount} more</p>
              )}
            </div>
          )}
        </div>
        <div>
          <p className="text-white/25 font-bold tracking-widest uppercase mb-1">Expires</p>
          <p className={`font-semibold ${expired ? 'text-red-400/70' : 'text-white/50'}`}>
            {formatDate(coupon.expiration_date)}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2 border-t border-white/5">
        <button
          onClick={onToggle}
          className="flex-1 bg-white/4 hover:bg-white/8 border border-white/8 hover:border-white/15
                     text-white/40 hover:text-white/70 text-[10px] font-black py-2 rounded-lg
                     tracking-widest uppercase transition-all cursor-pointer"
        >
          {coupon.is_active ? 'Deactivate' : 'Activate'}
        </button>
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
          className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400/70 hover:text-red-400
                     text-[10px] font-black px-3 py-2 rounded-lg tracking-widest uppercase transition-all cursor-pointer"
        >
          Delete
        </button>
      </div>
    </div>
  )
}

// ── CouponsTab ────────────────────────────────────────────────────────────────

export default function CouponsTab() {
  const [coupons, setCoupons]       = useState<Coupon[]>([])
  const [products, setProducts]     = useState<Product[]>([])
  const [loading, setLoading]       = useState(true)
  const [showModal, setShowModal]   = useState(false)
  const [editing, setEditing]       = useState<Coupon | null>(null)
  const [filterStatus, setFilter]   = useState<'all' | 'active' | 'inactive' | 'expired'>('all')

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/shop/coupons/', { credentials: 'include' }).then(r => r.json()),
      fetch('/api/shop/all/',     { credentials: 'include' }).then(r => r.json()),
    ])
      .then(([cData, pData]) => {
        setCoupons(cData.coupons || [])
        setProducts(pData.products || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const handleCreate = async (form: CouponForm) => {
    const res = await fetch('/api/shop/coupons/create/', {
      method: 'POST',
      credentials: 'include',
      headers: { 'X-CSRFToken': getCsrf(), 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || 'Failed to create coupon')
    }
    load()
  }

  const handleUpdate = async (form: CouponForm) => {
    if (!editing) return
    const res = await fetch(`/api/shop/coupons/${editing.id}/`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'X-CSRFToken': getCsrf(), 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || 'Failed to update coupon')
    }
    load()
  }

  const handleDelete = async (coupon: Coupon) => {
    if (!confirm(`Delete coupon "${coupon.code}"? This cannot be undone.`)) return
    await fetch(`/api/shop/coupons/${coupon.id}/delete/`, {
      method: 'DELETE',
      credentials: 'include',
      headers: { 'X-CSRFToken': getCsrf() },
    })
    load()
  }

  const handleToggle = async (coupon: Coupon) => {
    await fetch(`/api/shop/coupons/${coupon.id}/`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'X-CSRFToken': getCsrf(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !coupon.is_active }),
    })
    load()
  }

  const filtered = coupons.filter(c => {
    if (filterStatus === 'active')   return c.is_active && !isExpired(c.expiration_date)
    if (filterStatus === 'inactive') return !c.is_active
    if (filterStatus === 'expired')  return isExpired(c.expiration_date)
    return true
  })

  const stats = {
    total:    coupons.length,
    active:   coupons.filter(c => c.is_active && !isExpired(c.expiration_date)).length,
    inactive: coupons.filter(c => !c.is_active).length,
    expired:  coupons.filter(c => isExpired(c.expiration_date)).length,
  }

  const FILTER_BTNS = [
    { id: 'all',      label: `All (${stats.total})` },
    { id: 'active',   label: `Active (${stats.active})` },
    { id: 'inactive', label: `Inactive (${stats.inactive})` },
    { id: 'expired',  label: `Expired (${stats.expired})` },
  ] as const

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h3
            className="text-white font-black text-lg uppercase tracking-wide"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            Coupons
          </h3>
          <p className="text-white/25 text-[10px] tracking-widest mt-0.5">
            Create and manage discount codes for your shop
          </p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowModal(true) }}
          className="bg-purple-600 hover:bg-purple-500 text-white font-black px-5 py-2.5 rounded-xl
                     text-xs tracking-widest uppercase transition-all cursor-pointer
                     hover:shadow-lg hover:shadow-purple-500/25 hover:-translate-y-0.5"
          style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
        >
          + New Coupon
        </button>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total',    val: stats.total,    color: '#a855f7' },
          { label: 'Active',   val: stats.active,   color: '#34d399' },
          { label: 'Inactive', val: stats.inactive, color: '#94a3b8' },
          { label: 'Expired',  val: stats.expired,  color: '#f87171' },
        ].map(s => (
          <div key={s.label} className="bg-white/4 border border-white/8 rounded-2xl p-3 text-center">
            <p className="text-white/25 text-[10px] font-bold tracking-widest uppercase mb-1">{s.label}</p>
            <p
              className="font-black text-2xl"
              style={{ fontFamily: "'Barlow Condensed', sans-serif", color: s.color }}
            >
              {s.val}
            </p>
          </div>
        ))}
      </div>

      {/* Filter pills */}
      <div className="flex items-center gap-1.5 mb-5 flex-wrap">
        {FILTER_BTNS.map(btn => (
          <button
            key={btn.id}
            onClick={() => setFilter(btn.id)}
            className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase
                        transition-all duration-150 cursor-pointer ${
              filterStatus === btn.id
                ? 'bg-purple-600/25 text-purple-300 border border-purple-500/30'
                : 'bg-white/4 text-white/35 border border-white/8 hover:text-white/60'
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="border border-dashed border-white/10 rounded-2xl p-14 text-center">
          <div className="text-white/10 text-5xl mb-4">🏷</div>
          <p className="text-white/25 text-sm tracking-widest uppercase mb-5">
            {filterStatus === 'all' ? 'No coupons yet' : `No ${filterStatus} coupons`}
          </p>
          {filterStatus === 'all' && (
            <button
              onClick={() => { setEditing(null); setShowModal(true) }}
              className="bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30
                         text-purple-300 font-black px-5 py-2.5 rounded-xl text-xs tracking-widest
                         uppercase transition-all cursor-pointer"
            >
              Create Your First Coupon →
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(c => (
            <CouponCard
              key={c.id}
              coupon={c}
              products={products}
              onEdit={() => { setEditing(c); setShowModal(true) }}
              onDelete={() => handleDelete(c)}
              onToggle={() => handleToggle(c)}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <CouponModal
          initial={editing ?? {}}
          isEdit={!!editing}
          products={products}
          onSave={editing ? handleUpdate : handleCreate}
          onClose={() => { setShowModal(false); setEditing(null) }}
        />
      )}
    </>
  )
}
