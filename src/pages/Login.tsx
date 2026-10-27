// ==============================================================================
// CAUVERY INSTITUTE OF TECHNOLOGY (Affiliated to VTU)
// COLLEGE NO-DUE CLEARANCE MANAGEMENT SYSTEM
// Login & Account Self-Registration Portal (Sections 23, 24 & 28)
// Four Dedicated Authentication Options:
// 1. Student Login
// 2. Create Student Account
// 3. Staff Login
// 4. Create Staff Account
// ==============================================================================

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Engine } from '../services/store';
import { Department, UserRole } from '../types/database';
import {
  GraduationCap,
  KeyRound,
  User,
  Mail,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  Lock,
  UserPlus,
  Building,
  Calendar,
  CheckCircle2,
  LogIn,
  HelpCircle,
  X,
  Briefcase,
  Layers,
  BookOpen,
  Hash,
  ShieldAlert,
} from 'lucide-react';

export type AuthOption = 'student_login' | 'student_register' | 'staff_login' | 'staff_register';

export interface LoginProps {
  defaultMode?: 'login' | 'register' | 'signin' | 'signup' | 'student_login' | 'student_register' | 'staff_login' | 'staff_register';
}

export const Login: React.FC<LoginProps> = ({ defaultMode }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryMode = searchParams.get('mode') || searchParams.get('tab');

  // Determine initial auth option
  const resolveInitialOption = (): AuthOption => {
    const raw = (queryMode || defaultMode || '').toLowerCase();
    if (raw === 'staff_register' || raw === 'create_staff' || raw === 'staff-register') return 'staff_register';
    if (raw === 'staff_login' || raw === 'staff' || raw === 'staff-login') return 'staff_login';
    if (raw === 'student_register' || raw === 'register' || raw === 'signup' || raw === 'student-register') return 'student_register';
    return 'student_login';
  };

  const [authOption, setAuthOption] = useState<AuthOption>(resolveInitialOption());

  const {
    user,
    loginStudent,
    loginStaff,
    registerStudent,
    registerStaff,
    error,
    clearError,
  } = useAuth();

  // If user is already authenticated, redirect to their role-authorized dashboard or onboarding
  useEffect(() => {
    if (user) {
      if (user.role === 'student') navigate('/student', { replace: true });
      else if (user.role !== 'admin' && (user.is_verified === false || user.verification_status === 'PENDING' || user.verification_status === 'REJECTED')) {
        navigate('/staff/onboarding', { replace: true });
      } else if (user.role === 'faculty') navigate('/faculty', { replace: true });
      else if (user.role === 'library_staff') navigate('/clearance/library', { replace: true });
      else if (user.role === 'accounts_staff') navigate('/clearance/accounts', { replace: true });
      else if (user.role === 'lab_staff') navigate('/clearance/lab', { replace: true });
      else if (user.role === 'hod') navigate('/hod', { replace: true });
      else if (user.role === 'admin') navigate('/admin', { replace: true });
      else navigate('/', { replace: true });
    }
  }, [user, navigate]);

  // Student Sign In fields (Section 24.A)
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [studentPassword, setStudentPassword] = useState('');

  // Staff Sign In fields (Section 24.C)
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPassword, setStaffPassword] = useState('');

  // Create Student Account fields (Section 24.B)
  const [regFullName, setRegFullName] = useState('');
  const [regRegistrationNumber, setRegRegistrationNumber] = useState('');
  const [regDepartmentId, setRegDepartmentId] = useState('');
  const [regAcademicYear, setRegAcademicYear] = useState('2026-2027');
  const [regSemester, setRegSemester] = useState<number>(5);
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');

  // Create Staff Account fields (Section 28.B)
  const [staffRegName, setStaffRegName] = useState('');
  const [staffRegStaffId, setStaffRegStaffId] = useState('');
  const [staffRegEmail, setStaffRegEmail] = useState('');
  const [staffRegPassword, setStaffRegPassword] = useState('');
  const [staffRegConfirmPassword, setStaffRegConfirmPassword] = useState('');
  const [staffRegCategory, setStaffRegCategory] = useState<'faculty' | 'library_staff' | 'accounts_staff' | 'lab_staff' | 'hod'>('faculty');
  const [staffRegDeptId, setStaffRegDeptId] = useState('');
  const [staffRegDesignation, setStaffRegDesignation] = useState('Assistant Professor');
  const [staffRegCustomDesignation, setStaffRegCustomDesignation] = useState('');
  const [staffRegAcademicYear, setStaffRegAcademicYear] = useState('2026-2027');
  const [staffRegSubjects, setStaffRegSubjects] = useState('');
  const [staffRegSemester, setStaffRegSemester] = useState<number>(5);
  const [staffRegResponsibilities, setStaffRegResponsibilities] = useState<string[]>([
    'Academic verification',
    'Attendance verification',
  ]);

  // Password reset assistance modal state
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);

  // Department registry from database
  const [departments, setDepartments] = useState<Department[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [localSuccess, setLocalSuccess] = useState<string | null>(null);

  useEffect(() => {
    const depts = Engine.getDepartments().filter((d) => d.is_active);
    setDepartments(depts);
    if (depts.length > 0) {
      if (!regDepartmentId) setRegDepartmentId(depts[0].id);
      if (!staffRegDeptId) setStaffRegDeptId(depts[0].id);
    }
  }, []);

  // Sync default responsibilities when staff category changes
  const ROLE_RESPONSIBILITIES_OPTIONS: Record<string, string[]> = {
    faculty: [
      'Academic verification',
      'Attendance verification',
      'Assignment verification',
    ],
    library_staff: [
      'Library clearance',
      'Payment evidence review',
      'Book return verification',
    ],
    accounts_staff: [
      'Accounts clearance',
      'Payment evidence review',
      'Fee dues reconciliation',
    ],
    lab_staff: [
      'Laboratory clearance',
      'Equipment breakage check',
      'Payment evidence review',
    ],
    hod: [
      'Department-level HOD review',
      'Academic oversight',
      'Final clearance recommendation',
    ],
  };

  const handleCategoryChange = (cat: 'faculty' | 'library_staff' | 'accounts_staff' | 'lab_staff' | 'hod') => {
    setStaffRegCategory(cat);
    // Set default designation preset
    if (cat === 'faculty') setStaffRegDesignation('Assistant Professor');
    else if (cat === 'hod') setStaffRegDesignation('Professor & Head of Department');
    else if (cat === 'library_staff') setStaffRegDesignation('Senior Librarian');
    else if (cat === 'accounts_staff') setStaffRegDesignation('Accounts Officer');
    else if (cat === 'lab_staff') setStaffRegDesignation('Laboratory Instructor');
    // Set default responsibilities
    setStaffRegResponsibilities(ROLE_RESPONSIBILITIES_OPTIONS[cat] || []);
  };

  const toggleResponsibility = (resp: string) => {
    setStaffRegResponsibilities((prev) =>
      prev.includes(resp) ? prev.filter((r) => r !== resp) : [...prev, resp]
    );
  };

  // 1. Student Login Handler
  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    const cleanReg = registrationNumber.trim().toUpperCase();
    if (!cleanReg || !studentPassword) {
      setLocalError('Please enter both your Registration Number and password.');
      return;
    }

    try {
      setIsLoading(true);
      await loginStudent(cleanReg, studentPassword);
      navigate('/student');
    } catch (err: any) {
      setLocalError(err.message || 'Invalid credentials. Please verify your Registration Number and password.');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Staff Login Handler
  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    const cleanEmail = staffEmail.trim().toLowerCase();
    if (!cleanEmail || !staffPassword) {
      setLocalError('Please enter both your staff email and password.');
      return;
    }

    try {
      setIsLoading(true);
      await loginStaff(cleanEmail, staffPassword);
      const prof = Engine.getProfileByEmail(cleanEmail);
      if (prof?.role !== 'admin' && (prof?.is_verified === false || prof?.verification_status === 'PENDING' || prof?.verification_status === 'REJECTED')) {
        navigate('/staff/onboarding');
      } else if (prof?.role === 'faculty') navigate('/faculty');
      else if (prof?.role === 'library_staff') navigate('/clearance/library');
      else if (prof?.role === 'accounts_staff') navigate('/clearance/accounts');
      else if (prof?.role === 'lab_staff') navigate('/clearance/lab');
      else if (prof?.role === 'hod') navigate('/hod');
      else if (prof?.role === 'admin') navigate('/admin');
      else navigate('/');
    } catch (err: any) {
      setLocalError(err.message || 'Invalid staff credentials or unauthorized account.');
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Student Self-Registration Handler
  const handleStudentSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    const cleanRegNumber = regRegistrationNumber.trim().toUpperCase();
    if (!regFullName.trim()) {
      setLocalError('Please enter your full student name.');
      return;
    }
    if (!cleanRegNumber) {
      setLocalError('Please enter your official College Registration Number (USN).');
      return;
    }
    if (!regDepartmentId) {
      setLocalError('Please select your academic department.');
      return;
    }
    if (regPassword.length < 6) {
      setLocalError('Password must be at least 6 characters long.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setLocalError('Passwords do not match. Please re-enter.');
      return;
    }

    try {
      setIsLoading(true);
      const email = regEmail.trim() || `${cleanRegNumber.toLowerCase()}@cauvery.edu.in`;

      await registerStudent({
        fullName: regFullName.trim(),
        studentId: cleanRegNumber,
        departmentId: regDepartmentId,
        academicYear: regAcademicYear,
        semester: regSemester,
        email: email,
        password: regPassword,
      });

      setLocalSuccess(
        `Student account created successfully! Welcome, ${regFullName.trim()}. Redirecting to your Student Dashboard...`
      );
      setTimeout(() => {
        navigate('/student');
      }, 900);
    } catch (err: any) {
      setLocalError(err.message || 'Student registration failed. Please check your details.');
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Staff Self-Registration Handler (Section 28.B & 28.C)
  const handleStaffSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (!staffRegName.trim()) {
      setLocalError('Please enter your full name.');
      return;
    }
    const cleanStaffId = staffRegStaffId.trim().toUpperCase();
    if (!cleanStaffId) {
      setLocalError('Please enter your official Staff ID.');
      return;
    }
    const cleanEmail = staffRegEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setLocalError('Please enter a valid institutional email address.');
      return;
    }
    if (staffRegPassword.length < 6) {
      setLocalError('Password must be at least 6 characters long.');
      return;
    }
    if (staffRegPassword !== staffRegConfirmPassword) {
      setLocalError('Passwords do not match. Please re-enter.');
      return;
    }
    if (!staffRegDeptId) {
      setLocalError('Please select your department.');
      return;
    }

    const finalDesignation =
      staffRegDesignation === 'Custom'
        ? staffRegCustomDesignation.trim() || 'Staff Member'
        : staffRegDesignation;

    if (!finalDesignation) {
      setLocalError('Please specify your designation.');
      return;
    }

    // Split subjects if provided
    const subjectList = staffRegSubjects
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    try {
      setIsLoading(true);
      await registerStaff({
        fullName: staffRegName.trim(),
        staffId: cleanStaffId,
        email: cleanEmail,
        password: staffRegPassword,
        confirmPassword: staffRegConfirmPassword,
        requestedRole: staffRegCategory,
        departmentId: staffRegDeptId,
        designation: finalDesignation,
        academicYear: staffRegAcademicYear,
        subjects: subjectList,
        semester: staffRegCategory === 'faculty' ? staffRegSemester : undefined,
        responsibilities: staffRegResponsibilities,
      });

      setLocalSuccess(
        `Staff account registered successfully! Awaiting institutional verification. Redirecting to your Onboarding Portal...`
      );
      setTimeout(() => {
        navigate('/staff/onboarding');
      }, 900);
    } catch (err: any) {
      setLocalError(err.message || 'Staff registration failed. Please verify your details.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-2xl text-center mb-6 relative z-10">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-100 tracking-tight">
          Cauvery Institute of Technology
        </h1>
        <p className="text-xs uppercase font-bold text-blue-400 tracking-widest mt-1">
          Affiliated to VTU • Academic Year 2026–2027
        </p>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          College No-Due Clearance Management System
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-2xl relative z-10">
        <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-700/80 shadow-2xl">
          {/* Section 28.A: Four Explicit Authentication Options */}
          <div className="grid grid-cols-2 sm:grid-cols-4 p-1.5 rounded-2xl bg-slate-900/90 border border-slate-800 mb-6 gap-1">
            <button
              type="button"
              id="tab-student-login"
              onClick={() => {
                setAuthOption('student_login');
                setLocalError(null);
                setLocalSuccess(null);
              }}
              className={`py-2 px-2 text-[11px] font-bold rounded-xl transition text-center flex items-center justify-center gap-1.5 ${
                authOption === 'student_login'
                  ? 'bg-blue-600 text-white shadow-md font-extrabold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <LogIn className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Student Login</span>
            </button>
            <button
              type="button"
              id="tab-student-register"
              onClick={() => {
                setAuthOption('student_register');
                setLocalError(null);
                setLocalSuccess(null);
              }}
              className={`py-2 px-2 text-[11px] font-bold rounded-xl transition text-center flex items-center justify-center gap-1.5 ${
                authOption === 'student_register'
                  ? 'bg-blue-600 text-white shadow-md font-extrabold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Create Student Account</span>
            </button>
            <button
              type="button"
              id="tab-staff-login"
              onClick={() => {
                setAuthOption('staff_login');
                setLocalError(null);
                setLocalSuccess(null);
              }}
              className={`py-2 px-2 text-[11px] font-bold rounded-xl transition text-center flex items-center justify-center gap-1.5 ${
                authOption === 'staff_login'
                  ? 'bg-blue-600 text-white shadow-md font-extrabold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <LogIn className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Staff Login</span>
            </button>
            <button
              type="button"
              id="tab-staff-register"
              onClick={() => {
                setAuthOption('staff_register');
                setLocalError(null);
                setLocalSuccess(null);
              }}
              className={`py-2 px-2 text-[11px] font-bold rounded-xl transition text-center flex items-center justify-center gap-1.5 ${
                authOption === 'staff_register'
                  ? 'bg-blue-600 text-white shadow-md font-extrabold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Create Staff Account</span>
            </button>
          </div>

          {/* Hidden aliases for backwards compatibility with legacy tests */}
          <div className="sr-only">
            <button
              id="tab-login"
              type="button"
              onClick={() => setAuthOption('student_login')}
            >
              Legacy Login Tab
            </button>
            <button
              id="tab-register"
              type="button"
              onClick={() => setAuthOption('student_register')}
            >
              Legacy Register Tab
            </button>
          </div>

          {/* Error Message Alert */}
          {(localError || error) && (
            <div className="mb-5 p-3 rounded-xl bg-rose-950/50 border border-rose-500/50 text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{localError || error}</span>
            </div>
          )}

          {/* Success Message Alert */}
          {localSuccess && (
            <div className="mb-5 p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/50 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{localSuccess}</span>
            </div>
          )}

          {/* ================================================================ */}
          {/* 1. STUDENT LOGIN FORM                                            */}
          {/* ================================================================ */}
          {authOption === 'student_login' && (
            <form onSubmit={handleStudentLogin} className="space-y-4 animate-in fade-in">
              <div className="text-center pb-2 border-b border-slate-800">
                <h2 className="text-base font-bold text-slate-100 flex items-center justify-center gap-2">
                  <GraduationCap className="w-4 h-4 text-blue-400" />
                  Student Clearance Sign In
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Sign in with your official College Registration Number (USN)
                </p>
              </div>

              <div>
                <label
                  htmlFor="student-id"
                  className="block text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wider"
                >
                  Registration Number (USN) <span className="text-blue-400">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    id="student-id"
                    type="text"
                    required
                    value={registrationNumber}
                    onChange={(e) => setRegistrationNumber(e.target.value.toUpperCase())}
                    placeholder="e.g. 1CR24CS099"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-sm font-mono uppercase tracking-wider focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    htmlFor="student-password"
                    className="block text-xs font-semibold text-slate-300 uppercase tracking-wider"
                  >
                    Password <span className="text-blue-400">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowForgotPasswordModal(true)}
                    className="text-[11px] text-blue-400 hover:text-blue-300 transition"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    id="student-password"
                    type="password"
                    required
                    value={studentPassword}
                    onChange={(e) => setStudentPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                id="btn-student-login"
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-lg shadow-blue-900/30 transition flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
              >
                <span>{isLoading ? 'Authenticating...' : 'Sign In as Student'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="pt-3 border-t border-slate-800 text-center">
                <p className="text-xs text-slate-400">
                  New student?{' '}
                  <button
                    type="button"
                    onClick={() => setAuthOption('student_register')}
                    className="font-bold text-blue-400 hover:text-blue-300 underline underline-offset-2 ml-1"
                  >
                    Create Student Account
                  </button>
                </p>
              </div>
            </form>
          )}

          {/* ================================================================ */}
          {/* 2. CREATE STUDENT ACCOUNT FORM                                   */}
          {/* ================================================================ */}
          {authOption === 'student_register' && (
            <form onSubmit={handleStudentSignUp} className="space-y-3.5 animate-in fade-in">
              <div className="text-center pb-2 border-b border-slate-800">
                <h2 className="text-base font-bold text-slate-100 flex items-center justify-center gap-2">
                  <GraduationCap className="w-4 h-4 text-blue-400" />
                  Create Student Account
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Official Student Self-Registration • Cauvery Institute of Technology
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wider">
                  Full Name <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    placeholder="e.g. Kavya Murthy"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wider">
                  Registration Number (USN) <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <GraduationCap className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={regRegistrationNumber}
                    onChange={(e) => setRegRegistrationNumber(e.target.value.toUpperCase())}
                    placeholder="e.g. 1CR24CS099"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-sm font-mono uppercase tracking-wider focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wider">
                  Department <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Building className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <select
                    required
                    value={regDepartmentId}
                    onChange={(e) => setRegDepartmentId(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-blue-500"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.code} — {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wider">
                    Academic Year <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={regAcademicYear}
                    onChange={(e) => setRegAcademicYear(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="2026-2027">2026–2027</option>
                    <option value="2025-2026">2025–2026</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wider">
                    Semester
                  </label>
                  <select
                    value={regSemester}
                    onChange={(e) => setRegSemester(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-blue-500"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                      <option key={s} value={s}>
                        Semester {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wider">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder={
                      regRegistrationNumber
                        ? `${regRegistrationNumber.toLowerCase()}@cauvery.edu.in`
                        : 'e.g. student@cauvery.edu.in'
                    }
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wider">
                    Password <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Min 6 chars"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wider">
                    Confirm Password <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                id="btn-create-account"
                disabled={isLoading}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-blue-900/30 transition flex items-center justify-center gap-2 disabled:opacity-50 mt-4"
              >
                <span>{isLoading ? 'Creating Account...' : 'Create Student Account'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="pt-3 border-t border-slate-800 text-center">
                <p className="text-xs text-slate-400">
                  Already have a student account?{' '}
                  <button
                    type="button"
                    onClick={() => setAuthOption('student_login')}
                    className="font-bold text-blue-400 hover:text-blue-300 underline underline-offset-2 ml-1"
                  >
                    Student Login
                  </button>
                </p>
              </div>
            </form>
          )}

          {/* ================================================================ */}
          {/* 3. STAFF LOGIN FORM                                              */}
          {/* ================================================================ */}
          {authOption === 'staff_login' && (
            <form onSubmit={handleStaffLogin} className="space-y-4 animate-in fade-in">
              <div className="text-center pb-2 border-b border-slate-800">
                <h2 className="text-base font-bold text-slate-100 flex items-center justify-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-indigo-400" />
                  Staff & Officers Sign In
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Authorized Faculty, Library, Accounts, Lab, HOD & Admin Portal
                </p>
              </div>

              <div>
                <label
                  htmlFor="staff-email"
                  className="block text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wider"
                >
                  Institutional Email Address <span className="text-indigo-400">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    id="staff-email"
                    type="email"
                    required
                    value={staffEmail}
                    onChange={(e) => setStaffEmail(e.target.value)}
                    placeholder="name@cauvery.edu.in"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="staff-password"
                  className="block text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wider"
                >
                  Staff Password <span className="text-indigo-400">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    id="staff-password"
                    type="password"
                    required
                    value={staffPassword}
                    onChange={(e) => setStaffPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                id="btn-staff-login"
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-900/30 transition flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
              >
                <span>{isLoading ? 'Verifying Staff Access...' : 'Sign In as Staff'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="pt-3 border-t border-slate-800 text-center">
                <p className="text-xs text-slate-400">
                  New staff member?{' '}
                  <button
                    type="button"
                    onClick={() => setAuthOption('staff_register')}
                    className="font-bold text-indigo-400 hover:text-indigo-300 underline underline-offset-2 ml-1"
                  >
                    Create Staff Account
                  </button>
                </p>
              </div>
            </form>
          )}

          {/* ================================================================ */}
          {/* 4. CREATE STAFF ACCOUNT FORM (SECTION 28.B MANDATE)              */}
          {/* ================================================================ */}
          {authOption === 'staff_register' && (
            <form onSubmit={handleStaffSignUp} className="space-y-4 animate-in fade-in">
              <div className="text-center pb-2 border-b border-slate-800">
                <h2 className="text-base font-bold text-slate-100 flex items-center justify-center gap-2">
                  <Briefcase className="w-4 h-4 text-indigo-400" />
                  Staff Self-Registration & Role Configuration
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Institutional Staff Account Creation • Sections 28.A & 28.B
                </p>
              </div>

              {/* Administrative Notice on Gated Privileges */}
              <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/40 text-[11px] text-amber-200 flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 flex-shrink-0 text-amber-400 mt-0.5" />
                <p className="leading-relaxed">
                  <strong>Notice on Immediate Account Availability:</strong> You can log in immediately after registration to view your onboarding profile. Clearance evaluation and decision permissions remain gated until verified by the College Administration.
                </p>
              </div>

              {/* 1. Staff Category Selection (Section 28.A: Admin strictly excluded!) */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Select Staff Category / Requested Role <span className="text-rose-400">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  {[
                    { id: 'faculty', label: 'Faculty Advisor' },
                    { id: 'library_staff', label: 'Library Staff' },
                    { id: 'accounts_staff', label: 'Accounts Staff' },
                    { id: 'lab_staff', label: 'Laboratory Staff' },
                    { id: 'hod', label: 'Head of Dept (HOD)' },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleCategoryChange(cat.id as any)}
                      className={`p-2.5 rounded-xl border text-left font-medium transition flex items-center justify-between ${
                        staffRegCategory === cat.id
                          ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/50 shadow-sm'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span>{cat.label}</span>
                      {staffRegCategory === cat.id && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Personal & Account Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wider">
                    Full Name <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={staffRegName}
                      onChange={(e) => setStaffRegName(e.target.value)}
                      placeholder="e.g. Dr. Ramesh Babu"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wider">
                    Official Staff ID <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <Hash className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={staffRegStaffId}
                      onChange={(e) => setStaffRegStaffId(e.target.value.toUpperCase())}
                      placeholder="e.g. CIT-FAC-102"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-sm font-mono uppercase tracking-wider focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wider">
                  Institutional Email Address <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={staffRegEmail}
                    onChange={(e) => setStaffRegEmail(e.target.value)}
                    placeholder="e.g. ramesh.cse@cauvery.edu.in"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* 3. Institutional Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wider">
                    Department <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <Building className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <select
                      required
                      value={staffRegDeptId}
                      onChange={(e) => setStaffRegDeptId(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                    >
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.code} — {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wider">
                    Designation <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={staffRegDesignation}
                    onChange={(e) => setStaffRegDesignation(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Lecturer">Lecturer</option>
                    <option value="Assistant Professor">Assistant Professor</option>
                    <option value="Associate Professor">Associate Professor</option>
                    <option value="Professor">Professor</option>
                    <option value="Professor & Head of Department">Professor & Head of Department</option>
                    <option value="Senior Librarian">Senior Librarian</option>
                    <option value="Librarian">Librarian</option>
                    <option value="Accounts Officer">Accounts Officer</option>
                    <option value="Finance Officer">Finance Officer</option>
                    <option value="Laboratory Instructor">Laboratory Instructor</option>
                    <option value="Senior Technical Assistant">Senior Technical Assistant</option>
                    <option value="Custom">Other / Custom Designation...</option>
                  </select>
                </div>
              </div>

              {staffRegDesignation === 'Custom' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wider">
                    Custom Designation Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={staffRegCustomDesignation}
                    onChange={(e) => setStaffRegCustomDesignation(e.target.value)}
                    placeholder="e.g. Lead Technical Instructor"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
              )}

              {/* 4. Role-Appropriate Teaching Scope (Faculty only) */}
              {staffRegCategory === 'faculty' && (
                <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                    Teaching & Coursework Details
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-400 mb-1">Subjects Taught</label>
                      <input
                        type="text"
                        value={staffRegSubjects}
                        onChange={(e) => setStaffRegSubjects(e.target.value)}
                        placeholder="e.g. Operating Systems, Networks"
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Semester Handled</label>
                      <select
                        value={staffRegSemester}
                        onChange={(e) => setStaffRegSemester(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                          <option key={s} value={s}>
                            Semester {s}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* 5. Requested Responsibilities (Multi-select) */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wider">
                  Institutional Responsibilities (Select Applicable) <span className="text-indigo-400">*</span>
                </label>
                <p className="text-[10px] text-slate-500 mb-2">
                  Selecting these options describes your requested responsibilities; permissions are enabled only upon administrative authorization.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {(ROLE_RESPONSIBILITIES_OPTIONS[staffRegCategory] || []).map((resp) => {
                    const isChecked = staffRegResponsibilities.includes(resp);
                    return (
                      <label
                        key={resp}
                        className={`p-2 rounded-xl border text-xs cursor-pointer flex items-center gap-2 transition select-none ${
                          isChecked
                            ? 'bg-indigo-600/20 text-indigo-200 border-indigo-500/50'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleResponsibility(resp)}
                          className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-0 focus:outline-none"
                        />
                        <span>{resp}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* 6. Password & Confirm Password */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wider">
                    Password <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={staffRegPassword}
                    onChange={(e) => setStaffRegPassword(e.target.value)}
                    placeholder="Min 6 chars"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wider">
                    Confirm Password <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={staffRegConfirmPassword}
                    onChange={(e) => setStaffRegConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Create Staff Account Button */}
              <button
                type="submit"
                id="btn-create-staff-account"
                disabled={isLoading}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-sm shadow-lg shadow-indigo-900/30 transition flex items-center justify-center gap-2 disabled:opacity-50 mt-4"
              >
                <span>{isLoading ? 'Creating Staff Account...' : 'Create Staff Account'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="pt-3 border-t border-slate-800 text-center">
                <p className="text-xs text-slate-400">
                  Already have a staff account?{' '}
                  <button
                    type="button"
                    onClick={() => setAuthOption('staff_login')}
                    className="font-bold text-indigo-400 hover:text-indigo-300 underline underline-offset-2 ml-1"
                  >
                    Staff Login
                  </button>
                </p>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Forgot Password Assistance Modal */}
      {showForgotPasswordModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="glass-panel max-w-md w-full rounded-2xl border border-slate-700 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">Student Password Assistance</h3>
                  <p className="text-[11px] text-slate-400">Cauvery Institute of Technology Examination Cell</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotPasswordModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <p>
                In compliance with institutional security and VTU examination regulations, online password resets for student No-Due accounts require verified identity authentication to prevent unauthorized account takeovers.
              </p>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                <p className="font-semibold text-slate-200">How to reset your password:</p>
                <ul className="list-disc list-inside space-y-1 text-slate-400">
                  <li>Contact your designated Department Faculty Advisor in person.</li>
                  <li>Present your official College Identity Card and Registration Number (USN).</li>
                  <li>Or contact the Examination Records Desk: <span className="text-blue-400 font-mono">examcell@cauvery.edu.in</span></li>
                </ul>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowForgotPasswordModal(false)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
            >
              Understood, Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
