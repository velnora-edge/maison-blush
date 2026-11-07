import { money } from './ui.jsx'

const niceMax = (v) => { if (v <= 0) return 1000; const p = 10 ** Math.floor(Math.log10(v)); const n = v / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p }
const short = (n) => (n >= 1e6 ? `${+(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${+(n / 1e3).toFixed(1)}k` : String(n))

/** Mahana revenue — stacked bars (services/bookings + shop/orders). Library ke bina, seedha SVG. */
export function RevenueChart({ data }) {
  const total = data.reduce((t, d) => t + d.total, 0)
  if (!total) return <p className="adm-chart-empty">No verified revenue in this period yet. Revenue appears here after you mark a payment as received.</p>
  const W = 640, H = 260, L = 52, R = 10, T = 14, B = 34
  const max = niceMax(Math.max(...data.map((d) => d.total)))
  const bw = (W - L - R) / data.length
  const y = (v) => T + (H - T - B) * (1 - v / max)
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => max * f)
  return (
    <div className="adm-chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Monthly revenue chart">
        {ticks.map((t) => (
          <g key={t}><line x1={L} x2={W - R} y1={y(t)} y2={y(t)} className="grid" /><text x={L - 8} y={y(t) + 4} textAnchor="end" className="axis">{short(t)}</text></g>
        ))}
        {data.map((d, i) => {
          const x = L + i * bw + bw * 0.2, w = bw * 0.6
          return (
            <g key={d.month}>
              <title>{`${d.label}: ${money(d.total)} (appointments ${money(d.bookings)}, shop ${money(d.orders)})`}</title>
              <rect x={x} y={y(d.bookings)} width={w} height={Math.max(0, y(0) - y(d.bookings))} className="bar-a" rx="3" />
              <rect x={x} y={y(d.bookings + d.orders)} width={w} height={Math.max(0, y(d.bookings) - y(d.bookings + d.orders))} className="bar-b" rx="3" />
              <text x={x + w / 2} y={H - 12} textAnchor="middle" className="axis">{d.label.split(' ')[0]}</text>
            </g>
          )
        })}
      </svg>
      <div className="adm-legend"><span><i className="a" /> Appointments</span><span><i className="b" /> Shop orders</span></div>
    </div>
  )
}

export function BarList({ items, valueKey, unit, empty = 'No data yet.' }) {
  if (!items.length) return <p className="adm-chart-empty">{empty}</p>
  const max = Math.max(...items.map((i) => i[valueKey]))
  return (
    <ul className="adm-barlist">
      {items.map((i) => (
        <li key={i.name}>
          <div><span>{i.name}</span><strong>{valueKey === 'amount' ? money(i[valueKey]) : i[valueKey]} {i[valueKey] === 1 ? unit.replace(/s$/, '') : unit}</strong></div>
          <div className="track"><div style={{ width: `${(i[valueKey] / max) * 100}%` }} /></div>
        </li>
      ))}
    </ul>
  )
}

const TONES = { pending: '#c9973f', confirmed: '#6f7fa8', completed: '#5f9a7a', cancelled: '#b5655a' }
export function StatusBar({ items }) {
  const total = items.reduce((t, i) => t + i.count, 0)
  if (!total) return <p className="adm-chart-empty">No bookings yet.</p>
  return (
    <div>
      <div className="adm-statusbar" role="img" aria-label="Bookings by status">
        {items.filter((i) => i.count).map((i) => <div key={i.status} style={{ width: `${(i.count / total) * 100}%`, background: TONES[i.status] }} title={`${i.status}: ${i.count}`} />)}
      </div>
      <ul className="adm-legend stack">
        {items.map((i) => <li key={i.status}><i style={{ background: TONES[i.status] }} /> {i.status.replace(/^./, (c) => c.toUpperCase())} <strong>{i.count}</strong></li>)}
      </ul>
    </div>
  )
}
