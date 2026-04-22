import { useState, useEffect } from 'react'
import { joins } from '../../../../utils/api'
import { Badge, SectionHeader, ActionButton, FilterSelect, FilterOption } from '../DashboardShared'

const GAME_LABELS: Record<string, string> = {
  rocket_league: 'Rocket League',
  valorant: 'Valorant',
  fortnite: 'Fortnite',
}

export default function JoinsSection() {
  const [data, setData] = useState<any[]>([])
  const [filter, setFilter] = useState('')
  const [reviewed, setReviewed] = useState<any | null>(null)

  const load = () => {
    ;(joins.list(filter || undefined) as Promise<any>)
      .then(r => setData(r.joins || []))
      .catch(() => {})
  }

  useEffect(() => { load() }, [filter])

  const openReview = async (j: any) => {
    if (j.status === 'pending') {
      await joins.updateStatus(j.id, { status: 'reviewing' })
      load()
    }
    setReviewed({ ...j, status: j.status === 'pending' ? 'reviewing' : j.status })
  }

  const handleAccept = async () => {
    if (!reviewed) return
    await joins.accept(reviewed.id)
    setReviewed(null)
    load()
  }

  const handleReject = async () => {
    if (!reviewed) return
    await joins.updateStatus(reviewed.id, { status: 'rejected' })
    setReviewed(null)
    load()
  }

  const statusColor = (s: string): 'green' | 'red' | 'yellow' | 'gray' =>
    s === 'accepted' ? 'green' : s === 'rejected' ? 'red' : s === 'reviewing' ? 'yellow' : 'gray'

  return (
    <div>
      <SectionHeader
        title="Join Requests"
        action={
          <FilterSelect value={filter} onChange={setFilter}>
            <FilterOption value="">All</FilterOption>
            <FilterOption value="pending">Pending</FilterOption>
            <FilterOption value="reviewing">Reviewing</FilterOption>
            <FilterOption value="accepted">Accepted</FilterOption>
            <FilterOption value="rejected">Rejected</FilterOption>
          </FilterSelect>
        }
      />

      <div className="space-y-3">
        {data.length === 0 && <p className="text-white/30 text-sm">No join requests found.</p>}
        {data.map((j: any) => (
          <div
            key={j.id}
            className="bg-white/5 border border-white/8 rounded-2xl p-5 flex flex-col md:flex-row md:items-center gap-4"
          >
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <span className="text-white font-bold">{j.username}</span>
                <Badge color={statusColor(j.status)}>{j.status}</Badge>
                <Badge color="purple">{GAME_LABELS[j.game] ?? j.game}</Badge>
              </div>
              <p className="text-white/40 text-xs">
                {j.ingame_username} · {j.rank} · {j.discord_username} · {j.email}
              </p>
              <p className="text-white/20 text-xs mt-1">
                {new Date(j.submitted_at).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {j.status !== 'accepted' && j.status !== 'rejected' && (
                <ActionButton onClick={() => openReview(j)}>Review</ActionButton>
              )}
              {j.status === 'accepted' && (
                <span className="text-xs text-green-400 font-bold tracking-wider uppercase">
                  Added to roster
                </span>
              )}
              {j.status === 'rejected' && (
                <span className="text-xs text-red-400/60 font-bold tracking-wider uppercase">
                  Rejected
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Review modal */}
      {reviewed && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setReviewed(null) }}
        >
          <div className="bg-[#13001f] border border-white/10 rounded-3xl p-8 w-full max-w-md shadow-2xl shadow-purple-900/30">
            <div className="flex items-center justify-between mb-6">
              <h3
                className="text-white font-black text-xl uppercase tracking-wide"
                style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
              >
                Application Review
              </h3>
              <button onClick={() => setReviewed(null)} className="text-white/30 hover:text-white transition-colors text-xl">
                ✕
              </button>
            </div>
            <div className="space-y-3 mb-8">
              {[
                { label: 'Username',     value: reviewed.username },
                { label: 'In-Game Name', value: reviewed.ingame_username },
                { label: 'Game',         value: GAME_LABELS[reviewed.game] ?? reviewed.game },
                { label: 'Rank',         value: reviewed.rank },
                { label: 'Discord',      value: reviewed.discord_username },
                { label: 'Email',        value: reviewed.email },
                { label: 'Submitted',    value: new Date(reviewed.submitted_at).toLocaleDateString() },
              ].map(row => (
                <div key={row.label} className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-white/40 text-xs font-bold tracking-widest uppercase">
                    {row.label}
                  </span>
                  <span className="text-white text-sm font-semibold">{row.value}</span>
                </div>
              ))}
            </div>
            <textarea
              placeholder="Internal notes (optional)…"
              defaultValue={reviewed.notes}
              onBlur={e => joins.updateStatus(reviewed.id, { notes: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none focus:border-purple-500/60 resize-none h-20 mb-6"
            />
            <div className="flex gap-3">
              <button
                onClick={handleAccept}
                className="flex-1 bg-green-600 hover:bg-green-500 text-white font-black py-3 rounded-xl text-sm tracking-widest uppercase transition-all duration-200"
                style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
              >
                Accept
              </button>
              <button
                onClick={handleReject}
                className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 font-black py-3 rounded-xl text-sm tracking-widest uppercase transition-all duration-200"
                style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}