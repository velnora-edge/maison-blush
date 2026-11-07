import { useRef, useState } from 'react'
import { Plus, Pencil, Trash2, Star, Upload, Loader2, ImageOff, Eye, EyeOff } from 'lucide-react'
import { imageUrl } from '@shared/catalog.js'
import { adm, uploadImage } from '../api.js'
import { PageHeader, Card, DataTable, Loading, ErrorBox, Modal, ConfirmModal, Field, Badge, useFetch, useToast, money } from '../ui.jsx'

const CONFIG = {
  services: { title: 'Services', singular: 'service', subtitle: 'Hair, colour, treatment and bridal services shown on your website and booking form.', blank: { name: '', slug: '', category: 'Hair', price: '', duration: '', description: '', image: '', keywords: '', active: true } },
  products: { title: 'Products', singular: 'product', subtitle: 'Products sold in your online shop. Stock is reduced automatically when customers order.', blank: { name: '', slug: '', category: 'Styling', price: '', stock: '10', description: '', image: '', featured: false, active: true } },
}

function Thumb({ src, name }) {
  const [bad, setBad] = useState(false)
  return src && !bad ? <img className="adm-thumb" src={imageUrl(src, 120)} alt={name} onError={() => setBad(true)} /> : <span className="adm-thumb empty"><ImageOff size={20} aria-hidden="true" /></span>
}

function ItemForm({ kind, item, categories, onClose, onSaved }) {
  const cfg = CONFIG[kind]
  const toast = useToast()
  const editing = Boolean(item)
  const [f, setF] = useState(() => (editing ? { ...cfg.blank, ...item, keywords: (item.keywords || []).join(', '), price: String(item.price), stock: String(item.stock ?? '') } : cfg.blank))
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef(null)
  const set = (patch) => setF((x) => ({ ...x, ...patch }))

  const pickFile = async (e) => {
    const file = e.target.files?.[0]; e.target.value = ''
    if (!file) return
    setUploading(true)
    try { set({ image: await uploadImage(file) }); toast('Image uploaded.') } catch (err) { toast(err.message, 'bad') } finally { setUploading(false) }
  }

  const submit = async (e) => {
    e.preventDefault()
    const local = {}
    if (f.name.trim().length < 2) local.name = 'Please enter a name.'
    if (!f.category.trim()) local.category = 'Please enter a category.'
    if (f.price === '' || Number(f.price) < 0) local.price = 'Please enter a valid price.'
    if (kind === 'products' && (f.stock === '' || Number(f.stock) < 0 || !Number.isInteger(Number(f.stock)))) local.stock = 'Stock must be a whole number (0 or more).'
    setErrors(local)
    if (Object.keys(local).length) return
    const body = { name: f.name, category: f.category, price: Number(f.price), description: f.description, image: f.image, active: f.active }
    if (kind === 'services') Object.assign(body, { duration: f.duration, keywords: f.keywords })
    else Object.assign(body, { stock: Number(f.stock), featured: f.featured })
    if (!editing && f.slug.trim()) body.slug = f.slug
    setBusy(true)
    try {
      if (editing) await adm.patch(`/${kind}/${item.id}`, body); else await adm.post(`/${kind}`, body)
      toast(`${cfg.singular[0].toUpperCase() + cfg.singular.slice(1)} ${editing ? 'updated' : 'added'}.`)
      onSaved()
    } catch (err) { if (err.fields) setErrors(err.fields); toast(err.message, 'bad') } finally { setBusy(false) }
  }

  return (
    <Modal title={editing ? `Edit ${cfg.singular}` : `Add ${cfg.singular}`} onClose={onClose} wide footer={<>
      <button className="adm-btn" onClick={onClose} disabled={busy}>Cancel</button>
      <button className="adm-btn primary" form="catalog-form" type="submit" disabled={busy || uploading}>{busy && <Loader2 className="spin" size={16} />} {editing ? 'Save changes' : `Add ${cfg.singular}`}</button>
    </>}>
      <form id="catalog-form" onSubmit={submit} noValidate className="adm-form-grid">
        <Field label="Name *" error={errors.name}><input value={f.name} onChange={(e) => set({ name: e.target.value })} maxLength={100} autoFocus /></Field>
        <Field label="Category *" error={errors.category} hint="Pick one or type a new category">
          <input list={`cats-${kind}`} value={f.category} onChange={(e) => set({ category: e.target.value })} maxLength={40} />
          <datalist id={`cats-${kind}`}>{categories.map((c) => <option key={c} value={c} />)}</datalist>
        </Field>
        <Field label={`Price (Rs.) *`} error={errors.price}><input type="number" min="0" value={f.price} onChange={(e) => set({ price: e.target.value })} /></Field>
        {kind === 'services'
          ? <Field label="Duration" error={errors.duration} hint="e.g. 60 min, 2–3 hrs"><input value={f.duration} onChange={(e) => set({ duration: e.target.value })} maxLength={30} /></Field>
          : <Field label="Stock quantity *" error={errors.stock} hint="0 = shows as Out of Stock"><input type="number" min="0" step="1" value={f.stock} onChange={(e) => set({ stock: e.target.value })} /></Field>}
        <Field label="Description" error={errors.description}><textarea rows={3} maxLength={600} value={f.description} onChange={(e) => set({ description: e.target.value })} /></Field>

        <div className="adm-field span">
          <span>Image</span>
          <div className="adm-image-row">
            <Thumb src={f.image} name={f.name} />
            <div className="grow">
              <input value={f.image} onChange={(e) => set({ image: e.target.value })} placeholder="Paste an image link (https://…) or upload a photo" aria-label="Image link" />
              {errors.image && <small className="err">{errors.image}</small>}
              <div className="adm-actions-row">
                <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={pickFile} />
                <button type="button" className="adm-btn" onClick={() => fileRef.current?.click()} disabled={uploading}>{uploading ? <Loader2 className="spin" size={16} /> : <Upload size={16} />} Upload photo</button>
                {f.image && <button type="button" className="adm-btn" onClick={() => set({ image: '' })}>Remove image</button>}
              </div>
            </div>
          </div>
        </div>

        {kind === 'services' && <Field label="Chatbot keywords" hint="Words customers may use, comma separated (e.g. keratin, smoothing)"><input value={f.keywords} onChange={(e) => set({ keywords: e.target.value })} /></Field>}
        {!editing && <Field label="Web name (optional)" error={errors.slug} hint="Auto-created from the name. Cannot be changed later."><input value={f.slug} onChange={(e) => set({ slug: e.target.value })} maxLength={60} placeholder="auto" /></Field>}
        <div className="adm-checks span">
          <label><input type="checkbox" checked={f.active} onChange={(e) => set({ active: e.target.checked })} /> Active — visible to customers</label>
          {kind === 'products' && <label><input type="checkbox" checked={f.featured} onChange={(e) => set({ featured: e.target.checked })} /> Featured — shown first in the shop</label>}
        </div>
      </form>
    </Modal>
  )
}

export default function Catalog({ kind }) {
  const cfg = CONFIG[kind]
  const toast = useToast()
  const { loading, error, data, reload } = useFetch(`/${kind}`)
  const [form, setForm] = useState(null) // null | 'new' | item
  const [del, setDel] = useState(null)

  const patch = async (item, body, msg) => {
    try { await adm.patch(`/${kind}/${item.id}`, body); toast(msg); reload() } catch (e) { toast(e.message, 'bad') }
  }
  const remove = async () => {
    try { await adm.del(`/${kind}/${del.id}`); toast(`${del.name} deleted.`); setDel(null); reload() } catch (e) { toast(e.message, 'bad'); setDel(null) }
  }

  const cols = [
    { key: 'img', label: '', render: (r) => <Thumb src={r.image} name={r.name} /> },
    { key: 'name', label: 'Name', render: (r) => <><strong>{r.name}</strong><br /><small className="muted">{r.slug}</small></> },
    { key: 'category', label: 'Category' },
    { key: 'price', label: 'Price', className: 'num', render: (r) => money(r.price) },
    kind === 'services'
      ? { key: 'duration', label: 'Duration', render: (r) => r.duration || '—' }
      : { key: 'stock', label: 'Stock', className: 'num', render: (r) => (r.stock <= 0 ? <Badge tone="bad">Out of stock</Badge> : r.stock <= 5 ? <Badge tone="warn">{r.stock} left</Badge> : r.stock) },
    { key: 'active', label: 'Status', render: (r) => <Badge tone={r.active ? 'good' : 'neutral'}>{r.active ? 'Active' : 'Hidden'}</Badge> },
    { key: 'actions', label: 'Actions', className: 'actions', render: (r) => (
      <div className="adm-row-actions" onClick={(e) => e.stopPropagation()}>
        {kind === 'products' && <button className={`adm-icon-btn ${r.featured ? 'on' : ''}`} onClick={() => patch(r, { featured: !r.featured }, r.featured ? 'Removed from featured.' : 'Marked as featured.')} aria-label={r.featured ? 'Remove from featured' : 'Mark as featured'} title="Featured"><Star size={19} fill={r.featured ? 'currentColor' : 'none'} /></button>}
        <button className="adm-icon-btn" onClick={() => setForm(r)} aria-label={`Edit ${r.name}`} title="Edit"><Pencil size={19} /></button>
        <button className="adm-icon-btn" onClick={() => patch(r, { active: !r.active }, r.active ? 'Hidden from the website.' : 'Now visible on the website.')} aria-label={r.active ? `Deactivate ${r.name}` : `Activate ${r.name}`} title={r.active ? 'Deactivate (hide)' : 'Activate (show)'}>{r.active ? <EyeOff size={19} /> : <Eye size={19} />}</button>
        <button className="adm-icon-btn danger" onClick={() => setDel(r)} aria-label={`Delete ${r.name}`} title="Delete"><Trash2 size={19} /></button>
      </div>
    ) },
  ]

  return (
    <>
      <PageHeader title={cfg.title} subtitle={cfg.subtitle}><button className="adm-btn primary" onClick={() => setForm('new')}><Plus size={18} /> Add {cfg.singular}</button></PageHeader>
      <Card>
        {error ? <ErrorBox message={error} onRetry={reload} /> : !data ? <Loading /> : (
          <div className={loading ? 'adm-dim' : ''}><DataTable columns={cols} rows={data.items} empty={`No ${cfg.title.toLowerCase()} yet. Click “Add ${cfg.singular}” to create the first one.`} /></div>
        )}
      </Card>
      {form && <ItemForm kind={kind} item={form === 'new' ? null : form} categories={data?.categories || []} onClose={() => setForm(null)} onSaved={() => { setForm(null); reload() }} />}
      {del && <ConfirmModal danger title={`Delete ${del.name}?`} message={`This permanently removes it from the website. Past ${kind === 'services' ? 'bookings' : 'orders'} keep their saved details. To just hide it, use “Deactivate” instead.`} confirmLabel="Delete" onConfirm={remove} onClose={() => setDel(null)} />}
    </>
  )
}
