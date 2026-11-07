import { HttpError, toNumber } from './validate.js'

export const ADMIN_PAYMENT_STATUSES = ['paid', 'failed', 'refunded', 'awaiting_verification']

/**
 * Admin payment verify karta hai (QR dekhkar / cash milne par) — YAHI wo jagah hai jahan payment "paid" hoti hai.
 * Order ka paidAmount hamesha order.total (browser/admin se amount nahi liya jata). Booking mein admin final amount likhta hai.
 */
export async function recordPayment(repo, doc, admin, { status, amount }, { isOrder }) {
  if (!ADMIN_PAYMENT_STATUSES.includes(status)) throw new HttpError(400, 'Invalid payment status.')
  const patch = { 'payment.status': status, 'payment.verifiedBy': admin.email }
  if (status === 'paid') {
    const paid = isOrder ? doc.total : toNumber(amount, doc.estimatedTotal)
    if (!(paid > 0) || paid > 10_000_000) throw new HttpError(400, 'Please enter a valid amount.')
    patch['payment.paidAmount'] = Math.round(paid)
    patch['payment.paidAt'] = new Date()
  } else {
    patch['payment.paidAmount'] = 0
  }
  return repo.update(doc.id, patch)
}
