import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Activity, BarChart3, BookOpen, ChevronDown, CircleUserRound, Droplets, LogOut, Menu, Search, Settings2, Sparkles, Utensils, X } from 'lucide-react'
import { signOut } from 'firebase/auth'
import { auth } from '../lib/firebase'
import { useAuth } from '../app/AuthProvider'
import { cn } from '../lib/utils'

const links = [
  { to: '/dashboard', label: 'Overview', icon: Activity },
  { to: '/diary', label: 'Food diary', icon: BookOpen },
  { to: '/foods', label: 'Food search', icon: Search },
  { to: '/meal-planner', label: 'Meal planner', icon: Utensils },
  { to: '/food-scanner', label: 'Food scanner', icon: Sparkles },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
]

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { user } = useAuth()
  const navigate = useNavigate()
  const close = () => setMobileOpen(false)
  const logout = async () => {
    if (auth) await signOut(auth)
    navigate('/', { replace: true })
  }
  const nav = <><div className="brand-row"><div className="brand-mark"><Activity size={19} strokeWidth={2.5} /></div><span>nutrisense<span className="brand-dot">.</span></span><button className="mobile-close" onClick={close} aria-label="Close navigation"><X size={20} /></button></div><p className="nav-label">Workspace</p><nav className="side-nav">{links.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} onClick={close} className={({ isActive }) => cn('nav-link', isActive && 'nav-link-active')}><Icon size={18} strokeWidth={1.8} /><span>{label}</span>{to === '/food-scanner' && <span className="nav-soon">Beta</span>}</NavLink>)}</nav><div className="sidebar-bottom"><div className="sidebar-tip"><div className="tip-icon"><Droplets size={17} /></div><p><strong>Small steps add up.</strong><br />Your diary helps you spot patterns over time.</p></div><NavLink to="/profile" onClick={close} className="nav-link"><CircleUserRound size={18} /><span>Profile</span></NavLink><NavLink to="/settings" onClick={close} className="nav-link"><Settings2 size={18} /><span>Settings</span></NavLink><button className="account-row" onClick={logout}><div className="avatar">{(user?.displayName || user?.email || 'U').slice(0, 1).toUpperCase()}</div><div className="account-copy"><strong>{user?.displayName || 'Your account'}</strong><small>{user?.email}</small></div><LogOut size={16} /></button></div></>
  return <div className="app-shell"><aside className="sidebar">{nav}</aside>{mobileOpen && <div className="mobile-scrim" onClick={close}><aside className="sidebar mobile-sidebar" onClick={(event) => event.stopPropagation()}>{nav}</aside></div>}<div className="main-column"><header className="topbar"><button className="mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={21} /></button><div className="breadcrumb"><span>NutriSense AI</span><span className="breadcrumb-slash">/</span><span className="breadcrumb-current">Your workspace</span></div><div className="topbar-right"><div className="live-status"><span />Private workspace</div><button className="top-avatar" onClick={() => navigate('/profile')} aria-label="Open profile">{(user?.displayName || user?.email || 'U').slice(0, 1).toUpperCase()}</button><ChevronDown size={14} className="top-chevron" /></div></header><main className="main-content"><Outlet /></main><footer className="app-footer"><span>Food, understood.</span><span>For tracking and education · Not medical advice</span></footer></div></div>
}

