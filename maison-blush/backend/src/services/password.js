import bcrypt from 'bcryptjs'
import { HttpError } from './validate.js'

const ROUNDS = 12
export const hashPassword = (pw) => bcrypt.hash(pw, ROUNDS)
export const verifyPassword = (pw, hash) => bcrypt.compare(pw, hash)

// Email na milne par bhi itna hi time lagao, taake attacker timing se pata na kar sake ke email maujood hai ya nahi
let dummy
export const dummyCompare = async (pw) => { dummy ??= await bcrypt.hash('not-a-real-password', ROUNDS); await bcrypt.compare(pw, dummy) }

export function assertStrongPassword(pw) {
  if (typeof pw !== 'string' || pw.length < 10) throw new HttpError(400, 'Password must be at least 10 characters.')
  if (pw.length > 128) throw new HttpError(400, 'Password is too long (max 128 characters).')
  if (!/[a-zA-Z]/.test(pw) || !/\d/.test(pw)) throw new HttpError(400, 'Password must contain letters and numbers.')
}
