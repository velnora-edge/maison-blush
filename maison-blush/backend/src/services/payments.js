import { salon } from '../../../shared/salon.js'
import { HttpError, clean, digits } from './validate.js'

export const demoMode = () => (process.env.PAYMENT_MODE ? process.env.PAYMENT_MODE !== 'live' : salon.payments.demoMode)

/**
 * Customer ki bheji hui payment ko PEHLI baar record karta hai. Yahan KOI payment "paid" nahi hoti jab tak asli verification na ho:
 *
 *  cash  -> pay_on_delivery / pay_at_salon     paisa baad mein; admin cash milne par "paid" mark karta hai
 *  qr    -> awaiting_verification              customer ki transaction ID; admin bank/app mein check karke "paid" karta hai
 *  card  -> paid_demo (sirf demo mode)         NAKLI payment — revenue mein kabhi nahi ginti
 *           live mode mein: 501 jab tak asli gateway na jure
 *  jazzcash / easypaisa                        sirf backend webhook se paid hoti hain (providers/ folder) — yahan se nahi
 *
 * Card ka poora number / CVV server par aata hi nahi — sirf brand aur last 4 digits.
 */
export async function processPayment({ method, kind, amount, payment = {} }) {
  const m = clean(method, 10)
  if (!['cash', 'qr', 'card'].includes(m)) throw new HttpError(400, 'Please choose a payment method.')
  const base = { method: m, amount, paidAmount: 0 }

  if (m === 'cash') return { ...base, status: kind === 'booking' ? 'pay_at_salon' : 'pay_on_delivery' }

  if (m === 'qr') {
    const reference = clean(payment.reference, 40)
    if (reference.length < 6) throw new HttpError(400, 'Please enter the transaction ID shown in your banking app (at least 6 characters).')
    return { ...base, status: 'awaiting_verification', reference }
  }

  const last4 = digits(payment.last4).slice(-4)
  if (last4.length !== 4) throw new HttpError(400, 'Card details are incomplete.')
  if (demoMode()) return { ...base, status: 'paid_demo', last4, brand: clean(payment.brand, 20) || 'Card' }
  // ---- LIVE MODE: asli gateway yahan jorein (README: "Payments"), tab tak card band ----
  throw new HttpError(501, 'Online card payments are not enabled yet. Please choose QR or cash.')
}
