import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { adm } from '../api.js'
import { PageHeader, Card, Loading, ErrorBox, DataTable, useFetch, useToast, money, fmtDateTime } from '../ui.jsx'
import { RevenueChart, BarList } from '../charts.jsx'
import { methodLabel } from './shared.jsx'

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const startDefault = () => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 5); return iso(d) }

export default function Reports() {
  const toast = useToast()
  const [from, setFrom] = useState(startDefault), [to, setTo] = useState(iso(new Date()))
  const [exporting, setExporting] = useState(false)
  const bad = from && to && from > to
  const { loading, error, data, reload } = useFetch('/reports/revenue', bad ? {} : { from, to })

  const exportCsv = async () => {
    setExporting(true)
    try { await adm.download(`/reports/revenue.csv?from=${from}&to=${to}`, `maison-blush-revenue-${from}-to-${to}.csv`); toast('Report downloaded.') } catch (e) { toast(e.message, 'bad') } finally { setExporting(false) }
  }
  const cols = [
    { key: 'paidAt', label: 'Paid on', render: (r) => fmtDateTime(r.paidAt) },
    { key: 'type', label: 'Type' },
    { key: 'code', label: 'Reference', render: (r) => <strong>{r.code}</strong> },
    { key: 'customer', label: 'Customer' },
    { key: 'method', label: 'Method', render: (r) => methodLabel(r.method) },
    { key: 'amount', label: 'Amount', className: 'num', render: (r) => money(r.amount) },
  ]
  return (
    <>
      <PageHeader title="Revenue & Reports" subtitle="Only payments you marked as paid are counted. Demo, cash-not-yet-received, pending and cancelled items are excluded.">
        <button className="adm-btn" onClick={exportCsv} disabled={exporting || !data?.count}>{exporting ? <Loader2 className="spin" size={17} /> : <Download size={17} />} Export CSV</button>
      </PageHeader>
      <Card>
        <div className="adm-toolbar">
          <label className="adm-field inline"><span>From</span><input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} /></label>
          <label className="adm-field inline"><span>To</span><input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} /></label>
          {bad && <span className="err">“From” must be before “To”.</span>}
        </div>
      </Card>
      {error ? <ErrorBox message={error} onRetry={reload} /> : !data ? <Loading /> : (
        <div className={loading ? 'adm-dim' : ''}>
          <div className="adm-stats three">
            <div className="adm-stat accent"><div><small>Total revenue</small><strong>{money(data.total)}</strong><em>{data.count} verified payment{data.count === 1 ? '' : 's'}</em></div></div>
            <div className="adm-stat"><div><small>Appointments</small><strong>{money(data.bookingsTotal)}</strong></div></div>
            <div className="adm-stat"><div><small>Shop orders</small><strong>{money(data.ordersTotal)}</strong></div></div>
          </div>
          <div className="adm-grid-2">
            <Card title="Revenue by month"><RevenueChart data={data.monthly} /></Card>
            <Card title="By payment method"><BarList items={data.byMethod.map((m) => ({ name: methodLabel(m.method), amount: m.amount }))} valueKey="amount" unit="" empty="No verified payments in this period." /></Card>
          </div>
          <Card title="Verified payments"><DataTable columns={cols} rows={data.transactions.map((t, i) => ({ ...t, key: t.code + i }))} empty="No verified payments in this period. Mark payments as paid from the Bookings or Orders page." /></Card>
        </div>
      )}
    </>
  )
}
