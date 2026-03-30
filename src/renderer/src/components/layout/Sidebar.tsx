import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Settings, Users, BookOpen, FilePlus, History, LogOut } from 'lucide-react'
import appIcon from '../../assets/app-icon-64.png'
import { useAuthStore } from '../../store/useAuthStore'
import { useQueryCache } from '../../store/useQueryCache'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/setup', label: 'Setup', icon: Settings },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/khata', label: 'Khata', icon: BookOpen },
  { to: '/invoices/new', label: 'New Invoice', icon: FilePlus },
  { to: '/history', label: 'History', icon: History }
]

export default function Sidebar(): React.ReactElement {
  const navigate = useNavigate()
  const { clearAuth, email } = useAuthStore()
  const { invalidate } = useQueryCache()

  const handleLogout = async (): Promise<void> => {
    await window.api.clearTokens()
    invalidate('/invoice/invoices', '/invoice/customers', '/invoice/profile')
    clearAuth()
    navigate('/login')
  }

  return (
    <aside
      id="sidebar"
      className="w-60 flex-shrink-0 bg-primary text-white flex flex-col h-screen"
    >
      {/* App name + logo */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-white/10">
        <img src={appIcon} alt="Logo" className="w-10 h-10 rounded-full flex-shrink-0 bg-white p-0.5" />
        <div>
          <div className="font-bold text-sm leading-tight">GST Invoice</div>
          <div className="text-xs font-normal opacity-60">Generator</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 text-sm transition-colors
               ${isActive
                ? 'bg-primary-light border-l-4 border-accent'
                : 'hover:bg-primary-light border-l-4 border-transparent'
              }`
            }
          >
            <Icon size={17} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User + Logout */}
      <div className="border-t border-white/10 px-4 py-3">
        {email && (
          <div className="text-xs opacity-50 truncate mb-2">{email}</div>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors w-full"
        >
          <LogOut size={15} />
          Logout
        </button>
      </div>
    </aside>
  )
}
