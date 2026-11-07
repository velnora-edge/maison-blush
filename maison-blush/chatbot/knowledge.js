// Chatbot ka saara "dimaag" shared/ folder ki info se banta hai — salon data badlen, chatbot khud update.
import { salon, formatMoney } from '../shared/salon.js'
import { services as staticServices, products as staticProducts } from '../shared/catalog.js'

/** DB se aaye hue services/products ya (na hon to) shared/catalog.js wale */
export const defaultContext = () => ({ services: staticServices, products: staticProducts })

export const hoursText = () => salon.hours.map((h) => `${h.days}: ${h.time}`).join(' | ')
export const addressText = () => `${salon.address}, ${salon.city}`

export const serviceLine = (s) => `${s.name} – ${formatMoney(s.price)} (${s.duration})`

export function knowledgeText({ services, products } = defaultContext()) {
  return [
    `Salon: ${salon.name} (${salon.tagline}), ${addressText()}, ${salon.country}.`,
    `Phone/WhatsApp: ${salon.phone}. Email: ${salon.email}.`,
    `Hours: ${hoursText()}.`,
    `Services (starting prices): ${services.map(serviceLine).join('; ')}.`,
    `Products sold online: ${products.map((p) => `${p.name} ${formatMoney(p.price)}`).join('; ')}.`,
    `Booking: online form on the website, free slots shown live. Optional advance ${formatMoney(salon.booking.advance)}.`,
    `Payments: Card (online), QR scan (${salon.payments.qr.apps.join(', ')}), cash at salon / cash on delivery.`,
    `Delivery for products: ${formatMoney(salon.shipping.fee)}, free above ${formatMoney(salon.shipping.freeOver)}.`,
  ].join('\n')
}

export function findService(text, services = staticServices) {
  const t = text.toLowerCase()
  let best = null
  let bestLen = 0
  for (const s of services) {
    for (const k of [s.name.toLowerCase(), ...s.keywords]) {
      if (t.includes(k) && k.length > bestLen) { best = s; bestLen = k.length }
    }
  }
  return best
}
