import crypto from 'node:crypto'

/**
 * JazzCash (Mobile Wallet / Card — HTTP POST integration). SKELETON: credentials milne tak band (isConfigured = false).
 * Env: JAZZCASH_MERCHANT_ID, JAZZCASH_PASSWORD, JAZZCASH_INTEGRITY_SALT
 *
 * ZAROORI: go-live se pehle apne JazzCash merchant portal ke documentation se is hash-formula aur field names ko verify karein
 * (pp_Amount paisa mein hota hai, pp_ResponseCode "000" = success). Sandbox mein test karein.
 */
const salt = () => process.env.JAZZCASH_INTEGRITY_SALT || ''

export function secureHash(fields) {
  const keys = Object.keys(fields).filter((k) => k.startsWith('pp_') && k !== 'pp_SecureHash' && fields[k] !== '' && fields[k] != null).sort()
  const message = [salt(), ...keys.map((k) => fields[k])].join('&')
  return crypto.createHmac('sha256', salt()).update(message).digest('hex').toUpperCase()
}

export const jazzcash = {
  name: 'jazzcash',
  isConfigured: () => Boolean(process.env.JAZZCASH_MERCHANT_ID && process.env.JAZZCASH_PASSWORD && process.env.JAZZCASH_INTEGRITY_SALT),
  verifyCallback(body) {
    const expected = secureHash(body)
    const got = String(body.pp_SecureHash || '').toUpperCase()
    if (got.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(got), Buffer.from(expected))) throw new Error('bad signature')
    return {
      success: body.pp_ResponseCode === '000',
      reference: String(body.pp_BillReference || body.pp_TxnRefNo || ''),
      amount: Number(body.pp_Amount) / 100,
      txnId: String(body.pp_TxnRefNo || ''),
    }
  },
}
