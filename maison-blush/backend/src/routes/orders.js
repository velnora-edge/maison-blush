import { Router } from 'express'
import { createOrder, publicOrder } from '../services/orderService.js'
import { wrap } from '../utils/sanitize.js'

const router = Router()
router.post('/orders', wrap(async (req, res) => {
  const order = await createOrder(req.body)
  res.status(201).json({ ok: true, order: publicOrder(order) })
}))
export default router
