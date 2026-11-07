import { repos } from '../db/index.js'
import { services as staticServices, products as staticProducts } from '../../../shared/catalog.js'

/** DB document -> wahi shape jo frontend / chatbot pehle se use karte hain (id = slug) */
export const publicService = (s) => ({
  id: s.slug, name: s.name, category: s.category, duration: s.duration, price: s.price,
  desc: s.description, image: s.image, keywords: s.keywords || [],
})
export const publicProduct = (p) => ({
  id: p.slug, name: p.name, category: p.category, price: p.price, rating: p.rating,
  desc: p.description, image: p.image, stock: p.stock, featured: Boolean(p.featured),
})

const bySort = { sortOrder: 1, createdAt: 1 }
export const listActiveServices = async () => (await repos.services.find({ active: true }, { sort: bySort })).map(publicService)
export const listActiveProducts = async () => {
  const items = await repos.products.find({ active: true }, { sort: bySort })
  return items.map(publicProduct).sort((a, b) => Number(b.featured) - Number(a.featured)) // featured sab se pehle (stable sort)
}

/** Pehli dafa (khali DB) shared/catalog.js ke services aur products DB mein daal do. Dobara chalane se kuch duplicate nahi hota. */
export async function seedCatalogIfEmpty() {
  const out = { services: 0, products: 0 }
  if ((await repos.services.count({})) === 0) {
    for (const [i, s] of staticServices.entries()) {
      await repos.services.create({ slug: s.id, name: s.name, category: s.category, description: s.desc, duration: s.duration, price: s.price, image: s.image, keywords: s.keywords, active: true, sortOrder: i })
      out.services++
    }
  }
  if ((await repos.products.count({})) === 0) {
    for (const [i, p] of staticProducts.entries()) {
      await repos.products.create({ slug: p.id, name: p.name, category: p.category, description: p.desc, price: p.price, image: p.image, rating: p.rating, stock: 50, featured: i < 2, active: true, sortOrder: i })
      out.products++
    }
  }
  return out
}
