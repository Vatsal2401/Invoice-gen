import React from 'react'
import { NavLink } from 'react-router-dom'
import { Settings, Users, FilePlus, History } from 'lucide-react'
import appIcon from '../../assets/app-icon-64.png'

const navItems = [
  { to: '/setup', label: 'Setup', icon: Settings },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/invoices/new', label: 'New Invoice', icon: FilePlus },
  { to: '/history', label: 'History', icon: History }
]

export default function Sidebar(): React.ReactElement {
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

      {/* Version */}
      <div className="px-4 py-3 text-xs opacity-40">v1.0.0</div>
    </aside>
  )
}
