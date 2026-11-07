import { adminFromToken, COOKIE } from '../services/auth.js'

export const parseCookies = (header = '') =>
  Object.fromEntries(header.split(';').map((p) => p.trim()).filter(Boolean).map((p) => { const i = p.indexOf('='); return [p.slice(0, i), decodeURIComponent(p.slice(i + 1))] }))

export const cookieOptions = (req, maxAgeMs) => {
  const parts = ['Path=/', 'HttpOnly', 'SameSite=Strict']
  if (req.secure) parts.push('Secure') // HTTPS par (hosting) Secure; localhost http par bina Secure, warna cookie set hi nahi hoti
  if (maxAgeMs !== undefined) parts.push(`Max-Age=${Math.floor(maxAgeMs / 1000)}`)
  return parts.join('; ')
}

const UNSAFE = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

/** CSRF: (1) SameSite=Strict cookie  (2) custom header X-MB-Admin (browser doosri site se bhej hi nahi sakta)  (3) Origin check */
const isLoopback = (h) => /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(String(h))

export function csrfGuard(req, res, next) {
  if (!UNSAFE.has(req.method)) return next()
  if (req.get('x-mb-admin') !== '1') return res.status(403).json({ error: 'Forbidden' })
  const origin = req.get('origin')
  if (origin) {
    let originHost = ''
    try { originHost = new URL(origin).host } catch { return res.status(403).json({ error: 'Forbidden' }) }
    const host = req.get('host') || ''
    const sameSite = origin === `${req.protocol}://${host}` || origin === process.env.CORS_ORIGIN
    // Apne computer par (localhost) development mein Vite beech mein hota hai, isliye localhost ke alag ports ko bhi ijazat
    const localDev = isLoopback(originHost) && isLoopback(host)
    if (!sameSite && !localDev) return res.status(403).json({ error: 'Forbidden' })
  }
  next()

}

export async function requireAdmin(req, res, next) {
  res.setHeader('Cache-Control', 'no-store')
  try {
    const token = parseCookies(req.headers.cookie)[COOKIE]
    const found = await adminFromToken(token)
    if (!found) return res.status(401).json({ error: 'Please sign in.' })
    req.admin = found.admin
    req.session = found.session
    req.token = token
    next()
  } catch (e) { next(e) }
}
