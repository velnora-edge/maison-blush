export { formatMoney as money } from '@shared/salon.js'

export const onlyDigits = (v) => String(v || '').replace(/\D/g, '')

export function luhn(num) {
  const d = onlyDigits(num)
  if (d.length < 13 || d.length > 19) return false
  let sum = 0
  for (let i = 0; i < d.length; i++) {
    let n = Number(d[d.length - 1 - i])
    if (i % 2 === 1) { n *= 2; if (n > 9) n -= 9 }
    sum += n
  }
  return sum % 10 === 0
}

export function cardBrand(num) {
  const d = onlyDigits(num)
  if (/^4/.test(d)) return 'Visa'
  if (/^(5[1-5]|2[2-7])/.test(d)) return 'Mastercard'
  if (/^3[47]/.test(d)) return 'Amex'
  if (/^(62|81)/.test(d)) return 'UnionPay'
  return 'Card'
}

export const formatCardNumber = (v) => onlyDigits(v).slice(0, 19).replace(/(.{4})/g, '$1 ').trim()
export const formatExpiry = (v) => {
  const d = onlyDigits(v).slice(0, 4)
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d
}
export function expiryValid(v) {
  const m = /^(\d{2})\/(\d{2})$/.exec(v)
  if (!m) return false
  const month = Number(m[1]), year = 2000 + Number(m[2])
  if (month < 1 || month > 12) return false
  const now = new Date()
  return year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth() + 1)
}

export const todayISO = () => {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`
}
export const addDaysISO = (days) => {
  const d = new Date(); d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
export const prettyDate = (iso) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

export const scrollToId = (id) => {
  const el = document.querySelector(id.startsWith('#') ? id : `#${id}`)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
