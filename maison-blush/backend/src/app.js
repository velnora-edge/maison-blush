import express from 'express'
import path from 'node:path'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { cors, rateLimit } from './middleware/security.js'
import { csrfGuard, requireAdmin } from './middleware/adminAuth.js'
import { sanitizeInput } from './utils/sanitize.js'
import { dbMode, dbHealthy } from './db/index.js'
import { HttpError } from './services/validate.js'
import bookings from './routes/bookings.js'
import orders from './routes/orders.js'
import contact from './routes/contact.js'
import chat from './routes/chat.js'
import payments from './routes/payments.js'
import admin from './routes/admin/index.js'
import uploads, { UPLOAD_DIR } from './routes/admin/uploads.js'

const CSP = [
  "default-src 'self'", "script-src 'self'", "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:", "img-src 'self' data: blob: https:", "media-src 'self' https:",
  'frame-src https://www.google.com', "connect-src 'self'", "object-src 'none'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'none'",
].join('; ')

function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  if (req.secure) res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains')
  if (!req.path.startsWith('/api')) res.setHeader('Content-Security-Policy', CSP)
  next()
}

export function createApp() {
  const app = express()
  app.disable('x-powered-by')
  app.set('trust proxy', 1)
  app.use(securityHeaders)
  app.use(cors(process.env.CORS_ORIGIN))

  // Image upload: bara JSON body (4 MB) sirf isi route par, aur sirf logged-in admin ke liye
  app.use('/api/admin/uploads', rateLimit({ max: 40 }), express.json({ limit: '4mb' }), sanitizeInput, csrfGuard, requireAdmin, uploads)

  app.use(express.json({ limit: '50kb' }))
  app.use(sanitizeInput)

  app.get('/api/health', async (_req, res) => res.json({ ok: true, service: 'maison-blush-api', database: dbMode(), connected: await dbHealthy() }))
  app.use('/api/admin', rateLimit({ max: 300 }), admin)
  app.use('/api', rateLimit({ max: 60 }), bookings, orders, contact, chat, payments)
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }))

  app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d', index: false, dotfiles: 'deny', setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff') }))

  // Production: build ki hui frontend bhi isi server se chalti hai (frontend/dist)
  const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'frontend', 'dist')
  if (existsSync(dist)) {
    app.use(express.static(dist, { maxAge: '1d', index: false }))
    const indexHtml = readFileSync(path.join(dist, 'index.html'), 'utf8')
    app.get('*', (req, res) => {
      // Link-preview ke liye image/URL absolute chahiye: server apna domain khud pehchan kar bhar deta hai (SITE_URL se override ho sakta hai)
      const host = req.get('host') || ''
      const origin = process.env.SITE_URL || (/^[a-z0-9.-]+(:\d+)?$/i.test(host) ? `${req.protocol}://${host}` : '')
      let html = indexHtml.replaceAll('__SITE_URL__', origin.replace(/\/$/, ''))
      // Admin pages Google/preview mein nahi aane chahiye
      if (req.path.startsWith('/admin')) html = html.replace('<head>', '<head>\n    <meta name="robots" content="noindex, nofollow" />')
      res.type('html').send(html)
    })
  }

  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    let status = err.status || 500
    let message = err.message
    if (err.type === 'entity.parse.failed') { status = 400; message = 'Invalid request.' }
    else if (err.type === 'entity.too.large') { status = 413; message = 'The request is too large.' }
    else if (err.name === 'ValidationError') { status = 400; message = Object.values(err.errors || {})[0]?.message || 'Invalid data.' }
    else if (err.name === 'CastError') { status = 400; message = 'Invalid request.' }
    else if (err.code === 11000) { status = 409; message = 'This record already exists.' }
    if (!(err instanceof HttpError) && status >= 500) console.error(err) // HttpError (jaise 503/501) apna hi jawab hai, log nahi karna
    res.status(status).json({ error: status >= 500 && status !== 501 ? 'Something went wrong on our side. Please try again.' : message, fields: err.fields })
  })
  return app
}
