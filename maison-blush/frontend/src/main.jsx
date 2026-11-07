import React from 'react'
import { createRoot } from 'react-dom/client'
import './styles/base.css'

// "js" class lagne par hi scroll-animation ke elements chhupte hain (JS na chale to sab dikhta rahe)
document.documentElement.classList.add('js')
const root = createRoot(document.getElementById('root'))

// /admin/... par sirf admin panel load hota hai (customer website ka code/CSS nahi), baaqi sab jagah customer website
if (window.location.pathname.startsWith('/admin')) {
  import('./admin/AdminApp.jsx').then(({ default: AdminApp }) => root.render(<React.StrictMode><AdminApp /></React.StrictMode>))
} else {
  Promise.all([import('./App.jsx'), import('./styles/sections.css'), import('./styles/overlays.css')])
    .then(([{ default: App }]) => root.render(<React.StrictMode><App /></React.StrictMode>))
}
