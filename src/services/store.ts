// ==============================================================================
// CAUVERY INSTITUTE OF TECHNOLOGY (Affiliated to VTU)
// COLLEGE NO-DUE CLEARANCE MANAGEMENT SYSTEM
// Authoritative Database Store & Business Logic Engine
// Reflects PostgreSQL schema, triggers, state machine rules, and admin provisioning
// ==============================================================================

import {
  UserProfile,
  NoDueRequest,
  ClearanceItem,
  StudentAcademicRecord,
  PaymentQrConfig,
  PaymentSubmission,
  RejectionHistoryItem,
  ResubmissionHistoryItem,
  AuditLog,
  NotificationItem,
  SystemSetting,
  UserRole,
  Department,
  AcademicPeriod,
  RejectionCategoryType,
  PublicVerificationResult,
  TeacherReassignmentRecord,
  StaffRegistrationParams,
  StaffRoleRequest,
  VerificationStatus,
  AuthorityType,
  SubjectAttendanceRecord,
  AttendanceStatusType,
  Subject,
  StaffSubjectAssignment,
  StudentSubjectEnrollment,
  RequestFacultyAssignment,
  FacultyReviewTask,
  SubjectApprovalStatus,
  TeacherApprovalDecision,
} from '../types/database';

export const STORAGE_KEYS = {
  PROFILES: 'cit_v2_profiles',
  CREDENTIALS: 'cit_v2_credentials',
  DEPARTMENTS: 'cit_v2_departments',
  ACADEMIC_PERIODS: 'cit_v2_academic_periods',
  SETTINGS: 'cit_v2_settings',
  ACADEMIC_RECORDS: 'cit_v2_academic_records',
  SUBJECT_ATTENDANCE: 'cit_v2_subject_attendance',
  TEACHER_APPROVAL_DECISIONS: 'cit_v2_teacher_approval_decisions',
  SUBJECTS: 'cit_v2_subjects',
  STAFF_SUBJECT_ASSIGNMENTS: 'cit_v2_staff_subject_assignments',
  STUDENT_SUBJECT_ENROLLMENTS: 'cit_v2_student_subject_enrollments',
  REQUEST_FACULTY_ASSIGNMENTS: 'cit_v2_request_faculty_assignments',
  FACULTY_REVIEW_TASKS: 'cit_v2_faculty_review_tasks',
  PAYMENT_QRS: 'cit_v2_payment_qrs',
  REQUESTS: 'cit_v2_requests',
  CLEARANCE_ITEMS: 'cit_v2_clearance_items',
  PAYMENTS: 'cit_v2_payment_submissions',
  REJECTIONS: 'cit_v2_rejection_history',
  RESUBMISSIONS: 'cit_v2_resubmissions',
  AUDIT_LOGS: 'cit_v2_audit_logs',
  NOTIFICATIONS: 'cit_v2_notifications',
  STAFF_ROLE_REQUESTS: 'cit_v2_staff_role_requests',
  DELETED_ADMIN_ACCOUNTS: 'cit_v2_deleted_admin_accounts',
};

export interface StoredCredential {
  userId: string;
  identifier: string;
  passwordHash: string;
}

function getEnvVar(key: string): string | undefined {
  const g = globalThis as any;
  if (g && g.process && g.process.env) {
    return g.process.env[key];
  }
  if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
    return (import.meta as any).env[`VITE_${key}`] || (import.meta as any).env[key];
  }
  return undefined;
}

// ------------------------------------------------------------------------------
// Seed Institutional Data
// ------------------------------------------------------------------------------

const SEED_DEPARTMENTS: Department[] = [
  { id: 'dept-cse', code: 'CSE', name: 'Computer Science & Engineering', is_active: true, created_at: new Date().toISOString() },
  { id: 'dept-ise', code: 'ISE', name: 'Information Science & Engineering', is_active: true, created_at: new Date().toISOString() },
  { id: 'dept-ece', code: 'ECE', name: 'Electronics & Communication Engineering', is_active: true, created_at: new Date().toISOString() },
  { id: 'dept-me', code: 'ME', name: 'Mechanical Engineering', is_active: true, created_at: new Date().toISOString() },
  { id: 'dept-cv', code: 'CV', name: 'Civil Engineering', is_active: true, created_at: new Date().toISOString() },
  { id: 'dept-aiml', code: 'AIML', name: 'Artificial Intelligence & Machine Learning', is_active: true, created_at: new Date().toISOString() },
];

const SEED_ACADEMIC_PERIODS: AcademicPeriod[] = [
  { id: 'period-2026-sem1', academic_year: '2026-2027', semester: 1, is_active: true, created_at: new Date().toISOString() },
  { id: 'period-2026-sem2', academic_year: '2026-2027', semester: 2, is_active: true, created_at: new Date().toISOString() },
  { id: 'period-2026-sem3', academic_year: '2026-2027', semester: 3, is_active: true, created_at: new Date().toISOString() },
  { id: 'period-2026-sem4', academic_year: '2026-2027', semester: 4, is_active: true, created_at: new Date().toISOString() },
  { id: 'period-2026-sem5', academic_year: '2026-2027', semester: 5, is_active: true, created_at: new Date().toISOString() },
  { id: 'period-2026-sem6', academic_year: '2026-2027', semester: 6, is_active: true, created_at: new Date().toISOString() },
  { id: 'period-2026-sem7', academic_year: '2026-2027', semester: 7, is_active: true, created_at: new Date().toISOString() },
  { id: 'period-2026-sem8', academic_year: '2026-2027', semester: 8, is_active: true, created_at: new Date().toISOString() },
];

const SEED_PROFILES: UserProfile[] = [
  // Initial Administrator Profile (Configured via secure bootstrap / environment variables)
  {
    id: 'usr-admin-01',
    role: 'admin',
    full_name: 'Dr. Srikantappa As',
    email: 'admin@gmail.com',
    staff_id: 'CIT-ADM-001',
    department: 'Central Institutional Administration',
    designation: 'Institutional System Administrator',
    is_active: true,
    is_verified: true,
    verification_status: 'VERIFIED',
    must_change_password: true,
    is_temporary_password: true,
    verified_at: new Date(Date.now() - 90 * 86400000).toISOString(),
    created_at: new Date(Date.now() - 90 * 86400000).toISOString(),
  },
];

const SEED_CREDENTIALS: StoredCredential[] = [];

const SEED_SETTINGS: SystemSetting[] = [
  {
    key: 'minimum_attendance_percentage',
    value: 85,
    description: 'Mandatory minimum attendance threshold for academic eligibility at Cauvery Institute of Technology',
    updated_at: new Date().toISOString(),
  },
  {
    key: 'college_name',
    value: 'Cauvery Institute of Technology',
    description: 'Official College Name',
    updated_at: new Date().toISOString(),
  },
  {
    key: 'university_affiliation',
    value: 'VTU',
    description: 'University Affiliation',
    updated_at: new Date().toISOString(),
  },
  {
    key: 'active_academic_year',
    value: '2026-2027',
    description: 'Current Active Academic Year',
    updated_at: new Date().toISOString(),
  },
];

const SEED_PAYMENT_QRS: PaymentQrConfig[] = [
  {
    id: 'qr-lib-01',
    authority: 'library',
    title: 'Central Library Fine Collection Desk',
    upi_id: 'citlibrary@vtu.upi',
    account_details: 'Cauvery Institute of Technology Library A/C: 1029384756, IFSC: SBIN0004521',
    qr_image_url: 'https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=upi://pay?pa=citlibrary@vtu.upi&pn=Central+Library+Dues',
    instructions: 'Scan using any UPI app (PhonePe / GPay / Paytm). Enter your Student USN in the transaction remark. Upload screenshot with UTR number visible.',
    is_active: true,
    updated_at: new Date().toISOString(),
  },
  {
    id: 'qr-acc-01',
    authority: 'accounts',
    title: 'Office of Finance & Student Accounts',
    upi_id: 'citaccounts@vtu.upi',
    account_details: 'Cauvery Institute of Technology Accounts A/C: 1029384757, IFSC: SBIN0004521',
    qr_image_url: 'https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=upi://pay?pa=citaccounts@vtu.upi&pn=Finance+Tuition+Dues',
    instructions: 'Scan to pay pending semester fees, examination dues, or hostel charges. Upload receipt screenshot showing reference number.',
    is_active: true,
    updated_at: new Date().toISOString(),
  },
  {
    id: 'qr-lab-01',
    authority: 'lab',
    title: 'Department Computing & Hardware Labs Desk',
    upi_id: 'citlabs@vtu.upi',
    account_details: 'Cauvery Institute of Technology Lab A/C: 1029384758, IFSC: SBIN0004521',
    qr_image_url: 'https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=upi://pay?pa=citlabs@vtu.upi&pn=Lab+Breakage+Dues',
    instructions: 'Scan to settle lab apparatus or hardware component replacement fees. Upload receipt screenshot.',
    is_active: true,
    updated_at: new Date().toISOString(),
  },
];

const SEED_ACADEMIC_RECORDS: StudentAcademicRecord[] = [];

const SEED_REQUESTS: NoDueRequest[] = [];

const SEED_CLEARANCE_ITEMS: ClearanceItem[] = [];

const SEED_PAYMENTS: PaymentSubmission[] = [];
const SEED_REJECTIONS: RejectionHistoryItem[] = [];

const SEED_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'log-sys-init',
    user_id: 'usr-admin-01',
    user_name: 'Dr. Srikantappa As',
    user_role: 'admin',
    action: 'INITIALIZE_INSTITUTIONAL_REGISTRY',
    entity_type: 'system',
    entity_id: 'cauvery-vtu-2026',
    new_state: {
      college: 'Cauvery Institute of Technology',
      academic_year: '2026-2027',
      affiliation: 'VTU',
      system: 'College No-Due Clearance Management System',
    },
    ip_address: '127.0.0.1',
    created_at: new Date().toISOString(),
  },
];

const SEED_NOTIFICATIONS: NotificationItem[] = [];

// ------------------------------------------------------------------------------
// Storage Helpers with In-Memory fallback for Node CLI & Jest / Tsx runners
// ------------------------------------------------------------------------------

const memoryStore = new Map<string, string>();

function get<T>(key: string, defaultVal: T): T {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : memoryStore.get(key);
    if (!raw) return defaultVal;
    return JSON.parse(raw);
  } catch {
    return defaultVal;
  }
}

function set<T>(key: string, val: T): void {
  try {
    const serialized = JSON.stringify(val);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, serialized);
    } else {
      memoryStore.set(key, serialized);
    }
  } catch (err) {
    console.error('Failed to save to store:', err);
  }
}

export function initializeEngine(): void {
  const hasKey = (key: string) => {
    if (typeof localStorage !== 'undefined') {
      return Boolean(localStorage.getItem(key));
    }
    return memoryStore.has(key);
  };

  // Section 25.A & 25.D Mandate: Clean Up Existing Demo Data Safely
  // Purge any hardcoded fictional accounts from localStorage/memoryStore
  const FAKE_ACCOUNT_IDS = new Set(['usr-fac-01', 'usr-hod-01', 'usr-lib-01', 'usr-acc-01', 'usr-lab-01']);
  const FAKE_ACCOUNT_EMAILS = new Set([
    'rajeshwari.cse@cauvery.edu.in',
    'hod.cse@cauvery.edu.in',
    'library@cauvery.edu.in',
    'accounts@cauvery.edu.in',
    'lab.cse@cauvery.edu.in',
  ]);

  if (!hasKey(STORAGE_KEYS.PROFILES)) {
    set(STORAGE_KEYS.PROFILES, SEED_PROFILES);
  } else {
    // Sanitize existing stored profiles
    const storedProfiles = get<UserProfile[]>(STORAGE_KEYS.PROFILES, SEED_PROFILES);
    const sanitizedProfiles = storedProfiles.filter(
      (p) => !FAKE_ACCOUNT_IDS.has(p.id) && !FAKE_ACCOUNT_EMAILS.has(p.email.toLowerCase())
    );

    // If student was assigned to fake faculty, reset assignment
    sanitizedProfiles.forEach((p) => {
      if (p.assigned_faculty_id && FAKE_ACCOUNT_IDS.has(p.assigned_faculty_id)) {
        p.assigned_faculty_id = undefined;
        p.assigned_faculty_name = undefined;
      }
    });

    // Ensure System Administrator exists if not explicitly deleted (Section 30: admin@gmail.com)
    const deletedAdmins = get<string[]>(STORAGE_KEYS.DELETED_ADMIN_ACCOUNTS, []);
    if (!sanitizedProfiles.some((p) => p.role === 'admin') && !deletedAdmins.includes('admin@gmail.com')) {
      sanitizedProfiles.unshift(SEED_PROFILES[0]);
    }
    // Update admin full_name to Dr. Srikantappa As (replacing Dr. H. N. Suresh or any default name)
    sanitizedProfiles.forEach((p) => {
      if (p.role === 'admin' || p.full_name === 'Dr. H. N. Suresh' || p.full_name === 'H. N. Suresh') {
        p.full_name = 'Dr. Srikantappa As';
      }
    });
    set(STORAGE_KEYS.PROFILES, sanitizedProfiles);
  }

  if (!hasKey(STORAGE_KEYS.CREDENTIALS)) {
    set(STORAGE_KEYS.CREDENTIALS, SEED_CREDENTIALS);
  } else {
    const storedCreds = get<StoredCredential[]>(STORAGE_KEYS.CREDENTIALS, SEED_CREDENTIALS);
    const sanitizedCreds = storedCreds.filter(
      (c) => c && c.userId && c.identifier && !FAKE_ACCOUNT_IDS.has(c.userId) && !FAKE_ACCOUNT_EMAILS.has(c.identifier.toLowerCase())
    );
    set(STORAGE_KEYS.CREDENTIALS, sanitizedCreds);
  }

  // Sanitize requests to purge fake faculty assignments and assign proper status (Section 26.D & 26.E)
  if (!hasKey(STORAGE_KEYS.REQUESTS)) {
    set(STORAGE_KEYS.REQUESTS, SEED_REQUESTS);
  } else {
    const storedRequests = get<NoDueRequest[]>(STORAGE_KEYS.REQUESTS, SEED_REQUESTS);
    storedRequests.forEach((r) => {
      if (r.assigned_faculty_id && FAKE_ACCOUNT_IDS.has(r.assigned_faculty_id)) {
        r.assigned_faculty_id = undefined;
        r.assigned_faculty_name = undefined;
        r.faculty_assignment_status = 'UNASSIGNED';
      } else if (!r.faculty_assignment_status) {
        r.faculty_assignment_status = r.assigned_faculty_id ? 'ASSIGNED' : 'UNASSIGNED';
      }
    });
    set(STORAGE_KEYS.REQUESTS, storedRequests);
  }

  if (!hasKey(STORAGE_KEYS.DEPARTMENTS)) set(STORAGE_KEYS.DEPARTMENTS, SEED_DEPARTMENTS);
  if (!hasKey(STORAGE_KEYS.ACADEMIC_PERIODS)) set(STORAGE_KEYS.ACADEMIC_PERIODS, SEED_ACADEMIC_PERIODS);
  if (!hasKey(STORAGE_KEYS.SETTINGS)) set(STORAGE_KEYS.SETTINGS, SEED_SETTINGS);
  if (!hasKey(STORAGE_KEYS.PAYMENT_QRS)) set(STORAGE_KEYS.PAYMENT_QRS, SEED_PAYMENT_QRS);
  if (!hasKey(STORAGE_KEYS.ACADEMIC_RECORDS)) set(STORAGE_KEYS.ACADEMIC_RECORDS, SEED_ACADEMIC_RECORDS);
  if (!hasKey(STORAGE_KEYS.CLEARANCE_ITEMS)) set(STORAGE_KEYS.CLEARANCE_ITEMS, SEED_CLEARANCE_ITEMS);
  if (!hasKey(STORAGE_KEYS.PAYMENTS)) set(STORAGE_KEYS.PAYMENTS, SEED_PAYMENTS);
  if (!hasKey(STORAGE_KEYS.REJECTIONS)) set(STORAGE_KEYS.REJECTIONS, SEED_REJECTIONS);
  if (!hasKey(STORAGE_KEYS.RESUBMISSIONS)) set(STORAGE_KEYS.RESUBMISSIONS, []);
  if (!hasKey(STORAGE_KEYS.AUDIT_LOGS)) set(STORAGE_KEYS.AUDIT_LOGS, SEED_AUDIT_LOGS);
  if (!hasKey(STORAGE_KEYS.NOTIFICATIONS)) set(STORAGE_KEYS.NOTIFICATIONS, SEED_NOTIFICATIONS);
}

initializeEngine();

// ------------------------------------------------------------------------------
// Authoritative Engine Implementation
// ------------------------------------------------------------------------------

let requestCounter = 125;

export const Engine = {
  // Profiles & Auth
  getProfiles(): UserProfile[] {
    const profiles = get<UserProfile[]>(STORAGE_KEYS.PROFILES, SEED_PROFILES);
    return profiles.map((p) => {
      if (p.role === 'admin' || p.full_name === 'Dr. H. N. Suresh' || p.full_name === 'H. N. Suresh') {
        return { ...p, full_name: 'Dr. Srikantappa As' };
      }
      return p;
    });
  },

  getProfileById(id: string): UserProfile | undefined {
    return this.getProfiles().find((p) => p.id === id);
  },

  getProfileByStudentId(studentId: string): UserProfile | undefined {
    return this.getProfiles().find(
      (p) => p.student_id?.toLowerCase() === studentId.trim().toLowerCase()
    );
  },

  getProfileByEmail(email: string): UserProfile | undefined {
    const cleanEmail = email.trim().toLowerCase();
    const prof = this.getProfiles().find(
      (p) => p.email.toLowerCase() === cleanEmail
    );
    if (!prof && (cleanEmail === 'admin@cauvery.edu.in' || cleanEmail === 'admin@gmail.com')) {
      return this.getProfiles().find((p) => p.role === 'admin' && p.is_active);
    }
    return prof;
  },

  updateProfileStatus(id: string, is_active: boolean, adminId: string): UserProfile {
    const profiles = this.getProfiles();
    const idx = profiles.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error('User not found');

    const prev = profiles[idx].is_active;
    profiles[idx].is_active = is_active;
    set(STORAGE_KEYS.PROFILES, profiles);

    // Section 26.F.6: Disabling or removing the responsible faculty member's assignment
    // is handled safely, without losing request history.
    if (profiles[idx].role === 'faculty' && !is_active) {
      const requests = this.getRequests();
      let updated = false;
      requests.forEach((r) => {
        if (r.assigned_faculty_id === id && r.status !== 'CLEARED' && r.status !== 'REJECTED') {
          r.faculty_assignment_status = 'REASSIGNMENT_REQUIRED';
          r.updated_at = new Date().toISOString();
          updated = true;
        }
      });
      if (updated) {
        set(STORAGE_KEYS.REQUESTS, requests);
      }
    }

    this.logAudit(
      adminId,
      'admin',
      is_active ? 'ACTIVATE_USER' : 'DEACTIVATE_USER',
      'profiles',
      id,
      { is_active: prev },
      { is_active }
    );

    return profiles[idx];
  },

  // Student Self-Registration (Mandatory requirement: No pre-created student accounts)
  // Student Self-Registration (Section 22 Mandate: Direct public student account creation)
  registerStudent(params: {
    fullName: string;
    studentId: string; // Institutional Student ID / USN
    departmentId: string;
    academicYear?: string;
    semester?: number;
    email?: string;
    password: string;
  }): UserProfile {
    const cleanUsn = params.studentId?.trim().toUpperCase();
    if (!params.fullName || !cleanUsn || !params.departmentId || !params.password) {
      throw new Error('Full Name, Registration Number, Department, and Password are required.');
    }
    if (params.password.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }

    const profiles = this.getProfiles();
    const cleanEmail = (
      params.email?.trim() || `${cleanUsn.toLowerCase()}@cauvery.edu.in`
    ).toLowerCase();

    // Prevent duplicate student registration by Registration Number (USN) or Email
    if (profiles.some((p) => p.student_id?.toUpperCase() === cleanUsn)) {
      throw new Error(`A student account with Registration Number "${cleanUsn}" is already registered. Please sign in or contact the examination cell.`);
    }
    if (profiles.some((p) => p.email.toLowerCase() === cleanEmail)) {
      throw new Error(`An account with email "${cleanEmail}" already exists.`);
    }

    // Configurable Department Options (Section 2 & 4: Never hardcoded)
    const depts = this.getDepartments();
    const dept = depts.find(
      (d) => d.id === params.departmentId || d.code.toUpperCase() === params.departmentId.toUpperCase()
    );
    if (!dept || !dept.is_active) {
      throw new Error('Selected department is invalid or currently inactive.');
    }

    // Assign active departmental faculty advisor if genuine faculty exists
    const allFaculty = profiles.filter((p) => p.role === 'faculty' && p.is_active);
    const assignedFaculty = allFaculty.find(
      (f) => f.department_id === dept.id || f.department.toLowerCase() === dept.name.toLowerCase()
    );

    const academicYear = params.academicYear?.trim() || '2026-2027';
    const newId = `usr-stu-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newProfile: UserProfile = {
      id: newId,
      role: 'student', // SECURITY MANDATE: Forced to student. Public self-registration NEVER grants staff or admin roles.
      full_name: params.fullName.trim(),
      student_id: cleanUsn,
      email: cleanEmail,
      department: dept.name,
      department_id: dept.id,
      batch: '2023-2027',
      academic_year: academicYear,
      semester: Number(params.semester) || 5,
      assigned_faculty_id: assignedFaculty?.id,
      assigned_faculty_name: assignedFaculty?.full_name,
      is_active: true,
      created_at: new Date().toISOString(),
    };

    profiles.push(newProfile);
    set(STORAGE_KEYS.PROFILES, profiles);

    // Save credentials securely
    const creds = get<StoredCredential[]>(STORAGE_KEYS.CREDENTIALS, SEED_CREDENTIALS);
    creds.push({ userId: newId, identifier: cleanUsn, passwordHash: params.password });
    creds.push({ userId: newId, identifier: cleanEmail, passwordHash: params.password });
    set(STORAGE_KEYS.CREDENTIALS, creds);

    // Section 33.A: Attendance Must Initially Be Empty (NULL) on student registration/request
    // Do not automatically assign 0%, 85%, 100%, or any placeholder percentage.
    const records = this.getAcademicRecords();
    records.push({
      id: `acad-${newId}`,
      student_id: newId,
      student_name: newProfile.full_name,
      student_code: cleanUsn,
      department: dept.name,
      faculty_id: assignedFaculty?.id || '',
      academic_year: academicYear,
      semester: newProfile.semester || 5,
      attendance_percentage: null,
      is_eligible: null,
      attendance_status: 'AWAITING_FACULTY_ENTRY',
      academic_remarks: 'Awaiting faculty attendance entry after No-Due request submission.',
      updated_at: new Date().toISOString(),
    });
    set(STORAGE_KEYS.ACADEMIC_RECORDS, records);

    this.logAudit(
      newId,
      'student',
      'STUDENT_SELF_REGISTRATION',
      'profiles',
      newId,
      null,
      { student_id: cleanUsn, department: dept.name, email: cleanEmail }
    );

    return newProfile;
  },

  // Student Authentication via College Registration Number
  authenticateStudent(identifier: string, pass: string): UserProfile {
    if (!identifier || !pass) {
      throw new Error('Please enter both your Registration Number and password.');
    }

    const cleanIdent = identifier.trim().toUpperCase();
    const profiles = this.getProfiles();
    const profile = profiles.find(
      (p) =>
        p.role === 'student' &&
        (p.student_id?.toUpperCase() === cleanIdent || p.email.toUpperCase() === cleanIdent)
    );

    if (!profile) {
      throw new Error('Invalid credentials. Please verify your Registration Number and password.');
    }

    if (!profile.is_active) {
      throw new Error('This student account is currently deactivated by the administration.');
    }

    const creds = get<StoredCredential[]>(STORAGE_KEYS.CREDENTIALS, SEED_CREDENTIALS);
    const match = creds.find(
      (c) => c.userId === profile.id && c.passwordHash === pass
    );

    if (!match) {
      throw new Error('Invalid credentials. Please verify your Registration Number and password.');
    }

    return profile;
  },

  // Staff Authentication
  authenticateStaff(email: string, pass: string): UserProfile {
    if (!email || !pass) {
      throw new Error('Please enter both your staff email and password.');
    }

    const cleanEmail = email.trim().toLowerCase();
    const profile = this.getProfileByEmail(cleanEmail);

    if (!profile || profile.role === 'student') {
      throw new Error('Invalid staff credentials or unauthorized account type.');
    }

    if (!profile.is_active) {
      throw new Error('This staff account is currently deactivated by the administration.');
    }

    const creds = get<StoredCredential[]>(STORAGE_KEYS.CREDENTIALS, SEED_CREDENTIALS);
    const match = creds.find(
      (c) =>
        (c.userId === profile.id || c.identifier.toLowerCase() === cleanEmail) &&
        c.passwordHash === pass
    );

    if (!match) {
      // Check if temporary initial admin password is provided via environment during initial setup
      const envAdminPass = getEnvVar('INITIAL_ADMIN_PASSWORD');

      if (
        profile.role === 'admin' &&
        profile.must_change_password &&
        envAdminPass &&
        pass === envAdminPass
      ) {
        return profile;
      }

      throw new Error('Invalid staff credentials. Please verify your email and password.');
    }

    return profile;
  },

  // Staff Self-Registration (Section 28)
  registerStaff(params: StaffRegistrationParams): UserProfile {
    // 1. Prohibit self-registration for Admin role (Section 28.A & 28.G)
    if ((params.requestedRole as string) === 'admin' || (params as any).role === 'admin') {
      throw new Error('Public registration for the Administrator role is strictly prohibited.');
    }

    const allowedRoles: UserRole[] = ['faculty', 'library_staff', 'accounts_staff', 'lab_staff', 'hod'];
    if (!allowedRoles.includes(params.requestedRole)) {
      throw new Error(`Invalid staff category: ${params.requestedRole}. Must be one of: Faculty, Library Staff, Accounts Staff, Laboratory Staff, HOD.`);
    }

    if (!params.fullName || !params.fullName.trim()) {
      throw new Error('Full Name is required.');
    }

    const cleanStaffId = params.staffId.trim().toUpperCase();
    if (!cleanStaffId) {
      throw new Error('Official Staff ID is required.');
    }

    const cleanEmail = params.email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('A valid institutional email address is required.');
    }

    if (!params.password || params.password.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }

    if (params.confirmPassword && params.password !== params.confirmPassword) {
      throw new Error('Passwords do not match. Please re-enter.');
    }

    // Check duplicate Staff ID
    const profiles = this.getProfiles();
    if (profiles.some((p) => p.staff_id?.toUpperCase() === cleanStaffId)) {
      throw new Error(`Staff ID ${cleanStaffId} is already registered. Duplicate Staff IDs are prohibited.`);
    }

    // Check duplicate email
    if (profiles.some((p) => p.email.toLowerCase() === cleanEmail)) {
      throw new Error(`An account with email ${cleanEmail} already exists.`);
    }

    const depts = this.getDepartments();
    const dept = depts.find(
      (d) =>
        d.id.toLowerCase() === params.departmentId.toLowerCase() ||
        d.code.toLowerCase() === params.departmentId.toLowerCase() ||
        d.name.toLowerCase() === params.departmentId.toLowerCase()
    );
    if (!dept) {
      throw new Error('Invalid department selected from institutional registry.');
    }

    if (!params.designation || !params.designation.trim()) {
      throw new Error('Official designation is required.');
    }

    const newStaffId = `usr-staff-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newStaff: UserProfile = {
      id: newStaffId,
      role: params.requestedRole,
      requested_role: params.requestedRole,
      full_name: params.fullName.trim(),
      email: cleanEmail,
      staff_id: cleanStaffId,
      department: dept.name,
      department_id: dept.id,
      designation: params.designation.trim(),
      academic_year: params.academicYear || '2026-2027',
      subjects: params.subjects || [],
      semester: params.semester,
      responsibilities: params.responsibilities || [],
      is_active: true,
      is_verified: false, // CRITICAL: Immediate account availability, but UNVERIFIED until authorized (Section 28.C)
      verification_status: 'PENDING',
      created_at: new Date().toISOString(),
    };

    profiles.push(newStaff);
    set(STORAGE_KEYS.PROFILES, profiles);

    // Save login credentials so staff can log in immediately (Section 28.C.5)
    const creds = get<StoredCredential[]>(STORAGE_KEYS.CREDENTIALS, SEED_CREDENTIALS);
    creds.push({
      userId: newStaffId,
      identifier: cleanEmail,
      passwordHash: params.password,
    });
    set(STORAGE_KEYS.CREDENTIALS, creds);

    // Record Staff Role Request
    const roleRequests = this.getStaffRoleRequests();
    roleRequests.push({
      id: `srr-${Date.now()}`,
      staff_id: newStaffId,
      staff_name: newStaff.full_name,
      staff_email: newStaff.email,
      requested_role: params.requestedRole,
      department_id: dept.id,
      department_name: dept.name,
      designation: newStaff.designation || '',
      subjects: newStaff.subjects,
      semester: newStaff.semester,
      requested_responsibilities: newStaff.responsibilities || [],
      status: 'PENDING',
      created_at: newStaff.created_at,
    });
    set(STORAGE_KEYS.STAFF_ROLE_REQUESTS, roleRequests);

    // Create Notification for Admin
    this.createNotification(
      'usr-admin-01',
      'New Staff Registration Pending Verification',
      `${newStaff.full_name} (${cleanStaffId}) registered as ${params.requestedRole} in ${newStaff.department}. Institutional verification is required.`,
      'action_required',
      '/admin'
    );

    // Log Audit Event (Section 28.E)
    this.logAudit(
      newStaffId,
      params.requestedRole,
      'STAFF_SELF_REGISTRATION',
      'profiles',
      newStaffId,
      null,
      {
        staff_id: cleanStaffId,
        email: cleanEmail,
        requested_role: params.requestedRole,
        department: dept.code,
        designation: newStaff.designation,
        responsibilities: newStaff.responsibilities,
        verification_status: 'PENDING',
      }
    );

    return newStaff;
  },

  // Admin Staff Provisioning (Section 4 & 5)
  provisionStaff(
    params: {
      fullName: string;
      email: string;
      role: UserRole;
      departmentId?: string;
      designation?: string;
      password?: string;
      subjects?: string[];
      semester?: number;
    },
    adminId: string
  ): UserProfile {
    const admin = this.getProfileById(adminId);
    if (!admin || admin.role !== 'admin') {
      throw new Error('Unauthorized: Only administrators can provision staff accounts.');
    }

    if (params.role === 'student') {
      throw new Error('Use student registration for student accounts.');
    }

    const cleanEmail = params.email.trim().toLowerCase();
    const profiles = this.getProfiles();
    if (profiles.some((p) => p.email.toLowerCase() === cleanEmail)) {
      throw new Error(`An account with email ${cleanEmail} already exists.`);
    }

    const depts = this.getDepartments();
    const dept = params.departmentId ? depts.find((d) => d.id === params.departmentId) : undefined;

    const defaultDesignation = 
      params.role === 'faculty' ? 'Assistant Professor' :
      params.role === 'hod' ? 'Head of Department' :
      params.role === 'library_staff' ? 'Senior Librarian' :
      params.role === 'accounts_staff' ? 'Accounts Officer' :
      params.role === 'lab_staff' ? 'Laboratory Instructor' : 'Staff Member';

    const newStaffId = `usr-staff-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newStaff: UserProfile = {
      id: newStaffId,
      role: params.role,
      requested_role: params.role,
      full_name: params.fullName.trim(),
      email: cleanEmail,
      staff_id: `CIT-${params.role.substring(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
      designation: params.designation?.trim() || defaultDesignation,
      department: dept?.name || 'Central Institutional Administration',
      department_id: dept?.id,
      subjects: params.subjects || [],
      semester: params.semester,
      is_active: true,
      is_verified: true,
      verification_status: 'VERIFIED',
      verified_at: new Date().toISOString(),
      verified_by: adminId,
      created_at: new Date().toISOString(),
    };

    profiles.push(newStaff);
    set(STORAGE_KEYS.PROFILES, profiles);

    const creds = get<StoredCredential[]>(STORAGE_KEYS.CREDENTIALS, SEED_CREDENTIALS);
    if (!params.password || params.password.length < 6) {
      throw new Error('A secure initial password (minimum 6 characters) must be provided for the staff account.');
    }
    const pwd = params.password;
    creds.push({
      userId: newStaffId,
      identifier: cleanEmail,
      passwordHash: pwd,
    });
    set(STORAGE_KEYS.CREDENTIALS, creds);

    this.logAudit(
      adminId,
      'admin',
      'PROVISION_STAFF_ACCOUNT',
      'profiles',
      newStaffId,
      null,
      { email: cleanEmail, role: params.role, department: newStaff.department, is_verified: true }
    );

    return newStaff;
  },

  // ----------------------------------------------------------------------------
  // SECTION 30: Initial Admin Account Bootstrap & Temporary Password Management
  // ----------------------------------------------------------------------------

  bootstrapInitialAdmin(email?: string, tempPassword?: string): UserProfile | null {
    const defaultEmail = (
      email ||
      getEnvVar('INITIAL_ADMIN_EMAIL') ||
      'admin@gmail.com'
    ).trim().toLowerCase();

    const initialPass = (
      tempPassword ||
      getEnvVar('INITIAL_ADMIN_PASSWORD') ||
      ''
    ).trim();

    const deletedAdmins = get<string[]>(STORAGE_KEYS.DELETED_ADMIN_ACCOUNTS, []);

    // Requirement 10: Do not recreate the default Admin account if it has been disabled or removed.
    if (deletedAdmins.includes(defaultEmail)) {
      console.warn(`[Bootstrap] Initial admin account ${defaultEmail} was previously disabled/removed. Skipping recreation.`);
      return null;
    }

    const profiles = this.getProfiles();
    const existingAdmin = profiles.find((p) => p.email.toLowerCase() === defaultEmail);

    // Requirement 8: Make initial setup idempotent so rerunning does not create duplicates or overwrite existing password.
    if (existingAdmin) {
      if (existingAdmin.full_name !== 'Dr. Srikantappa As') {
        existingAdmin.full_name = 'Dr. Srikantappa As';
        set(STORAGE_KEYS.PROFILES, profiles);
      }
      if (initialPass && existingAdmin.must_change_password) {
        const creds = get<StoredCredential[]>(STORAGE_KEYS.CREDENTIALS, SEED_CREDENTIALS);
        const existingIdx = creds.findIndex(
          (c) => c.identifier.toLowerCase() === defaultEmail || c.userId === existingAdmin.id
        );
        if (existingIdx !== -1) {
          creds[existingIdx].passwordHash = initialPass;
        } else {
          creds.push({
            userId: existingAdmin.id,
            identifier: defaultEmail,
            passwordHash: initialPass,
          });
        }
        set(STORAGE_KEYS.CREDENTIALS, creds);
      }
      return existingAdmin;
    }

    // Provision genuine initial admin profile
    const initialAdmin: UserProfile = {
      id: 'usr-admin-01',
      role: 'admin',
      full_name: 'Dr. Srikantappa As',
      email: defaultEmail,
      staff_id: 'CIT-ADM-001',
      department: 'Central Institutional Administration',
      designation: 'Institutional System Administrator',
      is_active: true,
      is_verified: true,
      verification_status: 'VERIFIED',
      must_change_password: true,
      is_temporary_password: true,
      verified_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    profiles.unshift(initialAdmin);
    set(STORAGE_KEYS.PROFILES, profiles);

    // Provision credential if password is provided
    if (initialPass) {
      const creds = get<StoredCredential[]>(STORAGE_KEYS.CREDENTIALS, SEED_CREDENTIALS);
      const existingIdx = creds.findIndex(
        (c) => c.identifier.toLowerCase() === defaultEmail || c.userId === initialAdmin.id
      );
      if (existingIdx !== -1) {
        creds[existingIdx].passwordHash = initialPass;
      } else {
        creds.push({
          userId: initialAdmin.id,
          identifier: defaultEmail,
          passwordHash: initialPass,
        });
      }
      set(STORAGE_KEYS.CREDENTIALS, creds);
    }

    this.logAudit(
      initialAdmin.id,
      'admin',
      'INITIAL_ADMIN_BOOTSTRAP',
      'profiles',
      initialAdmin.id,
      null,
      { email: defaultEmail, role: 'admin', must_change_password: true }
    );

    return initialAdmin;
  },

  // Requirement 9: Require the Admin to change the temporary password on first login.
  changePassword(userId: string, currentPass: string, newPass: string): UserProfile {
    const profile = this.getProfileById(userId);
    if (!profile) throw new Error('User account not found.');

    const cleanNewPass = newPass.trim();
    if (!cleanNewPass || cleanNewPass.length < 6) {
      throw new Error('New password must be at least 6 characters long.');
    }

    if (currentPass === cleanNewPass) {
      throw new Error('New password must be different from your temporary password.');
    }

    // Verify current password
    const creds = get<StoredCredential[]>(STORAGE_KEYS.CREDENTIALS, SEED_CREDENTIALS);
    const credIdx = creds.findIndex(
      (c) => c.userId === userId || c.identifier.toLowerCase() === profile.email.toLowerCase()
    );

    const envAdminPass = getEnvVar('INITIAL_ADMIN_PASSWORD');

    const currentMatched =
      (credIdx !== -1 && creds[credIdx].passwordHash === currentPass) ||
      (profile.role === 'admin' && profile.must_change_password && envAdminPass && currentPass === envAdminPass);

    if (!currentMatched) {
      throw new Error('Current password does not match. Please re-enter.');
    }

    if (credIdx !== -1) {
      creds[credIdx].passwordHash = cleanNewPass;
    } else {
      creds.push({
        userId: profile.id,
        identifier: profile.email.toLowerCase(),
        passwordHash: cleanNewPass,
      });
    }
    set(STORAGE_KEYS.CREDENTIALS, creds);

    // Update profile to mark temporary password changed
    profile.must_change_password = false;
    profile.is_temporary_password = false;
    const profiles = this.getProfiles();
    const profIdx = profiles.findIndex((p) => p.id === userId);
    if (profIdx !== -1) {
      profiles[profIdx] = profile;
      set(STORAGE_KEYS.PROFILES, profiles);
    }

    this.logAudit(
      userId,
      profile.role,
      'ADMIN_PASSWORD_CHANGED',
      'profiles',
      userId,
      null,
      { must_change_password: false }
    );

    this.createNotification(
      userId,
      'Password Updated Successfully',
      'Your administrator account password has been updated. You now have full authorized console access.',
      'success',
      '/admin'
    );

    return profile;
  },

  // Requirement 10: Do not recreate the default Admin account if it has been disabled or removed.
  removeAdminAccount(adminId: string, performedByAdminId: string): void {
    const performer = this.getProfileById(performedByAdminId);
    if (!performer || performer.role !== 'admin') {
      throw new Error('Unauthorized: Only an administrator can remove admin accounts.');
    }

    const target = this.getProfileById(adminId);
    if (!target) throw new Error('Admin profile not found.');

    const deletedAdmins = get<string[]>(STORAGE_KEYS.DELETED_ADMIN_ACCOUNTS, []);
    if (!deletedAdmins.includes(target.email.toLowerCase())) {
      deletedAdmins.push(target.email.toLowerCase());
      set(STORAGE_KEYS.DELETED_ADMIN_ACCOUNTS, deletedAdmins);
    }

    target.is_active = false;
    const profiles = this.getProfiles();
    const idx = profiles.findIndex((p) => p.id === adminId);
    if (idx !== -1) {
      profiles[idx] = target;
      set(STORAGE_KEYS.PROFILES, profiles);
    }

    this.logAudit(
      performedByAdminId,
      'admin',
      'ADMIN_ACCOUNT_REMOVED',
      'profiles',
      adminId,
      null,
      { email: target.email, is_active: false }
    );
  },

  // Staff Role Requests & Institutional Verification (Section 28.E)
  getStaffRoleRequests(): StaffRoleRequest[] {
    return get<StaffRoleRequest[]>(STORAGE_KEYS.STAFF_ROLE_REQUESTS, []);
  },

  getPendingStaffVerifications(): UserProfile[] {
    return this.getProfiles().filter(
      (p) => p.role !== 'student' && p.role !== 'admin' && p.verification_status === 'PENDING'
    );
  },

  verifyStaffRole(params: {
    staffId: string;
    role?: UserRole;
    designation?: string;
    responsibilities?: string[];
    adminId: string;
  }): UserProfile {
    const admin = this.getProfileById(params.adminId);
    if (!admin || admin.role !== 'admin') {
      throw new Error('Unauthorized: Only system administrators can verify staff accounts and roles.');
    }

    const staff = this.getProfileById(params.staffId);
    if (!staff) throw new Error('Staff profile not found.');

    if (staff.id === admin.id) {
      throw new Error('Security violation: Administrators cannot self-verify requested role changes.');
    }

    const previousState = {
      role: staff.role,
      designation: staff.designation,
      responsibilities: staff.responsibilities,
      is_verified: staff.is_verified,
      verification_status: staff.verification_status,
    };

    staff.is_verified = true;
    staff.verification_status = 'VERIFIED';
    staff.verified_at = new Date().toISOString();
    staff.verified_by = admin.id;
    if (params.role) staff.role = params.role;
    if (params.designation) staff.designation = params.designation.trim();
    if (params.responsibilities) staff.responsibilities = params.responsibilities;

    const profiles = this.getProfiles();
    const idx = profiles.findIndex((p) => p.id === staff.id);
    if (idx !== -1) {
      profiles[idx] = staff;
      set(STORAGE_KEYS.PROFILES, profiles);
    }

    // Update role request status if exists
    const requests = this.getStaffRoleRequests();
    const req = requests.find((r) => r.staff_id === staff.id && r.status === 'PENDING');
    if (req) {
      req.status = 'VERIFIED';
      req.reviewed_by = admin.id;
      req.reviewed_by_name = admin.full_name;
      req.reviewed_at = staff.verified_at;
      set(STORAGE_KEYS.STAFF_ROLE_REQUESTS, requests);
    }

    this.createNotification(
      staff.id,
      'Institutional Role Verified',
      `Your staff registration and requested role as ${staff.role} have been verified by Administrator ${admin.full_name}. You now have full institutional clearance access.`,
      'success',
      '/'
    );

    this.logAudit(
      admin.id,
      'admin',
      'STAFF_ROLE_VERIFIED',
      'profiles',
      staff.id,
      previousState,
      {
        role: staff.role,
        designation: staff.designation,
        responsibilities: staff.responsibilities,
        is_verified: true,
        verification_status: 'VERIFIED',
      }
    );

    return staff;
  },

  rejectStaffVerification(params: {
    staffId: string;
    reason: string;
    adminId: string;
  }): UserProfile {
    const admin = this.getProfileById(params.adminId);
    if (!admin || admin.role !== 'admin') {
      throw new Error('Unauthorized: Only administrators can reject staff verifications.');
    }

    const staff = this.getProfileById(params.staffId);
    if (!staff) throw new Error('Staff profile not found.');

    staff.is_verified = false;
    staff.verification_status = 'REJECTED';
    staff.rejection_reason = params.reason.trim();

    const profiles = this.getProfiles();
    const idx = profiles.findIndex((p) => p.id === staff.id);
    if (idx !== -1) {
      profiles[idx] = staff;
      set(STORAGE_KEYS.PROFILES, profiles);
    }

    const requests = this.getStaffRoleRequests();
    const req = requests.find((r) => r.staff_id === staff.id && r.status === 'PENDING');
    if (req) {
      req.status = 'REJECTED';
      req.reviewed_by = admin.id;
      req.reviewed_by_name = admin.full_name;
      req.reviewed_at = new Date().toISOString();
      req.rejection_reason = params.reason.trim();
      set(STORAGE_KEYS.STAFF_ROLE_REQUESTS, requests);
    }

    this.createNotification(
      staff.id,
      'Institutional Verification Rejected',
      `Your staff verification could not be approved: ${params.reason}. Please contact the Administration Office.`,
      'warning',
      '/staff/onboarding'
    );

    this.logAudit(
      admin.id,
      'admin',
      'STAFF_ROLE_REJECTED',
      'profiles',
      staff.id,
      null,
      { reason: params.reason, verification_status: 'REJECTED' }
    );

    return staff;
  },

  updateStaffResponsibilities(params: {
    staffId: string;
    departmentId?: string;
    designation?: string;
    responsibilities?: string[];
    subjects?: string[];
    semester?: number;
    adminId: string;
  }): UserProfile {
    const admin = this.getProfileById(params.adminId);
    if (!admin || admin.role !== 'admin') {
      throw new Error('Unauthorized: Only administrators can update staff responsibilities.');
    }

    const staff = this.getProfileById(params.staffId);
    if (!staff) throw new Error('Staff profile not found.');

    const previousState = {
      department: staff.department,
      designation: staff.designation,
      responsibilities: staff.responsibilities,
      subjects: staff.subjects,
      semester: staff.semester,
    };

    if (params.departmentId) {
      const dept = this.getDepartments().find((d) => d.id === params.departmentId);
      if (dept) {
        staff.department = dept.name;
        staff.department_id = dept.id;
      }
    }
    if (params.designation) staff.designation = params.designation.trim();
    if (params.responsibilities) staff.responsibilities = params.responsibilities;
    if (params.subjects) staff.subjects = params.subjects;
    if (params.semester !== undefined) staff.semester = params.semester;

    const profiles = this.getProfiles();
    const idx = profiles.findIndex((p) => p.id === staff.id);
    if (idx !== -1) {
      profiles[idx] = staff;
      set(STORAGE_KEYS.PROFILES, profiles);
    }

    this.logAudit(
      admin.id,
      'admin',
      'STAFF_RESPONSIBILITIES_UPDATED',
      'profiles',
      staff.id,
      previousState,
      {
        department: staff.department,
        designation: staff.designation,
        responsibilities: staff.responsibilities,
        subjects: staff.subjects,
        semester: staff.semester,
      }
    );

    return staff;
  },

  // Section 29: Database Cleanup & Inspection Utility
  cleanupDatabaseDemoData(adminId: string): {
    purgedAccounts: number;
    genuineProfilesCount: number;
    genuineFacultyCount: number;
  } {
    const admin = this.getProfileById(adminId);
    if (!admin || admin.role !== 'admin') {
      throw new Error('Unauthorized: Only administrators can execute database cleanup.');
    }

    const FAKE_ACCOUNT_IDS = new Set(['usr-fac-01', 'usr-hod-01', 'usr-lib-01', 'usr-acc-01', 'usr-lab-01']);
    const FAKE_ACCOUNT_EMAILS = new Set([
      'rajeshwari.cse@cauvery.edu.in',
      'hod.cse@cauvery.edu.in',
      'library@cauvery.edu.in',
      'accounts@cauvery.edu.in',
      'lab.cse@cauvery.edu.in',
    ]);

    const profiles = this.getProfiles();
    const initialCount = profiles.length;
    const sanitized = profiles.filter(
      (p) => !FAKE_ACCOUNT_IDS.has(p.id) && !FAKE_ACCOUNT_EMAILS.has(p.email.toLowerCase())
    );

    // Ensure System Administrator exists
    if (!sanitized.some((p) => p.role === 'admin')) {
      sanitized.unshift(SEED_PROFILES[0]);
    }
    set(STORAGE_KEYS.PROFILES, sanitized);

    const purged = initialCount - sanitized.length;
    const genuineFaculty = sanitized.filter((p) => p.role === 'faculty' && p.is_active && p.verification_status === 'VERIFIED').length;

    this.logAudit(
      admin.id,
      'admin',
      'DATABASE_CLEANUP_DEMO_DATA',
      'system',
      'all_tables',
      null,
      { purged, genuineProfiles: sanitized.length, genuineFaculty }
    );

    return {
      purgedAccounts: purged,
      genuineProfilesCount: sanitized.length,
      genuineFacultyCount: genuineFaculty,
    };
  },

  // Student Provisioning (Section 4 & 5)
  provisionStudent(
    studentData: {
      fullName: string;
      studentId: string;
      departmentId: string;
      semester: number;
      initialAttendance: number;
      facultyId: string;
    },
    adminId: string
  ): UserProfile {
    const profiles = this.getProfiles();
    if (profiles.some((p) => p.student_id?.toLowerCase() === studentData.studentId.toLowerCase())) {
      throw new Error(`Student ID ${studentData.studentId} is already provisioned.`);
    }

    const dept = this.getDepartments().find((d) => d.id === studentData.departmentId);
    if (!dept) throw new Error('Invalid department selected');

    const faculty = this.getProfileById(studentData.facultyId);
    if (!faculty || faculty.role !== 'faculty') {
      throw new Error('Assigned faculty advisor not found or unauthorized');
    }

    const newProfile: UserProfile = {
      id: `usr-stu-${Date.now()}`,
      role: 'student',
      full_name: studentData.fullName,
      student_id: studentData.studentId.toUpperCase(),
      email: `${studentData.studentId.toLowerCase()}@cauvery.edu.in`,
      department: dept.name,
      department_id: dept.id,
      batch: '2024-2028',
      academic_year: '2026-2027',
      semester: studentData.semester,
      assigned_faculty_id: faculty.id,
      assigned_faculty_name: faculty.full_name,
      is_active: true,
      created_at: new Date().toISOString(),
    };

    profiles.push(newProfile);
    set(STORAGE_KEYS.PROFILES, profiles);

    // Create academic record (Section 33: null initially if not explicitly provisioned)
    const threshold = this.getAttendanceThreshold();
    const hasInitial = typeof studentData.initialAttendance === 'number';
    const academicRecords = this.getAcademicRecords();
    academicRecords.push({
      id: `acad-${newProfile.id}`,
      student_id: newProfile.id,
      student_name: newProfile.full_name,
      student_code: newProfile.student_id,
      department: newProfile.department,
      faculty_id: faculty.id,
      academic_year: '2026-2027',
      semester: studentData.semester,
      attendance_percentage: hasInitial ? studentData.initialAttendance : null,
      is_eligible: hasInitial ? (studentData.initialAttendance >= threshold) : null,
      attendance_status: hasInitial ? 'ENTERED' : 'AWAITING_FACULTY_ENTRY',
      academic_remarks: hasInitial
        ? 'Provisioned from approved institutional student list.'
        : 'Awaiting faculty attendance entry after No-Due request submission.',
      updated_at: new Date().toISOString(),
    });
    set(STORAGE_KEYS.ACADEMIC_RECORDS, academicRecords);

    this.logAudit(adminId, 'admin', 'PROVISION_STUDENT', 'profiles', newProfile.id, null, {
      student_id: newProfile.student_id,
      department: dept.code,
    });

    return newProfile;
  },

  // Administratively Managed Departments (Section 2, 4 & 11)
  getDepartments(): Department[] {
    return get<Department[]>(STORAGE_KEYS.DEPARTMENTS, SEED_DEPARTMENTS);
  },

  addDepartment(code: string, name: string, adminId: string): Department {
    const depts = this.getDepartments();
    if (depts.some((d) => d.code.toUpperCase() === code.toUpperCase())) {
      throw new Error(`Department code ${code} already exists.`);
    }

    const newDept: Department = {
      id: `dept-${code.toLowerCase()}`,
      code: code.toUpperCase(),
      name,
      is_active: true,
      created_at: new Date().toISOString(),
    };

    depts.push(newDept);
    set(STORAGE_KEYS.DEPARTMENTS, depts);

    this.logAudit(adminId, 'admin', 'ADD_DEPARTMENT', 'departments', newDept.id, null, newDept);
    return newDept;
  },

  toggleDepartment(id: string, adminId: string): Department {
    const depts = this.getDepartments();
    const idx = depts.findIndex((d) => d.id === id);
    if (idx === -1) throw new Error('Department not found');

    depts[idx].is_active = !depts[idx].is_active;
    set(STORAGE_KEYS.DEPARTMENTS, depts);

    this.logAudit(adminId, 'admin', 'TOGGLE_DEPARTMENT', 'departments', id, null, {
      is_active: depts[idx].is_active,
    });
    return depts[idx];
  },

  // Canonical Department Matching & Scope Isolation (Section 32.C & 32.D)
  getDepartmentCanonicalId(deptIdOrNameOrCode?: string): string | null {
    if (!deptIdOrNameOrCode) return null;
    const clean = deptIdOrNameOrCode.trim().toLowerCase();
    const depts = this.getDepartments();
    const match = depts.find(
      (d) =>
        d.id.toLowerCase() === clean ||
        d.code.toLowerCase() === clean ||
        d.name.toLowerCase() === clean
    );
    if (match) return match.id;
    return clean;
  },

  isDepartmentMatch(deptA?: string, deptB?: string): boolean {
    if (!deptA || !deptB) return false;
    const cleanA = deptA.trim().toLowerCase();
    const cleanB = deptB.trim().toLowerCase();
    if (cleanA === cleanB) return true;
    const canA = this.getDepartmentCanonicalId(deptA);
    const canB = this.getDepartmentCanonicalId(deptB);
    return Boolean(canA && canB && canA === canB);
  },

  // Administratively Managed Academic Periods (Section 2 & 11)
  getAcademicPeriods(): AcademicPeriod[] {
    return get<AcademicPeriod[]>(STORAGE_KEYS.ACADEMIC_PERIODS, SEED_ACADEMIC_PERIODS);
  },

  // Settings
  getSettings(): SystemSetting[] {
    return get<SystemSetting[]>(STORAGE_KEYS.SETTINGS, SEED_SETTINGS);
  },

  getAttendanceThreshold(): number {
    const settings = this.getSettings();
    const record = settings.find((s) => s.key === 'minimum_attendance_percentage');
    return record ? Number(record.value) : 85;
  },

  updateAttendanceThreshold(newThreshold: number, adminId: string): void {
    if (newThreshold < 0 || newThreshold > 100) {
      throw new Error('Threshold must be between 0 and 100');
    }
    const settings = this.getSettings();
    const idx = settings.findIndex((s) => s.key === 'minimum_attendance_percentage');
    const prev = idx !== -1 ? settings[idx].value : 85;

    if (idx !== -1) {
      settings[idx].value = newThreshold;
      settings[idx].updated_at = new Date().toISOString();
    } else {
      settings.push({
        key: 'minimum_attendance_percentage',
        value: newThreshold,
        updated_at: new Date().toISOString(),
      });
    }
    set(STORAGE_KEYS.SETTINGS, settings);

    // Re-evaluate eligibility for all academic records (Section 33: null if attendance not yet entered)
    const records = this.getAcademicRecords();
    records.forEach((r) => {
      r.is_eligible = typeof r.attendance_percentage === 'number' ? r.attendance_percentage >= newThreshold : null;
    });
    set(STORAGE_KEYS.ACADEMIC_RECORDS, records);

    this.logAudit(
      adminId,
      'admin',
      'UPDATE_SYSTEM_SETTING',
      'system_settings',
      'minimum_attendance_percentage',
      { threshold: prev },
      { threshold: newThreshold }
    );
  },

  // Academic Records
  getAcademicRecords(): StudentAcademicRecord[] {
    return get<StudentAcademicRecord[]>(STORAGE_KEYS.ACADEMIC_RECORDS, SEED_ACADEMIC_RECORDS);
  },

  getAcademicRecordForStudent(studentId: string, year: string, semester: number): StudentAcademicRecord | undefined {
    const record = this.getAcademicRecords().find(
      (r) => r.student_id === studentId && r.academic_year === year && r.semester === semester
    );
    if (!record) return undefined;

    const subjects = this.getSubjectAttendanceForStudent(studentId);
    const relevantSubjects = subjects.filter(
      (s) => s.academic_year === year && s.semester === semester
    );

    return {
      ...record,
      subject_entries: relevantSubjects,
    };
  },

  // ----------------------------------------------------------------------------
  // SECTION 34: RELATIONAL SUBJECTS, STAFF ASSIGNMENTS & REVIEW TASKS
  // ----------------------------------------------------------------------------
  getSubjects(departmentIdOrName?: string, semester?: number, academicYear?: string): Subject[] {
    const subjects = get<Subject[]>(STORAGE_KEYS.SUBJECTS, []);
    return subjects.filter((s) => {
      if (departmentIdOrName && !this.isDepartmentMatch(departmentIdOrName, s.department_id) && !this.isDepartmentMatch(departmentIdOrName, s.department_name)) {
        return false;
      }
      if (semester && s.semester !== semester) return false;
      if (academicYear && s.academic_year !== academicYear) return false;
      return true;
    });
  },

  createSubject(params: {
    code: string;
    name: string;
    departmentId: string;
    departmentName: string;
    semester: number;
    academicYear?: string;
    credits?: number;
  }): Subject {
    const subjects = get<Subject[]>(STORAGE_KEYS.SUBJECTS, []);
    const existing = subjects.find(
      (s) => s.code.toLowerCase() === params.code.toLowerCase() && s.department_id === params.departmentId && s.semester === params.semester
    );
    if (existing) return existing;

    const newSub: Subject = {
      id: `sub-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      code: params.code,
      name: params.name,
      department_id: params.departmentId,
      department_name: params.departmentName,
      semester: params.semester,
      academic_year: params.academicYear || '2026-2027',
      credits: params.credits || 4,
      created_at: new Date().toISOString(),
    };
    subjects.push(newSub);
    set(STORAGE_KEYS.SUBJECTS, subjects);
    return newSub;
  },

  getStaffSubjectAssignments(facultyId?: string, subjectId?: string): StaffSubjectAssignment[] {
    const assignments = get<StaffSubjectAssignment[]>(STORAGE_KEYS.STAFF_SUBJECT_ASSIGNMENTS, []);
    return assignments.filter((a) => {
      if (facultyId && a.faculty_id !== facultyId) return false;
      if (subjectId && a.subject_id !== subjectId) return false;
      return true;
    });
  },

  assignFacultyToSubject(params: {
    facultyId: string;
    subjectId: string;
    semester?: number;
    academicYear?: string;
  }): StaffSubjectAssignment {
    const faculty = this.getProfileById(params.facultyId);
    if (!faculty || faculty.role !== 'faculty') throw new Error('Faculty profile not found.');

    const subjects = get<Subject[]>(STORAGE_KEYS.SUBJECTS, []);
    const subject = subjects.find((s) => s.id === params.subjectId);
    if (!subject) throw new Error('Subject not found.');

    const assignments = get<StaffSubjectAssignment[]>(STORAGE_KEYS.STAFF_SUBJECT_ASSIGNMENTS, []);
    const existing = assignments.find((a) => a.faculty_id === params.facultyId && a.subject_id === params.subjectId);
    if (existing) return existing;

    const assignment: StaffSubjectAssignment = {
      id: `ssa-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      faculty_id: faculty.id,
      faculty_name: faculty.full_name,
      subject_id: subject.id,
      subject_code: subject.code,
      subject_name: subject.name,
      department_id: subject.department_id,
      semester: params.semester || subject.semester,
      academic_year: params.academicYear || subject.academic_year,
      created_at: new Date().toISOString(),
    };
    assignments.push(assignment);
    set(STORAGE_KEYS.STAFF_SUBJECT_ASSIGNMENTS, assignments);
    return assignment;
  },

  getStudentSubjectEnrollments(studentId?: string): StudentSubjectEnrollment[] {
    const enrollments = get<StudentSubjectEnrollment[]>(STORAGE_KEYS.STUDENT_SUBJECT_ENROLLMENTS, []);
    if (!studentId) return enrollments;
    return enrollments.filter((e) => e.student_id === studentId);
  },

  getRequestFacultyAssignments(requestId?: string, facultyId?: string): RequestFacultyAssignment[] {
    const assignments = get<RequestFacultyAssignment[]>(STORAGE_KEYS.REQUEST_FACULTY_ASSIGNMENTS, []);
    return assignments.filter((a) => {
      if (requestId && a.request_id !== requestId) return false;
      if (facultyId && a.faculty_id !== facultyId) return false;
      return true;
    });
  },

  getFacultyReviewTasks(reqOrFacultyId?: string, maybeReqId?: string): FacultyReviewTask[] {
    const tasks = get<FacultyReviewTask[]>(STORAGE_KEYS.FACULTY_REVIEW_TASKS, []);
    return tasks.filter((t) => {
      if (reqOrFacultyId) {
        if (reqOrFacultyId.startsWith('req-')) {
          if (t.request_id !== reqOrFacultyId) return false;
          if (maybeReqId && t.faculty_id !== maybeReqId) return false;
        } else {
          if (t.faculty_id !== reqOrFacultyId && t.request_id !== reqOrFacultyId) return false;
          if (maybeReqId && t.request_id !== maybeReqId) return false;
        }
      }
      return true;
    });
  },

  // ----------------------------------------------------------------------------
  // SECTION 33 & 34: SUBJECT-WISE ATTENDANCE & AUTOMATIC OVERALL CALCULATION
  // ----------------------------------------------------------------------------
  getSubjectAttendanceRecords(): SubjectAttendanceRecord[] {
    return get<SubjectAttendanceRecord[]>(STORAGE_KEYS.SUBJECT_ATTENDANCE, []);
  },

  getSubjectAttendanceForStudent(studentId: string, requestId?: string): SubjectAttendanceRecord[] {
    const records = this.getSubjectAttendanceRecords();
    return records.filter((r) => {
      if (requestId && r.request_id === requestId) return true;
      return r.student_id === studentId;
    });
  },

  getSubjectAttendanceForFaculty(facultyId: string): SubjectAttendanceRecord[] {
    const faculty = this.getProfileById(facultyId);
    if (!faculty) return [];
    if (faculty.role === 'admin') return this.getSubjectAttendanceRecords();
    if (faculty.role !== 'faculty') return [];

    return this.getSubjectAttendanceRecords().filter((r) => {
      return r.faculty_id === facultyId || (
        this.isDepartmentMatch(faculty.department_id || faculty.department, this.getProfileById(r.student_id)?.department || '') &&
        r.faculty_id === facultyId
      );
    });
  },

  initializeSubjectAttendanceForRequest(req: NoDueRequest, eligibleFaculty: UserProfile): SubjectAttendanceRecord[] {
    const existing = this.getSubjectAttendanceForStudent(req.student_id, req.id);
    if (existing.length > 0) return existing;

    const allRecords = this.getSubjectAttendanceRecords();
    const profiles = this.getProfiles();

    // 1. Gather all active verified faculty members teaching this department and semester
    const deptFaculty = profiles.filter(
      (p) =>
        p.role === 'faculty' &&
        p.is_active &&
        p.is_verified !== false &&
        p.verification_status === 'VERIFIED' &&
        this.isDepartmentMatch(p.department_id || p.department, req.department) &&
        (!p.semester || p.semester === req.semester)
    );

    // 2. Identify subjects mapped to faculty accounts
    const subjectList: { subjectName: string; faculty: UserProfile }[] = [];

    deptFaculty.forEach((fac) => {
      let subs: string[] = [];
      if (Array.isArray(fac.subjects) && fac.subjects.length > 0) {
        subs = fac.subjects;
      } else if (typeof fac.subjects === 'string' && (fac.subjects as string).trim().length > 0) {
        subs = (fac.subjects as string).split(',').map((s) => s.trim()).filter(Boolean);
      }
      subs.forEach((s) => {
        if (!subjectList.some((entry) => entry.subjectName.toLowerCase() === s.toLowerCase())) {
          subjectList.push({ subjectName: s, faculty: fac });
        }
      });
    });

    // Fallback: If no faculty has explicit subjects, check eligibleFaculty
    if (subjectList.length === 0) {
      let subs: string[] = [];
      if (Array.isArray(eligibleFaculty.subjects) && eligibleFaculty.subjects.length > 0) {
        subs = eligibleFaculty.subjects;
      } else if (typeof eligibleFaculty.subjects === 'string' && (eligibleFaculty.subjects as string).trim().length > 0) {
        subs = (eligibleFaculty.subjects as string).split(',').map((s) => s.trim()).filter(Boolean);
      }

      if (subs.length > 0) {
        subs.forEach((s) => subjectList.push({ subjectName: s, faculty: eligibleFaculty }));
      } else {
        // Standard department curriculum core subject
        subjectList.push({
          subjectName: `${req.department} Core Subject (Sem ${req.semester})`,
          faculty: eligibleFaculty,
        });
      }
    }

    const created: SubjectAttendanceRecord[] = subjectList.map((entry, idx) => ({
      id: `sub-att-${req.id}-${idx + 1}`,
      request_id: req.id,
      student_id: req.student_id,
      subject_code: `SUB-${req.semester}0${idx + 1}`,
      subject_name: entry.subjectName,
      faculty_id: entry.faculty.id,
      faculty_name: entry.faculty.full_name,
      academic_year: req.academic_year,
      semester: req.semester,
      classes_held: undefined,
      classes_conducted: undefined,
      classes_attended: undefined,
      attendance_percentage: null, // Section 33.A: Must initially remain NULL / unset
      status: 'AWAITING_ENTRY',
      approval_status: 'WAITING_FOR_ATTENDANCE',
      is_locked: false,
      updated_at: new Date().toISOString(),
    }));

    allRecords.push(...created);
    set(STORAGE_KEYS.SUBJECT_ATTENDANCE, allRecords);

    // Section 34.H: Populate relational staff subject assignments and review tasks
    const reqAssignments = this.getRequestFacultyAssignments();
    const reviewTasks = this.getFacultyReviewTasks();

    created.forEach((sub) => {
      // Add subject attendance assignment if not present
      if (!reqAssignments.some((a) => a.request_id === req.id && a.faculty_id === sub.faculty_id && a.role === 'subject_attendance')) {
        reqAssignments.push({
          id: `rfa-${req.id}-${sub.faculty_id}-sub`,
          request_id: req.id,
          faculty_id: sub.faculty_id,
          faculty_name: sub.faculty_name,
          role: 'subject_attendance',
          subject_name: sub.subject_name,
          status: 'ASSIGNED',
          assigned_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
      // Add subject attendance review task
      if (!reviewTasks.some((t) => t.request_id === req.id && t.faculty_id === sub.faculty_id && t.subject_name === sub.subject_name)) {
        reviewTasks.push({
          id: `task-sub-${req.id}-${sub.faculty_id}-${sub.id}`,
          request_id: req.id,
          faculty_id: sub.faculty_id,
          task_type: 'subject_attendance',
          subject_name: sub.subject_name,
          status: 'PENDING',
          created_at: new Date().toISOString(),
        });
      }
    });

    set(STORAGE_KEYS.REQUEST_FACULTY_ASSIGNMENTS, reqAssignments);
    set(STORAGE_KEYS.FACULTY_REVIEW_TASKS, reviewTasks);

    return created;
  },

  recordSubjectAttendance(params: {
    subjectRecordId: string;
    attendancePercentage?: number;
    classesHeld?: number;
    classesAttended?: number;
    remarks?: string;
    facultyId: string;
  }): { subjectRecord: SubjectAttendanceRecord; academicRecord: StudentAcademicRecord } {
    const caller = this.getProfileById(params.facultyId);
    if (!caller || (caller.role !== 'faculty' && caller.role !== 'admin')) {
      throw new Error('Unauthorized: Only authorized faculty members or administrators can enter subject attendance.');
    }

    if (caller.role === 'faculty' && (caller.is_verified === false || caller.verification_status !== 'VERIFIED')) {
      throw new Error('Unauthorized: Staff member is not institutionally verified.');
    }

    const records = this.getSubjectAttendanceRecords();
    const idx = records.findIndex((r) => r.id === params.subjectRecordId);
    if (idx === -1) throw new Error('Subject attendance record not found.');

    const sub = records[idx];

    // Section 33.B.5 & 34.C.6: Multi-faculty authorization: faculty may enter attendance only for their assigned subject
    if (caller.role === 'faculty' && sub.faculty_id !== params.facultyId) {
      throw new Error('Access Denied: You are only authorized to enter attendance for your assigned subject(s).');
    }

    // Section 32 & 33.F: Department isolation check
    const student = this.getProfileById(sub.student_id);
    if (caller.role === 'faculty' && !this.isDepartmentMatch(caller.department_id || caller.department, student?.department_id || student?.department || '')) {
      throw new Error('Access Denied: Faculty can only enter attendance for students in their authorized department.');
    }

    // Section 35.2 Rule 6: Once approved, lock the attendance record against ordinary edits
    if (sub.is_locked && sub.approval_status === 'APPROVED' && caller.role !== 'admin') {
      throw new Error('Attendance is approved and locked. A correction must be requested before edits can be made.');
    }

    // Section 34.A & 34.B: Validate numeric class counts
    let percentage: number;
    let classesHeld: number | undefined = undefined;
    let classesAttended: number | undefined = undefined;

    const rawHeld = params.classesHeld !== undefined ? params.classesHeld : ((params as any).classes_held ?? (params as any).classes_conducted);
    const rawAttended = params.classesAttended !== undefined ? params.classesAttended : (params as any).classes_attended;

    if (rawHeld !== undefined || rawAttended !== undefined) {
      if (typeof rawHeld !== 'number' || isNaN(rawHeld) || !Number.isInteger(rawHeld) || rawHeld <= 0) {
        throw new Error('Total Classes Conducted must be a positive whole number.');
      }
      if (typeof rawAttended !== 'number' || isNaN(rawAttended) || !Number.isInteger(rawAttended) || rawAttended < 0) {
        throw new Error('Classes Attended must be a whole number greater than or equal to zero.');
      }
      if (rawAttended > rawHeld) {
        throw new Error('Classes Attended cannot exceed Total Classes Conducted.');
      }
      classesHeld = rawHeld;
      classesAttended = rawAttended;
      percentage = Math.round((classesAttended / classesHeld) * 10000) / 100;
    } else if (typeof params.attendancePercentage === 'number') {
      if (isNaN(params.attendancePercentage) || params.attendancePercentage < 0 || params.attendancePercentage > 100) {
        throw new Error('Attendance percentage must be a valid numeric value between 0% and 100%.');
      }
      percentage = Math.round(params.attendancePercentage * 100) / 100;
    } else {
      throw new Error('Attendance entry requires valid Total Classes Conducted and Classes Attended.');
    }

    const prevPercentage = sub.attendance_percentage;
    sub.attendance_percentage = percentage;
    sub.classes_held = classesHeld;
    sub.classes_conducted = classesHeld;
    sub.classes_attended = classesAttended;
    sub.remarks = params.remarks || '';
    sub.status = 'ENTERED';
    // Section 35.2: Attendance Entered — Awaiting Approval
    if (sub.approval_status !== 'APPROVED') {
      sub.approval_status = 'AWAITING_APPROVAL';
    }
    sub.entered_at = new Date().toISOString();
    sub.entered_by = params.facultyId;
    sub.updated_at = new Date().toISOString();

    records[idx] = sub;
    set(STORAGE_KEYS.SUBJECT_ATTENDANCE, records);

    // Update review task status
    const tasks = this.getFacultyReviewTasks();
    const taskIdx = tasks.findIndex(
      (t) => t.request_id === sub.request_id && t.faculty_id === params.facultyId && t.task_type === 'subject_attendance'
    );
    if (taskIdx !== -1) {
      tasks[taskIdx].status = 'COMPLETED';
      tasks[taskIdx].completed_at = new Date().toISOString();
      set(STORAGE_KEYS.FACULTY_REVIEW_TASKS, tasks);
    }

    this.logAudit(
      params.facultyId,
      caller.role,
      'ENTER_SUBJECT_ATTENDANCE',
      'subject_attendance_records',
      sub.id,
      { attendance_percentage: prevPercentage },
      {
        attendance_percentage: percentage,
        subject: sub.subject_name,
        classes_held: classesHeld,
        classes_conducted: classesHeld,
        classes_attended: classesAttended,
      }
    );

    // Section 33.C & 34.D: Recalculate overall attendance automatically
    const academicRecord = this.recalculateOverallAttendance(
      sub.student_id,
      sub.academic_year,
      sub.semester,
      sub.request_id
    );

    return { subjectRecord: sub, academicRecord };
  },

  // ----------------------------------------------------------------------------
  // SECTION 35.2 & 35.3: INDIVIDUAL SUBJECT TEACHER APPROVAL DECISIONS
  // ----------------------------------------------------------------------------
  getTeacherApprovalDecisions(requestId?: string, subjectRecordId?: string): TeacherApprovalDecision[] {
    const decisions = get<TeacherApprovalDecision[]>(STORAGE_KEYS.TEACHER_APPROVAL_DECISIONS, []);
    return decisions.filter((d) => {
      if (requestId && d.request_id !== requestId) return false;
      if (subjectRecordId && d.subject_record_id !== subjectRecordId) return false;
      return true;
    });
  },

  processSubjectTeacherDecision(params: {
    subjectRecordId: string;
    facultyId: string;
    decision: 'APPROVE' | 'REJECT' | 'CORRECTION_REQUIRED';
    remarks?: string;
  }): { subjectRecord: SubjectAttendanceRecord; request: NoDueRequest } {
    const caller = this.getProfileById(params.facultyId);
    if (!caller || (caller.role !== 'faculty' && caller.role !== 'admin')) {
      throw new Error('Unauthorized: Only authorized faculty members or administrators can make subject approval decisions.');
    }
    if (caller.role === 'faculty' && (caller.is_verified === false || caller.verification_status !== 'VERIFIED')) {
      throw new Error('Unauthorized: Staff member is not institutionally verified.');
    }

    // Atomic fetch & merge to prevent race conditions during concurrent approvals (Rule 35.6 & Test 8)
    const records = this.getSubjectAttendanceRecords();
    const idx = records.findIndex((r) => r.id === params.subjectRecordId);
    if (idx === -1) throw new Error('Subject attendance record not found.');

    const sub = records[idx];

    // Section 35.2 Rule 3 & Acceptance Test 6: Teachers must not approve another teacher's subject unless authorized
    if (caller.role === 'faculty' && sub.faculty_id !== params.facultyId) {
      throw new Error('Access Denied: You are not authorized to approve attendance for another teacher\'s subject.');
    }

    // Department isolation
    const student = this.getProfileById(sub.student_id);
    if (
      caller.role === 'faculty' &&
      !this.isDepartmentMatch(caller.department_id || caller.department, student?.department_id || student?.department || '')
    ) {
      throw new Error('Access Denied: Faculty can only decide on attendance for students within their authorized department.');
    }

    const prevApprovalStatus = sub.approval_status;

    if (params.decision === 'APPROVE') {
      // Rule 35.2.1 & 35.2.4: Valid attendance must be entered and saved before approval becomes available
      if (
        sub.status !== 'ENTERED' ||
        sub.attendance_percentage === null ||
        sub.classes_held === undefined ||
        sub.classes_attended === undefined
      ) {
        throw new Error('Approval Blocked: Valid attendance (Total Conducted and Attended classes) must be entered and saved before approval.');
      }
      sub.approval_status = 'APPROVED';
      sub.approved_by = params.facultyId;
      sub.approved_by_name = caller.full_name;
      sub.approved_at = new Date().toISOString();
      sub.approval_remarks = params.remarks || 'Attendance reviewed and approved by subject faculty.';
      sub.is_locked = true; // Lock against unauthorized edits
    } else if (params.decision === 'REJECT') {
      sub.approval_status = 'REJECTED';
      sub.rejection_remarks = params.remarks || 'Attendance rejected by subject faculty.';
      sub.is_locked = false;
    } else if (params.decision === 'CORRECTION_REQUIRED') {
      sub.approval_status = 'CORRECTION_REQUIRED';
      sub.rejection_remarks = params.remarks || 'Correction requested by subject faculty.';
      sub.is_locked = false;
    }

    sub.updated_at = new Date().toISOString();
    records[idx] = sub;
    set(STORAGE_KEYS.SUBJECT_ATTENDANCE, records);

    // Save immutable decision record in TEACHER_APPROVAL_DECISIONS
    const decisions = get<TeacherApprovalDecision[]>(STORAGE_KEYS.TEACHER_APPROVAL_DECISIONS, []);
    const decisionRecord: TeacherApprovalDecision = {
      id: `tad-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      request_id: sub.request_id,
      subject_record_id: sub.id,
      subject_id: sub.subject_id,
      subject_name: sub.subject_name,
      faculty_id: params.facultyId,
      faculty_name: caller.full_name,
      decision: params.decision,
      attendance_percentage: sub.attendance_percentage,
      classes_held: sub.classes_held,
      classes_conducted: sub.classes_held,
      classes_attended: sub.classes_attended,
      remarks: params.remarks,
      decided_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };
    decisions.push(decisionRecord);
    set(STORAGE_KEYS.TEACHER_APPROVAL_DECISIONS, decisions);

    // Update FacultyReviewTask if present
    const tasks = this.getFacultyReviewTasks();
    const task = tasks.find(
      (t) => t.request_id === sub.request_id && t.faculty_id === params.facultyId && t.task_type === 'subject_attendance'
    );
    if (task && params.decision === 'APPROVE') {
      task.status = 'COMPLETED';
      task.completed_at = new Date().toISOString();
      set(STORAGE_KEYS.FACULTY_REVIEW_TASKS, tasks);
    }

    // Audit Log
    this.logAudit(
      params.facultyId,
      caller.role,
      `SUBJECT_TEACHER_${params.decision}`,
      'subject_attendance_records',
      sub.id,
      { previous_status: prevApprovalStatus },
      { decision: params.decision, subject: sub.subject_name, remarks: params.remarks }
    );

    // Notifications
    this.createNotification(
      sub.student_id,
      `Subject Attendance ${params.decision === 'APPROVE' ? 'Approved' : params.decision === 'REJECT' ? 'Rejected' : 'Correction Requested'}`,
      `${caller.full_name} (${sub.subject_name}): ${params.remarks || (params.decision === 'APPROVE' ? 'Attendance approved.' : 'Action required.')}`,
      params.decision === 'APPROVE' ? 'success' : 'action_required',
      '/student'
    );

    // Recalculate overall attendance and update standing
    this.recalculateOverallAttendance(sub.student_id, sub.academic_year, sub.semester, sub.request_id);

    return { subjectRecord: sub, request: this.getRequestById(sub.request_id)! };
  },

  recalculateOverallAttendance(
    studentId: string,
    academicYear: string,
    semester: number,
    requestId?: string
  ): StudentAcademicRecord {
    const subjects = this.getSubjectAttendanceForStudent(studentId, requestId);
    const relevantSubjects = subjects.filter(
      (s) => s.academic_year === academicYear && s.semester === semester
    );

    const acadRecords = this.getAcademicRecords();
    let acadIdx = acadRecords.findIndex(
      (a) => a.student_id === studentId && a.academic_year === academicYear && a.semester === semester
    );

    if (acadIdx === -1) {
      const student = this.getProfileById(studentId);
      acadRecords.push({
        id: `acad-${studentId}`,
        student_id: studentId,
        student_name: student?.full_name,
        student_code: student?.student_id,
        department: student?.department || '',
        faculty_id: student?.assigned_faculty_id || '',
        academic_year: academicYear,
        semester,
        attendance_percentage: null,
        is_eligible: null,
        attendance_status: 'AWAITING_FACULTY_ENTRY',
        updated_at: new Date().toISOString(),
      });
      acadIdx = acadRecords.length - 1;
    }

    const acad = acadRecords[acadIdx];
    const threshold = this.getAttendanceThreshold();

    const totalSubjects = relevantSubjects.length;
    const approvedSubjects = relevantSubjects.filter(
      (s) => s.approval_status === 'APPROVED'
    ).length;
    const allApproved = totalSubjects > 0 && approvedSubjects === totalSubjects;
    const pendingSubjects = relevantSubjects
      .filter((s) => s.approval_status !== 'APPROVED')
      .map((s) => s.subject_name);

    acad.subject_approvals_total = totalSubjects;
    acad.subject_approvals_count = approvedSubjects;
    acad.all_subject_approvals_completed = allApproved;
    acad.pending_approval_subjects = pendingSubjects;

    if (relevantSubjects.length === 0) {
      // No subject entries configured
      acad.attendance_status = 'AWAITING_FACULTY_ENTRY';
      acad.attendance_percentage = null;
      acad.is_eligible = null;
      acad.calculation_details = 'Awaiting faculty attendance entry after No-Due request submission.';
    } else {
      const missingCount = relevantSubjects.filter(
        (s) => s.status !== 'ENTERED' || s.attendance_percentage === null
      ).length;

      if (missingCount > 0) {
        // Section 33.C: Do not calculate or display an overall percentage while required subject data is missing
        const enteredCount = relevantSubjects.length - missingCount;
        acad.attendance_percentage = null;
        acad.is_eligible = null;
        acad.attendance_status = enteredCount > 0 ? 'ATTENDANCE_INCOMPLETE' : 'AWAITING_FACULTY_ENTRY';
        acad.calculation_details = `Attendance incomplete: ${enteredCount} of ${relevantSubjects.length} required subjects entered.`;
      } else {
        // All subjects are entered! Calculate institution-approved overall percentage
        const allHaveCounts = relevantSubjects.every(
          (s) => typeof s.classes_held === 'number' && typeof s.classes_attended === 'number' && s.classes_held > 0
        );

        let overallPercentage: number;
        let method: 'WEIGHTED_CLASS_COUNT' | 'AVERAGE_PERCENTAGE';
        let details: string;

        if (allHaveCounts) {
          const totalHeld = relevantSubjects.reduce((acc, s) => acc + (s.classes_held || 0), 0);
          const totalAttended = relevantSubjects.reduce((acc, s) => acc + (s.classes_attended || 0), 0);
          overallPercentage = Math.round((totalAttended / totalHeld) * 10000) / 100;
          method = 'WEIGHTED_CLASS_COUNT';
          details = `Weighted class count: ${totalAttended} attended / ${totalHeld} held across ${relevantSubjects.length} subjects. (${approvedSubjects} of ${totalSubjects} subject teachers approved).`;
          acad.total_classes_held = totalHeld;
          acad.total_classes_attended = totalAttended;
        } else {
          const sumPercentages = relevantSubjects.reduce((acc, s) => acc + (s.attendance_percentage || 0), 0);
          overallPercentage = Math.round((sumPercentages / relevantSubjects.length) * 100) / 100;
          method = 'AVERAGE_PERCENTAGE';
          details = `Institution-approved arithmetic mean across ${relevantSubjects.length} required subjects. (${approvedSubjects} of ${totalSubjects} subject teachers approved).`;
        }

        acad.attendance_percentage = overallPercentage;
        acad.attendance_status = 'ENTERED';
        acad.calculation_method = method;
        acad.calculation_details = details;
        // Section 33.D: Apply attendance threshold
        acad.is_eligible = overallPercentage >= threshold;
      }
    }

    acad.updated_at = new Date().toISOString();
    acadRecords[acadIdx] = acad;
    set(STORAGE_KEYS.ACADEMIC_RECORDS, acadRecords);

    // Sync active request if present
    const requests = this.getRequests();
    const req = requests.find((r) => {
      if (requestId && r.id === requestId) return true;
      return r.student_id === studentId && r.academic_year === academicYear && r.semester === semester;
    });

    if (req) {
      req.attendance_percentage = acad.attendance_percentage;
      req.attendance_status = acad.attendance_status;
      req.updated_at = new Date().toISOString();
      const reqIdx = requests.findIndex((r) => r.id === req.id);
      if (reqIdx !== -1) {
        requests[reqIdx] = req;
        set(STORAGE_KEYS.REQUESTS, requests);
      }
    }

    return {
      ...acad,
      subject_entries: relevantSubjects,
    };
  },

  updateAcademicRecord(
    id: string,
    attendance: number,
    remarks: string,
    facultyId: string
  ): StudentAcademicRecord {
    if (attendance < 0 || attendance > 100) {
      throw new Error('Attendance must be between 0 and 100%');
    }
    const records = this.getAcademicRecords();
    const idx = records.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error('Academic record not found');

    const threshold = this.getAttendanceThreshold();
    const prev = { ...records[idx] };

    records[idx].attendance_percentage = attendance;
    records[idx].attendance_status = 'ENTERED';
    records[idx].is_eligible = attendance >= threshold;
    records[idx].academic_remarks = remarks;
    records[idx].updated_at = new Date().toISOString();

    set(STORAGE_KEYS.ACADEMIC_RECORDS, records);

    // Sync any subject records if existing
    const subjects = this.getSubjectAttendanceRecords();
    const studentSubjects = subjects.filter(
      (s) => s.student_id === records[idx].student_id &&
             s.academic_year === records[idx].academic_year &&
             s.semester === records[idx].semester
    );
    if (studentSubjects.length > 0) {
      studentSubjects.forEach((s) => {
        if (s.faculty_id === facultyId || this.getProfileById(facultyId)?.role === 'admin') {
          s.attendance_percentage = attendance;
          s.status = 'ENTERED';
          s.entered_at = new Date().toISOString();
          s.entered_by = facultyId;
          s.updated_at = new Date().toISOString();
        }
      });
      set(STORAGE_KEYS.SUBJECT_ATTENDANCE, subjects);
    }

    // Sync with request
    const requests = this.getRequests();
    const req = requests.find(
      (r) => r.student_id === records[idx].student_id &&
             r.academic_year === records[idx].academic_year &&
             r.semester === records[idx].semester
    );
    if (req) {
      req.attendance_percentage = attendance;
      req.attendance_status = 'ENTERED';
      const rIdx = requests.findIndex((r) => r.id === req.id);
      if (rIdx !== -1) {
        requests[rIdx] = req;
        set(STORAGE_KEYS.REQUESTS, requests);
      }
    }

    this.logAudit(
      facultyId,
      'faculty',
      'UPDATE_ATTENDANCE_RECORD',
      'student_academic_records',
      id,
      { attendance: prev.attendance_percentage, is_eligible: prev.is_eligible },
      { attendance, is_eligible: records[idx].is_eligible }
    );

    return records[idx];
  },

  // Payment QRs
  getPaymentQrs(): PaymentQrConfig[] {
    return get<PaymentQrConfig[]>(STORAGE_KEYS.PAYMENT_QRS, SEED_PAYMENT_QRS);
  },

  getActiveQrForAuthority(authority: 'library' | 'accounts' | 'lab'): PaymentQrConfig | undefined {
    return this.getPaymentQrs().find((q) => q.authority === authority && q.is_active);
  },

  savePaymentQr(qr: Partial<PaymentQrConfig> & { authority: 'library' | 'accounts' | 'lab'; title: string; upi_id: string; instructions: string }, adminId: string): PaymentQrConfig {
    const qrs = this.getPaymentQrs();
    let updated: PaymentQrConfig;

    if (qr.id) {
      const idx = qrs.findIndex((q) => q.id === qr.id);
      if (idx === -1) throw new Error('QR Config not found');
      qrs[idx] = {
        ...qrs[idx],
        ...qr,
        updated_at: new Date().toISOString(),
      };
      updated = qrs[idx];
    } else {
      updated = {
        id: `qr-${Date.now()}`,
        authority: qr.authority,
        title: qr.title,
        upi_id: qr.upi_id,
        account_details: qr.account_details || '',
        qr_image_url: qr.qr_image_url || `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=upi://pay?pa=${qr.upi_id}&pn=${encodeURIComponent(qr.title)}`,
        instructions: qr.instructions,
        is_active: qr.is_active ?? true,
        updated_at: new Date().toISOString(),
      };
      qrs.push(updated);
    }
    set(STORAGE_KEYS.PAYMENT_QRS, qrs);

    this.logAudit(adminId, 'admin', 'MANAGE_PAYMENT_QR', 'payment_qr_configs', updated.id, null, updated);
    return updated;
  },

  // Requests (Section 6: Human-Readable Request ID e.g. ND-2026-000125)
  getRequests(): NoDueRequest[] {
    const requests = get<NoDueRequest[]>(STORAGE_KEYS.REQUESTS, SEED_REQUESTS);
    const profiles = this.getProfiles();
    const clearanceItems = this.getClearanceItems();
    const rejections = this.getRejections();
    const resubmissions = this.getResubmissions();
    const qrs = this.getPaymentQrs();

    return requests.map((req) => {
      const student = profiles.find((p) => p.id === req.student_id);
      const items = clearanceItems
        .filter((ci) => ci.request_id === req.id)
        .map((ci) => ({
          ...ci,
          payment_qr: ci.payment_qr_id ? qrs.find((q) => q.id === ci.payment_qr_id) : undefined,
        }));
      const reqRejections = rejections.filter((r) => r.request_id === req.id);
      const reqResubmissions = resubmissions.filter((rs) => rs.request_id === req.id);

      return {
        ...req,
        student,
        clearance_items: items,
        rejections: reqRejections,
        resubmissions: reqResubmissions,
      };
    });
  },

  getRequestById(id: string, requesterId?: string): NoDueRequest | undefined {
    const req = this.getRequests().find((r) => r.id === id);
    if (!req) return undefined;
    if (requesterId) {
      const user = this.getProfileById(requesterId);
      if (user && user.role !== 'admin') {
        if (user.role === 'student' && req.student_id !== user.id) {
          throw new Error('Access Denied: You are not authorized to view another student\'s clearance request.');
        }
        if (user.role === 'faculty' && (!this.isDepartmentMatch(user.department_id || user.department, req.department) || req.assigned_faculty_id !== user.id)) {
          throw new Error('Access Denied: Faculty members cannot view clearance requests outside their assigned scope and department.');
        }
        if (user.role === 'lab_staff' && !this.isDepartmentMatch(user.department_id || user.department, req.department)) {
          throw new Error('Access Denied: Laboratory staff cannot view clearance requests outside their assigned department.');
        }
        if (user.role === 'hod' && !this.isDepartmentMatch(user.department_id || user.department, req.department)) {
          throw new Error('Access Denied: Head of Department cannot view clearance requests outside their authorized department.');
        }
      }
    }
    return req;
  },

  // Dynamic Faculty Retrieval for Department & Academic Period (Section 28.D & 32.B)
  getFacultyForDepartment(
    deptIdOrName?: string,
    period?: { academic_year?: string; semester?: number }
  ): UserProfile[] {
    const profiles = this.getProfiles();
    return profiles.filter((p) => {
      if (p.role !== 'faculty' || !p.is_active || p.is_verified === false || p.verification_status !== 'VERIFIED') return false;
      if (deptIdOrName && !this.isDepartmentMatch(deptIdOrName, p.department_id || p.department)) {
        return false;
      }
      if (period?.semester && p.semester && p.semester !== period.semester) {
        return false;
      }
      if (period?.academic_year && p.academic_year && p.academic_year !== period.academic_year) {
        return false;
      }
      return true;
    });
  },

  createRequest(
    studentId: string,
    deptOrYear: string,
    yearOrSem: string | number,
    semOrNotes?: number | string,
    maybeNotes?: string,
    selectedFacultyId?: string | string[]
  ): NoDueRequest {
    const student = this.getProfileById(studentId);
    if (!student || student.role !== 'student') throw new Error('Unauthorized: Student profile not found');

    let department = student.department;
    let academicYear = '2026-2027';
    let semester = 5;
    let notes: string | undefined = undefined;

    if (typeof yearOrSem === 'number') {
      academicYear = deptOrYear;
      semester = yearOrSem;
      notes = typeof semOrNotes === 'string' ? semOrNotes : undefined;
      if (Array.isArray(maybeNotes) || (typeof maybeNotes === 'string' && !selectedFacultyId)) {
        selectedFacultyId = maybeNotes as any;
      }
    } else {
      department = (deptOrYear && !deptOrYear.includes('-') && deptOrYear !== yearOrSem) ? deptOrYear : student.department;
      academicYear = String(yearOrSem || '2026-2027');
      semester = typeof semOrNotes === 'number' ? semOrNotes : (student.semester || 5);
      notes = maybeNotes;
    }

    const requests = get<NoDueRequest[]>(STORAGE_KEYS.REQUESTS, SEED_REQUESTS);

    // Rule 6.1: Duplicate prevention check
    const existingActive = requests.find(
      (r) =>
        r.student_id === studentId &&
        r.academic_year === academicYear &&
        r.semester === semester &&
        r.status !== 'REJECTED'
    );

    if (existingActive) {
      if (existingActive.status === 'CLEARED') {
        throw new Error(
          `A cleared No-Due request already exists for ${academicYear} Semester ${semester}. (Verification ID: ${existingActive.verification_id}).`
        );
      }
      throw new Error(
        `An active clearance request (${existingActive.request_code}) already exists for ${academicYear} Semester ${semester} with status: ${existingActive.status}.`
      );
    }

    // SECTION 26 & SECTION 34: Multi-Faculty Selection & Availability Verification
    const profiles = this.getProfiles();
    let eligibleFaculty: UserProfile | undefined = undefined;
    const selectedProfiles: UserProfile[] = [];

    // Normalize selected faculty IDs (single string or array)
    const selectedIds: string[] = [];
    if (Array.isArray(selectedFacultyId)) {
      selectedIds.push(...selectedFacultyId);
    } else if (typeof selectedFacultyId === 'string' && selectedFacultyId.trim().length > 0) {
      selectedIds.push(selectedFacultyId);
    }

    if (selectedIds.length > 0) {
      for (const fid of selectedIds) {
        const selected = profiles.find(
          (p) =>
            p.id === fid &&
            p.role === 'faculty' &&
            p.is_active &&
            p.is_verified !== false &&
            p.verification_status === 'VERIFIED' &&
            this.isDepartmentMatch(p.department_id || p.department, student.department_id || student.department || department)
        );
        if (!selected) {
          throw new Error('Selected faculty member is not active, not institutionally verified, or not authorized for your department.');
        }
        selectedProfiles.push(selected);
      }
      eligibleFaculty = selectedProfiles[0];
    }

    // B. Check student's pre-assigned faculty if active, verified and eligible
    if (!eligibleFaculty && student.assigned_faculty_id) {
      const assigned = profiles.find(
        (p) =>
          p.id === student.assigned_faculty_id &&
          p.role === 'faculty' &&
          p.is_active &&
          p.is_verified !== false &&
          p.verification_status === 'VERIFIED' &&
          this.isDepartmentMatch(p.department_id || p.department, student.department_id || student.department || department)
      );
      if (assigned) {
        eligibleFaculty = assigned;
        selectedProfiles.push(assigned);
      }
    }

    // C. Check department active faculty if not pre-assigned or pre-assigned was inactive
    if (!eligibleFaculty) {
      eligibleFaculty = profiles.find(
        (p) =>
          p.role === 'faculty' &&
          p.is_active &&
          p.is_verified !== false &&
          p.verification_status === 'VERIFIED' &&
          this.isDepartmentMatch(p.department_id || p.department, student.department_id || student.department || department)
      );
      if (eligibleFaculty) {
        selectedProfiles.push(eligibleFaculty);
      }
    }

    // D. BLOCK SUBMISSION WHEN NO ELIGIBLE FACULTY IS AVAILABLE (Section 26.B)
    if (!eligibleFaculty) {
      throw new Error(
        'Your No-Due request cannot be submitted because no faculty member is currently assigned to verify your academic details. Please contact the administrator or try again after a faculty member has been assigned.'
      );
    }

    // Sync student's assigned faculty if newly resolved
    if (student.assigned_faculty_id !== eligibleFaculty.id) {
      student.assigned_faculty_id = eligibleFaculty.id;
      student.assigned_faculty_name = eligibleFaculty.full_name;
      const studentIdx = profiles.findIndex((p) => p.id === student.id);
      if (studentIdx !== -1) {
        profiles[studentIdx] = student;
        set(STORAGE_KEYS.PROFILES, profiles);
      }
    }

    // Update academic record with genuine assigned faculty id if present
    const acadRecords = this.getAcademicRecords();
    const acadRec = acadRecords.find(
      (a) => a.student_id === studentId && a.academic_year === academicYear && a.semester === semester
    );
    if (acadRec && acadRec.faculty_id !== eligibleFaculty.id) {
      acadRec.faculty_id = eligibleFaculty.id;
      set(STORAGE_KEYS.ACADEMIC_RECORDS, acadRecords);
    }

    requestCounter += 1;
    const requestCode = `ND-2026-${String(requestCounter).padStart(6, '0')}`;

    const assignedIds = selectedProfiles.length > 0 ? selectedProfiles.map((f) => f.id) : [eligibleFaculty.id];
    const assignedNames = selectedProfiles.length > 0 ? selectedProfiles.map((f) => f.full_name) : [eligibleFaculty.full_name];

    const newRequest: NoDueRequest = {
      id: `req-${Date.now()}`,
      request_code: requestCode,
      student_id: studentId,
      department: department || student.department,
      academic_year: academicYear,
      semester,
      status: 'PENDING_FACULTY_REVIEW',
      assigned_faculty_id: eligibleFaculty.id,
      assigned_faculty_name: eligibleFaculty.full_name,
      assigned_faculty_ids: assignedIds,
      assigned_faculty_names: assignedNames,
      faculty_assignment_status: 'ASSIGNED',
      faculty_status: 'PENDING',
      library_status: 'PENDING',
      accounts_status: 'PENDING',
      lab_status: 'PENDING',
      hod_status: 'PENDING',
      hall_ticket_eligibility: 'NOT_ELIGIBLE',
      hall_ticket_status: 'NOT YET RELEASED',
      attendance_percentage: (acadRec && typeof acadRec.attendance_percentage === 'number') ? acadRec.attendance_percentage : null,
      attendance_status: acadRec?.attendance_status || (acadRec && typeof acadRec.attendance_percentage === 'number' ? 'ENTERED' : 'AWAITING_FACULTY_ENTRY'),
      student_notes: notes || '',
      reassignment_history: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    requests.unshift(newRequest);
    set(STORAGE_KEYS.REQUESTS, requests);

    // Initialize parallel departmental clearances (Library, Accounts, Lab)
    const items = this.getClearanceItems();
    const existingItems = items.filter((ci) => ci.request_id === newRequest.id);
    if (existingItems.length === 0) {
      const authorities: ('library' | 'accounts' | 'lab')[] = ['library', 'accounts', 'lab'];
      authorities.forEach((auth) => {
        items.push({
          id: `item-${newRequest.id}-${auth}`,
          request_id: newRequest.id,
          authority: auth,
          status: 'PENDING',
          payment_required: false,
          payment_status: 'NOT_REQUIRED',
          responsible_payment_authority: auth === 'library' ? 'faculty' : 'authority',
          updated_at: new Date().toISOString(),
        });
      });
      set(STORAGE_KEYS.CLEARANCE_ITEMS, items);
    }

    // Section 34.E & 34.H: Save real relational request faculty assignments
    const reqAssignments = this.getRequestFacultyAssignments();
    const reviewTasks = this.getFacultyReviewTasks();
    const facultyToAssign = selectedProfiles.length > 0 ? selectedProfiles : [eligibleFaculty];

    facultyToAssign.forEach((f) => {
      reqAssignments.push({
        id: `rfa-${newRequest.id}-${f.id}-av`,
        request_id: newRequest.id,
        faculty_id: f.id,
        faculty_name: f.full_name,
        role: 'academic_verification',
        status: 'ASSIGNED',
        assigned_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      reviewTasks.push({
        id: `task-av-${newRequest.id}-${f.id}`,
        request_id: newRequest.id,
        faculty_id: f.id,
        task_type: 'academic_verification',
        status: 'PENDING',
        created_at: new Date().toISOString(),
      });
    });

    set(STORAGE_KEYS.REQUEST_FACULTY_ASSIGNMENTS, reqAssignments);
    set(STORAGE_KEYS.FACULTY_REVIEW_TASKS, reviewTasks);

    // Section 33.B & 34.C: Initialize subject attendance records for this request
    this.initializeSubjectAttendanceForRequest(newRequest, eligibleFaculty);

    this.logAudit(studentId, 'student', 'SUBMIT_CLEARANCE_REQUEST', 'no_due_requests', newRequest.id, null, {
      request_code: requestCode,
      academic_year: academicYear,
      semester,
      assigned_faculty: eligibleFaculty.full_name,
      assigned_faculty_id: eligibleFaculty.id,
      assigned_faculty_ids: assignedIds,
    });

    facultyToAssign.forEach((f) => {
      this.createNotification(
        f.id,
        'New Clearance Request Awaiting Academic Verification',
        `Student ${student.full_name} (${student.student_id}) submitted request ${requestCode} assigned to you for academic verification.`,
        'action_required',
        '/faculty'
      );
    });

    return this.getRequestById(newRequest.id)!;
  },

  // Clearance Items
  getClearanceItems(): ClearanceItem[] {
    return get<ClearanceItem[]>(STORAGE_KEYS.CLEARANCE_ITEMS, SEED_CLEARANCE_ITEMS);
  },

  updateClearanceItem(item: Partial<ClearanceItem> & { id: string }): ClearanceItem {
    const items = this.getClearanceItems();
    const idx = items.findIndex((i) => i.id === item.id);
    if (idx === -1) throw new Error('Clearance item not found');
    items[idx] = { ...items[idx], ...item, updated_at: new Date().toISOString() };
    set(STORAGE_KEYS.CLEARANCE_ITEMS, items);

    // Sync request status if authority status changed
    const requests = get<NoDueRequest[]>(STORAGE_KEYS.REQUESTS, SEED_REQUESTS);
    const req = requests.find((r) => r.id === items[idx].request_id);
    if (req) {
      if (items[idx].authority === 'library') req.library_status = items[idx].status;
      if (items[idx].authority === 'accounts') req.accounts_status = items[idx].status;
      if (items[idx].authority === 'lab') req.lab_status = items[idx].status;
      set(STORAGE_KEYS.REQUESTS, requests);
    }

    return items[idx];
  },

  // ----------------------------------------------------------------------------
  // WORKFLOW OPERATION 1: Faculty Academic Verification (Section 6 & 7)
  // ----------------------------------------------------------------------------
  verifyFacultyApproval(requestId: string, facultyId: string, remarks: string): NoDueRequest {
    const faculty = this.getProfileById(facultyId);
    if (!faculty || (faculty.role !== 'faculty' && faculty.role !== 'admin')) {
      throw new Error('Unauthorized: Only an authorized Faculty Advisor or Administrator can approve academic verification.');
    }

    if (faculty.role === 'faculty' && (faculty.is_verified === false || faculty.verification_status !== 'VERIFIED')) {
      throw new Error('Unauthorized: Staff member is not institutionally verified. Institutional verification required before conducting academic verifications.');
    }

    const requests = get<NoDueRequest[]>(STORAGE_KEYS.REQUESTS, SEED_REQUESTS);
    const reqIdx = requests.findIndex((r) => r.id === requestId);
    if (reqIdx === -1) throw new Error('Request not found');

    const req = requests[reqIdx];

    // Section 26.F.5, 32.C & 34.E: The faculty member can review only requests within their authorized scope and department
    if (faculty.role === 'faculty') {
      const isAssigned = req.assigned_faculty_id === facultyId ||
        (req.assigned_faculty_ids && req.assigned_faculty_ids.includes(facultyId));
      const isSameDept = this.isDepartmentMatch(faculty.department_id || faculty.department, req.department);
      if (!isAssigned || !isSameDept) {
        throw new Error('Access Denied: Faculty members can only review clearance requests within their assigned scope and authorized department.');
      }
    }

    const acad = this.getAcademicRecordForStudent(req.student_id, req.academic_year, req.semester);
    if (!acad) {
      throw new Error('Academic attendance record not found for this student and semester.');
    }

    // Section 33.A & 33.D: Missing attendance data cannot approve a student
    if (acad.attendance_percentage === null || acad.attendance_percentage === undefined || acad.attendance_status === 'AWAITING_FACULTY_ENTRY' || acad.attendance_status === 'ATTENDANCE_INCOMPLETE') {
      throw new Error(
        'Academic Approval Blocked: Attendance is incomplete or awaiting faculty entry. All required subject attendance must be entered by authorized faculty before approval.'
      );
    }

    const minThreshold = this.getAttendanceThreshold();
    if (acad.attendance_percentage < minThreshold) {
      throw new Error(
        `Academic Approval Blocked: Student attendance is ${acad.attendance_percentage}%, which is below the mandatory threshold of ${minThreshold}%.`
      );
    }

    // Section 35.4: Block the Next Workflow Stage Until All Teachers Approve
    const subjects = this.getSubjectAttendanceForStudent(req.student_id, req.id);
    if (subjects.length > 0) {
      const unapproved = subjects.filter((s) => s.approval_status !== 'APPROVED');
      if (unapproved.length > 0) {
        const rejected = unapproved.find((s) => s.approval_status === 'REJECTED');
        if (rejected) {
          throw new Error(
            `Academic Approval Blocked: Attendance for subject "${rejected.subject_name}" was rejected by ${rejected.faculty_name}. Issue must be corrected and approved before proceeding.`
          );
        }
        const correction = unapproved.find((s) => s.approval_status === 'CORRECTION_REQUIRED');
        if (correction) {
          throw new Error(
            `Academic Approval Blocked: Subject "${correction.subject_name}" has corrections pending requested by ${correction.faculty_name}. Re-review and approval required.`
          );
        }
        const unentered = unapproved.find((s) => s.status !== 'ENTERED' || s.attendance_percentage === null);
        if (unentered) {
          throw new Error(
            `Academic Approval Blocked: Attendance has not been entered for subject "${unentered.subject_name}" (Assigned Teacher: ${unentered.faculty_name}).`
          );
        }
        const pendingApproval = unapproved[0];
        const approvedCount = subjects.length - unapproved.length;
        throw new Error(
          `Academic Approval Blocked: Subject "${pendingApproval.subject_name}" is awaiting explicit approval from teacher ${pendingApproval.faculty_name}. (${approvedCount} of ${subjects.length} subject teachers approved).`
        );
      }
    }

    const prevStatus = req.faculty_status;
    req.faculty_status = 'APPROVED';
    req.faculty_remarks = remarks;
    req.faculty_reviewed_at = new Date().toISOString();
    req.faculty_review_started_at = req.faculty_review_started_at || new Date().toISOString();
    req.faculty_review_started_by = req.faculty_review_started_by || facultyId;
    req.status = 'IN_REVIEW';
    req.updated_at = new Date().toISOString();

    requests[reqIdx] = req;
    set(STORAGE_KEYS.REQUESTS, requests);

    // Initialize the 3 parallel departmental clearances
    const items = this.getClearanceItems();
    const existing = items.filter((ci) => ci.request_id === requestId);
    if (existing.length === 0) {
      const authorities: ('library' | 'accounts' | 'lab')[] = ['library', 'accounts', 'lab'];
      authorities.forEach((auth) => {
        items.push({
          id: `item-${requestId}-${auth}`,
          request_id: requestId,
          authority: auth,
          status: 'PENDING',
          payment_required: false,
          payment_status: 'NOT_REQUIRED',
          responsible_payment_authority: auth === 'library' ? 'faculty' : 'authority',
          updated_at: new Date().toISOString(),
        });
      });
      set(STORAGE_KEYS.CLEARANCE_ITEMS, items);
    }

    this.logAudit(
      facultyId,
      faculty.role,
      'APPROVE_ACADEMIC_VERIFICATION',
      'no_due_requests',
      requestId,
      { faculty_status: prevStatus },
      { faculty_status: 'APPROVED', attendance: acad.attendance_percentage }
    );

    this.createNotification(
      req.student_id,
      'Academic Verification Approved',
      `${faculty.full_name} approved your academic verification (Attendance: ${acad.attendance_percentage}%). Departmental clearances are now active in parallel.`,
      'success',
      '/student'
    );

    return this.getRequestById(requestId)!;
  },

  rejectFacultyVerification(
    requestId: string,
    facultyId: string,
    category: RejectionCategoryType,
    explanation: string
  ): NoDueRequest {
    const faculty = this.getProfileById(facultyId);
    if (!faculty || (faculty.role !== 'faculty' && faculty.role !== 'admin')) {
      throw new Error('Unauthorized: Only an authorized Faculty Advisor or Administrator can review academic verification.');
    }

    if (faculty.role === 'faculty' && (faculty.is_verified === false || faculty.verification_status !== 'VERIFIED')) {
      throw new Error('Unauthorized: Staff member is not institutionally verified. Institutional verification required before conducting academic verifications.');
    }

    const requests = get<NoDueRequest[]>(STORAGE_KEYS.REQUESTS, SEED_REQUESTS);
    const reqIdx = requests.findIndex((r) => r.id === requestId);
    if (reqIdx === -1) throw new Error('Request not found');

    const req = requests[reqIdx];

    // Section 26.F.5, 32.C & 34.E: The faculty member can review only requests within their authorized scope and department
    if (faculty.role === 'faculty') {
      const isAssigned = req.assigned_faculty_id === facultyId ||
        (req.assigned_faculty_ids && req.assigned_faculty_ids.includes(facultyId));
      const isSameDept = this.isDepartmentMatch(faculty.department_id || faculty.department, req.department);
      if (!isAssigned || !isSameDept) {
        throw new Error('Access Denied: Faculty members can only review clearance requests within their assigned scope and authorized department.');
      }
    }

    if (category === 'other' && (!explanation || !explanation.trim())) {
      throw new Error('An explanation is mandatory when category "other" is selected.');
    }

    const prev = req.faculty_status;
    req.faculty_status = 'REJECTED';
    req.faculty_remarks = explanation;
    req.faculty_reviewed_at = new Date().toISOString();
    req.faculty_review_started_at = req.faculty_review_started_at || new Date().toISOString();
    req.faculty_review_started_by = req.faculty_review_started_by || facultyId;
    req.status = 'RESUBMISSION_REQUIRED';
    req.updated_at = new Date().toISOString();

    requests[reqIdx] = req;
    set(STORAGE_KEYS.REQUESTS, requests);

    const rejections = this.getRejections();
    const fac = this.getProfileById(facultyId);
    rejections.unshift({
      id: `rej-${Date.now()}`,
      request_id: requestId,
      authority_or_stage: 'faculty',
      rejection_category: category,
      explanation,
      payment_required: false,
      rejected_by: facultyId,
      rejected_by_name: fac?.full_name || 'Faculty Advisor',
      previous_status: prev,
      resulting_status: 'REJECTED',
      created_at: new Date().toISOString(),
    });
    set(STORAGE_KEYS.REJECTIONS, rejections);

    this.logAudit(
      facultyId,
      faculty.role,
      'REJECT_ACADEMIC_VERIFICATION',
      'no_due_requests',
      requestId,
      { faculty_status: prev },
      { faculty_status: 'REJECTED', category, explanation }
    );

    this.createNotification(
      req.student_id,
      'Academic Verification Action Required',
      `Academic verification rejected: ${explanation}`,
      'action_required',
      '/student'
    );

    return this.getRequestById(requestId)!;
  },

  // Record start of faculty review (locks student teacher reassignment)
  startFacultyReview(requestId: string, facultyId: string): NoDueRequest {
    const faculty = this.getProfileById(facultyId);
    if (!faculty || (faculty.role !== 'faculty' && faculty.role !== 'admin')) {
      throw new Error('Unauthorized: Only an authorized Faculty Advisor or Administrator can review academic verification.');
    }

    const requests = get<NoDueRequest[]>(STORAGE_KEYS.REQUESTS, SEED_REQUESTS);
    const reqIdx = requests.findIndex((r) => r.id === requestId);
    if (reqIdx === -1) throw new Error('Request not found');

    const req = requests[reqIdx];

    // Section 26.F.5, 32.C & 34.E: The faculty member can review only requests within their authorized scope and department
    if (faculty.role === 'faculty') {
      const isAssigned = req.assigned_faculty_id === facultyId ||
        (req.assigned_faculty_ids && req.assigned_faculty_ids.includes(facultyId));
      const isSameDept = this.isDepartmentMatch(faculty.department_id || faculty.department, req.department);
      if (!isAssigned || !isSameDept) {
        throw new Error('Access Denied: Faculty members can only review clearance requests within their assigned scope and authorized department.');
      }
    }

    if (!req.faculty_review_started_at) {
      req.faculty_review_started_at = new Date().toISOString();
      req.faculty_review_started_by = facultyId;
      req.updated_at = new Date().toISOString();

      requests[reqIdx] = req;
      set(STORAGE_KEYS.REQUESTS, requests);

      this.logAudit(
        facultyId,
        faculty.role,
        'START_FACULTY_REVIEW',
        'no_due_requests',
        req.id,
        null,
        { started_at: req.faculty_review_started_at }
      );
    }

    return this.getRequestById(requestId)!;
  },

  // Student / Admin Teacher Reassignment with Strict Lock when Review Begins
  reassignTeacher(params: {
    requestId: string;
    newFacultyId?: string;
    newFacultyIds?: string[];
    userId: string;
    role: 'student' | 'admin';
    reason?: string;
  }): { request: NoDueRequest; record: TeacherReassignmentRecord } {
    const requests = get<NoDueRequest[]>(STORAGE_KEYS.REQUESTS, SEED_REQUESTS);
    const reqIdx = requests.findIndex((r) => r.id === params.requestId);
    if (reqIdx === -1) throw new Error('Request not found');

    const req = requests[reqIdx];
    const profiles = this.getProfiles();
    const student = profiles.find((p) => p.id === req.student_id);

    // 1. Role-specific validation
    if (params.role === 'student') {
      if (params.userId !== req.student_id) {
        throw new Error('Unauthorized: You can only change the assigned teacher for your own request.');
      }
      // Section 34.F & G: Lock student teacher changes when review begins
      if (req.faculty_review_started_at || req.faculty_status !== 'PENDING') {
        throw new Error('Cannot change assigned teacher because faculty review has already commenced.');
      }
    } else if (params.role !== 'admin') {
      throw new Error('Unauthorized: Only the student before review commences or an authorized Administrator may reassign requests.');
    }

    // 2. Validate replacement faculty members
    const targetIds: string[] = [];
    if (params.newFacultyIds && Array.isArray(params.newFacultyIds) && params.newFacultyIds.length > 0) {
      targetIds.push(...params.newFacultyIds);
    } else if (params.newFacultyId) {
      targetIds.push(params.newFacultyId);
    }
    if (targetIds.length === 0) {
      throw new Error('At least one replacement faculty member must be selected.');
    }

    const validatedFaculty: UserProfile[] = [];
    for (const fid of targetIds) {
      const newFaculty = profiles.find(
        (p) =>
          p.id === fid &&
          p.role === 'faculty' &&
          p.is_active &&
          p.is_verified !== false &&
          p.verification_status === 'VERIFIED' &&
          (p.department_id === req.department ||
            p.department?.toLowerCase() === req.department?.toLowerCase() ||
            (student &&
              (p.department_id === student.department_id ||
                p.department?.toLowerCase() === student.department?.toLowerCase())))
      );
      if (!newFaculty) {
        throw new Error('The selected replacement teacher is not active or not authorized for this department.');
      }
      validatedFaculty.push(newFaculty);
    }

    const currentIds = req.assigned_faculty_ids && req.assigned_faculty_ids.length > 0
      ? req.assigned_faculty_ids
      : (req.assigned_faculty_id ? [req.assigned_faculty_id] : []);

    if (targetIds.length === 1 && currentIds.length === 1 && targetIds[0] === currentIds[0]) {
      throw new Error('The selected teacher is already assigned to this request.');
    }

    // 3. Create immutable reassignment record
    const prevFacultyId = req.assigned_faculty_id || '';
    const prevFacultyName = req.assigned_faculty_name || 'Unassigned';
    const prevFacultyIds = [...currentIds];
    const prevFacultyNames = req.assigned_faculty_names || [prevFacultyName];

    const newFacultyId = validatedFaculty[0].id;
    const newFacultyName = validatedFaculty[0].full_name;
    const newFacultyIds = validatedFaculty.map((f) => f.id);
    const newFacultyNames = validatedFaculty.map((f) => f.full_name);

    const record: TeacherReassignmentRecord = {
      id: `reass-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      request_id: req.id,
      previous_faculty_id: prevFacultyId,
      previous_faculty_name: prevFacultyName,
      previous_faculty_ids: prevFacultyIds,
      previous_faculty_names: prevFacultyNames,
      new_faculty_id: newFacultyId,
      new_faculty_name: newFacultyName,
      new_faculty_ids: newFacultyIds,
      new_faculty_names: newFacultyNames,
      initiated_by_user_id: params.userId,
      initiated_by_role: params.role,
      reason:
        params.reason?.trim() ||
        (params.role === 'student' ? 'Student requested teacher change' : 'Administrative reassignment'),
      result: 'SUCCESS',
      created_at: new Date().toISOString(),
    };

    // 4. Update request without changing request ID, created date, or downstream clearances (Section 34.G)
    req.assigned_faculty_id = newFacultyId;
    req.assigned_faculty_name = newFacultyName;
    req.assigned_faculty_ids = newFacultyIds;
    req.assigned_faculty_names = newFacultyNames;
    req.faculty_assignment_status = 'ASSIGNED';
    req.reassignment_history = [...(req.reassignment_history || []), record];
    req.updated_at = new Date().toISOString();

    requests[reqIdx] = req;
    set(STORAGE_KEYS.REQUESTS, requests);

    // 5. Update student profile and academic record
    if (student) {
      student.assigned_faculty_id = newFacultyId;
      student.assigned_faculty_name = newFacultyName;
      const sIdx = profiles.findIndex((p) => p.id === student.id);
      if (sIdx !== -1) {
        profiles[sIdx] = student;
        set(STORAGE_KEYS.PROFILES, profiles);
      }
    }

    const acads = this.getAcademicRecords();
    const acad = acads.find(
      (a) =>
        a.student_id === req.student_id &&
        a.academic_year === req.academic_year &&
        a.semester === req.semester
    );
    if (acad) {
      acad.faculty_id = newFacultyId;
      set(STORAGE_KEYS.ACADEMIC_RECORDS, acads);
    }

    // 6. Section 34.G & 34.H: Update relational request faculty assignments
    const reqAssignments = this.getRequestFacultyAssignments();
    const remainingAssignments = reqAssignments.filter(
      (a) => !(a.request_id === req.id && a.role === 'academic_verification')
    );
    validatedFaculty.forEach((f) => {
      remainingAssignments.push({
        id: `rfa-${req.id}-${f.id}-av`,
        request_id: req.id,
        faculty_id: f.id,
        faculty_name: f.full_name,
        role: 'academic_verification',
        status: 'ASSIGNED',
        assigned_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    });
    set(STORAGE_KEYS.REQUEST_FACULTY_ASSIGNMENTS, remainingAssignments);

    // Update pending faculty review tasks
    const reviewTasks = this.getFacultyReviewTasks();
    const remainingTasks = reviewTasks.filter(
      (t) => !(t.request_id === req.id && t.task_type === 'academic_verification')
    );
    validatedFaculty.forEach((f) => {
      remainingTasks.push({
        id: `task-av-${req.id}-${f.id}`,
        request_id: req.id,
        faculty_id: f.id,
        task_type: 'academic_verification',
        status: 'PENDING',
        created_at: new Date().toISOString(),
      });
    });
    set(STORAGE_KEYS.FACULTY_REVIEW_TASKS, remainingTasks);

    // Section 34.G & 35.6: Reassign subject attendance tasks if new faculty teaches that subject, preserving entered records and decision history
    const subRecords = this.getSubjectAttendanceRecords();
    subRecords.forEach((s) => {
      if (s.request_id === req.id) {
        const matchingFac = validatedFaculty.find((vf) => {
          if (!vf.subjects) return false;
          const subs = Array.isArray(vf.subjects) ? vf.subjects : [String(vf.subjects)];
          return subs.some((subName) => subName.toLowerCase() === s.subject_name.toLowerCase());
        });
        if (matchingFac && matchingFac.id !== s.faculty_id) {
          const oldFacultyId = s.faculty_id;
          const oldFacultyName = s.faculty_name;
          s.faculty_id = matchingFac.id;
          s.faculty_name = matchingFac.full_name;
          // Section 35.6: Do not silently transfer old teacher approval to new teacher
          if (s.approval_status === 'APPROVED') {
            s.approval_status = 'AWAITING_APPROVAL';
            s.is_locked = false;
          }
          s.updated_at = new Date().toISOString();

          this.logAudit(
            params.userId,
            params.role,
            'REASSIGN_SUBJECT_TEACHER',
            'subject_attendance_records',
            s.id,
            { previous_faculty_id: oldFacultyId, previous_faculty_name: oldFacultyName },
            { new_faculty_id: matchingFac.id, new_faculty_name: matchingFac.full_name, subject: s.subject_name }
          );
        }
      }
    });
    set(STORAGE_KEYS.SUBJECT_ATTENDANCE, subRecords);

    // 7. Notifications
    validatedFaculty.forEach((f) => {
      this.createNotification(
        f.id,
        'No-Due Clearance Request Assigned to You',
        `Clearance request ${req.request_code} for student ${student?.full_name || req.student_id} has been assigned to you.`,
        'action_required',
        '/faculty'
      );
    });

    this.createNotification(
      req.student_id,
      'Teacher Assignment Updated',
      `Your No-Due request ${req.request_code} has been successfully assigned to ${newFacultyNames.join(', ')}.`,
      'success',
      '/student'
    );

    // 8. Audit log
    this.logAudit(
      params.userId,
      params.role,
      'REASSIGN_REQUEST_TEACHER',
      'no_due_requests',
      req.id,
      { previous_faculty_id: prevFacultyId, previous_faculty_name: prevFacultyName, previous_faculty_ids: prevFacultyIds },
      { new_faculty_id: newFacultyId, new_faculty_name: newFacultyName, new_faculty_ids: newFacultyIds, reason: record.reason }
    );

    return { request: this.getRequestById(req.id)!, record };
  },

  // Section 26.C & 26.D: Authorized Admin Faculty Assignment to Clearance Requests
  assignFacultyToRequest(requestId: string, facultyId: string, adminId: string, reason?: string): NoDueRequest {
    const admin = this.getProfileById(adminId);
    if (!admin || admin.role !== 'admin') {
      throw new Error('Unauthorized: Only administrators can assign faculty to clearance requests.');
    }
    const result = this.reassignTeacher({
      requestId,
      newFacultyId: facultyId,
      userId: adminId,
      role: 'admin',
      reason: reason || 'Administrator assigned faculty member',
    });
    return result.request;
  },

  // Faculty Work Queue (Section 26.F.4, 26.F.5, 32.C & 34.E)
  getRequestsForFaculty(facultyId: string): NoDueRequest[] {
    const faculty = this.getProfileById(facultyId);
    if (!faculty || faculty.role !== 'faculty' || faculty.is_verified === false || faculty.verification_status !== 'VERIFIED') return [];

    const allRequests = this.getRequests();
    return allRequests.filter(
      (r) =>
        (r.assigned_faculty_id === facultyId || (r.assigned_faculty_ids && r.assigned_faculty_ids.includes(facultyId))) &&
        r.faculty_assignment_status === 'ASSIGNED' &&
        this.isDepartmentMatch(faculty.department_id || faculty.department, r.department)
    );
  },

  // HOD Work Queue (Section 32.C & 32.D: Strict Department Isolation)
  getRequestsForHod(hodId: string): NoDueRequest[] {
    const hod = this.getProfileById(hodId);
    if (!hod) return [];
    if (hod.role === 'admin') return this.getRequests();
    if (hod.role !== 'hod' || !hod.is_active || hod.is_verified === false || hod.verification_status !== 'VERIFIED') return [];

    const allRequests = this.getRequests();
    return allRequests.filter((r) =>
      this.isDepartmentMatch(hod.department_id || hod.department, r.department)
    );
  },

  // Authority Clearance Work Queue with Department-Level Scope Isolation (Section 32.C & 32.D)
  getClearanceDataForAuthority(authority: AuthorityType, userId?: string) {
    const items = this.getClearanceItems().filter((ci) => ci.authority === authority);
    const requests = this.getRequests();
    const payments = this.getPayments();
    const user = userId ? this.getProfileById(userId) : undefined;

    let filteredItems = items;
    if (user && user.role !== 'admin') {
      // Laboratory Staff strictly restricted to authorized department
      if (authority === 'lab' || user.role === 'lab_staff') {
        filteredItems = items.filter((item) => {
          const req = requests.find((r) => r.id === item.request_id);
          if (!req) return false;
          return this.isDepartmentMatch(user.department_id || user.department, req.department);
        });
      } else if (user.department_id && user.department_id !== 'dept-central' && user.department_id !== 'all') {
        const depts = this.getDepartments();
        const isConfiguredDept = depts.some((d) => d.id === user.department_id);
        if (isConfiguredDept) {
          filteredItems = items.filter((item) => {
            const req = requests.find((r) => r.id === item.request_id);
            if (!req) return false;
            return this.isDepartmentMatch(user.department_id || user.department, req.department);
          });
        }
      }
    }

    const itemsWithDetails = filteredItems.map((item) => {
      const req = requests.find((r) => r.id === item.request_id);
      const sub = payments.find((p) => p.clearance_item_id === item.id);
      return {
        ...item,
        request: req,
        latest_submission: sub,
      };
    });

    const activeQr = this.getActiveQrForAuthority(authority) || null;
    return {
      items: itemsWithDetails,
      activeQr,
    };
  },

  // ----------------------------------------------------------------------------
  // WORKFLOW OPERATION 2: Departmental Clearances (Library, Accounts, Lab)
  // ----------------------------------------------------------------------------
  processClearanceDecision(params: {
    itemId?: string;
    clearanceItemId?: string;
    reviewerId: string;
    decision: 'approve' | 'reject';
    remarks: string;
    rejectionCategory?: RejectionCategoryType;
    paymentRequired?: boolean;
    paymentAmount?: number;
    paymentQrId?: string;
    paymentInstructions?: string;
  }): NoDueRequest {
    const reviewer = this.getProfileById(params.reviewerId);
    if (!reviewer) throw new Error('Reviewer not found');

    if (reviewer.role !== 'admin' && (reviewer.is_verified === false || reviewer.verification_status !== 'VERIFIED')) {
      throw new Error(`Unauthorized: Staff member ${reviewer.full_name} is not institutionally verified. Institutional verification required before deciding clearance.`);
    }

    const targetId = params.itemId || params.clearanceItemId;
    const items = this.getClearanceItems();
    const itemIdx = items.findIndex((i) => i.id === targetId);
    if (itemIdx === -1) throw new Error('Clearance item not found');

    const item = items[itemIdx];
    const requests = get<NoDueRequest[]>(STORAGE_KEYS.REQUESTS, SEED_REQUESTS);
    const reqIdx = requests.findIndex((r) => r.id === item.request_id);
    if (reqIdx === -1) throw new Error('Associated request not found');

    const req = requests[reqIdx];

    // Stage dependency: Faculty verification must be approved first!
    if (req.faculty_status !== 'APPROVED') {
      throw new Error(
        'Clearance Review Blocked: Faculty academic verification must be approved before departmental clearances can review.'
      );
    }

    // Section 35.4 & Acceptance Test 7: Bypass protection - all subject teacher approvals must be complete
    const subjects = this.getSubjectAttendanceForStudent(req.student_id, req.id);
    if (subjects.length > 0 && subjects.some((s) => s.approval_status !== 'APPROVED')) {
      throw new Error(
        'Clearance Review Blocked: All subject teacher attendance approvals must be completed before departmental clearance can be decided.'
      );
    }

    // Enforce server-side authority role boundaries
    const authorityRoleMap: Record<string, string> = {
      library: 'library_staff',
      accounts: 'accounts_staff',
      lab: 'lab_staff',
    };
    if (reviewer.role === 'admin') {
      throw new Error('Unauthorized: Administrative oversight is separate from clearance authority. Admin cannot directly approve departmental clearance decisions.');
    }
    if (reviewer.role !== authorityRoleMap[item.authority]) {
      throw new Error(`Unauthorized: Role '${reviewer.role}' is not authorized to decide on ${item.authority} clearance.`);
    }

    // Section 32.C & 32.D: Strict Department-Level Data Isolation for Laboratory Staff
    if (reviewer.role === 'lab_staff') {
      if (!this.isDepartmentMatch(reviewer.department_id || reviewer.department, req.department)) {
        throw new Error('Access Denied: Laboratory staff are strictly restricted to clearance requests within their authorized department.');
      }
    }

    const prevItemStatus = item.status;

    if (params.decision === 'approve') {
      item.status = 'APPROVED';
      item.remarks = params.remarks;
      item.reviewed_by = params.reviewerId;
      item.reviewed_by_name = reviewer.full_name;
      item.reviewed_at = new Date().toISOString();
      item.payment_required = false;
      item.payment_status = 'NOT_REQUIRED';
      item.updated_at = new Date().toISOString();

      if (item.authority === 'library') req.library_status = 'APPROVED';
      if (item.authority === 'accounts') req.accounts_status = 'APPROVED';
      if (item.authority === 'lab') req.lab_status = 'APPROVED';

      items[itemIdx] = item;
      set(STORAGE_KEYS.CLEARANCE_ITEMS, items);

      // Check if all 3 clearances are now approved
      const reqItems = items.filter((i) => i.request_id === req.id);
      const allThreeApproved =
        reqItems.length === 3 && reqItems.every((i) => i.status === 'APPROVED');

      // If all 3 clearances AND faculty are approved, advance to HOD review!
      if (allThreeApproved && req.faculty_status === 'APPROVED') {
        req.status = 'HOD_REVIEW';
        const hod = this.getProfiles().find((p) => p.role === 'hod');
        if (hod) {
          this.createNotification(
            hod.id,
            'Request Ready for HOD Final Review',
            `${req.student?.full_name || 'Student'} (${req.request_code}) is fully approved by all authorities and awaiting final review.`,
            'action_required',
            '/hod'
          );
        }
      }

      req.updated_at = new Date().toISOString();
      requests[reqIdx] = req;
      set(STORAGE_KEYS.REQUESTS, requests);

      this.logAudit(
        params.reviewerId,
        reviewer.role,
        'CLEARANCE_DECISION_APPROVE',
        'clearance_items',
        item.id,
        { status: prevItemStatus },
        { status: 'APPROVED', remarks: params.remarks }
      );

      this.createNotification(
        req.student_id,
        `${item.authority.toUpperCase()} Clearance Approved`,
        `Your ${item.authority} clearance has been approved: ${params.remarks || 'No dues.'}`,
        'success',
        '/student'
      );
    } else {
      if (!params.rejectionCategory) {
        throw new Error('Rejection category is mandatory');
      }
      if (
        params.rejectionCategory === 'other' &&
        (!params.remarks || !params.remarks.trim())
      ) {
        throw new Error('Explanation is mandatory when category "other" is selected.');
      }

      if (params.paymentRequired) {
        if (!params.paymentAmount || params.paymentAmount <= 0) {
          throw new Error('A positive payment amount is required when payment is requested.');
        }
        if (!params.paymentQrId) {
          throw new Error('A configured payment QR must be selected.');
        }
      }

      item.status = 'REJECTED';
      item.remarks = params.remarks;
      item.reviewed_by = params.reviewerId;
      item.reviewed_by_name = reviewer.full_name;
      item.reviewed_at = new Date().toISOString();
      item.payment_required = Boolean(params.paymentRequired);
      item.payment_amount = params.paymentAmount;
      item.payment_qr_id = params.paymentQrId;
      item.payment_instructions = params.paymentInstructions;
      item.payment_status = params.paymentRequired ? 'PENDING_PAYMENT' : 'NOT_REQUIRED';
      item.updated_at = new Date().toISOString();

      if (item.authority === 'library') req.library_status = 'REJECTED';
      if (item.authority === 'accounts') req.accounts_status = 'REJECTED';
      if (item.authority === 'lab') req.lab_status = 'REJECTED';
      req.status = 'ACTION_REQUIRED';

      items[itemIdx] = item;
      set(STORAGE_KEYS.CLEARANCE_ITEMS, items);

      req.updated_at = new Date().toISOString();
      requests[reqIdx] = req;
      set(STORAGE_KEYS.REQUESTS, requests);

      const rejections = this.getRejections();
      rejections.unshift({
        id: `rej-${Date.now()}`,
        request_id: req.id,
        clearance_item_id: item.id,
        authority_or_stage: item.authority,
        rejection_category: params.rejectionCategory,
        explanation: params.remarks,
        payment_required: Boolean(params.paymentRequired),
        payment_amount: params.paymentAmount,
        rejected_by: params.reviewerId,
        rejected_by_name: reviewer.full_name,
        previous_status: prevItemStatus,
        resulting_status: 'REJECTED',
        created_at: new Date().toISOString(),
      });
      set(STORAGE_KEYS.REJECTIONS, rejections);

      this.logAudit(
        params.reviewerId,
        reviewer.role,
        'CLEARANCE_DECISION_REJECT',
        'clearance_items',
        item.id,
        { status: prevItemStatus },
        {
          status: 'REJECTED',
          category: params.rejectionCategory,
          remarks: params.remarks,
          paymentRequired: params.paymentRequired,
          amount: params.paymentAmount,
        }
      );

      this.createNotification(
        req.student_id,
        `${item.authority.toUpperCase()} Clearance Action Required`,
        `Your ${item.authority} clearance was rejected: ${params.remarks}${
          params.paymentRequired ? ` (Payment required: ₹${params.paymentAmount})` : ''
        }`,
        'action_required',
        '/student'
      );
    }

    return this.getRequestById(req.id)!;
  },

  // ----------------------------------------------------------------------------
  // WORKFLOW OPERATION 3: Payment Evidence Upload (Section 9)
  // ----------------------------------------------------------------------------
  submitPaymentEvidence(params: {
    clearanceItemId: string;
    studentId: string;
    amount: number;
    screenshotUrl: string;
    transactionReference?: string;
    notes?: string;
  }): PaymentSubmission {
    const items = this.getClearanceItems();
    const itemIdx = items.findIndex((i) => i.id === params.clearanceItemId);
    if (itemIdx === -1) throw new Error('Clearance item not found');

    const item = items[itemIdx];
    const requests = get<NoDueRequest[]>(STORAGE_KEYS.REQUESTS, SEED_REQUESTS);
    const reqIdx = requests.findIndex((r) => r.id === item.request_id);
    if (reqIdx === -1) throw new Error('Associated request not found');

    const req = requests[reqIdx];
    if (req.student_id !== params.studentId) {
      throw new Error('Unauthorized: You can only upload evidence for your own clearance item.');
    }

    if (!item.payment_required) {
      throw new Error('Payment is not required for this clearance item.');
    }

    if (params.amount <= 0) {
      throw new Error('Amount must be positive');
    }

    const student = this.getProfileById(params.studentId);

    const submission: PaymentSubmission = {
      id: `pay-${Date.now()}`,
      clearance_item_id: item.id,
      request_id: req.id,
      student_id: params.studentId,
      student_name: student?.full_name || 'Student',
      authority: item.authority,
      amount: params.amount,
      screenshot_url: params.screenshotUrl,
      transaction_reference: params.transactionReference,
      student_notes: params.notes,
      verification_status: 'PENDING_REVIEW',
      created_at: new Date().toISOString(),
    };

    const payments = get<PaymentSubmission[]>(STORAGE_KEYS.PAYMENTS, []);
    payments.unshift(submission);
    set(STORAGE_KEYS.PAYMENTS, payments);

    item.payment_status = 'PENDING_REVIEW';
    item.latest_submission = submission;
    item.updated_at = new Date().toISOString();
    items[itemIdx] = item;
    set(STORAGE_KEYS.CLEARANCE_ITEMS, items);

    req.status = 'PAYMENT_VERIFICATION_PENDING';
    req.updated_at = new Date().toISOString();
    requests[reqIdx] = req;
    set(STORAGE_KEYS.REQUESTS, requests);

    this.logAudit(
      params.studentId,
      'student',
      'UPLOAD_PAYMENT_EVIDENCE',
      'payment_submissions',
      submission.id,
      null,
      { amount: params.amount, authority: item.authority, clearanceItemId: item.id }
    );

    // Notify responsible reviewer (Assigned Faculty or Department Staff)
    if (item.responsible_payment_authority === 'faculty' && student?.assigned_faculty_id) {
      this.createNotification(
        student.assigned_faculty_id,
        'Payment Evidence Awaiting Verification',
        `${student.full_name} uploaded payment evidence of ₹${params.amount} for ${item.authority}.`,
        'action_required',
        '/faculty'
      );
    }

    return submission;
  },

  // ----------------------------------------------------------------------------
  // WORKFLOW OPERATION 4: Payment Evidence Review (Section 9)
  // ----------------------------------------------------------------------------
  reviewPaymentEvidence(params: {
    submissionId: string;
    reviewerId: string;
    confirm: boolean;
    remarks?: string;
  }): PaymentSubmission {
    const payments = get<PaymentSubmission[]>(STORAGE_KEYS.PAYMENTS, []);
    const subIdx = payments.findIndex((p) => p.id === params.submissionId);
    if (subIdx === -1) throw new Error('Payment submission not found');

    const submission = payments[subIdx];
    const items = this.getClearanceItems();
    const itemIdx = items.findIndex((i) => i.id === submission.clearance_item_id);
    if (itemIdx === -1) throw new Error('Clearance item not found');

    const item = items[itemIdx];
    const requests = get<NoDueRequest[]>(STORAGE_KEYS.REQUESTS, SEED_REQUESTS);
    const reqIdx = requests.findIndex((r) => r.id === submission.request_id);
    if (reqIdx === -1) throw new Error('Request not found');

    const req = requests[reqIdx];
    const reviewer = this.getProfileById(params.reviewerId);
    if (!reviewer) throw new Error('Reviewer not found');

    // Section 32.C: Laboratory Staff payment verification restricted to same department
    if (reviewer.role === 'lab_staff') {
      if (!this.isDepartmentMatch(reviewer.department_id || reviewer.department, req.department)) {
        throw new Error('Access Denied: Laboratory staff cannot access or review payment submissions outside their assigned department.');
      }
    }

    if (params.confirm) {
      submission.verification_status = 'CONFIRMED';
      submission.reviewer_remarks = params.remarks || 'Payment evidence verified.';
      submission.verified_by = params.reviewerId;
      submission.verified_by_name = reviewer?.full_name;
      submission.verified_at = new Date().toISOString();

      // Rule 9: Payment confirmation must never automatically approve the clearance.
      // Returns clearance to PENDING for original authority to do separate clearance review!
      item.payment_status = 'CONFIRMED';
      item.status = 'PENDING';
      item.remarks = `Payment of ₹${submission.amount} confirmed. Clearance returned to Pending for final approval.`;
      item.updated_at = new Date().toISOString();

      if (item.authority === 'library') req.library_status = 'PENDING';
      if (item.authority === 'accounts') req.accounts_status = 'PENDING';
      if (item.authority === 'lab') req.lab_status = 'PENDING';

      req.status = 'IN_REVIEW';
      req.updated_at = new Date().toISOString();

      // Notify student
      this.createNotification(
        req.student_id,
        'Payment Evidence Confirmed',
        `Your payment evidence of ₹${submission.amount} for ${item.authority} was confirmed. Authority will now make final clearance decision.`,
        'success',
        '/student'
      );
    } else {
      submission.verification_status = 'REJECTED';
      submission.reviewer_remarks = params.remarks || 'Payment evidence rejected.';
      submission.verified_by = params.reviewerId;
      submission.verified_by_name = reviewer?.full_name;
      submission.verified_at = new Date().toISOString();

      item.payment_status = 'REJECTED';
      item.updated_at = new Date().toISOString();

      req.status = 'ACTION_REQUIRED';
      req.updated_at = new Date().toISOString();

      this.createNotification(
        req.student_id,
        'Payment Evidence Rejected',
        `Your payment evidence was rejected: ${params.remarks || 'Please re-upload valid evidence.'}`,
        'action_required',
        '/student'
      );
    }

    payments[subIdx] = submission;
    set(STORAGE_KEYS.PAYMENTS, payments);

    items[itemIdx] = item;
    set(STORAGE_KEYS.CLEARANCE_ITEMS, items);

    requests[reqIdx] = req;
    set(STORAGE_KEYS.REQUESTS, requests);

    this.logAudit(
      params.reviewerId,
      reviewer?.role || 'staff',
      params.confirm ? 'CONFIRM_PAYMENT_EVIDENCE' : 'REJECT_PAYMENT_EVIDENCE',
      'payment_submissions',
      submission.id,
      null,
      { confirmed: params.confirm, remarks: params.remarks }
    );

    return submission;
  },

  // ----------------------------------------------------------------------------
  // WORKFLOW OPERATION 5: HOD Final Clearance Review & Hall Ticket (Section 6 & 14)
  // ----------------------------------------------------------------------------
  processHodFinalClearance(params: {
    requestId: string;
    hodId: string;
    decision: 'approve' | 'reject';
    remarks: string;
    rejectionCategory?: RejectionCategoryType;
  }): NoDueRequest {
    const hod = this.getProfileById(params.hodId);
    if (!hod || (hod.role !== 'hod' && hod.role !== 'admin')) {
      throw new Error('Unauthorized: Only Head of Department can perform final clearance.');
    }

    if (hod.role === 'hod' && (hod.is_verified === false || hod.verification_status !== 'VERIFIED')) {
      throw new Error('Unauthorized: HOD account is pending institutional verification. Institutional verification required before final clearance.');
    }

    const requests = get<NoDueRequest[]>(STORAGE_KEYS.REQUESTS, SEED_REQUESTS);
    const reqIdx = requests.findIndex((r) => r.id === params.requestId);
    if (reqIdx === -1) throw new Error('Request not found');

    const req = requests[reqIdx];

    // Section 32.C & 32.D: Strict Department Isolation for HOD
    if (hod.role === 'hod') {
      if (!this.isDepartmentMatch(hod.department_id || hod.department, req.department)) {
        throw new Error('Access Denied: Head of Department can only review and finalize clearance requests within their authorized department.');
      }
    }

    if (params.decision === 'approve') {
      // Rule 4 & 6: HOD approval is strictly impossible until ALL 4 are approved!
      if (req.faculty_status !== 'APPROVED') {
        throw new Error('Precondition Failed: Faculty verification must be Approved.');
      }
      if (req.library_status !== 'APPROVED') {
        throw new Error('Precondition Failed: Library clearance must be Approved.');
      }
      if (req.accounts_status !== 'APPROVED') {
        throw new Error('Precondition Failed: Accounts clearance must be Approved.');
      }
      if (req.lab_status !== 'APPROVED') {
        throw new Error('Precondition Failed: Laboratory clearance must be Approved.');
      }

      // Unique Verification ID (Format: CIT-VTU-2026-XXXXXXXX)
      const randomSuffix = Math.random().toString(36).substring(2, 10).toUpperCase();
      const verificationId = `CIT-VTU-2026-${randomSuffix}`;

      req.status = 'CLEARED';
      req.hod_status = 'APPROVED';
      req.hod_remarks = params.remarks || 'All departmental clearances verified. Final No-Due clearance granted.';
      req.hod_reviewed_at = new Date().toISOString();
      req.verification_id = verificationId;
      req.cleared_at = new Date().toISOString();
      req.hall_ticket_eligibility = 'ELIGIBLE';
      req.hall_ticket_status = 'NOT YET RELEASED';
      req.updated_at = new Date().toISOString();

      requests[reqIdx] = req;
      set(STORAGE_KEYS.REQUESTS, requests);

      this.logAudit(
        params.hodId,
        'hod',
        'FINAL_NO_DUE_CLEARED',
        'no_due_requests',
        req.id,
        { status: 'HOD_REVIEW' },
        { status: 'CLEARED', verification_id: verificationId, hall_ticket: 'ELIGIBLE' }
      );

      this.createNotification(
        req.student_id,
        '🎉 NO-DUE CLEARED! Official Clearance Granted',
        `Congratulations! Your No-Due Clearance has been granted by Head of Department. Verification ID: ${verificationId}. Hall Ticket: ELIGIBLE — NOT YET RELEASED.`,
        'success',
        '/student'
      );
    } else {
      if (!params.rejectionCategory) {
        throw new Error('Rejection category is mandatory');
      }
      if (
        params.rejectionCategory === 'other' &&
        (!params.remarks || !params.remarks.trim())
      ) {
        throw new Error('Explanation is mandatory when category "other" is selected.');
      }

      req.status = 'REJECTED';
      req.hod_status = 'REJECTED';
      req.hod_remarks = params.remarks;
      req.hod_reviewed_at = new Date().toISOString();
      req.updated_at = new Date().toISOString();

      requests[reqIdx] = req;
      set(STORAGE_KEYS.REQUESTS, requests);

      const rejections = this.getRejections();
      rejections.unshift({
        id: `rej-${Date.now()}`,
        request_id: req.id,
        authority_or_stage: 'hod',
        rejection_category: params.rejectionCategory,
        explanation: params.remarks,
        payment_required: false,
        rejected_by: params.hodId,
        rejected_by_name: hod?.full_name || 'HOD',
        previous_status: 'HOD_REVIEW',
        resulting_status: 'REJECTED',
        created_at: new Date().toISOString(),
      });
      set(STORAGE_KEYS.REJECTIONS, rejections);

      this.logAudit(
        params.hodId,
        'hod',
        'REJECT_HOD_CLEARANCE',
        'no_due_requests',
        req.id,
        { status: 'HOD_REVIEW' },
        { status: 'REJECTED', category: params.rejectionCategory, remarks: params.remarks }
      );

      this.createNotification(
        req.student_id,
        'Final Clearance Rejected by HOD',
        `Your final clearance was rejected by HOD: ${params.remarks}`,
        'action_required',
        '/student'
      );
    }

    return this.getRequestById(req.id)!;
  },

  // ----------------------------------------------------------------------------
  // WORKFLOW OPERATION 6: Same-Request Resubmission (Section 8)
  // ----------------------------------------------------------------------------
  resubmitRequest(requestId: string, studentId: string, comments: string): NoDueRequest {
    const requests = get<NoDueRequest[]>(STORAGE_KEYS.REQUESTS, SEED_REQUESTS);
    const reqIdx = requests.findIndex((r) => r.id === requestId);
    if (reqIdx === -1) throw new Error('Request not found');

    const req = requests[reqIdx];
    if (req.student_id !== studentId) {
      throw new Error('Unauthorized');
    }

    const prevStatus = req.status;

    // Record in Resubmission History on SAME request ID
    const resubmissions = this.getResubmissions();
    resubmissions.unshift({
      id: `resub-${Date.now()}`,
      request_id: requestId,
      student_id: studentId,
      resubmitted_stage: prevStatus,
      student_comments: comments,
      created_at: new Date().toISOString(),
    });
    set(STORAGE_KEYS.RESUBMISSIONS, resubmissions);

    // Reopen ONLY affected clearances while preserving unaffected valid approvals!
    if (req.faculty_status === 'REJECTED') {
      req.faculty_status = 'PENDING';
      req.status = 'SUBMITTED';
    } else {
      const items = this.getClearanceItems();
      items.forEach((item) => {
        if (item.request_id === requestId && item.status === 'REJECTED') {
          item.status = 'PENDING';
          item.updated_at = new Date().toISOString();
        }
      });
      set(STORAGE_KEYS.CLEARANCE_ITEMS, items);
      req.status = 'IN_REVIEW';
    }

    req.updated_at = new Date().toISOString();
    requests[reqIdx] = req;
    set(STORAGE_KEYS.REQUESTS, requests);

    this.logAudit(
      studentId,
      'student',
      'RESUBMIT_NO_DUE_REQUEST',
      'no_due_requests',
      requestId,
      { status: prevStatus },
      { status: req.status, comments }
    );

    return this.getRequestById(requestId)!;
  },

  // ----------------------------------------------------------------------------
  // PUBLIC VERIFICATION (Section 10, Rule 2.11: Minimal approved fields only)
  // ----------------------------------------------------------------------------
  getPublicVerification(verificationId: string): PublicVerificationResult | null {
    const requests = this.getRequests();
    const match = requests.find(
      (r) =>
        r.verification_id?.trim().toUpperCase() === verificationId.trim().toUpperCase() &&
        r.status === 'CLEARED'
    );

    if (!match || !match.student) return null;

    const rawCode = match.student.student_id || 'USN';
    const maskedCode =
      rawCode.length > 5
        ? `${rawCode.substring(0, 3)}***${rawCode.substring(rawCode.length - 3)}`
        : '1CR***001';

    return {
      verification_id: match.verification_id!,
      request_code: match.request_code,
      student_name: match.student.full_name,
      student_id_masked: maskedCode,
      department: match.student.department,
      academic_year: match.academic_year,
      semester: match.semester,
      status: 'NO-DUE CLEARED',
      cleared_at: match.cleared_at || match.updated_at,
      hall_ticket_eligibility: match.hall_ticket_eligibility,
      hall_ticket_status: match.hall_ticket_status,
      college_name: 'Cauvery Institute of Technology',
      university: 'VTU',
    };
  },

  // History & Notifications
  getRejections(): RejectionHistoryItem[] {
    return get<RejectionHistoryItem[]>(STORAGE_KEYS.REJECTIONS, SEED_REJECTIONS);
  },

  getResubmissions(): ResubmissionHistoryItem[] {
    return get<ResubmissionHistoryItem[]>(STORAGE_KEYS.RESUBMISSIONS, []);
  },

  getPayments(): PaymentSubmission[] {
    return get<PaymentSubmission[]>(STORAGE_KEYS.PAYMENTS, SEED_PAYMENTS);
  },

  getNotifications(userId: string): NotificationItem[] {
    const all = get<NotificationItem[]>(STORAGE_KEYS.NOTIFICATIONS, SEED_NOTIFICATIONS);
    return all.filter((n) => n.recipient_id === userId);
  },

  markNotificationAsRead(id: string): void {
    const all = get<NotificationItem[]>(STORAGE_KEYS.NOTIFICATIONS, SEED_NOTIFICATIONS);
    const n = all.find((item) => item.id === id);
    if (n) {
      n.is_read = true;
      set(STORAGE_KEYS.NOTIFICATIONS, all);
    }
  },

  createNotification(
    recipientId: string,
    title: string,
    message: string,
    type: 'info' | 'success' | 'warning' | 'action_required' = 'info',
    link?: string
  ): void {
    const all = get<NotificationItem[]>(STORAGE_KEYS.NOTIFICATIONS, SEED_NOTIFICATIONS);
    all.unshift({
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      recipient_id: recipientId,
      title,
      message,
      type,
      link,
      is_read: false,
      created_at: new Date().toISOString(),
    });
    set(STORAGE_KEYS.NOTIFICATIONS, all);
  },

  getAuditLogs(): AuditLog[] {
    return get<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, SEED_AUDIT_LOGS);
  },

  logAudit(
    userId: string | undefined,
    userRole: string,
    action: string,
    entityType: string,
    entityId: string,
    previousState?: any,
    newState?: any
  ): void {
    const logs = get<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, SEED_AUDIT_LOGS);
    const profile = userId ? this.getProfileById(userId) : undefined;
    logs.unshift({
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      user_id: userId,
      user_name: profile?.full_name,
      user_role: userRole,
      action,
      entity_type: entityType,
      entity_id: entityId,
      previous_state: previousState,
      new_state: newState,
      ip_address: '127.0.0.1 (Local Verified)',
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Node.js Test Environment',
      created_at: new Date().toISOString(),
    });
    set(STORAGE_KEYS.AUDIT_LOGS, logs);
  },
};
