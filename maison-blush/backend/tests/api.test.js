// Chalane ka tareeqa:  cd backend && npm test      (in-memory database use hota hai, MongoDB ki zaroorat nahi)
process.env.NODE_ENV = 'test'
process.env.USE_MEMORY_DB = '1'
process.env.TEST_PROVIDER_SECRET = 'test-secret'

import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'

const { initDB, closeDB, repos } = await import('../src/db/index.js')
const { seedCatalogIfEmpty } = await import('../src/services/catalog.js')
const { createApp } = await import('../src/app.js')
const { createAdmin } = await import('../src/services/auth.js')
const { migrate } = await import('../src/services/migrate.js')
const { salon } = await import('../../shared/salon.js')

let server, base
const pad = (n) => String(n).padStart(2, '0')
const dayStr = (add) => { const d = new Date(); d.setDate(d.getDate() + add); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }
const DAY = dayStr(5), DAY2 = dayStr(6), DAY3 = dayStr(7)

async function call(method, path, { body, cookie, admin = false, headers = {} } = {}) {
  const h = { ...headers }
  if (body !== undefined) h['content-type'] = 'application/json'
  if (cookie) h.cookie = cookie
  if (admin) h['x-mb-admin'] = '1'
  const res = await fetch(base + path, { method, headers: h, body: body !== undefined ? JSON.stringify(body) : undefined })
  const type = res.headers.get('content-type') || ''
  const data = type.includes('json') ? await res.json() : await res.text()
  return { status: res.status, data, headers: res.headers }
}
const A = (method, path, cookie, body) => call(method, `/api/admin${path}`, { body, cookie, admin: true })
async function login(email, password) {
  const r = await call('POST', '/api/admin/auth/login', { body: { email, password }, admin: true })
  const cookie = (r.headers.get('set-cookie') || '').split(';')[0]
  return { ...r, cookie }
}

const bookingBody = (over = {}) => ({ name: 'Areeba Test', phone: '03001234567', date: DAY, time: '11:00', services: ['keratin', 'signature-cut'], payment: { method: 'cash' }, ...over })
const customer = { name: 'Sara', phone: '03111234567', address: 'House 5, Street 2, Block C', city: 'Faisalabad' }
const orderBody = (items, method = 'cash', payment = {}) => ({ customer, items, payment: { method, ...payment } })

before(async () => {
  await initDB()
  await seedCatalogIfEmpty()
  await createAdmin({ email: 'owner@maisonblush.test', password: 'Str0ngPassw0rd!', name: 'Owner' })
  await createAdmin({ email: 'locked@maisonblush.test', password: 'An0therStrongOne' })
  server = createApp().listen(0)
  base = `http://127.0.0.1:${server.address().port}`
})
after(async () => { server.close(); await closeDB() })

let admin // { cookie }

// ================= PUBLIC SITE =================
test('health + seeded catalog served from the database', async () => {
  assert.equal((await call('GET', '/api/health')).data.connected, true)
  const s = await call('GET', '/api/services'), p = await call('GET', '/api/products')
  assert.equal(s.data.items.length, 9)
  assert.equal(p.data.items.length, 6)
  assert.ok(s.data.items[0].id && s.data.items[0].desc !== undefined, 'public shape keeps id/desc used by the website')
  assert.equal(p.data.items[0].featured, true, 'featured products come first')
})

test('booking saves as pending, validates, and slots fill up', async () => {
  const r = await call('POST', '/api/bookings', { body: bookingBody() })
  assert.equal(r.status, 201)
  assert.equal(r.data.booking.status, 'pending')
  assert.equal(r.data.booking.estimatedTotal, 13500)
  assert.match(r.data.booking.id, /^BK-/)
  assert.equal(await repos.bookings.count({}), 1)

  const bad = await call('POST', '/api/bookings', { body: bookingBody({ name: '', phone: '1', services: [], time: '11:30' }) })
  assert.equal(bad.status, 400)
  assert.ok(bad.data.fields.name && bad.data.fields.phone && bad.data.fields.services && bad.data.fields.time)
  assert.equal((await call('POST', '/api/bookings', { body: bookingBody({ date: '2020-01-01' }) })).status, 400)

  const av = await call('GET', `/api/availability?date=${DAY}`)
  assert.equal(av.data.slots.find((x) => x.time === '11:00').left, salon.booking.chairs - 1)
})

test('double booking is impossible, even with simultaneous requests', async () => {
  const results = await Promise.all(Array.from({ length: 6 }, (_, i) => call('POST', '/api/bookings', { body: bookingBody({ date: DAY2, time: '14:00', name: `Racer ${i}` }) })))
  const ok = results.filter((r) => r.status === 201).length
  assert.equal(ok, salon.booking.chairs)
  assert.equal(results.filter((r) => r.status === 409).length, 6 - salon.booking.chairs)
  const seats = (await repos.bookings.find({ date: DAY2, time: '14:00' })).map((b) => b.seat).sort()
  assert.deepEqual(seats, [1, 2, 3])
})

test('booking ignores browser prices and inactive/unknown services', async () => {
  const r = await call('POST', '/api/bookings', { body: bookingBody({ date: DAY3, services: ['blow-dry', 'does-not-exist'], price: 1 }) })
  assert.equal(r.status, 201)
  assert.equal(r.data.booking.estimatedTotal, 1200)
  assert.equal(r.data.booking.services.length, 1)
})

test('orders: server prices, stock decrement, out-of-stock, rollback', async () => {
  const before = (await repos.products.findOne({ slug: 'argan-serum' })).stock
  const r = await call('POST', '/api/orders', { body: orderBody([{ id: 'argan-serum', qty: 2, price: 1 }, { id: 'scalp-tonic', qty: 1 }]) })
  assert.equal(r.status, 201)
  assert.equal(r.data.order.subtotal, 5650)
  assert.equal(r.data.order.shipping, 0)
  assert.equal(r.data.order.payment.status, 'pay_on_delivery')
  assert.equal((await repos.products.findOne({ slug: 'argan-serum' })).stock, before - 2)

  // stock se zyada: koi order nahi, aur pehle item ka stock wapas
  await repos.products.update((await repos.products.findOne({ slug: 'heat-spray' })).id, { stock: 1 })
  const tonicBefore = (await repos.products.findOne({ slug: 'scalp-tonic' })).stock
  const over = await call('POST', '/api/orders', { body: orderBody([{ id: 'scalp-tonic', qty: 1 }, { id: 'heat-spray', qty: 2 }]) })
  assert.equal(over.status, 409)
  assert.equal((await repos.products.findOne({ slug: 'scalp-tonic' })).stock, tonicBefore, 'rolled back')
  assert.equal(await repos.orders.count({}), 1)

  assert.equal((await call('POST', '/api/orders', { body: orderBody([]) })).status, 400)
  assert.equal((await call('POST', '/api/orders', { body: orderBody([{ id: 'nope', qty: 1 }]) })).status, 409)
})

test('payments are never "paid" just because the browser says so', async () => {
  const qr = await call('POST', '/api/orders', { body: orderBody([{ id: 'colour-conditioner', qty: 1 }], 'qr', { reference: 'TXN12345678' }) })
  assert.equal(qr.data.order.payment.status, 'awaiting_verification')
  assert.equal((await call('POST', '/api/orders', { body: orderBody([{ id: 'colour-conditioner', qty: 1 }], 'qr', { reference: '12' }) })).status, 400)
  const card = await call('POST', '/api/orders', { body: orderBody([{ id: 'colour-conditioner', qty: 1 }], 'card', { last4: '4242', brand: 'Visa', status: 'paid', number: '4242424242424242', cvc: '123' }) })
  assert.equal(card.data.order.payment.status, 'paid_demo')
  const saved = await repos.orders.findOne({ code: card.data.order.id })
  assert.equal(saved.payment.paidAmount, 0)
  assert.ok(!JSON.stringify(saved).includes('4242424242424242') && !JSON.stringify(saved).includes('"cvc"'), 'no card number / cvc stored')
  assert.equal((await call('POST', '/api/orders', { body: orderBody([{ id: 'colour-conditioner', qty: 1 }], 'jazzcash') })).status, 400, 'wallet methods only via verified webhook')
})

test('contact messages and newsletter are saved (duplicates prevented)', async () => {
  assert.equal((await call('POST', '/api/contact', { body: { name: 'Ali', phone: '03001234567', message: 'Do you do bridal trials?' } })).status, 201)
  assert.equal((await call('POST', '/api/contact', { body: { name: 'Ali', message: 'hi' } })).status, 400)
  for (const email of ['Fan@Example.com', 'fan@example.com']) assert.equal((await call('POST', '/api/newsletter', { body: { email } })).status, 201)
  assert.equal((await call('POST', '/api/newsletter', { body: { email: 'bad' } })).status, 400)
  assert.equal(await repos.subscribers.count({}), 1)
  assert.equal(await repos.messages.count({}), 1)
})

test('NoSQL operator injection is neutralised', async () => {
  const r = await call('POST', '/api/admin/auth/login', { body: { email: { $ne: null }, password: { $ne: null } }, admin: true })
  assert.equal(r.status, 401)
  const b = await call('POST', '/api/bookings', { body: bookingBody({ date: dayStr(9), name: { $gt: '' } }) })
  assert.equal(b.status, 400)
})

// ================= ADMIN SECURITY =================
test('admin APIs reject visitors, fake cookies and missing CSRF header', async () => {
  for (const p of ['/stats', '/bookings', '/orders', '/customers', '/messages', '/services', '/products', '/subscribers', '/reports/revenue', '/auth/me']) {
    assert.equal((await A('GET', p)).status, 401, p)
  }
  assert.equal((await A('GET', '/stats', 'mb_admin=forged-token-value')).status, 401)
  assert.equal((await A('DELETE', '/messages/abc')).status, 401)
  assert.equal((await call('POST', '/api/admin/auth/login', { body: { email: 'owner@maisonblush.test', password: 'Str0ngPassw0rd!' } })).status, 403, 'login needs CSRF header')
  assert.equal((await call('POST', '/api/admin/uploads', { body: { dataUrl: 'x' } })).status, 403)
})

test('login: wrong password rejected with a generic message, correct one sets an HttpOnly session cookie', async () => {
  const bad = await login('owner@maisonblush.test', 'wrong-password-1')
  assert.equal(bad.status, 401)
  const unknown = await login('nobody@maisonblush.test', 'wrong-password-1')
  assert.equal(unknown.data.error, bad.data.error, 'same message: no account enumeration')

  const ok = await login('OWNER@maisonblush.test', 'Str0ngPassw0rd!')
  assert.equal(ok.status, 200)
  assert.ok(!('passwordHash' in ok.data.admin))
  const setCookie = ok.headers.get('set-cookie')
  assert.match(setCookie, /HttpOnly/); assert.match(setCookie, /SameSite=Strict/)
  admin = { cookie: ok.cookie }
  assert.equal((await A('GET', '/auth/me', admin.cookie)).data.admin.email, 'owner@maisonblush.test')
  const stored = await repos.admins.findOne({ email: 'owner@maisonblush.test' })
  assert.match(stored.passwordHash, /^\$2[aby]\$|^\$shim/, 'password stored hashed')
  const session = await repos.sessions.find({})
  assert.ok(session.every((s) => !ok.cookie.includes(s.tokenHash)), 'only a hash of the token is stored')
})

test('CSRF: state-changing admin calls need the custom header and same origin', async () => {
  const noHeader = await call('PATCH', '/api/admin/messages/x', { body: { status: 'read' }, cookie: admin.cookie })
  assert.equal(noHeader.status, 403)
  const evil = await call('PATCH', '/api/admin/messages/x', { body: { status: 'read' }, cookie: admin.cookie, admin: true, headers: { origin: 'https://evil.example' } })
  assert.equal(evil.status, 403)
})

// ================= ADMIN: BOOKINGS =================
test('admin bookings: list, search, filter, confirm, cancel frees the seat, reopen respects capacity', async () => {
  const all = await A('GET', '/bookings', admin.cookie)
  assert.equal(all.data.total, 1 + salon.booking.chairs + 1)
  assert.equal((await A('GET', '/bookings?q=racer', admin.cookie)).data.total, salon.booking.chairs)
  assert.equal((await A('GET', `/bookings?date=${DAY2}`, admin.cookie)).data.total, salon.booking.chairs)
  assert.equal((await A('GET', '/bookings?status=pending', admin.cookie)).data.total, all.data.total)
  assert.equal((await A('GET', '/bookings?status=bogus', admin.cookie)).status, 400)
  assert.equal((await A('GET', '/bookings?status[$ne]=x', admin.cookie)).status, 200, 'operator in query is ignored')

  const racers = (await A('GET', `/bookings?date=${DAY2}`, admin.cookie)).data.items
  const first = racers[0]
  assert.equal((await A('PATCH', `/bookings/${first.id}`, admin.cookie, { status: 'confirmed' })).data.item.status, 'confirmed')
  assert.equal((await A('PATCH', `/bookings/${first.id}`, admin.cookie, { status: 'cancelled' })).data.item.status, 'cancelled')
  // seat free -> new customer can book it; reopening the cancelled one now fails
  assert.equal((await call('POST', '/api/bookings', { body: bookingBody({ date: DAY2, time: '14:00', name: 'Taker' }) })).status, 201)
  assert.equal((await A('PATCH', `/bookings/${first.id}`, admin.cookie, { status: 'confirmed' })).status, 409)
  assert.equal((await A('PATCH', `/bookings/${first.id}`, admin.cookie, { status: 'weird' })).status, 400)
  assert.equal((await A('PATCH', '/bookings/ffffffffffffffffffffffff', admin.cookie, { status: 'confirmed' })).status, 404)

  const mine = all.data.items.find((b) => b.name === 'Areeba Test')
  assert.equal((await A('PATCH', `/bookings/${mine.id}`, admin.cookie, { status: 'completed' })).data.item.status, 'completed')
})

// ================= ADMIN: ORDERS + REVENUE =================
test('admin orders + payment verification drive revenue (only verified payments count)', async () => {
  const orders = (await A('GET', '/orders', admin.cookie)).data
  assert.equal(orders.total, 3)
  const cod = orders.items.find((o) => o.payment.status === 'pay_on_delivery')
  const qr = orders.items.find((o) => o.payment.status === 'awaiting_verification')
  const demo = orders.items.find((o) => o.payment.status === 'paid_demo')
  assert.equal((await A('GET', '/orders?q=sara', admin.cookie)).data.total, 3)

  let stats = (await A('GET', '/stats', admin.cookie)).data
  assert.equal(stats.cards.totalRevenue, 0, 'nothing verified yet -> zero revenue (demo/cash/qr-pending excluded)')

  for (const s of ['processing', 'shipped', 'delivered']) assert.equal((await A('PATCH', `/orders/${cod.id}`, admin.cookie, { status: s })).data.item.status, s)
  // admin verifies cash + QR; amount for orders always = order total (client amount ignored)
  const paidCod = await A('PATCH', `/orders/${cod.id}/payment`, admin.cookie, { status: 'paid', amount: 1 })
  assert.equal(paidCod.data.item.payment.paidAmount, cod.total)
  await A('PATCH', `/orders/${qr.id}/payment`, admin.cookie, { status: 'paid' })
  assert.equal((await A('PATCH', `/orders/${demo.id}/payment`, admin.cookie, { status: 'nonsense' })).status, 400)

  stats = (await A('GET', '/stats', admin.cookie)).data
  assert.equal(stats.cards.totalRevenue, cod.total + qr.total)
  assert.equal(stats.cards.orderRevenue, cod.total + qr.total)

  // cancelling an order returns stock and removes it from revenue; cancelled can't be reopened
  const stockBefore = (await repos.products.findOne({ slug: 'colour-conditioner' })).stock
  await A('PATCH', `/orders/${qr.id}`, admin.cookie, { status: 'cancelled' })
  assert.equal((await repos.products.findOne({ slug: 'colour-conditioner' })).stock, stockBefore + 1)
  assert.equal((await A('PATCH', `/orders/${qr.id}`, admin.cookie, { status: 'pending' })).status, 400)
  stats = (await A('GET', '/stats', admin.cookie)).data
  assert.equal(stats.cards.totalRevenue, cod.total)
})

test('booking payments verified by admin add to revenue; dashboard numbers come from real records', async () => {
  const mine = (await A('GET', '/bookings?q=Areeba', admin.cookie)).data.items[0]
  const r = await A('PATCH', `/bookings/${mine.id}/payment`, admin.cookie, { status: 'paid', amount: 13000 })
  assert.equal(r.data.item.payment.paidAmount, 13000)
  assert.equal((await A('PATCH', `/bookings/${mine.id}/payment`, admin.cookie, { status: 'paid', amount: -5 })).status, 400)

  const s = (await A('GET', '/stats', admin.cookie)).data
  const orderPaid = (await repos.orders.find({})).filter((o) => o.status !== 'cancelled' && o.payment.status === 'paid').reduce((t, o) => t + o.total, 0)
  assert.equal(s.cards.bookingRevenue, 13000)
  assert.equal(s.cards.totalRevenue, 13000 + orderPaid)
  assert.equal(s.cards.totalBookings, await repos.bookings.count({}))
  assert.equal(s.cards.pendingBookings, await repos.bookings.count({ status: 'pending' }))
  assert.equal(s.cards.confirmedBookings, await repos.bookings.count({ status: 'confirmed' }))
  assert.equal(s.cards.totalOrders, 3)
  assert.equal(s.cards.unreadMessages, 1)
  assert.equal(s.monthlyRevenue.at(-1).total, 13000 + orderPaid)
  assert.ok(s.popularServices[0].bookings >= 1 && s.bestSellers.length > 0 && s.recentActivity.length > 0 && s.recentBookings.length === 5)

  const rep = (await A('GET', '/reports/revenue', admin.cookie)).data
  assert.equal(rep.total, s.cards.totalRevenue)
  assert.equal((await A('GET', '/reports/revenue?from=2000-01-01&to=2000-01-31', admin.cookie)).data.total, 0)
  assert.equal((await A('GET', '/reports/revenue?from=nope', admin.cookie)).status, 400)
  const csv = await A('GET', '/reports/revenue.csv', admin.cookie)
  assert.match(csv.headers.get('content-type'), /text\/csv/); assert.match(csv.data, /^Type,Code,Customer,Amount/)
})

// ================= ADMIN: CATALOG =================
test('admin products CRUD is reflected on the public shop', async () => {
  const create = await A('POST', '/products', admin.cookie, { name: 'Rose Hair Oil', category: 'Treat', price: 2100, stock: 7, description: 'Light oil', featured: true })
  assert.equal(create.status, 201); assert.equal(create.data.item.slug, 'rose-hair-oil')
  const id = create.data.item.id
  assert.equal((await A('POST', '/products', admin.cookie, { name: 'Rose Hair Oil', category: 'Treat', price: 1, stock: 1 })).status, 409, 'duplicate slug')
  assert.equal((await A('POST', '/products', admin.cookie, { name: 'X', category: '', price: -5, stock: 1.5 })).status, 400)
  assert.equal((await A('POST', '/products', admin.cookie, { name: 'Bad Image', category: 'Treat', price: 5, stock: 1, image: 'javascript:alert(1)' })).status, 400)

  let pub = (await call('GET', '/api/products')).data.items
  assert.ok(pub.find((p) => p.id === 'rose-hair-oil' && p.price === 2100 && p.stock === 7))
  await A('PATCH', `/products/${id}`, admin.cookie, { price: 2500, stock: 0 })
  pub = (await call('GET', '/api/products')).data.items
  assert.equal(pub.find((p) => p.id === 'rose-hair-oil').price, 2500)
  assert.equal((await call('POST', '/api/orders', { body: orderBody([{ id: 'rose-hair-oil', qty: 1 }]) })).status, 409, 'out of stock')

  await A('PATCH', `/products/${id}`, admin.cookie, { active: false })
  assert.ok(!(await call('GET', '/api/products')).data.items.find((p) => p.id === 'rose-hair-oil'), 'deactivated -> hidden')
  assert.ok((await A('GET', '/products', admin.cookie)).data.items.find((p) => p.slug === 'rose-hair-oil'), 'still visible to admin')
  assert.equal((await A('DELETE', `/products/${id}`, admin.cookie)).status, 200)
  assert.equal((await A('DELETE', `/products/${id}`, admin.cookie)).status, 404)
})

test('admin services CRUD is reflected on the website, booking and chatbot', async () => {
  const create = await A('POST', '/services', admin.cookie, { name: 'Hair Gloss', category: 'Treatments', price: 4200, duration: '45 min', description: 'Glossy finish', keywords: 'gloss, shine' })
  assert.equal(create.status, 201)
  const id = create.data.item.id
  assert.ok((await call('GET', '/api/services')).data.items.find((s) => s.id === 'hair-gloss' && s.price === 4200))
  assert.equal((await call('POST', '/api/bookings', { body: bookingBody({ date: dayStr(10), services: ['hair-gloss'] }) })).data.booking.estimatedTotal, 4200)
  assert.match((await call('POST', '/api/chat', { body: { message: 'what are your prices' } })).data.reply, /Hair Gloss/)

  await A('PATCH', `/services/${id}`, admin.cookie, { price: 4500, name: 'Hair Gloss Deluxe' })
  assert.equal((await call('GET', '/api/services')).data.items.find((s) => s.id === 'hair-gloss').name, 'Hair Gloss Deluxe')
  await A('PATCH', `/services/${id}`, admin.cookie, { active: false })
  assert.ok(!(await call('GET', '/api/services')).data.items.find((s) => s.id === 'hair-gloss'))
  assert.equal((await call('POST', '/api/bookings', { body: bookingBody({ date: dayStr(10), services: ['hair-gloss'] }) })).status, 400, 'inactive service cannot be booked')
  assert.doesNotMatch((await call('POST', '/api/chat', { body: { message: 'what are your prices' } })).data.reply, /Hair Gloss/, 'chatbot only uses active services')
  assert.equal((await A('DELETE', `/services/${id}`, admin.cookie)).status, 200)
})

// ================= ADMIN: MESSAGES / SUBSCRIBERS / CUSTOMERS =================
test('admin messages: read, replied, delete', async () => {
  const m = (await A('GET', '/messages', admin.cookie)).data.items[0]
  assert.equal(m.status, 'new')
  assert.equal((await A('PATCH', `/messages/${m.id}`, admin.cookie, { status: 'read' })).data.item.status, 'read')
  assert.equal((await A('GET', '/messages?status=new', admin.cookie)).data.total, 0)
  assert.equal((await A('PATCH', `/messages/${m.id}`, admin.cookie, { status: 'replied' })).data.item.status, 'replied')
  assert.equal((await A('DELETE', `/messages/${m.id}`, admin.cookie)).status, 200)
  assert.equal((await A('GET', '/messages', admin.cookie)).data.total, 0)
})

test('admin subscribers list + CSV export (formula-safe)', async () => {
  await repos.subscribers.create({ email: '=cmd|calc@evil.com' }).catch(() => {})
  const list = await A('GET', '/subscribers', admin.cookie)
  assert.ok(list.data.total >= 1)
  const csv = await A('GET', '/subscribers/export.csv', admin.cookie)
  assert.match(csv.data, /fan@example\.com/)
  assert.ok(!/^=/m.test(csv.data.split('\r\n').slice(1).join('\n')), 'no line starts with =')
  const one = list.data.items[0]
  assert.equal((await A('DELETE', `/subscribers/${one.id}`, admin.cookie)).status, 200)
})

test('customers are aggregated from bookings and orders by phone', async () => {
  const c = (await A('GET', '/customers', admin.cookie)).data.items
  const areeba = c.find((x) => x.name === 'Areeba Test')
  assert.ok(areeba.bookings >= 1)
  assert.equal(areeba.totalSpent, 13000)
  const sara = c.find((x) => x.name === 'Sara')
  assert.equal(sara.orders, 3)
  assert.equal((await A('GET', '/customers?q=0311', admin.cookie)).data.items.length, 1)
})

// ================= UPLOADS =================
test('image upload: only real images, only admins', async () => {
  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(40, 1)])
  const ok = await A('POST', '/uploads', admin.cookie, { dataUrl: `data:image/png;base64,${png.toString('base64')}` })
  assert.equal(ok.status, 201); assert.match(ok.data.url, /^\/uploads\/[a-f0-9]+\.png$/)
  const served = await fetch(base + ok.data.url)
  assert.equal(served.status, 200); assert.equal(served.headers.get('x-content-type-options'), 'nosniff')
  const fake = await A('POST', '/uploads', admin.cookie, { dataUrl: `data:image/png;base64,${Buffer.from('<script>alert(1)</script> not an image at all').toString('base64')}` })
  assert.equal(fake.status, 400)
  assert.equal((await A('POST', '/uploads', admin.cookie, { dataUrl: 'data:text/html;base64,PGI+' })).status, 400)
  assert.equal((await A('POST', '/uploads', null, { dataUrl: `data:image/png;base64,${png.toString('base64')}` })).status, 401)
})

// ================= PAYMENT WEBHOOK =================
test('gateway webhook: only a verified, matching callback marks paid', async () => {
  const o = (await call('POST', '/api/orders', { body: orderBody([{ id: 'keratin-shampoo', qty: 1 }], 'qr', { reference: 'TXNWEBHOOK1' }) })).data.order
  const sign = (reference, amount, success) => crypto.createHmac('sha256', 'test-secret').update(`${reference}|${amount}|${success}`).digest('hex')
  const hook = (provider, body, sig) => call('POST', `/api/payments/webhook/${provider}`, { body, headers: sig ? { 'x-signature': sig } : {} })

  assert.equal((await hook('easypaisa', { reference: o.id })).status, 503, 'unconfigured provider')
  assert.equal((await hook('jazzcash', { reference: o.id })).status, 503)
  assert.equal((await hook('test', { reference: o.id, amount: o.total, success: true }, 'bad')).status, 400, 'bad signature')
  assert.equal((await hook('test', { reference: o.id, amount: 1, success: true }, sign(o.id, 1, true))).status, 400, 'amount mismatch')
  assert.equal((await repos.orders.findOne({ code: o.id })).payment.status, 'awaiting_verification', 'still unpaid')

  assert.equal((await hook('test', { reference: o.id, amount: o.total, success: true }, sign(o.id, o.total, true))).data.status, 'paid')
  assert.equal((await hook('test', { reference: o.id, amount: o.total, success: true }, sign(o.id, o.total, true))).status, 200, 'replay is harmless')
  const saved = await repos.orders.findOne({ code: o.id })
  assert.equal(saved.payment.status, 'paid'); assert.equal(saved.payment.paidAmount, o.total); assert.equal(saved.payment.provider, 'test')

  const o2 = (await call('POST', '/api/orders', { body: orderBody([{ id: 'keratin-shampoo', qty: 1 }], 'qr', { reference: 'TXNWEBHOOK2' }) })).data.order
  assert.equal((await hook('test', { reference: o2.id, amount: o2.total, success: false }, sign(o2.id, o2.total, false))).data.status, 'failed')
  assert.equal((await repos.orders.findOne({ code: o2.id })).payment.status, 'failed')
  assert.equal((await hook('test', { reference: 'MB-UNKNOWN', amount: 1, success: true }, sign('MB-UNKNOWN', 1, true))).status, 404)
})

// ================= SETTINGS: PASSWORD / PROFILE / LOGOUT =================
test('settings: profile, password change revokes other sessions, logout kills the session', async () => {
  const second = await login('owner@maisonblush.test', 'Str0ngPassw0rd!')
  assert.equal((await A('GET', '/auth/me', second.cookie)).status, 200)
  assert.equal((await A('PATCH', '/auth/profile', admin.cookie, { name: 'Boss Lady' })).data.admin.name, 'Boss Lady')
  assert.equal((await A('POST', '/auth/change-password', admin.cookie, { currentPassword: 'nope', newPassword: 'BrandNewPass123' })).status, 400)
  assert.equal((await A('POST', '/auth/change-password', admin.cookie, { currentPassword: 'Str0ngPassw0rd!', newPassword: 'short' })).status, 400)
  assert.equal((await A('POST', '/auth/change-password', admin.cookie, { currentPassword: 'Str0ngPassw0rd!', newPassword: 'BrandNewPass123' })).status, 200)
  assert.equal((await A('GET', '/auth/me', second.cookie)).status, 401, 'other device logged out')
  assert.equal((await A('GET', '/auth/me', admin.cookie)).status, 200, 'this device stays in')

  const sys = (await A('GET', '/auth/system', admin.cookie)).data
  assert.equal(sys.paymentMode, 'demo'); assert.equal(sys.database.connected, true)

  assert.equal((await A('POST', '/auth/logout', admin.cookie)).status, 200)
  assert.equal((await A('GET', '/auth/me', admin.cookie)).status, 401, 'session destroyed server-side')
})

test('account lockout after repeated failures, then login limiter', async () => {
  for (let i = 0; i < 5; i++) assert.equal((await login('locked@maisonblush.test', `wrong-pass-${i}`)).status, 401)
  const locked = await login('locked@maisonblush.test', 'An0therStrongOne')
  assert.equal(locked.status, 429, 'even the correct password is refused while locked')
  let limited = false
  for (let i = 0; i < 10 && !limited; i++) limited = (await login('x@y.test', 'whatever-pass-1')).status === 429
  assert.ok(limited, 'IP rate limit kicks in')
})

// ================= MIGRATION =================
test('JSON -> database migration is complete, verified and repeatable', async () => {
  const data = {
    bookings: [{ id: 'BK-OLD1', name: 'Old Cust', phone: '03001112222', date: dayStr(20), time: '10:00', services: [{ id: 'keratin', name: 'Keratin Smoothing Treatment', price: 12000 }], estimatedTotal: 12000, status: 'confirmed', payment: { method: 'cash', status: 'pay_at_salon', amount: 0 }, createdAt: '2026-10-01T10:00:00.000Z' }],
    orders: [{ id: 'MB-OLD1', customer: { name: 'Old', phone: '03001112222', address: 'Somewhere 123 Road', city: 'Lahore' }, items: [{ id: 'argan-serum', name: 'Argan Oil Hair Serum', price: 1850, qty: 1 }], subtotal: 1850, shipping: 250, total: 2100, status: 'received', payment: { method: 'qr', status: 'awaiting_verification', reference: 'TXN0000001' }, createdAt: '2026-10-02T10:00:00.000Z' }],
    messages: [{ id: 'MSG-OLD1', name: 'Old', phone: '03001112222', message: 'Old message here', createdAt: '2026-10-03T10:00:00.000Z' }],
    subscribers: [{ email: 'Old@Example.com', createdAt: '2026-10-04T10:00:00.000Z' }],
  }
  const r1 = await migrate(data)
  assert.equal(r1.verified, true)
  assert.deepEqual([r1.bookings.inserted, r1.orders.inserted, r1.messages.inserted, r1.subscribers.inserted], [1, 1, 1, 1])
  const r2 = await migrate(data)
  assert.equal(r2.verified, true); assert.equal(r2.bookings.inserted + r2.orders.inserted + r2.messages.inserted + r2.subscribers.inserted, 0)
  const ob = await repos.orders.findOne({ legacyId: 'MB-OLD1' })
  assert.equal(ob.status, 'pending'); assert.equal(ob.items[0].slug, 'argan-serum')
  assert.equal(new Date((await repos.bookings.findOne({ legacyId: 'BK-OLD1' })).createdAt).toISOString(), '2026-10-01T10:00:00.000Z', 'original dates kept')
})
