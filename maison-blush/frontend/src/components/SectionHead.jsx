import Reveal from './Reveal.jsx'

export default function SectionHead({ eyebrow, title, accent, text, center = true, light = false }) {
  return (
    <Reveal className={`section-head ${center ? 'center' : ''} ${light ? 'light' : ''}`}>
      <span className="eyebrow">{eyebrow}</span>
      <h2>{title} {accent && <em>{accent}</em>}</h2>
      {text && <p>{text}</p>}
    </Reveal>
  )
}
