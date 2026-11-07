import { Router } from 'express'
import { getAvailability, createBooking, publicBooking } from '../services/bookingService.js'
import { listActiveServices, listActiveProducts } from '../services/catalog.js'
import { wrap } from '../utils/sanitize.js'

const router = Router()

// Public catalog: admin ne jo badla wo yahan se customer website par aata hai
router.get('/services', wrap(async (_req, res) => res.json({ items: await listActiveServices() })))
router.get('/products', wrap(async (_req, res) => res.json({ items: await listActiveProducts() })))

router.get('/availability', wrap(async (req, res) => {
  const date = String(req.query.date || '')
  res.json({ date, slots: await getAvailability(date) })
}))

router.post('/bookings', wrap(async (req, res) => {
  const booking = await createBooking(req.body)
  res.status(201).json({ ok: true, booking: publicBooking(booking) })
}))

export default router
