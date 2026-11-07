import { useEffect, useState } from 'react'
import { MessageCircle, ArrowUp, CheckCircle2 } from 'lucide-react'
import { salon } from '@shared/salon.js'
import { useApp } from '../context/AppContext.jsx'

export function WhatsAppButton() {
  return (
    <a className="wa-fab" href={`https://wa.me/${salon.whatsapp}?text=${encodeURIComponent(`Hello ${salon.name}, I would like to know more.`)}`} target="_blank" rel="noreferrer" aria-label="Chat on WhatsApp">
      <MessageCircle size={28} aria-hidden="true" /><span>WhatsApp</span>
    </a>
  )
}

export function BackToTop() {
  const [show, setShow] = useState(false)
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 700)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return (
    <button className={`top-fab ${show ? 'show' : ''}`} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Back to top" tabIndex={show ? 0 : -1}>
      <ArrowUp size={24} />
    </button>
  )
}

export function Toast() {
  const { toast } = useApp()
  return (
    <div className="toast-region" role="status" aria-live="polite">
      {toast && <div className="toast" key={toast.id}><CheckCircle2 size={22} aria-hidden="true" /> {toast.message}</div>}
    </div>
  )
}
