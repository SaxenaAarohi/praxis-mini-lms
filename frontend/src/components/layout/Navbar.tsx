import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  LayoutDashboard,
  Trophy,
  User as UserIcon,
  LogOut,
  Settings,
  Sparkles,
  GraduationCap,
  Menu,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/utils/cn';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/articles', label: 'Articles', icon: BookOpen },
  { to: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  { to: '/chat', label: 'AI Tutor', icon: Sparkles },
];

export function Navbar(): JSX.Element {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-30 backdrop-blur bg-white/80 border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2 font-semibold text-slate-900">
          <span className="w-8 h-8 rounded-lg bg-brand-600 text-white flex items-center justify-center">
            <GraduationCap className="w-5 h-5" />
          </span>
          <span className="hidden sm:inline">Mini LMS</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100',
                )
              }
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </NavLink>
          ))}
          {user?.role === 'ADMIN' && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  isActive ? 'bg-amber-50 text-amber-700' : 'text-slate-600 hover:bg-slate-100',
                )
              }
            >
              <Settings className="w-4 h-4" />
              Admin
            </NavLink>
          )}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <Link to="/profile" className="flex items-center gap-2 text-sm text-slate-700 hover:text-brand-700">
            <span className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-semibold uppercase">
              {user?.name?.charAt(0) ?? <UserIcon className="w-4 h-4" />}
            </span>
            <span className="hidden lg:inline-block max-w-[120px] truncate">{user?.name}</span>
          </Link>
          <button type="button" onClick={handleLogout} className="btn-ghost" title="Log out">
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        <button
          type="button"
          className="md:hidden btn-ghost"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-slate-200 bg-white animate-fade-in">
          <div className="px-4 py-3 flex flex-col gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium',
                    isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-700 hover:bg-slate-100',
                  )
                }
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </NavLink>
            ))}
            {user?.role === 'ADMIN' && (
              <NavLink
                to="/admin"
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium',
                    isActive ? 'bg-amber-50 text-amber-700' : 'text-slate-700 hover:bg-slate-100',
                  )
                }
              >
                <Settings className="w-5 h-5" />
                Admin
              </NavLink>
            )}
            <Link
              to="/profile"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              <UserIcon className="w-5 h-5" />
              {user?.name ?? 'Profile'}
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50"
            >
              <LogOut className="w-5 h-5" />
              Log out
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
