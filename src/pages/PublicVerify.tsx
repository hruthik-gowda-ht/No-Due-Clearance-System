// ==============================================================================
// COLLEGE NO-DUE CLEARANCE MANAGEMENT SYSTEM
// Public Verification Portal (Section 15 & Rule 2.11)
// Live public authentication of student clearance & hall ticket eligibility
// ==============================================================================

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { PublicVerificationResult } from '../types/database';
import {
  ShieldCheck,
  Search,
  CheckCircle2,
  AlertTriangle,
  Building,
  GraduationCap,
  Calendar,
  Ticket,
  Clock,
  Printer,
  QrCode,
  School,
  ExternalLink,
} from 'lucide-react';

export const PublicVerify: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();

  const [searchId, setSearchId] = useState(id || '');
  const [record, setRecord] = useState<PublicVerificationResult | null>(null);
  const [hasSearched, setHasSearched] = useState(Boolean(id));
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (id) {
      setSearchId(id);
      performSearch(id);
    }
  }, [id]);

  const performSearch = async (verificationCode: string) => {
    if (!verificationCode || !verificationCode.trim()) return;
    try {
      setIsLoading(true);
      setHasSearched(true);
      const result = await api.getPublicVerificationRecord(verificationCode.trim());
      setRecord(result);
    } catch (err) {
      console.error('Verification query failed:', err);
      setRecord(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchId) {
      navigate(`/verify/${searchId.trim()}`);
      performSearch(searchId);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8 space-y-8 animate-in fade-in">
      {/* Header Banner — Text Branding (Section 2 & 10) */}
      <div className="text-center space-y-2">
        <span className="text-xs font-bold uppercase tracking-widest text-blue-400">
          Cauvery Institute of Technology • Affiliated to VTU
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-100 tracking-tight">
          Public Clearance Verification Portal
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
          Authenticate official No-Due Clearance and examination hall ticket eligibility issued by Cauvery Institute of Technology.
        </p>
      </div>

      {/* Verification Query Box */}
      <div className="glass-panel rounded-3xl p-6 border border-slate-700/80 shadow-2xl">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-5 h-5 text-slate-500 absolute left-4 top-3.5" />
            <input
              type="text"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value.toUpperCase())}
              placeholder="Enter Verification ID (e.g. CIT-VTU-2026-A8F932BC)..."
              className="w-full pl-12 pr-4 py-3 rounded-2xl bg-slate-900 border border-slate-700 text-slate-100 text-sm font-mono tracking-wider focus:outline-none focus:border-emerald-500"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !searchId.trim()}
            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-emerald-900/30 transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{isLoading ? 'Verifying...' : 'Verify Record'}</span>
          </button>
        </form>
        <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
          <span>Sample cleared ID: <button type="button" onClick={() => { setSearchId('CIT-VTU-2026-A8F932BC'); performSearch('CIT-VTU-2026-A8F932BC'); }} className="text-emerald-400 underline font-mono">CIT-VTU-2026-A8F932BC</button></span>
          <span>Section 10: Exposes minimal non-sensitive public record</span>
        </div>
      </div>

      {/* Verification Result Card */}
      {record ? (
        <div className="glass-panel rounded-3xl p-6 sm:p-10 border border-emerald-500/40 shadow-2xl relative overflow-hidden bg-gradient-to-b from-slate-900/90 to-[#0b1323]">
          {/* Holographic Watermark Badge */}
          <div className="absolute -right-8 -bottom-8 opacity-10 pointer-events-none">
            <ShieldCheck className="w-64 h-64 text-emerald-400" />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                  OFFICIAL INSTITUTIONAL RECORD
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-slate-100">
                  No-Due Clearance Verified
                </h2>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs font-mono text-emerald-300 bg-emerald-950/60 border border-emerald-500/40 px-3 py-1.5 rounded-xl font-bold inline-block">
                {record.verification_id}
              </span>
              <p className="text-[10px] text-slate-500 mt-1">
                Cleared on {new Date(record.cleared_at).toLocaleDateString()} at{' '}
                {new Date(record.cleared_at).toLocaleTimeString()}
              </p>
            </div>
          </div>

          {/* Core Verified Fields (Rule 2.11: Expose only approved public fields) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 my-8">
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-400">Student Name</span>
              <p className="text-base font-bold text-slate-100">{record.student_name}</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-400">Student ID / Roll</span>
              <p className="text-base font-mono font-bold text-blue-400">{record.student_id_masked}</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-400">Academic Department</span>
              <p className="text-sm font-semibold text-slate-200">{record.department}</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-400">Academic Period</span>
              <p className="text-sm font-semibold text-slate-200">
                Semester {record.semester} ({record.academic_year})
              </p>
            </div>
          </div>

          {/* Status & Hall Ticket Eligibility */}
          <div className="p-5 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                <Ticket className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                  Hall Ticket Eligibility Status
                </span>
                <p className="text-sm font-bold text-slate-100">
                  {record.hall_ticket_eligibility} — {record.hall_ticket_status}
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold inline-block">
                ✓ ALL DUES CLEARED
              </span>
            </div>
          </div>

          {/* Institutional Sign-off Footer */}
          <div className="mt-8 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <School className="w-4 h-4 text-slate-500" />
              <span>Cauvery Institute of Technology • Affiliated to VTU (Office of Academic Affairs)</span>
            </div>
            <button
              onClick={() => window.print()}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Verification Record
            </button>
          </div>
        </div>
      ) : hasSearched && !isLoading ? (
        <div className="glass-panel rounded-3xl p-10 text-center border border-rose-500/30 bg-rose-950/10 shadow-2xl space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-slate-100">No Cleared Record Found</h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            No official cleared No-Due record exists for Verification ID <span className="font-mono text-rose-300 font-bold">{searchId}</span>. Please verify the code or contact the college administration.
          </p>
        </div>
      ) : null}
    </div>
  );
};
