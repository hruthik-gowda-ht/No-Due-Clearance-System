// ==============================================================================
// COLLEGE NO-DUE CLEARANCE MANAGEMENT SYSTEM
// Admin Dashboard (Sections 5.4, 7.2, 12 & 16)
// Account provisioning, attendance threshold, payment QRs & system audit logs
// ==============================================================================

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import {
  UserProfile,
  PaymentQrConfig,
  AuditLog,
  SystemSetting,
  Department,
  UserRole,
  NoDueRequest,
} from '../types/database';
import {
  ShieldAlert,
  Users,
  Settings,
  QrCode,
  FileSpreadsheet,
  Search,
  CheckCircle2,
  XCircle,
  Save,
  Plus,
  Edit2,
  Sliders,
  Percent,
  Activity,
  UserX,
  UserCheck,
  Building,
  UserPlus,
  ShieldCheck,
  GraduationCap,
  Clock,
  AlertTriangle,
  Database,
  Trash2,
  RefreshCw,
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();

  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [paymentQrs, setPaymentQrs] = useState<PaymentQrConfig[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [requests, setRequests] = useState<NoDueRequest[]>([]);
  const [threshold, setThreshold] = useState<number>(85);
  const [isLoading, setIsLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);

  // Active Tab: users, verifications, requests, departments, provisioning, settings, qrs, audits
  const [activeTab, setActiveTab] = useState<'users' | 'verifications' | 'requests' | 'departments' | 'provisioning' | 'settings' | 'qrs' | 'audits'>('users');
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | UserRole>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [assigningFacultyMap, setAssigningFacultyMap] = useState<Record<string, string>>({});

  // Staff Verification and Responsibility Management state (Section 28.E)
  const [verifyingStaff, setVerifyingStaff] = useState<UserProfile | null>(null);
  const [rejectingStaff, setRejectingStaff] = useState<UserProfile | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [editingStaffResp, setEditingStaffResp] = useState<UserProfile | null>(null);
  const [editDeptId, setEditDeptId] = useState('');
  const [editDesignation, setEditDesignation] = useState('');
  const [editResponsibilities, setEditResponsibilities] = useState<string[]>([]);
  const [editSubjects, setEditSubjects] = useState('');
  const [editSemester, setEditSemester] = useState<number>(5);

  // Department state
  const [newDeptCode, setNewDeptCode] = useState('');
  const [newDeptName, setNewDeptName] = useState('');
  const [isAddingDept, setIsAddingDept] = useState(false);

  // Provisioning state
  const [provName, setProvName] = useState('');
  const [provUsn, setProvUsn] = useState('');
  const [provDeptId, setProvDeptId] = useState('');
  const [provSem, setProvSem] = useState<number>(5);
  const [provAttendance, setProvAttendance] = useState<number>(88.0);
  const [provFacultyId, setProvFacultyId] = useState('');
  const [isProvisioning, setIsProvisioning] = useState(false);

  // Staff Provisioning state
  const [staffName, setStaffName] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffRole, setStaffRole] = useState<UserRole>('faculty');
  const [staffDesignation, setStaffDesignation] = useState('');
  const [staffDeptId, setStaffDeptId] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [isProvisioningStaff, setIsProvisioningStaff] = useState(false);

  // Editing QR state
  const [editingQr, setEditingQr] = useState<Partial<PaymentQrConfig> | null>(null);

  // Notification
  const [notificationMsg, setNotificationMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setDbError(null);
      const data = await api.getAdminDashboardData();
      setProfiles(data.profiles || []);
      setDepartments(data.departments || []);
      setPaymentQrs(data.paymentQrs || []);
      setAuditLogs(data.auditLogs || []);
      setRequests((data as any).requests || []);

      if (data.departments && data.departments.length > 0 && !provDeptId) {
        setProvDeptId(data.departments[0].id);
      }
      const facs = (data.profiles || []).filter((p) => p.role === 'faculty' && p.is_active);
      if (facs.length > 0 && !provFacultyId) {
        setProvFacultyId(facs[0].id);
      }

      const thresh = await api.getAttendanceThreshold();
      setThreshold(thresh);
    } catch (err: any) {
      console.error('Failed to load admin data:', err);
      setDbError(err.message || 'Database unavailable. Failed to fetch institutional records.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssignFaculty = async (requestId: string, facultyId: string) => {
    if (!user || !facultyId) return;
    try {
      await api.assignFacultyToRequest(requestId, facultyId, user.id);
      setNotificationMsg({
        type: 'success',
        text: 'Faculty advisor assigned to clearance request successfully.',
      });
      await loadData();
    } catch (err: any) {
      setNotificationMsg({ type: 'error', text: err.message || 'Failed to assign faculty member.' });
    }
  };

  const handleToggleUserActive = async (targetUser: UserProfile) => {
    if (!user) return;
    try {
      const updatedStatus = !targetUser.is_active;
      await api.toggleUserActive(targetUser.id, updatedStatus, user.id);
      setNotificationMsg({
        type: 'success',
        text: `Account for ${targetUser.full_name} has been ${updatedStatus ? 'activated' : 'deactivated'}.`,
      });
      await loadData();
    } catch (err: any) {
      setNotificationMsg({ type: 'error', text: err.message || 'Action failed.' });
    }
  };

  const handleAddDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newDeptCode.trim() || !newDeptName.trim()) {
      setNotificationMsg({ type: 'error', text: 'Department code and name are required.' });
      return;
    }
    try {
      setIsAddingDept(true);
      await api.addDepartment(newDeptCode.trim(), newDeptName.trim(), user.id);
      setNewDeptCode('');
      setNewDeptName('');
      setNotificationMsg({ type: 'success', text: `Department ${newDeptCode.toUpperCase()} created successfully.` });
      await loadData();
    } catch (err: any) {
      setNotificationMsg({ type: 'error', text: err.message || 'Failed to add department.' });
    } finally {
      setIsAddingDept(false);
    }
  };

  const handleToggleDepartment = async (dept: Department) => {
    if (!user) return;
    try {
      await api.toggleDepartment(dept.id, user.id);
      setNotificationMsg({
        type: 'success',
        text: `Department ${dept.code} is now ${!dept.is_active ? 'active' : 'inactive'}.`,
      });
      await loadData();
    } catch (err: any) {
      setNotificationMsg({ type: 'error', text: err.message || 'Failed to toggle department.' });
    }
  };

  const handleProvisionStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !provName.trim() || !provUsn.trim() || !provDeptId || !provFacultyId) {
      setNotificationMsg({ type: 'error', text: 'All student provisioning fields are required.' });
      return;
    }
    try {
      setIsProvisioning(true);
      await api.provisionStudent(
        {
          fullName: provName.trim(),
          studentId: provUsn.trim().toUpperCase(),
          departmentId: provDeptId,
          semester: provSem,
          initialAttendance: provAttendance,
          facultyId: provFacultyId,
        },
        user.id
      );
      setProvName('');
      setProvUsn('');
      setNotificationMsg({
        type: 'success',
        text: `Student ${provUsn.toUpperCase()} provisioned into registry successfully.`,
      });
      await loadData();
    } catch (err: any) {
      setNotificationMsg({ type: 'error', text: err.message || 'Failed to provision student.' });
    } finally {
      setIsProvisioning(false);
    }
  };

  const handleProvisionStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!staffName.trim() || !staffEmail.trim()) {
      setNotificationMsg({ type: 'error', text: 'Staff name and email are required.' });
      return;
    }
    if (!staffPassword || staffPassword.length < 6) {
      setNotificationMsg({ type: 'error', text: 'Please specify an initial temporary password (at least 6 characters) for this staff account.' });
      return;
    }
    try {
      setIsProvisioningStaff(true);
      await api.provisionStaff(
        {
          fullName: staffName.trim(),
          email: staffEmail.trim(),
          role: staffRole,
          departmentId: staffDeptId || undefined,
          designation: staffDesignation.trim() || undefined,
          password: staffPassword,
        },
        user.id
      );
      setStaffName('');
      setStaffEmail('');
      setStaffDesignation('');
      setStaffPassword('');
      setNotificationMsg({
        type: 'success',
        text: `Staff account provisioned successfully for ${staffName} with role "${staffRole}".`,
      });
      await loadData();
    } catch (err: any) {
      setNotificationMsg({ type: 'error', text: err.message || 'Failed to provision staff account.' });
    } finally {
      setIsProvisioningStaff(false);
    }
  };

  // Staff Verification Actions (Section 28.E)
  const handleVerifyStaff = async (staffId: string, role?: UserRole, designation?: string, responsibilities?: string[]) => {
    if (!user) return;
    try {
      await api.verifyStaffRole({
        staffId,
        role,
        designation,
        responsibilities,
        adminId: user.id,
      });
      setNotificationMsg({
        type: 'success',
        text: 'Staff account and role verified and authorized successfully.',
      });
      setVerifyingStaff(null);
      await loadData();
    } catch (err: any) {
      setNotificationMsg({ type: 'error', text: err.message || 'Failed to verify staff account.' });
    }
  };

  const handleRejectStaff = async (staffId: string) => {
    if (!user || !rejectionReason.trim()) {
      setNotificationMsg({ type: 'error', text: 'Please provide a clear administrative explanation for rejection.' });
      return;
    }
    try {
      await api.rejectStaffVerification({
        staffId,
        reason: rejectionReason.trim(),
        adminId: user.id,
      });
      setNotificationMsg({
        type: 'success',
        text: 'Staff verification rejected with institutional audit record created.',
      });
      setRejectingStaff(null);
      setRejectionReason('');
      await loadData();
    } catch (err: any) {
      setNotificationMsg({ type: 'error', text: err.message || 'Failed to reject staff verification.' });
    }
  };

  const openEditStaffResp = (staff: UserProfile) => {
    setEditingStaffResp(staff);
    setEditDeptId(staff.department_id || '');
    setEditDesignation(staff.designation || '');
    setEditResponsibilities(staff.responsibilities || []);
    setEditSubjects(staff.subjects ? staff.subjects.join(', ') : '');
    setEditSemester(staff.semester || 5);
  };

  const handleSaveStaffResponsibilities = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !editingStaffResp) return;
    try {
      const subjectList = editSubjects
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      await api.updateStaffResponsibilities({
        staffId: editingStaffResp.id,
        departmentId: editDeptId,
        designation: editDesignation,
        responsibilities: editResponsibilities,
        subjects: subjectList,
        semester: editingStaffResp.role === 'faculty' ? editSemester : undefined,
        adminId: user.id,
      });
      setNotificationMsg({
        type: 'success',
        text: `Institutional responsibilities updated for ${editingStaffResp.full_name}.`,
      });
      setEditingStaffResp(null);
      await loadData();
    } catch (err: any) {
      setNotificationMsg({ type: 'error', text: err.message || 'Failed to update responsibilities.' });
    }
  };

  const handleCleanupDatabase = async () => {
    if (!user) return;
    try {
      const res = await api.cleanupDatabaseDemoData(user.id);
      setNotificationMsg({
        type: 'success',
        text: `Database cleanup complete: ${res.purgedAccounts} fictional demo accounts purged. Real accounts preserved: ${res.genuineProfilesCount} total (${res.genuineFacultyCount} verified faculty).`,
      });
      await loadData();
    } catch (err: any) {
      setNotificationMsg({ type: 'error', text: err.message || 'Database cleanup failed.' });
    }
  };

  const handleSaveThreshold = async () => {
    if (!user) return;
    try {
      await api.updateAttendanceThreshold(threshold, user.id);
      setNotificationMsg({
        type: 'success',
        text: `Attendance threshold updated to ${threshold}%. All student eligibility recalculated.`,
      });
      await loadData();
    } catch (err: any) {
      setNotificationMsg({ type: 'error', text: err.message || 'Failed to update threshold.' });
    }
  };

  const handleSaveQr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !editingQr || !editingQr.authority || !editingQr.title || !editingQr.upi_id) {
      setNotificationMsg({ type: 'error', text: 'Please fill in all required QR fields.' });
      return;
    }

    try {
      await api.savePaymentQr(
        {
          id: editingQr.id,
          authority: editingQr.authority,
          title: editingQr.title,
          upi_id: editingQr.upi_id,
          account_details: editingQr.account_details || '',
          instructions: editingQr.instructions || '',
          is_active: editingQr.is_active ?? true,
        },
        user.id
      );

      setEditingQr(null);
      setNotificationMsg({ type: 'success', text: 'Payment QR configuration saved successfully.' });
      await loadData();
    } catch (err: any) {
      setNotificationMsg({ type: 'error', text: err.message || 'Failed to save QR configuration.' });
    }
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-center">
        <p className="text-slate-400">Restricted Area: System Administrator access required.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8 animate-in fade-in">
      {/* Admin Header */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-700/80 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-rose-600 to-amber-600 flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-rose-500/20 border border-rose-400/30 flex-shrink-0">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-slate-100">{user.full_name}</h1>
                <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold uppercase">
                  System Administrator
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Central Operations, User Provisioning, System Policies & Comprehensive Audit Logs
              </p>
            </div>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-2 mt-8 pt-6 border-t border-slate-800 flex-wrap">
          {/* Pending Staff Verifications Tab */}
          {(() => {
            const pendingStaffCount = profiles.filter(
              (p) => p.role !== 'student' && p.role !== 'admin' && p.verification_status === 'PENDING'
            ).length;
            return (
              <button
                type="button"
                id="tab-admin-verifications"
                onClick={() => setActiveTab('verifications')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                  activeTab === 'verifications'
                    ? 'bg-rose-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>Staff Verifications</span>
                {pendingStaffCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-[10px] animate-pulse">
                    {pendingStaffCount}
                  </span>
                )}
              </button>
            );
          })()}

          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'users'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            User Accounts ({profiles.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('requests')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'requests'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            Clearance Requests & Assignments ({requests.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('departments')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'departments'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
            }`}
          >
            <Building className="w-4 h-4" />
            Managed Departments ({departments.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('provisioning')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'provisioning'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            Account Provisioning
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'settings'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
            }`}
          >
            <Sliders className="w-4 h-4" />
            Attendance Threshold Settings
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('qrs')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'qrs'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
            }`}
          >
            <QrCode className="w-4 h-4" />
            Payment QR Configurations ({paymentQrs.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('audits')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'audits'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
            }`}
          >
            <Activity className="w-4 h-4" />
            System Audit Trail ({auditLogs.length})
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
              <ShieldAlert className="w-4 h-4 text-rose-400" />
            )}
            <span>{notificationMsg.text}</span>
          </div>
          <button onClick={() => setNotificationMsg(null)} className="text-slate-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {dbError && (
        <div className="p-4 rounded-2xl bg-rose-950/50 border border-rose-500/60 text-rose-300 text-xs flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-400" />
          <div>
            <p className="font-bold">Database Error</p>
            <p className="mt-0.5">{dbError}</p>
          </div>
        </div>
      )}

      {/* Tab: Staff Role Requests & Institutional Verification (Section 28.E) */}
      {activeTab === 'verifications' && (() => {
        const pendingStaff = profiles.filter(
          (p) => p.role !== 'student' && p.role !== 'admin' && p.verification_status === 'PENDING'
        );
        const verifiedStaff = profiles.filter(
          (p) => p.role !== 'student' && p.role !== 'admin' && p.verification_status === 'VERIFIED'
        );
        const rejectedStaff = profiles.filter(
          (p) => p.role !== 'student' && p.role !== 'admin' && p.verification_status === 'REJECTED'
        );

        return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-indigo-400" />
                  Staff Role Requests & Institutional Verification
                </h3>
                <p className="text-xs text-slate-400">
                  Section 28.E: Authorize self-registered institutional staff accounts and configure official responsibilities
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold">
                  {pendingStaff.length} Pending
                </span>
                <span className="px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold">
                  {verifiedStaff.length} Verified
                </span>
                {rejectedStaff.length > 0 && (
                  <span className="px-3 py-1 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 font-bold">
                    {rejectedStaff.length} Rejected
                  </span>
                )}
              </div>
            </div>

            {/* Pending Requests Section */}
            {pendingStaff.length === 0 ? (
              <div className="glass-panel rounded-3xl p-12 text-center border border-slate-700/80 shadow-2xl">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                <h4 className="text-base font-bold text-slate-200">No Pending Staff Verification Requests</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  All registered institutional staff accounts have been reviewed and authorized. Any newly registered staff will appear here immediately for identity and scope verification.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                  <Clock className="w-4 h-4 animate-spin" />
                  Pending Administrative Authorization ({pendingStaff.length})
                </h4>

                <div className="grid grid-cols-1 gap-4">
                  {pendingStaff.map((staff) => (
                    <div
                      key={staff.id}
                      className="glass-panel rounded-3xl p-6 border border-amber-500/30 bg-amber-950/10 shadow-xl space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-black text-sm">
                            {staff.full_name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h5 className="font-bold text-slate-100 text-sm">{staff.full_name}</h5>
                              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                                Pending Verification
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400">
                              Staff ID: <span className="font-mono text-blue-400 font-bold">{staff.staff_id}</span> • {staff.email}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleVerifyStaff(staff.id, staff.requested_role || staff.role, staff.designation, staff.responsibilities)}
                            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Approve & Authorize Role
                          </button>
                          <button
                            type="button"
                            onClick={() => { setRejectingStaff(staff); setRejectionReason(''); }}
                            className="px-3.5 py-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 font-semibold text-xs border border-rose-800/50 transition flex items-center gap-1.5"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Reject
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                          <span className="text-slate-400 block mb-0.5">Requested Role:</span>
                          <span className="font-bold text-indigo-300 uppercase">{staff.role.replace(/_/g, ' ')}</span>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                          <span className="text-slate-400 block mb-0.5">Department:</span>
                          <span className="font-semibold text-slate-200">{staff.department}</span>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                          <span className="text-slate-400 block mb-0.5">Designation:</span>
                          <span className="font-semibold text-slate-200">{staff.designation || 'Staff Member'}</span>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                          <span className="text-slate-400 block mb-0.5">Registration Time:</span>
                          <span className="text-slate-300">{new Date(staff.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>

                      {staff.role === 'faculty' && staff.subjects && staff.subjects.length > 0 && (
                        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs">
                          <span className="text-slate-400 font-semibold">Coursework Scope:</span>{' '}
                          <span className="text-slate-200">{staff.subjects.join(', ')}</span>
                          {staff.semester && (
                            <span className="text-slate-400 ml-2">(Semester {staff.semester})</span>
                          )}
                        </div>
                      )}

                      {staff.responsibilities && staff.responsibilities.length > 0 && (
                        <div className="space-y-1 text-xs">
                          <span className="text-slate-400 font-semibold">Requested Responsibilities:</span>
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {staff.responsibilities.map((r, i) => (
                              <span
                                key={i}
                                className="px-2.5 py-0.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-[11px]"
                              >
                                {r}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Tab 1: User Management & Real Dynamic Accounts (Section 25) */}
      {activeTab === 'users' && (() => {
        const facultyCount = profiles.filter((p) => p.role === 'faculty').length;
        const hodCount = profiles.filter((p) => p.role === 'hod').length;
        const libCount = profiles.filter((p) => p.role === 'library_staff').length;
        const accCount = profiles.filter((p) => p.role === 'accounts_staff').length;
        const labCount = profiles.filter((p) => p.role === 'lab_staff').length;
        const stuCount = profiles.filter((p) => p.role === 'student').length;
        const adminCount = profiles.filter((p) => p.role === 'admin').length;

        const filtered = profiles.filter((p) => {
          const matchesRole = userRoleFilter === 'all' || p.role === userRoleFilter;
          const matchesSearch =
            searchQuery.trim() === '' ||
            p.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (p.student_id && p.student_id.toLowerCase().includes(searchQuery.toLowerCase())) ||
            p.department.toLowerCase().includes(searchQuery.toLowerCase());
          return matchesRole && matchesSearch;
        });

        return (
          <div className="space-y-6">
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 flex items-start gap-3">
              <UserCheck className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-slate-100">Authorized Dynamic Accounts Registry (Section 25)</p>
                <p className="mt-0.5 leading-relaxed text-slate-400">
                  Accounts are fetched dynamically from the authentic database registry. No hardcoded or fabricated staff profiles are generated automatically.
                </p>
              </div>
            </div>

            {/* Role Filter Bar */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 flex-wrap">
              <button
                type="button"
                onClick={() => setUserRoleFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  userRoleFilter === 'all' ? 'bg-slate-200 text-slate-900 shadow' : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
                }`}
              >
                All Accounts ({profiles.length})
              </button>
              <button
                type="button"
                onClick={() => setUserRoleFilter('faculty')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  userRoleFilter === 'faculty' ? 'bg-blue-600 text-white shadow' : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                Faculty Advisors ({facultyCount})
              </button>
              <button
                type="button"
                onClick={() => setUserRoleFilter('hod')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  userRoleFilter === 'hod' ? 'bg-indigo-600 text-white shadow' : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
                }`}
              >
                HOD ({hodCount})
              </button>
              <button
                type="button"
                onClick={() => setUserRoleFilter('library_staff')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  userRoleFilter === 'library_staff' ? 'bg-amber-600 text-white shadow' : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
                }`}
              >
                Library Staff ({libCount})
              </button>
              <button
                type="button"
                onClick={() => setUserRoleFilter('accounts_staff')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  userRoleFilter === 'accounts_staff' ? 'bg-emerald-600 text-white shadow' : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
                }`}
              >
                Accounts Staff ({accCount})
              </button>
              <button
                type="button"
                onClick={() => setUserRoleFilter('lab_staff')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  userRoleFilter === 'lab_staff' ? 'bg-purple-600 text-white shadow' : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
                }`}
              >
                Laboratory Staff ({labCount})
              </button>
              <button
                type="button"
                onClick={() => setUserRoleFilter('student')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  userRoleFilter === 'student' ? 'bg-cyan-600 text-white shadow' : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
                }`}
              >
                Students ({stuCount})
              </button>
              <button
                type="button"
                onClick={() => setUserRoleFilter('admin')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  userRoleFilter === 'admin' ? 'bg-rose-600 text-white shadow' : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
                }`}
              >
                Administrators ({adminCount})
              </button>
            </div>

            {/* Zero Faculty Accounts Warning Banner */}
            {facultyCount === 0 && (
              <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/40 text-amber-300 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-amber-400 flex-shrink-0" />
                  <span>No faculty accounts have been created yet. Student clearance requests will require faculty assignment.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('provisioning')}
                  className="px-3 py-1 rounded-lg bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 transition"
                >
                  Provision Faculty
                </button>
              </div>
            )}

            {/* Empty State Displays per Category (Section 25.B) */}
            {userRoleFilter === 'faculty' && facultyCount === 0 && (
              <div className="glass-panel rounded-3xl p-12 text-center border border-slate-700/80 shadow-2xl">
                <GraduationCap className="w-12 h-12 text-slate-500 mx-auto mb-3" />
                <h4 className="text-base font-bold text-slate-200">No faculty accounts have been created yet.</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  Only authentic accounts provisioned by administrators will be displayed. Create a faculty account under the Provisioning tab.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('provisioning')}
                  className="mt-4 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition"
                >
                  Provision Faculty Account
                </button>
              </div>
            )}

            {userRoleFilter === 'hod' && hodCount === 0 && (
              <div className="glass-panel rounded-3xl p-12 text-center border border-slate-700/80 shadow-2xl">
                <Building className="w-12 h-12 text-slate-500 mx-auto mb-3" />
                <h4 className="text-base font-bold text-slate-200">No Head of Department (HOD) accounts have been created yet.</h4>
                <p className="text-xs text-slate-400 mt-1">Authorized HOD accounts can be provisioned through the Staff Provisioning portal.</p>
              </div>
            )}

            {userRoleFilter === 'library_staff' && libCount === 0 && (
              <div className="glass-panel rounded-3xl p-12 text-center border border-slate-700/80 shadow-2xl">
                <ShieldCheck className="w-12 h-12 text-slate-500 mx-auto mb-3" />
                <h4 className="text-base font-bold text-slate-200">No Library staff accounts have been created yet.</h4>
              </div>
            )}

            {userRoleFilter === 'accounts_staff' && accCount === 0 && (
              <div className="glass-panel rounded-3xl p-12 text-center border border-slate-700/80 shadow-2xl">
                <ShieldCheck className="w-12 h-12 text-slate-500 mx-auto mb-3" />
                <h4 className="text-base font-bold text-slate-200">No Accounts staff accounts have been created yet.</h4>
              </div>
            )}

            {userRoleFilter === 'lab_staff' && labCount === 0 && (
              <div className="glass-panel rounded-3xl p-12 text-center border border-slate-700/80 shadow-2xl">
                <ShieldCheck className="w-12 h-12 text-slate-500 mx-auto mb-3" />
                <h4 className="text-base font-bold text-slate-200">No Laboratory staff accounts have been created yet.</h4>
              </div>
            )}

            {userRoleFilter === 'student' && stuCount === 0 && (
              <div className="glass-panel rounded-3xl p-12 text-center border border-slate-700/80 shadow-2xl">
                <Users className="w-12 h-12 text-slate-500 mx-auto mb-3" />
                <h4 className="text-base font-bold text-slate-200">No student accounts have been created yet.</h4>
              </div>
            )}

            {/* Table of Users */}
            {filtered.length > 0 && (
              <div className="glass-panel rounded-3xl border border-slate-700/80 shadow-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                      <tr>
                        <th className="p-4">User</th>
                        <th className="p-4">Role</th>
                        <th className="p-4">Department</th>
                        <th className="p-4">Staff / Student ID</th>
                        <th className="p-4">Verification</th>
                        <th className="p-4">Account Status</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {filtered.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-800/30 transition">
                          <td className="p-4">
                            <p className="font-bold text-slate-200">{p.full_name}</p>
                            <p className="text-[10px] text-slate-500">{p.email}</p>
                          </td>
                          <td className="p-4">
                            <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[10px] font-bold uppercase text-slate-300">
                              {p.role.replace(/_/g, ' ')}
                            </span>
                            {p.designation && (
                              <p className="text-[10px] text-slate-400 mt-0.5">{p.designation}</p>
                            )}
                          </td>
                          <td className="p-4 text-slate-300">{p.department}</td>
                          <td className="p-4 font-mono text-slate-300">
                            {p.student_id ? (
                              <span className="text-cyan-400 font-bold">{p.student_id}</span>
                            ) : p.staff_id ? (
                              <span className="text-blue-400 font-bold">{p.staff_id}</span>
                            ) : (
                              <span className="text-slate-500">N/A</span>
                            )}
                          </td>
                          <td className="p-4">
                            {p.role === 'student' ? (
                              <span className="text-slate-500 text-[10px]">Student</span>
                            ) : p.role === 'admin' ? (
                              <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold">
                                Admin
                              </span>
                            ) : p.verification_status === 'VERIFIED' || p.is_verified ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                                Verified
                              </span>
                            ) : p.verification_status === 'REJECTED' ? (
                              <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold">
                                Rejected
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold animate-pulse">
                                Pending
                              </span>
                            )}
                          </td>
                          <td className="p-4">
                            {p.is_active ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-400">
                                <XCircle className="w-3.5 h-3.5" /> Deactivated
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {p.role !== 'student' && p.role !== 'admin' && (
                                <>
                                  {p.verification_status === 'PENDING' && (
                                    <button
                                      type="button"
                                      onClick={() => handleVerifyStaff(p.id, p.requested_role || p.role, p.designation, p.responsibilities)}
                                      className="px-2.5 py-1 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold transition"
                                      title="Verify and authorize staff account"
                                    >
                                      Verify
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => openEditStaffResp(p)}
                                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] font-semibold transition flex items-center gap-1"
                                    title="Edit department, designation, and responsibilities"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                    <span>Scope</span>
                                  </button>
                                </>
                              )}

                              {p.id !== user.id && (
                                <button
                                  type="button"
                                  onClick={() => handleToggleUserActive(p)}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 ${
                                    p.is_active
                                      ? 'bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/50'
                                      : 'bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800/50'
                                  }`}
                                >
                                  {p.is_active ? (
                                    <>
                                      <UserX className="w-3 h-3" /> Deactivate
                                    </>
                                  ) : (
                                    <>
                                      <UserCheck className="w-3 h-3" /> Activate
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Tab: Clearance Requests & Faculty Assignment Management (Section 26.D & 26.E) */}
      {activeTab === 'requests' && (() => {
        const activeFaculty = profiles.filter((p) => p.role === 'faculty' && p.is_active);
        const unassignedRequests = requests.filter(
          (r) => r.faculty_assignment_status === 'UNASSIGNED' || r.faculty_assignment_status === 'REASSIGNMENT_REQUIRED'
        );

        return (
          <div className="space-y-6">
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 flex items-start gap-3">
              <FileSpreadsheet className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-slate-100">Clearance Request Assignment Governance (Section 26)</p>
                <p className="mt-0.5 leading-relaxed text-slate-400">
                  Track request workflow status separately from faculty assignment status (<span className="text-slate-200 font-mono">UNASSIGNED</span>, <span className="text-slate-200 font-mono">ASSIGNED</span>, <span className="text-slate-200 font-mono">REASSIGNMENT_REQUIRED</span>). Assign active faculty members to place requests into their active work queue.
                </p>
              </div>
            </div>

            {unassignedRequests.length > 0 && (
              <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/50 text-amber-300 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                  <span>
                    <strong>{unassignedRequests.length} request(s)</strong> require faculty assignment resolution.
                  </span>
                </div>
              </div>
            )}

            {requests.length === 0 ? (
              <div className="glass-panel rounded-3xl p-12 text-center border border-slate-700/80 shadow-2xl">
                <FileSpreadsheet className="w-12 h-12 text-slate-500 mx-auto mb-3" />
                <h4 className="text-base font-bold text-slate-200">No Clearance Requests Submitted Yet</h4>
                <p className="text-xs text-slate-400 mt-1">Student submissions will appear here for governance and assignment tracking.</p>
              </div>
            ) : (
              <div className="glass-panel rounded-3xl border border-slate-700/80 shadow-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                      <tr>
                        <th className="p-4">Request Code</th>
                        <th className="p-4">Department / Sem</th>
                        <th className="p-4">Workflow Status</th>
                        <th className="p-4">Assignment Status</th>
                        <th className="p-4">Responsible Faculty</th>
                        <th className="p-4 text-right">Assign Faculty</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {requests.map((r) => {
                        const eligibleFacultyForReq = activeFaculty.filter(
                          (f) => !f.department_id || f.department?.toLowerCase() === r.department?.toLowerCase()
                        );
                        const currentFacultyId = assigningFacultyMap[r.id] || (eligibleFacultyForReq[0]?.id || activeFaculty[0]?.id || '');

                        return (
                          <tr key={r.id} className="hover:bg-slate-800/30 transition">
                            <td className="p-4 font-mono font-bold text-blue-400">{r.request_code}</td>
                            <td className="p-4 text-slate-300">
                              <div>{r.department}</div>
                              <div className="text-[10px] text-slate-500">Sem {r.semester} • {r.academic_year}</div>
                            </td>
                            <td className="p-4">
                              <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[10px] font-bold uppercase text-slate-300">
                                {r.status}
                              </span>
                            </td>
                            <td className="p-4">
                              {r.faculty_assignment_status === 'ASSIGNED' ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Assigned
                                </span>
                              ) : r.faculty_assignment_status === 'REASSIGNMENT_REQUIRED' ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-400">
                                  <AlertTriangle className="w-3.5 h-3.5" /> Reassignment Required
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400">
                                  <Clock className="w-3.5 h-3.5" /> Unassigned
                                </span>
                              )}
                            </td>
                            <td className="p-4 text-slate-200 font-medium">
                              {r.assigned_faculty_name || (
                                <span className="text-amber-400 italic">None</span>
                              )}
                            </td>
                            <td className="p-4 text-right">
                              {activeFaculty.length === 0 ? (
                                <span className="text-slate-500 text-[11px] italic">No active faculty</span>
                              ) : (
                                <div className="flex items-center justify-end gap-2">
                                  <select
                                    value={currentFacultyId}
                                    onChange={(e) =>
                                      setAssigningFacultyMap({
                                        ...assigningFacultyMap,
                                        [r.id]: e.target.value,
                                      })
                                    }
                                    className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-rose-500 max-w-[180px]"
                                  >
                                    {activeFaculty.map((f) => (
                                      <option key={f.id} value={f.id}>
                                        {f.full_name} ({f.department})
                                      </option>
                                    ))}
                                  </select>
                                  <button
                                    type="button"
                                    onClick={() => handleAssignFaculty(r.id, currentFacultyId)}
                                    className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition"
                                  >
                                    Assign
                                  </button>
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
            )}
          </div>
        );
      })()}

      {/* Tab: Managed Departments Registry (Section 2 & 4) */}
      {activeTab === 'departments' && (
        <div className="space-y-6">
          <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-700/80 shadow-2xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-700/60">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Building className="w-5 h-5 text-blue-400" />
                  <h3 className="text-lg font-bold text-slate-100">
                    Administratively Managed Department Registry
                  </h3>
                </div>
                <p className="text-xs text-slate-400">
                  Section 2 Rule: "Users must select their department from an administratively managed list. Do not hardcode a single department."
                </p>
              </div>
            </div>

            {/* Add Department Form */}
            <form onSubmit={handleAddDepartment} className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
                Register New Academic Department
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Department Code <span className="text-blue-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. AIML, EEE"
                    value={newDeptCode}
                    onChange={(e) => setNewDeptCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs font-mono font-bold"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Department Full Name <span className="text-blue-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Artificial Intelligence & Machine Learning"
                    value={newDeptName}
                    onChange={(e) => setNewDeptName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs"
                  />
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isAddingDept}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition disabled:opacity-50"
                >
                  {isAddingDept ? 'Registering...' : '+ Add Department'}
                </button>
              </div>
            </form>

            {/* Department List Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                  <tr>
                    <th className="p-4">Code</th>
                    <th className="p-4">Full Department Name</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {departments.map((dept) => (
                    <tr key={dept.id} className="hover:bg-slate-800/30 transition">
                      <td className="p-4 font-mono font-bold text-blue-400">{dept.code}</td>
                      <td className="p-4 font-semibold text-slate-200">{dept.name}</td>
                      <td className="p-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                            dept.is_active
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : 'bg-slate-700 text-slate-400 border-slate-600'
                          }`}
                        >
                          {dept.is_active ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleToggleDepartment(dept)}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                            dept.is_active
                              ? 'bg-slate-800 hover:bg-rose-950/40 text-slate-300 hover:text-rose-300 border border-slate-700'
                              : 'bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-700'
                          }`}
                        >
                          {dept.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Authorized Student Provisioning (Section 4 & 5) */}
      {activeTab === 'provisioning' && (
        <div className="space-y-6 max-w-3xl">
          <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-700/80 shadow-2xl space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <UserPlus className="w-5 h-5 text-emerald-400" />
                <h3 className="text-lg font-bold text-slate-100">
                  Provision Student From Authorized Academic List
                </h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Section 5 Rule: "Student accounts must be provisioned or imported from an approved student list. Prevent public self-registration from granting access to institutional records."
              </p>
            </div>

            <form onSubmit={handleProvisionStudent} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                    Full Student Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Student Full Name"
                    value={provName}
                    onChange={(e) => setProvName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                    Student USN / Institutional ID <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 1CR24CS099"
                    value={provUsn}
                    onChange={(e) => setProvUsn(e.target.value.toUpperCase())}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs font-mono font-bold focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                    Department <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={provDeptId}
                    onChange={(e) => setProvDeptId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-rose-500"
                  >
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.code} — {dept.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                    Semester <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={provSem}
                    onChange={(e) => setProvSem(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-rose-500"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                      <option key={s} value={s}>
                        Semester {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                    Term Attendance (%) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    required
                    value={provAttendance}
                    onChange={(e) => setProvAttendance(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs font-mono font-bold focus:outline-none focus:border-rose-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Threshold: {threshold}%. Will determine initial eligibility.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                    Assigned Faculty Advisor <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={provFacultyId}
                    onChange={(e) => setProvFacultyId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-rose-500"
                  >
                    {profiles
                      .filter((p) => p.role === 'faculty')
                      .map((fac) => (
                        <option key={fac.id} value={fac.id}>
                          {fac.full_name} ({fac.department})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-3 border-t border-slate-800">
                <button
                  type="submit"
                  disabled={isProvisioning}
                  className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-900/30 transition disabled:opacity-50"
                >
                  {isProvisioning ? 'Provisioning...' : 'Provision Student Account'}
                </button>
              </div>
            </form>
          </div>

          {/* Card 2: Staff Provisioning & Role Assignment */}
          <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-700/80 shadow-2xl space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck className="w-5 h-5 text-indigo-400" />
                <h3 className="text-lg font-bold text-slate-100">
                  Provision Institutional Staff & Assign Role
                </h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Section 4 & 5 Rule: "Staff accounts and their roles must be managed securely by an authorized administrator. Student self-registration must never grant staff or administrator privileges."
              </p>
            </div>

            <form onSubmit={handleProvisionStaff} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                    Staff Full Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Staff Full Name"
                    value={staffName}
                    onChange={(e) => setStaffName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                    Institutional Email <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. staff.dept@cauvery.edu.in"
                    value={staffEmail}
                    onChange={(e) => setStaffEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                    Assigned Staff Role <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={staffRole}
                    onChange={(e) => setStaffRole(e.target.value as UserRole)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-rose-500"
                  >
                    <option value="faculty">Faculty Advisor</option>
                    <option value="library_staff">Central Library Staff</option>
                    <option value="accounts_staff">Accounts Staff</option>
                    <option value="lab_staff">Laboratory Staff</option>
                    <option value="hod">Head of Department (HOD)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                    Designation / Title
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Assistant Professor, Associate Professor"
                    value={staffDesignation}
                    onChange={(e) => setStaffDesignation(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Assigned Department
                </label>
                <select
                  value={staffDeptId}
                  onChange={(e) => setStaffDeptId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-rose-500"
                >
                  <option value="">Central Administration / General</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.code} — {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Initial Temporary Password <span className="text-rose-400">*</span>
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Set secure initial password (min 6 characters)"
                  value={staffPassword}
                  onChange={(e) => setStaffPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-rose-500 font-mono"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Staff member will be prompted to change this temporary password upon first login.
                </p>
              </div>

              <div className="flex justify-end pt-3 border-t border-slate-800">
                <button
                  type="submit"
                  disabled={isProvisioningStaff}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-900/30 transition disabled:opacity-50"
                >
                  {isProvisioningStaff ? 'Provisioning...' : 'Provision Staff Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tab 2: Attendance Threshold Configuration (Section 7.2) */}
      {activeTab === 'settings' && (
        <div className="space-y-6 max-w-3xl">
          <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-700/80 shadow-2xl space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Sliders className="w-5 h-5 text-indigo-400" />
                <h3 className="text-lg font-bold text-slate-100">
                  Minimum Attendance Percentage Policy
                </h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Section 7.2 Rule: "minimum_attendance_percentage" default is 85%. Never hard-code into frontend. Calculating eligibility dynamically on the backend ensures changes immediately govern all pending and future academic approvals.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-200">
                  Current Minimum Attendance Requirement:
                </span>
                <span className="text-3xl font-black text-indigo-400 font-mono">
                  {threshold}%
                </span>
              </div>

              <div>
                <input
                  type="range"
                  min="50"
                  max="100"
                  step="1"
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
                <div className="flex justify-between text-[11px] text-slate-500 mt-1">
                  <span>50%</span>
                  <span>75%</span>
                  <span>85% (Default)</span>
                  <span>100%</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                <span className="text-xs text-slate-400">
                  Saves to PostgreSQL table <code>system_settings</code>
                </span>
                <button
                  type="button"
                  onClick={handleSaveThreshold}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-900/30 transition flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  Save & Recalculate Student Records
                </button>
              </div>
            </div>
          </div>

          {/* Section 29: Database Integrity and Demo Account Cleanup Panel */}
          <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-700/80 shadow-2xl space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Database className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-lg font-bold text-slate-100">
                    Database Integrity & Genuine Accounts Verification (Section 29)
                  </h3>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Enforces strict institutional database integrity. Eliminates automatically generated demo accounts, fictional teacher profiles, and mock fallbacks. Preserves legitimate student accounts, real submitted No-Due requests, valid clearances, payment proofs, and audit trails.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono text-[11px] font-semibold flex items-center gap-1.5 flex-shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Zero Demo Accounts
              </span>
            </div>

            {/* Profile Counts Breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Total Profiles
                </span>
                <span className="text-2xl font-black text-slate-100 font-mono">
                  {profiles.length}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">Database stored</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Verified Faculty
                </span>
                <span className="text-2xl font-black text-emerald-400 font-mono">
                  {profiles.filter((p) => p.role === 'faculty' && p.verification_status === 'VERIFIED').length}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">Selectable by students</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Staff Accounts
                </span>
                <span className="text-2xl font-black text-amber-400 font-mono">
                  {profiles.filter((p) => p.role !== 'student' && p.role !== 'admin').length}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">Faculty / Staff / HOD</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Student Accounts
                </span>
                <span className="text-2xl font-black text-blue-400 font-mono">
                  {profiles.filter((p) => p.role === 'student').length}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">Genuine students</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 text-xs text-slate-300 space-y-2">
              <div className="flex items-center gap-2 font-bold text-slate-200">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Production Database Protections Enforced:</span>
              </div>
              <ul className="list-disc list-inside text-slate-400 space-y-1 pl-1 text-[11px] leading-relaxed">
                <li>Automatic generation of random faculty accounts upon empty query is completely disabled.</li>
                <li>When zero faculty accounts exist for a department, teacher selection is blocked with the mandated notification: <em>&quot;No faculty accounts have been created yet.&quot;</em></li>
                <li>Self-registered staff accounts default to unverified and cannot access clearance queues or approve requests.</li>
                <li>Public registration for the Administrator role is strictly rejected.</li>
              </ul>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-400">
                Run deep inspection to purge any test residue:
              </span>
              <button
                type="button"
                onClick={handleCleanupDatabase}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold shadow-md transition flex items-center gap-2 hover:border-rose-500/50"
              >
                <Trash2 className="w-4 h-4 text-rose-400" />
                <span>Run Database Cleanup &amp; Integrity Check</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Payment QR Configuration (Section 12) */}
      {activeTab === 'qrs' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-100">Payment QR Configurations</h3>
              <p className="text-xs text-slate-400">
                Section 12: Separate active QR configurations for Library, Accounts, and Laboratory
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                setEditingQr({
                  authority: 'library',
                  title: 'New QR Configuration',
                  upi_id: '',
                  account_details: '',
                  instructions: '',
                  is_active: true,
                })
              }
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Add Payment QR
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {paymentQrs.map((qr) => (
              <div
                key={qr.id}
                className="glass-card rounded-2xl p-5 border border-slate-700/80 flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[10px] font-bold uppercase text-slate-300">
                      {qr.authority}
                    </span>
                    <span
                      className={`text-[10px] font-bold ${
                        qr.is_active ? 'text-emerald-400' : 'text-slate-500'
                      }`}
                    >
                      {qr.is_active ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-100 mb-1">{qr.title}</h4>
                  <p className="font-mono text-xs text-blue-400 truncate mb-2">{qr.upi_id}</p>
                  <p className="text-[11px] text-slate-400 line-clamp-2">{qr.instructions}</p>
                </div>

                <div className="flex items-center justify-center p-2 bg-white rounded-xl shadow-inner">
                  <img src={qr.qr_image_url} alt="QR Preview" className="w-28 h-28 object-contain" />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setEditingQr(qr)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Edit Configuration
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Edit QR Modal */}
          {editingQr && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
              <div className="w-full max-w-lg glass-panel rounded-2xl border border-slate-700 p-6 shadow-2xl">
                <div className="flex items-center justify-between pb-3 border-b border-slate-700 mb-4">
                  <h3 className="text-base font-bold text-slate-100">Configure Payment QR</h3>
                  <button onClick={() => setEditingQr(null)} className="text-slate-400 hover:text-white">
                    ✕
                  </button>
                </div>

                <form onSubmit={handleSaveQr} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Clearance Authority
                    </label>
                    <select
                      value={editingQr.authority}
                      onChange={(e) =>
                        setEditingQr({ ...editingQr, authority: e.target.value as any })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs"
                    >
                      <option value="library">Central Library</option>
                      <option value="accounts">Accounts & Finance</option>
                      <option value="lab">Laboratories</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Desk Title
                    </label>
                    <input
                      type="text"
                      required
                      value={editingQr.title || ''}
                      onChange={(e) => setEditingQr({ ...editingQr, title: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      UPI Address / VPA
                    </label>
                    <input
                      type="text"
                      required
                      value={editingQr.upi_id || ''}
                      onChange={(e) => setEditingQr({ ...editingQr, upi_id: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Bank Account Details (Optional)
                    </label>
                    <input
                      type="text"
                      value={editingQr.account_details || ''}
                      onChange={(e) => setEditingQr({ ...editingQr, account_details: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Payment Instructions for Student
                    </label>
                    <textarea
                      rows={2}
                      value={editingQr.instructions || ''}
                      onChange={(e) => setEditingQr({ ...editingQr, instructions: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                      <input
                        type="checkbox"
                        checked={editingQr.is_active ?? true}
                        onChange={(e) => setEditingQr({ ...editingQr, is_active: e.target.checked })}
                        className="rounded bg-slate-900 border-slate-700 text-rose-500"
                      />
                      <span>Set as Active Configuration</span>
                    </label>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setEditingQr(null)}
                      className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md"
                    >
                      Save Configuration
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: System Audit Trail (Section 16) */}
      {activeTab === 'audits' && (
        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 flex items-start gap-3">
            <Activity className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-slate-100">Permanent System Audit Trail</p>
              <p className="mt-0.5 leading-relaxed text-slate-400">
                Rule 2.12: Preserves all critical events including clearance decisions, payment uploads, faculty verifications, attendance adjustments, and HOD final clearances.
              </p>
            </div>
          </div>

          <div className="glass-panel rounded-3xl border border-slate-700/80 shadow-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                  <tr>
                    <th className="p-4">Timestamp</th>
                    <th className="p-4">Actor</th>
                    <th className="p-4">Role</th>
                    <th className="p-4">Action</th>
                    <th className="p-4">Entity</th>
                    <th className="p-4">State Payload</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-[11px]">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/30 transition">
                      <td className="p-4 text-slate-400">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="p-4 font-bold text-slate-200">
                        {log.user_name || 'System / RPC'}
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[10px] font-bold uppercase text-slate-300">
                          {log.user_role}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-blue-400">{log.action}</td>
                      <td className="p-4 text-slate-300">{log.entity_type}</td>
                      <td className="p-4 text-slate-400 max-w-xs truncate">
                        {JSON.stringify(log.new_state || log.previous_state || {})}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Staff Verification Rejection Modal (Section 28.E) */}
      {rejectingStaff && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel max-w-md w-full rounded-3xl p-6 border border-rose-500/40 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-rose-400">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <h3 className="text-base font-bold text-white">Reject Staff Verification</h3>
            </div>
            <p className="text-xs text-slate-300">
              You are rejecting institutional authorization for{' '}
              <span className="font-semibold text-white">{rejectingStaff.full_name}</span> (
              {rejectingStaff.staff_id || rejectingStaff.email}).
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Administrative Explanation (Required)
              </label>
              <textarea
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Specify reason (e.g., Staff ID mismatch, unverified department appointment, unauthorized role request)..."
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-rose-500"
                required
              />
            </div>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setRejectingStaff(null);
                  setRejectionReason('');
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleRejectStaff(rejectingStaff.id)}
                disabled={!rejectionReason.trim()}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-bold shadow-md"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Staff Scope & Responsibilities Configuration Modal (Section 28.B & 28.E) */}
      {editingStaffResp && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="glass-panel max-w-lg w-full rounded-3xl p-6 border border-slate-700 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">Configure Staff Scope &amp; Responsibilities</h3>
              </div>
              <button
                onClick={() => setEditingStaffResp(null)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-slate-300">
              Configuring institutional responsibilities for{' '}
              <span className="font-bold text-white">{editingStaffResp.full_name}</span> (
              {editingStaffResp.staff_id || editingStaffResp.email}) — Role:{' '}
              <span className="uppercase text-amber-300 font-semibold">{editingStaffResp.role}</span>
            </div>

            <form onSubmit={handleSaveStaffResponsibilities} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Department
                </label>
                <select
                  value={editDeptId}
                  onChange={(e) => setEditDeptId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Central Administration / General</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.code} — {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Designation
                </label>
                <input
                  type="text"
                  value={editDesignation}
                  onChange={(e) => setEditDesignation(e.target.value)}
                  placeholder="e.g. Assistant Professor, Librarian, Accounts Officer"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              {editingStaffResp.role === 'faculty' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Semester Handled
                    </label>
                    <select
                      value={editSemester}
                      onChange={(e) => setEditSemester(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                        <option key={s} value={s}>
                          Semester {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Subjects Taught (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={editSubjects}
                      onChange={(e) => setEditSubjects(e.target.value)}
                      placeholder="e.g. CS501, CS502"
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Authorized Responsibilities
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-900/60 p-3 rounded-xl border border-slate-800 max-h-48 overflow-y-auto">
                  {[
                    'Academic verification',
                    'Attendance verification',
                    'Assignment verification',
                    'Library clearance',
                    'Accounts clearance',
                    'Payment evidence review',
                    'Laboratory clearance',
                    'Department-level HOD review',
                  ].map((resp) => {
                    const isChecked = editResponsibilities.includes(resp);
                    return (
                      <label
                        key={resp}
                        className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 hover:text-white"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setEditResponsibilities([...editResponsibilities, resp]);
                            } else {
                              setEditResponsibilities(editResponsibilities.filter((r) => r !== resp));
                            }
                          }}
                          className="rounded bg-slate-800 border-slate-700 text-indigo-500 focus:ring-0"
                        />
                        <span>{resp}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingStaffResp(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md"
                >
                  Save Authorized Responsibilities
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
