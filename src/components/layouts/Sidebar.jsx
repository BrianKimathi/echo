import * as FiIcons from 'react-icons/fi'
import { NavLink } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../contexts/AuthContext'
import { ROLE_NAV } from '../../constants/navigation'

const getIcon = (name) => {
  const Icon = FiIcons[name]
  return Icon || FiIcons.FiCircle
}

export default function Sidebar({ collapsed, onNavigate }) {
  const { profile } = useAuth()
  const items = ROLE_NAV(profile?.role)

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-slate-100 bg-white transition-all duration-300 lg:static ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      <div className="flex h-16 items-center gap-2 border-b border-slate-100 px-4">
        <img src="/tuktuk.svg" alt="logo" className="h-8 w-8 flex-shrink-0" />
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="truncate text-sm font-bold text-primary">Tuk-Tuk</p>
            <p className="truncate text-xs text-slate-400">Sales System</p>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {items.map((item) => {
          const Icon = getIcon(item.icon)
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? 'bg-primary text-white shadow-soft'
                    : 'text-slate-600 hover:bg-slate-50'
                } ${collapsed ? 'justify-center' : ''}`
              }
              title={collapsed ? item.label : undefined}
            >
              <Icon size={20} className="flex-shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          )
        })}
      </nav>

      {!collapsed && (
        <div className="border-t border-slate-100 p-4">
          <div className="rounded-xl bg-primary-50 p-3">
            <p className="text-xs font-medium text-primary">{profile?.name}</p>
            <p className="truncate text-xs text-slate-500">{profile?.role}</p>
          </div>
        </div>
      )}
    </aside>
  )
}
