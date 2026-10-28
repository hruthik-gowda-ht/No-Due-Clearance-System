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
  SubjectAttendanceRecord,
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
  BookOpen,
  Lock,
  Unlock,
  RotateCcw,
} from 'lucide-react';

export const FacultyDashboard: React.FC = () => {
  const { user } = useAuth();

  const [requests, setRequests] = useState<NoDueRequest[]>([]);
  const [academicRecords, setAcademicRecords] = useState<StudentAcademicRecord[]>([]);
  const [pendingPayments, setPendingPayments] = useState<PaymentSubmission[]>([]);
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [subjectAttendanceRecords, setSubjectAttendanceRecords] = useState<SubjectAttendanceRecord[]>([]);
  const [threshold, setThreshold] = useState<number>(85);
  const [isLoading, setIsLoading] = useState(true);

  // Tab & Filter states
  const [activeTab, setActiveTab] = useState<'academic' | 'payments' | 'attendance'>('academic');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [rejectingRequest, setRejectingRequest] = useState<NoDueRequest | null>(null);
  const [reviewingPayment, setReviewingPayment] = useState<PaymentSubmission | null>(null);

  // Section 35: Subject Decision Modal state
  const [decisionModalSub, setDecisionModalSub] = useState<SubjectAttendanceRecord | null>(null);
  const [decisionType, setDecisionType] = useState<'APPROVE' | 'REJECT' | 'CORRECTION_REQUIRED'>('APPROVE');
  const [decisionRemarks, setDecisionRemarks] = useState('');

  // Inline subject attendance edit state (Section 33.B & 34)
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [editSubjectPct, setEditSubjectPct] = useState<number | string>('');
  const [editClassesHeld, setEditClassesHeld] = useState<number | string>('');
  const [editClassesAttended, setEditClassesAttended] = useState<number | string>('');
  const [editSubjectRemarks, setEditSubjectRemarks] = useState<string>('');

  // Inline attendance edit state (legacy / condonation)
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
      setSubjectAttendanceRecords((data as any).subjectAttendanceRecords || []);
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

  const handleSaveSubjectAttendance = async (sub: SubjectAttendanceRecord) => {
    if (!user) return;
    try {
      setNotificationMsg(null);
      const heldStr = String(editClassesHeld).trim();
      const attendedStr = String(editClassesAttended).trim();

      if (heldStr === '' || attendedStr === '') {
        throw new Error('Please enter both Total Classes Conducted and Classes Attended.');
      }

      const held = Number(heldStr);
      const attended = Number(attendedStr);

      if (!Number.isInteger(held) || held <= 0) {
        throw new Error('Total Classes Conducted must be a positive whole number greater than zero.');
      }
      if (!Number.isInteger(attended) || attended < 0) {
        throw new Error('Classes Attended must be a whole number greater than or equal to zero.');
      }
      if (attended > held) {
        throw new Error('Classes Attended cannot exceed Total Classes Conducted.');
      }

      await api.recordSubjectAttendance({
        subjectRecordId: sub.id,
        classesHeld: held,
        classesAttended: attended,
        remarks: editSubjectRemarks.trim() || undefined,
        facultyId: user.id,
      });

      setEditingSubjectId(null);
      setNotificationMsg({ type: 'success', text: `Attendance saved for ${sub.subject_name}. Percentage calculated automatically.` });
      await loadData();
    } catch (err: any) {
      setNotificationMsg({ type: 'error', text: err.message || 'Failed to save attendance.' });
    }
  };

  const handleOpenSubjectDecision = (
    sub: SubjectAttendanceRecord,
    type: 'APPROVE' | 'REJECT' | 'CORRECTION_REQUIRED'
  ) => {
    setDecisionModalSub(sub);
    setDecisionType(type);
    setDecisionRemarks('');
  };

  const handleConfirmSubjectDecision = async () => {
    if (!user || !decisionModalSub) return;
    try {
      setNotificationMsg(null);
      if (decisionType === 'REJECT' && !decisionRemarks.trim()) {
        throw new Error('Please provide an explanation when rejecting attendance.');
      }
      if (decisionType === 'CORRECTION_REQUIRED' && !decisionRemarks.trim()) {
        throw new Error('Please provide instructions for the required correction.');
      }

      await api.processSubjectTeacherDecision({
        subjectRecordId: decisionModalSub.id,
        facultyId: user.id,
        decision: decisionType,
        remarks: decisionRemarks.trim() || undefined,
      });

      setDecisionModalSub(null);
      setNotificationMsg({
        type: 'success',
        text: `Subject ${decisionModalSub.subject_name} marked as ${
          decisionType === 'APPROVE'
            ? 'Approved'
            : decisionType === 'REJECT'
            ? 'Rejected'
            : 'Correction Required'
        }.`,
      });
      await loadData();
    } catch (err: any) {
      setNotificationMsg({ type: 'error', text: err.message || 'Operation failed.' });
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
                    <th className="p-4">Subject Approvals</th>
                    <th className="p-4">Eligibility</th>
                    <th className="p-4">Academic Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredRequests.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500">
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
                      const hasAttendanceEntered =
                        acad?.attendance_percentage !== null &&
                        acad?.attendance_percentage !== undefined &&
                        acad?.attendance_status === 'ENTERED';

                      const isAttendanceIncomplete =
                        acad?.attendance_status === 'ATTENDANCE_INCOMPLETE';

                      const isEligible = hasAttendanceEntered && acad!.attendance_percentage! >= threshold;
                      const isAllSubjectApproved = acad?.all_subject_approvals_completed !== false;
                      const canApproveAcademic = hasAttendanceEntered && isEligible && isAllSubjectApproved;

                      let approveTitle = 'Approve Academic Verification';
                      if (!hasAttendanceEntered) {
                        approveTitle = 'Academic approval blocked: Attendance awaiting subject faculty entry.';
                      } else if (!isEligible) {
                        approveTitle = `Blocked: Attendance ${acad?.attendance_percentage}% is below ${threshold}% threshold`;
                      } else if (!isAllSubjectApproved) {
                        approveTitle = `Academic verification blocked: Waiting for all subject teachers to approve (${acad?.subject_approvals_count || 0}/${acad?.subject_approvals_total || 0} approved). Waiting on: ${acad?.pending_approval_subjects?.join(', ')}`;
                      }

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
                            {hasAttendanceEntered ? (
                              <>
                                <span className={isEligible ? 'text-emerald-400' : 'text-rose-400'}>
                                  {acad!.attendance_percentage}%
                                </span>
                                <span className="text-[10px] text-slate-500 block">min {threshold}%</span>
                              </>
                            ) : isAttendanceIncomplete ? (
                              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold">
                                Incomplete
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-bold">
                                Awaiting Entry
                              </span>
                            )}
                          </td>
                          <td className="p-4">
                            {acad?.subject_approvals_total ? (
                              <div>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border inline-flex items-center gap-1 ${
                                    acad.all_subject_approvals_completed
                                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                      : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                  }`}
                                >
                                  {acad.all_subject_approvals_completed ? (
                                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                  ) : (
                                    <Clock className="w-3 h-3 text-amber-400" />
                                  )}
                                  {acad.subject_approvals_count} / {acad.subject_approvals_total} Approved
                                </span>
                                {acad.pending_approval_subjects && acad.pending_approval_subjects.length > 0 && (
                                  <p className="text-[10px] text-slate-400 italic mt-0.5 line-clamp-1">
                                    Waiting: {acad.pending_approval_subjects.join(', ')}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-500 text-[10px]">—</span>
                            )}
                          </td>
                          <td className="p-4">
                            {hasAttendanceEntered ? (
                              isEligible ? (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                                  ELIGIBLE
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold">
                                  NOT ELIGIBLE
                                </span>
                              )
                            ) : isAttendanceIncomplete ? (
                              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold">
                                PARTIAL
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-bold">
                                PENDING ENTRY
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
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveTab('attendance');
                                  setSearchQuery(student?.student_id || student?.full_name || '');
                                }}
                                className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-indigo-950/60 hover:bg-indigo-900/80 text-indigo-300 border border-indigo-700/50 transition flex items-center gap-1"
                                title="Enter or update subject attendance"
                              >
                                <Percent className="w-3.5 h-3.5" />
                                Attendance
                              </button>

                              {req.faculty_status?.toUpperCase() !== 'APPROVED' && (
                                <button
                                  type="button"
                                  onClick={() => handleApproveAcademic(req)}
                                  disabled={!canApproveAcademic}
                                  title={approveTitle}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                                    canApproveAcademic
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

      {/* Tab 3: Subject-Wise Attendance Management (Section 33.B & 33.C) */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-blue-950/20 border border-blue-900/40 text-xs text-blue-300 flex items-start gap-3">
            <Percent className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Subject-Wise Attendance Entry & Automatic Overall Calculation</p>
              <p className="mt-0.5 leading-relaxed text-slate-300">
                Section 33: Authorized subject faculty members enter attendance percentage or class counts for their assigned subjects. The institutional engine automatically calculates overall attendance across all required subjects once complete and validates against the {threshold}% threshold.
              </p>
            </div>
          </div>

          {/* Section 1: Assigned Subject Attendance Queue */}
          <div className="glass-panel rounded-3xl border border-slate-700/80 shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold text-slate-100">Assigned Subject Records Awaiting / Entered</h3>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                {subjectAttendanceRecords.filter((s) => s.faculty_id === user.id || user.role === 'admin').length} assigned subject entries
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                  <tr>
                    <th className="p-4">Student</th>
                    <th className="p-4">Subject & Teacher</th>
                    <th className="p-4">Entry Status</th>
                    <th className="p-4">Attendance Value</th>
                    <th className="p-4">Approval Status</th>
                    <th className="p-4">Remarks</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {subjectAttendanceRecords
                    .filter((s) => s.faculty_id === user.id || user.role === 'admin')
                    .filter((s) => {
                      const student = students.find((st) => st.id === s.student_id);
                      return (
                        !searchQuery ||
                        s.subject_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        student?.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        student?.student_id?.toLowerCase().includes(searchQuery.toLowerCase())
                      );
                    })
                    .map((sub) => {
                      const isEditing = editingSubjectId === sub.id;
                      const student = students.find((st) => st.id === sub.student_id);
                      const isEntered = sub.status === 'ENTERED' && sub.attendance_percentage !== null;
                      const isAssignedTeacher = sub.faculty_id === user.id || user.role === 'admin';
                      const isApproved = sub.approval_status === 'APPROVED';
                      const isRejected = sub.approval_status === 'REJECTED';
                      const isCorrectionRequired = sub.approval_status === 'CORRECTION_REQUIRED';

                      return (
                        <tr key={sub.id} className="hover:bg-slate-800/30 transition">
                          <td className="p-4">
                            <p className="font-bold text-slate-200">{student?.full_name || 'Student'}</p>
                            <p className="font-mono text-slate-400 text-[11px]">{student?.student_id || sub.student_id}</p>
                          </td>
                          <td className="p-4">
                            <p className="font-semibold text-slate-200">{sub.subject_name}</p>
                            <p className="text-slate-500 text-[11px]">Sem {sub.semester} ({sub.academic_year})</p>
                            <p className="text-[10px] text-indigo-400 mt-0.5">Teacher: {sub.faculty_name}</p>
                          </td>
                          <td className="p-4">
                            {isEntered ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                                ENTERED
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold">
                                AWAITING ENTRY
                              </span>
                            )}
                          </td>
                          <td className="p-4 font-mono font-bold">
                            {isEditing ? (
                              <div className="space-y-1.5 min-w-[220px]">
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold mb-0.5">
                                      Conducted <span className="text-rose-400">*</span>
                                    </label>
                                    <input
                                      type="number"
                                      min="1"
                                      step="1"
                                      placeholder="e.g. 40"
                                      value={editClassesHeld}
                                      onChange={(e) => setEditClassesHeld(e.target.value)}
                                      className="w-full px-2 py-1 rounded bg-slate-900 border border-indigo-500 text-slate-100 text-xs font-mono focus:outline-none"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold mb-0.5">
                                      Attended <span className="text-rose-400">*</span>
                                    </label>
                                    <input
                                      type="number"
                                      min="0"
                                      step="1"
                                      placeholder="e.g. 34"
                                      value={editClassesAttended}
                                      onChange={(e) => setEditClassesAttended(e.target.value)}
                                      className="w-full px-2 py-1 rounded bg-slate-900 border border-indigo-500 text-slate-100 text-xs font-mono focus:outline-none"
                                    />
                                  </div>
                                </div>

                                {/* Live calculated percentage preview (Section 34.A & B) */}
                                <div className="flex items-center justify-between text-[11px] pt-0.5">
                                  <span className="text-slate-400 text-[10px]">Calculated:</span>
                                  {(() => {
                                    const h = Number(editClassesHeld);
                                    const a = Number(editClassesAttended);
                                    const hasHeld = editClassesHeld !== '' && !isNaN(h);
                                    const hasAtt = editClassesAttended !== '' && !isNaN(a);

                                    if (!hasHeld || !hasAtt) {
                                      return <span className="text-slate-500 italic text-[10px]">Enter both counts</span>;
                                    }
                                    if (!Number.isInteger(h) || h <= 0) {
                                      return <span className="text-rose-400 text-[10px]">Conducted &gt; 0</span>;
                                    }
                                    if (!Number.isInteger(a) || a < 0) {
                                      return <span className="text-rose-400 text-[10px]">Attended &ge; 0</span>;
                                    }
                                    if (a > h) {
                                      return <span className="text-rose-400 text-[10px]">Attended &gt; Conducted!</span>;
                                    }
                                    const calc = Math.round((a / h) * 10000) / 100;
                                    return (
                                      <span className={`font-mono font-bold text-xs px-2 py-0.5 rounded ${calc >= threshold ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'}`}>
                                        {calc.toFixed(2)}%
                                      </span>
                                    );
                                  })()}
                                </div>
                              </div>
                            ) : isEntered ? (
                              <div>
                                <span className={sub.attendance_percentage! >= threshold ? 'text-emerald-400 text-sm' : 'text-rose-400 text-sm'}>
                                  {sub.attendance_percentage}%
                                </span>
                                {(typeof sub.classes_held === 'number' || typeof (sub as any).classes_conducted === 'number') && typeof sub.classes_attended === 'number' && (
                                  <span className="text-[10px] text-slate-500 block font-normal">
                                    {sub.classes_attended} / {sub.classes_held ?? (sub as any).classes_conducted} classes
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 italic text-[11px] font-medium bg-slate-800/80 px-2 py-1 rounded border border-slate-700/60">
                                Attendance Not Entered
                              </span>
                            )}
                          </td>
                          <td className="p-4">
                            {isApproved ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold inline-flex items-center gap-1">
                                <Check className="w-3 h-3 text-emerald-400" />
                                Approved
                              </span>
                            ) : isRejected ? (
                              <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold inline-flex items-center gap-1">
                                <X className="w-3 h-3 text-rose-400" />
                                Rejected
                              </span>
                            ) : isCorrectionRequired ? (
                              <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[10px] font-bold inline-flex items-center gap-1">
                                <RotateCcw className="w-3 h-3 text-purple-400" />
                                Correction Required
                              </span>
                            ) : isEntered ? (
                              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold inline-flex items-center gap-1">
                                <Clock className="w-3 h-3 text-amber-400" />
                                Awaiting Approval
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-bold inline-flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-400" />
                                Waiting for Attendance
                              </span>
                            )}
                          </td>
                          <td className="p-4">
                            {isEditing ? (
                              <input
                                type="text"
                                placeholder="Remarks..."
                                value={editSubjectRemarks}
                                onChange={(e) => setEditSubjectRemarks(e.target.value)}
                                className="w-full px-2 py-1 rounded bg-slate-900 border border-indigo-500 text-slate-100 text-xs"
                              />
                            ) : (
                              <span className="text-slate-400 italic">
                                {sub.approval_remarks || sub.rejection_remarks || sub.remarks || '—'}
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-right">
                            {isEditing ? (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleSaveSubjectAttendance(sub)}
                                  className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm"
                                  title="Save Attendance"
                                >
                                  <Save className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingSubjectId(null)}
                                  className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
                                  title="Cancel"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-end gap-1.5">
                                {isAssignedTeacher ? (
                                  <>
                                    {!sub.is_locked ? (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingSubjectId(sub.id);
                                          setEditClassesHeld(sub.classes_held !== undefined ? String(sub.classes_held) : ((sub as any).classes_conducted !== undefined ? String((sub as any).classes_conducted) : ''));
                                          setEditClassesAttended(sub.classes_attended !== undefined ? String(sub.classes_attended) : '');
                                          setEditSubjectRemarks(sub.remarks || '');
                                        }}
                                        className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-indigo-600 transition"
                                        title="Enter / Edit Attendance"
                                      >
                                        <Edit2 className="w-3.5 h-3.5" />
                                      </button>
                                    ) : (
                                      <span className="p-1.5 text-slate-500" title="Attendance locked after approval">
                                        <Lock className="w-3.5 h-3.5" />
                                      </span>
                                    )}

                                    {/* Individual Teacher Approval Button (Section 35.2) */}
                                    <button
                                      type="button"
                                      onClick={() => handleOpenSubjectDecision(sub, 'APPROVE')}
                                      disabled={!isEntered || isApproved}
                                      title={
                                        !isEntered
                                          ? 'Approval blocked: Enter and save valid attendance first.'
                                          : isApproved
                                          ? 'Attendance already approved by subject teacher.'
                                          : 'Approve Attendance for this Subject'
                                      }
                                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                                        isEntered && !isApproved
                                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
                                          : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                                      }`}
                                    >
                                      <Check className="w-3 h-3" />
                                      Approve
                                    </button>

                                    {/* Reject Button */}
                                    <button
                                      type="button"
                                      onClick={() => handleOpenSubjectDecision(sub, 'REJECT')}
                                      title="Reject attendance for this subject"
                                      className="p-1.5 rounded-lg text-rose-300 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/50 transition"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>

                                    {/* Request Correction Button */}
                                    <button
                                      type="button"
                                      onClick={() => handleOpenSubjectDecision(sub, 'CORRECTION_REQUIRED')}
                                      title="Request attendance correction"
                                      className="p-1.5 rounded-lg text-purple-300 bg-purple-950/40 hover:bg-purple-900/60 border border-purple-800/50 transition"
                                    >
                                      <RotateCcw className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                ) : (
                                  <span className="text-[10px] text-slate-500 italic">
                                    Assigned to {sub.faculty_name}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: Calculated Student Overall Standing */}
          <div className="glass-panel rounded-3xl border border-slate-700/80 shadow-2xl overflow-hidden mt-8">
            <div className="p-4 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-slate-100">Overall Calculated Student Standings</h3>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                Mandatory Threshold: min {threshold}%
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                  <tr>
                    <th className="p-4">Student</th>
                    <th className="p-4">Academic Period</th>
                    <th className="p-4">Overall Attendance %</th>
                    <th className="p-4">Calculation Method</th>
                    <th className="p-4">Eligibility Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {academicRecords.map((rec) => {
                    const hasEntered = rec.attendance_percentage !== null && rec.attendance_status === 'ENTERED';
                    const isIncomplete = rec.attendance_status === 'ATTENDANCE_INCOMPLETE';
                    const isEligible = hasEntered && rec.attendance_percentage! >= threshold;

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
                          {hasEntered ? (
                            <span className={isEligible ? 'text-emerald-400 text-sm' : 'text-rose-400 text-sm'}>
                              {rec.attendance_percentage}%
                            </span>
                          ) : isIncomplete ? (
                            <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold">
                              Incomplete
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-bold">
                              Awaiting Entry
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-slate-400">
                          {rec.calculation_details || 'Awaiting entry of all required subjects.'}
                        </td>
                        <td className="p-4">
                          {hasEntered ? (
                            isEligible ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                                ELIGIBLE
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold">
                                SHORTAGE (&lt;{threshold}%)
                              </span>
                            )
                          ) : isIncomplete ? (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold">
                              PARTIAL ENTRY
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-bold">
                              AWAITING ENTRY
                            </span>
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

      {/* Section 35: Individual Subject Decision Modal */}
      {decisionModalSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="glass-panel w-full max-w-md rounded-3xl p-6 border border-slate-700 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                {decisionType === 'APPROVE' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                {decisionType === 'REJECT' && <XCircle className="w-5 h-5 text-rose-400" />}
                {decisionType === 'CORRECTION_REQUIRED' && <RotateCcw className="w-5 h-5 text-purple-400" />}
                <h3 className="font-bold text-slate-100 text-sm">
                  {decisionType === 'APPROVE' && 'Approve Subject Attendance'}
                  {decisionType === 'REJECT' && 'Reject Subject Attendance'}
                  {decisionType === 'CORRECTION_REQUIRED' && 'Request Attendance Correction'}
                </h3>
              </div>
              <button
                onClick={() => setDecisionModalSub(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1 text-xs">
              <p className="text-slate-400">
                Subject: <span className="text-slate-200 font-bold">{decisionModalSub.subject_name}</span>
              </p>
              <p className="text-slate-400">
                Attendance:{' '}
                <span className="font-mono font-bold text-slate-100">
                  {decisionModalSub.attendance_percentage}%
                </span>{' '}
                ({decisionModalSub.classes_attended} / {decisionModalSub.classes_held ?? (decisionModalSub as any).classes_conducted} classes)
              </p>
              <p className="text-slate-400">
                Assigned Teacher: <span className="text-slate-200">{decisionModalSub.faculty_name}</span>
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                {decisionType === 'APPROVE'
                  ? 'Remarks (Optional)'
                  : 'Explanation / Instructions (Mandatory)'}
              </label>
              <textarea
                rows={3}
                value={decisionRemarks}
                onChange={(e) => setDecisionRemarks(e.target.value)}
                placeholder={
                  decisionType === 'APPROVE'
                    ? 'e.g. Verified against lecture log.'
                    : decisionType === 'REJECT'
                    ? 'e.g. Student attendance discrepancy observed.'
                    : 'e.g. Please re-verify lab attendance records for week 4.'
                }
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setDecisionModalSub(null)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSubjectDecision}
                className={`px-4 py-1.5 rounded-xl text-white text-xs font-bold shadow-md transition ${
                  decisionType === 'APPROVE'
                    ? 'bg-emerald-600 hover:bg-emerald-500'
                    : decisionType === 'REJECT'
                    ? 'bg-rose-600 hover:bg-rose-500'
                    : 'bg-purple-600 hover:bg-purple-500'
                }`}
              >
                Confirm Decision
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
