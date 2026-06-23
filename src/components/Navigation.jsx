import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { TrendingUp, LayoutDashboard, Compass, LogOut, Menu, X, User, Sun, Moon } from 'lucide-react';

export default function Navigation() {
  const { user, logout, theme, setTheme } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  if (!user) return null;

  return (
    <nav className="sticky top-0 z-40 w-full bg-white/85 dark:bg-dark-bg/85 backdrop-blur-md border-b border-slate-200 dark:border-dark-border transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
            <div className="bg-blue-600 dark:bg-brand-primary p-2 rounded-xl text-white">
              <TrendingUp size={18} />
            </div>
            <span className="font-bold text-sm tracking-tight text-slate-800 dark:text-white">
              Finflow
            </span>
          </div>

          {/* Desktop Nav Items */}
          <div className="hidden md:flex items-center space-x-6">
            <NavLink
              to="/"
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 border border-blue-100 dark:bg-brand-primary/10 dark:text-brand-primary dark:border-brand-primary/20'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-dark-card/35'
                }`
              }
              end
            >
              <LayoutDashboard size={14} />
              <span>Dashboard</span>
            </NavLink>

            <NavLink
              to="/advisor"
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 border border-blue-100 dark:bg-brand-primary/10 dark:text-brand-primary dark:border-brand-primary/20'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-dark-card/35'
                }`
              }
            >
              <Compass size={14} />
              <span>Advisor</span>
            </NavLink>
          </div>

          {/* User Profile & Logout */}
          <div className="hidden md:flex items-center space-x-4 border-l border-slate-200 dark:border-dark-border pl-6">
            <button
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-dark-card rounded-lg transition-colors border-0 bg-transparent cursor-pointer"
              title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            >
              {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
            </button>

            <NavLink
              to="/settings"
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 border border-blue-100 dark:bg-brand-primary/10 dark:text-brand-primary dark:border-brand-primary/20'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-dark-card/35'
                }`
              }
            >
              <div className="bg-slate-100 dark:bg-zinc-800 p-1 rounded-full text-slate-600 dark:text-zinc-300">
                <User size={12} />
              </div>
              <span className="text-slate-700 dark:text-zinc-300">{user.name}</span>
            </NavLink>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-500 hover:text-rose-600 dark:text-zinc-400 dark:hover:text-brand-rose bg-transparent border-0 cursor-pointer transition-colors"
            >
              <LogOut size={14} />
              <span>Logout</span>
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white bg-transparent border-0 p-2 cursor-pointer"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 dark:border-dark-border bg-white/95 dark:bg-dark-panel/95 backdrop-blur-md animate-slide-up">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <NavLink
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 dark:bg-brand-primary/15 dark:text-brand-primary'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 hover:bg-slate-100 dark:hover:text-white dark:hover:bg-dark-card'
                }`
              }
              end
            >
              <LayoutDashboard size={16} />
              <span>Dashboard</span>
            </NavLink>

            <NavLink
              to="/advisor"
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 dark:bg-brand-primary/15 dark:text-brand-primary'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 hover:bg-slate-100 dark:hover:text-white dark:hover:bg-dark-card'
                }`
              }
            >
              <Compass size={16} />
              <span>Advisor</span>
            </NavLink>

            <div className="border-t border-slate-200 dark:border-dark-border mt-3 pt-3 px-3 flex flex-col gap-2">
              <NavLink
                to="/settings"
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-blue-50 text-blue-600 dark:bg-brand-primary/15 dark:text-brand-primary'
                      : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 hover:bg-slate-100 dark:hover:text-white dark:hover:bg-dark-card'
                  }`
                }
              >
                <User size={16} />
                <span className="text-slate-700 dark:text-zinc-300">Settings ({user.name})</span>
              </NavLink>

              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setTheme(theme === 'light' ? 'dark' : 'light');
                }}
                className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-zinc-400 hover:text-slate-900 hover:bg-slate-100 dark:hover:text-white dark:hover:bg-dark-card bg-transparent border-0 cursor-pointer"
              >
                {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
                <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="w-full text-left flex items-center gap-2 py-2 text-rose-600 dark:text-brand-rose bg-transparent border-0 font-medium text-sm cursor-pointer"
              >
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
