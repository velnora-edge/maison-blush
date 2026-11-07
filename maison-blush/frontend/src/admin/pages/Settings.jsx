import { useEffect, useState } from 'react'
import { Loader2, ShieldCheck, Database, CreditCard, Bot } from 'lucide-react'
import { salon } from '@shared/salon.js'
import { adm } from '../api.js'
import { PageHeader, Card, Field, Badge, useToast } from '../ui.jsx'
import { useAdmin } from '../context.js'

export default function Settings() {
  const { admin, setAdmin } = useAdmin()
  const toast = useToast()
  const [name, setName] = useState(admin.name || '')
  const [busyProfile, setBusyProfile] = useState(false)
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' })
  const [pwError, setPwError] = useState('')
  const [busyPw, setBusyPw] = useState(false)
  const [sys, setSys] = useState(null)

  useEffect(() => { adm.get('/auth/system').then(setSys).catch(() => {}) }, [])

  const saveProfile = async (e) => {
    e.preventDefault(); setBusyProfile(true)
    try { const { admin: a } = await adm.patch('/auth/profile', { name }); setAdmin(a); toast('Profile updated.') } catch (err) { toast(err.message, 'bad') } finally { setBusyProfile(false) }
  }
  const changePw = async (e) => {
    e.preventDefault(); setPwError('')
    if (pw.newPassword !== pw.confirm) { setPwError('The new passwords do not match.'); return }
    setBusyPw(true)
    try { await adm.post('/auth/change-password', { currentPassword: pw.currentPassword, newPassword: pw.newPassword }); setPw({ currentPassword: '', newPassword: '', confirm: '' }); toast('Password changed. Other devices were signed out.') }
    catch (err) { setPwError(err.message) } finally { setBusyPw(false) }
  }

  return (
    <>
      <PageHeader title="Settings" subtitle="Your account and system status." />
      <div className="adm-grid-2">
        <Card title="Your profile">
          <form onSubmit={saveProfile} className="adm-form-stack">
            <Field label="Email"><input value={admin.email} disabled /></Field>
            <Field label="Display name"><input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} /></Field>
            <button className="adm-btn primary" disabled={busyProfile || name.trim().length < 2}>{busyProfile && <Loader2 className="spin" size={16} />} Save profile</button>
          </form>
        </Card>
        <Card title="Change password">
          <form onSubmit={changePw} className="adm-form-stack">
            <Field label="Current password"><input type="password" autoComplete="current-password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} /></Field>
            <Field label="New password" hint="At least 10 characters, with letters and numbers"><input type="password" autoComplete="new-password" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} /></Field>
            <Field label="Confirm new password"><input type="password" autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} /></Field>
            {pwError && <p className="adm-alert" role="alert">{pwError}</p>}
            <button className="adm-btn primary" disabled={busyPw || !pw.currentPassword || !pw.newPassword}>{busyPw && <Loader2 className="spin" size={16} />} Change password</button>
          </form>
        </Card>
      </div>

      <Card title="System status">
        {!sys ? <p className="adm-chart-empty">Checking…</p> : (
          <ul className="adm-status-list">
            <li><Database size={21} /><div><strong>Database</strong><small>{sys.database.mode === 'mongo' ? 'MongoDB Atlas' : sys.database.mode}</small></div><Badge tone={sys.database.connected ? 'good' : 'bad'}>{sys.database.connected ? 'Connected' : 'Disconnected'}</Badge></li>
            <li><CreditCard size={21} /><div><strong>Online card payments</strong><small>{sys.paymentMode === 'demo' ? 'Demo mode — no real money is charged. Cash and QR are verified by you.' : 'Live mode'}</small></div><Badge tone={sys.paymentMode === 'demo' ? 'warn' : 'good'}>{sys.paymentMode === 'demo' ? 'Demo' : 'Live'}</Badge></li>
            {sys.providers.map((p) => <li key={p.name}><ShieldCheck size={21} /><div><strong>{p.name === 'jazzcash' ? 'JazzCash' : p.name === 'easypaisa' ? 'Easypaisa' : p.name} gateway</strong><small>{p.configured ? 'Credentials found' : 'Not connected yet (needs merchant credentials)'}</small></div><Badge tone={p.configured ? 'good' : 'neutral'}>{p.configured ? 'Ready' : 'Not set up'}</Badge></li>)}
            <li><Bot size={21} /><div><strong>Website chatbot</strong><small>{sys.aiChatbot ? 'Smart AI answers are on' : 'Rule-based answers (uses your live services and products)'}</small></div><Badge tone="good">Active</Badge></li>
          </ul>
        )}
        <p className="adm-note spaced">Salon name, phone, address, opening hours and booking rules are edited in <code>shared/salon.js</code> in the project folder. Services, products, orders and bookings are all managed from this panel. Your website: <a href="/" target="_blank" rel="noreferrer">{salon.name}</a></p>
      </Card>
    </>
  )
}
