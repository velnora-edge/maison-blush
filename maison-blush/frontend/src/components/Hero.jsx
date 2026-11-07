import { ArrowRight, CalendarCheck, Star, Users, Award } from 'lucide-react'
import { salon } from '@shared/salon.js'
import SmartImage from './SmartImage.jsx'
import { CountUp } from './Reveal.jsx'

export default function Hero() {
  return (
    <section className="hero" id="home">
      <SmartImage className="hero-img" src="/images/hero.jpg" alt="Woman with long, shiny, wavy brown hair" width={2000} eager />
      <div className="hero-overlay" />
      <div className="container hero-content">
        <span className="hero-badge"><Star size={16} fill="currentColor" aria-hidden="true" /> Rated {salon.stats.rating}/5 by our clients</span>
        <h1>Beautiful Hair <span className="script">starts here</span></h1>
        <p className="hero-sub">Expert haircuts, colour and hair treatments by certified stylists — in a calm, hygienic space. Book your appointment online in under a minute.</p>
        <div className="hero-cta">
          <a className="btn btn-primary btn-lg" href="#booking"><CalendarCheck size={22} aria-hidden="true" /> Book Appointment</a>
          <a className="btn btn-light btn-lg" href="#services">Explore Services <ArrowRight size={22} aria-hidden="true" /></a>
        </div>
        <dl className="hero-stats">
          <div><dt><Users size={20} aria-hidden="true" /> Happy clients</dt><dd><CountUp to={salon.stats.clients} suffix="+" /></dd></div>
          <div><dt><Award size={20} aria-hidden="true" /> Years of experience</dt><dd><CountUp to={salon.stats.years} suffix="+" /></dd></div>
          <div><dt><Star size={20} aria-hidden="true" /> Average rating</dt><dd><CountUp to={salon.stats.rating} decimals={1} /></dd></div>
        </dl>
      </div>
    </section>
  )
}
