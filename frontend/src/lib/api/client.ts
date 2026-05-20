export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

const ACCESS_KEY = 'access_token'
const REFRESH_KEY = 'refresh_token'

export const tokenStorage = {
  getAccess: () => localStorage.getItem(ACCESS_KEY),
  getRefresh: () => localStorage.getItem(REFRESH_KEY),
  set: (access: string, refresh: string) => {
    localStorage.setItem(ACCESS_KEY, access)
    localStorage.setItem(REFRESH_KEY, refresh)
  },
  clear: () => {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
  },
}

let refreshPromise: Promise<void> | null = null

async function doRefresh(): Promise<void> {
  const refresh = tokenStorage.getRefresh()
  if (!refresh) throw new ApiError(401, 'no refresh token')

  const res = await fetch('/api/v1/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refresh }),
  })
  if (!res.ok) {
    tokenStorage.clear()
    window.location.href = '/login'
    throw new ApiError(401, 'session expired')
  }
  const data = await res.json()
  tokenStorage.set(data.access_token, data.refresh_token)
}

async function fetchWithAuth(path: string, init: RequestInit = {}): Promise<Response> {
  const token = tokenStorage.getAccess()
  const headers = new Headers(init.headers)
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (!headers.has('Content-Type') && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }
  return fetch(path, { ...init, headers })
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res = await fetchWithAuth(path, init)

  if (res.status === 401) {
    if (!refreshPromise) {
      refreshPromise = doRefresh().finally(() => {
        refreshPromise = null
      })
    }
    await refreshPromise
    res = await fetchWithAuth(path, init)
  }

  if (!res.ok) {
    let message = res.statusText
    try {
      const body = await res.json()
      if (body?.error) message = body.error
    } catch {
      // ignore
    }
    throw new ApiError(res.status, message)
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const client = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  postForm: <T>(path: string, form: FormData) =>
    request<T>(path, { method: 'POST', body: form }),
}
