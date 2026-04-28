import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, FileText, Users } from 'lucide-react';
import { cn } from '@/utils/cn';

const items = [
  { to: '/admin', end: true, label: 'Overview', icon: LayoutDashboard },
  { to: '/admin/articles', label: 'Articles', icon: FileText },
  { to: '/admin/users', label: 'Users', icon: Users },
];

export function AdminLayout(): JSX.Element {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Admin panel</h1>
        <p className="text-sm text-slate-600 mt-1">Manage content and view platform stats.</p>
      </div>

      <nav className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                isActive ? 'bg-amber-100 text-amber-800' : 'text-slate-600 hover:bg-slate-100',
              )
            }
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <Outlet />
    </div>
  );
}
