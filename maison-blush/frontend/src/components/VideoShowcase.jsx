import { useEffect, useRef, useState } from 'react'
import { Play, Pause, Droplets, Sparkles, Heart, ArrowRight } from 'lucide-react'
import SmartImage from './SmartImage.jsx'
import Reveal from './Reveal.jsx'

// Video file: frontend/public/videos/hair-treatment.mp4  (README us folder mein hai)
const VIDEO_MP4 = '/videos/hair-treatment.mp4'
const VIDEO_WEBM = '/videos/hair-treatment.webm'
const POSTER = 'photo-1783512785019-8bcb76a68d5a'

const perks = [
  { icon: Droplets, title: 'Deep Repair', text: 'Restores moisture and strength' },
  { icon: Sparkles, title: 'Mirror Shine', text: 'Smooth, glossy, frizz-free finish' },
  { icon: Heart, title: 'Scalp Care', text: 'Healthy roots, less hair fall' },
]

export default function VideoShowcase() {
  const videoRef = useRef(null)
  const [ready, setReady] = useState(false)
  const [playing, setPlaying] = useState(true)

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    // Video ya uska source load na ho to poster photo hi dikhti rahe
    const fail = () => setReady(false)
    v.addEventListener('error', fail, true)
    return () => v.removeEventListener('error', fail, true)
  }, [])

  const toggle = () => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) { v.play().catch(() => {}); setPlaying(true) } else { v.pause(); setPlaying(false) }
  }

  return (
    <section className="video-section" id="treatments">
      <SmartImage className="video-poster" src={POSTER} alt="" width={1800} />
      <video
        ref={videoRef}
        className={`video-bg ${ready ? 'ready' : ''}`}
        autoPlay muted loop playsInline preload="metadata"
        onLoadedData={() => setReady(true)}
        aria-hidden="true"
      >
        <source src={VIDEO_WEBM} type="video/webm" />
        <source src={VIDEO_MP4} type="video/mp4" />
      </video>
      <div className="video-overlay" />

      <div className="container video-content">
        <Reveal className="video-copy">
          <span className="eyebrow light">Signature Hair Treatments</span>
          <h2>Hair that feels as good <em>as it looks</em></h2>
          <p>Watch the transformation. Our keratin, hair spa and scalp therapies are done by trained experts using premium products — so you leave with soft, healthy, shining hair.</p>
          <div className="video-actions">
            <a className="btn btn-primary btn-lg" href="#booking">Book a Treatment <ArrowRight size={22} aria-hidden="true" /></a>
            <a className="btn btn-light btn-lg" href="#services">View Treatments</a>
          </div>
        </Reveal>

        <div className="video-perks">
          {perks.map(({ icon: Icon, title, text }, i) => (
            <Reveal key={title} delay={i * 110} className="perk">
              <span><Icon size={26} aria-hidden="true" /></span>
              <div><h3>{title}</h3><p>{text}</p></div>
            </Reveal>
          ))}
        </div>
      </div>

      <button className="video-toggle" onClick={toggle} aria-label={playing ? 'Pause background video' : 'Play background video'}>
        {playing ? <Pause size={20} /> : <Play size={20} />}
      </button>
    </section>
  )
}
