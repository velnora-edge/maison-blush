import { useEffect, useState } from 'react'
import { X, ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react'
import { gallery } from '@shared/catalog.js'
import SectionHead from './SectionHead.jsx'
import SmartImage from './SmartImage.jsx'
import Reveal from './Reveal.jsx'

export default function Gallery() {
  const [index, setIndex] = useState(null)
  const close = () => setIndex(null)
  const step = (d) => setIndex((i) => (i + d + gallery.length) % gallery.length)

  useEffect(() => {
    if (index === null) return
    const onKey = (e) => { if (e.key === 'Escape') close(); if (e.key === 'ArrowRight') step(1); if (e.key === 'ArrowLeft') step(-1) }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', onKey) }
  }, [index])

  return (
    <section className="section section-alt" id="gallery">
      <div className="container">
        <SectionHead eyebrow="Our Work" title="Real results," accent="real confidence" text="A glimpse of the looks created in our studio." />
        <div className="gallery-grid">
          {gallery.map((src, i) => (
            <Reveal key={src} delay={(i % 4) * 70} as="button" className={`gallery-item g${i + 1}`} onClick={() => setIndex(i)} aria-label={`Open photo ${i + 1}`}>
              <SmartImage src={src} alt={`Salon work ${i + 1}`} width={700} />
              <span className="zoom"><ZoomIn size={26} aria-hidden="true" /></span>
            </Reveal>
          ))}
        </div>
      </div>

      {index !== null && (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label="Photo viewer" onClick={close}>
          <button className="lb-btn lb-close" onClick={close} aria-label="Close"><X size={28} /></button>
          <button className="lb-btn lb-prev" onClick={(e) => { e.stopPropagation(); step(-1) }} aria-label="Previous photo"><ChevronLeft size={32} /></button>
          <div onClick={(e) => e.stopPropagation()}><SmartImage src={gallery[index]} alt={`Salon work ${index + 1}`} width={1400} eager /></div>
          <button className="lb-btn lb-next" onClick={(e) => { e.stopPropagation(); step(1) }} aria-label="Next photo"><ChevronRight size={32} /></button>
        </div>
      )}
    </section>
  )
}
