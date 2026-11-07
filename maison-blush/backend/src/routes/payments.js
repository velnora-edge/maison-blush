import { Router } from 'express'
import { repos } from '../db/index.js'
import { getProvider } from '../services/providers/index.js'
import { wrap } from '../utils/sanitize.js'
import { HttpError } from '../services/validate.js'

const router = Router()

/**
 * Payment gateway ka callback. Payment tab hi "paid" hoti hai jab:
 *  1. provider configured ho  2. signature sahi ho  3. gateway ne success bataya ho  4. amount order/booking ke amount se match kare
 * Frontend ke kehne se kabhi paid nahi hoti. Dobara aaya callback (retry) koi nuqsaan nahi karta.
 */
router.post('/payments/webhook/:provider', wrap(async (req, res) => {
  const provider = getProvider(req.params.provider)
  if (!provider || !provider.isConfigured()) throw new HttpError(503, 'Payment provider is not configured.')

  let result
  try { result = provider.verifyCallback(req.body || {}, req.headers) } catch { throw new HttpError(400, 'Invalid payment signature.') }

  const [order, booking] = await Promise.all([repos.orders.findOne({ code: result.reference }), repos.bookings.findOne({ code: result.reference })])
  const repo = order ? repos.orders : booking ? repos.bookings : null
  const doc = order || booking
  if (!doc) throw new HttpError(404, 'Unknown payment reference.')

  if (!result.success) {
    if (doc.payment.status !== 'paid') await repo.update(doc.id, { 'payment.status': 'failed', 'payment.provider': provider.name, 'payment.providerTxnId': result.txnId })
    return res.json({ ok: true, status: 'failed' })
  }
  const expected = order ? order.total : booking.payment.amount
  if (!(expected > 0) || Math.abs(result.amount - expected) > 0.001) throw new HttpError(400, 'Payment amount does not match.')

  await repo.atomicUpdate({ id: doc.id, 'payment.status': { $ne: 'paid' } }, {
    $set: { 'payment.status': 'paid', 'payment.paidAmount': expected, 'payment.paidAt': new Date(), 'payment.provider': provider.name, 'payment.providerTxnId': result.txnId, 'payment.verifiedBy': `${provider.name} webhook` },
  })
  res.json({ ok: true, status: 'paid' })
}))

export default router
