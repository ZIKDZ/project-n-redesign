import { useState, useEffect } from 'react'
import { matches } from '../../../../utils/api'
import { Badge, SectionHeader, ActionButton } from '../DashboardShared'

export default function MatchesSection() {
  const [data, setData] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    rival: '',
    match_type: 'tournament',
    game: 'rocket_league',
    date: '',
    time: '',
    status: 'upcoming',
    score: '',
    winner: '',
  })

  const load = () => {
    ;(matches.list() as Promise<any>).then(r => setData(r.matches || [])).catch(() => {})
  }

  useEffect(() => { load() }, [])

  const save = async () => {
    if (!form.rival || !form.date || !form.time) return
    await matches.create(form)
    setShowForm(false)
    setForm({
      rival: '',
      match_type: 'tournament',
      game: 'rocket_league',
      date: '',
      time: '',
      status: 'upcoming',
      score: '',
      winner: '',
    })
    load()
  }

  const remove = async (id: number) => {
    if (!confirm('Delete this match?')) return
    await matches.delete(id)
    load()
  }

  const statusColor = (s: string): 'red' | 'green' | 'purple' =>
    s === 'live' ? 'red' : s === 'completed' ? 'green' : 'purple'

  const inputClass =
    'bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500/60 w-full'

  return (
    <div>
      <SectionHeader
        title="Matches"
        action={<ActionButton onClick={() => setShowForm(v => !v)}>+ New Match</ActionButton>}
      />

      {showForm && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6 grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { key: 'rival', placeholder: 'Rival team', type: 'text' },
            { key: 'date',  placeholder: 'Date',       type: 'date' },
            { key: 'time',  placeholder: 'Time',       type: 'time' },
            { key: 'score', placeholder: 'Score e.g. 3 — 1', type: 'text' },
          ].map(f => (
            <input
              key={f.key}
              type={f.type}
              placeholder={f.placeholder}
              value={(form as any)[f.key]}
              onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
              className={inputClass}
            />
          ))}
          {[
            { key: 'game',       opts: [['rocket_league','Rocket League'],['valorant','Valorant'],['fortnite','Fortnite']] },
            { key: 'match_type', opts: [['tournament','Tournament'],['practice','Practice'],['scrim','Scrim'],['friendly','Friendly']] },
            { key: 'status',     opts: [['upcoming','Upcoming'],['live','Live'],['completed','Completed']] },
            { key: 'winner',     opts: [['','No winner yet'],['nbl','NBL'],['rival','Rival'],['draw','Draw']] },
          ].map(s => (
            <select
              key={s.key}
              value={(form as any)[s.key]}
              onChange={e => setForm(p => ({ ...p, [s.key]: e.target.value }))}
              className={inputClass + ' cursor-pointer'}
            >
              {s.opts.map(([v, l]) => (
                <option key={v} value={v} className="bg-[#1a0030]">{l}</option>
              ))}
            </select>
          ))}
          <div className="col-span-full flex gap-3">
            <ActionButton onClick={save}>Save Match</ActionButton>
            <ActionButton variant="ghost" onClick={() => setShowForm(false)}>Cancel</ActionButton>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {data.length === 0 && <p className="text-white/30 text-sm">No matches yet.</p>}
        {data.map((m: any) => (
          <div
            key={m.id}
            className="bg-white/5 border border-white/8 rounded-2xl px-6 py-4 flex items-center gap-4"
          >
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <span className="text-white font-bold">NBL vs {m.rival}</span>
                <Badge color={statusColor(m.status)}>{m.status}</Badge>
                <Badge color="purple">{m.game.replace('_', ' ')}</Badge>
                <Badge color="gray">{m.match_type}</Badge>
              </div>
              <p className="text-white/40 text-xs">
                {m.date} · {m.time}
                {m.score && ` · ${m.score}`}
                {m.winner && ` · Winner: ${m.winner}`}
              </p>
            </div>
            <ActionButton variant="danger" onClick={() => remove(m.id)}>Delete</ActionButton>
          </div>
        ))}
      </div>
    </div>
  )
}
