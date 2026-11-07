import { useEffect, useState } from 'react'
import { Search, Loader2 } from 'lucide-react'
import { adm } from '../api.js'
import { PageHeader, Card, Toolbar, DataTable, Pagination, Loading, ErrorBox, Modal, ConfirmModal, StatusBadge, PaymentBadge, useFetch, useDebounced, useToast, money, fmtDateTime } from '../ui.jsx'
import { InfoGrid, PaymentBox } from './shared.jsx'

const FLOW = [['processing', 'Mark processing'], ['shipped', 'Mark shipped'], ['delivered', 'Mark delivered']]

function OrderModal({ initial, onClose, onChanged }) {
  const [o, setO] = useState(initial)
  const toast = useToast()
  const [busy, setBusy] = useState('')
  const [confirm, setConfirm] = useState(false)
  const setStatus = async (status) => {
    setBusy(status)
    try { const { item } = await adm.patch(`/orders/${o.id}`, { status }); setO(item); toast(`Order marked as ${status}.`); await onChanged() }
    catch (e) { toast(e.message, 'bad') } finally { setBusy(''); setConfirm(false) }
  }
  const savePayment = async (status) => { const { item } = await adm.patch(`/orders/${o.id}/payment`, { status }); setO(item); await onChanged() }
  const cancelled = o.status === 'cancelled'

  return (
    <Modal title={`Order ${o.code}`} onClose={onClose} wide>
      <div className="adm-two">
        <div>
          <div className="adm-row-between"><h3>Items</h3><StatusBadge status={o.status} /></div>
          <ul className="adm-lines">
            {o.items.map((i) => <li key={i.slug}><span>{i.name} × {i.qty}</span><strong>{money(i.price * i.qty)}</strong></li>)}
            <li><span>Subtotal</span><span>{money(o.subtotal)}</span></li>
            <li><span>Shipping</span><span>{o.shipping ? money(o.shipping) : 'Free'}</span></li>
            <li className="total"><span>Total</span><strong>{money(o.total)}</strong></li>
          </ul>
          <h3>Customer & delivery</h3>
          <InfoGrid rows={[['Name', o.customer.name], ['Phone', <a href={`tel:${o.customer.phone}`}>{o.customer.phone}</a>], ['Email', o.customer.email && <a href={`mailto:${o.customer.email}`}>{o.customer.email}</a>], ['Address', `${o.customer.address}, ${o.customer.city}`], ['Notes', o.customer.notes], ['Placed on', fmtDateTime(o.createdAt)]]} />
        </div>
        <div>
          <PaymentBox doc={o} isOrder onSave={savePayment} />
          <h3>Update order status</h3>
          {cancelled ? <p className="adm-note">This order is cancelled and its stock was returned to the shop.</p> : (
            <div className="adm-actions-col">
              {FLOW.map(([status, label]) => (
                <button key={status} className={`adm-btn ${o.status === status ? 'primary' : ''}`} disabled={!!busy || o.status === status} onClick={() => setStatus(status)}>
                  {busy === status && <Loader2 className="spin" size={16} />} {o.status === status ? `✓ ${label.replace('Mark ', '')}` : label}
                </button>
              ))}
              <button className="adm-btn danger" disabled={!!busy} onClick={() => setConfirm(true)}>Cancel order</button>
            </div>
          )}
        </div>
      </div>
      {confirm && <ConfirmModal danger title="Cancel this order?" message="The products will go back into stock. A cancelled order cannot be reopened, and it will not count in revenue. If you already received money, refund the customer yourself." confirmLabel="Yes, cancel order" onConfirm={() => setStatus('cancelled')} onClose={() => setConfirm(false)} />}
    </Modal>
  )
}

export default function Orders() {
  const [q, setQ] = useState(''), [status, setStatus] = useState(''), [page, setPage] = useState(1)
  const [open, setOpen] = useState(null)
  const dq = useDebounced(q)
  useEffect(() => { setPage(1) }, [dq, status])
  const { loading, error, data, reload } = useFetch('/orders', { q: dq, status, page })

  const cols = [
    { key: 'code', label: 'Order', render: (r) => <strong>{r.code}</strong> },
    { key: 'cust', label: 'Customer', render: (r) => <><div>{r.customer.name}</div><small className="muted">{r.customer.phone}</small></> },
    { key: 'items', label: 'Items', render: (r) => <span className="clamp">{r.items.map((i) => `${i.name} × ${i.qty}`).join(', ')}</span> },
    { key: 'total', label: 'Total', className: 'num', render: (r) => money(r.total) },
    { key: 'pay', label: 'Payment', render: (r) => <PaymentBadge payment={r.payment} /> },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'date', label: 'Placed', render: (r) => fmtDateTime(r.createdAt) },
  ]
  return (
    <>
      <PageHeader title="Orders" subtitle="Products ordered from your online shop." />
      <Card>
        <Toolbar>
          <label className="adm-search"><Search size={19} aria-hidden="true" /><input placeholder="Search name, phone or order ID" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search orders" /></label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
            <option value="">All statuses</option>
            {['pending', 'processing', 'shipped', 'delivered', 'cancelled'].map((s) => <option key={s} value={s}>{s.replace(/^./, (c) => c.toUpperCase())}</option>)}
          </select>
          {(q || status) && <button className="adm-btn" onClick={() => { setQ(''); setStatus('') }}>Clear</button>}
        </Toolbar>
        {error ? <ErrorBox message={error} onRetry={reload} /> : !data ? <Loading /> : (
          <div className={loading ? 'adm-dim' : ''}>
            <DataTable columns={cols} rows={data.items} onRowClick={setOpen} empty={q || status ? 'No orders match your filters.' : 'No orders yet.'} />
            <Pagination page={data.page} pages={data.pages} total={data.total} onPage={setPage} />
          </div>
        )}
      </Card>
      {open && <OrderModal initial={open} onClose={() => setOpen(null)} onChanged={reload} />}
    </>
  )
}
