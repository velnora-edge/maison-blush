import crypto from 'node:crypto'
import { jazzcash } from './jazzcash.js'
import { easypaisa } from './easypaisa.js'

/**
 * Payment provider architecture.
 * Har provider ke 3 kaam:  isConfigured()  |  verifyCallback(body, headers) -> { success, reference, amount, txnId }  (signature galat ho to throw)
 * Webhook route (routes/payments.js) payment tab hi "paid" karta hai jab signature verify ho, success ho aur amount order total se match kare.
 */
const registry = { jazzcash, easypaisa }

// Sirf automated tests ke liye (NODE_ENV=test): signature = HMAC-SHA256("reference|amount|success", TEST_PROVIDER_SECRET)
if (process.env.NODE_ENV === 'test') {
  registry.test = {
    name: 'test',
    isConfigured: () => true,
    verifyCallback(body, headers) {
      const secret = process.env.TEST_PROVIDER_SECRET || 'test-secret'
      const expected = crypto.createHmac('sha256', secret).update(`${body.reference}|${body.amount}|${body.success}`).digest('hex')
      const got = String(headers['x-signature'] || '')
      if (got.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(got), Buffer.from(expected))) throw new Error('bad signature')
      return { success: body.success === true || body.success === 'true', reference: String(body.reference), amount: Number(body.amount), txnId: String(body.txnId || '') }
    },
  }
}

export const getProvider = (name) => registry[String(name)] || null
export const listProviders = () => Object.values(registry).map((p) => ({ name: p.name, configured: p.isConfigured() }))
