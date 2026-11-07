import crypto from 'node:crypto'
import { repos } from '../db/index.js'
import { hashPassword, verifyPassword, dummyCompare, assertStrongPassword } from './password.js'
import { HttpError, isEmail, clean } from './validate.js'

export const COOKIE = 'mb_admin'
export const SESSION_HOURS = 8
const MAX_FAILS = 5
const LOCK_MINUTES = 15

const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex')
const publicAdmin = (a) => ({ id: a.id, email: a.email, name: a.name, role: a.role, lastLoginAt: a.lastLoginAt || null })

/** Pehla admin banane ke liye (scripts/create-admin.js). Public route NAHI hai. */
export async function createAdmin({ email, password, name = 'Admin' }) {
  email = clean(email, 160).toLowerCase()
  if (!isEmail(email)) throw new HttpError(400, 'Please enter a valid email address.')
  assertStrongPassword(password)
  if (await repos.admins.findOne({ email })) throw new HttpError(409, 'An admin with this email already exists.')
  const admin = await repos.admins.create({
    email, name: clean(name, 80) || 'Admin', passwordHash: await hashPassword(password), role: 'admin', active: true, failedLogins: 0,
  })
  return publicAdmin(admin)
}

export async function resetAdminPassword({ email, password }) {
  email = clean(email, 160).toLowerCase()
  assertStrongPassword(password)
  const admin = await repos.admins.findOne({ email })
  if (!admin) throw new HttpError(404, 'No admin found with that email.')
  await repos.admins.update(admin.id, { passwordHash: await hashPassword(password), failedLogins: 0, lockUntil: null })
  await repos.sessions.removeMany({ adminId: admin.id }) // purane login sab khatam
  return publicAdmin(admin)
}

export async function login({ email, password, ip, userAgent }) {
  email = clean(email, 160).toLowerCase()
  const generic = new HttpError(401, 'Invalid email or password.')
  if (!isEmail(email) || typeof password !== 'string' || !password || password.length > 128) { await dummyCompare(String(password || '')); throw generic }

  const admin = await repos.admins.findOne({ email })
  if (!admin || !admin.active) { await dummyCompare(password); throw generic }
  if (admin.lockUntil && new Date(admin.lockUntil) > new Date()) {
    throw new HttpError(429, `Too many failed attempts. Try again in ${Math.ceil((new Date(admin.lockUntil) - Date.now()) / 60000)} minute(s).`)
  }

  if (!(await verifyPassword(password, admin.passwordHash))) {
    const updated = await repos.admins.atomicUpdate({ id: admin.id }, { $inc: { failedLogins: 1 } })
    if (updated.failedLogins >= MAX_FAILS) {
      await repos.admins.update(admin.id, { failedLogins: 0, lockUntil: new Date(Date.now() + LOCK_MINUTES * 60000) })
    }
    throw generic
  }

  await repos.admins.update(admin.id, { failedLogins: 0, lockUntil: null, lastLoginAt: new Date() })
  const token = crypto.randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + SESSION_HOURS * 3600 * 1000)
  // Database mein token ka sirf hash — DB leak ho bhi jaye to session chori nahi hota
  await repos.sessions.create({ tokenHash: sha256(token), adminId: admin.id, expiresAt, ip: ip || '', userAgent: clean(userAgent, 250) })
  return { token, expiresAt, admin: publicAdmin({ ...admin, lastLoginAt: new Date() }) }
}

export async function adminFromToken(token) {
  if (!token || typeof token !== 'string' || token.length > 100) return null
  const session = await repos.sessions.findOne({ tokenHash: sha256(token) })
  if (!session || new Date(session.expiresAt) <= new Date()) return null
  const admin = await repos.admins.get(session.adminId)
  return admin && admin.active ? { admin, session } : null
}

export const logout = (token) => repos.sessions.removeMany({ tokenHash: sha256(String(token || '')) })

export async function changePassword(admin, session, { currentPassword, newPassword }) {
  if (!(await verifyPassword(String(currentPassword || ''), admin.passwordHash))) throw new HttpError(400, 'Current password is incorrect.')
  assertStrongPassword(newPassword)
  if (newPassword === currentPassword) throw new HttpError(400, 'New password must be different from the current one.')
  await repos.admins.update(admin.id, { passwordHash: await hashPassword(newPassword) })
  // Doosre sab devices logout, sirf yeh session rahe
  const all = await repos.sessions.find({ adminId: admin.id })
  for (const s of all) if (s.id !== session.id) await repos.sessions.remove(s.id)
}

export async function updateProfile(admin, { name }) {
  const n = clean(name, 80)
  if (n.length < 2) throw new HttpError(400, 'Please enter your name.')
  return publicAdmin(await repos.admins.update(admin.id, { name: n }))
}

export { publicAdmin }
