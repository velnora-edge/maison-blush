/**
 * ============================================================
 *  SALON SETTINGS  —  client ki saari info sirf YAHAN badlein
 *  (name, phone, address, hours, payment details, booking rules)
 *  Frontend, backend aur chatbot teeno isi file se parhte hain.
 * ============================================================
 */
export const salon = {
  name: 'Maison Blush',
  tagline: 'Hair Studio & Spa',
  description:
    'Premium hair cutting, colour and treatments by certified stylists. Relax, refresh and walk out feeling beautiful.',
  phone: '+92 300 1234567',
  whatsapp: '923001234567', // country code ke saath, bina + ke
  email: 'hello@maisonblush.com',
  address: 'Shop 12, Main Boulevard',
  city: 'Faisalabad',
  country: 'Pakistan',
  mapQuery: 'Main Boulevard, Faisalabad, Pakistan', // Google Map isi se dikhega
  hours: [
    { days: 'Monday – Saturday', time: '10:00 AM – 9:00 PM' },
    { days: 'Sunday', time: '12:00 PM – 8:00 PM' },
  ],
  social: {
    instagram: 'https://instagram.com/',
    facebook: 'https://facebook.com/',
    youtube: 'https://youtube.com/',
  },
  stats: { rating: 4.9, clients: 5000, years: 12 },

  currency: { code: 'PKR', symbol: 'Rs.' },

  booking: {
    openHour: 10, // pehla slot 10:00
    lastSlotHour: 20, // aakhri slot 20:00
    slotMinutes: 60,
    chairs: 3, // ek waqt mein kitni bookings ho sakti hain
    advance: 500, // online advance (0 kar den to option hat jayega)
    maxDaysAhead: 60,
  },

  shipping: { fee: 250, freeOver: 5000 },

  payments: {
    // true = card payment sirf demo hai (asli paisa nahi katta).
    // Asli gateway (Stripe / PayFast / Safepay) jorne ke baad false karein. README dekhein.
    demoMode: true,
    qr: {
      // Client ka asli QR image yahan rakhein: frontend/public/images/payment-qr.png
      image: '/images/payment-qr.png',
      accountTitle: 'Maison Blush',
      accountNumber: 'PK00 XXXX 0000 0000 0000 00',
      apps: ['JazzCash', 'Easypaisa', 'Raast', 'SadaPay', 'NayaPay', 'Any bank app'],
    },
  },
}

export const formatMoney = (n) => `${salon.currency.symbol} ${Number(n).toLocaleString('en-US')}`

const pad = (n) => String(n).padStart(2, '0')
export function formatTime(hhmm) {
  const [h, m] = hhmm.split(':').map(Number)
  const suffix = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${pad(m)} ${suffix}`
}

/** ["10:00","11:00",...] — frontend aur backend dono isi se slots banate hain */
export function buildSlots() {
  const { openHour, lastSlotHour, slotMinutes } = salon.booking
  const out = []
  for (let t = openHour * 60; t <= lastSlotHour * 60; t += slotMinutes) {
    out.push(`${pad(Math.floor(t / 60))}:${pad(t % 60)}`)
  }
  return out
}
