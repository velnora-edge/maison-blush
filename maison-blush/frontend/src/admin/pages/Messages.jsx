import { useEffect, useState } from 'react'
import { Search, Trash2, Phone, Mail, MessageCircle, CheckCheck, Loader2 } from 'lucide-react'
import { salon } from '@shared/salon.js'
import { adm } from '../api.js'
import { PageHeader, Card, Toolbar, DataTable, Pagination, Loading, ErrorBox, Modal, ConfirmModal, StatusBadge, useFetch, useDebounced, useToast, fmtDateTime, timeAgo } from '../ui.jsx'
import { InfoGrid } from './shared.jsx'

function MessageModal({ initial, onClose, onChanged }) {
  const [m, setM] = useState(initial)
  const toast = useToast()
  const [busy, setBusy] = useState('')
  const [confirm, setConfirm] = useState(false)

  // Kholte hi "new" -> "read"
  useEffect(() => {
    if (initial.status === 'new') adm.patch(`/messages/${initial.id}`, { status: 'read' }).then(({ item }) => { setM(item); onChanged() }).catch(() => {})
  }, [initial.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const setStatus = async (status) => {
    setBusy(status)
    try { const { item } = await adm.patch(`/messages/${m.id}`, { status }); setM(item); toast(`Marked as ${status}.`); await onChanged() }
    catch (e) { toast(e.message, 'bad') } finally { setBusy('') }
  }
  const remove = async () => {
    try { await adm.del(`/messages/${m.id}`); toast('Message deleted.'); onClose(); await onChanged() }
    catch (e) { toast(e.message, 'bad'); setConfirm(false) }
  }
  const digits = (m.phone || '').replace(/\D/g, '')
  return (
    <Modal title="Message" onClose={onClose}>
      <div className="adm-row-between"><h3>{m.name}</h3><StatusBadge status={m.status} /></div>
      <InfoGrid rows={[['Phone', m.phone && <a href={`tel:${m.phone}`}>{m.phone}</a>], ['Email', m.email && <a href={`mailto:${m.email}`}>{m.email}</a>], ['Received', fmtDateTime(m.createdAt)]]} />
      <blockquote className="adm-quote">{m.message}</blockquote>
      <div className="adm-actions-row">
        {m.phone && <a className="adm-btn" href={`tel:${m.phone}`}><Phone size={17} /> Call</a>}
        {digits && <a className="adm-btn" href={`https://wa.me/${digits.startsWith('0') ? salon.whatsapp.slice(0, 2) + digits.slice(1) : digits}`} target="_blank" rel="noreferrer"><MessageCircle size={17} /> WhatsApp</a>}
        {m.email && <a className="adm-btn" href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: your message to ${salon.name}`)}`}><Mail size={17} /> Email</a>}
      </div>
      <div className="adm-actions-row end">
        <button className="adm-btn primary" disabled={!!busy || m.status === 'replied'} onClick={() => setStatus('replied')}>{busy === 'replied' ? <Loader2 className="spin" size={16} /> : <CheckCheck size={17} />} Mark as replied</button>
        {m.status !== 'new' && <button className="adm-btn" disabled={!!busy} onClick={() => setStatus('new')}>Mark unread</button>}
        <button className="adm-btn danger" onClick={() => setConfirm(true)}><Trash2 size={17} /> Delete</button>
      </div>
      {confirm && <ConfirmModal danger title="Delete this message?" message="This cannot be undone." confirmLabel="Delete" onConfirm={remove} onClose={() => setConfirm(false)} />}
    </Modal>
  )
}

export default function Messages() {
  const [q, setQ] = useState(''), [status, setStatus] = useState(''), [page, setPage] = useState(1)
  const [open, setOpen] = useState(null)
  const dq = useDebounced(q)
  useEffect(() => { setPage(1) }, [dq, status])
  const { loading, error, data, reload } = useFetch('/messages', { q: dq, status, page })
  const cols = [
    { key: 'name', label: 'From', render: (r) => <><strong>{r.name}</strong><br /><small className="muted">{r.phone || r.email}</small></> },
    { key: 'message', label: 'Message', render: (r) => <span className={`clamp ${r.status === 'new' ? 'bold' : ''}`}>{r.message}</span> },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'at', label: 'Received', render: (r) => timeAgo(r.createdAt) },
  ]
  return (
    <>
      <PageHeader title="Messages" subtitle="Messages sent through the contact form on your website." />
      <Card>
        <Toolbar>
          <label className="adm-search"><Search size={19} aria-hidden="true" /><input placeholder="Search messages" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search messages" /></label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
            <option value="">All messages</option><option value="new">Unread</option><option value="read">Read</option><option value="replied">Replied</option>
          </select>
        </Toolbar>
        {error ? <ErrorBox message={error} onRetry={reload} /> : !data ? <Loading /> : (
          <div className={loading ? 'adm-dim' : ''}>
            <DataTable columns={cols} rows={data.items} onRowClick={setOpen} empty={q || status ? 'No messages match your filters.' : 'No messages yet.'} />
            <Pagination page={data.page} pages={data.pages} total={data.total} onPage={setPage} />
          </div>
        )}
      </Card>
      {open && <MessageModal initial={open} onClose={() => setOpen(null)} onChanged={reload} />}
    </>
  )
}
