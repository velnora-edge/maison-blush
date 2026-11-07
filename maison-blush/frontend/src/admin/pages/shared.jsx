import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { money, fmtDateTime, PaymentBadge, useToast } from '../ui.jsx'

const METHOD = { cash: 'Cash', qr: 'QR scan', card: 'Card', jazzcash: 'JazzCash', easypaisa: 'Easypaisa' }
export const methodLabel = (m) => METHOD[m] || m

export const InfoGrid = ({ rows }) => (
  <dl className="adm-info">{rows.filter(Boolean).map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v || '—'}</dd></div>)}</dl>
)

/**
 * Payment verify karne ki jagah. Revenue sirf tab ginta hai jab yahan "Mark as paid" dabaya jaye.
 * Order: amount hamesha order ka total. Booking: admin final amount likhta hai.
 */
export function PaymentBox({ doc, isOrder, onSave }) {
  const p = doc.payment
  const [amount, setAmount] = useState(String(p.paidAmount || doc.estimatedTotal || ''))
  const [busy, setBusy] = useState('')
  const toast = useToast()
  const run = async (status) => {
    setBusy(status)
    try { await onSave(status, isOrder ? undefined : Number(amount)); toast(status === 'paid' ? 'Payment marked as paid — added to revenue.' : `Payment marked as ${status}.`) }
    catch (e) { toast(e.message, 'bad') } finally { setBusy('') }
  }
  const btn = (status, label, cls = '') => (
    <button className={`adm-btn ${cls}`} disabled={!!busy} onClick={() => run(status)}>{busy === status && <Loader2 className="spin" size={16} />} {label}</button>
  )
  return (
    <div className="adm-paybox">
      <div className="adm-paybox-head"><strong>Payment</strong><PaymentBadge payment={p} /></div>
      <dl className="adm-info compact">
        <div><dt>Method</dt><dd>{methodLabel(p.method)}</dd></div>
        <div><dt>{isOrder ? 'Order total' : 'Advance requested'}</dt><dd>{money(isOrder ? doc.total : p.amount)}</dd></div>
        <div><dt>Verified amount</dt><dd>{p.status === 'paid' ? money(p.paidAmount) : '—'}</dd></div>
        {p.reference && <div><dt>Transaction ID</dt><dd><code>{p.reference}</code></dd></div>}
        {p.last4 && <div><dt>Card</dt><dd>{p.brand} •••• {p.last4}</dd></div>}
        {p.status === 'paid' && <div><dt>Verified</dt><dd>{fmtDateTime(p.paidAt)}{p.verifiedBy ? ` · ${p.verifiedBy}` : ''}</dd></div>}
      </dl>
      {p.status === 'paid_demo' && <p className="adm-note">Demo payment — no real money was charged, so it is not counted in revenue.</p>}
      {p.status === 'awaiting_verification' && <p className="adm-note">Check this transaction ID in your JazzCash / Easypaisa / bank app. Mark as paid only after you see the money.</p>}
      {(p.status === 'pay_on_delivery' || p.status === 'pay_at_salon') && <p className="adm-note">Mark as paid once you have received the cash.</p>}
      {p.status !== 'paid' && p.status !== 'refunded' && (
        <div className="adm-pay-actions">
          {!isOrder && <label className="adm-field inline"><span>Amount received</span><input type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} /></label>}
          {btn('paid', 'Mark as paid (verified)', 'primary')}
          {btn('failed', 'Mark failed')}
        </div>
      )}
      {p.status === 'paid' && <div className="adm-pay-actions">{btn('refunded', 'Mark refunded')}</div>}
      {(p.status === 'failed' || p.status === 'refunded') && <div className="adm-pay-actions">{btn('awaiting_verification', 'Reopen for verification')}</div>}
    </div>
  )
}
