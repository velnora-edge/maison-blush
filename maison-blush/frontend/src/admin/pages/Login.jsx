import { useEffect, useState } from 'react'
import { Scissors, Eye, EyeOff, Loader2, AlertCircle, Lock } from 'lucide-react'
import { salon } from '@shared/salon.js'
import { adm } from '../api.js'

export default function Login({ onSuccess }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => { document.title = 'Admin sign in – Maison Blush' }, [])

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!email.trim() || !password) { setError('Please enter your email and password.'); return }
    setBusy(true)
    try { const { admin } = await adm.post('/auth/login', { email: email.trim(), password }); onSuccess(admin) }
    catch (err) { setError(err.message); setPassword('') }
    finally { setBusy(false) }
  }

  return (
    <div className="adm-login">
      <form className="adm-login-card" onSubmit={submit} noValidate>
        <div className="adm-login-brand">
          <span className="adm-brand-mark big"><Scissors size={28} aria-hidden="true" /></span>
          <h1>{salon.name}</h1>
          <p>Admin sign in</p>
        </div>

        <label className="adm-field"><span>Email</span>
          <input type="email" autoComplete="username" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" aria-invalid={!!error} />
        </label>
        <label className="adm-field"><span>Password</span>
          <div className="adm-pass">
            <input type={show ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" aria-invalid={!!error} />
            <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'}>{show ? <EyeOff size={20} /> : <Eye size={20} />}</button>
          </div>
        </label>

        {error && <p className="adm-alert" role="alert"><AlertCircle size={20} aria-hidden="true" /> {error}</p>}
        <button className="adm-btn primary block" type="submit" disabled={busy}>{busy ? <><Loader2 className="spin" size={20} /> Signing in…</> : <><Lock size={19} aria-hidden="true" /> Sign in</>}</button>
        <p className="adm-login-foot">Only salon staff can sign in here. <a href="/">Back to website</a></p>
      </form>
    </div>
  )
}
