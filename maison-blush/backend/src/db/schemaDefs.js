/**
 * Indexes ki ek hi declaration — Mongoose models (models.js) aur test wali in-memory DB (memoryRepo.js) dono isi ko use karte hain.
 *  unique : [{ fields, sparse?, when? }]   when = sirf un documents par lagu jo is filter se match karein (partial index)
 *  indexes: normal (non-unique) indexes
 */
export const COLLECTIONS = {
  admins: { unique: [{ fields: ['email'] }] },
  sessions: { unique: [{ fields: ['tokenHash'] }], ttl: 'expiresAt' },
  bookings: {
    unique: [
      { fields: ['code'] },
      // Double booking se bachao: ek (date, time, seat) par sirf ek active booking. Cancelled booking seat chhor deti hai.
      { fields: ['date', 'time', 'seat'], when: { holdsSeat: true } },
      { fields: ['legacyId'], sparse: true },
    ],
    indexes: [['date', 'time'], ['status'], ['createdAt']],
  },
  orders: { unique: [{ fields: ['code'] }, { fields: ['legacyId'], sparse: true }], indexes: [['status'], ['createdAt']] },
  messages: { unique: [{ fields: ['legacyId'], sparse: true }], indexes: [['status'], ['createdAt']] },
  subscribers: { unique: [{ fields: ['email'] }], indexes: [['createdAt']] },
  products: { unique: [{ fields: ['slug'] }], indexes: [['active', 'sortOrder']] },
  services: { unique: [{ fields: ['slug'] }], indexes: [['active', 'sortOrder']] },
}

export const ENUMS = {
  bookingStatus: ['pending', 'confirmed', 'completed', 'cancelled'],
  orderStatus: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
  messageStatus: ['new', 'read', 'replied'],
  paymentMethod: ['cash', 'qr', 'card', 'jazzcash', 'easypaisa'],
  // paid = sirf verified payment. paid_demo / pay_on_delivery / pay_at_salon / awaiting_verification revenue mein ginti nahi hoti.
  paymentStatus: ['pay_on_delivery', 'pay_at_salon', 'awaiting_verification', 'paid_demo', 'paid', 'failed', 'refunded'],
}
