import { useState } from 'react'
import { Clock, CalendarCheck } from 'lucide-react'
import { money } from '../utils/format.js'
import { useApp } from '../context/AppContext.jsx'
import SectionHead from './SectionHead.jsx'
import SmartImage from './SmartImage.jsx'
import Reveal from './Reveal.jsx'

export default function Services() {
  const [cat, setCat] = useState('All')
  const { chooseService, services } = useApp()
  const categories = ['All', ...new Set(services.map((s) => s.category))]
  const shown = cat === 'All' || !categories.includes(cat) ? services : services.filter((s) => s.category === cat)

  return (
    <section className="section section-alt" id="services">
      <div className="container">
        <SectionHead eyebrow="Our Services" title="Find the perfect" accent="treatment for you" text="From a quick trim to a complete transformation — every service starts with a personal consultation." />

        <div className="tabs" role="tablist" aria-label="Service categories">
          {categories.map((c) => (
            <button key={c} role="tab" aria-selected={cat === c} className={`tab ${cat === c ? 'active' : ''}`} onClick={() => setCat(c)}>{c}</button>
          ))}
        </div>

        {shown.length === 0 && <p className="section-head center">Our services are being updated. Please check back soon or call us.</p>}
        <div className="cards-grid">
          {shown.map((s, i) => (
            <Reveal key={s.id} delay={(i % 3) * 90} as="article" className="service-card">
              <div className="card-media">
                <SmartImage src={s.image} alt={s.name} width={700} />
                <span className="pill">{s.category}</span>
              </div>
              <div className="card-body">
                <h3>{s.name}</h3>
                <p>{s.desc}</p>
                <div className="card-meta">
                  <span><Clock size={18} aria-hidden="true" /> {s.duration}</span>
                  <strong>From {money(s.price)}</strong>
                </div>
                <button className="btn btn-primary btn-block" onClick={() => chooseService(s.id)}><CalendarCheck size={20} aria-hidden="true" /> Book This Service</button>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
