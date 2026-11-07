/** Bina extra package ke chota CORS + rate limiter + admin guard */
export function cors(origin) {
  return (req, res, next) => {
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin)
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-key')
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
      if (req.method === 'OPTIONS') return res.sendStatus(204)
    }
    next()
  }
}

export function rateLimit({ windowMs = 60_000, max = 40, message = 'Too many requests. Please wait a minute and try again.' } = {}) {
  const hits = new Map()
  setInterval(() => { const now = Date.now(); for (const [k, v] of hits) if (v.reset < now) hits.delete(k) }, windowMs).unref()
  return (req, res, next) => {
    const key = req.ip
    const now = Date.now()
    const entry = hits.get(key) && hits.get(key).reset > now ? hits.get(key) : { count: 0, reset: now + windowMs }
    entry.count += 1
    hits.set(key, entry)
    if (entry.count > max) return res.status(429).json({ error: message })
    next()
  }
}
