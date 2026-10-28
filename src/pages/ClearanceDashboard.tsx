// ==============================================================================
// COLLEGE NO-DUE CLEARANCE MANAGEMENT SYSTEM
// Independent Clearance Dashboard (Section 8 & 11)
// Specialized view for Library, Accounts, and Laboratory staff
// ==============================================================================

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import {
  ClearanceItem,
  PaymentQrConfig,
  AuthorityType,
  RejectionCategoryType,
} from '../types/database';
import { StatusBadge } from '../components/StatusBadge';
import { RejectionModal } from '../components/RejectionModal';
import {
  BookOpen,
  Wallet,
  FlaskConical,
  CheckCircle2,
  XCircle,
  Clock,
  CreditCard,
  QrCode,
  AlertTriangle,
  Search,
  Filter,
  Check,
  X,
  ShieldAlert,
} from 'lucide-react';

interface ClearanceDashboardProps {
  authority: AuthorityType;
}

export const ClearanceDashboard: React.FC<ClearanceDashboardProps> = ({ authority }) => {
  const { user } = useAuth();

  const [items, setItems] = useState<ClearanceItem[]>([]);
  const [activeQr, setActiveQr] = useState<PaymentQrConfig | null>(null);
  const [availableQrs, setAvailableQrs] = useState<PaymentQrConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'payment_required'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Rejection modal
  const [rejectingItem, setRejectingItem] = useState<ClearanceItem | null>(null);
  const [notificationMsg, setNotificationMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const meta = {
    library: {
      name: 'Central Library Clearance Desk',
      icon: BookOpen,
      role: 'library_staff',
      color: 'blue',
      badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
      description: 'Book return verification, catalog tracking, and library dues administration.',
    },
    accounts: {
      name: 'Finance & Student Accounts Desk',
      icon: Wallet,
      role: 'accounts_staff',
      color: 'emerald',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      description: 'Semester tuition fees, examination dues, institutional reconciliations, and academic ledger audit.',
    },
    lab: {
      name: user?.department ? `${user.department} Laboratory Desk` : 'Department Laboratory Clearance Desk',
      icon: FlaskConical,
      role: 'lab_staff',
      color: 'amber',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      description: user?.department
        ? `Laboratory clearance and apparatus inspections strictly isolated to ${user.department}.`
        : 'Workstation hardware, apparatus inspection, consumables, and breakage fee settlement.',
    },
  }[authority];

  const Icon = meta.icon;

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [authority, user]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const data = await api.getAuthorityClearanceData(authority, user?.id);
      setItems(data.items);
      setActiveQr(data.activeQr);

      // Also load all QRs for this authority for modal selection
      const adminData = await api.getAdminDashboardData();
      const authorityQrs = adminData.paymentQrs.filter((q) => q.authority === authority && q.is_active);
      setAvailableQrs(authorityQrs);
    } catch (err) {
      console.error('Failed to load clearance data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (item: ClearanceItem) => {
    if (!user) return;
    try {
      setNotificationMsg(null);
      await api.processClearanceDecision({
        itemId: item.id,
        reviewerId: user.id,
        decision: 'approve',
        remarks: 'Clearance verified. All dues and departmental requirements satisfied.',
      });
      setNotificationMsg({ type: 'success', text: `Clearance successfully approved.` });
      await loadData();
    } catch (err: any) {
      setNotificationMsg({ type: 'error', text: err.message || 'Approval blocked.' });
    }
  };

  const handleRejectSubmit = async (data: {
    category: RejectionCategoryType;
    explanation: string;
    paymentRequired: boolean;
    paymentAmount?: number;
    paymentQrId?: string;
    paymentInstructions?: string;
  }) => {
    if (!rejectingItem || !user) return;
    await api.processClearanceDecision({
      itemId: rejectingItem.id,
      reviewerId: user.id,
      decision: 'reject',
      remarks: data.explanation,
      rejectionCategory: data.category,
      paymentRequired: data.paymentRequired,
      paymentAmount: data.paymentAmount,
      paymentQrId: data.paymentQrId,
      paymentInstructions: data.paymentInstructions,
    });
    setNotificationMsg({ type: 'success', text: 'Clearance rejection recorded. Student notified.' });
    await loadData();
  };

  // Section 8.3 Clearance Metrics derived from real records
  const metrics = {
    total: items.length,
    pending: items.filter((i) => i.status?.toUpperCase() === 'PENDING').length,
    approved: items.filter((i) => i.status?.toUpperCase() === 'APPROVED').length,
    rejected: items.filter((i) => i.status?.toUpperCase() === 'REJECTED').length,
    paymentRequired: items.filter((i) => i.payment_required && (i.payment_status?.toUpperCase() === 'PENDING_PAYMENT' || (i.payment_status as string) === 'required')).length,
    evidenceUploaded: items.filter((i) => i.payment_status?.toUpperCase() === 'PENDING_REVIEW' || (i.payment_status as string) === 'screenshot_uploaded').length,
    paymentConfirmed: items.filter((i) => i.payment_status?.toUpperCase() === 'CONFIRMED' || (i.payment_status as string) === 'verified_by_faculty').length,
  };

  // Filtered items
  const filteredItems = items.filter((item) => {
    const req = (item as any).request;
    const student = req?.student;
    const matchesSearch =
      student?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student?.student_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.id.toLowerCase().includes(searchQuery.toLowerCase());

    if (statusFilter === 'all') return matchesSearch;
    if (statusFilter === 'payment_required') return matchesSearch && item.payment_required;
    return matchesSearch && item.status?.toLowerCase() === statusFilter.toLowerCase();
  });

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8 animate-in fade-in">
      {/* Header Banner */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-700/80 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-blue-500/20 border border-blue-400/30 flex-shrink-0">
              <Icon className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-slate-100">{meta.name}</h1>
                <span className={`px-2.5 py-0.5 rounded-full border text-xs font-bold uppercase ${meta.badgeColor}`}>
                  {authority} Authority
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">{meta.description}</p>
            </div>
          </div>

          {/* Active Payment QR Quick Card */}
          {activeQr && (
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-900/90 border border-slate-700/80 max-w-sm">
              <img
                src={activeQr.qr_image_url}
                alt="QR Code"
                className="w-14 h-14 rounded-lg bg-white p-1 flex-shrink-0"
              />
              <div className="truncate">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Active Payment QR
                </span>
                <p className="text-xs font-bold text-slate-200 truncate">{activeQr.title}</p>
                <p className="text-[11px] font-mono text-blue-400 truncate">{activeQr.upi_id}</p>
              </div>
            </div>
          )}
        </div>

        {/* Section 8.3 Real Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mt-8 pt-6 border-t border-slate-800">
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Total Items</span>
            <span className="text-xl font-black text-slate-100 font-mono">{metrics.total}</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Pending</span>
            <span className="text-xl font-black text-blue-400 font-mono">{metrics.pending}</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Approved</span>
            <span className="text-xl font-black text-emerald-400 font-mono">{metrics.approved}</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Rejected</span>
            <span className="text-xl font-black text-rose-400 font-mono">{metrics.rejected}</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Payment Req.</span>
            <span className="text-xl font-black text-amber-400 font-mono">{metrics.paymentRequired}</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Evidence Uploaded</span>
            <span className="text-xl font-black text-purple-400 font-mono">{metrics.evidenceUploaded}</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Payment Confirmed</span>
            <span className="text-xl font-black text-emerald-400 font-mono">{metrics.paymentConfirmed}</span>
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
            placeholder="Search by student name, ID..."
            className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-slate-400" />
          {(['all', 'pending', 'approved', 'rejected', 'payment_required'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${
                statusFilter === st
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800'
              }`}
            >
              {st.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Clearance Items Table */}
      <div className="glass-panel rounded-3xl border border-slate-700/80 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="p-4">Student</th>
                <th className="p-4">Period</th>
                <th className="p-4">Faculty Prereq</th>
                <th className="p-4">Clearance Status</th>
                <th className="p-4">Payment Requirements</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    No clearance records found for this authority matching criteria.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const req = (item as any).request;
                  const student = req?.student;
                  const isFacultyApproved = req?.faculty_status?.toUpperCase() === 'APPROVED';

                  return (
                    <tr key={item.id} className="hover:bg-slate-800/30 transition">
                      <td className="p-4">
                        <p className="font-bold text-slate-200">{student?.full_name || 'Student'}</p>
                        <p className="font-mono text-slate-400 text-[11px]">{student?.student_id}</p>
                      </td>
                      <td className="p-4">
                        <p className="text-slate-300 font-semibold">{req?.academic_year}</p>
                        <p className="text-slate-500 text-[11px]">Semester {req?.semester}</p>
                      </td>
                      <td className="p-4">
                        {isFacultyApproved ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Faculty Approved
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400">
                            <Clock className="w-3.5 h-3.5" /> Awaiting Faculty
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        <StatusBadge status={item.status} type="stage" size="sm" />
                        {item.remarks && (
                          <p className="text-[10px] text-slate-400 italic mt-1 line-clamp-1">
                            "{item.remarks}"
                          </p>
                        )}
                      </td>
                      <td className="p-4">
                        {item.payment_required ? (
                          <div className="space-y-0.5">
                            <span className="font-mono font-bold text-amber-400 text-xs">
                              ₹ {item.payment_amount?.toFixed(2)}
                            </span>
                            <div className="text-[10px]">
                              <StatusBadge status={item.payment_status} type="payment" size="sm" />
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-500">No payment dues</span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {item.status?.toUpperCase() !== 'APPROVED' && (
                            <button
                              type="button"
                              onClick={() => handleApprove(item)}
                              disabled={!isFacultyApproved}
                              title={
                                !isFacultyApproved
                                  ? 'Blocked: Faculty academic verification must be approved first.'
                                  : 'Approve clearance'
                              }
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                                isFacultyApproved
                                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
                                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                              }`}
                            >
                              <Check className="w-3.5 h-3.5" />
                              Approve
                            </button>
                          )}

                          {item.status?.toUpperCase() !== 'REJECTED' && (
                            <button
                              type="button"
                              onClick={() => setRejectingItem(item)}
                              disabled={!isFacultyApproved}
                              title={
                                !isFacultyApproved
                                  ? 'Blocked: Faculty academic verification must be approved first.'
                                  : 'Reject / Set Payment Due'
                              }
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                                isFacultyApproved
                                  ? 'bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/50'
                                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                              }`}
                            >
                              <X className="w-3.5 h-3.5" />
                              Reject / Require Dues
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

      {/* Rejection / Payment Requirement Modal */}
      {rejectingItem && (
        <RejectionModal
          isOpen={Boolean(rejectingItem)}
          onClose={() => setRejectingItem(null)}
          title={`Reject ${authority.toUpperCase()} Clearance`}
          stageName={`${meta.name}`}
          isClearanceAuthority={true}
          availableQrs={availableQrs}
          onSubmit={handleRejectSubmit}
        />
      )}
    </div>
  );
};
