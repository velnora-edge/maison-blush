import { Star, Quote } from 'lucide-react'
import { reviews } from '@shared/catalog.js'
import { salon } from '@shared/salon.js'
import SectionHead from './SectionHead.jsx'
import Reveal from './Reveal.jsx'

export default function Reviews() {
  return (
    <section className="section reviews" id="reviews">
      <div className="container">
        <SectionHead light eyebrow="Client Love" title="Loved by" accent={`${salon.stats.clients.toLocaleString('en-US')}+ clients`} text={`Rated ${salon.stats.rating} out of 5 across our happy clients.`} />
        <div className="reviews-grid">
          {reviews.map((r, i) => (
            <Reveal key={r.name} delay={i * 110} as="figure" className="review-card">
              <Quote size={34} className="quote-icon" aria-hidden="true" />
              <div className="stars" aria-label="5 out of 5 stars">{[...Array(5)].map((_, k) => <Star key={k} size={19} fill="currentColor" aria-hidden="true" />)}</div>
              <blockquote>{r.text}</blockquote>
              <figcaption>
                <span className="avatar" aria-hidden="true">{r.name[0]}</span>
                <span><strong>{r.name}</strong><small>{r.service}</small></span>
              </figcaption>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
