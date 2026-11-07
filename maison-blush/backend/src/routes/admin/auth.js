import { Router } from 'express'
import { rateLimit } from '../../middleware/security.js'
import { requireAdmin, cookieOptions, parseCookies } from '../../middleware/adminAuth.js'
import * as auth from '../../services/auth.js'
import { wrap } from '../../utils/sanitize.js'
import { dbMode, dbHealthy } from '../../db/index.js'
import { demoMode } from '../../services/payments.js'
import { listProviders } from '../../services/providers/index.js'
import { llmEnabled } from '../../../../chatbot/llm.js'

const router = Router()
const loginLimiter = rateLimit({ windowMs: 15 * 60_000, max: 10, message: 'Too many login attempts. Please wait 15 minutes.' })

router.post('/login', loginLimiter, wrap(async (req, res) => {
  const { token, expiresAt, admin } = await auth.login({ email: req.body?.email, password: req.body?.password, ip: req.ip, userAgent: req.get('user-agent') })
  res.setHeader('Set-Cookie', `${auth.COOKIE}=${encodeURIComponent(token)}; ${cookieOptions(req, expiresAt - Date.now())}`)
  res.json({ admin })
}))

router.post('/logout', wrap(async (req, res) => {
  await auth.logout(parseCookies(req.headers.cookie)[auth.COOKIE])
  res.setHeader('Set-Cookie', `${auth.COOKIE}=; ${cookieOptions(req, 0)}`)
  res.json({ ok: true })
}))

router.get('/me', requireAdmin, (req, res) => res.json({ admin: auth.publicAdmin(req.admin) }))

router.patch('/profile', requireAdmin, wrap(async (req, res) => res.json({ admin: await auth.updateProfile(req.admin, req.body || {}) })))

router.post('/change-password', requireAdmin, wrap(async (req, res) => {
  await auth.changePassword(req.admin, req.session, req.body || {})
  res.json({ ok: true })
}))

router.get('/system', requireAdmin, wrap(async (_req, res) => res.json({
  database: { mode: dbMode(), connected: await dbHealthy() },
  paymentMode: demoMode() ? 'demo' : 'live',
  providers: listProviders(),
  aiChatbot: llmEnabled(),
  environment: process.env.NODE_ENV || 'development',
})))

export default router
