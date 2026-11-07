import { loadEnv } from './src/loadEnv.js'
loadEnv()

const { initDB, closeDB } = await import('./src/db/index.js')
const { seedCatalogIfEmpty } = await import('./src/services/catalog.js')
const { createApp } = await import('./src/app.js')

try {
  const mode = await initDB()
  const seeded = await seedCatalogIfEmpty()
  console.log(`✔ Database connected (${mode})${seeded.services || seeded.products ? ` — first run: added ${seeded.services} services, ${seeded.products} products` : ''}`)
} catch (e) {
  console.error(`✖ Database connection failed: ${e.message}`)
  console.error('  → backend/.env mein MONGODB_URI check karein (README: "MongoDB Atlas setup").')
  process.exit(1)
}

const port = process.env.PORT || 4000
const server = createApp().listen(port, () => console.log(`✔ Maison Blush API running on http://localhost:${port}`))

const shutdown = () => server.close(async () => { await closeDB(); process.exit(0) })
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
