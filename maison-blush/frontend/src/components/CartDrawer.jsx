import { useEffect } from 'react'
import { X, Plus, Minus, Trash2, ShoppingBag, ArrowRight } from 'lucide-react'
import { salon } from '@shared/salon.js'
import { money } from '../utils/format.js'
import { useApp } from '../context/AppContext.jsx'
import SmartImage from './SmartImage.jsx'

export default function CartDrawer() {
  const { cartOpen, closeCart, cart, setQty, removeItem, subtotal, shipping, total, openCheckout } = useApp()

  useEffect(() => {
    if (!cartOpen) return
    const onKey = (e) => e.key === 'Escape' && closeCart()
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', onKey) }
  }, [cartOpen, closeCart])

  return (
    <div className={`drawer-wrap ${cartOpen ? 'open' : ''}`} aria-hidden={!cartOpen}>
      <div className="backdrop" onClick={closeCart} />
      <aside className="drawer" role="dialog" aria-modal="true" aria-label="Shopping cart">
        <header className="drawer-head">
          <h2><ShoppingBag size={26} aria-hidden="true" /> Your Cart</h2>
          <button className="icon-btn" onClick={closeCart} aria-label="Close cart"><X size={26} /></button>
        </header>

        {cart.length === 0 ? (
          <div className="drawer-empty">
            <ShoppingBag size={56} aria-hidden="true" />
            <p>Your cart is empty.</p>
            <a className="btn btn-primary" href="#shop" onClick={closeCart}>Browse Products</a>
          </div>
        ) : (
          <>
            <ul className="cart-list">
              {cart.map(({ id, qty, product }) => (
                <li key={id} className="cart-item">
                  <SmartImage src={product.image} alt={product.name} width={200} />
                  <div className="cart-info">
                    <strong>{product.name}</strong>
                    <span>{money(product.price)}</span>
                    <div className="qty" role="group" aria-label={`Quantity of ${product.name}`}>
                      <button onClick={() => setQty(id, qty - 1)} aria-label="Decrease quantity"><Minus size={18} /></button>
                      <output aria-live="polite">{qty}</output>
                      <button onClick={() => setQty(id, qty + 1)} aria-label="Increase quantity" disabled={qty >= 10}><Plus size={18} /></button>
                    </div>
                  </div>
                  <div className="cart-side">
                    <strong>{money(product.price * qty)}</strong>
                    <button className="remove" onClick={() => removeItem(id)} aria-label={`Remove ${product.name}`}><Trash2 size={19} /></button>
                  </div>
                </li>
              ))}
            </ul>
            <footer className="drawer-foot">
              <div className="sum-row"><span>Subtotal</span><span>{money(subtotal)}</span></div>
              <div className="sum-row"><span>Delivery</span><span>{shipping === 0 ? 'Free' : money(shipping)}</span></div>
              {shipping > 0 && <p className="hint">Add {money(salon.shipping.freeOver - subtotal)} more for free delivery.</p>}
              <div className="sum-row total"><span>Total</span><span>{money(total)}</span></div>
              <button className="btn btn-primary btn-lg btn-block" onClick={openCheckout}>Proceed to Checkout <ArrowRight size={22} aria-hidden="true" /></button>
              <button className="btn btn-outline btn-block" onClick={closeCart}>Continue Shopping</button>
            </footer>
          </>
        )}
      </aside>
    </div>
  )
}
