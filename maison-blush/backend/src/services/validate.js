// Sirf string/number/boolean qabool; object ya array (jaise {"$gt":""}) ko khali maana jata hai, "[object Object]" nahi
export const clean = (v, max = 200) => (v !== null && typeof v === 'object' ? '' : String(v ?? '')).replace(/[<>]/g, '').trim().slice(0, max)
export const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)
export const digits = (v) => String(v ?? '').replace(/\D/g, '')
export const isPhone = (v) => { const d = digits(v); return d.length >= 10 && d.length <= 15 }
export const toNumber = (v, fallback = NaN) => { const n = Number(v); return Number.isFinite(n) ? n : fallback }
export const slugify = (s) => clean(s, 80).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)

export class HttpError extends Error {
  constructor(status, message, fields) { super(message); this.status = status; this.fields = fields }
}

/** errors object khali na ho to 400 phek do */
export function assertValid(errors) {
  const keys = Object.keys(errors)
  if (keys.length) throw new HttpError(400, errors[keys[0]], errors)
}
