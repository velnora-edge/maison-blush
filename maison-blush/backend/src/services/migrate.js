import { salon } from '../../../shared/salon.js'
import { repos } from '../db/index.js'

/** Purane JSON records (backend/data/*.json) -> naye MongoDB shape. Purani id legacyId mein rehti hai, is liye dobara chalane se duplicate nahi banta. */
const date = (v) => (v ? new Date(v) : new Date())
const payment = (p = {}) => ({
  method: p.method || 'cash', status: p.status || 'pay_at_salon', amount: p.amount || 0, paidAmount: 0,
  ...(p.reference && { reference: p.reference }), ...(p.brand && { brand: p.brand }), ...(p.last4 && { last4: p.last4 }),
})

export const mapBooking = (b, seat) => ({
  code: b.id, legacyId: b.id, name: b.name, phone: b.phone, ...(b.email && { email: b.email }), date: b.date, time: b.time,
  seat, holdsSeat: seat <= salon.booking.chairs && b.status !== 'cancelled',
  services: (b.services || []).map((s) => ({ slug: s.id, name: s.name, price: s.price })),
  estimatedTotal: b.estimatedTotal || 0, ...(b.notes && { notes: b.notes }),
  status: ['pending', 'confirmed', 'completed', 'cancelled'].includes(b.status) ? b.status : 'confirmed',
  payment: payment(b.payment), createdAt: date(b.createdAt),
})
export const mapOrder = (o) => ({
  code: o.id, legacyId: o.id,
  customer: { name: o.customer?.name, phone: o.customer?.phone, ...(o.customer?.email && { email: o.customer.email }), address: o.customer?.address, city: o.customer?.city, ...(o.customer?.notes && { notes: o.customer.notes }) },
  items: (o.items || []).map((i) => ({ slug: i.id, name: i.name, price: i.price, qty: i.qty })),
  subtotal: o.subtotal, shipping: o.shipping, total: o.total,
  status: ({ received: 'pending' })[o.status] || (['pending', 'processing', 'shipped', 'delivered', 'cancelled'].includes(o.status) ? o.status : 'pending'),
  payment: payment({ ...o.payment, amount: o.payment?.amount ?? o.total }), createdAt: date(o.createdAt),
})
export const mapMessage = (m) => ({ legacyId: m.id, name: m.name, ...(m.phone && { phone: m.phone }), ...(m.email && { email: m.email }), message: m.message, status: 'new', createdAt: date(m.createdAt) })
export const mapSubscriber = (s) => ({ email: String(s.email).toLowerCase(), createdAt: date(s.createdAt) })

/** data = { bookings: [], orders: [], messages: [], subscribers: [] } (JSON se padhe hue) */
export async function migrate(data) {
  const report = {}
  const run = async (name, rows, repo, map, key) => {
    const r = { found: rows.length, inserted: 0, skipped: 0, failed: [] }
    for (const [i, row] of rows.entries()) {
      try {
        const doc = map(row, i)
        if (await repo.findOne(key(doc))) { r.skipped++; continue }
        await repo.create(doc); r.inserted++
      } catch (e) { r.failed.push(`${row.id || row.email || i}: ${e.message}`) }
    }
    report[name] = r
  }

  // Bookings: har (date,time) par seats 1,2,3... baanto
  const seatCount = new Map()
  const seatFor = (b) => { const k = `${b.date}|${b.time}`; const n = (seatCount.get(k) || 0) + 1; seatCount.set(k, n); return n }
  const withSeats = (data.bookings || []).map((b) => ({ ...b, __seat: seatFor(b) }))
  await run('bookings', withSeats, repos.bookings, (b) => mapBooking(b, b.__seat), (d) => ({ legacyId: d.legacyId }))
  await run('orders', data.orders || [], repos.orders, mapOrder, (d) => ({ legacyId: d.legacyId }))
  await run('messages', data.messages || [], repos.messages, mapMessage, (d) => ({ legacyId: d.legacyId }))
  await run('subscribers', data.subscribers || [], repos.subscribers, mapSubscriber, (d) => ({ email: d.email }))

  // Verify: file ke har record ka DB mein hona zaroori hai
  report.verified = Object.values(report).every((r) => r.failed.length === 0 && r.inserted + r.skipped === r.found)
  return report
}
