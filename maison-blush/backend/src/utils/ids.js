import crypto from 'node:crypto'
// Padhne mein aasan code, jaise MB-7K3F9Q (0/O/1/I jaise confusing haraf nahi)
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
export function makeCode(prefix, len = 6) {
  const bytes = crypto.randomBytes(len)
  return `${prefix}-${Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('')}`
}
export const isDup = (err, field) =>
  err?.code === 11000 && (err.keyPattern ? field in err.keyPattern : String(err.message).includes(field))
