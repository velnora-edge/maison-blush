import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { salon } from '@shared/salon.js'
import { products as staticProducts, services as staticServices, shippingFor } from '@shared/catalog.js'
import { api } from '../api/client.js'
import { scrollToId } from '../utils/format.js'

const AppContext = createContext(null)
export const useApp = () => useContext(AppContext)

const CART_KEY = 'mb_cart_v1'
const loadCart = () => {
  try {
    const raw = JSON.parse(localStorage.getItem(CART_KEY) || '[]')
    return Array.isArray(raw) ? raw.filter((i) => i && typeof i.id === 'string' && i.qty > 0) : []
  } catch { return [] }
}

export function AppProvider({ children }) {
  // Catalog: admin dashboard se badalta hai. Pehle static data (foran dikhe), phir database wala aa kar replace kar deta hai.
  const [services, setServices] = useState(staticServices)
  const [products, setProducts] = useState(() => staticProducts.map((p) => ({ ...p, stock: 99, featured: false })))
  const [catalogLoaded, setCatalogLoaded] = useState(false)
  const [cart, setCart] = useState(loadCart)
  const [cartOpen, setCartOpen] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [toast, setToast] = useState(null)
  const [bookingService, setBookingService] = useState(null) // {id, n} — Services se Booking mein bhejne ke liye
  const toastTimer = useRef()

  useEffect(() => {
    let alive = true
    Promise.all([api.services(), api.products()])
      .then(([s, p]) => { if (alive) { setServices(s.items); setProducts(p.items); setCatalogLoaded(true) } })
      .catch(() => { /* API band ho to static data chalta rehta hai */ })
    return () => { alive = false }
  }, [])

  useEffect(() => { try { localStorage.setItem(CART_KEY, JSON.stringify(cart)) } catch { /* private mode */ } }, [cart])

  const showToast = useCallback((message) => {
    setToast({ message, id: Date.now() })
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2000)
  }, [])

  const addToCart = useCallback((id) => {
    const p = products.find((x) => x.id === id)
    if (!p) return
    const have = cart.find((i) => i.id === id)?.qty || 0
    if (p.stock <= 0) { showToast(`${p.name} is out of stock`); return }
    if (have >= Math.min(10, p.stock)) { showToast(`Only ${Math.min(10, p.stock)} available for ${p.name}`); return }
    setCart((c) => (c.some((i) => i.id === id) ? c.map((i) => (i.id === id ? { ...i, qty: i.qty + 1 } : i)) : [...c, { id, qty: 1 }]))
    showToast(`${p.name} added to cart`)
  }, [products, cart, showToast])

  const setQty = useCallback((id, qty) => {
    const max = Math.min(10, products.find((x) => x.id === id)?.stock ?? 10)
    setCart((c) => (qty <= 0 ? c.filter((i) => i.id !== id) : c.map((i) => (i.id === id ? { ...i, qty: Math.min(max, qty) } : i))))
  }, [products])
  const removeItem = useCallback((id) => setCart((c) => c.filter((i) => i.id !== id)), [])
  const clearCart = useCallback(() => setCart([]), [])

  const lines = useMemo(() => cart.map((i) => ({ ...i, product: products.find((p) => p.id === i.id) })).filter((l) => l.product), [cart])
  const count = lines.reduce((t, l) => t + l.qty, 0)
  const subtotal = lines.reduce((t, l) => t + l.qty * l.product.price, 0)
  const shipping = shippingFor(subtotal, salon.shipping)

  const chooseService = useCallback((id) => {
    setBookingService({ id, n: Date.now() })
    scrollToId('#booking')
  }, [])

  const value = {
    services, products, catalogLoaded,
    cart: lines, count, subtotal, shipping, total: subtotal + shipping,
    addToCart, setQty, removeItem, clearCart,
    cartOpen, openCart: () => setCartOpen(true), closeCart: () => setCartOpen(false),
    checkoutOpen,
    openCheckout: () => { setCartOpen(false); setCheckoutOpen(true) },
    closeCheckout: () => setCheckoutOpen(false),
    toast, showToast, bookingService, chooseService,
  }
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
