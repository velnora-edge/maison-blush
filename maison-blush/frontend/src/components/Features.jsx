import { Award, Sparkles, ShieldCheck, CalendarCheck } from 'lucide-react'
import Reveal from './Reveal.jsx'

const items = [
  { icon: Award, title: 'Certified Experts', text: 'Trained stylists with years of hands-on experience.' },
  { icon: Sparkles, title: 'Premium Products', text: 'Salon-grade, gentle formulas for healthy hair.' },
  { icon: ShieldCheck, title: 'Clean & Hygienic', text: 'Sanitised tools and a fresh setup for every client.' },
  { icon: CalendarCheck, title: 'Easy Online Booking', text: 'Pick your slot, pay by card or QR, done.' },
]

export default function Features() {
  return (
    <section className="features" aria-label="Why choose us">
      <div className="container features-grid">
        {items.map(({ icon: Icon, title, text }, i) => (
          <Reveal key={title} delay={i * 90} className="feature-card">
            <span className="feature-icon"><Icon size={28} aria-hidden="true" /></span>
            <h3>{title}</h3>
            <p>{text}</p>
          </Reveal>
        ))}
      </div>
    </section>
  )
}
