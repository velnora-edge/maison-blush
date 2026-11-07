import { Router } from 'express'
import { repos } from '../db/index.js'
import { clean, isEmail, isPhone, assertValid } from '../services/validate.js'
import { isDup } from '../utils/ids.js'
import { wrap } from '../utils/sanitize.js'

const router = Router()

router.post('/contact', wrap(async (req, res) => {
  const b = req.body || {}
  const msg = { name: clean(b.name, 80), phone: clean(b.phone, 20), email: clean(b.email, 120).toLowerCase(), message: clean(b.message, 1500) }
  const errors = {}
  if (msg.name.length < 2) errors.name = 'Please enter your name.'
  if (!msg.phone && !msg.email) errors.phone = 'Please enter a phone number or an email so we can reply.'
  if (msg.phone && !isPhone(msg.phone)) errors.phone = 'Please enter a valid phone number.'
  if (msg.email && !isEmail(msg.email)) errors.email = 'Please enter a valid email address.'
  if (msg.message.length < 5) errors.message = 'Please write a short message.'
  assertValid(errors)
  await repos.messages.create({ name: msg.name, phone: msg.phone || undefined, email: msg.email || undefined, message: msg.message, status: 'new' })
  res.status(201).json({ ok: true })
}))

router.post('/newsletter', wrap(async (req, res) => {
  const email = clean(req.body?.email, 120).toLowerCase()
  assertValid(isEmail(email) ? {} : { email: 'Please enter a valid email address.' })
  try { await repos.subscribers.create({ email }) } catch (e) { if (!isDup(e, 'email')) throw e } // dobara subscribe: chup-chap theek (duplicate nahi banta)
  res.status(201).json({ ok: true })
}))

export default router
