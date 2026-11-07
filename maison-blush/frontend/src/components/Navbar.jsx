import { useEffect, useState } from 'react'
import { Menu, X, ShoppingBag, Phone, Clock, CalendarCheck, Scissors } from 'lucide-react'
import { salon } from '@shared/salon.js'
import { useApp } from '../context/AppContext.jsx'

const links = [
  { id: 'home', label: 'Home' }, { id: 'about', label: 'About' }, { id: 'services', label: 'Services' },
  { id: 'treatments', label: 'Treatments' }, { id: 'shop', label: 'Shop' }, { id: 'gallery', label: 'Gallery' }, { id: 'contact', label: 'Contact' },
]

export default function Navbar() {
  const { count, openCart } = useApp()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [active, setActive] = useState('home')
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const y = window.scrollY
        setScrolled(y > 40)
        const max = document.documentElement.scrollHeight - window.innerHeight
        setProgress(max > 0 ? y / max : 0)
        let current = 'home'
        for (const l of links) {
          const el = document.getElementById(l.id)
          if (el && el.getBoundingClientRect().top <= 140) current = l.id
        }
        setActive(current)
      })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf) }
  }, [])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', onKey) }
  }, [open])

  const go = () => setOpen(false)

  return (
    <header className={`site-header ${scrolled ? 'scrolled' : ''}`}>
      <div className="topbar">
        <div className="container topbar-inner">
          <a href={`tel:${salon.phone.replace(/\s/g, '')}`}><Phone size={16} aria-hidden="true" /> {salon.phone}</a>
          <span className="topbar-hours"><Clock size={16} aria-hidden="true" /> {salon.hours[0].days}: {salon.hours[0].time}</span>
        </div>
      </div>

      <nav className="navbar container" aria-label="Main navigation">
        <a className="brand" href="#home" onClick={go} aria-label={`${salon.name} home`}>
          <span className="brand-mark"><Scissors size={22} aria-hidden="true" /></span>
          <span className="brand-text"><strong>{salon.name}</strong><small>{salon.tagline}</small></span>
        </a>

        <ul className={`nav-links ${open ? 'open' : ''}`}>
          {links.map((l) => (
            <li key={l.id}>
              <a href={`#${l.id}`} className={active === l.id ? 'active' : ''} onClick={go} aria-current={active === l.id ? 'true' : undefined}>{l.label}</a>
            </li>
          ))}
          <li className="nav-book-mobile"><a className="btn btn-primary" href="#booking" onClick={go}><CalendarCheck size={20} aria-hidden="true" /> Book Appointment</a></li>
        </ul>

        <div className="nav-actions">
          <button className="icon-btn cart-btn" onClick={openCart} aria-label={`Open cart, ${count} items`}>
            <ShoppingBag size={24} aria-hidden="true" />
            {count > 0 && <span className="badge">{count}</span>}
          </button>
          <a className="btn btn-primary nav-book" href="#booking"><CalendarCheck size={19} aria-hidden="true" /> Book Appointment</a>
          <button className="icon-btn menu-btn" onClick={() => setOpen(!open)} aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open}>
            {open ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </nav>
      <div className="scroll-progress" style={{ transform: `scaleX(${progress})` }} aria-hidden="true" />
    </header>
  )
}
