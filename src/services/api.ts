// ==============================================================================
// CAUVERY INSTITUTE OF TECHNOLOGY (Affiliated to VTU)
// COLLEGE NO-DUE CLEARANCE MANAGEMENT SYSTEM
// Unified API Client & Service Boundaries
// ==============================================================================

import { supabase, isLiveSupabaseConfigured } from '../lib/supabase';
import { Engine } from './store';
import {
  UserProfile,
  UserRole,
  NoDueRequest,
  ClearanceItem,
  StudentAcademicRecord,
  PaymentQrConfig,
  PaymentSubmission,
  AuditLog,
  NotificationItem,
  Department,
  AcademicPeriod,
  RejectionCategoryType,
  PublicVerificationResult,
  StaffRegistrationParams,
  StaffRoleRequest,
} from '../types/database';

export const api = {
  // ----------------------------------------------------------------------------
  // AUTH & IDENTITY (Section 5)
  // ----------------------------------------------------------------------------
  async loginWithStudentId(registrationNumber: string, password: string): Promise<UserProfile> {
    if (!registrationNumber || !password) {
      throw new Error('Please enter both your Registration Number and password.');
    }

    if (isLiveSupabaseConfigured) {
      const { data: mapping, error: resolveErr } = await supabase.rpc('resolve_student_identifier', {
        p_student_id: registrationNumber.trim().toUpperCase(),
      });

      if (resolveErr || !mapping) {
        throw new Error('Invalid credentials. Please verify your Registration Number and password.');
      }

      const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
        email: mapping.email,
        password,
      });

      if (authErr || !authData.user) {
        throw new Error('Invalid credentials. Please verify your Registration Number and password.');
      }

      const { data: profile, error: profErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (profErr || !profile) {
        throw new Error('User profile record could not be loaded.');
      }

      if (!profile.is_active) {
        await supabase.auth.signOut();
        throw new Error('This account has been deactivated by the administration.');
      }

      return profile as UserProfile;
    }

    return Engine.authenticateStudent(registrationNumber, password);
  },

  async registerStudent(params: {
    fullName: string;
    studentId: string;
    departmentId: string;
    academicYear?: string;
    semester?: number;
    email?: string;
    password: string;
  }): Promise<UserProfile> {
    const cleanEmail = (
      params.email?.trim() || `${params.studentId.trim().toLowerCase()}@cauvery.edu.in`
    ).toLowerCase();
    const cleanAcademicYear = params.academicYear?.trim() || '2026-2027';

    if (isLiveSupabaseConfigured) {
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: cleanEmail,
        password: params.password,
        options: {
          data: {
            full_name: params.fullName.trim(),
            student_id: params.studentId.trim().toUpperCase(),
            role: 'student',
          },
        },
      });

      if (authErr || !authData.user) {
        throw new Error(authErr?.message || 'Failed to create student account.');
      }

      const { data: profile, error: profErr } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          role: 'student',
          full_name: params.fullName.trim(),
          student_id: params.studentId.trim().toUpperCase(),
          email: cleanEmail,
          department_id: params.departmentId,
          semester: params.semester || 5,
          academic_year: cleanAcademicYear,
          is_active: true,
        })
        .select()
        .single();

      if (profErr || !profile) {
        throw new Error('Could not persist student profile: ' + (profErr?.message || ''));
      }

      return profile as UserProfile;
    }

    return Engine.registerStudent({
      ...params,
      email: cleanEmail,
      academicYear: cleanAcademicYear,
    });
  },

  async loginWithStaffEmail(email: string, password: string): Promise<UserProfile> {
    if (!email || !password) {
      throw new Error('Please enter both Staff Email and Password.');
    }

    if (isLiveSupabaseConfigured) {
      const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authErr || !authData.user) {
        throw new Error('Invalid institutional email or password.');
      }

      const { data: profile, error: profErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (profErr || !profile) {
        throw new Error('Staff profile could not be loaded.');
      }

      if (!profile.is_active) {
        await supabase.auth.signOut();
        throw new Error('This staff account is deactivated.');
      }

      return profile as UserProfile;
    }

    return Engine.authenticateStaff(email, password);
  },

  // Section 30: Temporary Password Change and Initial Admin Bootstrap
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<UserProfile> {
    if (isLiveSupabaseConfigured) {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      const { data: updated, error: profErr } = await supabase
        .from('profiles')
        .update({ must_change_password: false, is_temporary_password: false })
        .eq('id', userId)
        .select('*')
        .single();
      if (profErr) throw profErr;
      return updated as UserProfile;
    }
    return Engine.changePassword(userId, currentPassword, newPassword);
  },

  async bootstrapInitialAdmin(): Promise<UserProfile | null> {
    if (isLiveSupabaseConfigured) {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', 'admin@gmail.com')
        .maybeSingle();
      if (data) return data as UserProfile;
    }
    return Engine.bootstrapInitialAdmin();
  },

  async registerStaff(params: StaffRegistrationParams): Promise<UserProfile> {
    if (isLiveSupabaseConfigured) {
      if ((params.requestedRole as string) === 'admin' || (params as any).role === 'admin') {
        throw new Error('Public registration for the Administrator role is strictly prohibited.');
      }
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: params.email.trim().toLowerCase(),
        password: params.password,
        options: {
          data: {
            full_name: params.fullName.trim(),
            staff_id: params.staffId.trim().toUpperCase(),
            role: params.requestedRole,
          },
        },
      });
      if (authErr || !authData.user) {
        throw new Error(authErr?.message || 'Staff registration failed in authentication service.');
      }
      const depts = await this.getDepartments();
      const dept = depts.find((d) => d.id === params.departmentId || d.code === params.departmentId);
      const { data: profile, error: profErr } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          role: params.requestedRole,
          requested_role: params.requestedRole,
          full_name: params.fullName.trim(),
          email: params.email.trim().toLowerCase(),
          staff_id: params.staffId.trim().toUpperCase(),
          department: dept?.name || 'Central Institutional Administration',
          department_id: dept?.id,
          designation: params.designation.trim(),
          academic_year: params.academicYear || '2026-2027',
          subjects: params.subjects || [],
          semester: params.semester,
          responsibilities: params.responsibilities || [],
          is_active: true,
          is_verified: false,
          verification_status: 'PENDING',
        })
        .select()
        .single();
      if (profErr || !profile) {
        throw new Error(profErr?.message || 'Failed to create staff profile record.');
      }
      return profile as UserProfile;
    }
    return Engine.registerStaff(params);
  },

  async provisionStaff(
    params: {
      fullName: string;
      email: string;
      role: UserRole;
      departmentId?: string;
      designation?: string;
      password?: string;
    },
    adminId: string
  ): Promise<UserProfile> {
    return Engine.provisionStaff(params, adminId);
  },

  async getStaffRoleRequests(): Promise<StaffRoleRequest[]> {
    return Engine.getStaffRoleRequests();
  },

  async getPendingStaffVerifications(): Promise<UserProfile[]> {
    return Engine.getPendingStaffVerifications();
  },

  async verifyStaffRole(params: {
    staffId: string;
    role?: UserRole;
    designation?: string;
    responsibilities?: string[];
    adminId: string;
  }): Promise<UserProfile> {
    if (isLiveSupabaseConfigured) {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          is_verified: true,
          verification_status: 'VERIFIED',
          verified_at: new Date().toISOString(),
          verified_by: params.adminId,
          ...(params.role ? { role: params.role } : {}),
          ...(params.designation ? { designation: params.designation } : {}),
          ...(params.responsibilities ? { responsibilities: params.responsibilities } : {}),
        })
        .eq('id', params.staffId)
        .select()
        .single();
      if (error) throw error;
      return data as UserProfile;
    }
    return Engine.verifyStaffRole(params);
  },

  async rejectStaffVerification(params: {
    staffId: string;
    reason: string;
    adminId: string;
  }): Promise<UserProfile> {
    if (isLiveSupabaseConfigured) {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          is_verified: false,
          verification_status: 'REJECTED',
          rejection_reason: params.reason,
        })
        .eq('id', params.staffId)
        .select()
        .single();
      if (error) throw error;
      return data as UserProfile;
    }
    return Engine.rejectStaffVerification(params);
  },

  async updateStaffResponsibilities(params: {
    staffId: string;
    departmentId?: string;
    designation?: string;
    responsibilities?: string[];
    subjects?: string[];
    semester?: number;
    adminId: string;
  }): Promise<UserProfile> {
    return Engine.updateStaffResponsibilities(params);
  },

  async cleanupDatabaseDemoData(adminId: string): Promise<{
    purgedAccounts: number;
    genuineProfilesCount: number;
    genuineFacultyCount: number;
  }> {
    return Engine.cleanupDatabaseDemoData(adminId);
  },

  // ----------------------------------------------------------------------------
  // MANAGED DEPARTMENTS & ACADEMIC PERIODS (Section 2, 4 & 11)
  // ----------------------------------------------------------------------------
  async getDepartments(): Promise<Department[]> {
    if (isLiveSupabaseConfigured) {
      const { data } = await supabase.from('departments').select('*').order('code');
      return (data || []) as Department[];
    }
    return Engine.getDepartments();
  },

  async addDepartment(code: string, name: string, adminId: string): Promise<Department> {
    if (isLiveSupabaseConfigured) {
      const { data, error } = await supabase
        .from('departments')
        .insert({ code, name, is_active: true })
        .select()
        .single();
      if (error) throw error;
      return data as Department;
    }
    return Engine.addDepartment(code, name, adminId);
  },

  async toggleDepartment(id: string, adminId: string): Promise<Department> {
    if (isLiveSupabaseConfigured) {
      const { data: current } = await supabase.from('departments').select('is_active').eq('id', id).single();
      const { data, error } = await supabase
        .from('departments')
        .update({ is_active: !current?.is_active })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Department;
    }
    return Engine.toggleDepartment(id, adminId);
  },

  async getAcademicPeriods(): Promise<AcademicPeriod[]> {
    if (isLiveSupabaseConfigured) {
      const { data } = await supabase.from('academic_periods').select('*').order('semester');
      return (data || []) as AcademicPeriod[];
    }
    return Engine.getAcademicPeriods();
  },

  // ----------------------------------------------------------------------------
  // STUDENT PROVISIONING (Section 4 & 5)
  // ----------------------------------------------------------------------------
  async provisionStudent(
    studentData: {
      fullName: string;
      studentId: string;
      departmentId: string;
      semester: number;
      initialAttendance: number;
      facultyId: string;
    },
    adminId: string
  ): Promise<UserProfile> {
    return Engine.provisionStudent(studentData, adminId);
  },

  // ----------------------------------------------------------------------------
  // SYSTEM SETTINGS & ATTENDANCE THRESHOLD (Section 7)
  // ----------------------------------------------------------------------------
  async getAttendanceThreshold(): Promise<number> {
    if (isLiveSupabaseConfigured) {
      const { data } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'minimum_attendance_percentage')
        .single();
      return data ? Number(data.value) : 85;
    }
    return Engine.getAttendanceThreshold();
  },

  async updateAttendanceThreshold(threshold: number, adminId: string): Promise<void> {
    if (isLiveSupabaseConfigured) {
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          key: 'minimum_attendance_percentage',
          value: threshold,
          updated_by: adminId,
          updated_at: new Date().toISOString(),
        });
      if (error) throw error;
      return;
    }
    Engine.updateAttendanceThreshold(threshold, adminId);
  },

  // ----------------------------------------------------------------------------
  // STUDENT MODULE (Section 6)
  // ----------------------------------------------------------------------------
  async getRequestsForStudent(studentId: string): Promise<NoDueRequest[]> {
    if (isLiveSupabaseConfigured) {
      const { data, error } = await supabase
        .from('no_due_requests')
        .select('*, clearance_items(*), rejections:rejection_history(*), resubmissions:resubmission_history(*)')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as NoDueRequest[];
    }
    return Engine.getRequests().filter((r) => r.student_id === studentId);
  },

  async getAcademicRecordForStudent(studentId: string, year: string, semester: number): Promise<StudentAcademicRecord | null> {
    if (isLiveSupabaseConfigured) {
      const { data } = await supabase
        .from('student_academic_records')
        .select('*')
        .eq('student_id', studentId)
        .eq('academic_year', year)
        .eq('semester', semester)
        .maybeSingle();
      return data as StudentAcademicRecord | null;
    }
    return Engine.getAcademicRecordForStudent(studentId, year, semester) || null;
  },

  async getFacultyForDepartment(deptIdOrName?: string): Promise<UserProfile[]> {
    if (isLiveSupabaseConfigured) {
      let query = supabase
        .from('profiles')
        .select('*')
        .eq('role', 'faculty')
        .eq('is_active', true)
        .eq('is_verified', true);
      if (deptIdOrName) {
        query = query.or(`department_id.eq.${deptIdOrName},department.ilike.%${deptIdOrName}%`);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as UserProfile[];
    }
    return Engine.getFacultyForDepartment(deptIdOrName);
  },

  async createNoDueRequest(
    studentId: string,
    deptOrYear: string,
    yearOrSem: string | number,
    semOrNotes?: number | string,
    notes?: string,
    selectedFacultyId?: string
  ): Promise<NoDueRequest> {
    if (isLiveSupabaseConfigured) {
      let dept = deptOrYear;
      let yr = '2026-2027';
      let sem = 5;
      let note = notes;
      if (typeof yearOrSem === 'number') {
        yr = deptOrYear;
        sem = yearOrSem;
        note = typeof semOrNotes === 'string' ? semOrNotes : undefined;
      } else {
        dept = deptOrYear;
        yr = String(yearOrSem);
        sem = typeof semOrNotes === 'number' ? semOrNotes : 5;
        note = notes;
      }
      const payload: any = {
        student_id: studentId,
        department: dept,
        academic_year: yr,
        semester: sem,
        student_notes: note,
        status: 'PENDING_FACULTY_REVIEW',
      };
      if (selectedFacultyId) {
        payload.assigned_faculty_id = selectedFacultyId;
      }
      const { data, error } = await supabase
        .from('no_due_requests')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data as NoDueRequest;
    }
    return Engine.createRequest(studentId, deptOrYear, yearOrSem, semOrNotes, notes, selectedFacultyId);
  },

  async uploadPaymentScreenshot(params: {
    clearanceItemId: string;
    studentId: string;
    amount: number;
    screenshotUrl: string;
    transactionReference?: string;
    notes?: string;
  }): Promise<PaymentSubmission> {
    if (isLiveSupabaseConfigured) {
      const { data, error } = await supabase.rpc('submit_payment_evidence', {
        p_clearance_item_id: params.clearanceItemId,
        p_student_id: params.studentId,
        p_amount: params.amount,
        p_screenshot_url: params.screenshotUrl,
        p_transaction_ref: params.transactionReference,
        p_notes: params.notes,
      });
      if (error) throw error;
      return data as PaymentSubmission;
    }
    return Engine.submitPaymentEvidence(params);
  },

  async resubmitRequest(requestId: string, studentId: string, comments: string): Promise<NoDueRequest> {
    if (isLiveSupabaseConfigured) {
      const { data, error } = await supabase.rpc('resubmit_clearance_request', {
        p_request_id: requestId,
        p_student_id: studentId,
        p_comments: comments,
      });
      if (error) throw error;
      return data as NoDueRequest;
    }
    return Engine.resubmitRequest(requestId, studentId, comments);
  },

  // ----------------------------------------------------------------------------
  // FACULTY MODULE (Section 6 & 7)
  // ----------------------------------------------------------------------------
  async getFacultyDashboardData(facultyId: string) {
    const facultyRequests = Engine.getRequestsForFaculty(facultyId);
    const assignedStudentIds = new Set(facultyRequests.map((r) => r.student_id));
    const allProfiles = Engine.getProfiles();
    const students = allProfiles.filter(
      (p) => p.role === 'student' && (p.assigned_faculty_id === facultyId || assignedStudentIds.has(p.id))
    );
    const studentIds = new Set(students.map((s) => s.id));

    const academicRecords = Engine.getAcademicRecords().filter(
      (r) => r.faculty_id === facultyId || studentIds.has(r.student_id)
    );
    const allPayments = Engine.getPayments();
    const pendingPayments = allPayments.filter(
      (p) => p.verification_status === 'PENDING_REVIEW' && studentIds.has(p.student_id)
    );

    return {
      requests: facultyRequests,
      academicRecords,
      pendingPayments,
      students,
    };
  },

  async assignFacultyToRequest(requestId: string, facultyId: string, adminId: string, reason?: string): Promise<NoDueRequest> {
    return Engine.assignFacultyToRequest(requestId, facultyId, adminId, reason);
  },

  async startFacultyReview(requestId: string, facultyId: string): Promise<NoDueRequest> {
    return Engine.startFacultyReview(requestId, facultyId);
  },

  async reassignTeacher(params: {
    requestId: string;
    newFacultyId: string;
    userId: string;
    role: 'student' | 'admin';
    reason?: string;
  }): Promise<{ request: NoDueRequest; record: any }> {
    return Engine.reassignTeacher(params);
  },

  async updateStudentAttendance(recordId: string, attendance: number, remarks: string, facultyId: string): Promise<StudentAcademicRecord> {
    return Engine.updateAcademicRecord(recordId, attendance, remarks, facultyId);
  },

  async approveFacultyAcademic(requestId: string, facultyId: string, remarks: string): Promise<NoDueRequest> {
    return Engine.verifyFacultyApproval(requestId, facultyId, remarks);
  },

  async rejectFacultyAcademic(requestId: string, facultyId: string, category: RejectionCategoryType, explanation: string): Promise<NoDueRequest> {
    return Engine.rejectFacultyVerification(requestId, facultyId, category, explanation);
  },

  async reviewPaymentEvidence(params: {
    submissionId: string;
    reviewerId: string;
    confirm: boolean;
    remarks?: string;
  }): Promise<PaymentSubmission> {
    return Engine.reviewPaymentEvidence(params);
  },

  async verifyPaymentEvidence(params: {
    submissionId: string;
    facultyId: string;
    confirm: boolean;
    remarks?: string;
  }): Promise<PaymentSubmission> {
    return Engine.reviewPaymentEvidence({
      submissionId: params.submissionId,
      reviewerId: params.facultyId,
      confirm: params.confirm,
      remarks: params.remarks,
    });
  },

  // ----------------------------------------------------------------------------
  // CLEARANCE AUTHORITIES (Library, Accounts, Laboratory) (Section 8 & 9)
  // ----------------------------------------------------------------------------
  async getAuthorityClearanceData(authority: 'library' | 'accounts' | 'lab') {
    const items = Engine.getClearanceItems().filter((ci) => ci.authority === authority);
    const requests = Engine.getRequests();
    const payments = Engine.getPayments();

    const itemsWithDetails = items.map((item) => {
      const req = requests.find((r) => r.id === item.request_id);
      const sub = payments.find((p) => p.clearance_item_id === item.id);
      return {
        ...item,
        request: req,
        latest_submission: sub,
      };
    });

    const activeQr = Engine.getActiveQrForAuthority(authority) || null;

    return {
      items: itemsWithDetails,
      activeQr,
    };
  },

  async processClearanceDecision(params: {
    itemId: string;
    reviewerId: string;
    decision: 'approve' | 'reject';
    remarks: string;
    rejectionCategory?: RejectionCategoryType;
    paymentRequired?: boolean;
    paymentAmount?: number;
    paymentQrId?: string;
    paymentInstructions?: string;
  }): Promise<NoDueRequest> {
    return Engine.processClearanceDecision(params);
  },

  // ----------------------------------------------------------------------------
  // HOD MODULE (Section 6 & 14)
  // ----------------------------------------------------------------------------
  async getHodDashboardData(): Promise<NoDueRequest[]> {
    return Engine.getRequests();
  },

  async processHodFinalClearance(params: {
    requestId: string;
    hodId: string;
    decision: 'approve' | 'reject';
    remarks: string;
    rejectionCategory?: RejectionCategoryType;
  }): Promise<NoDueRequest> {
    return Engine.processHodFinalClearance(params);
  },

  // ----------------------------------------------------------------------------
  // ADMIN MODULE (Section 4, 11, 13)
  // ----------------------------------------------------------------------------
  async getAdminDashboardData() {
    return {
      profiles: Engine.getProfiles(),
      departments: Engine.getDepartments(),
      academicPeriods: Engine.getAcademicPeriods(),
      paymentQrs: Engine.getPaymentQrs(),
      auditLogs: Engine.getAuditLogs(),
      settings: Engine.getSettings(),
      requests: Engine.getRequests(),
    };
  },

  async toggleUserActive(userId: string, is_active: boolean, adminId: string): Promise<UserProfile> {
    return Engine.updateProfileStatus(userId, is_active, adminId);
  },

  async savePaymentQr(qr: Partial<PaymentQrConfig> & { authority: 'library' | 'accounts' | 'lab'; title: string; upi_id: string; instructions: string }, adminId: string): Promise<PaymentQrConfig> {
    return Engine.savePaymentQr(qr, adminId);
  },

  // ----------------------------------------------------------------------------
  // PUBLIC VERIFICATION (Section 10)
  // ----------------------------------------------------------------------------
  async getPublicVerificationRecord(verificationId: string): Promise<PublicVerificationResult | null> {
    return Engine.getPublicVerification(verificationId);
  },

  // ----------------------------------------------------------------------------
  // NOTIFICATIONS (Section 14)
  // ----------------------------------------------------------------------------
  async getNotifications(userId: string): Promise<NotificationItem[]> {
    return Engine.getNotifications(userId);
  },

  async markNotificationAsRead(id: string): Promise<void> {
    Engine.markNotificationAsRead(id);
  },
};
