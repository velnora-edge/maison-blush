/**
 * Pehla admin account banane ka SAFE tareeqa (koi default password nahi, public sign-up nahi).
 *
 *   npm run create-admin                       -> email aur password poochta hai (password screen par nahi dikhta)
 *   npm run create-admin -- --reset-password   -> bhoola hua password naya set karo (purane sab logins khatam)
 *
 * Server par (jahan terminal na ho): ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run create-admin
 */
import readline from 'node:readline'
import { loadEnv } from '../src/loadEnv.js'
loadEnv()
const { initDB, closeDB } = await import('../src/db/index.js')
const { createAdmin, resetAdminPassword } = await import('../src/services/auth.js')

function ask(question, { hidden = false } = {}) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true })
    if (hidden) rl._writeToOutput = (s) => process.stdout.write(s.startsWith(question) ? question : s.replace(/[^\r\n]/g, '*'))
    rl.question(question, (a) => { rl.close(); process.stdout.write('\n'); resolve(a) })
  })
}

const reset = process.argv.includes('--reset-password')
try {
  await initDB()
  const email = process.env.ADMIN_EMAIL || (await ask('Admin email: '))
  let password = process.env.ADMIN_PASSWORD
  if (!password) {
    password = await ask(`${reset ? 'New' : ''} Password (min 10 chars, letters + numbers): `, { hidden: true })
    if (password !== (await ask('Confirm password: ', { hidden: true }))) throw new Error('Passwords do not match.')
  }
  const admin = reset ? await resetAdminPassword({ email, password }) : await createAdmin({ email, password, name: process.env.ADMIN_NAME || 'Admin' })
  console.log(`✔ ${reset ? 'Password updated for' : 'Admin created:'} ${admin.email}`)
  console.log('  Login: /admin/login')
} catch (e) {
  console.error(`✖ ${e.message}`)
  process.exitCode = 1
} finally {
  await closeDB()
}
