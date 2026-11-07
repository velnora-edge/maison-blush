import crypto from 'node:crypto'
import { COLLECTIONS } from './schemaDefs.js'
import { matches, getPath } from './matcher.js'

let counter = 0
export const newId = () => (Date.now().toString(16).padStart(12, '0') + (counter++ & 0xffff).toString(16).padStart(4, '0') + crypto.randomBytes(4).toString('hex')).slice(-24)

const dupError = (fields) => Object.assign(new Error(`E11000 duplicate key error (${fields.join(', ')})`), { code: 11000, keyPattern: Object.fromEntries(fields.map((f) => [f, 1])) })
const clone = (o) => (o == null ? o : structuredClone(o))
const same = (a, b) => (a == null || b == null ? a == null && b == null : cmp(a, b) === 0)
const cmp = (a, b) => { const x = a instanceof Date ? a.getTime() : a, y = b instanceof Date ? b.getTime() : b; return x < y ? -1 : x > y ? 1 : 0 }

/** Mongoose-repo wala hi interface, par RAM mein. SIRF tests ke liye (USE_MEMORY_DB=1 aur NODE_ENV=test). */
export function memoryRepo(name) {
  const defs = COLLECTIONS[name]
  let rows = []

  const checkUnique = (doc) => {
    for (const u of defs.unique || []) {
      if (u.when && !matches(doc, u.when)) continue
      const vals = u.fields.map((f) => getPath(doc, f))
      if (u.sparse && vals.some((v) => v == null)) continue
      const clash = rows.find((r) => r.id !== doc.id && (!u.when || matches(r, u.when)) && u.fields.every((f, i) => same(getPath(r, f), vals[i])))
      if (clash) throw dupError(u.fields)
    }
  }
  const pick = (doc, select) => {
    if (!select) return clone(doc)
    const keys = select.split(/\s+/).filter(Boolean)
    return clone(Object.fromEntries([['id', doc.id], ...keys.map((k) => [k, doc[k]])]))
  }
  const applyUpdate = (doc, update) => {
    const next = clone(doc)
    const setPath = (path, v) => { const parts = path.split('.'); let o = next; parts.slice(0, -1).forEach((p) => { o[p] = o[p] ?? {}; o = o[p] }); o[parts.at(-1)] = v }
    for (const [k, v] of Object.entries(update.$set || {})) setPath(k, v)
    for (const [k, v] of Object.entries(update.$inc || {})) setPath(k, (getPath(next, k) || 0) + v)
    next.updatedAt = new Date()
    return next
  }

  return {
    async find(filter = {}, { sort, skip = 0, limit = 0, select } = {}) {
      let out = rows.filter((r) => matches(r, filter))
      if (sort) {
        const entries = Object.entries(sort)
        out = [...out].sort((a, b) => { for (const [k, dir] of entries) { const c = cmp(getPath(a, k), getPath(b, k)); if (c) return c * dir } return 0 })
      }
      out = out.slice(skip, limit ? skip + limit : undefined)
      return out.map((r) => pick(r, select))
    },
    async findOne(filter) { const r = rows.find((x) => matches(x, filter)); return r ? clone(r) : null },
    async count(filter = {}) { return rows.filter((r) => matches(r, filter)).length },
    async get(id) { const r = rows.find((x) => x.id === String(id)); return r ? clone(r) : null },
    async create(data) {
      const now = new Date()
      const doc = { createdAt: now, updatedAt: now, ...clone(data), id: newId() }
      checkUnique(doc)
      rows.push(doc)
      return clone(doc)
    },
    async atomicUpdate(filter, update) {
      const f = { ...filter }
      const idx = rows.findIndex((r) => matches(r, f))
      if (idx < 0) return null
      const next = applyUpdate(rows[idx], update)
      checkUnique(next)
      rows[idx] = next
      return clone(next)
    },
    async update(id, patch) { return this.atomicUpdate({ id: String(id) }, { $set: patch }) },
    async remove(id) { const n = rows.length; rows = rows.filter((r) => r.id !== String(id)); return rows.length < n },
    async removeMany(filter) { const n = rows.length; rows = rows.filter((r) => !matches(r, filter)); return n - rows.length },
    async clear() { rows = [] },
  }
}
