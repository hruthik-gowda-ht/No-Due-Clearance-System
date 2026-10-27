// ==============================================================================
// CAUVERY INSTITUTE OF TECHNOLOGY (Affiliated to VTU)
// COLLEGE NO-DUE CLEARANCE MANAGEMENT SYSTEM
// StatusBadge Component — Accessible, Color-Coded Workflow Badges
// ==============================================================================

import React from 'react';
import { RequestStatus, StageStatus, PaymentStatus } from '../types/database';
import { CheckCircle2, Clock, AlertTriangle, XCircle, CreditCard, ShieldCheck } from 'lucide-react';

interface StatusBadgeProps {
  status: RequestStatus | StageStatus | PaymentStatus | string;
  type?: 'request' | 'stage' | 'payment';
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  type = 'request',
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-medium',
    lg: 'text-sm px-3.5 py-1.5 gap-2 font-semibold',
  }[size];

  const norm = (status || '').toUpperCase();

  // Request Overall Statuses
  if (type === 'request') {
    switch (norm) {
      case 'CLEARED':
        return (
          <span className={`inline-flex items-center rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 ${sizeClasses} shadow-sm shadow-emerald-500/20`}>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            No-Due Cleared
          </span>
        );
      case 'HOD_REVIEW':
        return (
          <span className={`inline-flex items-center rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30 ${sizeClasses} animate-pulse-subtle`}>
            <Clock className="w-3.5 h-3.5 text-purple-400" />
            HOD Final Review
          </span>
        );
      case 'IN_REVIEW':
        return (
          <span className={`inline-flex items-center rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30 ${sizeClasses}`}>
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            In Review
          </span>
        );
      case 'PAYMENT_VERIFICATION_PENDING':
        return (
          <span className={`inline-flex items-center rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 ${sizeClasses}`}>
            <CreditCard className="w-3.5 h-3.5 text-amber-400" />
            Payment Evidence Awaiting Review
          </span>
        );
      case 'ACTION_REQUIRED':
        return (
          <span className={`inline-flex items-center rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 ${sizeClasses}`}>
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            Action Required
          </span>
        );
      case 'RESUBMISSION_REQUIRED':
        return (
          <span className={`inline-flex items-center rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30 ${sizeClasses}`}>
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            Resubmission Required
          </span>
        );
      case 'REJECTED':
        return (
          <span className={`inline-flex items-center rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30 ${sizeClasses}`}>
            <XCircle className="w-3.5 h-3.5 text-rose-400" />
            Rejected
          </span>
        );
      case 'PENDING_FACULTY_REVIEW':
        return (
          <span className={`inline-flex items-center rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 ${sizeClasses}`}>
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            Pending Faculty Review
          </span>
        );
      case 'SUBMITTED':
      default:
        return (
          <span className={`inline-flex items-center rounded-full bg-slate-500/15 text-slate-300 border border-slate-500/30 ${sizeClasses}`}>
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            Pending Verification
          </span>
        );
    }
  }

  // Discrete Stage Statuses
  if (type === 'stage') {
    switch (norm) {
      case 'APPROVED':
        return (
          <span className={`inline-flex items-center rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 ${sizeClasses}`}>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Approved
          </span>
        );
      case 'REJECTED':
        return (
          <span className={`inline-flex items-center rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30 ${sizeClasses}`}>
            <XCircle className="w-3.5 h-3.5 text-rose-400" />
            Rejected
          </span>
        );
      case 'IN_REVIEW':
        return (
          <span className={`inline-flex items-center rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30 ${sizeClasses}`}>
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            In Review
          </span>
        );
      case 'RESUBMISSION_REQUIRED':
        return (
          <span className={`inline-flex items-center rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 ${sizeClasses}`}>
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            Resubmission Required
          </span>
        );
      case 'PENDING':
      default:
        return (
          <span className={`inline-flex items-center rounded-full bg-slate-700/50 text-slate-400 border border-slate-600/50 ${sizeClasses}`}>
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            Pending
          </span>
        );
    }
  }

  // Payment Statuses (Section 9)
  switch (norm) {
    case 'PENDING_PAYMENT':
      return (
        <span className={`inline-flex items-center rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 ${sizeClasses}`}>
          <CreditCard className="w-3.5 h-3.5 text-amber-400" />
          Pending Payment
        </span>
      );
    case 'PENDING_REVIEW':
      return (
        <span className={`inline-flex items-center rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30 ${sizeClasses}`}>
          <Clock className="w-3.5 h-3.5 text-blue-400" />
          Pending Review
        </span>
      );
    case 'CONFIRMED':
      return (
        <span className={`inline-flex items-center rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 ${sizeClasses}`}>
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          Payment Confirmed
        </span>
      );
    case 'REJECTED':
      return (
        <span className={`inline-flex items-center rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30 ${sizeClasses}`}>
          <XCircle className="w-3.5 h-3.5 text-rose-400" />
          Payment Evidence Rejected
        </span>
      );
    case 'NOT_REQUIRED':
    default:
      return null;
  }
};
