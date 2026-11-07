import { useState } from 'react'
import { CalendarCheck, Clock, CheckCircle2, ShoppingBag, PackageOpen, MessageSquare, Wallet, Mail, Activity } from 'lucide-react'
import { PageHeader, Card, Loading, ErrorBox, StatusBadge, PaymentBadge, DataTable, useFetch, money, fmtDate, fmtTime, timeAgo } from '../ui.jsx'
import { RevenueChart, BarList, StatusBar } from '../charts.jsx'
import { useAdmin } from '../context.js'

const Stat = ({ icon: Icon, label, value, note, tone = '' }) => (
  <div className={`adm-stat ${tone}`}>
    <span className="adm-stat-icon"><Icon size={24} aria-hidden="true" /></span>
    <div><small>{label}</small><strong>{value}</strong>{note && <em>{note}</em>}</div>
  </div>
)
const ACTIVITY_ICON = { booking: CalendarCheck, order: ShoppingBag, message: MessageSquare, subscriber: Mail }

export default function Overview() {
  const { go } = useAdmin()
  const [months, setMonths] = useState(6)
  const { error, data, reload } = useFetch('/stats', { months })
  if (error) return <ErrorBox message={error} onRetry={reload} />
  if (!data) return <Loading label="Loading your dashboard…" />
  const c = data.cards
  const link = (to) => (e) => { e.preventDefault(); go(`/admin/dashboard/${to}`) }

  return (
    <>
      <PageHeader title="Overview" subtitle="Live numbers from your database. Revenue counts only payments you have verified as paid." />

      <div className="adm-stats">
        <Stat icon={CalendarCheck} label="Total bookings" value={c.totalBookings} />
        <Stat icon={Clock} label="Pending bookings" value={c.pendingBookings} note={c.pendingBookings ? 'Need your confirmation' : 'All caught up'} tone={c.pendingBookings ? 'warn' : ''} />
        <Stat icon={CheckCircle2} label="Confirmed bookings" value={c.confirmedBookings} />
        <Stat icon={ShoppingBag} label="Total orders" value={c.totalOrders} />
        <Stat icon={PackageOpen} label="Pending orders" value={c.pendingOrders} tone={c.pendingOrders ? 'warn' : ''} />
        <Stat icon={MessageSquare} label="Customer messages" value={c.messages} note={c.unreadMessages ? `${c.unreadMessages} unread` : 'None unread'} tone={c.unreadMessages ? 'warn' : ''} />
        <Stat icon={Wallet} label="Total revenue" value={money(c.totalRevenue)} note={`${money(c.bookingRevenue)} appointments · ${money(c.orderRevenue)} shop`} tone="accent" />
      </div>

      <div className="adm-grid-2">
        <Card title="Monthly revenue" action={<select value={months} onChange={(e) => setMonths(Number(e.target.value))} aria-label="Chart period"><option value={6}>Last 6 months</option><option value={12}>Last 12 months</option></select>}>
          <RevenueChart data={data.monthlyRevenue} />
        </Card>
        <Card title="Booking statistics"><StatusBar items={data.bookingStatus} /></Card>
      </div>

      <div className="adm-grid-2">
        <Card title="Popular services"><BarList items={data.popularServices} valueKey="bookings" unit="bookings" empty="Popular services appear after the first bookings." /></Card>
        <Card title="Best-selling products"><BarList items={data.bestSellers} valueKey="units" unit="sold" empty="Best sellers appear after the first orders." /></Card>
      </div>

      <div className="adm-grid-2">
        <Card title="Recent bookings" action={<a href="/admin/dashboard/bookings" onClick={link('bookings')}>View all</a>}>
          <DataTable empty="No bookings yet." rows={data.recentBookings} columns={[
            { key: 'n', label: 'Customer', render: (r) => <><strong>{r.name}</strong><br /><small className="muted">{r.services.map((s) => s.name).join(', ')}</small></> },
            { key: 'w', label: 'When', render: (r) => <>{fmtDate(r.date)}<br /><small className="muted">{fmtTime(r.time)}</small></> },
            { key: 's', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
          ]} />
        </Card>
        <Card title="Recent orders" action={<a href="/admin/dashboard/orders" onClick={link('orders')}>View all</a>}>
          <DataTable empty="No orders yet." rows={data.recentOrders} columns={[
            { key: 'n', label: 'Customer', render: (r) => <><strong>{r.customer.name}</strong><br /><small className="muted">{r.code}</small></> },
            { key: 't', label: 'Total', className: 'num', render: (r) => money(r.total) },
            { key: 'p', label: 'Payment', render: (r) => <PaymentBadge payment={r.payment} /> },
            { key: 's', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
          ]} />
        </Card>
      </div>

      <Card title="Recent activity">
        {data.recentActivity.length === 0 ? <p className="adm-chart-empty">Activity will show here as customers use your website.</p> : (
          <ul className="adm-activity">
            {data.recentActivity.map((a, i) => { const Icon = ACTIVITY_ICON[a.type] || Activity; return <li key={i}><span><Icon size={18} aria-hidden="true" /></span><div>{a.text}{a.ref && <small> · {a.ref}</small>}</div><time>{timeAgo(a.at)}</time></li> })}
          </ul>
        )}
      </Card>
    </>
  )
}
