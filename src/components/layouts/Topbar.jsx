import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FiMenu,
  FiSearch,
  FiBell,
  FiLogOut,
  FiChevronDown,
  FiSidebar,
} from 'react-icons/fi'
import { useAuth } from '../../contexts/AuthContext'
import { customerService, inventoryService, saleService } from '../../services'
import { formatCurrency, timeAgo } from '../../utils/helpers'

export default function Topbar({ onToggleSidebar, onToggleCollapse }) {
  const { profile, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [term, setTerm] = useState('')
  const [results, setResults] = useState([])
  const [notifOpen, setNotifOpen] = useState(false)
  const menuRef = useRef(null)
  const searchRef = useRef(null)
  const notifRef = useRef(null)

  useEffect(() => {
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
      if (searchRef.current && !searchRef.current.contains(e.target)) setSearchOpen(false)
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  useEffect(() => {
    if (!term || term.length < 2) {
      setResults([])
      return
    }
    const t = setTimeout(async () => {
      const [customers, vehicles, sales] = await Promise.all([
        customerService.getAll(),
        inventoryService.getAll(),
        saleService.getAll(),
      ])
      const lt = term.toLowerCase()
      const r = []
      customers
        .filter((c) => c.name?.toLowerCase().includes(lt) || c.phone?.includes(term))
        .slice(0, 3)
        .forEach((c) => r.push({ type: 'Customer', label: c.name, sub: c.phone, to: `/customers/${c.id}` }))
      vehicles
        .filter((v) => v.model?.toLowerCase().includes(lt) || v.chassisNumber?.toLowerCase().includes(lt))
        .slice(0, 3)
        .forEach((v) =>
          r.push({ type: 'Vehicle', label: v.model, sub: v.chassisNumber || v.id, to: `/inventory/${v.id}` }),
        )
      sales
        .filter((s) => s.id?.toLowerCase().includes(lt))
        .slice(0, 3)
        .forEach((s) =>
          r.push({ type: 'Sale', label: s.id, sub: formatCurrency(s.price), to: `/sales/${s.id}` }),
        )
      setResults(r)
    }, 250)
    return () => clearTimeout(t)
  }, [term])

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-100 bg-white/80 px-4 backdrop-blur">
      <button className="btn-ghost p-2 lg:hidden" onClick={onToggleSidebar}>
        <FiMenu size={20} />
      </button>
      <button className="btn-ghost hidden p-2 lg:flex" onClick={onToggleCollapse}>
        <FiSidebar size={20} />
      </button>

      <div ref={searchRef} className="relative flex-1 max-w-md">
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            className="input pl-10"
            placeholder="Search customers, vehicles, sales…"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            onFocus={() => setSearchOpen(true)}
          />
        </div>
        {searchOpen && results.length > 0 && (
          <div className="absolute mt-2 w-full overflow-hidden rounded-xl border border-slate-100 bg-white shadow-elevated">
            {results.map((r, i) => (
              <button
                key={i}
                onClick={() => {
                  navigate(r.to)
                  setSearchOpen(false)
                  setTerm('')
                }}
                className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-slate-50"
              >
                <div>
                  <p className="text-sm font-medium text-slate-700">{r.label}</p>
                  <p className="text-xs text-slate-400">{r.sub}</p>
                </div>
                <span className="badge bg-primary-50 text-primary">{r.type}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="ml-auto flex items-center gap-1">
        <div ref={notifRef} className="relative">
          <button className="btn-ghost p-2.5" onClick={() => setNotifOpen((v) => !v)}>
            <FiBell size={20} />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-accent" />
          </button>
          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 overflow-hidden rounded-xl border border-slate-100 bg-white shadow-elevated">
              <p className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">
                Notifications
              </p>
              <div className="max-h-80 overflow-y-auto">
                <div className="px-4 py-6 text-center text-sm text-slate-400">No new notifications</div>
              </div>
            </div>
          )}
        </div>

        <div ref={menuRef} className="relative">
          <button
            className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-slate-100"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white">
              {profile?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="hidden text-left sm:block">
              <p className="text-sm font-medium text-slate-700">{profile?.name}</p>
              <p className="text-xs text-slate-400">{profile?.role}</p>
            </div>
            <FiChevronDown size={16} className="text-slate-400" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-slate-100 bg-white shadow-elevated">
              <div className="border-b border-slate-100 px-4 py-3">
                <p className="text-sm font-medium text-slate-700">{profile?.name}</p>
                <p className="truncate text-xs text-slate-400">{profile?.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 px-4 py-3 text-sm text-red-600 hover:bg-red-50"
              >
                <FiLogOut size={16} /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
