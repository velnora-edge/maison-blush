// Admin panel ka API client. Login cookie HttpOnly hai (JavaScript usse parh nahi sakti); X-MB-Admin header CSRF se bachata hai.
const BASE = import.meta.env.VITE_API_URL || ''

async function request(path, { method = 'GET', body, raw = false } = {}) {
  let res
  try {
    res = await fetch(`${BASE}/api/admin${path}`, {
      method, credentials: 'same-origin',
      headers: { 'X-MB-Admin': '1', ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new Error('Cannot reach the server. Please check that the backend is running.')
  }
  if (res.status === 401 && !path.startsWith('/auth/login') && !path.startsWith('/auth/me')) window.dispatchEvent(new Event('admin:unauthorized'))
  if (raw && res.ok) return res
  let data = null
  try { data = await res.json() } catch { /* empty */ }
  if (!res.ok) throw Object.assign(new Error(data?.error || 'Something went wrong. Please try again.'), { status: res.status, fields: data?.fields })
  return data
}

export const toQuery = (params = {}) => {
  const q = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => { if (v !== '' && v != null) q.set(k, v) })
  const s = q.toString()
  return s ? `?${s}` : ''
}

export const adm = {
  get: (p) => request(p),
  post: (p, body) => request(p, { method: 'POST', body: body ?? {} }),
  patch: (p, body) => request(p, { method: 'PATCH', body }),
  del: (p) => request(p, { method: 'DELETE' }),
  async download(path, filename) {
    const res = await request(path, { raw: true })
    const url = URL.createObjectURL(await res.blob())
    const a = Object.assign(document.createElement('a'), { href: url, download: filename })
    document.body.appendChild(a); a.click(); a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  },
}

/** Photo ko chhota (max 1400px, JPEG) karke upload karta hai taake phone ki bari photo bhi aaram se chali jaye */
export async function uploadImage(file) {
  if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) throw new Error('Please choose a PNG, JPG or WebP image.')
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, 1400 / Math.max(bitmap.width, bitmap.height))
  const canvas = Object.assign(document.createElement('canvas'), { width: Math.round(bitmap.width * scale), height: Math.round(bitmap.height * scale) })
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  const dataUrl = canvas.toDataURL('image/jpeg', 0.86)
  const { url } = await request('/uploads', { method: 'POST', body: { dataUrl } })
  return url
}
