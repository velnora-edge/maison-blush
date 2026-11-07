/**
 * Services aur Products yahan hain. Price / naam / image badalne ke liye sirf is file ko edit karein.
 * image: Unsplash ID ho sakti hai ya apni file, e.g. '/images/haircut.jpg' (frontend/public/images mein rakhein).
 */
export function imageUrl(src, width = 900) {
  if (!src) return ''
  if (src.startsWith('/') || src.startsWith('http')) return src
  return `https://images.unsplash.com/${src}?auto=format&fit=crop&w=${width}&q=80`
}

export const serviceCategories = ['All', 'Hair', 'Colour', 'Treatments', 'Bridal']

export const services = [
  { id: 'signature-cut', name: 'Signature Haircut & Styling', category: 'Hair', duration: '60 min', price: 1500,
    desc: 'Consultation, wash, precision cut and finish tailored to your face shape.',
    keywords: ['cut', 'haircut', 'trim', 'bal katwana', 'styling'], image: 'photo-1562322140-8baeececf3df' },
  { id: 'blow-dry', name: 'Blow-dry & Styling', category: 'Hair', duration: '45 min', price: 1200,
    desc: 'Smooth, bouncy, salon-fresh finish for work, parties or everyday.',
    keywords: ['blow', 'blowdry', 'blow-dry', 'blowout', 'curls'], image: 'photo-1707303563259-272e5ab56766' },
  { id: 'hair-colour', name: 'Global Hair Colour', category: 'Colour', duration: '2–3 hrs', price: 6500,
    desc: 'Rich, even, long-lasting colour with ammonia-free options available.',
    keywords: ['colour', 'color', 'dye', 'rang'], image: 'photo-1665708378504-29300bf77b43' },
  { id: 'balayage', name: 'Highlights & Balayage', category: 'Colour', duration: '3–4 hrs', price: 12000,
    desc: 'Hand-painted dimension that grows out softly and looks natural.',
    keywords: ['highlight', 'highlights', 'balayage', 'ombre'], image: 'photo-1595476108010-b4d1f102b1b1' },
  { id: 'keratin', name: 'Keratin Smoothing Treatment', category: 'Treatments', duration: '2–3 hrs', price: 12000,
    desc: 'Frizz-free, glossy, manageable hair for up to 3–4 months.',
    keywords: ['keratin', 'smoothing', 'rebonding', 'straightening', 'frizz'], image: 'photo-1725000421356-d69d04370385' },
  { id: 'hair-spa', name: 'Deep Repair Hair Spa', category: 'Treatments', duration: '60 min', price: 3500,
    desc: 'Intensive moisture and repair ritual with head massage for damaged, dry hair.',
    keywords: ['spa', 'repair', 'dry', 'damage', 'damaged', 'moisture', 'split ends'], image: 'photo-1522337360788-8b13dee7a37e' },
  { id: 'scalp-care', name: 'Scalp & Hair-fall Treatment', category: 'Treatments', duration: '60 min', price: 4000,
    desc: 'Scalp analysis and targeted therapy for hair fall, dandruff and thinning.',
    keywords: ['scalp', 'hairfall', 'hair fall', 'dandruff', 'thinning', 'bal jhar'], image: 'photo-1580618672591-eb180b1a973f' },
  { id: 'extensions', name: 'Hair Extensions', category: 'Hair', duration: '2–4 hrs', price: 15000,
    desc: 'Length and volume, blended seamlessly with your natural hair.',
    keywords: ['extension', 'extensions', 'volume', 'length'], image: 'photo-1755463765678-f76f672fd84d' },
  { id: 'bridal', name: 'Bridal Hair & Styling', category: 'Bridal', duration: '2 hrs', price: 25000,
    desc: 'Trial plus wedding-day styling so you look flawless from start to finish.',
    keywords: ['bridal', 'bride', 'wedding', 'dulhan', 'shadi', 'party'], image: 'photo-1560869713-7d0a29430803' },
]

export const products = [
  { id: 'argan-serum', name: 'Argan Oil Hair Serum', category: 'Styling', price: 1850, rating: 4.9,
    desc: 'Silky shine and frizz control.', image: 'photo-1608571423902-eed4a5ad8108' },
  { id: 'keratin-shampoo', name: 'Keratin Repair Shampoo', category: 'Cleanse', price: 2400, rating: 4.8,
    desc: 'Sulphate-free, strengthens damaged hair.', image: 'photo-1608248543803-ba4f8c70ae0b' },
  { id: 'moisture-mask', name: 'Deep Moisture Hair Mask', category: 'Treat', price: 2950, rating: 4.9,
    desc: 'Weekly mask for soft, hydrated hair.', image: 'photo-1601049541289-9b1b7bbbfe19' },
  { id: 'colour-conditioner', name: 'Colour-Protect Conditioner', category: 'Cleanse', price: 2200, rating: 4.7,
    desc: 'Locks in colour, adds softness.', image: 'photo-1556228720-195a672e8a03' },
  { id: 'heat-spray', name: 'Heat Protect Spray', category: 'Styling', price: 1650, rating: 4.8,
    desc: 'Shields hair up to 230°C.', image: 'photo-1571781926291-c477ebfd024b' },
  { id: 'scalp-tonic', name: 'Scalp Care Tonic', category: 'Treat', price: 1950, rating: 4.7,
    desc: 'Reduces hair fall, soothes scalp.', image: 'photo-1526947425960-945c6e72858f' },
]

export const gallery = [
  'photo-1560066984-138dadb4c035', 'photo-1521590832167-7bcbfaa6381f', 'photo-1487412947147-5cebf100ffc2',
  'photo-1595476108010-b4d1f102b1b1', 'photo-1534528741775-53994a69daeb', 'photo-1559599101-f09722fb4948',
  'photo-1524504388940-b1c1722653e1', 'photo-1488426862026-3ee34a7d66df',
]

export const reviews = [
  { name: 'Ayesha K.', text: 'Best keratin treatment I have ever had. My hair is smooth, shiny and so easy to manage. The staff is very professional.', service: 'Keratin Smoothing' },
  { name: 'Sana R.', text: 'Booked online in a minute and was seen on time. The balayage looks exactly like my reference photo. Highly recommended!', service: 'Balayage' },
  { name: 'Hira M.', text: 'Lovely clean salon, friendly team and a very relaxing hair spa. My hair fall has reduced a lot after the scalp treatment.', service: 'Scalp Treatment' },
]

export const shippingFor = (subtotal, shipping) =>
  subtotal === 0 || subtotal >= shipping.freeOver ? 0 : shipping.fee
