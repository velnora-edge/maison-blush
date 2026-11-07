import { Check, Phone, ArrowRight } from 'lucide-react'
import { salon } from '@shared/salon.js'
import SmartImage from './SmartImage.jsx'
import Reveal from './Reveal.jsx'

const points = ['Personal consultation before every service', 'Gentle, ammonia-free colour options', 'Treatments designed for hair fall, dryness & frizz', 'Relaxing, private and spotless salon space']

export default function About() {
  return (
    <section className="section" id="about">
      <div className="container about-grid">
        <Reveal className="about-images">
          <SmartImage className="about-main" src="photo-1521590832167-7bcbfaa6381f" alt="Hair stylist giving a client a haircut" width={900} />
          <SmartImage className="about-small" src="photo-1675034743339-0b0747047727" alt="Beautiful healthy hair after treatment" width={600} />
          <div className="about-badge"><strong>{salon.stats.years}+</strong><span>Years of<br />excellence</span></div>
        </Reveal>

        <Reveal delay={120} className="about-copy">
          <span className="eyebrow">About {salon.name}</span>
          <h2>Where care meets <em>craft</em></h2>
          <p>At {salon.name} we believe great hair is the result of the right advice, the right products and a skilled pair of hands. Whether you are here for a fresh cut, a colour change or a deep treatment, we take the time to understand your hair and your lifestyle.</p>
          <ul className="check-list">
            {points.map((p) => <li key={p}><span><Check size={18} aria-hidden="true" /></span>{p}</li>)}
          </ul>
          <div className="about-actions">
            <a className="btn btn-primary" href="#booking">Book a Visit <ArrowRight size={20} aria-hidden="true" /></a>
            <a className="btn btn-outline" href={`tel:${salon.phone.replace(/\s/g, '')}`}><Phone size={19} aria-hidden="true" /> {salon.phone}</a>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
