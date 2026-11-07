/**
 * Purane JSON data (backend/data/*.json) ko MongoDB mein le jao.
 *   npm run migrate-json
 * - Dobara chalana safe hai (duplicate nahi banta).
 * - JSON files KABHI delete nahi hoti. Report dekh kar jab aap mutmaeen hon, tab khud hata sakte hain.
 */
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadEnv } from '../src/loadEnv.js'
loadEnv()
const { initDB, closeDB } = await import('../src/db/index.js')
const { migrate } = await import('../src/services/migrate.js')

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data')
const read = async (name) => { try { return JSON.parse(await readFile(path.join(dir, `${name}.json`), 'utf8')) } catch { return [] } }

try {
  await initDB()
  const data = { bookings: await read('bookings'), orders: await read('orders'), messages: await read('messages'), subscribers: await read('subscribers') }
  const total = Object.values(data).reduce((t, r) => t + r.length, 0)
  if (!total) { console.log('Purane JSON mein koi record nahi mila — migration ki zaroorat nahi.'); process.exit(0) }
  const report = await migrate(data)
  for (const [name, r] of Object.entries(report)) if (name !== 'verified') console.log(`${name.padEnd(12)} found ${r.found} · inserted ${r.inserted} · already there ${r.skipped} · failed ${r.failed.length}`)
  Object.values(report).forEach((r) => r.failed?.forEach((f) => console.log('  ✖', f)))
  console.log(report.verified ? '✔ Verified: JSON ke saare records MongoDB mein hain. JSON files abhi bhi jaisi thi waisi hain.' : '✖ Kuch records migrate nahi hue — upar failed list dekhein. JSON files safe hain.')
  process.exitCode = report.verified ? 0 : 1
} catch (e) { console.error(`✖ ${e.message}`); process.exitCode = 1 } finally { await closeDB() }
