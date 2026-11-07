import { useEffect, useMemo, useState } from 'react'
import { CalendarCheck, Check, Loader2, AlertCircle, Phone, Clock, Wallet, MessageCircle } from 'lucide-react'
import { salon, buildSlots, formatTime } from '@shared/salon.js'
import { api } from '../api/client.js'
import { useApp } from '../context/AppContext.jsx'
import { money, todayISO, addDaysISO, prettyDate, onlyDigits } from '../utils/format.js'
import Reveal from './Reveal.jsx'
import CheckoutModal from './CheckoutModal.jsx'

const empty = { name: '', phone: '', email: '', date: '', time: '', services: [], notes: '', pay: 'salon' }
const steps = ['Choose your service(s)', 'Pick a date & time slot', 'Confirm — pay at salon or advance online']

export default function Booking() {
  const { bookingService, services } = useApp()
  const [form, setForm] = useState(empty)
  const [slots, setSlots] = useState([])
  const [slotState, setSlotState] = useState('idle') // idle | loading | ok | offline
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [payOpen, setPayOpen] = useState(false)
  const [done, setDone] = useState(null)

  const set = (patch) => setForm((f) => ({ ...f, ...patch }))
  const total = useMemo(() => form.services.reduce((t, id) => t + (services.find((s) => s.id === id)?.price || 0), 0), [form.services, services])
  const advance = salon.booking.advance

  // "Book This Service" dabane par service khud select ho jaye
  useEffect(() => {
    if (bookingService) setForm((f) => (f.services.includes(bookingService.id) ? f : { ...f, services: [...f.services, bookingService.id] }))
  }, [bookingService])

  // Date badalne par live slots
  useEffect(() => {
    if (!form.date) { setSlots([]); setSlotState('idle'); return }
    let alive = true
    setSlotState('loading')
    api.availability(form.date)
      .then((d) => { if (alive) { setSlots(d.slots); setSlotState('ok') } })
      .catch(() => { if (alive) { setSlots(buildSlots().map((time) => ({ time, label: formatTime(time), available: true }))); setSlotState('offline') } })
    return () => { alive = false }
  }, [form.date])

  const toggleService = (id) => set({ services: form.services.includes(id) ? form.services.filter((s) => s !== id) : [...form.services, id] })

  const validate = () => {
    const e = {}
    if (!form.services.length) e.services = 'Please choose at least one service.'
    if (!form.date) e.date = 'Please choose a date.'
    if (!form.time) e.time = 'Please choose a time slot.'
    if (form.name.trim().length < 2) e.name = 'Please enter your name.'
    if (onlyDigits(form.phone).length < 10) e.phone = 'Please enter a valid phone number (at least 10 digits).'
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email)) e.email = 'Please enter a valid email address.'
    return e
  }

  const send = async (payment) => {
    const { booking } = await api.createBooking({ ...form, payment })
    return booking
  }

  const onSubmit = async (ev) => {
    ev.preventDefault()
    setServerError('')
    const e = validate()
    setErrors(e)
    if (Object.keys(e).length) {
      document.querySelector('.booking-form [aria-invalid="true"], .booking-form .field-error')?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      return
    }
    if (form.pay === 'online' && advance > 0) { setPayOpen(true); return }
    setSubmitting(true)
    try { setDone(await send({ method: 'cash' })) }
    catch (err) { setServerError(err.message); if (err.status === 409) set({ time: '' }) }
    finally { setSubmitting(false) }
  }

  const reset = () => { setForm(empty); setDone(null); setErrors({}); setServerError('') }

  const waText = done ? encodeURIComponent(`Hello ${salon.name}, my booking ${done.id} is on ${prettyDate(done.date)} at ${formatTime(done.time)}.`) : ''

  return (
    <section className="section booking" id="booking">
      <div className="container booking-grid">
        <Reveal className="booking-info">
          <span className="eyebrow">Book Appointment</span>
          <h2>Reserve your <em>chair</em> in a minute</h2>
          <p>Choose your service, pick a time that suits you and we will have everything ready when you arrive.</p>
          <ol className="steps">
            {steps.map((s, i) => <li key={s}><span>{i + 1}</span>{s}</li>)}
          </ol>
          <div className="info-lines">
            <a href={`tel:${salon.phone.replace(/\s/g, '')}`}><Phone size={22} aria-hidden="true" /> {salon.phone}</a>
            <span><Clock size={22} aria-hidden="true" /> {salon.hours[0].days}: {salon.hours[0].time}</span>
            {advance > 0 && <span><Wallet size={22} aria-hidden="true" /> Optional {money(advance)} advance — adjusted in your final bill</span>}
          </div>
        </Reveal>

        <Reveal delay={120} className="form-card">
          {done ? (
            <div className="success-box" role="status">
              <span className="success-icon"><Check size={38} aria-hidden="true" /></span>
              <h3>Booking received!</h3>
              <p>Thank you, {done.name}. Your slot is reserved — we will confirm your appointment shortly.</p>
              <dl className="receipt">
                <div><dt>Booking ID</dt><dd>{done.id}</dd></div>
                <div><dt>Date</dt><dd>{prettyDate(done.date)}</dd></div>
                <div><dt>Time</dt><dd>{formatTime(done.time)}</dd></div>
                <div><dt>Services</dt><dd>{done.services.map((s) => s.name).join(', ')}</dd></div>
                <div><dt>Estimated total</dt><dd>from {money(done.estimatedTotal)}</dd></div>
                <div><dt>Payment</dt><dd>{done.payment.method === 'cash' ? 'Pay at salon' : done.payment.status === 'paid_demo' ? `Advance ${money(done.payment.amount)} paid by card` : `Advance ${money(done.payment.amount)} — verifying your QR payment`}</dd></div>
              </dl>
              <div className="success-actions">
                <a className="btn btn-whatsapp" href={`https://wa.me/${salon.whatsapp}?text=${waText}`} target="_blank" rel="noreferrer"><MessageCircle size={20} aria-hidden="true" /> Message us on WhatsApp</a>
                <button className="btn btn-outline" onClick={reset}>Make another booking</button>
              </div>
            </div>
          ) : (
            <form className="booking-form" onSubmit={onSubmit} noValidate>
              <h3>Your appointment</h3>

              <fieldset className="field">
                <legend>1. Choose service(s) <span className="req">*</span></legend>
                <div className="chips">
                  {services.map((s) => (
                    <button type="button" key={s.id} className={`chip ${form.services.includes(s.id) ? 'selected' : ''}`} onClick={() => toggleService(s.id)} aria-pressed={form.services.includes(s.id)}>
                      {form.services.includes(s.id) && <Check size={16} aria-hidden="true" />} {s.name}
                    </button>
                  ))}
                </div>
                {errors.services && <p className="field-error"><AlertCircle size={17} aria-hidden="true" /> {errors.services}</p>}
                {total > 0 && <p className="estimate">Estimated total: <strong>from {money(total)}</strong></p>}
              </fieldset>

              <div className="field">
                <label htmlFor="b-date">2. Preferred date <span className="req">*</span></label>
                <input id="b-date" type="date" min={todayISO()} max={addDaysISO(salon.booking.maxDaysAhead)} value={form.date} onChange={(e) => set({ date: e.target.value, time: '' })} aria-invalid={!!errors.date} />
                {errors.date && <p className="field-error"><AlertCircle size={17} aria-hidden="true" /> {errors.date}</p>}
              </div>

              <fieldset className="field">
                <legend>3. Time slot <span className="req">*</span></legend>
                {slotState === 'idle' && <p className="hint">Choose a date to see available times.</p>}
                {slotState === 'loading' && <p className="hint"><Loader2 size={18} className="spin" aria-hidden="true" /> Checking availability…</p>}
                {(slotState === 'ok' || slotState === 'offline') && (
                  <div className="slots">
                    {slots.map((s) => (
                      <button type="button" key={s.time} disabled={!s.available} className={`slot ${form.time === s.time ? 'selected' : ''}`} onClick={() => set({ time: s.time })} aria-pressed={form.time === s.time}>
                        {s.label}{!s.available && <small>Full</small>}
                      </button>
                    ))}
                  </div>
                )}
                {slotState === 'offline' && <p className="hint">Live availability is unavailable right now — we will confirm your slot by phone.</p>}
                {errors.time && <p className="field-error"><AlertCircle size={17} aria-hidden="true" /> {errors.time}</p>}
              </fieldset>

              <div className="field-row">
                <div className="field">
                  <label htmlFor="b-name">Full name <span className="req">*</span></label>
                  <input id="b-name" autoComplete="name" value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="Your name" aria-invalid={!!errors.name} />
                  {errors.name && <p className="field-error"><AlertCircle size={17} aria-hidden="true" /> {errors.name}</p>}
                </div>
                <div className="field">
                  <label htmlFor="b-phone">Phone / WhatsApp <span className="req">*</span></label>
                  <input id="b-phone" type="tel" autoComplete="tel" inputMode="tel" value={form.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="03xx xxxxxxx" aria-invalid={!!errors.phone} />
                  {errors.phone && <p className="field-error"><AlertCircle size={17} aria-hidden="true" /> {errors.phone}</p>}
                </div>
              </div>

              <div className="field">
                <label htmlFor="b-email">Email <span className="opt">(optional)</span></label>
                <input id="b-email" type="email" autoComplete="email" value={form.email} onChange={(e) => set({ email: e.target.value })} placeholder="you@example.com" aria-invalid={!!errors.email} />
                {errors.email && <p className="field-error"><AlertCircle size={17} aria-hidden="true" /> {errors.email}</p>}
              </div>

              <div className="field">
                <label htmlFor="b-notes">Notes <span className="opt">(optional)</span></label>
                <textarea id="b-notes" rows={3} value={form.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Hair length, reference photo plan, allergies…" />
              </div>

              {advance > 0 && (
                <fieldset className="field">
                  <legend>Payment</legend>
                  <div className="radio-row">
                    <label className={`radio ${form.pay === 'salon' ? 'selected' : ''}`}><input type="radio" name="pay" checked={form.pay === 'salon'} onChange={() => set({ pay: 'salon' })} /> Pay at the salon</label>
                    <label className={`radio ${form.pay === 'online' ? 'selected' : ''}`}><input type="radio" name="pay" checked={form.pay === 'online'} onChange={() => set({ pay: 'online' })} /> Pay {money(advance)} advance online</label>
                  </div>
                </fieldset>
              )}

              {serverError && <p className="alert" role="alert"><AlertCircle size={20} aria-hidden="true" /> {serverError}</p>}

              <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={submitting}>
                {submitting ? <><Loader2 size={22} className="spin" aria-hidden="true" /> Booking…</> : <><CalendarCheck size={22} aria-hidden="true" /> {form.pay === 'online' && advance > 0 ? `Continue to Pay ${money(advance)}` : 'Confirm Booking'}</>}
              </button>
            </form>
          )}
        </Reveal>
      </div>

      <CheckoutModal
        open={payOpen}
        kind="booking"
        title="Pay advance"
        amount={advance}
        lines={[{ label: `Advance for ${form.services.length} service(s) — ${form.date ? prettyDate(form.date) : ''} ${form.time ? formatTime(form.time) : ''}`, value: money(advance) }]}
        needDetails={false}
        submit={(_, payment) => send(payment)}
        onSuccess={(booking) => setDone(booking)}
        onClose={() => setPayOpen(false)}
        successTitle="Booking received!"
        successText={(b) => `Your slot on ${b.date ? prettyDate(b.date) : ''} is reserved and we will confirm it shortly. Booking ID: ${b.id}.`}
      />
    </section>
  )
}
