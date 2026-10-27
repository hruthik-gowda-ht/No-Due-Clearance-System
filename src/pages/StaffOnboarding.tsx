// ==============================================================================
// CAUVERY INSTITUTE OF TECHNOLOGY (Affiliated to VTU)
// COLLEGE NO-DUE CLEARANCE MANAGEMENT SYSTEM
// Staff Onboarding & Verification Status Portal (Section 28.C & 28.F)
// Gated view for registered staff accounts awaiting institutional authorization
// ==============================================================================

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  ShieldAlert,
  Clock,
  CheckCircle2,
  AlertCircle,
  Building,
  Mail,
  User,
  BookOpen,
  Calendar,
  Layers,
  RefreshCw,
  LogOut,
  ShieldCheck,
  Briefcase,
  Hash,
} from 'lucide-react';

export const StaffOnboarding: React.FC = () => {
  const { user, refreshUser, logout } = useAuth();
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);

  if (!user || user.role === 'student') {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4 text-center">
        <p className="text-slate-400 text-sm">Please sign in with a registered institutional staff account.</p>
      </div>
    );
  }

  // If already verified, direct to their operational dashboard
  if (user.is_verified === true && user.verification_status === 'VERIFIED') {
    if (user.role === 'faculty') navigate('/faculty', { replace: true });
    else if (user.role === 'library_staff') navigate('/clearance/library', { replace: true });
    else if (user.role === 'accounts_staff') navigate('/clearance/accounts', { replace: true });
    else if (user.role === 'lab_staff') navigate('/clearance/lab', { replace: true });
    else if (user.role === 'hod') navigate('/hod', { replace: true });
    else if (user.role === 'admin') navigate('/admin', { replace: true });
    else navigate('/', { replace: true });
  }

  const handleCheckStatus = async () => {
    setIsRefreshing(true);
    setRefreshMessage(null);
    try {
      refreshUser();
      // Small timeout to allow state to settle
      setTimeout(() => {
        setIsRefreshing(false);
        setRefreshMessage('Status refreshed. Institutional verification is still pending.');
      }, 600);
    } catch {
      setIsRefreshing(false);
    }
  };

  const handleSignOut = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const getRoleLabel = (role: string) => {
    const map: Record<string, string> = {
      faculty: 'Faculty Advisor',
      library_staff: 'Library Clearance Staff',
      accounts_staff: 'Accounts & Finance Staff',
      lab_staff: 'Laboratory Staff',
      hod: 'Head of Department (HOD)',
      admin: 'System Administrator',
    };
    return map[role] || role;
  };

  const isRejected = user.verification_status === 'REJECTED';

  return (
    <div className="max-w-5xl mx-auto py-10 px-4 sm:px-6 lg:px-8 space-y-8 animate-in fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/30">
              Institutional Staff Portal
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-xs text-slate-400 font-medium">Cauvery Institute of Technology</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-100 tracking-tight">
            Staff Account Onboarding & Verification Status
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Official registration profile for institutional clearance duties and role governance
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleCheckStatus}
            disabled={isRefreshing}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-blue-500/20 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Check Verification Status</span>
          </button>
          <button
            type="button"
            onClick={handleSignOut}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs border border-slate-700 flex items-center gap-1.5 transition"
          >
            <LogOut className="w-3.5 h-3.5 text-slate-400" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Refresh Status Feedback */}
      {refreshMessage && (
        <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-300 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-blue-400 flex-shrink-0" />
          <span>{refreshMessage}</span>
        </div>
      )}

      {/* Status Hero Card */}
      {isRejected ? (
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-rose-500/40 bg-rose-950/20 space-y-4">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  Verification Rejected
                </span>
              </div>
              <h2 className="text-xl font-bold text-slate-100">
                Staff Identity Verification Unsuccessful
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Your request for the role of <strong className="text-white">{getRoleLabel(user.requested_role || user.role)}</strong> could not be verified by the institutional administrator.
              </p>
              {user.rejection_reason && (
                <div className="mt-3 p-3 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-200 text-xs">
                  <span className="font-bold">Administrative Explanation:</span> {user.rejection_reason}
                </div>
              )}
            </div>
          </div>
          <div className="pt-3 border-t border-rose-500/20 text-xs text-slate-400">
            Next Steps: Please contact the Administration Office at <span className="text-rose-300 font-mono font-semibold">admin@cauvery.edu.in</span> to verify your official staff credentials or rectify your appointment details.
          </div>
        </div>
      ) : (
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-amber-500/40 bg-amber-950/15 space-y-4">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Clock className="w-8 h-8 animate-pulse" />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Institutional Verification Pending
                </span>
                <span className="text-[11px] text-slate-400">Registered on {new Date(user.created_at).toLocaleDateString()}</span>
              </div>
              <h2 className="text-xl font-bold text-slate-100">
                Awaiting Administrative Identity & Role Verification
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Your staff account has been successfully created and recorded in the database. In accordance with institutional security guidelines (Section 28.C), <strong>immediate account availability does not grant automatic clearance review privileges</strong>.
              </p>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                An authorized Administrator must verify your institutional identity, department appointment, and requested responsibilities before access to student records, clearance evaluation queues, and private payment evidence is enabled.
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-slate-400 font-semibold block mb-0.5">Step 1: Account Registered</span>
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Completed
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-slate-400 font-semibold block mb-0.5">Step 2: Admin Verification</span>
              <span className="text-amber-400 font-bold flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 animate-spin" /> In Review
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-slate-400 font-semibold block mb-0.5">Step 3: Clearance Portal Access</span>
              <span className="text-slate-500 font-bold flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5" /> Protected & Gated
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Staff Profile & Requested Configuration Card */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <User className="w-4 h-4 text-blue-400" />
            Registered Staff Profile & Institutional Responsibilities
          </h3>
          <span className="text-[11px] font-mono text-slate-400">ID: {user.id}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 text-xs">
          <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800/80 space-y-1">
            <span className="text-slate-400 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-blue-400" /> Full Name
            </span>
            <p className="font-bold text-slate-100 text-sm">{user.full_name}</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800/80 space-y-1">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5 text-blue-400" /> Official Staff ID
            </span>
            <p className="font-mono font-bold text-blue-400 text-sm">{user.staff_id || 'PENDING ASSIGNMENT'}</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800/80 space-y-1">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-blue-400" /> Institutional Email
            </span>
            <p className="font-medium text-slate-200">{user.email}</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800/80 space-y-1">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-blue-400" /> Department
            </span>
            <p className="font-semibold text-slate-200">{user.department}</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800/80 space-y-1">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-blue-400" /> Designation
            </span>
            <p className="font-semibold text-slate-200">{user.designation || 'Staff Member'}</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800/80 space-y-1">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-400" /> Academic Period
            </span>
            <p className="font-semibold text-slate-200">{user.academic_year || '2026-2027'}</p>
          </div>
        </div>

        {/* Teaching Scope (if faculty) */}
        {user.role === 'faculty' && (
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-slate-300 flex items-center gap-2 uppercase tracking-wider">
              <BookOpen className="w-4 h-4 text-blue-400" />
              Teaching Scope & Academic Assignments
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400">Subjects Taught:</span>
                <p className="font-medium text-slate-200 mt-1">
                  {user.subjects && user.subjects.length > 0 ? user.subjects.join(', ') : 'Not specified during registration'}
                </p>
              </div>
              <div>
                <span className="text-slate-400">Semester Handled:</span>
                <p className="font-medium text-slate-200 mt-1">
                  {user.semester ? `Semester ${user.semester}` : 'All Semesters'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Requested Responsibilities */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
          <h4 className="text-xs font-bold text-slate-300 flex items-center gap-2 uppercase tracking-wider">
            <Layers className="w-4 h-4 text-blue-400" />
            Requested Institutional Responsibilities (Awaiting Admin Authorization)
          </h4>
          <p className="text-[11px] text-slate-400">
            These responsibilities were specified during your registration. Selecting these options describes your requested duties; administrative authorization is required before clearance decision permissions are enabled.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {user.responsibilities && user.responsibilities.length > 0 ? (
              user.responsibilities.map((resp, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 rounded-xl bg-slate-800 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                  {resp}
                </span>
              ))
            ) : (
              <span className="text-slate-500 text-xs italic">Standard role responsibilities</span>
            )}
          </div>
        </div>

        {/* Institutional Contact Guidance */}
        <div className="p-4 rounded-2xl bg-blue-950/20 border border-blue-500/30 text-xs text-blue-300 space-y-2">
          <div className="flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 flex-shrink-0 text-blue-400 mt-0.5" />
            <div>
              <p className="font-bold">Expediting Institutional Verification</p>
              <p className="mt-0.5 text-slate-300 leading-relaxed">
                If your appointment requires urgent clearance queue authorization, please visit the Administrative Office (Central Block, 1st Floor) or email the System Administrator at <span className="font-mono font-bold text-blue-300">admin@cauvery.edu.in</span> with your Staff ID card.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
