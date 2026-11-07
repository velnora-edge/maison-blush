import { useState } from 'react'
import { Scissors, Phone, Mail, MapPin, Clock, Instagram, Facebook, Youtube, Send, Loader2, Check, CreditCard, QrCode, Banknote } from 'lucide-react'
import { salon } from '@shared/salon.js'
import { useApp } from '../context/AppContext.jsx'
import { api } from '../api/client.js'

const quick = [['Home', '#home'], ['About Us', '#about'], ['Services', '#services'], ['Treatments', '#treatments'], ['Shop', '#shop'], ['Gallery', '#gallery'], ['Book Appointment', '#booking'], ['Contact', '#contact']]

export default function Footer() {
  const { services } = useApp()
  const [email, setEmail] = useState('')
  const [state, setState] = useState('idle') // idle | busy | done | error
  const [msg, setMsg] = useState('')

  const subscribe = async (ev) => {
    ev.preventDefault()
    setState('busy'); setMsg('')
    try { await api.subscribe(email); setState('done'); setEmail('') }
    catch (err) { setState('error'); setMsg(err.message) }
  }

  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <a className="brand" href="#home">
            <span className="brand-mark"><Scissors size={22} aria-hidden="true" /></span>
            <span className="brand-text"><strong>{salon.name}</strong><small>{salon.tagline}</small></span>
          </a>
          <p>{salon.description}</p>
          <div className="socials">
            <a href={salon.social.instagram} target="_blank" rel="noreferrer" aria-label="Instagram"><Instagram size={22} /></a>
            <a href={salon.social.facebook} target="_blank" rel="noreferrer" aria-label="Facebook"><Facebook size={22} /></a>
            <a href={salon.social.youtube} target="_blank" rel="noreferrer" aria-label="YouTube"><Youtube size={22} /></a>
          </div>
        </div>

        <nav aria-label="Quick links">
          <h3>Quick Links</h3>
          <ul>{quick.map(([l, h]) => <li key={l}><a href={h}>{l}</a></li>)}</ul>
        </nav>

        <nav aria-label="Our services">
          <h3>Our Services</h3>
          <ul>{services.slice(0, 7).map((s) => <li key={s.id}><a href="#services">{s.name}</a></li>)}</ul>
        </nav>

        <div>
          <h3>Contact</h3>
          <ul className="contact-list">
            <li><MapPin size={20} aria-hidden="true" /> {salon.address}, {salon.city}</li>
            <li><Phone size={20} aria-hidden="true" /> <a href={`tel:${salon.phone.replace(/\s/g, '')}`}>{salon.phone}</a></li>
            <li><Mail size={20} aria-hidden="true" /> <a href={`mailto:${salon.email}`}>{salon.email}</a></li>
            {salon.hours.map((h) => <li key={h.days}><Clock size={20} aria-hidden="true" /> {h.days}: {h.time}</li>)}
          </ul>
        </div>
      </div>

      <div className="container footer-news">
        <div>
          <h3>Get offers & hair-care tips</h3>
          <p>Join our list — no spam, only useful updates.</p>
        </div>
        {state === 'done' ? (
          <p className="news-done"><Check size={22} aria-hidden="true" /> Thank you for subscribing!</p>
        ) : (
          <form onSubmit={subscribe} className="news-form">
            <label htmlFor="news-email" className="sr-only">Email address</label>
            <input id="news-email" type="email" required placeholder="Your email address" value={email} onChange={(e) => setEmail(e.target.value)} />
            <button className="btn btn-primary" type="submit" disabled={state === 'busy'}>
              {state === 'busy' ? <Loader2 size={20} className="spin" aria-hidden="true" /> : <Send size={20} aria-hidden="true" />} Subscribe
            </button>
            {state === 'error' && <p className="news-error" role="alert">{msg}</p>}
          </form>
        )}
      </div>

      <div className="footer-bottom">
        <div className="container footer-bottom-inner">
          <span>© {new Date().getFullYear()} {salon.name}. All rights reserved.</span>
          <span className="pay-icons" aria-label="Accepted payments"><CreditCard size={20} aria-hidden="true" /> Cards <QrCode size={20} aria-hidden="true" /> QR / JazzCash / Easypaisa <Banknote size={20} aria-hidden="true" /> Cash</span>
        </div>
      </div>
    </footer>
  )
}
