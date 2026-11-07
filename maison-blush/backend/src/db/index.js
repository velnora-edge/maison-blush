import { COLLECTIONS } from './schemaDefs.js'
import { memoryRepo } from './memoryRepo.js'

/** Saare repositories yahan milte hain: repos.bookings, repos.orders ... (initDB ke baad) */
export const repos = {}
let mode = 'none'
export const dbMode = () => mode

export async function initDB() {
  const useMemory = process.env.USE_MEMORY_DB === '1'
  if (useMemory) {
    if (process.env.NODE_ENV !== 'test') throw new Error('USE_MEMORY_DB sirf tests ke liye hai (NODE_ENV=test).')
    for (const name of Object.keys(COLLECTIONS)) repos[name] = memoryRepo(name)
    mode = 'memory'
    return mode
  }

  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error('MONGODB_URI set nahi hai. backend/.env.example ko .env mein copy karke MongoDB Atlas ka connection string likhein.')

  const { default: mongoose } = await import('mongoose')
  mongoose.set('strictQuery', true)
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 })
  const { models } = await import('./models.js')
  const { mongoRepo } = await import('./mongoRepo.js')
  for (const name of Object.keys(COLLECTIONS)) repos[name] = mongoRepo(models[name])
  // Indexes (unique, partial, TTL) pakka bana lo, warna double-booking se bachao kaam nahi karega
  await Promise.all(Object.values(models).map((m) => m.syncIndexes()))
  mode = 'mongo'
  return mode
}

export async function closeDB() {
  if (mode === 'mongo') { const { default: mongoose } = await import('mongoose'); await mongoose.disconnect() }
  mode = 'none'
}

export async function dbHealthy() {
  if (mode === 'memory') return true
  if (mode !== 'mongo') return false
  const { default: mongoose } = await import('mongoose')
  return mongoose.connection.readyState === 1
}
