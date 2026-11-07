import { useEffect, useMemo, useState } from 'react'
import { X, CreditCard, QrCode, Banknote, Lock, Loader2, AlertCircle, Check, ArrowLeft, Info } from 'lucide-react'
import { salon } from '@shared/salon.js'
import { money, luhn, cardBrand, formatCardNumber, formatExpiry, expiryValid, onlyDigits } from '../utils/format.js'
import PayQR from './PayQR.jsx'

const blankDetails = { name: '', phone: '', email: '', address: '', city: salon.city || '', notes: '' }
const blankCard = { number: '', name: '', expiry: '', cvc: '' }

/**
 * Orders (kind="order") aur booking advance (kind="booking") dono ke liye payment window.
 * submit(details, payment) -> Promise<result>
 */
export default function CheckoutModal({
  open, onClose, kind = 'order', title = 'Checkout', amount, lines = [], needDetails = true,
  submit, onSuccess, successTitle = 'Order placed!', successText = () => '',
}) {
  const [step, setStep] = useState('details')
  const [details, setDetails] = useState(blankDetails)
  const [method, setMethod] = useState('card')
  const [card, setCard] = useState(blankCard)
  const [txn, setTxn] = useState('')
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)
  const reference = useMemo(() => `MB-${Math.random().toString(36).slice(2, 7).toUpperCase()}`, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const methods = [
    { id: 'card', label: 'Card', icon: CreditCard },
    { id: 'qr', label: 'QR Scan', icon: QrCode },
    ...(kind === 'order' ? [{ id: 'cash', label: 'Cash on Delivery', icon: Banknote }] : []),
  ]

  useEffect(() => {
    if (!open) return
    setStep(needDetails ? 'details' : 'payment')
    setErrors({}); setError(''); setBusy(false); setResult(null); setCard(blankCard); setTxn(''); setMethod('card')
  }, [open, needDetails])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && !busy && onClose()
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', onKey) }
  }, [open, busy, onClose])

  if (!open) return null

  const setD = (patch) => setDetails((d) => ({ ...d, ...patch }))
  const setC = (patch) => setCard((c) => ({ ...c, ...patch }))

  const goPayment = (ev) => {
    ev.preventDefault()
    const e = {}
    if (details.name.trim().length < 2) e.name = 'Please enter your name.'
    if (onlyDigits(details.phone).length < 10) e.phone = 'Please enter a valid phone number.'
    if (details.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(details.email)) e.email = 'Please enter a valid email.'
    if (details.address.trim().length < 8) e.address = 'Please enter your full delivery address.'
    if (details.city.trim().length < 2) e.city = 'Please enter your city.'
    setErrors(e)
    if (!Object.keys(e).length) setStep('payment')
  }

  const pay = async (ev) => {
    ev.preventDefault()
    setError('')
    const e = {}
    let payment = { method }
    if (method === 'card') {
      if (!luhn(card.number)) e.number = 'Please enter a valid card number.'
      if (card.name.trim().length < 2) e.cardName = 'Please enter the name on the card.'
      if (!expiryValid(card.expiry)) e.expiry = 'Enter a valid expiry (MM/YY).'
      if (!/^\d{3,4}$/.test(card.cvc)) e.cvc = 'Enter the 3 or 4 digit CVC.'
      // Poora card number server ko nahi jata — sirf brand aur last 4 digits
      payment = { method, brand: cardBrand(card.number), last4: onlyDigits(card.number).slice(-4) }
    }
    if (method === 'qr') {
      if (txn.trim().length < 6) e.txn = 'Enter the transaction ID from your banking app after paying.'
      payment = { method, reference: txn.trim() }
    }
    setErrors(e)
    if (Object.keys(e).length) return
    setBusy(true)
    try {
      const res = await submit(details, payment)
      setResult({ data: res, payment })
      setStep('success')
      onSuccess?.(res)
    } catch (err) {
      setError(err.message)
    } finally { setBusy(false) }
  }

  const label = (m) => (m === 'cash' ? 'Place Order (Pay on Delivery)' : m === 'qr' ? `I Have Paid ${money(amount)}` : `Pay ${money(amount)}`)

  return (
    <div className="modal-wrap" role="dialog" aria-modal="true" aria-label={title}>
      <div className="backdrop" onClick={() => !busy && onClose()} />
      <div className="modal">
        <header className="modal-head">
          <h2>{step === 'success' ? 'All done' : title}</h2>
          <button className="icon-btn" onClick={onClose} disabled={busy} aria-label="Close"><X size={26} /></button>
        </header>

        {step === 'success' ? (
          <div className="modal-body success-box" role="status">
            <span className="success-icon"><Check size={38} aria-hidden="true" /></span>
            <h3>{successTitle}</h3>
            <p>{successText(result?.data)}</p>
            {result?.payment.method === 'qr' && <p className="note"><Info size={20} aria-hidden="true" /> We will verify your QR payment (ID: {result.payment.reference}) and confirm shortly.</p>}
            {result?.payment.method === 'card' && salon.payments.demoMode && <p className="note"><Info size={20} aria-hidden="true" /> Demo mode — no real money was charged.</p>}
            <button className="btn btn-primary btn-lg" onClick={onClose}>Close</button>
          </div>
        ) : (
          <div className="modal-body checkout-grid">
            <div className="checkout-main">
              {step === 'details' && (
                <form onSubmit={goPayment} noValidate>
                  <h3>Delivery details</h3>
                  <div className="field-row">
                    <div className="field"><label htmlFor="c-name">Full name *</label><input id="c-name" autoComplete="name" value={details.name} onChange={(e) => setD({ name: e.target.value })} aria-invalid={!!errors.name} />{errors.name && <p className="field-error"><AlertCircle size={17} /> {errors.name}</p>}</div>
                    <div className="field"><label htmlFor="c-phone">Phone *</label><input id="c-phone" type="tel" autoComplete="tel" inputMode="tel" value={details.phone} onChange={(e) => setD({ phone: e.target.value })} aria-invalid={!!errors.phone} />{errors.phone && <p className="field-error"><AlertCircle size={17} /> {errors.phone}</p>}</div>
                  </div>
                  <div className="field"><label htmlFor="c-email">Email <span className="opt">(optional)</span></label><input id="c-email" type="email" autoComplete="email" value={details.email} onChange={(e) => setD({ email: e.target.value })} aria-invalid={!!errors.email} />{errors.email && <p className="field-error"><AlertCircle size={17} /> {errors.email}</p>}</div>
                  <div className="field"><label htmlFor="c-address">Full address *</label><input id="c-address" autoComplete="street-address" value={details.address} onChange={(e) => setD({ address: e.target.value })} placeholder="House #, street, area" aria-invalid={!!errors.address} />{errors.address && <p className="field-error"><AlertCircle size={17} /> {errors.address}</p>}</div>
                  <div className="field"><label htmlFor="c-city">City *</label><input id="c-city" autoComplete="address-level2" value={details.city} onChange={(e) => setD({ city: e.target.value })} aria-invalid={!!errors.city} />{errors.city && <p className="field-error"><AlertCircle size={17} /> {errors.city}</p>}</div>
                  <div className="field"><label htmlFor="c-notes">Order notes <span className="opt">(optional)</span></label><input id="c-notes" value={details.notes} onChange={(e) => setD({ notes: e.target.value })} /></div>
                  <button className="btn btn-primary btn-lg btn-block" type="submit">Continue to Payment</button>
                </form>
              )}

              {step === 'payment' && (
                <form onSubmit={pay} noValidate>
                  {needDetails && <button type="button" className="back-link" onClick={() => setStep('details')}><ArrowLeft size={18} aria-hidden="true" /> Edit details</button>}
                  <h3>Choose payment method</h3>
                  <div className="method-tabs" role="tablist">
                    {methods.map(({ id, label: l, icon: Icon }) => (
                      <button type="button" key={id} role="tab" aria-selected={method === id} className={`method ${method === id ? 'active' : ''}`} onClick={() => { setMethod(id); setErrors({}); setError('') }}>
                        <Icon size={24} aria-hidden="true" /> {l}
                      </button>
                    ))}
                  </div>

                  {method === 'card' && (
                    <div className="pay-panel">
                      {salon.payments.demoMode && <p className="note warn"><Info size={20} aria-hidden="true" /> Demo mode: no real money is charged. Try card 4242 4242 4242 4242.</p>}
                      <div className="field"><label htmlFor="cc-number">Card number</label><input id="cc-number" inputMode="numeric" autoComplete="cc-number" placeholder="1234 5678 9012 3456" value={card.number} onChange={(e) => setC({ number: formatCardNumber(e.target.value) })} aria-invalid={!!errors.number} />{errors.number && <p className="field-error"><AlertCircle size={17} /> {errors.number}</p>}</div>
                      <div className="field"><label htmlFor="cc-name">Name on card</label><input id="cc-name" autoComplete="cc-name" value={card.name} onChange={(e) => setC({ name: e.target.value })} aria-invalid={!!errors.cardName} />{errors.cardName && <p className="field-error"><AlertCircle size={17} /> {errors.cardName}</p>}</div>
                      <div className="field-row">
                        <div className="field"><label htmlFor="cc-exp">Expiry</label><input id="cc-exp" inputMode="numeric" autoComplete="cc-exp" placeholder="MM/YY" value={card.expiry} onChange={(e) => setC({ expiry: formatExpiry(e.target.value) })} aria-invalid={!!errors.expiry} />{errors.expiry && <p className="field-error"><AlertCircle size={17} /> {errors.expiry}</p>}</div>
                        <div className="field"><label htmlFor="cc-cvc">CVC</label><input id="cc-cvc" inputMode="numeric" autoComplete="cc-csc" maxLength={4} placeholder="123" value={card.cvc} onChange={(e) => setC({ cvc: onlyDigits(e.target.value) })} aria-invalid={!!errors.cvc} />{errors.cvc && <p className="field-error"><AlertCircle size={17} /> {errors.cvc}</p>}</div>
                      </div>
                      <p className="secure"><Lock size={17} aria-hidden="true" /> Your full card number is never stored on our server.</p>
                    </div>
                  )}

                  {method === 'qr' && (
                    <div className="pay-panel">
                      <PayQR amount={amount} reference={reference} />
                      <ol className="qr-steps">
                        <li>Open JazzCash, Easypaisa or your bank app and scan the QR.</li>
                        <li>Pay exactly <strong>{money(amount)}</strong>.</li>
                        <li>Enter the transaction ID below so we can verify it.</li>
                      </ol>
                      <p className="acct">Account: <strong>{salon.payments.qr.accountTitle}</strong> · {salon.payments.qr.accountNumber}</p>
                      <div className="field"><label htmlFor="txn">Transaction ID</label><input id="txn" value={txn} onChange={(e) => setTxn(e.target.value)} placeholder="e.g. 4829301847" aria-invalid={!!errors.txn} />{errors.txn && <p className="field-error"><AlertCircle size={17} /> {errors.txn}</p>}</div>
                    </div>
                  )}

                  {method === 'cash' && (
                    <div className="pay-panel"><p className="note"><Banknote size={22} aria-hidden="true" /> Pay <strong>{money(amount)}</strong> in cash when your order arrives.</p></div>
                  )}

                  {error && <p className="alert" role="alert"><AlertCircle size={20} aria-hidden="true" /> {error}</p>}
                  <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={busy}>
                    {busy ? <><Loader2 size={22} className="spin" aria-hidden="true" /> Processing…</> : label(method)}
                  </button>
                </form>
              )}
            </div>

            <aside className="checkout-summary" aria-label="Order summary">
              <h3>Summary</h3>
              <ul>
                {lines.map((l, i) => <li key={i}><span>{l.label}</span><strong>{l.value}</strong></li>)}
              </ul>
              <div className="sum-row total"><span>Total</span><span>{money(amount)}</span></div>
            </aside>
          </div>
        )}
      </div>
    </div>
  )
}
