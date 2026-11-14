import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  GraduationCap, 
  BarChart3, 
  BookOpen, 
  Target, 
  Crown, 
  UserCheck, 
  LogOut, 
  Menu, 
  X, 
  Sparkles,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';

export const Navbar: React.FC = () => {
  const { user, logout, isSubscriptionActive, setShowSubModal, activateSubscription, expireSubscription } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard' || location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-8">
            <Link
              to="/dashboard"
              className="flex items-center gap-2.5 focus:outline-none group text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/25 group-hover:scale-105 transition-transform">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xl font-extrabold tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors">
                  Get<span className="text-blue-600">SAT</span>Go
                </span>
                <span className="block text-[10px] font-bold text-slate-400 -mt-1 tracking-wider uppercase">
                  Digital SAT Prep
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1.5">
              <Link
                to="/dashboard"
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition ${
                  isActive('/dashboard')
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                Dashboard
              </Link>

              <Link
                to="/tests"
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition ${
                  isActive('/tests') || isActive('/results')
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                Mock Tests
              </Link>

              <Link
                to="/drills"
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition ${
                  isActive('/drills')
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Target className="w-4 h-4" />
                Syllabus Drills
              </Link>

              {user?.role === 'teacher' && (
                <Link
                  to="/teacher"
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition ${
                    isActive('/teacher')
                      ? 'bg-purple-50 text-purple-700'
                      : 'text-purple-600 hover:text-purple-900 hover:bg-purple-50/60'
                  }`}
                >
                  <UserCheck className="w-4 h-4" />
                  Teacher Hub
                </Link>
              )}
            </nav>
          </div>

          {/* Right Header Area */}
          <div className="hidden md:flex items-center gap-3">
            {/* Subscription status pill */}
            {isSubscriptionActive ? (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-xs font-semibold">
                <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span>Pro SAT Pass Active</span>
              </div>
            ) : (
              <Button
                onClick={() => setShowSubModal(true)}
                size="sm"
                className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1" />
                Unlock Full Access
              </Button>
            )}

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2.5 p-1.5 pr-2.5 rounded-full hover:bg-slate-100 transition border border-slate-200"
              >
                <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center">
                  {user?.full_name?.charAt(0) || 'U'}
                </div>
                <div className="text-left text-xs hidden lg:block">
                  <div className="font-semibold text-slate-900 truncate max-w-[120px]">{user?.full_name}</div>
                  <div className="text-[10px] text-slate-400 capitalize">{user?.role}</div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {profileDropdownOpen && (
                <div 
                  className="absolute right-0 mt-2 w-64 rounded-2xl bg-white shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                  onMouseLeave={() => setProfileDropdownOpen(false)}
                >
                  <div className="px-4 py-2.5 border-b border-slate-100">
                    <p className="text-xs text-slate-400">Signed in as</p>
                    <p className="text-sm font-bold text-slate-900 truncate">{user?.email}</p>
                    <Badge variant={user?.role === 'teacher' ? 'primary' : 'secondary'} className="mt-1">
                      {user?.role === 'teacher' ? 'Educator Account' : 'Student Account'}
                    </Badge>
                  </div>

                  {/* Dev / Test Controls */}
                  <div className="px-3 py-2 border-b border-slate-100 text-xs text-slate-500 space-y-1">
                    <span className="font-semibold text-[10px] uppercase tracking-wider text-slate-400 block px-1">
                      Session & Subscription Testing
                    </span>
                    {user?.subscription_status === 'active' ? (
                      <button
                        onClick={() => {
                          expireSubscription();
                          setProfileDropdownOpen(false);
                        }}
                        className="w-full text-left px-2 py-1.5 rounded-lg text-rose-600 hover:bg-rose-50 font-medium transition"
                      >
                        Simulate Expired Pass
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          activateSubscription();
                          setProfileDropdownOpen(false);
                        }}
                        className="w-full text-left px-2 py-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 font-medium transition"
                      >
                        Restore Pro Pass
                      </button>
                    )}
                  </div>

                  <div className="px-2 pt-1">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Mobile menu toggle */}
          <div className="flex md:hidden">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:bg-slate-100"
            >
              {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {menuOpen && (
          <div className="md:hidden py-4 border-t border-slate-100 space-y-2">
            <Link
              to="/dashboard"
              onClick={() => setMenuOpen(false)}
              className="block px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-100"
            >
              Dashboard
            </Link>
            <Link
              to="/tests"
              onClick={() => setMenuOpen(false)}
              className="block px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-100"
            >
              Mock Tests
            </Link>
            <Link
              to="/drills"
              onClick={() => setMenuOpen(false)}
              className="block px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-100"
            >
              Syllabus Drills
            </Link>
            {user?.role === 'teacher' && (
              <Link
                to="/teacher"
                onClick={() => setMenuOpen(false)}
                className="block px-4 py-2.5 rounded-xl text-sm font-semibold text-purple-700 hover:bg-purple-50"
              >
                Teacher Hub
              </Link>
            )}
            <div className="pt-2 border-t border-slate-100">
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 rounded-xl text-sm text-rose-600 font-semibold"
              >
                Sign Out ({user?.email})
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
