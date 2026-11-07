import { useEffect, useState } from 'react'
import { Search, Loader2 } from 'lucide-react'
import { adm } from '../api.js'
import { PageHeader, Card, Toolbar, DataTable, Pagination, Loading, ErrorBox, Modal, ConfirmModal, StatusBadge, PaymentBadge, useFetch, useDebounced, useToast, money, fmtDate, fmtDateTime, fmtTime } from '../ui.jsx'
import { InfoGrid, PaymentBox } from './shared.jsx'

const NEXT = {
  pending: [['confirmed', 'Confirm booking', 'primary'], ['cancelled', 'Cancel booking', 'danger']],
  confirmed: [['completed', 'Mark completed', 'primary'], ['cancelled', 'Cancel booking', 'danger']],
  completed: [['confirmed', 'Reopen as confirmed', '']],
  cancelled: [['pending', 'Reopen as pending', '']],
}

function BookingModal({ initial, onClose, onChanged }) {
  const [b, setB] = useState(initial) // apni copy: filter ki wajah se list se hat bhi jaye to modal khula rehta hai
  const toast = useToast()
  const [busy, setBusy] = useState('')
  const [confirm, setConfirm] = useState(null)
  const setStatus = async (status) => {
    setBusy(status)
    try { const { item } = await adm.patch(`/bookings/${b.id}`, { status }); setB(item); toast(`Booking marked as ${status}.`); await onChanged() }
    catch (e) { toast(e.message, 'bad') } finally { setBusy(''); setConfirm(null) }
  }
  const savePayment = async (status, amount) => { const { item } = await adm.patch(`/bookings/${b.id}/payment`, { status, amount }); setB(item); await onChanged() }

  return (
    <Modal title={`Booking ${b.code}`} onClose={onClose} wide>
      <div className="adm-two">
        <div>
          <div className="adm-row-between"><h3>Appointment</h3><StatusBadge status={b.status} /></div>
          <InfoGrid rows={[['Date', fmtDate(b.date)], ['Time', fmtTime(b.time)], ['Chair / seat', `#${b.seat}`], ['Booked on', fmtDateTime(b.createdAt)]]} />
          <h3>Customer</h3>
          <InfoGrid rows={[['Name', b.name], ['Phone', <a href={`tel:${b.phone}`}>{b.phone}</a>], ['Email', b.email && <a href={`mailto:${b.email}`}>{b.email}</a>], ['Notes', b.notes]]} />
          <h3>Services</h3>
          <ul className="adm-lines">
            {b.services.map((s) => <li key={s.slug || s.name}><span>{s.name}</span><strong>{money(s.price)}</strong></li>)}
            <li className="total"><span>Estimated total</span><strong>{money(b.estimatedTotal)}</strong></li>
          </ul>
        </div>
        <div>
          <PaymentBox doc={b} isOrder={false} onSave={savePayment} />
          <h3>Update status</h3>
          <div className="adm-actions-col">
            {NEXT[b.status].map(([status, label, cls]) => (
              <button key={status} className={`adm-btn ${cls}`} disabled={!!busy} onClick={() => (status === 'cancelled' ? setConfirm(status) : setStatus(status))}>
                {busy === status && <Loader2 className="spin" size={16} />} {label}
              </button>
            ))}
          </div>
        </div>
      </div>
      {confirm && <ConfirmModal danger title="Cancel this booking?" message={`${b.name}'s appointment on ${fmtDate(b.date)} at ${fmtTime(b.time)} will be cancelled and the time slot will become available again.`} confirmLabel="Yes, cancel booking" onConfirm={() => setStatus('cancelled')} onClose={() => setConfirm(null)} />}
    </Modal>
  )
}

export default function Bookings() {
  const [q, setQ] = useState(''), [status, setStatus] = useState(''), [date, setDate] = useState(''), [page, setPage] = useState(1)
  const [open, setOpen] = useState(null)
  const dq = useDebounced(q)
  useEffect(() => { setPage(1) }, [dq, status, date])
  const { loading, error, data, reload } = useFetch('/bookings', { q: dq, status, date, page })

  const cols = [
    { key: 'code', label: 'Booking', render: (r) => <strong>{r.code}</strong> },
    { key: 'name', label: 'Customer', render: (r) => <><div>{r.name}</div><small className="muted">{r.phone}</small></> },
    { key: 'services', label: 'Services', render: (r) => <span className="clamp">{r.services.map((s) => s.name).join(', ')}</span> },
    { key: 'when', label: 'Date & time', render: (r) => <><div>{fmtDate(r.date)}</div><small className="muted">{fmtTime(r.time)}</small></> },
    { key: 'total', label: 'Estimate', className: 'num', render: (r) => money(r.estimatedTotal) },
    { key: 'pay', label: 'Payment', render: (r) => <PaymentBadge payment={r.payment} /> },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ]

  return (
    <>
      <PageHeader title="Bookings" subtitle="Appointments booked on your website. Confirm, complete or cancel them here." />
      <Card>
        <Toolbar>
          <label className="adm-search"><Search size={19} aria-hidden="true" /><input placeholder="Search name, phone or booking ID" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search bookings" /></label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
            <option value="">All statuses</option>
            {['pending', 'confirmed', 'completed', 'cancelled'].map((s) => <option key={s} value={s}>{s.replace(/^./, (c) => c.toUpperCase())}</option>)}
          </select>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Filter by appointment date" />
          {(q || status || date) && <button className="adm-btn" onClick={() => { setQ(''); setStatus(''); setDate('') }}>Clear</button>}
        </Toolbar>
        {error ? <ErrorBox message={error} onRetry={reload} /> : !data ? <Loading /> : (
          <div className={loading ? 'adm-dim' : ''}>
            <DataTable columns={cols} rows={data.items} onRowClick={setOpen} empty={q || status || date ? 'No bookings match your filters.' : 'No bookings yet. They will appear here when customers book on your website.'} />
            <Pagination page={data.page} pages={data.pages} total={data.total} onPage={setPage} />
          </div>
        )}
      </Card>
      {open && <BookingModal initial={open} onClose={() => setOpen(null)} onChanged={reload} />}
    </>
  )
}
