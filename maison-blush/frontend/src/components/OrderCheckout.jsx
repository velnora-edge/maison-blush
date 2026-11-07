import { api } from '../api/client.js'
import { money } from '../utils/format.js'
import { useApp } from '../context/AppContext.jsx'
import CheckoutModal from './CheckoutModal.jsx'

/** Cart ko CheckoutModal se jorta hai */
export default function OrderCheckout() {
  const { checkoutOpen, closeCheckout, cart, shipping, total, clearCart } = useApp()
  const lines = [
    ...cart.map((l) => ({ label: `${l.product.name} × ${l.qty}`, value: money(l.product.price * l.qty) })),
    { label: 'Delivery', value: shipping === 0 ? 'Free' : money(shipping) },
  ]
  const send = async (details, payment) => {
    const { order } = await api.createOrder({
      customer: details,
      items: cart.map((l) => ({ id: l.id, qty: l.qty })),
      payment,
    })
    return order
  }
  return (
    <CheckoutModal
      open={checkoutOpen}
      kind="order"
      title="Checkout"
      amount={total}
      lines={lines}
      needDetails
      submit={send}
      onSuccess={clearCart}
      onClose={closeCheckout}
      successTitle="Order placed!"
      successText={(o) => (o ? `Thank you, ${o.customer.name}. Your order ${o.id} (${money(o.total)}) is confirmed and will be delivered soon.` : '')}
    />
  )
}
