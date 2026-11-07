# Chatbot

Ye folder website ke chatbot ka dimaag hai. Backend (`backend/src/routes/chat.js`) isse use karta hai.

| File | Kaam |
|---|---|
| `index.js` | Main entry: pehle rules se jawab, key ho to Claude se natural jawab |
| `intents.js` | Sawal → jawab (English + Roman Urdu). Naya sawal sikhana ho to yahan object add karein |
| `knowledge.js` | Salon ki info (shared/ folder se khud aati hai) |
| `llm.js` | OPTIONAL Claude API (backend/.env mein `ANTHROPIC_API_KEY` ho to chalta hai) |

Services, prices, timing, phone `shared/` folder mein badlein — chatbot khud update ho jata hai.
