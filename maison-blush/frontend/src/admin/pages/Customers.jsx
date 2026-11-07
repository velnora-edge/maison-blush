import { useState } from 'react'
import { Search } from 'lucide-react'
import { PageHeader, Card, Toolbar, DataTable, Loading, ErrorBox, useFetch, useDebounced, money, fmtDate } from '../ui.jsx'

export default function Customers() {
  const [q, setQ] = useState('')
  const dq = useDebounced(q)
  const { loading, error, data, reload } = useFetch('/customers', { q: dq })
  const cols = [
    { key: 'name', label: 'Customer', render: (r) => <strong>{r.name}</strong> },
    { key: 'phone', label: 'Phone', render: (r) => <a href={`tel:${r.phone}`}>{r.phone}</a> },
    { key: 'email', label: 'Email', render: (r) => (r.email ? <a href={`mailto:${r.email}`}>{r.email}</a> : '—') },
    { key: 'bookings', label: 'Bookings', className: 'num' },
    { key: 'orders', label: 'Orders', className: 'num' },
    { key: 'spent', label: 'Total paid', className: 'num', render: (r) => money(r.totalSpent) },
    { key: 'last', label: 'Last activity', render: (r) => fmtDate(r.lastActivity) },
  ].map((c) => c)
  return (
    <>
      <PageHeader title="Customers" subtitle="Everyone who booked or ordered. Customers don't need an account — they are grouped by phone number." />
      <Card>
        <Toolbar><label className="adm-search"><Search size={19} aria-hidden="true" /><input placeholder="Search name, phone or email" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search customers" /></label></Toolbar>
        {error ? <ErrorBox message={error} onRetry={reload} /> : !data ? <Loading /> : (
          <div className={loading ? 'adm-dim' : ''}><DataTable columns={cols} rows={data.items.map((c, i) => ({ ...c, key: c.phone + i }))} empty={q ? 'No customers match your search.' : 'No customers yet.'} /></div>
        )}
      </Card>
    </>
  )
}
