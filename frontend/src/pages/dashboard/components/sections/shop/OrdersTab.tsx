import { useState, useRef, useCallback, useEffect } from 'react'
import { ActionButton, FilterSelect, FilterOption, SearchBar, Pagination, getCsrfToken } from '../../DashboardShared'
import { Order, PAGE_SIZE, selectCls } from './types'

const getCsrf = getCsrfToken

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending:   { label: 'Pending',   color: '#fbbf24', bg: 'rgba(251,191,36,0.15)'  },
  confirmed: { label: 'Confirmed', color: '#a855f7', bg: 'rgba(168,85,247,0.15)'  },
  shipped:   { label: 'Shipped',   color: '#60a5fa', bg: 'rgba(96,165,250,0.15)'  },
  delivered: { label: 'Delivered', color: '#34d399', bg: 'rgba(52,211,153,0.15)'  },
  cancelled: { label: 'Cancelled', color: '#f87171', bg: 'rgba(248,113,113,0.15)' },
}

const STATUS_STEPS = ['pending', 'confirmed', 'shipped', 'delivered']

const STATUS_DOT: Record<string, string> = {
  pending:   '#fbbf24',
  confirmed: '#a855f7',
  shipped:   '#60a5fa',
  delivered: '#34d399',
  cancelled: '#f87171',
}

// ── OrderModal ────────────────────────────────────────────────────────────────

function OrderModal({ order, onSave, onClose }: {
  order: Order
  onSave: (id: number, data: { status: string; notes: string }) => Promise<void>
  onClose: () => void
}) {
  const [status, setStatus] = useState(order.status)
  const [notes, setNotes]   = useState(order.notes || '')
  const [saving, setSaving] = useState(false)
  const backdropRef         = useRef<HTMLDivElement>(null)

  const currentStep = STATUS_STEPS.indexOf(status)
  const cfg         = STATUS_CONFIG[status] || STATUS_CONFIG.pending

  const handleSave = async () => {
    setSaving(true)
    try { await onSave(order.id, { status, notes }); onClose() }
    catch (e) { console.error(e) }
    finally { setSaving(false) }
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

  const customEntries  = Object.entries(order.custom_field_values || {}).filter(([, v]) => v)
  const variantEntries = Object.entries(order.variant_values || {}).filter(([, v]) => v)

  return (
    <div ref={backdropRef} className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(4px)' }} onClick={handleBackdropClick}>
      <div className="bg-[#13001f] border border-white/10 rounded-3xl w-full max-w-lg shadow-2xl shadow-purple-900/30 flex flex-col my-auto" style={{ maxHeight: '90vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-white/8 shrink-0">
          <div>
            <h3 className="text-white font-black text-base uppercase tracking-wide" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              Order #{order.id}
            </h3>
            <p className="text-white/30 text-[10px] tracking-widest mt-0.5">{formattedDate}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold tracking-widest uppercase px-3 py-1.5 rounded-full"
              style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}40` }}>
              {cfg.label}
            </span>
            <button onClick={onClose} className="text-white/30 hover:text-white transition-colors text-xl cursor-pointer">✕</button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-5" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>

          {/* Progress tracker */}
          {status !== 'cancelled' && (
            <div className="relative">
              <div className="flex items-center justify-between relative">
                <div className="absolute left-0 right-0 top-3.5 h-0.5 bg-white/10 z-0" />
                <div className="absolute left-0 top-3.5 h-0.5 z-0 transition-all duration-500"
                  style={{ width: `${currentStep <= 0 ? 0 : (currentStep / (STATUS_STEPS.length - 1)) * 100}%`, background: cfg.color }} />
                {STATUS_STEPS.map((s, i) => {
                  const done = i <= currentStep
                  const sCfg = STATUS_CONFIG[s]
                  return (
                    <div key={s} className="flex flex-col items-center gap-1.5 z-10">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all duration-300"
                        style={{ background: done ? sCfg.bg : 'rgba(255,255,255,0.05)', borderColor: done ? sCfg.color : 'rgba(255,255,255,0.15)' }}>
                        {done ? (
                          <svg className="w-3.5 h-3.5" style={{ color: sCfg.color }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-white/20" />
                        )}
                      </div>
                      <span className="text-[9px] font-bold tracking-widest uppercase" style={{ color: done ? sCfg.color : 'rgba(255,255,255,0.2)' }}>
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
                {order.variant_display && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/20">
                    {order.variant_display}
                  </span>
                )}
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/8 text-white/50 border border-white/10">
                  Qty: {order.quantity}
                </span>
              </div>
            </div>
          </div>

          {/* Variant values */}
          {variantEntries.length > 0 && (
            <div className="bg-blue-500/8 border border-blue-500/20 rounded-2xl p-4 space-y-2">
              <p className="text-blue-300/60 text-[10px] font-bold tracking-widest uppercase mb-3">Variant Details</p>
              {variantEntries.map(([label, value]) => (
                <div key={label} className="flex justify-between items-start py-1.5 border-b border-white/5 gap-3 last:border-0">
                  <span className="text-white/35 text-xs font-bold tracking-widest uppercase shrink-0">{label}</span>
                  <span className="text-white text-xs text-right font-bold">{value}</span>
                </div>
              ))}
            </div>
          )}

          {/* Custom field values */}
          {customEntries.length > 0 && (
            <div className="bg-purple-500/8 border border-purple-500/20 rounded-2xl p-4 space-y-2">
              <p className="text-purple-300/60 text-[10px] font-bold tracking-widest uppercase mb-3">Personalisation</p>
              {customEntries.map(([label, value]) => (
                <div key={label} className="flex justify-between items-start py-1.5 border-b border-white/5 gap-3 last:border-0">
                  <span className="text-white/35 text-xs font-bold tracking-widest uppercase shrink-0">{label}</span>
                  <span className="text-white text-xs text-right font-bold">{value}</span>
                </div>
              ))}
            </div>
          )}

          {/* Customer details */}
          <div className="space-y-2">
            <p className="text-white/30 text-[10px] font-bold tracking-widest uppercase mb-2">Customer</p>
            {[
              { label: 'Name',     value: order.full_name },
              { label: 'Email',    value: order.email },
              { label: 'Phone',    value: order.phone },
              { label: 'Wilaya',   value: order.wilaya_label || order.wilaya },
              { label: 'Baladiya', value: order.baladiya },
              { label: 'Address',  value: order.address },
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
            <select value={status} onChange={e => setStatus(e.target.value)} className={selectCls}>
              {Object.entries(STATUS_CONFIG).map(([v, c]) => (
                <option key={v} value={v} className="bg-[#1a0030]">{c.label}</option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-white/40 text-[10px] font-bold tracking-widest uppercase mb-1">Staff Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Internal notes about this order…"
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-xs placeholder-white/20 focus:outline-none focus:border-purple-500/60 resize-none h-20 w-full" />
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-white/8 shrink-0">
          <button onClick={handleSave} disabled={saving}
            className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-black px-6 py-2.5 rounded-xl text-xs tracking-widest uppercase transition-all cursor-pointer"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
          <ActionButton variant="ghost" onClick={onClose}>Close</ActionButton>
        </div>
      </div>
    </div>
  )
}

// ── OrdersTab ─────────────────────────────────────────────────────────────────

export default function OrdersTab({ onPendingCount }: { onPendingCount: (n: number) => void }) {
  const [orders, setOrders]                 = useState<Order[]>([])
  const [reviewingOrder, setReviewingOrder] = useState<Order | null>(null)
  const [orderFilter, setOrderFilter]       = useState('')
  const [orderSearch, setOrderSearch]       = useState('')
  const [orderPage, setOrderPage]           = useState(1)

  const loadOrders = useCallback(() => {
    const qs = orderFilter ? `?status=${orderFilter}` : ''
    fetch(`/api/shop/orders/${qs}`, { credentials: 'include' })
      .then(r => r.json())
      .then(r => {
        const list = r.orders || []
        setOrders(list)
        onPendingCount(list.filter((o: Order) => o.status === 'pending').length)
      })
      .catch(() => {})
  }, [orderFilter, onPendingCount])

  useEffect(() => { loadOrders() }, [loadOrders])

  const handleSaveOrder = async (id: number, data: { status: string; notes: string }) => {
    await fetch(`/api/shop/orders/${id}/`, {
      method: 'PATCH', credentials: 'include',
      headers: { 'X-CSRFToken': getCsrf(), 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    loadOrders()
  }

  const handleDeleteOrder = async (id: number) => {
    if (!confirm('Delete this order permanently?')) return
    await fetch(`/api/shop/orders/${id}/delete/`, {
      method: 'DELETE', credentials: 'include', headers: { 'X-CSRFToken': getCsrf() },
    })
    loadOrders()
  }

  const filteredOrders = orders.filter(o => {
    if (!orderSearch) return true
    const q = orderSearch.toLowerCase()
    return (
      o.full_name.toLowerCase().includes(q) ||
      o.email.toLowerCase().includes(q)      ||
      o.phone.includes(q)                     ||
      o.product_name.toLowerCase().includes(q)
    )
  })

  const orderTotalPages = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE))
  const displayedOrders = filteredOrders.slice((orderPage - 1) * PAGE_SIZE, orderPage * PAGE_SIZE)

  const orderStats = {
    total:     orders.length,
    pending:   orders.filter(o => o.status === 'pending').length,
    confirmed: orders.filter(o => o.status === 'confirmed').length,
    shipped:   orders.filter(o => o.status === 'shipped').length,
    delivered: orders.filter(o => o.status === 'delivered').length,
  }

  return (
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
          <div key={s.label} className="bg-white/4 border border-white/8 rounded-2xl p-4 text-center">
            <p className="text-white/30 text-[10px] font-bold tracking-widest uppercase mb-1">{s.label}</p>
            <p className="font-black text-2xl" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: s.color }}>{s.val}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <SearchBar value={orderSearch} onChange={v => { setOrderSearch(v); setOrderPage(1) }} placeholder="Search orders…" />
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
          const dotColor = STATUS_DOT[o.status] || '#fff'
          const formattedDate = (() => {
            try { return new Date(o.submitted_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) }
            catch { return o.submitted_at }
          })()
          const firstCustom = Object.entries(o.custom_field_values || {}).find(([, v]) => v)

          return (
            <div key={o.id} className="bg-white/4 border border-white/8 rounded-2xl px-5 py-4 flex items-center gap-4 hover:border-purple-500/20 transition-colors">
              <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-white/10 bg-purple-900/20 flex items-center justify-center">
                {o.product_banner
                  ? <img src={o.product_banner} className="w-full h-full object-cover" alt="" />
                  : <span className="text-purple-400 text-lg">🛒</span>
                }
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <span className="text-white font-bold text-sm">{o.full_name}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"
                    style={{ background: `${dotColor}15`, color: dotColor, border: `1px solid ${dotColor}30` }}>
                    <span className="w-1 h-1 rounded-full" style={{ background: dotColor }} />
                    {o.status}
                  </span>
                </div>
                <p className="text-white/40 text-xs truncate">
                  {o.product_name}
                  {o.variant_display && ` · ${o.variant_display}`}
                  {` · Qty: ${o.quantity}`}
                  {o.wilaya_label && ` · ${o.wilaya_label}`}
                  {o.baladiya && ` · ${o.baladiya}`}
                </p>
                {firstCustom && (
                  <p className="text-purple-400/50 text-[10px] mt-0.5 truncate">
                    ✏ {firstCustom[0]}: <span className="text-purple-300/70">{firstCustom[1]}</span>
                  </p>
                )}
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

      {reviewingOrder && (
        <OrderModal order={reviewingOrder} onSave={handleSaveOrder} onClose={() => setReviewingOrder(null)} />
      )}
    </>
  )
}
