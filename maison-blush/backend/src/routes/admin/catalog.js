import { Router } from 'express'
import { repos } from '../../db/index.js'
import { isDup } from '../../utils/ids.js'
import { wrap } from '../../utils/sanitize.js'
import { HttpError, slugify } from '../../services/validate.js'
import { validateFields, IMAGE_RULE } from './fields.js'

const common = {
  name: { type: 'string', required: true, min: 2, max: 100, label: 'Name' },
  category: { type: 'string', required: true, min: 2, max: 40, label: 'Category' },
  description: { type: 'string', max: 600, label: 'Description' },
  price: { type: 'number', required: true, min: 0, max: 10_000_000, label: 'Price' },
  image: IMAGE_RULE,
  active: { type: 'boolean' },
  sortOrder: { type: 'number', min: 0, max: 9999, integer: true, label: 'Sort order' },
}
const SPECS = {
  services: { ...common, duration: { type: 'string', max: 30, label: 'Duration' }, keywords: { type: 'list' } },
  products: { ...common, stock: { type: 'number', required: true, min: 0, max: 100000, integer: true, label: 'Stock' }, featured: { type: 'boolean' }, rating: { type: 'number', min: 0, max: 5, label: 'Rating' } },
}
const SLUG = /^[a-z0-9-]{2,60}$/

/** Services aur Products dono ka CRUD (ek hi code, alag collection) */
export function catalogRouter(kind) {
  const router = Router()
  const repo = () => repos[kind]
  const spec = SPECS[kind]

  router.get('/', wrap(async (_req, res) => {
    const items = await repo().find({}, { sort: { sortOrder: 1, createdAt: 1 } })
    res.json({ items, categories: [...new Set(items.map((i) => i.category))].sort() })
  }))

  router.post('/', wrap(async (req, res) => {
    const value = validateFields(req.body, spec)
    const slug = slugify(req.body?.slug || value.name)
    if (!SLUG.test(slug)) throw new HttpError(400, 'Could not make a valid URL name (slug) from this name.', { slug: 'Invalid slug' })
    const defaults = kind === 'services' ? { duration: '', keywords: [] } : { featured: false, rating: 4.8 }
    const count = await repo().count({})
    try {
      const item = await repo().create({ description: '', image: '', active: true, sortOrder: count, ...defaults, ...value, slug })
      res.status(201).json({ item })
    } catch (e) {
      if (isDup(e, 'slug')) throw new HttpError(409, `A ${kind === 'services' ? 'service' : 'product'} with the URL name "${slug}" already exists.`, { slug: 'Already exists' })
      throw e
    }
  }))

  router.patch('/:id', wrap(async (req, res) => {
    const value = validateFields(req.body, spec, { partial: true })
    if (!Object.keys(value).length) throw new HttpError(400, 'Nothing to update.')
    const item = await repo().update(req.params.id, value)
    if (!item) throw new HttpError(404, 'Not found.')
    res.json({ item })
  }))

  router.delete('/:id', wrap(async (req, res) => {
    if (!(await repo().remove(req.params.id))) throw new HttpError(404, 'Not found.')
    res.json({ ok: true })
  }))

  return router
}
