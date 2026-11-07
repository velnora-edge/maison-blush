# Maison Blush — Salon Website (v2: MongoDB + Admin Dashboard)

React (frontend) + Express (backend) + MongoDB Atlas + Chatbot. Customer website, booking, shop, payments, and a secure admin panel.

```
maison-blush/
├── frontend/   React + Vite: customer website (src/components) + admin panel (src/admin)
├── backend/    Express API: src/db (MongoDB), src/routes, src/services, scripts/, tests/
├── chatbot/    Chatbot ka dimaag (English + Roman Urdu) — live services/products DB se leta hai
├── shared/     salon.js (naam, phone, timing, payment rules) + catalog.js (pehle ka catalog = DB ka starting data)
└── package.json
```

## 1) Install

Node.js 18+ chahiye.

```bash
npm run install:all
```

## 2) MongoDB Atlas setup (free)

1. [mongodb.com/atlas](https://www.mongodb.com/atlas) par account banayen → **Create a cluster** → **M0 (Free)**.
2. **Database Access** → *Add New Database User* → username + password (password mein `@ : / ?` jaise special characters na rakhen, ya URL-encode karein).
3. **Network Access** → *Add IP Address*:
   - Apne PC par test ke liye: **Add Current IP Address**.
   - Hosting (Render/Railway…) ke liye: `0.0.0.0/0` (sirf tab, jab password strong ho).
4. **Database → Connect → Drivers** → connection string copy karein. Aisi dikhegi:
   `mongodb+srv://USER:PASSWORD@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority`
5. Database ka naam string mein `.net/` ke baad likhein: `...mongodb.net/maison-blush?retryWrites=true&w=majority`

## 3) `.env` banayein

`backend/.env.example` ko copy karke **`backend/.env`** naam se save karein, aur kam az kam ye bharen:

```
MONGODB_URI=mongodb+srv://USER:PASSWORD@cluster0.abcde.mongodb.net/maison-blush?retryWrites=true&w=majority
```

`.env` kabhi GitHub par na daalen (`.gitignore` mein already hai). Secrets sirf backend mein rehte hain, frontend mein kuch nahi jata.

## 4) Pehla admin account banayein (zaroori)

Koi default admin / default password **nahi** hai, aur public sign-up bhi nahi. Terminal mein:

```bash
npm run create-admin
```

Email aur password poochega (password screen par nahi dikhta; kam az kam 10 characters, letters + numbers). Password bhool jayen to:

```bash
npm run create-admin -- --reset-password
```

Server par jahan terminal na ho: `ADMIN_EMAIL=you@x.com ADMIN_PASSWORD=... npm run create-admin`

## 5) Chalayen

```bash
npm run dev
```

| | Address |
|---|---|
| Customer website | http://localhost:5173 |
| **Admin login** | http://localhost:5173/admin/login |
| Admin dashboard | http://localhost:5173/admin/dashboard |
| API | http://localhost:4000/api/health |

Pehli dafa server chalne par services/products khud DB mein aa jate hain (`shared/catalog.js` se). Uske baad sab kuch admin panel se manage hota hai.

Client ko dikhane / hosting ke liye ek hi server: `npm start` → http://localhost:4000 (website + admin + API).

## 6) Purana JSON data MongoDB mein le jana

Agar `backend/data/*.json` mein pehle ke bookings/orders hain:

```bash
npm run migrate-json
```

Report dikhayega (found / inserted / failed) aur verify karega. Dobara chalana safe hai (duplicate nahi banta). **JSON files delete nahi hoti** — jab aap report se mutmaeen hon tab khud hata dein.

## 7) Admin panel kya karta hai

Overview (asli numbers + charts) · Bookings (search, filter, confirm/cancel/complete, payment verify) · Orders (status + payment verify) · Customers · Messages · Services (add/edit/hide/delete, image upload) · Products (+ stock, featured) · Newsletter (CSV export) · Revenue & Reports (date range + CSV) · Settings (profile, password, system status).

**Revenue ka rule:** sirf wo payment gini jati hai jise admin ne *"Mark as paid (verified)"* kiya (ya gateway webhook ne verify kiya). Demo card, cash-abhi-nahi-mila, QR-verify-hona-baqi, failed, refunded aur cancelled kuch bhi revenue nahi.

**Customer ki bookings pehle "Pending" hoti hain** (slot foran reserve ho jata hai); admin *Confirm* karta hai. Website par message: "Booking received".

## 8) Payments

| Method | Kya hota hai |
|---|---|
| Cash (delivery / salon) | Record hota hai; paisa milne par admin "Mark as paid" karta hai |
| QR scan | Customer transaction ID likhta hai → "Awaiting verification" → admin bank/app mein check karke "Mark as paid" |
| Card | **Demo mode** (`shared/salon.js` → `demoMode`): asli paisa nahi katta, revenue mein nahi ginta. Card number server par kabhi nahi aata (sirf last 4) |
| JazzCash / Easypaisa | Architecture tayyar hai (`backend/src/services/providers/`, webhook `POST /api/payments/webhook/:provider`) — payment tabhi paid hoti hai jab signature verify ho, success ho aur amount match kare. **Credentials aur provider ki official docs ke bina band hain.** Easypaisa abhi sirf skeleton hai; JazzCash ka hash formula go-live se pehle apne merchant docs se verify karein. |

## 9) Security (kya laga hai)

bcrypt password hashing · HttpOnly + SameSite=Strict session cookie (token ka sirf hash DB mein, 8 ghante, logout par server se khatam) · CSRF guard (custom header + Origin check) · login rate limit + 5 galat attempts par account 15 min lock · saari admin APIs server par protected · prices/totals/stock/payment status hamesha server par · NoSQL-operator stripping · upload mein magic-bytes check · CSV formula-injection protection · security headers + CSP.

**Admin ko same domain par rakhein** (website + API ek hi server, `npm start`). Cookie `SameSite=Strict` hai, isliye frontend/backend alag domains par ho to admin login kaam nahi karega.

**Uploads:** admin ki upload ki hui images `backend/uploads/` mein save hoti hain. Kuch hosting (jaise Render free plan) restart par files mita dete hain — wahan image link (https://…) paste karein ya persistent disk lagayen.

## 10) Link preview

WhatsApp/Facebook/LinkedIn par link bhejne par chhoti image + title + description dikhti hai (`frontend/index.html` ke Open Graph tags, image: `frontend/public/og-image.jpg`). Absolute URL server khud apne domain se bhar deta hai (`npm start` / hosting par). Preview image badalni ho to usi naam se 1200×630 image rakhein. Facebook ka cache saaf karne ke liye *Sharing Debugger* use karein.

## 11) Tests

```bash
npm test
```

24 automated tests (in-memory database, MongoDB ki zaroorat nahi): booking/double-booking, orders/stock, payments, admin login/lockout/CSRF, CRUD, revenue, webhook, migration.

## Baaqi kaam jo aapke credentials/accounts maangta hai

MongoDB Atlas account · JazzCash/Easypaisa merchant credentials · real card gateway (Stripe/Safepay/PayFast) · client ka asli `payment-qr.png` · hair-treatment video (`frontend/public/videos/hair-treatment.mp4`).
