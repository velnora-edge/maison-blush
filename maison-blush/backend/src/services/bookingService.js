import { salon, buildSlots, formatTime } from '../../../shared/salon.js'
import { repos } from '../db/index.js'
import { makeCode, isDup } from '../utils/ids.js'
import { clean, isEmail, isPhone, assertValid, HttpError } from './validate.js'
import { processPayment } from './payments.js'

const pad = (n) => String(n).padStart(2, '0')
export const isDate = (d) => /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(d))
export const todayStr = () => { const n = new Date(); return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}` }
const slotPassed = (date, time) => {
  if (date !== todayStr()) return false
  const n = new Date(); const [h, m] = time.split(':').map(Number)
  return n.getHours() * 60 + n.getMinutes() >= h * 60 + m
}

export async function getAvailability(date) {
  if (!isDate(date)) throw new HttpError(400, 'Please choose a valid date.')
  const held = await repos.bookings.find({ date, holdsSeat: true }, { select: 'time' })
  return buildSlots().map((time) => {
    const left = Math.max(0, salon.booking.chairs - held.filter((b) => b.time === time).length)
    return { time, label: formatTime(time), left, available: left > 0 && !slotPassed(date, time) }
  })
}

export async function createBooking(b = {}) {
  const name = clean(b.name, 80), phone = clean(b.phone, 20), email = clean(b.email, 120).toLowerCase(), notes = clean(b.notes, 500)
  const date = clean(b.date, 10), time = clean(b.time, 5)

  // Prices/naam hamesha DB se — browser ki bheji hui price par bharosa nahi
  const wanted = [...new Set((Array.isArray(b.services) ? b.services : []).map((s) => clean(s, 60)))]
  const found = wanted.length ? await repos.services.find({ slug: { $in: wanted }, active: true }) : []
  const picked = wanted.map((slug) => found.find((s) => s.slug === slug)).filter(Boolean)

  const errors = {}
  if (name.length < 2) errors.name = 'Please enter your name.'
  if (!isPhone(phone)) errors.phone = 'Please enter a valid phone number.'
  if (email && !isEmail(email)) errors.email = 'Please enter a valid email address.'
  if (!picked.length) errors.services = 'Please choose at least one service.'
  if (!isDate(date)) errors.date = 'Please choose a date.'
  else {
    const max = new Date(); max.setDate(max.getDate() + salon.booking.maxDaysAhead)
    if (date < todayStr()) errors.date = 'That date has already passed.'
    else if (new Date(date) > max) errors.date = `Bookings open up to ${salon.booking.maxDaysAhead} days ahead.`
  }
  if (!buildSlots().includes(time)) errors.time = 'Please choose a time slot.'
  else if (!errors.date && slotPassed(date, time)) errors.time = 'That time has already passed. Please choose a later slot.'
  assertValid(errors)

  // Payment se pehle slot check, taake slot bhara ho to koi payment record na ho
  if ((await repos.bookings.count({ date, time, holdsSeat: true })) >= salon.booking.chairs) {
    throw new HttpError(409, 'Sorry, that time slot is full. Please pick another one.')
  }

  const wantsAdvance = b.payment && b.payment.method !== 'cash' && salon.booking.advance > 0
  const payment = wantsAdvance
    ? await processPayment({ method: b.payment.method, kind: 'booking', amount: salon.booking.advance, payment: b.payment })
    : await processPayment({ method: 'cash', kind: 'booking', amount: 0 })

  const doc = {
    name, phone, email: email || undefined, date, time,
    services: picked.map((s) => ({ slug: s.slug, name: s.name, price: s.price })),
    estimatedTotal: picked.reduce((t, s) => t + s.price, 0),
    notes: notes || undefined, status: 'pending', payment, holdsSeat: true,
  }

  // Har seat ke liye koshish: database ka unique index (date,time,seat) race-condition mein bhi double booking rokta hai.
  for (let seat = 1; seat <= salon.booking.chairs; seat++) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try { return await repos.bookings.create({ ...doc, code: makeCode('BK'), seat }) }
      catch (e) {
        if (isDup(e, 'seat')) break // is seat par koi aur hai -> agli seat
        if (isDup(e, 'code')) continue // code takra gaya -> naya code
        throw e
      }
    }
  }
  throw new HttpError(409, 'Sorry, that time slot was just taken. Please pick another one.')
}

export async function setBookingStatus(id, status) {
  const b = await repos.bookings.get(id)
  if (!b) throw new HttpError(404, 'Booking not found.')
  if (status === b.status) return b
  if (status === 'cancelled') return repos.bookings.update(id, { status, holdsSeat: false }) // seat khali
  if (b.holdsSeat) return repos.bookings.update(id, { status })
  // Cancelled booking dobara kholna: koi seat khali honi chahiye
  const seats = [b.seat, ...Array.from({ length: salon.booking.chairs }, (_, i) => i + 1).filter((s) => s !== b.seat)]
  for (const seat of seats) {
    try { return await repos.bookings.update(id, { status, holdsSeat: true, seat }) }
    catch (e) { if (!isDup(e, 'seat')) throw e }
  }
  throw new HttpError(409, 'That time slot is now full, so this booking cannot be reopened.')
}

export const publicBooking = (b) => ({
  id: b.code, name: b.name, phone: b.phone, email: b.email || null, date: b.date, time: b.time,
  services: b.services.map((s) => ({ id: s.slug, name: s.name, price: s.price })),
  estimatedTotal: b.estimatedTotal, notes: b.notes || null, status: b.status,
  payment: { method: b.payment.method, status: b.payment.status, amount: b.payment.amount },
  createdAt: b.createdAt,
})
