import { Router } from 'express'
import { reply } from '../../../chatbot/index.js'
import { listActiveServices, listActiveProducts } from '../services/catalog.js'
import { clean, assertValid } from '../services/validate.js'
import { wrap } from '../utils/sanitize.js'

const router = Router()

router.post('/chat', wrap(async (req, res) => {
  const message = clean(req.body?.message, 500)
  assertValid(message ? {} : { message: 'Please type a message.' })
  const history = Array.isArray(req.body?.history) ? req.body.history.slice(-8) : []
  // Chatbot hamesha DB ke asli (active) services/products se jawab deta hai
  const ctx = { services: await listActiveServices(), products: await listActiveProducts() }
  const { reply: text, suggestions, action, source } = await reply(message, history, ctx)
  res.json({ reply: text, suggestions, action, source })
}))

export default router
