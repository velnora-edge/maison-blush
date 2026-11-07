import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { X, Loader2, AlertCircle, Inbox, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react'
import { salon } from '@shared/salon.js'
import { adm, toQuery } from './api.js'

// ---------- formatters ----------
export const money = (n) => `${salon.currency.symbol} ${Number(n || 0).toLocaleString('en-US')}`
export const fmtDate = (d) => (d ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(d) ? `${d}T12:00:00` : d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—')
export const fmtDateTime = (d) => (d ? new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—')
export const fmtTime = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}` }
export const timeAgo = (d) => {
  const s = Math.max(0, (Date.now() - new Date(d)) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)} min ago`
  if (s < 86400) return `${Math.floor(s / 3600)} hr ago`
  return fmtDate(d)
}

export const PAYMENT_LABEL = {
  pay_on_delivery: ['Cash on delivery', 'neutral'], pay_at_salon: ['Pay at salon', 'neutral'], awaiting_verification: ['Awaiting verification', 'warn'],
  paid_demo: ['Demo payment', 'info'], paid: ['Paid ✓', 'good'], failed: ['Failed', 'bad'], refunded: ['Refunded', 'neutral'],
}
const STATUS_TONE = { pending: 'warn', confirmed: 'info', completed: 'good', cancelled: 'bad', processing: 'info', shipped: 'info', delivered: 'good', new: 'warn', read: 'neutral', replied: 'good', active: 'good', inactive: 'neutral' }
export function Badge({ tone, children }) { return <span className={`adm-badge ${tone || 'neutral'}`}>{children}</span> }
export const StatusBadge = ({ status }) => <Badge tone={STATUS_TONE[status]}>{String(status).replace(/^./, (c) => c.toUpperCase())}</Badge>
export function PaymentBadge({ payment }) {
  const [label, tone] = PAYMENT_LABEL[payment?.status] || [payment?.status, 'neutral']
  return <Badge tone={tone}>{label}</Badge>
}

// ---------- toasts ----------
const ToastCtx = createContext(() => {})
export const useToast = () => useContext(ToastCtx)
export function ToastProvider({ children }) {
  const [items, setItems] = useState([])
  const push = useCallback((message, tone = 'good') => {
    const id = Math.random()
    setItems((x) => [...x, { id, message, tone }])
    setTimeout(() => setItems((x) => x.filter((i) => i.id !== id)), 3200)
  }, [])
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="adm-toasts" role="status" aria-live="polite">
        {items.map((t) => <div key={t.id} className={`adm-toast ${t.tone}`}>{t.tone === 'bad' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />} {t.message}</div>)}
      </div>
    </ToastCtx.Provider>
  )
}

// ---------- layout pieces ----------
export const PageHeader = ({ title, subtitle, children }) => (
  <div className="adm-page-head">
    <div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>
    {children && <div className="adm-page-actions">{children}</div>}
  </div>
)
export const Card = ({ title, action, children, className = '' }) => (
  <section className={`adm-card ${className}`}>
    {(title || action) && <header className="adm-card-head"><h2>{title}</h2>{action}</header>}
    {children}
  </section>
)
export const Loading = ({ label = 'Loading…' }) => <div className="adm-state"><Loader2 className="spin" size={26} aria-hidden="true" /> {label}</div>
export const Empty = ({ children = 'Nothing here yet.' }) => <div className="adm-state"><Inbox size={30} aria-hidden="true" /><span>{children}</span></div>
export const ErrorBox = ({ message, onRetry }) => (
  <div className="adm-state error" role="alert"><AlertCircle size={26} aria-hidden="true" /><span>{message}</span>{onRetry && <button className="adm-btn" onClick={onRetry}>Try again</button>}</div>
)

export function Modal({ title, onClose, children, wide = false, footer }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', onKey) }
  }, [onClose])
  return (
    <div className="adm-modal-wrap" role="dialog" aria-modal="true" aria-label={title}>
      <div className="adm-backdrop" onClick={onClose} />
      <div className={`adm-modal ${wide ? 'wide' : ''}`}>
        <header><h2>{title}</h2><button className="adm-icon-btn" onClick={onClose} aria-label="Close"><X size={22} /></button></header>
        <div className="adm-modal-body">{children}</div>
        {footer && <footer>{footer}</footer>}
      </div>
    </div>
  )
}

/** window.confirm ki jagah apna saaf dialog */
export function ConfirmModal({ title, message, confirmLabel = 'Confirm', danger = false, onConfirm, onClose }) {
  const [busy, setBusy] = useState(false)
  return (
    <Modal title={title} onClose={onClose} footer={<>
      <button className="adm-btn" onClick={onClose} disabled={busy}>Cancel</button>
      <button className={`adm-btn ${danger ? 'danger' : 'primary'}`} disabled={busy} onClick={async () => { setBusy(true); try { await onConfirm() } finally { setBusy(false) } }}>
        {busy && <Loader2 className="spin" size={18} />} {confirmLabel}
      </button>
    </>}>
      <p className="adm-confirm-text">{message}</p>
    </Modal>
  )
}

export function Pagination({ page, pages, total, onPage }) {
  if (!total) return null
  return (
    <div className="adm-pager">
      <span>{total} result{total === 1 ? '' : 's'}</span>
      <div>
        <button className="adm-icon-btn" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page"><ChevronLeft size={20} /></button>
        <span>Page {page} of {pages}</span>
        <button className="adm-icon-btn" disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Next page"><ChevronRight size={20} /></button>
      </div>
    </div>
  )
}

export function DataTable({ columns, rows, onRowClick, empty = 'No records found.' }) {
  if (!rows.length) return <Empty>{empty}</Empty>
  return (
    <div className="adm-table-wrap">
      <table className="adm-table">
        <thead><tr>{columns.map((c) => <th key={c.key} className={c.className}>{c.label}</th>)}</tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id || r.key} className={onRowClick ? 'clickable' : ''} onClick={onRowClick ? () => onRowClick(r) : undefined}
              onKeyDown={onRowClick ? (e) => { if (e.key === 'Enter') onRowClick(r) } : undefined} tabIndex={onRowClick ? 0 : undefined}>
              {columns.map((c) => <td key={c.key} className={c.className} data-label={c.label}>{c.render ? c.render(r) : r[c.key]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export const Field = ({ label, error, hint, children }) => (
  <label className="adm-field"><span>{label}</span>{children}{hint && !error && <small>{hint}</small>}{error && <small className="err">{error}</small>}</label>
)

// ---------- data hooks ----------
export function useDebounced(value, ms = 350) {
  const [v, setV] = useState(value)
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t) }, [value, ms])
  return v
}

/** GET + loading/error/reload. Purane (late) jawab naye jawab ko overwrite nahi karte. */
export function useFetch(path, params) {
  const [state, setState] = useState({ loading: true, error: '', data: null })
  const seq = useRef(0)
  const key = path + toQuery(params)
  const load = useCallback(() => {
    const mine = ++seq.current
    setState((s) => ({ ...s, loading: true, error: '' }))
    adm.get(key).then((data) => mine === seq.current && setState({ loading: false, error: '', data }))
      .catch((e) => mine === seq.current && setState((s) => ({ ...s, loading: false, error: e.message })))
  }, [key])
  useEffect(() => { load() }, [load])
  return { ...state, reload: load, setData: (fn) => setState((s) => ({ ...s, data: typeof fn === 'function' ? fn(s.data) : fn })) }
}

export function Toolbar({ children }) { return <div className="adm-toolbar">{children}</div> }
