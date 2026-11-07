import { useCallback, useEffect, useState } from 'react'
import { LayoutDashboard, CalendarCheck, ShoppingBag, Users, MessageSquare, Scissors, Package, Mail, BarChart3, Settings as SettingsIcon, LogOut, Menu, X, ExternalLink, Loader2 } from 'lucide-react'
import { salon } from '@shared/salon.js'
import { adm } from './api.js'
import { ToastProvider, useToast } from './ui.jsx'
import Login from './pages/Login.jsx'
import Overview from './pages/Overview.jsx'
import Bookings from './pages/Bookings.jsx'
import Orders from './pages/Orders.jsx'
import Customers from './pages/Customers.jsx'
import Messages from './pages/Messages.jsx'
import Catalog from './pages/Catalog.jsx'
import Subscribers from './pages/Subscribers.jsx'
import Reports from './pages/Reports.jsx'
import Settings from './pages/Settings.jsx'
import { AdminCtx, useAdmin } from './context.js'
import './admin.css'

const BASE = '/admin/dashboard'
const NAV = [
  { slug: '', label: 'Overview', icon: LayoutDashboard },
  { slug: 'bookings', label: 'Bookings', icon: CalendarCheck, badge: 'pendingBookings' },
  { slug: 'orders', label: 'Orders', icon: ShoppingBag, badge: 'pendingOrders' },
  { slug: 'customers', label: 'Customers', icon: Users },
  { slug: 'messages', label: 'Messages', icon: MessageSquare, badge: 'unreadMessages' },
  { slug: 'services', label: 'Services', icon: Scissors },
  { slug: 'products', label: 'Products', icon: Package },
  { slug: 'subscribers', label: 'Newsletter Subscribers', icon: Mail },
  { slug: 'reports', label: 'Revenue & Reports', icon: BarChart3 },
  { slug: 'settings', label: 'Settings', icon: SettingsIcon },
]

function Page({ slug }) {
  switch (slug) {
    case '': return <Overview />
    case 'bookings': return <Bookings />
    case 'orders': return <Orders />
    case 'customers': return <Customers />
    case 'messages': return <Messages />
    case 'services': return <Catalog kind="services" />
    case 'products': return <Catalog kind="products" />
    case 'subscribers': return <Subscribers />
    case 'reports': return <Reports />
    case 'settings': return <Settings />
    default: return <div className="adm-state">Page not found.</div>
  }
}

function Shell({ slug, go }) {
  const { admin, logout } = useAdmin()
  const [open, setOpen] = useState(false)
  const [badges, setBadges] = useState({})

  // Sidebar ke counters (pending / unread) — asli database se
  useEffect(() => {
    let alive = true
    adm.get('/stats?months=3').then((s) => alive && setBadges(s.cards)).catch(() => {})
    return () => { alive = false }
  }, [slug])
  useEffect(() => { setOpen(false); window.scrollTo(0, 0) }, [slug])

  const current = NAV.find((n) => n.slug === slug)
  useEffect(() => { document.title = `${current?.label || 'Admin'} – Maison Blush Admin` }, [current])

  return (
    <div className="adm-shell">
      <aside className={`adm-sidebar ${open ? 'open' : ''}`} aria-label="Admin navigation">
        <div className="adm-brand">
          <span className="adm-brand-mark"><Scissors size={22} aria-hidden="true" /></span>
          <div><strong>{salon.name}</strong><small>Admin Panel</small></div>
          <button className="adm-icon-btn adm-close-nav" onClick={() => setOpen(false)} aria-label="Close menu"><X size={22} /></button>
        </div>
        <nav>
          {NAV.map(({ slug: s, label, icon: Icon, badge }) => (
            <a key={s} href={s ? `${BASE}/${s}` : BASE} className={slug === s ? 'active' : ''} aria-current={slug === s ? 'page' : undefined}
              onClick={(e) => { e.preventDefault(); go(s ? `${BASE}/${s}` : BASE) }}>
              <Icon size={21} aria-hidden="true" /> <span>{label}</span>
              {badge && badges[badge] > 0 && <b className="adm-count">{badges[badge]}</b>}
            </a>
          ))}
        </nav>
        <div className="adm-side-foot">
          <a href="/" target="_blank" rel="noreferrer"><ExternalLink size={19} aria-hidden="true" /> View website</a>
          <button onClick={logout}><LogOut size={19} aria-hidden="true" /> Logout</button>
        </div>
      </aside>
      {open && <div className="adm-scrim" onClick={() => setOpen(false)} />}

      <div className="adm-main">
        <header className="adm-topbar">
          <button className="adm-icon-btn adm-menu" onClick={() => setOpen(true)} aria-label="Open menu"><Menu size={24} /></button>
          <span className="adm-crumb">{current?.label || 'Admin'}</span>
          <div className="adm-user"><span className="adm-avatar" aria-hidden="true">{(admin.name || admin.email)[0].toUpperCase()}</span><span className="adm-user-name">{admin.name || admin.email}</span></div>
        </header>
        <main className="adm-content"><Page slug={slug} /></main>
      </div>
    </div>
  )
}

function Gate() {
  const [path, setPath] = useState(window.location.pathname)
  const [status, setStatus] = useState('loading') // loading | authed | guest
  const [admin, setAdmin] = useState(null)
  const toast = useToast()

  const go = useCallback((to, { replace = false } = {}) => {
    window.history[replace ? 'replaceState' : 'pushState'](null, '', to)
    setPath(to)
  }, [])

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname)
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  useEffect(() => {
    adm.get('/auth/me').then((d) => { setAdmin(d.admin); setStatus('authed') }).catch(() => setStatus('guest'))
  }, [])

  // Session khatam / server ne 401 diya -> login par
  useEffect(() => {
    const onUnauthorized = () => { setAdmin(null); setStatus('guest'); toast('Your session has expired. Please sign in again.', 'bad') }
    window.addEventListener('admin:unauthorized', onUnauthorized)
    return () => window.removeEventListener('admin:unauthorized', onUnauthorized)
  }, [toast])

  const logout = useCallback(async () => {
    try { await adm.post('/auth/logout') } catch { /* cookie server side hat jati hai, chahe network fail ho */ }
    setAdmin(null); setStatus('guest'); go('/admin/login', { replace: true })
  }, [go])

  // Redirects: bina login -> /admin/login ; login ke baad -> /admin/dashboard
  useEffect(() => {
    if (status === 'guest' && path !== '/admin/login') go('/admin/login', { replace: true })
    if (status === 'authed' && (path === '/admin/login' || /^\/admin\/?$/.test(path))) go(BASE, { replace: true })
  }, [status, path, go])

  if (status === 'loading') return <div className="adm-splash"><Loader2 className="spin" size={34} /></div>
  if (status === 'guest') return <Login onSuccess={(a) => { setAdmin(a); setStatus('authed'); go(BASE, { replace: true }) }} />
  if (!path.startsWith(BASE)) return <div className="adm-splash"><Loader2 className="spin" size={34} /></div>

  const slug = path.slice(BASE.length).replace(/^\/|\/$/g, '').split('/')[0]
  return (
    <AdminCtx.Provider value={{ admin, setAdmin, logout, go }}>
      <Shell slug={slug} go={go} />
    </AdminCtx.Provider>
  )
}

export default function AdminApp() {
  return <ToastProvider><Gate /></ToastProvider>
}
