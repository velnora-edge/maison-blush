import mongoose from 'mongoose'
import { COLLECTIONS, ENUMS } from './schemaDefs.js'

const { Schema } = mongoose
const base = { timestamps: true, versionKey: false }
const sub = { _id: false }

const money = { type: Number, required: true, min: 0 }

const paymentSchema = new Schema({
  method: { type: String, enum: ENUMS.paymentMethod, required: true },
  status: { type: String, enum: ENUMS.paymentStatus, required: true },
  amount: { type: Number, min: 0, default: 0 }, // jitna customer se maanga gaya (order total / advance)
  paidAmount: { type: Number, min: 0, default: 0 }, // jitna VERIFIED mil chuka — revenue sirf isi se
  reference: { type: String, maxlength: 60 }, // QR transaction ID
  brand: { type: String, maxlength: 20 },
  last4: { type: String, match: /^\d{4}$/ }, // card ka poora number KABHI save nahi hota
  provider: { type: String, maxlength: 30 },
  providerTxnId: { type: String, maxlength: 80 },
  paidAt: Date,
  verifiedBy: { type: String, maxlength: 120 },
}, sub)

const schemas = {
  admins: new Schema({
    email: { type: String, required: true, lowercase: true, trim: true, maxlength: 160, match: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/ },
    name: { type: String, trim: true, maxlength: 80, default: 'Admin' },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['admin'], default: 'admin' },
    active: { type: Boolean, default: true },
    failedLogins: { type: Number, default: 0 },
    lockUntil: Date,
    lastLoginAt: Date,
  }, base),

  sessions: new Schema({
    tokenHash: { type: String, required: true },
    adminId: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    ip: String,
    userAgent: { type: String, maxlength: 250 },
  }, base),

  services: new Schema({
    slug: { type: String, required: true, lowercase: true, trim: true, maxlength: 60, match: /^[a-z0-9-]+$/ },
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    category: { type: String, required: true, trim: true, maxlength: 40 },
    description: { type: String, trim: true, maxlength: 600, default: '' },
    duration: { type: String, trim: true, maxlength: 30, default: '' },
    price: money,
    image: { type: String, trim: true, maxlength: 400, default: '' },
    keywords: { type: [String], default: [] },
    active: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  }, base),

  products: new Schema({
    slug: { type: String, required: true, lowercase: true, trim: true, maxlength: 60, match: /^[a-z0-9-]+$/ },
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    category: { type: String, required: true, trim: true, maxlength: 40 },
    description: { type: String, trim: true, maxlength: 600, default: '' },
    price: money,
    image: { type: String, trim: true, maxlength: 400, default: '' },
    rating: { type: Number, min: 0, max: 5, default: 4.8 },
    stock: { type: Number, required: true, min: 0, default: 0 },
    featured: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  }, base),

  bookings: new Schema({
    code: { type: String, required: true },
    legacyId: String,
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    phone: { type: String, required: true, trim: true, maxlength: 20 },
    email: { type: String, trim: true, lowercase: true, maxlength: 160 },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    time: { type: String, required: true, match: /^\d{2}:\d{2}$/ },
    seat: { type: Number, required: true, min: 1 },
    holdsSeat: { type: Boolean, required: true, default: true },
    services: {
      type: [new Schema({ slug: String, name: { type: String, required: true }, price: money }, sub)],
      validate: [(v) => v.length > 0, 'At least one service is required'],
    },
    estimatedTotal: money,
    notes: { type: String, maxlength: 500 },
    status: { type: String, enum: ENUMS.bookingStatus, default: 'pending' },
    payment: { type: paymentSchema, required: true },
  }, base),

  orders: new Schema({
    code: { type: String, required: true },
    legacyId: String,
    customer: {
      name: { type: String, required: true, trim: true, maxlength: 80 },
      phone: { type: String, required: true, trim: true, maxlength: 20 },
      email: { type: String, trim: true, lowercase: true, maxlength: 160 },
      address: { type: String, required: true, trim: true, maxlength: 250 },
      city: { type: String, required: true, trim: true, maxlength: 60 },
      notes: { type: String, maxlength: 400 },
    },
    items: {
      type: [new Schema({ slug: String, name: { type: String, required: true }, price: money, qty: { type: Number, required: true, min: 1, max: 10 } }, sub)],
      validate: [(v) => v.length > 0, 'At least one item is required'],
    },
    subtotal: money,
    shipping: money,
    total: money,
    status: { type: String, enum: ENUMS.orderStatus, default: 'pending' },
    payment: { type: paymentSchema, required: true },
  }, base),

  messages: new Schema({
    legacyId: String,
    name: { type: String, required: true, trim: true, maxlength: 80 },
    phone: { type: String, trim: true, maxlength: 20 },
    email: { type: String, trim: true, lowercase: true, maxlength: 160 },
    message: { type: String, required: true, trim: true, minlength: 5, maxlength: 1500 },
    status: { type: String, enum: ENUMS.messageStatus, default: 'new' },
  }, base),

  subscribers: new Schema({
    email: { type: String, required: true, lowercase: true, trim: true, maxlength: 160, match: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/ },
  }, base),
}

// COLLECTIONS mein likhe indexes schemas par lagao
for (const [name, schema] of Object.entries(schemas)) {
  const def = COLLECTIONS[name]
  for (const u of def.unique || []) {
    const opts = { unique: true }
    if (u.sparse) opts.sparse = true
    if (u.when) opts.partialFilterExpression = u.when
    schema.index(Object.fromEntries(u.fields.map((f) => [f, 1])), opts)
  }
  for (const fields of def.indexes || []) schema.index(Object.fromEntries(fields.map((f) => [f, 1])))
  if (def.ttl) schema.index({ [def.ttl]: 1 }, { expireAfterSeconds: 0 })
}

export const models = Object.fromEntries(
  Object.entries(schemas).map(([name, schema]) => [name, mongoose.models[name] || mongoose.model(name, schema, name)]),
)
