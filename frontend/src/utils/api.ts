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