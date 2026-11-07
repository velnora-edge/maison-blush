import { Router } from 'express'
import { repos } from '../../db/index.js'
import { ENUMS } from '../../db/schemaDefs.js'
import { csrfGuard, requireAdmin } from '../../middleware/adminAuth.js'
import { wrap, escapeRegex } from '../../utils/sanitize.js'
import { toCSV } from '../../utils/csv.js'
import { HttpError, clean } from '../../services/validate.js'
import { setBookingStatus, isDate } from '../../services/bookingService.js'
import { setOrderStatus } from '../../services/orderService.js'
import { recordPayment } from '../../services/paymentRecords.js'
import * as stats from '../../services/stats.js'
import authRoutes from './auth.js'
import { catalogRouter } from './catalog.js'

const router = Router()
router.use(csrfGuard)
router.use('/auth', authRoutes) // login/logout/me (login ke liye cookie nahi chahiye)
router.use(requireAdmin) // iske neeche sab kuch sirf logged-in admin ke liye

// ---------- helpers ----------
const pageOf = (q) => ({ page: Math.max(1, parseInt(q.page, 10) || 1), limit: Math.min(100, Math.max(1, parseInt(q.limit, 10) || 15)) })
const search = (q, fields) => (q ? { $or: fields.map((f) => ({ [f]: { $regex: escapeRegex(clean(q, 60)), $options: 'i' } })) } : null)
const oneOf = (value, list, label) => { if (!list.includes(value)) throw new HttpError(400, `Invalid ${label}.`); return value }

async function list(repo, filter, q, sort = { createdAt: -1 }) {
  const { page, limit } = pageOf(q)
  const total = await repo.count(filter)
  const items = await repo.find(filter, { sort, skip: (page - 1) * limit, limit })
  return { items, total, page, pages: Math.max(1, Math.ceil(total / limit)) }
}
const combine = (...parts) => { const and = parts.filter(Boolean); return and.length === 0 ? {} : and.length === 1 ? and[0] : { $and: and } }

// ---------- overview / reports ----------
router.get('/stats', wrap(async (req, res) => res.json(await stats.overview(Math.min(12, Math.max(3, parseInt(req.query.months, 10) || 6))))))

router.get('/reports/revenue', wrap(async (req, res) => {
  const { from, to } = req.query
  if ((from && !isDate(from)) || (to && !isDate(to))) throw new HttpError(400, 'Invalid date range.')
  res.json(await stats.reports({ from, to }))
}))
router.get('/reports/revenue.csv', wrap(async (req, res) => {
  const { from, to } = req.query
  if ((from && !isDate(from)) || (to && !isDate(to))) throw new HttpError(400, 'Invalid date range.')
  const r = await stats.reports({ from, to })
  res.type('text/csv').attachment('maison-blush-revenue.csv')
  res.send(toCSV(['Type', 'Code', 'Customer', 'Amount', 'Payment method', 'Paid on'], r.transactions.map((t) => [t.type, t.code, t.customer, t.amount, t.method, t.paidAt])))
}))

// ---------- bookings ----------
router.get('/bookings', wrap(async (req, res) => {
  const { q, status, date } = req.query
  const filter = combine(
    search(q, ['code', 'name', 'phone']),
    status ? { status: oneOf(String(status), ENUMS.bookingStatus, 'status') } : null,
    date ? { date: isDate(String(date)) ? String(date) : (() => { throw new HttpError(400, 'Invalid date.') })() } : null,
  )
  res.json(await list(repos.bookings, filter, req.query))
}))
router.patch('/bookings/:id', wrap(async (req, res) => {
  res.json({ item: await setBookingStatus(req.params.id, oneOf(String(req.body?.status), ENUMS.bookingStatus, 'status')) })
}))
router.patch('/bookings/:id/payment', wrap(async (req, res) => {
  const doc = await repos.bookings.get(req.params.id)
  if (!doc) throw new HttpError(404, 'Booking not found.')
  res.json({ item: await recordPayment(repos.bookings, doc, req.admin, req.body || {}, { isOrder: false }) })
}))

// ---------- orders ----------
router.get('/orders', wrap(async (req, res) => {
  const { q, status } = req.query
  res.json(await list(repos.orders, combine(search(q, ['code', 'customer.name', 'customer.phone']), status ? { status: oneOf(String(status), ENUMS.orderStatus, 'status') } : null), req.query))
}))
router.patch('/orders/:id', wrap(async (req, res) => {
  res.json({ item: await setOrderStatus(req.params.id, oneOf(String(req.body?.status), ENUMS.orderStatus, 'status')) })
}))
router.patch('/orders/:id/payment', wrap(async (req, res) => {
  const doc = await repos.orders.get(req.params.id)
  if (!doc) throw new HttpError(404, 'Order not found.')
  res.json({ item: await recordPayment(repos.orders, doc, req.admin, req.body || {}, { isOrder: true }) })
}))

// ---------- customers (bookings + orders se) ----------
router.get('/customers', wrap(async (req, res) => res.json({ items: await stats.customers(String(req.query.q || '')) })))

// ---------- messages ----------
router.get('/messages', wrap(async (req, res) => {
  const { q, status } = req.query
  res.json(await list(repos.messages, combine(search(q, ['name', 'phone', 'email', 'message']), status ? { status: oneOf(String(status), ENUMS.messageStatus, 'status') } : null), req.query))
}))
router.patch('/messages/:id', wrap(async (req, res) => {
  const item = await repos.messages.update(req.params.id, { status: oneOf(String(req.body?.status), ENUMS.messageStatus, 'status') })
  if (!item) throw new HttpError(404, 'Message not found.')
  res.json({ item })
}))
router.delete('/messages/:id', wrap(async (req, res) => {
  if (!(await repos.messages.remove(req.params.id))) throw new HttpError(404, 'Message not found.')
  res.json({ ok: true })
}))

// ---------- newsletter ----------
router.get('/subscribers/export.csv', wrap(async (_req, res) => {
  const rows = await repos.subscribers.find({}, { sort: { createdAt: -1 } })
  res.type('text/csv').attachment('maison-blush-subscribers.csv')
  res.send(toCSV(['Email', 'Subscribed on'], rows.map((r) => [r.email, r.createdAt])))
}))
router.get('/subscribers', wrap(async (req, res) => res.json(await list(repos.subscribers, combine(search(req.query.q, ['email'])), req.query))))
router.delete('/subscribers/:id', wrap(async (req, res) => {
  if (!(await repos.subscribers.remove(req.params.id))) throw new HttpError(404, 'Subscriber not found.')
  res.json({ ok: true })
}))

// ---------- services & products ----------
router.use('/services', catalogRouter('services'))
router.use('/products', catalogRouter('products'))

export default router
