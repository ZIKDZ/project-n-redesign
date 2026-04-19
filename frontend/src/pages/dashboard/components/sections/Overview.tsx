import { useState, useEffect } from 'react'
import { joins, matches, news, players, teams } from '../../../../utils/api'
import { SectionHeader, StatCard } from '../DashboardShared'

export default function Overview() {
  const [counts, setCounts] = useState({ joins: 0, matches: 0, news: 0, players: 0, teams: 0 })

  useEffect(() => {
    Promise.all([
      joins.list() as Promise<any>,
      matches.list() as Promise<any>,
      news.listAll() as Promise<any>,
      players.listAll() as Promise<any>,
      teams.listAll() as Promise<any>,
    ]).then(([j, m, n, p, t]) => {
      setCounts({
        joins:   j.joins?.length   ?? 0,
        matches: m.matches?.length ?? 0,
        news:    n.news?.length    ?? 0,
        players: p.players?.length ?? 0,
        teams:   t.teams?.length   ?? 0,
      })
    }).catch(() => {})
  }, [])

  return (
    <div>
      <SectionHeader title="Overview" />
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        <StatCard label="Join Requests" value={counts.joins} />
        <StatCard label="Matches"       value={counts.matches} />
        <StatCard label="News Posts"    value={counts.news} />
        <StatCard label="Players"       value={counts.players} />
        <StatCard label="Teams"         value={counts.teams} />
      </div>
    </div>
  )
}
