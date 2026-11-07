import { useEffect, useState } from 'react'
import { Search, Download, Trash2, Loader2 } from 'lucide-react'
import { adm } from '../api.js'
import { PageHeader, Card, Toolbar, DataTable, Pagination, Loading, ErrorBox, ConfirmModal, useFetch, useDebounced, useToast, fmtDateTime } from '../ui.jsx'

export default function Subscribers() {
  const toast = useToast()
  const [q, setQ] = useState(''), [page, setPage] = useState(1), [del, setDel] = useState(null), [exporting, setExporting] = useState(false)
  const dq = useDebounced(q)
  useEffect(() => { setPage(1) }, [dq])
  const { loading, error, data, reload } = useFetch('/subscribers', { q: dq, page })

  const exportCsv = async () => {
    setExporting(true)
    try { await adm.download('/subscribers/export.csv', 'maison-blush-subscribers.csv'); toast('Subscriber list downloaded.') } catch (e) { toast(e.message, 'bad') } finally { setExporting(false) }
  }
  const remove = async () => { try { await adm.del(`/subscribers/${del.id}`); toast('Subscriber removed.'); setDel(null); reload() } catch (e) { toast(e.message, 'bad'); setDel(null) } }

  const cols = [
    { key: 'email', label: 'Email', render: (r) => <a href={`mailto:${r.email}`}>{r.email}</a> },
    { key: 'at', label: 'Subscribed on', render: (r) => fmtDateTime(r.createdAt) },
    { key: 'actions', label: '', className: 'actions', render: (r) => <button className="adm-icon-btn danger" onClick={() => setDel(r)} aria-label={`Remove ${r.email}`}><Trash2 size={19} /></button> },
  ]
  return (
    <>
      <PageHeader title="Newsletter Subscribers" subtitle="People who subscribed from the footer of your website.">
        <button className="adm-btn" onClick={exportCsv} disabled={exporting || !data?.total}>{exporting ? <Loader2 className="spin" size={17} /> : <Download size={17} />} Export CSV</button>
      </PageHeader>
      <Card>
        <Toolbar><label className="adm-search"><Search size={19} aria-hidden="true" /><input placeholder="Search email" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search subscribers" /></label></Toolbar>
        {error ? <ErrorBox message={error} onRetry={reload} /> : !data ? <Loading /> : (
          <div className={loading ? 'adm-dim' : ''}>
            <DataTable columns={cols} rows={data.items} empty={q ? 'No subscribers match your search.' : 'No subscribers yet.'} />
            <Pagination page={data.page} pages={data.pages} total={data.total} onPage={setPage} />
          </div>
        )}
      </Card>
      {del && <ConfirmModal danger title="Remove subscriber?" message={`${del.email} will be removed from your list.`} confirmLabel="Remove" onConfirm={remove} onClose={() => setDel(null)} />}
    </>
  )
}
