// ==============================================================================
// CAUVERY INSTITUTE OF TECHNOLOGY (Affiliated to VTU)
// COLLEGE NO-DUE CLEARANCE MANAGEMENT SYSTEM
// Navbar Component — Secure Role-Based Navigation & Notifications
// ==============================================================================

import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { NotificationItem, UserRole } from '../types/database';
import {
  Bell,
  LogOut,
  ShieldCheck,
  User,
  Menu,
  X,
  UserPlus,
  LogIn,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, role, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (user) {
      loadNotifications();
    } else {
      setNotifications([]);
    }
  }, [user]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setShowNotifications(false);
  }, [location.pathname]);

  const loadNotifications = async () => {
    if (!user) return;
    try {
      const data = await api.getNotifications(user.id);
      setNotifications(data);
    } catch {
      // ignore
    }
  };

  const handleMarkRead = async (id: string, link?: string) => {
    await api.markNotificationAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    if (link) {
      navigate(link);
      setShowNotifications(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const getRoleBadge = (r: UserRole) => {
    if (user && user.role !== 'student' && user.role !== 'admin' && (user.is_verified === false || user.verification_status === 'PENDING')) {
      return { label: 'Pending Verification', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30 animate-pulse' };
    }
    if (user && user.role !== 'student' && user.role !== 'admin' && user.verification_status === 'REJECTED') {
      return { label: 'Verification Rejected', color: 'bg-rose-500/20 text-rose-300 border-rose-500/30' };
    }
    const map: Record<UserRole, { label: string; color: string }> = {
      student: { label: 'Student', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
      faculty: { label: 'Faculty Advisor', color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' },
      library_staff: { label: 'Library Staff', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
      accounts_staff: { label: 'Accounts Staff', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
      lab_staff: { label: 'Laboratory Staff', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
      hod: { label: 'Head of Dept (HOD)', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
      admin: { label: 'System Admin', color: 'bg-rose-500/20 text-rose-300 border-rose-500/30' },
    };
    return map[r] || { label: r, color: 'bg-slate-500/20 text-slate-300 border-slate-500/30' };
  };

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-800 bg-[#090d16]/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Institutional Identity — Text Branding (Section 2 & 23) */}
          <div className="flex items-center gap-6">
            <Link to="/" className="flex flex-col group">
              <span className="text-base sm:text-lg font-black tracking-wide text-slate-100 group-hover:text-blue-400 transition">
                Cauvery Institute of Technology
              </span>
              <span className="text-[10px] font-semibold text-slate-400 tracking-wider -mt-0.5">
                College No-Due Clearance Management System <span className="text-blue-400">•</span> VTU (2026–2027)
              </span>
            </Link>
          </div>

          {/* Navigation Links strictly based on Active Authentication State (Section 23.C) */}
          <nav className="hidden md:flex items-center gap-1">
            {/* Authenticated Role Navigation */}
            {user && (
              <>
                {user.role !== 'student' && user.role !== 'admin' && (user.is_verified === false || user.verification_status === 'PENDING' || user.verification_status === 'REJECTED') ? (
                  <Link
                    to="/staff/onboarding"
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                      location.pathname === '/staff/onboarding'
                        ? 'bg-amber-600/20 text-amber-400 border border-amber-500/30'
                        : 'text-amber-300 hover:text-white hover:bg-amber-950/30'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                    Staff Onboarding & Verification Status
                  </Link>
                ) : (
                  <>
                    {role === 'student' && (
                      <>
                        <Link
                          to="/student"
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                            location.pathname === '/student'
                              ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                              : 'text-slate-300 hover:text-slate-100 hover:bg-slate-800'
                          }`}
                        >
                          My Clearance
                        </Link>
                        <Link
                          to="/student/new-request"
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                            location.pathname === '/student/new-request'
                              ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                              : 'text-slate-300 hover:text-slate-100 hover:bg-slate-800'
                          }`}
                        >
                          New Request
                        </Link>
                      </>
                    )}

                    {role === 'faculty' && (
                      <Link
                        to="/faculty"
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                          location.pathname === '/faculty'
                            ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                            : 'text-slate-300 hover:text-slate-100 hover:bg-slate-800'
                        }`}
                      >
                        Faculty Verification & Payments
                      </Link>
                    )}

                    {role === 'library_staff' && (
                      <Link
                        to="/clearance/library"
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                          location.pathname === '/clearance/library'
                            ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                            : 'text-slate-300 hover:text-slate-100 hover:bg-slate-800'
                        }`}
                      >
                        Library Clearance Desk
                      </Link>
                    )}

                    {role === 'accounts_staff' && (
                      <Link
                        to="/clearance/accounts"
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                          location.pathname === '/clearance/accounts'
                            ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                            : 'text-slate-300 hover:text-slate-100 hover:bg-slate-800'
                        }`}
                      >
                        Accounts Clearance Desk
                      </Link>
                    )}

                    {role === 'lab_staff' && (
                      <Link
                        to="/clearance/lab"
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                          location.pathname === '/clearance/lab'
                            ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                            : 'text-slate-300 hover:text-slate-100 hover:bg-slate-800'
                        }`}
                      >
                        Laboratory Clearance Desk
                      </Link>
                    )}

                    {role === 'hod' && (
                      <Link
                        to="/hod"
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                          location.pathname === '/hod'
                            ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                            : 'text-slate-300 hover:text-slate-100 hover:bg-slate-800'
                        }`}
                      >
                        HOD Final Clearance Review
                      </Link>
                    )}

                    {role === 'admin' && (
                      <Link
                        to="/admin"
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                          location.pathname === '/admin'
                            ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                            : 'text-slate-300 hover:text-slate-100 hover:bg-slate-800'
                        }`}
                      >
                        Admin Console & Audits
                      </Link>
                    )}
                  </>
                )}
              </>
            )}
          </nav>

          {/* Right Controls: Authenticated Profile & Logout vs Unauthenticated Login/Register */}
          <div className="flex items-center gap-3">
            {user ? (
              /* Authenticated User Controls (Section 23.C) */
              <div className="flex items-center gap-3">
                {/* Notifications Dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition relative"
                    title="In-app notifications"
                  >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  {showNotifications && (
                    <div className="absolute right-0 mt-2 w-80 glass-panel rounded-2xl border border-slate-700 shadow-2xl z-50 animate-in fade-in overflow-hidden">
                      <div className="px-4 py-3 border-b border-slate-700/80 flex items-center justify-between bg-slate-900/60">
                        <span className="text-xs font-bold text-slate-200">In-App Notifications</span>
                        <span className="text-[10px] text-slate-400">{unreadCount} unread</span>
                      </div>
                      <div className="max-h-72 overflow-y-auto divide-y divide-slate-800">
                        {notifications.length === 0 ? (
                          <div className="p-4 text-center text-xs text-slate-500">
                            No notifications yet.
                          </div>
                        ) : (
                          notifications.map((n) => (
                            <div
                              key={n.id}
                              onClick={() => handleMarkRead(n.id, n.link)}
                              className={`p-3 text-xs cursor-pointer transition ${
                                n.is_read
                                  ? 'opacity-60 hover:opacity-100 hover:bg-slate-800/40'
                                  : 'bg-blue-950/30 hover:bg-blue-950/50'
                              }`}
                            >
                              <p className="font-semibold text-slate-200 mb-0.5 flex items-center justify-between">
                                <span>{n.title}</span>
                                {!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>}
                              </p>
                              <p className="text-slate-400 text-[11px] leading-relaxed">{n.message}</p>
                              <span className="text-[9px] text-slate-500 mt-1 block">
                                {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Authenticated Profile Badge */}
                <div className="flex items-center gap-2 pl-3 border-l border-slate-800">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs font-bold text-slate-100 leading-none">{user.full_name}</p>
                    <span className={`inline-block mt-0.5 text-[9px] font-semibold px-1.5 py-0.2 rounded border ${getRoleBadge(user.role).color}`}>
                      {getRoleBadge(user.role).label}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleLogout}
                    title="Sign Out"
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition flex items-center gap-1.5"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="hidden lg:inline text-xs font-medium">Sign Out</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Unauthenticated Visitor Controls (Section 23.C) */
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition flex items-center gap-1.5"
                >
                  <LogIn className="w-3.5 h-3.5 text-slate-400" />
                  <span>Login</span>
                </Link>
                <Link
                  to="/register"
                  className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition flex items-center gap-1.5"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Create Account</span>
                </Link>
              </div>
            )}

            {/* Mobile menu trigger */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer (Strictly enforces role authorization & unauthenticated states) */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-800 bg-[#090d16] px-4 py-3 space-y-2 animate-in fade-in">
          {user ? (
            <>
              <div className="pb-2 border-b border-slate-800/80 mb-2">
                <p className="text-xs font-bold text-slate-200">{user.full_name}</p>
                <span className={`inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded border ${getRoleBadge(user.role).color}`}>
                  {getRoleBadge(user.role).label}
                </span>
              </div>

              {role === 'student' && (
                <>
                  <Link
                    to="/student"
                    className="block px-3 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:bg-slate-800"
                  >
                    My Clearance
                  </Link>
                  <Link
                    to="/student/new-request"
                    className="block px-3 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:bg-slate-800"
                  >
                    New Request
                  </Link>
                </>
              )}

              {role === 'faculty' && (
                <Link
                  to="/faculty"
                  className="block px-3 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:bg-slate-800"
                >
                  Faculty Verification & Payments
                </Link>
              )}

              {role === 'library_staff' && (
                <Link
                  to="/clearance/library"
                  className="block px-3 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:bg-slate-800"
                >
                  Library Clearance Desk
                </Link>
              )}

              {role === 'accounts_staff' && (
                <Link
                  to="/clearance/accounts"
                  className="block px-3 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:bg-slate-800"
                >
                  Accounts Clearance Desk
                </Link>
              )}

              {role === 'lab_staff' && (
                <Link
                  to="/clearance/lab"
                  className="block px-3 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:bg-slate-800"
                >
                  Laboratory Clearance Desk
                </Link>
              )}

              {role === 'hod' && (
                <Link
                  to="/hod"
                  className="block px-3 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:bg-slate-800"
                >
                  HOD Final Clearance Review
                </Link>
              )}

              {role === 'admin' && (
                <Link
                  to="/admin"
                  className="block px-3 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:bg-slate-800"
                >
                  Admin Console & Audits
                </Link>
              )}

              <button
                type="button"
                onClick={handleLogout}
                className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-rose-400 hover:bg-rose-950/30 flex items-center gap-1.5"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="block px-3 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:bg-slate-800"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="block px-3 py-2 rounded-lg text-xs font-semibold text-blue-400 hover:bg-blue-950/30"
              >
                Create Account
              </Link>
            </>
          )}
        </div>
      )}
    </header>
  );
};
