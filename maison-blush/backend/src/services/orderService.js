import { salon } from '../../../shared/salon.js'
import { shippingFor } from '../../../shared/catalog.js'
import { repos } from '../db/index.js'
import { makeCode, isDup } from '../utils/ids.js'
import { clean, isEmail, isPhone, assertValid, HttpError } from './validate.js'
import { processPayment } from './payments.js'

const restoreStock = (items) => Promise.all(items.map((i) => repos.products.atomicUpdate({ slug: i.slug }, { $inc: { stock: i.qty } })))

export async function createOrder(b = {}) {
  const c = b.customer || {}
  const customer = { name: clean(c.name, 80), phone: clean(c.phone, 20), email: clean(c.email, 120).toLowerCase(), address: clean(c.address, 250), city: clean(c.city, 60), notes: clean(c.notes, 400) }

  const errors = {}
  if (customer.name.length < 2) errors.name = 'Please enter your name.'
  if (!isPhone(customer.phone)) errors.phone = 'Please enter a valid phone number.'
  if (customer.email && !isEmail(customer.email)) errors.email = 'Please enter a valid email address.'
  if (customer.address.length < 8) errors.address = 'Please enter your full delivery address.'
  if (customer.city.length < 2) errors.city = 'Please enter your city.'

  // Sirf id aur qty browser se; naam/price/stock DB se
  const wanted = new Map()
  for (const i of (Array.isArray(b.items) ? b.items : []).slice(0, 30)) {
    const qty = Math.floor(Number(i?.qty))
    const slug = clean(i?.id, 60)
    if (slug && qty >= 1 && qty <= 10) wanted.set(slug, Math.min(10, (wanted.get(slug) || 0) + qty))
  }
  if (!wanted.size) errors.items = 'Your cart is empty.'
  assertValid(errors)

  // Payment ki validation (stock se pehle, taake galat payment par stock na ghate)
  // total abhi nahi pata, isliye pehle method check; amount neeche set hota hai
  const method = clean(b.payment?.method, 10)
  await processPayment({ method, kind: 'order', amount: 0, payment: b.payment })

  // Stock atomically ghatao (ek hi waqt mein do orders aakhri item na le saken)
  const taken = []
  const items = []
  try {
    for (const [slug, qty] of wanted) {
      const p = await repos.products.atomicUpdate({ slug, active: true, stock: { $gte: qty } }, { $inc: { stock: -qty } })
      if (!p) {
        const exists = await repos.products.findOne({ slug, active: true })
        throw new HttpError(409, exists ? `Sorry, only ${exists.stock} of "${exists.name}" left in stock.` : 'One of the products in your cart is no longer available.')
      }
      taken.push({ slug, qty })
      items.push({ slug, name: p.name, price: p.price, qty })
    }

    const subtotal = items.reduce((t, i) => t + i.price * i.qty, 0)
    const shipping = shippingFor(subtotal, salon.shipping)
    const total = subtotal + shipping
    const payment = await processPayment({ method, kind: 'order', amount: total, payment: b.payment })

    for (let attempt = 0; attempt < 3; attempt++) {
      try { return await repos.orders.create({ code: makeCode('MB'), customer, items, subtotal, shipping, total, status: 'pending', payment }) }
      catch (e) { if (!isDup(e, 'code')) throw e }
    }
    throw new Error('Could not generate a unique order code')
  } catch (e) {
    await restoreStock(taken) // kuch bhi fail ho to stock wapas
    throw e
  }
}

export async function setOrderStatus(id, status) {
  const o = await repos.orders.get(id)
  if (!o) throw new HttpError(404, 'Order not found.')
  if (status === o.status) return o
  if (o.status === 'cancelled') throw new HttpError(400, 'A cancelled order cannot be reopened. Please ask the customer to place a new order.')
  if (status === 'cancelled') await restoreStock(o.items)
  return repos.orders.update(id, { status })
}

export const publicOrder = (o) => ({
  id: o.code, customer: { name: o.customer.name }, items: o.items, subtotal: o.subtotal, shipping: o.shipping, total: o.total,
  status: o.status, payment: { method: o.payment.method, status: o.payment.status }, createdAt: o.createdAt,
})
