// ==============================================================================
// COLLEGE NO-DUE CLEARANCE MANAGEMENT SYSTEM
// Student Dashboard (Section 6)
// Complete request tracking, payments, rejection history & hall ticket eligibility
// ==============================================================================

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { Engine } from '../services/store';
import {
  NoDueRequest,
  ClearanceItem,
  StudentAcademicRecord,
  RejectionHistoryItem,
  UserProfile,
} from '../types/database';
import { StatusBadge } from '../components/StatusBadge';
import { WorkflowTimeline } from '../components/WorkflowTimeline';
import { PaymentUploadModal } from '../components/PaymentUploadModal';
import {
  GraduationCap,
  Calendar,
  Building,
  UserCheck,
  Percent,
  CheckCircle2,
  AlertTriangle,
  CreditCard,
  RotateCcw,
  ShieldCheck,
  ExternalLink,
  Copy,
  Check,
  BookOpen,
  Wallet,
  FlaskConical,
  Award,
  FileText,
  Clock,
  Ticket,
  Lock,
  History,
  User,
  X,
  XCircle,
} from 'lucide-react';

export const StudentDashboard: React.FC = () => {
  const { user } = useAuth();

  const [requests, setRequests] = useState<NoDueRequest[]>([]);
  const [academicRecord, setAcademicRecord] = useState<StudentAcademicRecord | null>(null);
  const [threshold, setThreshold] = useState<number>(85);
  const [isLoading, setIsLoading] = useState(true);

  // Payment upload modal state
  const [selectedPaymentItem, setSelectedPaymentItem] = useState<ClearanceItem | null>(null);

  // Resubmission modal state
  const [showResubmitModal, setShowResubmitModal] = useState(false);
  const [resubmitComments, setResubmitComments] = useState('');
  const [isResubmitting, setIsResubmitting] = useState(false);
  const [resubmitError, setResubmitError] = useState<string | null>(null);

  // Change Teacher modal state (allowed until first faculty review begins)
  const [showChangeTeacherModal, setShowChangeTeacherModal] = useState(false);
  const [departmentTeachers, setDepartmentTeachers] = useState<UserProfile[]>([]);
  const [selectedNewTeacherIds, setSelectedNewTeacherIds] = useState<string[]>([]);
  const [selectedNewTeacherId, setSelectedNewTeacherId] = useState<string>('');
  const [changeTeacherReason, setChangeTeacherReason] = useState<string>('');
  const [isChangingTeacher, setIsChangingTeacher] = useState(false);
  const [changeTeacherError, setChangeTeacherError] = useState<string | null>(null);
  const [changeTeacherSuccess, setChangeTeacherSuccess] = useState<string | null>(null);

  const [copiedId, setCopiedId] = useState(false);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      const [reqs, thresh] = await Promise.all([
        api.getRequestsForStudent(user.id),
        api.getAttendanceThreshold(),
      ]);

      setRequests(reqs);
      setThreshold(thresh);

      // Load academic record for active year & semester
      const activeYear = user.academic_year || '2026-2027';
      const activeSem = user.semester || 5;
      const acad = await api.getAcademicRecordForStudent(user.id, activeYear, activeSem);
      setAcademicRecord(acad);
    } catch (err) {
      console.error('Failed to load student data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const activeRequest = requests[0]; // Most recent request

  const handleCopyVerificationId = () => {
    if (activeRequest?.verification_id) {
      navigator.clipboard.writeText(activeRequest.verification_id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const handleResubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRequest || !user) return;
    try {
      setIsResubmitting(true);
      setResubmitError(null);
      await api.resubmitRequest(activeRequest.id, user.id, resubmitComments);
      setShowResubmitModal(false);
      setResubmitComments('');
      await loadData();
    } catch (err: any) {
      setResubmitError(err.message || 'Resubmission failed');
    } finally {
      setIsResubmitting(false);
    }
  };

  const toggleNewTeacherSelection = (teacherId: string) => {
    setSelectedNewTeacherIds((prev) => {
      const next = prev.includes(teacherId)
        ? prev.filter((id) => id !== teacherId)
        : [...prev, teacherId];
      setSelectedNewTeacherId(next[0] || '');
      return next;
    });
  };

  const openChangeTeacherModal = async () => {
    if (!activeRequest || !user) return;
    try {
      setChangeTeacherError(null);
      setChangeTeacherSuccess(null);
      const faculty = await api.getFacultyForDepartment(user.department_id || user.department);
      setDepartmentTeachers(faculty);

      const currentlyAssignedIds = (activeRequest.assigned_faculty_ids && activeRequest.assigned_faculty_ids.length > 0)
        ? activeRequest.assigned_faculty_ids
        : (activeRequest.assigned_faculty_id ? [activeRequest.assigned_faculty_id] : []);

      const eligibleOthers = faculty.filter((t) => !currentlyAssignedIds.includes(t.id));
      if (eligibleOthers.length > 0) {
        setSelectedNewTeacherIds([eligibleOthers[0].id]);
        setSelectedNewTeacherId(eligibleOthers[0].id);
      } else {
        setSelectedNewTeacherIds([]);
        setSelectedNewTeacherId('');
      }
      setShowChangeTeacherModal(true);
    } catch (err: any) {
      console.error('Failed to load department faculty for change:', err);
      setChangeTeacherError(err.message || 'Failed to load faculty list.');
    }
  };

  const handleConfirmChangeTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRequest || !user || selectedNewTeacherIds.length === 0) return;
    try {
      setIsChangingTeacher(true);
      setChangeTeacherError(null);

      const result = await api.reassignTeacher({
        requestId: activeRequest.id,
        newFacultyIds: selectedNewTeacherIds,
        newFacultyId: selectedNewTeacherIds[0],
        userId: user.id,
        role: 'student',
        reason: changeTeacherReason.trim() || undefined,
      });

      setShowChangeTeacherModal(false);
      setChangeTeacherReason('');
      const names = result.request.assigned_faculty_names?.join(', ') || result.request.assigned_faculty_name;
      setChangeTeacherSuccess(
        `Faculty assignment updated: Request ${activeRequest.request_code} has been successfully reassigned to ${names}.`
      );
      await loadData();
    } catch (err: any) {
      setChangeTeacherError(err.message || 'Faculty reassignment rejected.');
    } finally {
      setIsChangingTeacher(false);
    }
  };

  if (!user || user.role !== 'student') {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-center">
        <p className="text-slate-400">Please sign in as a student to view this dashboard.</p>
      </div>
    );
  }

  const hasAttendanceEntered =
    academicRecord?.attendance_percentage !== null &&
    academicRecord?.attendance_percentage !== undefined &&
    academicRecord?.attendance_status === 'ENTERED';

  const isAttendanceIncomplete =
    academicRecord?.attendance_status === 'ATTENDANCE_INCOMPLETE';

  const isEligibleForAcademic = hasAttendanceEntered
    ? (academicRecord!.attendance_percentage! >= threshold)
    : false;

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8 animate-in fade-in">
      {/* 1. Student Identity & Attendance Banner */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-700/80 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-blue-500/30 border border-blue-400/30 flex-shrink-0">
              {user.full_name.charAt(0)}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-black text-slate-100">{user.full_name}</h1>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 font-mono text-xs font-bold">
                  {user.student_id}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 flex flex-wrap items-center gap-3">
                <span className="flex items-center gap-1">
                  <Building className="w-3.5 h-3.5 text-blue-400" />
                  {user.department}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-purple-400" />
                  Semester {user.semester || 5} ({user.batch || '2022-2026'})
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Advisor: {activeRequest?.assigned_faculty_names && activeRequest.assigned_faculty_names.length > 0
                    ? activeRequest.assigned_faculty_names.join(', ')
                    : (activeRequest?.assigned_faculty_name || user.assigned_faculty_name || 'Not Assigned')}
                </span>
              </p>
            </div>
          </div>

          {/* Dynamic Attendance & Eligibility Box (Section 7.2 & 33.E) */}
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-900/90 border border-slate-700/80">
            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Term Attendance
              </span>
              <div className="flex items-baseline justify-end gap-1">
                {hasAttendanceEntered ? (
                  <>
                    <span className="text-2xl font-black text-slate-100 font-mono">
                      {academicRecord.attendance_percentage}%
                    </span>
                    <span className="text-[11px] text-slate-400">
                      / min {threshold}%
                    </span>
                  </>
                ) : isAttendanceIncomplete ? (
                  <span className="text-xs font-bold text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/30">
                    Attendance Incomplete
                  </span>
                ) : (
                  <span className="text-xs font-bold text-slate-300 bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
                    Awaiting Faculty Entry
                  </span>
                )}
              </div>
            </div>

            <div className="h-10 w-[1px] bg-slate-700"></div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Eligibility
              </span>
              {hasAttendanceEntered ? (
                isEligibleForAcademic ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold shadow-sm shadow-emerald-500/20">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    ELIGIBLE
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-bold">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                    SHORTAGE (&lt;{threshold}%)
                  </span>
                )
              ) : isAttendanceIncomplete ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  PARTIAL
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-xs font-bold">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  PENDING
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Success banner for teacher change */}
      {changeTeacherSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/50 text-emerald-300 text-xs flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <p className="font-semibold">{changeTeacherSuccess}</p>
          </div>
          <button
            onClick={() => setChangeTeacherSuccess(null)}
            className="text-emerald-400 hover:text-emerald-200 transition text-xs"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. Active Request Section */}
      {activeRequest ? (
        <div className="space-y-6">
          {/* Main Request Header Card */}
          <div className="glass-panel rounded-3xl p-6 border border-slate-700/80 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-700/60">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/40">
                    {activeRequest.request_code || activeRequest.id}
                  </span>
                  <StatusBadge status={activeRequest.status} type="request" size="md" />
                </div>
                <h2 className="text-xl font-bold text-slate-100 mt-2">
                  Academic Year {activeRequest.academic_year} — Semester {activeRequest.semester}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Request Code: <span className="font-mono text-slate-300 font-semibold">{activeRequest.request_code || activeRequest.id}</span> • Submitted on {new Date(activeRequest.created_at).toLocaleDateString()}
                </p>
              </div>

              {/* Action Buttons: Resubmit or View Public Verify */}
              <div className="flex items-center gap-3">
                {activeRequest.status?.toUpperCase() === 'CLEARED' && activeRequest.verification_id && (
                  <Link
                    to={`/verify/${activeRequest.verification_id}`}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-900/30 transition flex items-center gap-1.5"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Live Public Verification
                  </Link>
                )}

                {['ACTION_REQUIRED', 'RESUBMISSION_REQUIRED', 'REJECTED'].includes(
                  activeRequest.status?.toUpperCase()
                ) && (
                  <button
                    type="button"
                    onClick={() => setShowResubmitModal(true)}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-lg shadow-amber-900/30 transition flex items-center gap-1.5 animate-pulse"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Resubmit Request
                  </button>
                )}
              </div>
            </div>

            {/* Responsible Faculty Advisor & Pre-Review Change Teacher Row */}
            <div className="my-5 p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center flex-shrink-0">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Assigned Academic Faculty Advisor(s)
                  </span>
                  <p className="font-bold text-slate-100 text-sm">
                    {activeRequest.assigned_faculty_names && activeRequest.assigned_faculty_names.length > 0
                      ? activeRequest.assigned_faculty_names.join(', ')
                      : (activeRequest.assigned_faculty_name || user.assigned_faculty_name || 'Not Assigned')}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Status:{' '}
                    {activeRequest.faculty_status === 'APPROVED' ? (
                      <span className="text-emerald-400 font-semibold">Coursework & Attendance Approved</span>
                    ) : activeRequest.faculty_status === 'REJECTED' ? (
                      <span className="text-rose-400 font-semibold">Action Required / Shortage</span>
                    ) : activeRequest.faculty_review_started_at ? (
                      <span className="text-amber-400 font-semibold">Review In Progress by Faculty</span>
                    ) : (
                      <span className="text-blue-400 font-semibold">Awaiting First Review</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Change Teacher Action or Locked Indicator */}
              <div>
                {activeRequest.faculty_status === 'PENDING' && !activeRequest.faculty_review_started_at ? (
                  <button
                    type="button"
                    onClick={openChangeTeacherModal}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-blue-900/30 transition self-start sm:self-auto"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Change Teacher</span>
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-700/80 text-[11px] font-medium text-slate-400">
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Review Commenced (Assignment Locked)</span>
                  </span>
                )}
              </div>
            </div>

            {/* Reassignment Audit History Block */}
            {activeRequest.reassignment_history && activeRequest.reassignment_history.length > 0 && (
              <div className="mb-5 p-4 rounded-2xl bg-slate-900/50 border border-slate-800 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-300 text-[11px] uppercase tracking-wider">
                  <History className="w-4 h-4 text-blue-400" />
                  <span>Teacher Reassignment Audit History</span>
                </div>
                <div className="space-y-2 pt-1">
                  {activeRequest.reassignment_history.map((record, idx) => (
                    <div
                      key={record.id || idx}
                      className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px]"
                    >
                      <div>
                        <span className="font-semibold text-slate-200">
                          {record.previous_faculty_name}
                        </span>
                        <span className="text-slate-500 mx-2">➔</span>
                        <span className="font-semibold text-blue-300">
                          {record.new_faculty_name}
                        </span>
                        {record.reason && (
                          <span className="text-slate-400 italic block sm:inline sm:ml-2">
                            ({record.reason})
                          </span>
                        )}
                      </div>
                      <span className="text-slate-400 font-mono text-[10px]">
                        {new Date(record.created_at).toLocaleString()} • {record.initiated_by_role.toUpperCase()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Workflow Timeline Visualizer */}
            <div className="mt-6">
              <WorkflowTimeline request={activeRequest} />
            </div>

            {/* Subject-Wise Attendance Breakdown & Multi-Subject Approval Status (Section 35.7) */}
            {academicRecord?.subject_entries && academicRecord.subject_entries.length > 0 && (
              <div className="mt-6 p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
                      <GraduationCap className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-100">Subject Attendance & Teacher Approvals</h4>
                      <p className="text-[11px] text-slate-400">
                        Section 35: Each subject teacher enters and explicitly approves attendance before academic verification can proceed
                      </p>
                    </div>
                  </div>
                  {(() => {
                    const totalSubs = academicRecord.subject_entries.length;
                    const approvedSubs = academicRecord.subject_entries.filter((s) => s.approval_status === 'APPROVED').length;
                    const allApproved = totalSubs > 0 && approvedSubs === totalSubs;
                    return (
                      <span className={`text-[11px] font-bold px-3 py-1 rounded-xl border flex items-center gap-1.5 ${
                        allApproved
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      }`}>
                        {allApproved ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Clock className="w-3.5 h-3.5 text-amber-400" />}
                        {approvedSubs} of {totalSubs} Teachers Approved
                      </span>
                    );
                  })()}
                </div>

                {/* Workflow Gating Explanation Banner (Section 35.7) */}
                {(() => {
                  const unapproved = academicRecord.subject_entries.filter((s) => s.approval_status !== 'APPROVED');
                  if (unapproved.length === 0) return null;
                  const rejected = unapproved.find((s) => s.approval_status === 'REJECTED');
                  const correction = unapproved.find((s) => s.approval_status === 'CORRECTION_REQUIRED');

                  return (
                    <div className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                      rejected
                        ? 'bg-rose-950/30 border-rose-800/50 text-rose-300'
                        : correction
                        ? 'bg-purple-950/30 border-purple-800/50 text-purple-300'
                        : 'bg-amber-950/30 border-amber-800/50 text-amber-300'
                    }`}>
                      <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">Next Workflow Stage Blocked</p>
                        <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                          {rejected
                            ? `Subject "${rejected.subject_name}" attendance was rejected by ${rejected.faculty_name}. Issue must be corrected and approved.`
                            : correction
                            ? `Subject "${correction.subject_name}" has corrections requested by ${correction.faculty_name}. Re-review is pending.`
                            : `Clearance progress is paused awaiting attendance approvals for: ${unapproved
                                .map((s) => `${s.subject_name} (${s.faculty_name})`)
                                .join(', ')}.`}
                        </p>
                      </div>
                    </div>
                  );
                })()}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {academicRecord.subject_entries.map((sub) => {
                    const isEntered = sub.status === 'ENTERED' && sub.attendance_percentage !== null;
                    const isApproved = sub.approval_status === 'APPROVED';
                    const isRejected = sub.approval_status === 'REJECTED';
                    const isCorrection = sub.approval_status === 'CORRECTION_REQUIRED';

                    return (
                      <div
                        key={sub.id}
                        className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2 hover:border-slate-700 transition"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-bold text-slate-200 line-clamp-1">{sub.subject_name}</p>
                          {isEntered ? (
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                              sub.attendance_percentage! >= threshold
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-rose-500/20 text-rose-300'
                            }`}>
                              {sub.attendance_percentage}%
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] font-bold">
                              Attendance Not Entered
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                          <span className="text-slate-500">Teacher:</span>
                          <span className="text-slate-300 font-medium">{sub.faculty_name}</span>
                        </p>

                        {(typeof sub.classes_held === 'number' || typeof (sub as any).classes_conducted === 'number') && typeof sub.classes_attended === 'number' && (
                          <p className="text-[10px] text-slate-400 font-mono">
                            Attended: <span className="font-semibold text-slate-200">{sub.classes_attended}</span> / {sub.classes_held ?? (sub as any).classes_conducted} classes
                          </p>
                        )}

                        {/* Approval Status Badge */}
                        <div className="pt-1">
                          {isApproved ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              Approved by {sub.approved_by_name || sub.faculty_name}
                            </span>
                          ) : isRejected ? (
                            <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold inline-flex items-center gap-1">
                              <XCircle className="w-3 h-3 text-rose-400" />
                              Rejected
                            </span>
                          ) : isCorrection ? (
                            <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[10px] font-bold inline-flex items-center gap-1">
                              <RotateCcw className="w-3 h-3 text-purple-400" />
                              Correction Required
                            </span>
                          ) : isEntered ? (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold inline-flex items-center gap-1">
                              <Clock className="w-3 h-3 text-amber-400" />
                              Attendance Entered — Awaiting Approval
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-bold inline-flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              Waiting for Attendance
                            </span>
                          )}
                        </div>

                        {(sub.approval_remarks || sub.rejection_remarks || sub.remarks) && (
                          <p className="text-[10px] text-slate-400 italic line-clamp-1 border-t border-slate-800/60 pt-1">
                            "{sub.approval_remarks || sub.rejection_remarks || sub.remarks}"
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 3. Final Clearance & Hall Ticket Card (Sections 4 & 14) */}
          {activeRequest.status?.toUpperCase() === 'CLEARED' && (
            <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-emerald-500/40 bg-emerald-950/20 shadow-2xl relative overflow-hidden animate-in fade-in">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    OFFICIALLY CLEARED & VERIFIED
                  </div>
                  <h3 className="text-2xl font-black text-slate-100">
                    No-Due Clearance Complete
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
                    All academic, library, accounts, laboratory, and departmental dues have been formally satisfied and verified by the Head of Department.
                  </p>
                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <span className="text-xs text-slate-400">Official Verification ID:</span>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-emerald-500/40 font-mono text-sm font-bold text-emerald-300 shadow-inner">
                      <span>{activeRequest.verification_id}</span>
                      <button
                        onClick={handleCopyVerificationId}
                        className="text-slate-400 hover:text-emerald-300 transition"
                        title="Copy Verification ID"
                      >
                        {copiedId ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Hall Ticket Eligibility & Release State (Section 6 Stage 6) */}
                <div className="p-5 rounded-2xl bg-slate-900/90 border border-emerald-500/30 flex flex-col justify-between space-y-3 min-w-[260px]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Ticket className="w-4 h-4 text-emerald-400" />
                      Hall Ticket Eligibility
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-bold">
                      {activeRequest.hall_ticket_eligibility}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">System State:</span>
                    <p className="text-sm font-black text-emerald-300 tracking-wide font-mono">
                      ELIGIBLE — NOT YET RELEASED
                    </p>
                  </div>
                  <p className="text-[10px] text-slate-400 italic">
                    Eligibility is distinct from Hall Ticket release. Institutional release will be enabled during the VTU examination schedule window.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 4. Discrete Clearance Authorities Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Library Clearance Card */}
            {(() => {
              const item = activeRequest.clearance_items?.find((i) => i.authority === 'library');
              const isPaymentReq = item?.payment_required && (item.payment_status?.toUpperCase() === 'PENDING_PAYMENT' || (item.payment_status as string) === 'required');
              return (
                <div className="glass-card rounded-2xl p-5 border border-slate-700/80 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400">
                          <BookOpen className="w-4 h-4" />
                        </div>
                        <h4 className="text-sm font-bold text-slate-100">Central Library</h4>
                      </div>
                      <StatusBadge status={item?.status || 'pending'} type="stage" size="sm" />
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {item?.remarks || 'Overdue books and library desk fine clearance.'}
                    </p>
                  </div>

                  {isPaymentReq && (
                    <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/40 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-amber-300">
                        <span className="flex items-center gap-1">
                          <CreditCard className="w-3.5 h-3.5" /> Fine Due:
                        </span>
                        <span className="font-mono text-sm">₹ {item.payment_amount?.toFixed(2)}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-2">
                        {item.payment_instructions || 'Scan QR and pay to clear book dues.'}
                      </p>
                      <button
                        type="button"
                        onClick={() => setSelectedPaymentItem(item)}
                        className="w-full py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-md transition flex items-center justify-center gap-1.5"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        Pay & Upload Screenshot
                      </button>
                    </div>
                  )}

                  {(item?.payment_status?.toUpperCase() === 'PENDING_REVIEW' || (item?.payment_status as string) === 'screenshot_uploaded') && (
                    <div className="p-2.5 rounded-xl bg-blue-950/40 border border-blue-500/30 text-xs text-blue-300 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-400 flex-shrink-0" />
                      <span>Payment evidence uploaded. Awaiting faculty confirmation.</span>
                    </div>
                  )}

                  {(item?.payment_status?.toUpperCase() === 'CONFIRMED' || (item?.payment_status as string) === 'verified_by_faculty') && (
                    <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <span>Payment confirmed by faculty advisor. Awaiting library final sign-off.</span>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Accounts Clearance Card */}
            {(() => {
              const item = activeRequest.clearance_items?.find((i) => i.authority === 'accounts');
              const isPaymentReq = item?.payment_required && (item.payment_status?.toUpperCase() === 'PENDING_PAYMENT' || (item.payment_status as string) === 'required');
              return (
                <div className="glass-card rounded-2xl p-5 border border-slate-700/80 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                          <Wallet className="w-4 h-4" />
                        </div>
                        <h4 className="text-sm font-bold text-slate-100">Accounts & Finance</h4>
                      </div>
                      <StatusBadge status={item?.status || 'pending'} type="stage" size="sm" />
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {item?.remarks || 'Tuition fees, semester charges, and exam fee clearance.'}
                    </p>
                  </div>

                  {isPaymentReq && (
                    <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/40 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-amber-300">
                        <span className="flex items-center gap-1">
                          <CreditCard className="w-3.5 h-3.5" /> Dues Amount:
                        </span>
                        <span className="font-mono text-sm">₹ {item.payment_amount?.toFixed(2)}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-2">
                        {item.payment_instructions || 'Scan QR and upload receipt.'}
                      </p>
                      <button
                        type="button"
                        onClick={() => setSelectedPaymentItem(item)}
                        className="w-full py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-md transition flex items-center justify-center gap-1.5"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        Pay & Upload Screenshot
                      </button>
                    </div>
                  )}

                  {(item?.payment_status?.toUpperCase() === 'PENDING_REVIEW' || (item?.payment_status as string) === 'screenshot_uploaded') && (
                    <div className="p-2.5 rounded-xl bg-blue-950/40 border border-blue-500/30 text-xs text-blue-300 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-400 flex-shrink-0" />
                      <span>Payment evidence uploaded. Awaiting faculty confirmation.</span>
                    </div>
                  )}

                  {(item?.payment_status?.toUpperCase() === 'CONFIRMED' || (item?.payment_status as string) === 'verified_by_faculty') && (
                    <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <span>Payment confirmed by faculty advisor. Awaiting accounts final sign-off.</span>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Laboratory Clearance Card */}
            {(() => {
              const item = activeRequest.clearance_items?.find((i) => i.authority === 'lab');
              const isPaymentReq = item?.payment_required && (item.payment_status?.toUpperCase() === 'PENDING_PAYMENT' || (item.payment_status as string) === 'required');
              return (
                <div className="glass-card rounded-2xl p-5 border border-slate-700/80 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                          <FlaskConical className="w-4 h-4" />
                        </div>
                        <h4 className="text-sm font-bold text-slate-100">Laboratories</h4>
                      </div>
                      <StatusBadge status={item?.status || 'pending'} type="stage" size="sm" />
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {item?.remarks || 'Hardware workstation, apparatus, and lab consumables clearance.'}
                    </p>
                  </div>

                  {isPaymentReq && (
                    <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/40 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-amber-300">
                        <span className="flex items-center gap-1">
                          <CreditCard className="w-3.5 h-3.5" /> Breakage Due:
                        </span>
                        <span className="font-mono text-sm">₹ {item.payment_amount?.toFixed(2)}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-2">
                        {item.payment_instructions || 'Scan Lab QR to settle equipment breakage fee.'}
                      </p>
                      <button
                        type="button"
                        onClick={() => setSelectedPaymentItem(item)}
                        className="w-full py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-md transition flex items-center justify-center gap-1.5"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        Pay & Upload Screenshot
                      </button>
                    </div>
                  )}

                  {(item?.payment_status?.toUpperCase() === 'PENDING_REVIEW' || (item?.payment_status as string) === 'screenshot_uploaded') && (
                    <div className="p-2.5 rounded-xl bg-blue-950/40 border border-blue-500/30 text-xs text-blue-300 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-400 flex-shrink-0" />
                      <span>Payment evidence uploaded. Awaiting faculty confirmation.</span>
                    </div>
                  )}

                  {(item?.payment_status?.toUpperCase() === 'CONFIRMED' || (item?.payment_status as string) === 'verified_by_faculty') && (
                    <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <span>Payment confirmed by faculty advisor. Awaiting lab final sign-off.</span>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* 5. Rejection & Resubmission History (Section 10 & 12) */}
          {activeRequest.rejections && activeRequest.rejections.length > 0 && (
            <div className="glass-panel rounded-3xl p-6 border border-slate-700/80 shadow-xl space-y-4">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
                Rejection & Corrective Action History
              </h3>
              <p className="text-xs text-slate-400">
                Rule 2.12: Complete audit history of past decisions is permanently preserved.
              </p>

              <div className="divide-y divide-slate-800 border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/50">
                {activeRequest.rejections.map((rej) => (
                  <div key={rej.id} className="p-4 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold uppercase">
                          {rej.authority_or_stage}
                        </span>
                        <span className="text-xs font-semibold text-slate-200">
                          Category: {rej.rejection_category.replace(/_/g, ' ').toUpperCase()}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        {new Date(rej.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                      "{rej.explanation}"
                    </p>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                      <span>Rejected by: {rej.rejected_by_name || 'Authority Reviewer'}</span>
                      {rej.payment_required && (
                        <span className="text-amber-400 font-semibold">
                          Required Payment: ₹{rej.payment_amount}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* No active request state */
        <div className="glass-panel rounded-3xl p-12 text-center border border-slate-700/80 shadow-2xl space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center mx-auto">
            <Award className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-100">No Active No-Due Request</h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            You currently do not have an active No-Due Clearance request for Semester {user.semester || 5}. Click below to submit your request.
          </p>
          <Link
            to="/student/new-request"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-900/30 transition"
          >
            Submit No-Due Request
          </Link>
        </div>
      )}

      {/* Payment Upload Modal */}
      {selectedPaymentItem && (
        <PaymentUploadModal
          isOpen={Boolean(selectedPaymentItem)}
          onClose={() => setSelectedPaymentItem(null)}
          item={selectedPaymentItem}
          studentId={user.id}
          onSuccess={loadData}
          onSubmit={api.uploadPaymentScreenshot}
        />
      )}

      {/* Resubmission Modal */}
      {showResubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg glass-panel rounded-2xl border border-amber-500/30 p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700 mb-4">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-amber-400" />
                Resubmit Clearance Request
              </h3>
              <button
                onClick={() => setShowResubmitModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {resubmitError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-950/40 border border-rose-500/50 text-rose-300 text-xs">
                {resubmitError}
              </div>
            )}

            <form onSubmit={handleResubmit} className="space-y-4">
              <p className="text-xs text-slate-300">
                State the corrective actions you have taken (e.g. books returned, assignment submitted, or fee settled).
              </p>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Student Comments / Explanation <span className="text-amber-400">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={resubmitComments}
                  onChange={(e) => setResubmitComments(e.target.value)}
                  placeholder="e.g. Submitted remaining lab reports to faculty advisor on Oct 26..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowResubmitModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isResubmitting || !resubmitComments.trim()}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition disabled:opacity-50"
                >
                  {isResubmitting ? 'Submitting...' : 'Confirm Resubmission'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Teacher Modal (Available before review begins) */}
      {showChangeTeacherModal && activeRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg glass-panel rounded-2xl border border-blue-500/40 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">
                    Change Assigned Faculty Advisor
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Reassign clearance verification prior to faculty review commencement
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowChangeTeacherModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {changeTeacherError && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/50 text-rose-300 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <p>{changeTeacherError}</p>
              </div>
            )}

            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-1.5">
              <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                Currently Assigned Faculty Advisor(s)
              </span>
              <p className="font-bold text-slate-100 text-sm">
                {activeRequest.assigned_faculty_names && activeRequest.assigned_faculty_names.length > 0
                  ? activeRequest.assigned_faculty_names.join(', ')
                  : (activeRequest.assigned_faculty_name || 'Not Assigned')}
              </p>
              <p className="text-[11px] text-slate-400">
                Department: <span className="text-blue-300 font-medium">{user.department}</span> • Request: <span className="font-mono text-slate-300">{activeRequest.request_code}</span>
              </p>
            </div>

            <form onSubmit={handleConfirmChangeTeacher} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Select Replacement Faculty Advisor(s) <span className="text-blue-400">*</span>
                  </label>
                  <span className="text-[11px] font-mono text-blue-400 font-bold bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                    {selectedNewTeacherIds.length} Selected
                  </span>
                </div>
                {departmentTeachers.filter((t) => {
                  const assignedIds = activeRequest.assigned_faculty_ids && activeRequest.assigned_faculty_ids.length > 0
                    ? activeRequest.assigned_faculty_ids
                    : [activeRequest.assigned_faculty_id];
                  return !assignedIds.includes(t.id);
                }).length === 0 ? (
                  <p className="text-xs text-amber-300 p-3 rounded-xl bg-amber-950/30 border border-amber-500/30">
                    No alternative active faculty members are currently available in your department.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                    {departmentTeachers
                      .filter((t) => {
                        const assignedIds = activeRequest.assigned_faculty_ids && activeRequest.assigned_faculty_ids.length > 0
                          ? activeRequest.assigned_faculty_ids
                          : [activeRequest.assigned_faculty_id];
                        return !assignedIds.includes(t.id);
                      })
                      .map((teacher) => {
                        const isSelected = selectedNewTeacherIds.includes(teacher.id);
                        return (
                          <div
                            key={teacher.id}
                            onClick={() => toggleNewTeacherSelection(teacher.id)}
                            className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition select-none ${
                              isSelected
                                ? 'bg-blue-600/20 border-blue-500 text-white ring-1 ring-blue-500/40'
                                : 'bg-slate-900/60 border-slate-700/80 text-slate-300 hover:border-slate-600'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}}
                                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-slate-950 border-slate-700 pointer-events-none"
                              />
                              <div>
                                <p className="font-bold text-xs text-slate-100">{teacher.full_name}</p>
                                <p className="text-[10px] text-blue-400">
                                  {teacher.designation || 'Faculty Advisor'} • {teacher.email}
                                </p>
                              </div>
                            </div>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              Active
                            </span>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Reason for Reassignment <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={changeTeacherReason}
                  onChange={(e) => setChangeTeacherReason(e.target.value)}
                  placeholder="e.g. Assigned section mentor, batch transfer..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-blue-500 placeholder:text-slate-500"
                />
              </div>

              <div className="p-3 rounded-xl bg-blue-950/20 border border-blue-900/40 text-[11px] text-blue-300 space-y-1">
                <p className="font-bold">Workflow Continuity Protection:</p>
                <p className="text-slate-300 leading-relaxed">
                  Changing faculty preserves your request ID, submission date, all valid attendance records, and any completed clearance stages (such as Library, Accounts, or Lab). Only pending academic review tasks are routed to the newly assigned faculty.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowChangeTeacherModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isChangingTeacher || selectedNewTeacherIds.length === 0}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-blue-900/30 disabled:opacity-50"
                >
                  {isChangingTeacher ? (
                    <span>Reassigning...</span>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Confirm & Reassign ({selectedNewTeacherIds.length} Selected)</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
