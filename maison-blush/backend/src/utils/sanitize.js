/** NoSQL injection se bachao: body/query mein jin keys ka naam $ se shuru ho ya '.' ho unhe hata do */
export function stripOperators(value) {
  if (Array.isArray(value)) return value.map(stripOperators)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).filter(([k]) => !k.startsWith('$') && !k.includes('.')).map(([k, v]) => [k, stripOperators(v)]))
  }
  return value
}
export const sanitizeInput = (req, _res, next) => {
  if (req.body && typeof req.body === 'object') req.body = stripOperators(req.body)
  for (const key of Object.keys(req.query || {})) {
    const v = req.query[key]
    // query values sirf string (ya string array) hon, object nahi (?status[$ne]=x jaisa hamla)
    if (typeof v === 'object' && !Array.isArray(v)) delete req.query[key]
  }
  next()
}
export const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
export const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)
