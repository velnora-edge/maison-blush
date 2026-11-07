import { salon } from '../shared/salon.js'
import { knowledgeText } from './knowledge.js'

/**
 * OPTIONAL: Agar backend/.env mein ANTHROPIC_API_KEY ho to chatbot Claude se natural jawab banata hai.
 * Key na ho (ya error aaye) to automatically rule-based chatbot chalta rehta hai — site kabhi nahi ruki.
 */
export const llmEnabled = () => Boolean(process.env.ANTHROPIC_API_KEY)

export async function askClaude(message, history = [], ctx) {
  if (!llmEnabled()) return null
  const system = [
    `You are the friendly virtual assistant of ${salon.name}, a hair salon. Answer ONLY using the salon information below.`,
    'Keep answers short (max 3–4 sentences). Reply in the same language as the customer: English or Roman Urdu.',
    'If you do not know something, politely give the salon phone number. Never invent prices, offers or timings.',
    'To book an appointment, tell the customer to use the booking form on the website.',
    '', knowledgeText(ctx),
  ].join('\n')

  const messages = [
    ...history.slice(-6).map((m) => ({ role: m.from === 'user' ? 'user' : 'assistant', content: String(m.text).slice(0, 800) })),
    { role: 'user', content: message },
  ]
  // API ko pehla message "user" chahiye aur roles alternate hon
  while (messages.length && messages[0].role !== 'user') messages.shift()
  const cleaned = messages.filter((m, i) => i === 0 || m.role !== messages[i - 1].role)

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 12000)
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: ctrl.signal,
      headers: {
        'content-type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: process.env.CHAT_MODEL || 'claude-haiku-5-5',
        max_tokens: 400,
        system,
        messages: cleaned,
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    const text = data.content?.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim()
    return text || null
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}
