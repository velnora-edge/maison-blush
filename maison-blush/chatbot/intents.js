import { salon, formatMoney } from '../shared/salon.js'
import { addressText, serviceLine, findService } from './knowledge.js'

/**
 * Har intent: keywords (English + Roman Urdu), jawab (en / ur), suggestions aur optional action (page par scroll).
 * Naya sawal sikhana ho to bas yahan ek object add karein.
 */
const list = (arr) => arr.join('\n• ')

export const intents = [
  {
    name: 'greeting',
    keywords: ['hello', 'hi', 'hey', 'salam', 'assalam', 'aoa', 'good morning', 'good evening'],
    en: (_m, { services, products }) => `Hello! 👋 Welcome to ${salon.name}. I can help with services, prices, booking, timings and payments. What would you like to know?`,
    ur: (_m, { services, products }) => `Assalam o Alaikum! 👋 ${salon.name} mein khush aamdeed. Main services, prices, booking, timing aur payment ke bare mein madad kar sakti hoon. Aap kya jan'na chahte hain?`,
    suggestions: ['Services & prices', 'Book appointment', 'Opening hours'],
  },
  {
    name: 'services',
    keywords: ['service', 'services', 'offer', 'menu', 'treatment', 'treatments', 'kya kya', 'kaun si services', 'list'],
    en: (_m, { services, products }) => `Here is what we offer:\n• ${list(services.map(serviceLine))}\n\nTell me which one you like and I will help you book it.`,
    ur: (_m, { services, products }) => `Hamari services:\n• ${list(services.map(serviceLine))}\n\nJo pasand ho bataein, main booking mein madad karungi.`,
    suggestions: ['Book appointment', 'Hair fall treatment', 'Bridal package'],
    action: { label: 'View services', target: '#services' },
  },
  {
    name: 'price',
    keywords: ['price', 'prices', 'cost', 'rate', 'rates', 'charges', 'fee', 'how much', 'kitna', 'kitne', 'qeemat', 'kimat', 'paisay', 'paise'],
    en: (_m, { services, products }) => `Our starting prices:\n• ${list(services.map(serviceLine))}\n\nFinal price depends on hair length and condition.`,
    ur: (_m, { services, products }) => `Hamare starting rates:\n• ${list(services.map(serviceLine))}\n\nFinal rate hair ki length aur condition par depend karta hai.`,
    suggestions: ['Book appointment', 'Payment options'],
    action: { label: 'Book now', target: '#booking' },
  },
  {
    name: 'booking',
    keywords: ['book', 'booking', 'appointment', 'reserve', 'slot', 'available', 'schedule', 'time lena', 'appointment lena', 'karwana', 'karna hai'],
    en: (_m, { services, products }) => `Booking takes under a minute:\n1. Choose your service(s)\n2. Pick a date and an available time slot\n3. Enter your name and phone\n${salon.booking.advance ? `You can pay a ${formatMoney(salon.booking.advance)} advance online, or simply pay at the salon.` : 'You pay at the salon.'}`,
    ur: (_m, { services, products }) => `Booking bohat asaan hai:\n1. Service select karein\n2. Date aur khali time slot chunen\n3. Naam aur phone likhein\n${salon.booking.advance ? `Chahein to ${formatMoney(salon.booking.advance)} advance online de saktay hain, ya salon par payment karein.` : 'Payment salon par hogi.'}`,
    suggestions: ['Opening hours', 'Payment options'],
    action: { label: 'Open booking form', target: '#booking' },
  },
  {
    name: 'hours',
    keywords: ['hours', 'timing', 'timings', 'open', 'opening', 'close', 'closing', 'time', 'kab', 'khulta', 'khulte', 'band', 'waqt', 'sunday', 'sunday open'],
    en: (_m, { services, products }) => `We are open:\n• ${list(salon.hours.map((h) => `${h.days}: ${h.time}`))}`,
    ur: (_m, { services, products }) => `Hamari timing:\n• ${list(salon.hours.map((h) => `${h.days}: ${h.time}`))}`,
    suggestions: ['Book appointment', 'Where are you located?'],
  },
  {
    name: 'location',
    keywords: ['where', 'location', 'address', 'located', 'map', 'directions', 'kahan', 'kidhar', 'pata', 'address kya'],
    en: (_m, { services, products }) => `You can find us at ${addressText()}, ${salon.country}. Call us on ${salon.phone} for directions.`,
    ur: (_m, { services, products }) => `Hum ${addressText()}, ${salon.country} par hain. Rasta poochne ke liye ${salon.phone} par call karein.`,
    suggestions: ['Opening hours', 'Contact number'],
    action: { label: 'See map', target: '#contact' },
  },
  {
    name: 'contact',
    keywords: ['contact', 'phone', 'number', 'call', 'whatsapp', 'email', 'raabta', 'rabta', 'nambar', 'number kya'],
    en: (_m, { services, products }) => `You can reach us on ${salon.phone} (call or WhatsApp) or email ${salon.email}.`,
    ur: (_m, { services, products }) => `Aap hum se ${salon.phone} par call ya WhatsApp kar saktay hain, ya ${salon.email} par email karein.`,
    suggestions: ['Book appointment', 'Opening hours'],
    action: { label: 'Contact us', target: '#contact' },
  },
  {
    name: 'payment',
    keywords: ['pay', 'payment', 'payments', 'card', 'qr', 'jazzcash', 'easypaisa', 'raast', 'bank', 'cash', 'online payment', 'advance', 'adaigi', 'paisay kaise'],
    en: (_m, { services, products }) => `We accept:\n• Debit/Credit card online\n• QR scan (${salon.payments.qr.apps.join(', ')})\n• Cash at the salon / cash on delivery for products`,
    ur: (_m, { services, products }) => `Hum ye payment methods accept karte hain:\n• Debit/Credit card (online)\n• QR scan (${salon.payments.qr.apps.join(', ')})\n• Salon par cash / products ke liye cash on delivery`,
    suggestions: ['Book appointment', 'Shop products'],
  },
  {
    name: 'products',
    keywords: ['product', 'products', 'shop', 'buy', 'cart', 'serum', 'shampoo', 'mask', 'conditioner', 'order', 'delivery', 'deliver', 'khareedna', 'mangwana'],
    en: (_m, { services, products }) => !products.length ? `Our online shop is being updated right now. Please call or WhatsApp ${salon.phone} to order.` : `Our online shop has:\n• ${list(products.map((p) => `${p.name} – ${formatMoney(p.price)}`))}\n\nDelivery is ${formatMoney(salon.shipping.fee)}, free above ${formatMoney(salon.shipping.freeOver)}.`,
    ur: (_m, { services, products }) => !products.length ? `Hamari online shop abhi update ho rahi hai. Order ke liye ${salon.phone} par call ya WhatsApp karein.` : `Hamari online shop mein:\n• ${list(products.map((p) => `${p.name} – ${formatMoney(p.price)}`))}\n\nDelivery ${formatMoney(salon.shipping.fee)}, ${formatMoney(salon.shipping.freeOver)} se upar free.`,
    suggestions: ['Payment options', 'Book appointment'],
    action: { label: 'Go to shop', target: '#shop' },
  },
  {
    name: 'concern',
    keywords: ['hair fall', 'hairfall', 'dandruff', 'dry', 'frizz', 'frizzy', 'damaged', 'damage', 'split ends', 'thin', 'thinning', 'rough', 'bal jhar', 'bal jharna', 'khushki', 'rukhay', 'rukhe'],
    // Admin kisi service ko hata/deactivate kar sakta hai, isliye hamesha DB ki maujooda services mein se hi suggest karo
    en: (msg, { services }) => {
      const hairFall = /fall|dandruff|thin|jhar/.test(msg)
      const treatments = services.filter((s) => /treat/i.test(s.category))
      const pick = services.find((s) => s.id === (hairFall ? 'scalp-care' : 'hair-spa')) || treatments[0]
      if (!pick) return `Our stylist will check your hair first and suggest the best treatment. Please call or WhatsApp ${salon.phone} to book a consultation.`
      const alt = !hairFall && services.find((s) => s.id === 'keratin')
      return `For that, I recommend our ${serviceLine(pick)}.${alt ? ` For long-lasting smoothness you could also consider ${serviceLine(alt)}.` : ''} Our stylist will check your hair first and suggest the best plan.`
    },
    ur: (msg, { services }) => {
      const hairFall = /fall|dandruff|thin|jhar/.test(msg)
      const treatments = services.filter((s) => /treat/i.test(s.category))
      const pick = services.find((s) => s.id === (hairFall ? 'scalp-care' : 'hair-spa')) || treatments[0]
      if (!pick) return `Hamari stylist pehle aapke hair check karke behtareen treatment batayengi. Consultation ke liye ${salon.phone} par call ya WhatsApp karein.`
      return `Is ke liye hum ${serviceLine(pick)} suggest karte hain. Hamari stylist pehle aapke hair check karke behtareen plan batayengi.`
    },
    suggestions: ['Book appointment', 'Services & prices'],
    action: { label: 'Book treatment', target: '#booking' },
  },
  {
    name: 'bridal',
    keywords: ['bridal', 'bride', 'wedding', 'dulhan', 'shadi', 'walima', 'mehndi'],
    en: (_m, { services }) => {
      const b = services.find((s) => s.id === 'bridal' || /bridal/i.test(s.category))
      return b
        ? `Our bridal package (${b.name}) is ${formatMoney(b.price)}. ${b.desc} We recommend booking at least 2–3 weeks ahead. Call ${salon.phone} for dates.`
        : `For bridal styling please call or WhatsApp ${salon.phone} — we will plan your look and share the package details.`
    },
    ur: (_m, { services }) => {
      const b = services.find((s) => s.id === 'bridal' || /bridal/i.test(s.category))
      return b
        ? `Bridal package (${b.name}) ${formatMoney(b.price)} hai. 2–3 hafte pehle booking behtar hai. Dates ke liye ${salon.phone} par call karein.`
        : `Bridal styling ke liye ${salon.phone} par call ya WhatsApp karein, hum package ki tafseel batayenge.`
    },
    suggestions: ['Book appointment', 'Contact number'],
    action: { label: 'Book bridal', target: '#booking' },
  },
  {
    name: 'thanks',
    keywords: ['thanks', 'thank you', 'thx', 'shukriya', 'shukria', 'jazakallah', 'ok thanks'],
    en: (_m, { services, products }) => `You are most welcome! 💛 Anything else I can help with?`,
    ur: (_m, { services, products }) => `Khushi hui madad kar ke! 💛 Kuch aur poochna ho to bataein.`,
    suggestions: ['Book appointment', 'Services & prices'],
  },
  {
    name: 'bye',
    keywords: ['bye', 'goodbye', 'allah hafiz', 'khuda hafiz', 'see you'],
    en: (_m, { services, products }) => `Goodbye! We look forward to seeing you at ${salon.name}. ✨`,
    ur: (_m, { services, products }) => `Allah Hafiz! Hum ${salon.name} mein aapke muntazir hain. ✨`,
    suggestions: [],
  },
]

export const fallback = {
  en: (_m, { services, products }) => `I am not fully sure about that, but our team can help — call or WhatsApp ${salon.phone}. I can also tell you about services, prices, booking, timings or payments.`,
  ur: (_m, { services, products }) => `Is bare mein mujhe pura yaqeen nahi, hamari team madad karegi — ${salon.phone} par call ya WhatsApp karein. Main services, prices, booking, timing ya payment bata sakti hoon.`,
  suggestions: ['Services & prices', 'Book appointment', 'Contact number'],
}

/** Agar user kisi specific service ka naam + price poochay */
export function servicePriceReply(text, ctx) {
  const s = findService(text, ctx.services)
  if (!s) return null
  return {
    en: `${s.name}: ${formatMoney(s.price)} (${s.duration}). ${s.desc}`,
    ur: `${s.name}: ${formatMoney(s.price)} (${s.duration}). ${s.desc}`,
    suggestions: ['Book appointment', 'Services & prices'],
    action: { label: 'Book this service', target: '#booking' },
  }
}
