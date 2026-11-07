import { repos } from '../db/index.js'
import { digits } from './validate.js'

const pad = (n) => String(n).padStart(2, '0')
export const monthKey = (d) => { const x = new Date(d); return `${x.getFullYear()}-${pad(x.getMonth() + 1)}` }
const monthLabel = (key) => { const [y, m] = key.split('-').map(Number); return new Date(y, m - 1, 1).toLocaleString('en-GB', { month: 'short', year: 'numeric' }) }
const lastMonths = (n) => Array.from({ length: n }, (_, i) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - (n - 1 - i)); return monthKey(d) })

/**
 * REVENUE KA RULE: sirf wo records jinki payment admin/webhook ne "paid" verify ki ho aur jo cancelled na hon.
 * paid_demo, pay_on_delivery, pay_at_salon, awaiting_verification, failed, refunded — kuch bhi revenue nahi.
 */
export const isRevenue = (r) => r.status !== 'cancelled' && r.payment?.status === 'paid'
export const revenueOf = (r) => r.payment?.paidAmount || r.total || 0
export const paidDate = (r) => r.payment?.paidAt || r.updatedAt || r.createdAt

const top = (map, n, key) => [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([name, count]) => ({ name, [key]: count }))

export async function overview(months = 6) {
  const [bookings, orders, messages, subscribers] = await Promise.all([
    repos.bookings.find({}, { select: 'code name status createdAt updatedAt date time services payment estimatedTotal' }),
    repos.orders.find({}, { select: 'code customer status createdAt updatedAt items payment total' }),
    repos.messages.find({}, { select: 'name status createdAt' }),
    repos.subscribers.find({}, { select: 'email createdAt' }),
  ])

  const count = (rows, status) => rows.filter((r) => r.status === status).length
  const keys = lastMonths(months)
  const monthly = new Map(keys.map((k) => [k, { month: k, label: monthLabel(k), bookings: 0, orders: 0, total: 0 }]))
  let bookingRevenue = 0, orderRevenue = 0, paidCount = 0
  for (const [kind, rows] of [['bookings', bookings], ['orders', orders]]) {
    for (const r of rows.filter(isRevenue)) {
      const amt = revenueOf(r)
      kind === 'bookings' ? (bookingRevenue += amt) : (orderRevenue += amt)
      paidCount++
      const m = monthly.get(monthKey(paidDate(r)))
      if (m) { m[kind] += amt; m.total += amt }
    }
  }

  const svc = new Map(), prod = new Map()
  bookings.filter((b) => b.status !== 'cancelled').forEach((b) => b.services.forEach((s) => svc.set(s.name, (svc.get(s.name) || 0) + 1)))
  orders.filter((o) => o.status !== 'cancelled').forEach((o) => o.items.forEach((i) => prod.set(i.name, (prod.get(i.name) || 0) + i.qty)))

  const bookingsByMonth = new Map(keys.map((k) => [k, { month: k, label: monthLabel(k), count: 0 }]))
  bookings.forEach((b) => { const m = bookingsByMonth.get(monthKey(b.createdAt)); if (m) m.count++ })

  const newest = (rows, n) => [...rows].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, n)
  const activity = [
    ...newest(bookings, 8).map((b) => ({ type: 'booking', text: `${b.name} booked ${b.services.map((s) => s.name).join(', ')}`, ref: b.code, at: b.createdAt })),
    ...newest(orders, 8).map((o) => ({ type: 'order', text: `${o.customer.name} placed an order (${o.items.reduce((t, i) => t + i.qty, 0)} item(s))`, ref: o.code, at: o.createdAt })),
    ...newest(messages, 8).map((m) => ({ type: 'message', text: `${m.name} sent a message`, ref: '', at: m.createdAt })),
    ...newest(subscribers, 8).map((s) => ({ type: 'subscriber', text: `${s.email} subscribed to the newsletter`, ref: '', at: s.createdAt })),
  ].sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 10)

  return {
    cards: {
      totalBookings: bookings.length, pendingBookings: count(bookings, 'pending'), confirmedBookings: count(bookings, 'confirmed'),
      totalOrders: orders.length, pendingOrders: count(orders, 'pending'),
      messages: messages.length, unreadMessages: count(messages, 'new'), subscribers: subscribers.length,
      totalRevenue: bookingRevenue + orderRevenue, bookingRevenue, orderRevenue, paidTransactions: paidCount,
    },
    bookingStatus: ['pending', 'confirmed', 'completed', 'cancelled'].map((s) => ({ status: s, count: count(bookings, s) })),
    monthlyRevenue: [...monthly.values()],
    bookingsByMonth: [...bookingsByMonth.values()],
    popularServices: top(svc, 5, 'bookings'),
    bestSellers: top(prod, 5, 'units'),
    recentBookings: newest(bookings, 5),
    recentOrders: newest(orders, 5),
    recentActivity: activity,
  }
}

export async function reports({ from, to }) {
  const [bookings, orders] = await Promise.all([repos.bookings.find({}), repos.orders.find({})])
  const f = from ? new Date(`${from}T00:00:00`) : new Date(0)
  const t = to ? new Date(`${to}T23:59:59.999`) : new Date(8.64e15)
  const tx = [
    ...bookings.filter(isRevenue).map((b) => ({ type: 'Booking', code: b.code, customer: b.name, amount: revenueOf(b), method: b.payment.method, paidAt: paidDate(b) })),
    ...orders.filter(isRevenue).map((o) => ({ type: 'Order', code: o.code, customer: o.customer.name, amount: revenueOf(o), method: o.payment.method, paidAt: paidDate(o) })),
  ].filter((x) => new Date(x.paidAt) >= f && new Date(x.paidAt) <= t).sort((a, b) => new Date(b.paidAt) - new Date(a.paidAt))

  const monthly = new Map(), methods = new Map()
  let bookingsTotal = 0, ordersTotal = 0
  for (const x of tx) {
    const k = monthKey(x.paidAt)
    const m = monthly.get(k) || { month: k, label: monthLabel(k), bookings: 0, orders: 0, total: 0 }
    m[x.type === 'Booking' ? 'bookings' : 'orders'] += x.amount; m.total += x.amount; monthly.set(k, m)
    methods.set(x.method, (methods.get(x.method) || 0) + x.amount)
    x.type === 'Booking' ? (bookingsTotal += x.amount) : (ordersTotal += x.amount)
  }
  return {
    total: bookingsTotal + ordersTotal, bookingsTotal, ordersTotal, count: tx.length,
    monthly: [...monthly.values()].sort((a, b) => a.month.localeCompare(b.month)),
    byMethod: [...methods.entries()].map(([method, amount]) => ({ method, amount })).sort((a, b) => b.amount - a.amount),
    transactions: tx,
  }
}

/** Customers ka koi alag account nahi hota — bookings aur orders se phone number ke hisaab se jama kiye jate hain */
export async function customers(q = '') {
  const [bookings, orders] = await Promise.all([repos.bookings.find({}), repos.orders.find({})])
  const map = new Map()
  const touch = (name, phone, email, at) => {
    const key = digits(phone).slice(-10)
    if (!key) return null
    const c = map.get(key) || { phone, name, email: '', bookings: 0, orders: 0, totalSpent: 0, lastActivity: at }
    if (new Date(at) >= new Date(c.lastActivity)) { c.name = name; c.phone = phone; c.lastActivity = at }
    if (email && !c.email) c.email = email
    map.set(key, c)
    return c
  }
  for (const b of bookings) { const c = touch(b.name, b.phone, b.email, b.createdAt); if (c) { c.bookings++; if (isRevenue(b)) c.totalSpent += revenueOf(b) } }
  for (const o of orders) { const c = touch(o.customer.name, o.customer.phone, o.customer.email, o.createdAt); if (c) { c.orders++; if (isRevenue(o)) c.totalSpent += revenueOf(o) } }
  const needle = q.trim().toLowerCase()
  return [...map.values()]
    .filter((c) => !needle || `${c.name} ${c.phone} ${c.email}`.toLowerCase().includes(needle))
    .sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity))
}
