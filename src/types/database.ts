// ==============================================================================
// CAUVERY INSTITUTE OF TECHNOLOGY (Affiliated to VTU)
// COLLEGE NO-DUE CLEARANCE MANAGEMENT SYSTEM
// Data Models, Canonical Types & Institutional Interfaces
// ==============================================================================

export type UserRole =
  | 'student'
  | 'faculty'
  | 'library_staff'
  | 'accounts_staff'
  | 'lab_staff'
  | 'hod'
  | 'admin';

export type RequestStatus =
  | 'SUBMITTED'
  | 'PENDING_FACULTY_REVIEW'
  | 'IN_REVIEW'
  | 'ACTION_REQUIRED'
  | 'PAYMENT_VERIFICATION_PENDING'
  | 'RESUBMISSION_REQUIRED'
  | 'HOD_REVIEW'
  | 'REJECTED'
  | 'CLEARED'
  | 'submitted'
  | 'pending_faculty_review'
  | 'in_review'
  | 'action_required'
  | 'payment_verification_pending'
  | 'resubmission_required'
  | 'hod_review'
  | 'rejected'
  | 'cleared';

export type StageStatus =
  | 'PENDING'
  | 'IN_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'RESUBMISSION_REQUIRED'
  | 'pending'
  | 'in_review'
  | 'approved'
  | 'rejected'
  | 'resubmission_required';

export type AuthorityType = 'library' | 'accounts' | 'lab';

export type PaymentStatus =
  | 'NOT_REQUIRED'
  | 'PENDING_PAYMENT'
  | 'PENDING_REVIEW'
  | 'CONFIRMED'
  | 'REJECTED'
  | 'not_required'
  | 'required'
  | 'pending_payment'
  | 'pending_review'
  | 'confirmed'
  | 'rejected'
  | 'screenshot_uploaded'
  | 'verified_by_faculty';

export type RejectionCategoryType =
  | 'attendance_shortage'
  | 'assignment_pending'
  | 'other';

export type HallTicketEligibility = 'NOT_ELIGIBLE' | 'ELIGIBLE';

export interface Department {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface AcademicPeriod {
  id: string;
  academic_year: string;
  semester: number;
  is_active: boolean;
  created_at: string;
}

export type VerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';

export interface StaffRegistrationParams {
  fullName: string;
  staffId: string;
  email: string;
  password: string;
  confirmPassword?: string;
  requestedRole: 'faculty' | 'library_staff' | 'accounts_staff' | 'lab_staff' | 'hod';
  departmentId: string;
  designation: string;
  academicYear?: string;
  subjects?: string[];
  semester?: number;
  responsibilities?: string[];
}

export interface StaffRoleRequest {
  id: string;
  staff_id: string;
  staff_name: string;
  staff_email: string;
  requested_role: UserRole;
  department_id: string;
  department_name: string;
  designation: string;
  subjects?: string[];
  semester?: number;
  requested_responsibilities: string[];
  status: VerificationStatus;
  reviewed_by?: string;
  reviewed_by_name?: string;
  reviewed_at?: string;
  rejection_reason?: string;
  created_at: string;
}

export interface UserProfile {
  id: string;
  role: UserRole;
  requested_role?: UserRole;
  full_name: string;
  email: string;
  staff_id?: string;
  student_id?: string;
  department_id?: string;
  department: string;
  batch?: string;
  academic_year?: string;
  semester?: number;
  designation?: string;
  subjects?: string[];
  responsibilities?: string[];
  is_verified?: boolean;
  verification_status?: VerificationStatus;
  verified_at?: string;
  verified_by?: string;
  rejection_reason?: string;
  assigned_faculty_id?: string;
  assigned_faculty_name?: string;
  must_change_password?: boolean;
  is_temporary_password?: boolean;
  is_active: boolean;
  created_at: string;
}

export interface SystemSetting {
  key: string;
  value: any;
  description?: string;
  updated_at: string;
}

export interface Subject {
  id: string;
  code: string;
  name: string;
  department_id: string;
  department_name: string;
  semester: number;
  academic_year: string;
  credits?: number;
  created_at: string;
}

export interface StaffSubjectAssignment {
  id: string;
  faculty_id: string;
  faculty_name: string;
  subject_id: string;
  subject_code: string;
  subject_name: string;
  department_id: string;
  semester: number;
  academic_year: string;
  created_at: string;
}

export interface StudentSubjectEnrollment {
  id: string;
  student_id: string;
  subject_id: string;
  semester: number;
  academic_year: string;
  enrolled_at: string;
}

export interface RequestFacultyAssignment {
  id: string;
  request_id: string;
  faculty_id: string;
  faculty_name: string;
  role: 'academic_verification' | 'subject_attendance';
  subject_id?: string;
  subject_name?: string;
  status: 'ASSIGNED' | 'REVIEWING' | 'APPROVED' | 'REJECTED';
  assigned_at: string;
  updated_at: string;
}

export interface FacultyReviewTask {
  id: string;
  request_id: string;
  faculty_id: string;
  task_type: 'academic_verification' | 'subject_attendance';
  subject_id?: string;
  subject_name?: string;
  status: 'PENDING' | 'COMPLETED';
  created_at: string;
  completed_at?: string;
}

export type SubjectApprovalStatus =
  | 'WAITING_FOR_ATTENDANCE'
  | 'AWAITING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'CORRECTION_REQUIRED';

export interface TeacherApprovalDecision {
  id: string;
  request_id: string;
  subject_record_id: string;
  subject_id?: string;
  subject_name: string;
  faculty_id: string;
  faculty_name?: string;
  decision: 'APPROVE' | 'REJECT' | 'CORRECTION_REQUIRED';
  attendance_percentage?: number | null;
  classes_held?: number;
  classes_conducted?: number;
  classes_attended?: number;
  remarks?: string;
  decided_at: string;
  created_at: string;
}

export interface SubjectAttendanceRecord {
  id: string;
  request_id: string;
  student_id: string;
  subject_id?: string;
  subject_code?: string;
  subject_name: string;
  faculty_id: string;
  faculty_name: string;
  academic_year: string;
  semester: number;
  classes_held?: number; // Total Classes Conducted
  classes_conducted?: number; // alias
  classes_attended?: number; // Classes Attended by Student
  attendance_percentage: number | null;
  status: 'AWAITING_ENTRY' | 'ENTERED';
  approval_status?: SubjectApprovalStatus;
  approved_by?: string;
  approved_by_name?: string;
  approved_at?: string;
  approval_remarks?: string;
  rejection_remarks?: string;
  is_locked?: boolean;
  remarks?: string;
  entered_at?: string;
  entered_by?: string;
  updated_at: string;
}

export type AttendanceStatusType = 'AWAITING_FACULTY_ENTRY' | 'ATTENDANCE_INCOMPLETE' | 'ENTERED';

export interface StudentAcademicRecord {
  id: string;
  student_id: string;
  student_name?: string;
  student_code?: string;
  department: string;
  faculty_id: string;
  academic_year: string;
  semester: number;
  attendance_percentage: number | null;
  is_eligible: boolean | null;
  attendance_status?: AttendanceStatusType;
  calculation_method?: 'WEIGHTED_CLASS_COUNT' | 'AVERAGE_PERCENTAGE';
  calculation_details?: string;
  total_classes_held?: number;
  total_classes_attended?: number;
  subject_approvals_total?: number;
  subject_approvals_count?: number;
  all_subject_approvals_completed?: boolean;
  pending_approval_subjects?: string[];
  academic_remarks?: string;
  verified_at?: string;
  updated_at: string;
  subject_entries?: SubjectAttendanceRecord[];
}

export interface PaymentQrConfig {
  id: string;
  authority: AuthorityType;
  title: string;
  upi_id: string;
  account_details: string;
  qr_image_url: string;
  instructions: string;
  is_active: boolean;
  updated_at: string;
}

export interface ClearanceItem {
  id: string;
  request_id: string;
  authority: AuthorityType;
  status: StageStatus;
  remarks?: string;
  reviewed_by?: string;
  reviewed_by_name?: string;
  reviewed_at?: string;
  payment_required: boolean;
  payment_amount?: number;
  payment_qr_id?: string;
  payment_qr?: PaymentQrConfig;
  payment_instructions?: string;
  payment_status: PaymentStatus;
  responsible_payment_authority: 'faculty' | 'authority';
  latest_submission?: PaymentSubmission;
  updated_at: string;
}

export interface PaymentSubmission {
  id: string;
  clearance_item_id: string;
  request_id: string;
  student_id: string;
  student_name?: string;
  authority: AuthorityType;
  amount: number;
  screenshot_url: string;
  transaction_reference?: string;
  student_notes?: string;
  verification_status: 'PENDING_REVIEW' | 'CONFIRMED' | 'REJECTED';
  reviewer_remarks?: string;
  verified_by?: string;
  verified_by_name?: string;
  verified_at?: string;
  created_at: string;
}

export interface RejectionHistoryItem {
  id: string;
  request_id: string;
  clearance_item_id?: string;
  authority_or_stage: 'faculty' | 'library' | 'accounts' | 'lab' | 'hod';
  rejection_category: RejectionCategoryType;
  explanation: string;
  payment_required: boolean;
  payment_amount?: number;
  rejected_by: string;
  rejected_by_name?: string;
  previous_status: string;
  resulting_status: string;
  created_at: string;
}

export interface ResubmissionHistoryItem {
  id: string;
  request_id: string;
  student_id: string;
  resubmitted_stage: string;
  student_comments: string;
  created_at: string;
}

export type FacultyAssignmentStatus = 'UNASSIGNED' | 'ASSIGNED' | 'REASSIGNMENT_REQUIRED';

export interface TeacherReassignmentRecord {
  id: string;
  request_id: string;
  previous_faculty_id: string;
  previous_faculty_name: string;
  previous_faculty_ids?: string[];
  previous_faculty_names?: string[];
  new_faculty_id: string;
  new_faculty_name: string;
  new_faculty_ids?: string[];
  new_faculty_names?: string[];
  initiated_by_user_id: string;
  initiated_by_role: 'student' | 'admin';
  reason?: string;
  result: 'SUCCESS' | 'FAILED';
  created_at: string;
}

export interface NoDueRequest {
  id: string;
  request_code: string; // e.g. ND-2026-000125
  student_id: string;
  student?: UserProfile;
  department: string;
  academic_year: string;
  semester: number;
  status: RequestStatus;

  // Faculty Assignment Tracking (Section 26 & Section 34 Multi-Faculty)
  assigned_faculty_id?: string;
  assigned_faculty_name?: string;
  assigned_faculty_ids?: string[];
  assigned_faculty_names?: string[];
  faculty_assignments?: RequestFacultyAssignment[];
  faculty_review_tasks?: FacultyReviewTask[];
  faculty_assignment_status?: FacultyAssignmentStatus;
  faculty_review_started_at?: string;
  faculty_review_started_by?: string;
  reassignment_history?: TeacherReassignmentRecord[];

  // Discrete Stage Statuses
  faculty_status: StageStatus;
  faculty_remarks?: string;
  faculty_reviewed_at?: string;
  attendance_percentage?: number | null;
  attendance_status?: AttendanceStatusType;
  attendance_calculation_method?: 'WEIGHTED_CLASS_COUNT' | 'AVERAGE_PERCENTAGE';

  library_status: StageStatus;
  accounts_status: StageStatus;
  lab_status: StageStatus;

  hod_status: StageStatus;
  hod_remarks?: string;
  hod_reviewed_at?: string;

  // Final Clearance & Hall Ticket
  verification_id?: string;
  cleared_at?: string;
  hall_ticket_eligibility: HallTicketEligibility;
  hall_ticket_status: string; // e.g. "NOT YET RELEASED"

  student_notes?: string;
  created_at: string;
  updated_at: string;

  // Relations
  clearance_items?: ClearanceItem[];
  rejections?: RejectionHistoryItem[];
  resubmissions?: ResubmissionHistoryItem[];
}

export interface AuditLog {
  id: string;
  user_id?: string;
  user_name?: string;
  user_role: string;
  action: string;
  entity_type: string;
  entity_id: string;
  previous_state?: any;
  new_state?: any;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface NotificationItem {
  id: string;
  recipient_id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'action_required';
  link?: string;
  is_read: boolean;
  created_at: string;
}

export interface PublicVerificationResult {
  verification_id: string;
  request_code: string;
  student_name: string;
  student_id_masked: string;
  department: string;
  academic_year: string;
  semester: number;
  status: string;
  cleared_at: string;
  hall_ticket_eligibility: string;
  hall_ticket_status: string;
  college_name: string;
  university: string;
}
