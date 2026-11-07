import { ShoppingBag, Star, Truck, ShieldCheck } from 'lucide-react'
import { salon } from '@shared/salon.js'
import { money } from '../utils/format.js'
import { useApp } from '../context/AppContext.jsx'
import SectionHead from './SectionHead.jsx'
import SmartImage from './SmartImage.jsx'
import Reveal from './Reveal.jsx'

export default function Shop() {
  const { addToCart, cart, count, openCart, products } = useApp()

  return (
    <section className="section" id="shop">
      <div className="container">
        <SectionHead eyebrow="Salon Shop" title="Take the salon" accent="home with you" text="Hand-picked products our stylists use and recommend. Order online and pay by card, QR or cash on delivery." />

        {products.length === 0 && <p className="section-head center">Our shop is being restocked. Please check back soon.</p>}
        <div className="cards-grid">
          {products.map((p, i) => {
            const inCart = cart.find((l) => l.id === p.id)
            return (
              <Reveal key={p.id} delay={(i % 3) * 90} as="article" className="product-card">
                <div className="card-media square">
                  <SmartImage src={p.image} alt={p.name} width={600} />
                  <span className="pill">{p.featured ? '★ Featured' : p.category}</span>
                </div>
                <div className="card-body">
                  <div className="rating" aria-label={`Rated ${p.rating} out of 5`}><Star size={18} fill="currentColor" aria-hidden="true" /> {p.rating}</div>
                  <h3>{p.name}</h3>
                  <p>{p.desc}</p>
                  <div className="card-meta"><strong className="price">{money(p.price)}</strong>{inCart && <span className="in-cart">{inCart.qty} in cart</span>}</div>
                  {p.stock <= 0
                    ? <button className="btn btn-outline btn-block" disabled>Out of Stock</button>
                    : <button className="btn btn-dark btn-block" onClick={() => addToCart(p.id)}><ShoppingBag size={20} aria-hidden="true" /> Add to Cart</button>}
                </div>
              </Reveal>
            )
          })}
        </div>

        <Reveal className="shop-foot">
          <span><Truck size={22} aria-hidden="true" /> Delivery {money(salon.shipping.fee)} · Free above {money(salon.shipping.freeOver)}</span>
          <span><ShieldCheck size={22} aria-hidden="true" /> 100% genuine products</span>
          {count > 0 && <button className="btn btn-outline" onClick={openCart}><ShoppingBag size={20} aria-hidden="true" /> View Cart ({count})</button>}
        </Reveal>
      </div>
    </section>
  )
}
