// Backend se baat karne ka ek hi jagah. Alag server par host karein to VITE_API_URL set karein.
const BASE = import.meta.env.VITE_API_URL || ''

async function request(path, { method = 'GET', body } = {}) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 15000)
  try {
    const res = await fetch(`${BASE}/api${path}`, {
      method,
      signal: ctrl.signal,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })
    let data = null
    try { data = await res.json() } catch { /* empty */ }
    if (!res.ok) {
      const err = new Error(data?.error || 'Something went wrong. Please try again.')
      err.fields = data?.fields
      err.status = res.status
      throw err
    }
    return data
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('The server took too long to respond. Please try again.')
    if (e instanceof TypeError) throw new Error('Cannot reach the server right now. Please check your connection or call us.')
    throw e
  } finally {
    clearTimeout(timer)
  }
}

export const api = {
  services: () => request('/services'),
  products: () => request('/products'),
  availability: (date) => request(`/availability?date=${encodeURIComponent(date)}`),
  createBooking: (payload) => request('/bookings', { method: 'POST', body: payload }),
  createOrder: (payload) => request('/orders', { method: 'POST', body: payload }),
  sendContact: (payload) => request('/contact', { method: 'POST', body: payload }),
  subscribe: (email) => request('/newsletter', { method: 'POST', body: { email } }),
  chat: (message, history) => request('/chat', { method: 'POST', body: { message, history } }),
}
