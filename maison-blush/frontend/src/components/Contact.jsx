import { useState } from 'react'
import { MapPin, Phone, Mail, Clock, MessageCircle, Send, Loader2, AlertCircle, Check } from 'lucide-react'
import { salon } from '@shared/salon.js'
import { api } from '../api/client.js'
import { onlyDigits } from '../utils/format.js'
import SectionHead from './SectionHead.jsx'
import Reveal from './Reveal.jsx'

const tel = salon.phone.replace(/\s/g, '')

export default function Contact() {
  const [f, setF] = useState({ name: '', phone: '', email: '', message: '' })
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const set = (patch) => setF((x) => ({ ...x, ...patch }))

  const onSubmit = async (ev) => {
    ev.preventDefault()
    setError('')
    const e = {}
    if (f.name.trim().length < 2) e.name = 'Please enter your name.'
    if (!f.phone && !f.email) e.phone = 'Please add a phone number or an email.'
    if (f.phone && onlyDigits(f.phone).length < 10) e.phone = 'Please enter a valid phone number.'
    if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email)) e.email = 'Please enter a valid email.'
    if (f.message.trim().length < 5) e.message = 'Please write a short message.'
    setErrors(e)
    if (Object.keys(e).length) return
    setBusy(true)
    try { await api.sendContact(f); setSent(true); setF({ name: '', phone: '', email: '', message: '' }) }
    catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }

  const info = [
    { icon: Phone, title: 'Call us', text: salon.phone, href: `tel:${tel}` },
    { icon: MessageCircle, title: 'WhatsApp', text: 'Chat with us', href: `https://wa.me/${salon.whatsapp}` },
    { icon: Mail, title: 'Email', text: salon.email, href: `mailto:${salon.email}` },
    { icon: MapPin, title: 'Visit us', text: `${salon.address}, ${salon.city}` },
  ]

  return (
    <section className="section section-alt" id="contact">
      <div className="container">
        <SectionHead eyebrow="Contact Us" title="We would love to" accent="hear from you" text="Questions about a service, price or booking? Send us a message or visit the salon." />

        <div className="info-cards">
          {info.map(({ icon: Icon, title, text, href }, i) => {
            const Tag = href ? 'a' : 'div'
            return (
              <Reveal key={title} delay={i * 80}>
                <Tag className="info-card" {...(href ? { href, ...(href.startsWith('http') ? { target: '_blank', rel: 'noreferrer' } : {}) } : {})}>
                  <span className="feature-icon"><Icon size={26} aria-hidden="true" /></span>
                  <div><h3>{title}</h3><p>{text}</p></div>
                </Tag>
              </Reveal>
            )
          })}
        </div>

        <div className="contact-grid">
          <Reveal className="form-card">
            {sent ? (
              <div className="success-box" role="status">
                <span className="success-icon"><Check size={38} aria-hidden="true" /></span>
                <h3>Message sent!</h3>
                <p>Thank you for reaching out. We will get back to you shortly.</p>
                <button className="btn btn-outline" onClick={() => setSent(false)}>Send another message</button>
              </div>
            ) : (
              <form onSubmit={onSubmit} noValidate>
                <h3>Send us a message</h3>
                <div className="field-row">
                  <div className="field"><label htmlFor="m-name">Your name *</label><input id="m-name" autoComplete="name" value={f.name} onChange={(e) => set({ name: e.target.value })} aria-invalid={!!errors.name} />{errors.name && <p className="field-error"><AlertCircle size={17} /> {errors.name}</p>}</div>
                  <div className="field"><label htmlFor="m-phone">Phone</label><input id="m-phone" type="tel" autoComplete="tel" inputMode="tel" value={f.phone} onChange={(e) => set({ phone: e.target.value })} aria-invalid={!!errors.phone} />{errors.phone && <p className="field-error"><AlertCircle size={17} /> {errors.phone}</p>}</div>
                </div>
                <div className="field"><label htmlFor="m-email">Email</label><input id="m-email" type="email" autoComplete="email" value={f.email} onChange={(e) => set({ email: e.target.value })} aria-invalid={!!errors.email} />{errors.email && <p className="field-error"><AlertCircle size={17} /> {errors.email}</p>}</div>
                <div className="field"><label htmlFor="m-msg">Message *</label><textarea id="m-msg" rows={5} value={f.message} onChange={(e) => set({ message: e.target.value })} aria-invalid={!!errors.message} />{errors.message && <p className="field-error"><AlertCircle size={17} /> {errors.message}</p>}</div>
                {error && <p className="alert" role="alert"><AlertCircle size={20} aria-hidden="true" /> {error}</p>}
                <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={busy}>
                  {busy ? <><Loader2 size={22} className="spin" aria-hidden="true" /> Sending…</> : <><Send size={20} aria-hidden="true" /> Send Message</>}
                </button>
              </form>
            )}
          </Reveal>

          <Reveal delay={120} className="map-card">
            <iframe
              title={`Map showing ${salon.name}`}
              src={`https://www.google.com/maps?q=${encodeURIComponent(salon.mapQuery)}&output=embed`}
              loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen
            />
            <div className="hours-box">
              <h3><Clock size={22} aria-hidden="true" /> Opening hours</h3>
              {salon.hours.map((h) => <p key={h.days}><span>{h.days}</span><strong>{h.time}</strong></p>)}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
