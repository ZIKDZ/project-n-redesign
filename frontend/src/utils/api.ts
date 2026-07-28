// Central API utility
// All fetch calls go through here so CSRF and base URL are handled in one place

function getCookie(name: string): string {
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) return parts.pop()!.split(';').shift() || ''
  return ''
}

async function request<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const csrfToken = getCookie('csrftoken')

  const res = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(csrfToken ? { 'X-CSRFToken': csrfToken } : {}),
      ...options.headers,
    },
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(err.error || `HTTP ${res.status}`)
  }

  return res.json()
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export const auth = {
  login: (username: string, password: string) =>
    request('/api/auth/login/', { method: 'POST', body: JSON.stringify({ username, password }) }),
  logout: () =>
    request('/api/auth/logout/', { method: 'POST' }),
  me: () =>
    request<{ authenticated: boolean; user?: { username: string; is_staff: boolean } }>('/api/auth/me/'),
}

// ── Games ─────────────────────────────────────────────────────────────────────
export const games = {
  list: () =>
    request('/api/games/'),
  listOpen: () =>
    request('/api/games/open/'),
  listAll: () =>
    request('/api/games/all/'),
  create: (data: object) =>
    request('/api/games/create/', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: object) =>
    request(`/api/games/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: number) =>
    request(`/api/games/${id}/delete/`, { method: 'DELETE' }),
}

// ── Join requests ─────────────────────────────────────────────────────────────
export const joins = {
  submit: (data: object) =>
    request('/api/joins/', { method: 'POST', body: JSON.stringify(data) }),
  list: (status?: string) =>
    request(`/api/joins/list/${status ? `?status=${status}` : ''}`),
  updateStatus: (id: number, data: { status?: string; notes?: string }) =>
    request(`/api/joins/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
  accept: (id: number) =>
    request(`/api/joins/${id}/accept/`, { method: 'POST' }),
}

// ── Matches ───────────────────────────────────────────────────────────────────
export const matches = {
  list: (params?: { status?: string; game?: string }) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString()
    return request(`/api/matches/${qs ? `?${qs}` : ''}`)
  },
  create: (data: object) =>
    request('/api/matches/create/', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: object) =>
    request(`/api/matches/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: number) =>
    request(`/api/matches/${id}/delete/`, { method: 'DELETE' }),
}

// ── News ──────────────────────────────────────────────────────────────────────
export const news = {
  list: (tag?: string) =>
    request(`/api/news/${tag ? `?tag=${tag}` : ''}`),
  listAll: () =>
    request('/api/news/all/'),
  create: (data: object) =>
    request('/api/news/create/', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: object) =>
    request(`/api/news/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: number) =>
    request(`/api/news/${id}/delete/`, { method: 'DELETE' }),
}

// ── Players ───────────────────────────────────────────────────────────────────
export const players = {
  list: (params?: { game?: string; team?: number }) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString()
    return request(`/api/players/${qs ? `?${qs}` : ''}`)
  },
  listAll: () =>
    request('/api/players/all/'),
  get: (id: number) =>
    request(`/api/players/${id}/profile/`),
  create: (data: object) =>
    request('/api/players/create/', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: object) =>
    request(`/api/players/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: number) =>
    request(`/api/players/${id}/delete/`, { method: 'DELETE' }),
}

// ── Teams ─────────────────────────────────────────────────────────────────────
export const teams = {
  list: (game?: string) =>
    request(`/api/teams/${game ? `?game=${game}` : ''}`),
  listAll: () =>
    request('/api/teams/all/'),
  create: (data: object) =>
    request('/api/teams/create/', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: object) =>
    request(`/api/teams/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: number) =>
    request(`/api/teams/${id}/delete/`, { method: 'DELETE' }),
}

// ── Spotlight slides ──────────────────────────────────────────────────────────
export const spotlight = {
  list: () =>
    request('/api/spotlight/'),
  listAll: () =>
    request('/api/spotlight/all/'),
  create: (data: object) =>
    request('/api/spotlight/create/', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: object) =>
    request(`/api/spotlight/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: number) =>
    request(`/api/spotlight/${id}/delete/`, { method: 'DELETE' }),
}

// ── Shop ──────────────────────────────────────────────────────────────────────
export const shop = {
  list: (category?: string) =>
    request(`/api/shop/${category ? `?category=${category}` : ''}`),
  get: (id: number) =>
    request(`/api/shop/${id}/`),
  submitOrder: (data: object) =>
    request('/api/shop/order/', { method: 'POST', body: JSON.stringify(data) }),
  listAll: () =>
    request('/api/shop/all/'),
  create: (data: object) =>
    request('/api/shop/create/', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: object) =>
    request(`/api/shop/${id}/update/`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: number) =>
    request(`/api/shop/${id}/delete/`, { method: 'DELETE' }),
  listOrders: (status?: string) =>
    request(`/api/shop/orders/${status ? `?status=${status}` : ''}`),
  updateOrder: (id: number, data: object) =>
    request(`/api/shop/orders/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteOrder: (id: number) =>
    request(`/api/shop/orders/${id}/delete/`, { method: 'DELETE' }),
}

// ── Tournaments ───────────────────────────────────────────────────────────────
export const tournaments = {
  // Public
  list: (params?: { game?: string; status?: string }) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString()
    return request(`/api/tournaments/${qs ? `?${qs}` : ''}`)
  },
  get: (slug: string) =>
    request(`/api/tournaments/${slug}/`),
 
  // Staff
  listAll: () =>
    request('/api/tournaments/all/'),
  getStaff: (id: number) =>
    request(`/api/tournaments/${id}/`),
  create: (data: object) =>
    request('/api/tournaments/create/', { method: 'POST', body: JSON.stringify(data) }),
  createMultipart: (fd: FormData) =>
    fetch('/api/tournaments/create/', {
      method: 'POST', credentials: 'include',
      headers: { 'X-CSRFToken': getCookie('csrftoken') }, body: fd,
    }).then(r => r.json()),
  update: (id: number, data: object) =>
    request(`/api/tournaments/${id}/update/`, { method: 'PATCH', body: JSON.stringify(data) }),
  updateMultipart: (id: number, fd: FormData) =>
    fetch(`/api/tournaments/${id}/update/`, {
      method: 'PATCH', credentials: 'include',
      headers: { 'X-CSRFToken': getCookie('csrftoken') }, body: fd,
    }).then(r => r.json()),
  delete: (id: number) =>
    request(`/api/tournaments/${id}/delete/`, { method: 'DELETE' }),
 
  // Placements
  createPlacement: (id: number, data: object) =>
    request(`/api/tournaments/${id}/placements/create/`, { method: 'POST', body: JSON.stringify(data) }),
  updatePlacement: (id: number, placementId: number, data: object) =>
    request(`/api/tournaments/${id}/placements/${placementId}/update/`, { method: 'PATCH', body: JSON.stringify(data) }),
  deletePlacement: (id: number, placementId: number) =>
    request(`/api/tournaments/${id}/placements/${placementId}/delete/`, { method: 'DELETE' }),

  // Staff — Participants
  listParticipants: (id: number) =>
    request(`/api/tournaments/${id}/participants/`),
  updateParticipant: (id: number, participantId: number, data: { status?: string; seed?: number | null }) =>
    request(`/api/tournaments/${id}/participants/${participantId}/`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteParticipant: (id: number, participantId: number) =>
    request(`/api/tournaments/${id}/participants/${participantId}/delete/`, { method: 'DELETE' }),

  // Public — Registration (Discord-authenticated players)
  myRegistration: (slug: string) =>
    request(`/api/tournaments/${slug}/my-registration/`),
  registerSolo: (slug: string) =>
    request(`/api/tournaments/${slug}/register/`, { method: 'POST' }),
  withdrawSolo: (slug: string) =>
    request(`/api/tournaments/${slug}/withdraw/`, { method: 'POST' }),
  createTeam: (slug: string, data: { name: string; tag?: string; logo_url?: string }) =>
    request(`/api/tournaments/${slug}/teams/create/`, { method: 'POST', body: JSON.stringify(data) }),
  joinTeam: (slug: string, inviteCode: string) =>
    request(`/api/tournaments/${slug}/teams/join/`, { method: 'POST', body: JSON.stringify({ invite_code: inviteCode }) }),
  leaveTeam: (slug: string) =>
    request(`/api/tournaments/${slug}/teams/leave/`, { method: 'POST' }),
  regenerateInviteCode: (slug: string) =>
    request(`/api/tournaments/${slug}/teams/regenerate-code/`, { method: 'POST' }),
  kickMember: (slug: string, playerId: number) =>
    request(`/api/tournaments/${slug}/teams/kick/`, { method: 'POST', body: JSON.stringify({ player_id: playerId }) }),
}
 
// ── Discord auth (tournament players) ─────────────────────────────────────────
export const discordAuth = {
  me: () =>
    request<{ authenticated: boolean; player?: { id: number; discord_id: string; discord_username: string; discord_avatar: string } }>('/api/auth/discord/me/'),
  loginUrl: (next?: string) =>
    `/api/auth/discord/login/${next ? `?next=${encodeURIComponent(next)}` : ''}`,
  logout: () =>
    request('/api/auth/discord/logout/', { method: 'POST' }),
}