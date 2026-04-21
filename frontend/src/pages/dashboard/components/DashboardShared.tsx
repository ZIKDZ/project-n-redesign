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
      className={`text-xs font-bold px-4 py-2 rounded-lg tracking-wider uppercase transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed ${styles[variant]}`}
    >
      {children}
    </button>
  )
}
