// ==============================================================================
// COLLEGE NO-DUE CLEARANCE MANAGEMENT SYSTEM
// NewRequest Page — Student-to-Faculty Clearance Initiation Flow
// Mandatory dynamic teacher selection step before request form presentation
// ==============================================================================

import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { UserProfile, Department } from '../types/database';
import {
  GraduationCap,
  Calendar,
  AlertCircle,
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
  Building,
  UserCheck,
  RefreshCw,
  User,
  ArrowLeft,
  Briefcase,
  Mail,
  Check,
} from 'lucide-react';

export const NewRequest: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Multi-step form state
  const [currentStep, setCurrentStep] = useState<'select_teacher' | 'form'>('select_teacher');

  // Teacher selection state (Dynamic from Database)
  const [teachers, setTeachers] = useState<UserProfile[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
  const [isLoadingTeachers, setIsLoadingTeachers] = useState(true);
  const [teacherLoadError, setTeacherLoadError] = useState<string | null>(null);

  // Form inputs (pre-populated from authenticated student profile)
  const [academicYear, setAcademicYear] = useState(user?.academic_year || '2026-2027');
  const [semester, setSemester] = useState<number>(user?.semester || 5);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (user && user.role === 'student') {
      loadTeachers();
    }
  }, [user]);

  const loadTeachers = async () => {
    if (!user) return;
    try {
      setIsLoadingTeachers(true);
      setTeacherLoadError(null);
      // Dynamically query database for active, authorized faculty in student's department
      const facultyList = await api.getFacultyForDepartment(user.department_id || user.department);
      setTeachers(facultyList);

      // If student already had a selected or pre-assigned faculty in this department, retain selection
      if (selectedTeacherId && facultyList.some((t) => t.id === selectedTeacherId)) {
        // Keep current selection
      } else if (user.assigned_faculty_id && facultyList.some((t) => t.id === user.assigned_faculty_id)) {
        setSelectedTeacherId(user.assigned_faculty_id);
      } else if (facultyList.length === 1) {
        setSelectedTeacherId(facultyList[0].id);
      } else {
        setSelectedTeacherId(null);
      }
    } catch (err: any) {
      console.error('Database query failed for department faculty:', err);
      setTeacherLoadError(err.message || 'Database error occurred while retrieving authorized faculty members.');
    } finally {
      setIsLoadingTeachers(false);
    }
  };

  if (!user || user.role !== 'student') {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-center">
        <p className="text-slate-400">Please sign in with your student credentials to submit a clearance request.</p>
      </div>
    );
  }

  const selectedTeacher = teachers.find((t) => t.id === selectedTeacherId);

  const handleContinueToForm = () => {
    if (!selectedTeacherId || !selectedTeacher) return;
    setSubmitError(null);
    setCurrentStep('form');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeacherId) {
      setSubmitError('Please select an authorized faculty member before submitting.');
      setCurrentStep('select_teacher');
      return;
    }

    setSubmitError(null);

    try {
      setIsSubmitting(true);
      // Trusted backend operation creates request, notifies faculty, and initiates review
      await api.createNoDueRequest(
        user.id,
        user.department,
        academicYear,
        semester,
        notes,
        selectedTeacherId
      );
      navigate('/student');
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to submit clearance request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6 lg:px-8 animate-in fade-in">
      <div className="glass-panel rounded-3xl p-6 sm:p-10 border border-slate-700/80 shadow-2xl relative overflow-hidden">
        {/* Header Section */}
        <div className="pb-6 border-b border-slate-700/60 mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">
                Cauvery Institute of Technology • VTU (2026–2027)
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-slate-100">
                Submit No-Due Clearance Request
              </h1>
              <p className="text-xs text-slate-400">
                Initiate formal academic verification and clearance workflow with your authorized faculty mentor
              </p>
            </div>
          </div>

          {/* Stepper Indicator */}
          <div className="flex items-center gap-2 mt-4 text-xs font-semibold">
            <span
              className={`px-3 py-1 rounded-full flex items-center gap-1.5 transition ${
                currentStep === 'select_teacher'
                  ? 'bg-blue-600 text-white font-bold shadow-sm shadow-blue-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 cursor-pointer'
              }`}
              onClick={() => setCurrentStep('select_teacher')}
            >
              <span>1. Select Faculty Advisor</span>
              {currentStep === 'form' && <Check className="w-3.5 h-3.5" />}
            </span>
            <span className="text-slate-600">/</span>
            <span
              className={`px-3 py-1 rounded-full flex items-center gap-1.5 transition ${
                currentStep === 'form'
                  ? 'bg-blue-600 text-white font-bold shadow-sm shadow-blue-500/30'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              <span>2. Request Details & Submission</span>
            </span>
          </div>
        </div>

        {/* Global Error Banner */}
        {submitError && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-950/40 border border-rose-500/50 text-rose-300 text-xs flex items-start gap-3 animate-in shake">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Submission Blocked</p>
              <p className="mt-0.5 leading-relaxed">{submitError}</p>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 1: MANDATORY TEACHER-SELECTION STEP                                   */}
        {/* ========================================================================= */}
        {currentStep === 'select_teacher' && (
          <div className="space-y-6 animate-in fade-in">
            {/* Student Department Info Banner */}
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-slate-400">Authenticated Student:</span>
                <p className="font-bold text-slate-200 mt-0.5">{user.full_name}</p>
              </div>
              <div>
                <span className="text-slate-400">Registration Number:</span>
                <p className="font-mono font-bold text-blue-400 mt-0.5">{user.student_id}</p>
              </div>
              <div>
                <span className="text-slate-400">Enrolled Department:</span>
                <p className="font-semibold text-slate-200 mt-0.5">{user.department}</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Select Your Assigned Academic Faculty Advisor <span className="text-blue-400">*</span>
              </label>
              <p className="text-[11px] text-slate-400 mb-3">
                Select the genuine, active faculty member authorized to conduct your academic and coursework verification for the {user.department} department.
              </p>

              {/* A. Loading State */}
              {isLoadingTeachers && (
                <div className="p-8 text-center rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col items-center justify-center gap-3">
                  <RefreshCw className="w-6 h-6 text-blue-400 animate-spin" />
                  <p className="text-xs text-slate-300 font-medium">
                    Querying database for authorized faculty members in {user.department}...
                  </p>
                </div>
              )}

              {/* B. Database Failure with Retry Action */}
              {!isLoadingTeachers && teacherLoadError && (
                <div className="p-6 rounded-2xl bg-rose-950/40 border border-rose-500/50 text-xs text-rose-300 space-y-3">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400 mt-0.5" />
                    <div>
                      <p className="font-bold text-sm">Database Communication Error</p>
                      <p className="mt-1 leading-relaxed">{teacherLoadError}</p>
                    </div>
                  </div>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={loadTeachers}
                      className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-2 transition"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Retry Loading Faculty</span>
                    </button>
                  </div>
                </div>
              )}

              {/* C. Zero Faculty Accounts Available (Mandatory Empty State Message) */}
              {!isLoadingTeachers && !teacherLoadError && teachers.length === 0 && (
                <div className="p-6 rounded-2xl bg-amber-950/30 border border-amber-500/40 text-xs text-amber-200 space-y-3">
                  <div className="flex items-start gap-3">
                    <ShieldAlert className="w-6 h-6 flex-shrink-0 text-amber-400 mt-0.5" />
                    <div className="space-y-2">
                      <p className="font-bold text-sm text-amber-100">No Eligible Faculty Available</p>
                      <p className="leading-relaxed">
                        No teachers are currently available for your department. Please contact the administrator. You can submit your No-Due request after an eligible teacher has been added.
                      </p>
                    </div>
                  </div>
                  <div className="pt-2 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={loadTeachers}
                      className="px-3.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-xs border border-amber-500/40 flex items-center gap-1.5 transition"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Check Again</span>
                    </button>
                    <span className="text-[11px] text-slate-400 italic">
                      Contact: Examination Records / Admin Office (examcell@cauvery.edu.in)
                    </span>
                  </div>
                </div>
              )}

              {/* D. List of Real, Eligible Teachers */}
              {!isLoadingTeachers && !teacherLoadError && teachers.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {teachers.map((teacher) => {
                    const isSelected = selectedTeacherId === teacher.id;
                    return (
                      <div
                        key={teacher.id}
                        onClick={() => setSelectedTeacherId(teacher.id)}
                        className={`p-4 rounded-2xl border cursor-pointer transition relative flex flex-col justify-between ${
                          isSelected
                            ? 'bg-blue-600/15 border-blue-500 shadow-md shadow-blue-500/10'
                            : 'bg-slate-900/70 border-slate-700/80 hover:border-slate-600 hover:bg-slate-900'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div
                              className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                                isSelected
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-slate-800 text-slate-300'
                              }`}
                            >
                              <User className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="font-bold text-slate-100 text-sm">
                                {teacher.full_name}
                              </p>
                              <p className="text-[11px] text-blue-400 font-medium flex items-center gap-1 mt-0.5">
                                <Briefcase className="w-3 h-3" />
                                {teacher.designation || 'Faculty / Academic Mentor'}
                              </p>
                              <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-1 font-mono">
                                <Mail className="w-3 h-3" />
                                {teacher.email}
                              </p>
                            </div>
                          </div>

                          <div
                            className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 transition ${
                              isSelected
                                ? 'bg-blue-600 border-blue-500 text-white'
                                : 'border-slate-600 bg-slate-800'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                          <span className="font-medium text-slate-300">
                            {teacher.department}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold">
                            Authorized Active
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Step 1 Actions */}
            <div className="flex items-center justify-between pt-6 border-t border-slate-800">
              <Link
                to="/student"
                className="text-xs font-semibold text-slate-400 hover:text-slate-200 transition"
              >
                Cancel and Return
              </Link>

              <button
                type="button"
                onClick={handleContinueToForm}
                disabled={!selectedTeacherId || teachers.length === 0 || isLoadingTeachers}
                className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-blue-900/30 transition flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span>Continue to Clearance Form</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 2: NO-DUE REQUEST FORM (DISPLAYED AFTER TEACHER SELECTION)            */}
        {/* ========================================================================= */}
        {currentStep === 'form' && selectedTeacher && (
          <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in">
            {/* Selected Faculty Confirmation Card */}
            <div className="p-4 rounded-2xl bg-blue-950/30 border border-blue-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-600 text-white flex-shrink-0">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">
                    Selected Faculty Advisor (Responsible Reviewer)
                  </span>
                  <p className="font-bold text-sm text-slate-100">
                    {selectedTeacher.full_name}
                  </p>
                  <p className="text-[11px] text-slate-300">
                    {selectedTeacher.designation || 'Academic Mentor'} • {selectedTeacher.email}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setCurrentStep('select_teacher')}
                className="px-3 py-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 font-bold text-xs border border-blue-500/40 transition flex items-center gap-1 self-start sm:self-center"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Change Selection</span>
              </button>
            </div>

            {/* Automatically Populated Student Details (Non-editable profile review) */}
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Verified Student Information (Auto-Populated from Profile)
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 text-[11px] block">Student Full Name</span>
                  <p className="font-bold text-slate-200 mt-0.5">{user.full_name}</p>
                </div>

                <div>
                  <span className="text-slate-500 text-[11px] block">Registration Number</span>
                  <p className="font-mono font-bold text-blue-400 mt-0.5">{user.student_id}</p>
                </div>

                <div>
                  <span className="text-slate-500 text-[11px] block">Academic Department</span>
                  <p className="font-semibold text-slate-200 mt-0.5">{user.department}</p>
                </div>

                <div>
                  <span className="text-slate-500 text-[11px] block">Institutional Email</span>
                  <p className="font-mono text-slate-300 mt-0.5 truncate">{user.email}</p>
                </div>
              </div>
            </div>

            {/* Academic Period Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Academic Year <span className="text-blue-400">*</span>
                </label>
                <select
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="2026-2027">2026–2027 (Current Academic Year)</option>
                  <option value="2025-2026">2025–2026</option>
                  <option value="2024-2025">2024–2025</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Semester <span className="text-blue-400">*</span>
                </label>
                <select
                  value={semester}
                  onChange={(e) => setSemester(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-blue-500"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                    <option key={s} value={s}>
                      Semester {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Additional Remarks */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Purpose / Student Remarks for Clearance
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. End-Term Examination Hall Ticket clearance..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-blue-500 placeholder:text-slate-500"
              />
            </div>

            {/* Routing & Workflow Pipeline Notice */}
            <div className="p-4 rounded-2xl bg-blue-950/20 border border-blue-900/40 text-xs text-blue-300 space-y-2">
              <div className="flex items-center gap-2 font-bold text-blue-200">
                <ShieldAlert className="w-4 h-4 text-blue-400" />
                <span>Automatic Routing & Clearance Protocol</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Upon clicking <strong>Submit No-Due Request</strong>, your application will be assigned directly to{' '}
                <strong>{selectedTeacher.full_name}</strong> in the faculty dashboard. You may change your assigned teacher from your student dashboard at any time until your teacher formally begins reviewing your request.
              </p>
            </div>

            {/* Step 2 Form Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setCurrentStep('select_teacher')}
                className="text-xs font-semibold text-slate-400 hover:text-slate-200 transition flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Teacher Selection</span>
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-blue-900/30 transition flex items-center gap-2 disabled:opacity-50"
              >
                <span>{isSubmitting ? 'Submitting to Backend...' : 'Submit No-Due Request'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
