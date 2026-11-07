import { Router } from 'express'
import crypto from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { wrap } from '../../utils/sanitize.js'
import { HttpError } from '../../services/validate.js'

export const UPLOAD_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'uploads')
const MAX_BYTES = 2.5 * 1024 * 1024

// Content-type par bharosa nahi: file ke asli pehle bytes (magic bytes) se type pehchano
function detect(buf) {
  if (buf.length > 12 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png'
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg'
  if (buf.length > 12 && buf.subarray(0, 4).toString() === 'RIFF' && buf.subarray(8, 12).toString() === 'WEBP') return 'webp'
  return null
}

const router = Router()
router.post('/', wrap(async (req, res) => {
  const m = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(String(req.body?.dataUrl || ''))
  if (!m) throw new HttpError(400, 'Please choose a PNG, JPG or WebP image.')
  const buf = Buffer.from(m[2], 'base64')
  if (buf.length > MAX_BYTES) throw new HttpError(413, 'Image is too large (max 2.5 MB).')
  const ext = detect(buf)
  if (!ext) throw new HttpError(400, 'This file is not a valid image.')
  await mkdir(UPLOAD_DIR, { recursive: true })
  const name = `${crypto.randomBytes(12).toString('hex')}.${ext}`
  await writeFile(path.join(UPLOAD_DIR, name), buf)
  res.status(201).json({ url: `/uploads/${name}` })
}))
export default router
