// ==============================================================================
// COLLEGE NO-DUE CLEARANCE MANAGEMENT SYSTEM
// HOD Dashboard (Section 4 & 14)
// Final Clearance Review, 4-Stage Prerequisite Validation & Verification ID Issuance
// ==============================================================================

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { NoDueRequest, RejectionCategoryType } from '../types/database';
import { StatusBadge } from '../components/StatusBadge';
import { RejectionModal } from '../components/RejectionModal';
import confetti from 'canvas-confetti';
import {
  Building2,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Award,
  Search,
  Filter,
  Check,
  X,
  Lock,
  Ticket,
  GraduationCap,
  BookOpen,
  Wallet,
  FlaskConical,
} from 'lucide-react';

export const HodDashboard: React.FC = () => {
  const { user } = useAuth();

  const [requests, setRequests] = useState<NoDueRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'hod_review' | 'cleared' | 'in_review'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [rejectingRequest, setRejectingRequest] = useState<NoDueRequest | null>(null);
  const [notificationMsg, setNotificationMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const data = await api.getHodDashboardData();
      setRequests(data);
    } catch (err) {
      console.error('Failed to load HOD requests:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGrantFinalClearance = async (req: NoDueRequest) => {
    if (!user) return;
    try {
      setNotificationMsg(null);
      const res = await api.processHodFinalClearance({
        requestId: req.id,
        hodId: user.id,
        decision: 'approve',
        remarks: 'All 4 clearances verified. Official No-Due Clearance granted.',
      });

      // Confetti celebration
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });

      setNotificationMsg({
        type: 'success',
        text: `🎉 Official No-Due Clearance Granted! Verification ID: ${res.verification_id}`,
      });
      await loadData();
    } catch (err: any) {
      setNotificationMsg({ type: 'error', text: err.message || 'HOD approval blocked.' });
    }
  };

  const handleRejectClearance = async (data: {
    category: RejectionCategoryType;
    explanation: string;
  }) => {
    if (!rejectingRequest || !user) return;
    await api.processHodFinalClearance({
      requestId: rejectingRequest.id,
      hodId: user.id,
      decision: 'reject',
      remarks: data.explanation,
      rejectionCategory: data.category,
    });
    setNotificationMsg({ type: 'success', text: 'Clearance rejected by HOD. Student notified.' });
    await loadData();
  };

  if (!user || (user.role !== 'hod' && user.role !== 'admin')) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-center">
        <p className="text-slate-400">Please sign in as the Head of Department to view this dashboard.</p>
      </div>
    );
  }

  // Metrics
  const metrics = {
    total: requests.length,
    readyForHod: requests.filter((r) => r.status?.toUpperCase() === 'HOD_REVIEW').length,
    cleared: requests.filter((r) => r.status?.toUpperCase() === 'CLEARED').length,
    inReview: requests.filter((r) => r.status?.toUpperCase() === 'IN_REVIEW' || r.status?.toUpperCase() === 'SUBMITTED').length,
  };

  const filteredRequests = requests.filter((req) => {
    const student = req.student;
    const matchesSearch =
      student?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student?.student_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.verification_id?.toLowerCase().includes(searchQuery.toLowerCase());

    if (statusFilter === 'all') return matchesSearch;
    return matchesSearch && req.status?.toLowerCase() === statusFilter.toLowerCase();
  });

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8 animate-in fade-in">
      {/* Header Banner */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-700/80 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-purple-500/20 border border-purple-400/30 flex-shrink-0">
              <Building2 className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-slate-100">{user.full_name}</h1>
                <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-bold">
                  Head of Department
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                {user.department} • Final Clearance Review & Verification Authority
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-purple-950/20 border border-purple-900/40 text-xs text-purple-300 max-w-sm">
            <p className="font-bold flex items-center gap-1.5 mb-0.5">
              <ShieldCheck className="w-4 h-4 text-purple-400" />
              Strict Precondition Enforcement
            </p>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Rule 2.8: HOD final approval is blocked until all 4 clearances (Faculty, Library, Accounts, Lab) are 100% Approved.
            </p>
          </div>
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-slate-800">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <span className="text-xs font-bold uppercase text-slate-400 block">Total Requests</span>
            <span className="text-2xl font-black text-slate-100 font-mono mt-1">{metrics.total}</span>
          </div>
          <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-500/30">
            <span className="text-xs font-bold uppercase text-purple-300 block">Awaiting HOD Review</span>
            <span className="text-2xl font-black text-purple-400 font-mono mt-1">{metrics.readyForHod}</span>
          </div>
          <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/30">
            <span className="text-xs font-bold uppercase text-emerald-300 block">No-Due Cleared</span>
            <span className="text-2xl font-black text-emerald-400 font-mono mt-1">{metrics.cleared}</span>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <span className="text-xs font-bold uppercase text-slate-400 block">In Preceding Review</span>
            <span className="text-2xl font-black text-blue-400 font-mono mt-1">{metrics.inReview}</span>
          </div>
        </div>
      </div>

      {notificationMsg && (
        <div
          className={`p-4 rounded-2xl border text-xs flex items-center justify-between animate-in fade-in ${
            notificationMsg.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
              : 'bg-rose-950/40 border-rose-500/50 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {notificationMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            )}
            <span>{notificationMsg.text}</span>
          </div>
          <button onClick={() => setNotificationMsg(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search student name, ID or Verification ID..."
            className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-purple-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          {(['all', 'hod_review', 'cleared', 'in_review'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${
                statusFilter === st
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800'
              }`}
            >
              {st === 'hod_review' ? 'Ready for HOD' : st.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Requests Table */}
      <div className="glass-panel rounded-3xl border border-slate-700/80 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="p-4">Student</th>
                <th className="p-4">Period</th>
                <th className="p-4">4-Stage Prerequisite Status</th>
                <th className="p-4">Overall Request Status</th>
                <th className="p-4">Verification ID & Hall Ticket</th>
                <th className="p-4 text-right">HOD Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    No requests found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => {
                  const student = req.student;
                  const isFacultyOk = req.faculty_status?.toUpperCase() === 'APPROVED';
                  const isLibOk = req.library_status?.toUpperCase() === 'APPROVED';
                  const isAccOk = req.accounts_status?.toUpperCase() === 'APPROVED';
                  const isLabOk = req.lab_status?.toUpperCase() === 'APPROVED';

                  const canApprove = isFacultyOk && isLibOk && isAccOk && isLabOk;
                  const isCleared = req.status?.toUpperCase() === 'CLEARED';

                  return (
                    <tr key={req.id} className="hover:bg-slate-800/30 transition">
                      <td className="p-4">
                        <p className="font-bold text-slate-200">{student?.full_name || 'Student'}</p>
                        <p className="font-mono text-slate-400 text-[11px]">{student?.student_id}</p>
                      </td>
                      <td className="p-4">
                        <p className="text-slate-300 font-semibold">{req.academic_year}</p>
                        <p className="text-slate-500 text-[11px]">Semester {req.semester}</p>
                      </td>
                      <td className="p-4">
                        {/* 4-Way Verification Mini Pills */}
                        <div className="grid grid-cols-2 gap-1.5 min-w-[200px]">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] flex items-center gap-1 ${
                              isFacultyOk
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                : 'bg-slate-900 text-slate-500 border border-slate-800'
                            }`}
                          >
                            <GraduationCap className="w-3 h-3" />
                            Faculty: {req.faculty_status}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] flex items-center gap-1 ${
                              isLibOk
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                : 'bg-slate-900 text-slate-500 border border-slate-800'
                            }`}
                          >
                            <BookOpen className="w-3 h-3" />
                            Library: {req.library_status}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] flex items-center gap-1 ${
                              isAccOk
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                : 'bg-slate-900 text-slate-500 border border-slate-800'
                            }`}
                          >
                            <Wallet className="w-3 h-3" />
                            Accounts: {req.accounts_status}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] flex items-center gap-1 ${
                              isLabOk
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                : 'bg-slate-900 text-slate-500 border border-slate-800'
                            }`}
                          >
                            <FlaskConical className="w-3 h-3" />
                            Lab: {req.lab_status}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <StatusBadge status={req.status} type="request" size="sm" />
                      </td>
                      <td className="p-4 font-mono">
                        {isCleared ? (
                          <div className="space-y-1">
                            <span className="text-emerald-400 font-bold block text-xs">
                              {req.verification_id}
                            </span>
                            <span className="text-[10px] text-slate-400 flex items-center gap-1 font-sans">
                              <Ticket className="w-3 h-3 text-emerald-400" />
                              Hall Ticket: {req.hall_ticket_eligibility}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-[11px]">Not yet cleared</span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!isCleared && (
                            <button
                              type="button"
                              onClick={() => handleGrantFinalClearance(req)}
                              disabled={!canApprove}
                              title={
                                !canApprove
                                  ? 'Blocked: All 4 preceding clearances must be Approved before HOD final review.'
                                  : 'Grant Final No-Due Clearance'
                              }
                              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                                canApprove
                                  ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/30'
                                  : 'bg-slate-900 text-slate-500 cursor-not-allowed border border-slate-800'
                              }`}
                            >
                              <Award className="w-4 h-4" />
                              Grant Clearance
                            </button>
                          )}

                          {req.hod_status?.toUpperCase() !== 'REJECTED' && !isCleared && (
                            <button
                              type="button"
                              onClick={() => setRejectingRequest(req)}
                              className="px-3 py-2 rounded-xl text-xs font-bold bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/50 transition flex items-center gap-1"
                            >
                              <X className="w-3.5 h-3.5" />
                              Reject
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Rejection Modal for HOD */}
      {rejectingRequest && (
        <RejectionModal
          isOpen={Boolean(rejectingRequest)}
          onClose={() => setRejectingRequest(null)}
          title="Reject Final Clearance"
          stageName="HOD Final Review"
          isClearanceAuthority={false}
          onSubmit={handleRejectClearance}
        />
      )}
    </div>
  );
};
