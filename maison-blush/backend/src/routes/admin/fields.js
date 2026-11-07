import { clean, toNumber, HttpError } from '../../services/validate.js'

/**
 * Chota field-validator. spec = { fieldName: { type, required, min, max, ... } }
 * partial=true: sirf wahi fields check hoti hain jo body mein aayi hain (PATCH ke liye)
 */
export function validateFields(body = {}, spec, { partial = false } = {}) {
  const value = {}, errors = {}
  for (const [key, rule] of Object.entries(spec)) {
    const present = body[key] !== undefined
    if (!present) { if (!partial && rule.required) errors[key] = `${rule.label || key} is required.`; continue }
    const raw = body[key]
    switch (rule.type) {
      case 'string': {
        const v = clean(raw, rule.max || 200)
        if (rule.required && v.length < (rule.min ?? 1)) errors[key] = `${rule.label || key} must be at least ${rule.min ?? 1} characters.`
        else if (rule.pattern && v && !rule.pattern.test(v)) errors[key] = rule.patternMessage || `${rule.label || key} is invalid.`
        else value[key] = v
        break
      }
      case 'number': {
        const n = toNumber(raw)
        if (Number.isNaN(n) || n < (rule.min ?? -Infinity) || n > (rule.max ?? Infinity) || (rule.integer && !Number.isInteger(n))) errors[key] = `${rule.label || key} must be ${rule.integer ? 'a whole number' : 'a number'}${rule.min !== undefined ? ` ≥ ${rule.min}` : ''}${rule.max !== undefined ? ` and ≤ ${rule.max}` : ''}.`
        else value[key] = n
        break
      }
      case 'boolean': value[key] = raw === true || raw === 'true'; break
      case 'list': {
        const arr = (Array.isArray(raw) ? raw : String(raw).split(',')).map((x) => clean(x, 40).toLowerCase()).filter(Boolean).slice(0, 20)
        value[key] = arr
        break
      }
      default: throw new Error(`Unknown field type ${rule.type}`)
    }
  }
  if (Object.keys(errors).length) throw new HttpError(400, Object.values(errors)[0], errors)
  return value
}

// Image: khali, ya http(s) link, ya hamare upload (/uploads/...), ya Unsplash photo-id
export const IMAGE_RULE = { type: 'string', max: 400, label: 'Image', pattern: /^(https?:\/\/[^\s]+|\/uploads\/[a-z0-9._-]+|photo-[\w-]+)$/i, patternMessage: 'Image must be an uploaded file, a web link (https://…) or empty.' }
