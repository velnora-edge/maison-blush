import { intents, fallback, servicePriceReply } from './intents.js'
import { askClaude, llmEnabled } from './llm.js'
import { defaultContext } from './knowledge.js'

const URDU_HINTS = /\b(kya|kitna|kitne|kitni|kab|kahan|kaise|kaisay|hai|hain|aap|aapka|apka|apki|chahiye|chahiye|batao|bataein|batayen|qeemat|kimat|waqt|khulta|khulte|salam|assalam|shukriya|shukria|mujhe|mera|meri|karwana|krna|karna|lena|dulhan|shadi|paisay|paise|jhar|rukhay|nambar|rabta|raabta|kidhar)\b/i

const normalize = (t) => t.toLowerCase().replace(/[^\p{L}\p{N}\s'-]/gu, ' ').replace(/\s+/g, ' ').trim()

function score(text, keywords) {
  let s = 0
  for (const k of keywords) {
    const re = new RegExp(`(^|\\s)${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s|$)`)
    if (re.test(text)) s += k.includes(' ') ? 3 : 2
  }
  return s
}

/** Rule-based jawab (hamesha kaam karta hai, internet/API ki zaroorat nahi) */
export function ruleReply(message, ctx = defaultContext()) {
  const text = normalize(message)
  const lang = URDU_HINTS.test(text) ? 'ur' : 'en'

  let best = null
  let bestScore = 0
  for (const intent of intents) {
    const s = score(text, intent.keywords)
    if (s > bestScore) { best = intent; bestScore = s }
  }

  // Specific service ka naam aaye to pehle uska jawab (e.g. "keratin price")
  const wantsPrice = best?.name === 'price' || /price|cost|rate|kitna|kitne|how much/.test(text)
  const specific = servicePriceReply(text, ctx)
  if (specific && (wantsPrice || !best || best.name === 'services')) {
    return { intent: 'service', reply: specific[lang], suggestions: specific.suggestions, action: specific.action }
  }
  if (best) {
    return { intent: best.name, reply: (best[lang] || best.en)(text, ctx), suggestions: best.suggestions || [], action: best.action || null }
  }
  if (specific) return { intent: 'service', reply: specific[lang], suggestions: specific.suggestions, action: specific.action }
  return { intent: 'fallback', reply: fallback[lang](text, ctx), suggestions: fallback.suggestions, action: null }
}

/** Main entry: pehle rules, phir (agar key ho) Claude se natural jawab */
export async function reply(message, history = [], ctx = defaultContext()) {
  const rule = ruleReply(message, ctx)
  if (llmEnabled() && rule.intent !== 'greeting' && rule.intent !== 'bye') {
    const text = await askClaude(message, history, ctx)
    if (text) return { ...rule, reply: text, source: 'ai' }
  }
  return { ...rule, source: 'rules' }
}
