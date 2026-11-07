import { useEffect, useRef, useState } from 'react'
import { MessageCircle, X, Send, Sparkles, ArrowRight } from 'lucide-react'
import { salon } from '@shared/salon.js'
import { api } from '../api/client.js'
import { scrollToId } from '../utils/format.js'

const GREETING = {
  from: 'bot',
  text: `Hello! 👋 I am the ${salon.name} assistant. Ask me about services, prices, booking, timings or payments — English ya Roman Urdu, dono chalega.`,
  suggestions: ['Services & prices', 'Book appointment', 'Opening hours', 'Payment options'],
}

export default function Chatbot() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([GREETING])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const endRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }) }, [messages, typing, open])
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 150) }, [open])
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const send = async (text) => {
    const message = text.trim()
    if (!message || typing) return
    const history = messages.slice(-8)
    setMessages((m) => [...m.map((x) => ({ ...x, suggestions: undefined })), { from: 'user', text: message }])
    setInput('')
    setTyping(true)
    try {
      const [res] = await Promise.all([api.chat(message, history), new Promise((r) => setTimeout(r, 500))])
      setMessages((m) => [...m, { from: 'bot', text: res.reply, suggestions: res.suggestions, action: res.action }])
    } catch {
      setMessages((m) => [...m, {
        from: 'bot',
        text: `Sorry, I am having trouble connecting. Please call or WhatsApp us on ${salon.phone} and we will help right away.`,
        suggestions: [],
      }])
    } finally { setTyping(false) }
  }

  const runAction = (a) => { setOpen(false); setTimeout(() => scrollToId(a.target), 200) }

  return (
    <>
      <button className={`chat-fab ${open ? 'hidden-on-mobile' : ''}`} onClick={() => setOpen(!open)} aria-label={open ? 'Close chat' : 'Open chat assistant'} aria-expanded={open}>
        {open ? <X size={28} /> : <><MessageCircle size={28} aria-hidden="true" /><span>Chat with us</span></>}
      </button>

      {open && (
        <section className="chat-panel" role="dialog" aria-label={`${salon.name} chat assistant`}>
          <header className="chat-head">
            <span className="chat-avatar"><Sparkles size={22} aria-hidden="true" /></span>
            <div><strong>Blush Assistant</strong><small><i className="online" /> Online · replies instantly</small></div>
            <button className="icon-btn" onClick={() => setOpen(false)} aria-label="Close chat"><X size={24} /></button>
          </header>

          <div className="chat-body" aria-live="polite">
            {messages.map((m, i) => (
              <div key={i} className={`msg ${m.from}`}>
                <div className="bubble">{m.text}</div>
                {m.action && <button className="chat-action" onClick={() => runAction(m.action)}>{m.action.label} <ArrowRight size={17} aria-hidden="true" /></button>}
                {m.suggestions?.length > 0 && (
                  <div className="chips-row">{m.suggestions.map((s) => <button key={s} onClick={() => send(s)}>{s}</button>)}</div>
                )}
              </div>
            ))}
            {typing && <div className="msg bot"><div className="bubble typing" aria-label="Assistant is typing"><i /><i /><i /></div></div>}
            <div ref={endRef} />
          </div>

          <form className="chat-input" onSubmit={(e) => { e.preventDefault(); send(input) }}>
            <label htmlFor="chat-text" className="sr-only">Type your message</label>
            <input id="chat-text" ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type your question…" maxLength={300} autoComplete="off" />
            <button type="submit" aria-label="Send message" disabled={!input.trim() || typing}><Send size={22} /></button>
          </form>
        </section>
      )}
    </>
  )
}
