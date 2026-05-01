// ShopSection.tsx
import { useState, useCallback } from 'react'
import { ActionButton } from '../../DashboardShared'
import ProductsTab from './ProductsTab'
import OrdersTab   from './OrdersTab'

type Tab = 'products' | 'orders'

export default function ShopSection() {
  const [tab, setTab]               = useState<Tab>('products')
  const [pendingCount, setPending]  = useState(0)

  const handlePendingCount = useCallback((n: number) => setPending(n), [])

  return (
    <div>
      {/* ── Tab switcher ── */}
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
              {t === 'orders' && pendingCount > 0 && (
                <span className="ml-2 inline-flex items-center justify-center w-4 h-4 rounded-full
                                 bg-yellow-500/20 text-yellow-400 text-[9px] font-black
                                 border border-yellow-500/30">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* "Add Product" lives inside ProductsTab; kept here only if you want it at the top level */}
      </div>

      {/* ── Tab content ── */}
      {tab === 'products' && <ProductsTab />}
      {tab === 'orders'   && <OrdersTab onPendingCount={handlePendingCount} />}
    </div>
  )
}