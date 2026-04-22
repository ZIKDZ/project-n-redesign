// Shared components used across dashboard sections

export function getCsrfToken(): string {
  const value = `; ${document.cookie}`
  const parts = value.split(`; csrftoken=`)
  if (parts.length === 2) return parts.pop()!.split(';').shift() || ''
  return ''
}

// ── Badge ─────────────────────────────────────────────────────────────────────
export function Badge({
  children,
  color = 'purple',
}: {
  children: React.ReactNode
  color?: 'purple' | 'green' | 'red' | 'yellow' | 'gray'
}) {
  const colors = {
    purple: 'bg-purple-500/15 text-purple-300 border-purple-500/25',
    green:  'bg-green-500/15  text-green-400  border-green-500/25',
    red:    'bg-red-500/15    text-red-400    border-red-500/25',
    yellow: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/25',
    gray:   'bg-white/5       text-white/40   border-white/10',
  }
  return (
    <span
      className={`inline-flex items-center text-xs font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${colors[color]}`}
    >
      {children}
    </span>
  )
}

// ── StatCard ──────────────────────────────────────────────────────────────────
export function StatCard({
  label,
  value,
  sub,
}: {
  label: string
  value: number | string
  sub?: string
}) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
      <p className="text-white/40 text-xs font-bold tracking-widest uppercase mb-2">{label}</p>
      <p
        className="text-white font-black text-4xl"
        style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
      >
        {value}
      </p>
      {sub && <p className="text-white/30 text-xs mt-1">{sub}</p>}
    </div>
  )
}

// ── SectionHeader ─────────────────────────────────────────────────────────────
export function SectionHeader({
  title,
  action,
}: {
  title: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between mb-6">
      <h2
        className="text-white font-black text-2xl uppercase tracking-wide"
        style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
      >
        {title}
      </h2>
      {action}
    </div>
  )
}

// ── ActionButton ──────────────────────────────────────────────────────────────
export function ActionButton({
  onClick,
  children,
  variant = 'primary',
  disabled,
}: {
  onClick: () => void
  children: React.ReactNode
  variant?: 'primary' | 'danger' | 'ghost'
  disabled?: boolean
}) {
  const styles = {
    primary: 'bg-purple-600 hover:bg-purple-500 text-white',
    danger:  'bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30',
    ghost:   'bg-white/5 hover:bg-white/10 text-white/60 border border-white/10',
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`text-xs font-bold px-4 py-2 rounded-lg tracking-wider uppercase transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ${styles[variant]}`}
    >
      {children}
    </button>
  )
}

// ── FilterSelect ──────────────────────────────────────────────────────────────
export function FilterSelect({
  value,
  onChange,
  children,
}: {
  value: string
  onChange: (value: string) => void
  children: React.ReactNode
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="bg-[#1a0030] border border-white/10 text-white text-xs px-3 py-2 rounded-lg cursor-pointer focus:outline-none focus:border-purple-500/60 transition-colors duration-200"
    >
      {children}
    </select>
  )
}

// ── FilterOption ──────────────────────────────────────────────────────────────
export function FilterOption({
  value,
  children,
}: {
  value: string
  children: React.ReactNode
}) {
  return (
    <option value={value} className="bg-[#1a0030] text-white">
      {children}
    </option>
  )
}

// ── SearchBar ─────────────────────────────────────────────────────────────────
export function SearchBar({
  value,
  onChange,
  placeholder = 'Search…',
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  return (
    <div className="relative">
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none"
        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
      >
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="bg-white/5 border border-white/10 rounded-lg pl-8 pr-8 py-2 text-white text-xs placeholder-white/25 focus:outline-none focus:border-purple-500/60 transition-colors duration-200 w-44"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors cursor-pointer"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  )
}

// ── Pagination ────────────────────────────────────────────────────────────────
export function Pagination({
  page,
  totalPages,
  onPage,
}: {
  page: number
  totalPages: number
  onPage: (page: number) => void
}) {
  // Always render the container so layout doesn't shift when < 2 pages
  const pages: (number | '…')[] = []
  if (totalPages > 1) {
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      pages.push(1)
      if (page > 3) pages.push('…')
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i)
      if (page < totalPages - 2) pages.push('…')
      pages.push(totalPages)
    }
  }

  const btnBase =
    'w-8 h-8 rounded-lg text-xs font-bold tracking-wider transition-all duration-150 flex items-center justify-center cursor-pointer'

  return (
    <div className="flex items-center justify-center gap-1.5 mt-6 h-10 select-none">
      {totalPages > 1 && (
        <>
          <button
            onClick={() => onPage(page - 1)}
            disabled={page === 1}
            className={`${btnBase} bg-white/5 border border-white/10 text-white/50 hover:text-white hover:border-purple-500/40 disabled:opacity-30 disabled:cursor-not-allowed`}
          >
            ‹
          </button>

          {pages.map((p, i) =>
            p === '…' ? (
              <span key={`ellipsis-${i}`} className="w-8 h-8 flex items-center justify-center text-white/20 text-xs">
                …
              </span>
            ) : (
              <button
                key={p}
                onClick={() => onPage(p as number)}
                className={`${btnBase} ${
                  p === page
                    ? 'bg-purple-600/30 border border-purple-500/50 text-purple-300'
                    : 'bg-white/5 border border-white/10 text-white/50 hover:text-white hover:border-purple-500/40'
                }`}
              >
                {p}
              </button>
            )
          )}

          <button
            onClick={() => onPage(page + 1)}
            disabled={page === totalPages}
            className={`${btnBase} bg-white/5 border border-white/10 text-white/50 hover:text-white hover:border-purple-500/40 disabled:opacity-30 disabled:cursor-not-allowed`}
          >
            ›
          </button>
        </>
      )}
    </div>
  )
}