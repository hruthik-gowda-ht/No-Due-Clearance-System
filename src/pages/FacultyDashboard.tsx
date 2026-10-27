// ==============================================================================
// COLLEGE NO-DUE CLEARANCE MANAGEMENT SYSTEM
// Faculty Dashboard (Section 7 & 13)
// Academic verification, dynamic attendance eligibility & payment confirmation
// ==============================================================================

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import {
  NoDueRequest,
  StudentAcademicRecord,
  PaymentSubmission,
  UserProfile,
  RejectionCategoryType,
} from '../types/database';
import { StatusBadge } from '../components/StatusBadge';
import { RejectionModal } from '../components/RejectionModal';
import { PaymentEvidenceModal } from '../components/PaymentEvidenceModal';
import {
  GraduationCap,
  Users,
  CheckCircle2,
  XCircle,
  CreditCard,
  AlertTriangle,
  Percent,
  Search,
  Filter,
  Check,
  Edit2,
  Save,
  X,
  Clock,
  ShieldAlert,
} from 'lucide-react';

export const FacultyDashboard: React.FC = () => {
  const { user } = useAuth();

  const [requests, setRequests] = useState<NoDueRequest[]>([]);
  const [academicRecords, setAcademicRecords] = useState<StudentAcademicRecord[]>([]);
  const [pendingPayments, setPendingPayments] = useState<PaymentSubmission[]>([]);
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [threshold, setThreshold] = useState<number>(85);
  const [isLoading, setIsLoading] = useState(true);

  // Tab & Filter states
  const [activeTab, setActiveTab] = useState<'academic' | 'payments' | 'attendance'>('academic');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [rejectingRequest, setRejectingRequest] = useState<NoDueRequest | null>(null);
  const [reviewingPayment, setReviewingPayment] = useState<PaymentSubmission | null>(null);

  // Inline attendance edit state
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [editAttendanceVal, setEditAttendanceVal] = useState<number>(0);
  const [editRemarksVal, setEditRemarksVal] = useState<string>('');

  const [notificationMsg, setNotificationMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      const [data, thresh] = await Promise.all([
        api.getFacultyDashboardData(user.id),
        api.getAttendanceThreshold(),
      ]);

      setRequests(data.requests);
      setAcademicRecords(data.academicRecords);
      setPendingPayments(data.pendingPayments);
      setStudents((data as any).students || []);
      setThreshold(thresh);
    } catch (err) {
      console.error('Failed to load faculty dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveAcademic = async (req: NoDueRequest) => {
    if (!user) return;
    try {
      setNotificationMsg(null);
      await api.startFacultyReview(req.id, user.id);
      await api.approveFacultyAcademic(req.id, user.id, 'Academic verification approved. Coursework complete.');
      setNotificationMsg({ type: 'success', text: `Academic verification approved for student.` });
      await loadData();
    } catch (err: any) {
      setNotificationMsg({ type: 'error', text: err.message || 'Approval blocked.' });
    }
  };

  const handleStartReject = async (req: NoDueRequest) => {
    if (!user) return;
    try {
      await api.startFacultyReview(req.id, user.id);
    } catch (e) {
      // Ignored if already started
    }
    setRejectingRequest(req);
  };

  const handleRejectAcademic = async (data: {
    category: RejectionCategoryType;
    explanation: string;
  }) => {
    if (!rejectingRequest || !user) return;
    await api.rejectFacultyAcademic(
      rejectingRequest.id,
      user.id,
      data.category,
      data.explanation
    );
    setNotificationMsg({ type: 'success', text: 'Academic verification rejected. Student notified.' });
    await loadData();
  };

  const handleSaveAttendance = async (recordId: string) => {
    if (!user) return;
    try {
      await api.updateStudentAttendance(recordId, editAttendanceVal, editRemarksVal, user.id);
      setEditingRecordId(null);
      setNotificationMsg({ type: 'success', text: 'Attendance record updated successfully.' });
      await loadData();
    } catch (err: any) {
      setNotificationMsg({ type: 'error', text: err.message || 'Failed to update attendance.' });
    }
  };

  if (!user || (user.role !== 'faculty' && user.role !== 'admin')) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-center">
        <p className="text-slate-400">Please sign in as a Faculty Advisor to view this dashboard.</p>
      </div>
    );
  }

  // Filter requests
  const filteredRequests = requests.filter((req) => {
    const student = req.student || students.find((s) => s.id === req.student_id);
    const matchesSearch =
      student?.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student?.student_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' || req.faculty_status?.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8 animate-in fade-in">
      {/* Faculty Advisor Header */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-700/80 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-indigo-500/20 border border-indigo-400/30 flex-shrink-0">
              <GraduationCap className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-slate-100">{user.full_name}</h1>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold">
                  Faculty Advisor
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Department of {user.department} • Academic & Payment Verification Authority
              </p>
            </div>
          </div>

          {/* Configured Threshold Indicator (Section 7.2) */}
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-900/90 border border-slate-700/80">
            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Required Attendance Threshold
              </span>
              <span className="text-2xl font-black text-indigo-400 font-mono">
                {threshold}%
              </span>
            </div>
            <div className="h-10 w-[1px] bg-slate-700"></div>
            <div className="text-xs text-slate-400 max-w-[140px] leading-tight">
              Rule 7.2: Academic approvals strictly blocked below {threshold}%.
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 mt-8 pt-6 border-t border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('academic')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'academic'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            Academic Verification Queue ({requests.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('payments')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 relative ${
              activeTab === 'payments'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            Payment Evidence Queue
            {pendingPayments.length > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold animate-pulse">
                {pendingPayments.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('attendance')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'attendance'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            Assigned Students & Attendance Records ({academicRecords.length})
          </button>
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

      {/* Tab 1: Academic Verification Queue */}
      {activeTab === 'academic' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by student name or ID..."
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              {(['all', 'pending', 'approved', 'rejected'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${
                    statusFilter === st
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <div className="glass-panel rounded-3xl border border-slate-700/80 shadow-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                  <tr>
                    <th className="p-4">Student</th>
                    <th className="p-4">Period</th>
                    <th className="p-4">Attendance</th>
                    <th className="p-4">Eligibility</th>
                    <th className="p-4">Academic Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredRequests.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500">
                        No clearance requests found matching filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredRequests.map((req) => {
                      const student = req.student || students.find((s) => s.id === req.student_id);
                      const acad = academicRecords.find(
                        (a) =>
                          a.student_id === req.student_id &&
                          a.academic_year === req.academic_year &&
                          a.semester === req.semester
                      );
                      const attendance = acad?.attendance_percentage ?? 0;
                      const isEligible = attendance >= threshold;

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
                          <td className="p-4 font-mono font-bold">
                            <span className={attendance >= threshold ? 'text-emerald-400' : 'text-rose-400'}>
                              {attendance}%
                            </span>
                            <span className="text-[10px] text-slate-500 block">min {threshold}%</span>
                          </td>
                          <td className="p-4">
                            {isEligible ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                                ELIGIBLE
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold">
                                NOT ELIGIBLE
                              </span>
                            )}
                          </td>
                          <td className="p-4">
                            <StatusBadge status={req.faculty_status} type="stage" size="sm" />
                            {req.faculty_remarks && (
                              <p className="text-[10px] text-slate-400 italic mt-1 line-clamp-1">
                                "{req.faculty_remarks}"
                              </p>
                            )}
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {req.faculty_status?.toUpperCase() !== 'APPROVED' && (
                                <button
                                  type="button"
                                  onClick={() => handleApproveAcademic(req)}
                                  disabled={!isEligible}
                                  title={!isEligible ? `Blocked: Attendance ${attendance}% is below ${threshold}% threshold` : 'Approve Academic Verification'}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                                    isEligible
                                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
                                      : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                                  }`}
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  Approve
                                </button>
                              )}

                              {req.faculty_status?.toUpperCase() !== 'REJECTED' && (
                                <button
                                  type="button"
                                  onClick={() => handleStartReject(req)}
                                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/50 transition flex items-center gap-1"
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
        </div>
      )}

      {/* Tab 2: Payment Evidence Verification Queue (Section 4.2 & 13, Step 5) */}
      {activeTab === 'payments' && (
        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-purple-950/20 border border-purple-900/40 text-xs text-purple-300 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Payment Evidence Verification Responsibility</p>
              <p className="mt-0.5 leading-relaxed text-slate-300">
                Rule 4.2: As the assigned faculty advisor, verify external payment screenshots for your students. Confirming a payment will return the relevant clearance item to <strong>Pending</strong> for the clearance authority to conduct their final clearance approval.
              </p>
            </div>
          </div>

          <div className="glass-panel rounded-3xl border border-slate-700/80 shadow-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                  <tr>
                    <th className="p-4">Student</th>
                    <th className="p-4">Authority</th>
                    <th className="p-4">Amount</th>
                    <th className="p-4">UTR / Ref</th>
                    <th className="p-4">Uploaded At</th>
                    <th className="p-4 text-right">Review Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {pendingPayments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500">
                        No pending payment screenshots awaiting faculty verification.
                      </td>
                    </tr>
                  ) : (
                    pendingPayments.map((sub) => (
                      <tr key={sub.id} className="hover:bg-slate-800/30 transition">
                        <td className="p-4 font-bold text-slate-200">
                          {sub.student_name}
                        </td>
                        <td className="p-4">
                          <span className="px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-[10px] font-bold uppercase text-slate-300">
                            {sub.authority}
                          </span>
                        </td>
                        <td className="p-4 font-mono font-bold text-emerald-400 text-sm">
                          ₹ {sub.amount.toFixed(2)}
                        </td>
                        <td className="p-4 font-mono text-slate-300">
                          {sub.transaction_reference || 'N/A'}
                        </td>
                        <td className="p-4 text-slate-400">
                          {new Date(sub.created_at).toLocaleString()}
                        </td>
                        <td className="p-4 text-right">
                          <button
                            type="button"
                            onClick={() => setReviewingPayment(sub)}
                            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5 ml-auto"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            Review Evidence
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Assigned Students & Attendance Management (Section 7.2) */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-blue-950/20 border border-blue-900/40 text-xs text-blue-300 flex items-start gap-3">
            <Percent className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Auditable Attendance Records</p>
              <p className="mt-0.5 leading-relaxed text-slate-300">
                Rule 7.2: Only authorized faculty advisors can update attendance values (between 0% and 100%). Eligibility is automatically evaluated against the current configured threshold of {threshold}%.
              </p>
            </div>
          </div>

          <div className="glass-panel rounded-3xl border border-slate-700/80 shadow-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                  <tr>
                    <th className="p-4">Student</th>
                    <th className="p-4">Semester</th>
                    <th className="p-4">Attendance %</th>
                    <th className="p-4">Eligibility Status</th>
                    <th className="p-4">Remarks</th>
                    <th className="p-4 text-right">Edit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {academicRecords.map((rec) => {
                    const isEditing = editingRecordId === rec.id;
                    const isEligible = rec.attendance_percentage >= threshold;

                    return (
                      <tr key={rec.id} className="hover:bg-slate-800/30 transition">
                        <td className="p-4">
                          <p className="font-bold text-slate-200">{rec.student_name}</p>
                          <p className="font-mono text-slate-400 text-[11px]">{rec.student_code}</p>
                        </td>
                        <td className="p-4 font-semibold text-slate-300">
                          Sem {rec.semester} ({rec.academic_year})
                        </td>
                        <td className="p-4 font-mono font-bold">
                          {isEditing ? (
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.1"
                              value={editAttendanceVal}
                              onChange={(e) => setEditAttendanceVal(parseFloat(e.target.value) || 0)}
                              className="w-20 px-2 py-1 rounded bg-slate-900 border border-indigo-500 text-slate-100 text-xs font-mono"
                            />
                          ) : (
                            <span className={isEligible ? 'text-emerald-400' : 'text-rose-400'}>
                              {rec.attendance_percentage}%
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          {isEligible ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                              ELIGIBLE
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold">
                              SHORTAGE (&lt;{threshold}%)
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editRemarksVal}
                              onChange={(e) => setEditRemarksVal(e.target.value)}
                              className="w-full px-2 py-1 rounded bg-slate-900 border border-indigo-500 text-slate-100 text-xs"
                            />
                          ) : (
                            <span className="text-slate-400 italic">{rec.academic_remarks || '—'}</span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          {isEditing ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => handleSaveAttendance(rec.id)}
                                className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white"
                                title="Save"
                              >
                                <Save className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingRecordId(null)}
                                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
                                title="Cancel"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingRecordId(rec.id);
                                setEditAttendanceVal(rec.attendance_percentage);
                                setEditRemarksVal(rec.academic_remarks || '');
                              }}
                              className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-indigo-600 transition"
                              title="Update Attendance"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal for Academic Verification */}
      {rejectingRequest && (
        <RejectionModal
          isOpen={Boolean(rejectingRequest)}
          onClose={() => setRejectingRequest(null)}
          title="Reject Academic Verification"
          stageName="Faculty Academic Review"
          isClearanceAuthority={false}
          onSubmit={handleRejectAcademic}
        />
      )}

      {/* Payment Evidence Modal */}
      {reviewingPayment && (
        <PaymentEvidenceModal
          isOpen={Boolean(reviewingPayment)}
          onClose={() => setReviewingPayment(null)}
          submission={reviewingPayment}
          facultyId={user.id}
          onSuccess={loadData}
          onSubmit={api.verifyPaymentEvidence}
        />
      )}
    </div>
  );
};
