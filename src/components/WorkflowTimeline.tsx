// ==============================================================================
// COLLEGE NO-DUE CLEARANCE MANAGEMENT SYSTEM
// Workflow Timeline Visualizer
// Visual representation of Section 4: Complete Business Workflow
// ==============================================================================

import React from 'react';
import { NoDueRequest } from '../types/database';
import { Check, Clock, AlertTriangle, ShieldCheck, GraduationCap, Building2, BookOpen, Wallet, FlaskConical, Award } from 'lucide-react';

interface WorkflowTimelineProps {
  request: NoDueRequest;
}

export const WorkflowTimeline: React.FC<WorkflowTimelineProps> = ({ request }) => {
  const isFacultyDone = request.faculty_status?.toUpperCase() === 'APPROVED';
  const isFacultyRejected = request.faculty_status?.toUpperCase() === 'REJECTED';

  const isLibDone = request.library_status?.toUpperCase() === 'APPROVED';
  const isAccDone = request.accounts_status?.toUpperCase() === 'APPROVED';
  const isLabDone = request.lab_status?.toUpperCase() === 'APPROVED';

  const isClearanceDone = isLibDone && isAccDone && isLabDone;
  const isClearanceRejected =
    request.library_status?.toUpperCase() === 'REJECTED' ||
    request.accounts_status?.toUpperCase() === 'REJECTED' ||
    request.lab_status?.toUpperCase() === 'REJECTED';

  const isHodDone = request.hod_status?.toUpperCase() === 'APPROVED';
  const isHodRejected = request.hod_status?.toUpperCase() === 'REJECTED';
  const isCleared = request.status?.toUpperCase() === 'CLEARED';

  return (
    <div className="w-full glass-card rounded-2xl p-6 border border-slate-700/60 shadow-xl">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-700/50">
        <div>
          <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <Award className="w-5 h-5 text-blue-400" />
            No-Due Multi-Stage Clearance Pipeline
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Database-enforced sequence: Faculty Academic Verification → Independent Clearances → HOD Final Review → Hall Ticket
          </p>
        </div>
        <div className="text-right">
          <span className="text-xs text-slate-400">Current Stage: </span>
          <span className="text-xs font-semibold text-blue-400 uppercase tracking-wide">
            {request.status.replace(/_/g, ' ')}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
        {/* Stage 1: Faculty Academic Verification */}
        <div
          className={`relative rounded-xl p-4 transition-all duration-300 border ${
            isFacultyDone
              ? 'bg-emerald-950/20 border-emerald-500/40'
              : isFacultyRejected
              ? 'bg-rose-950/20 border-rose-500/40'
              : 'bg-blue-950/20 border-blue-500/40 ring-2 ring-blue-500/20'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 tracking-wider">STAGE 1</span>
            {isFacultyDone ? (
              <span className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <Check className="w-3.5 h-3.5" />
              </span>
            ) : isFacultyRejected ? (
              <span className="w-6 h-6 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                <AlertTriangle className="w-3.5 h-3.5" />
              </span>
            ) : (
              <span className="w-6 h-6 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400 animate-pulse">
                <Clock className="w-3.5 h-3.5" />
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mb-1">
            <GraduationCap className="w-4 h-4 text-blue-400" />
            <h4 className="text-sm font-semibold text-slate-100">Faculty Academic</h4>
          </div>
          <p className="text-xs text-slate-400 mb-2">
            Attendance eligibility check (≥ configured threshold) & coursework
          </p>
          {request.assigned_faculty_name && (
            <p className="text-[10px] text-slate-400 mb-2 font-mono">
              Advisor: <span className="text-slate-200">{request.assigned_faculty_name}</span>
            </p>
          )}
          <div className="pt-2 border-t border-slate-800 text-[11px] space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Assignment:</span>
              <span
                className={`font-semibold ${
                  request.faculty_assignment_status === 'ASSIGNED'
                    ? 'text-emerald-400'
                    : request.faculty_assignment_status === 'REASSIGNMENT_REQUIRED'
                    ? 'text-rose-400'
                    : 'text-amber-400'
                }`}
              >
                {request.faculty_assignment_status === 'ASSIGNED'
                  ? 'Assigned'
                  : request.faculty_assignment_status === 'REASSIGNMENT_REQUIRED'
                  ? 'Reassignment Required'
                  : 'Awaiting Faculty Assignment'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Status:</span>
              <span
                className={`font-medium ${
                  isFacultyDone
                    ? 'text-emerald-400'
                    : isFacultyRejected
                    ? 'text-rose-400'
                    : request.faculty_assignment_status === 'UNASSIGNED' || request.faculty_assignment_status === 'REASSIGNMENT_REQUIRED'
                    ? 'text-amber-400'
                    : 'text-blue-400'
                }`}
              >
                {isFacultyDone
                  ? 'Approved'
                  : isFacultyRejected
                  ? 'Rejected'
                  : request.faculty_assignment_status === 'UNASSIGNED'
                  ? 'Awaiting Assignment'
                  : request.faculty_assignment_status === 'REASSIGNMENT_REQUIRED'
                  ? 'Awaiting Reassignment'
                  : 'Pending Verification'}
              </span>
            </div>
          </div>
        </div>

        {/* Stage 2: Three Independent Clearances */}
        <div
          className={`relative rounded-xl p-4 transition-all duration-300 border ${
            isClearanceDone
              ? 'bg-emerald-950/20 border-emerald-500/40'
              : isClearanceRejected
              ? 'bg-amber-950/20 border-amber-500/40'
              : isFacultyDone
              ? 'bg-blue-950/20 border-blue-500/40 ring-2 ring-blue-500/20'
              : 'bg-slate-900/40 border-slate-800 opacity-60'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 tracking-wider">STAGE 2</span>
            {isClearanceDone ? (
              <span className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <Check className="w-3.5 h-3.5" />
              </span>
            ) : isClearanceRejected ? (
              <span className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <AlertTriangle className="w-3.5 h-3.5" />
              </span>
            ) : isFacultyDone ? (
              <span className="w-6 h-6 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400 animate-pulse">
                <Clock className="w-3.5 h-3.5" />
              </span>
            ) : (
              <span className="text-[10px] text-slate-500">Locked</span>
            )}
          </div>
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="w-4 h-4 text-purple-400" />
            <h4 className="text-sm font-semibold text-slate-100">3-Way Clearances</h4>
          </div>
          <p className="text-xs text-slate-400 mb-2">
            Parallel independent review: Library, Accounts, & Lab
          </p>
          <div className="space-y-1 pt-2 border-t border-slate-800 text-[11px]">
            <div className="flex justify-between items-center">
              <span className="text-slate-400 flex items-center gap-1">
                <BookOpen className="w-3 h-3 text-blue-400" /> Library:
              </span>
              <span className={isLibDone ? 'text-emerald-400 font-medium' : request.library_status?.toUpperCase() === 'REJECTED' ? 'text-rose-400 font-medium' : 'text-slate-400'}>
                {request.library_status}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 flex items-center gap-1">
                <Wallet className="w-3 h-3 text-emerald-400" /> Accounts:
              </span>
              <span className={isAccDone ? 'text-emerald-400 font-medium' : request.accounts_status?.toUpperCase() === 'REJECTED' ? 'text-rose-400 font-medium' : 'text-slate-400'}>
                {request.accounts_status}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 flex items-center gap-1">
                <FlaskConical className="w-3 h-3 text-amber-400" /> Lab:
              </span>
              <span className={isLabDone ? 'text-emerald-400 font-medium' : request.lab_status?.toUpperCase() === 'REJECTED' ? 'text-rose-400 font-medium' : 'text-slate-400'}>
                {request.lab_status}
              </span>
            </div>
          </div>
        </div>

        {/* Stage 3: HOD Final Review */}
        <div
          className={`relative rounded-xl p-4 transition-all duration-300 border ${
            isHodDone
              ? 'bg-emerald-950/20 border-emerald-500/40'
              : isHodRejected
              ? 'bg-rose-950/20 border-rose-500/40'
              : isClearanceDone && isFacultyDone
              ? 'bg-purple-950/20 border-purple-500/40 ring-2 ring-purple-500/20'
              : 'bg-slate-900/40 border-slate-800 opacity-60'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 tracking-wider">STAGE 3</span>
            {isHodDone ? (
              <span className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <Check className="w-3.5 h-3.5" />
              </span>
            ) : isHodRejected ? (
              <span className="w-6 h-6 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                <AlertTriangle className="w-3.5 h-3.5" />
              </span>
            ) : isClearanceDone && isFacultyDone ? (
              <span className="w-6 h-6 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 animate-pulse">
                <Clock className="w-3.5 h-3.5" />
              </span>
            ) : (
              <span className="text-[10px] text-slate-500">Locked</span>
            )}
          </div>
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="w-4 h-4 text-purple-400" />
            <h4 className="text-sm font-semibold text-slate-100">HOD Final Review</h4>
          </div>
          <p className="text-xs text-slate-400 mb-2">
            Unlocks strictly after all 4 preceding stages are Approved
          </p>
          <div className="pt-2 border-t border-slate-800 text-[11px] flex justify-between items-center">
            <span className="text-slate-400">Status:</span>
            <span
              className={`font-medium ${
                isHodDone
                  ? 'text-emerald-400'
                  : isHodRejected
                  ? 'text-rose-400'
                  : isClearanceDone && isFacultyDone
                  ? 'text-purple-400'
                  : 'text-slate-500'
              }`}
            >
              {isHodDone
                ? 'Approved'
                : isHodRejected
                ? 'Rejected'
                : isClearanceDone && isFacultyDone
                ? 'Awaiting HOD'
                : 'Locked'}
            </span>
          </div>
        </div>

        {/* Stage 4: Final Clearance & Hall Ticket */}
        <div
          className={`relative rounded-xl p-4 transition-all duration-300 border ${
            isCleared
              ? 'bg-emerald-950/30 border-emerald-500/50 ring-2 ring-emerald-500/30 shadow-lg shadow-emerald-950/50'
              : 'bg-slate-900/40 border-slate-800 opacity-60'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 tracking-wider">STAGE 4</span>
            {isCleared ? (
              <span className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-slate-950">
                <ShieldCheck className="w-4 h-4" />
              </span>
            ) : (
              <span className="text-[10px] text-slate-500">Pending</span>
            )}
          </div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <h4 className="text-sm font-semibold text-slate-100">No-Due Cleared</h4>
          </div>
          <p className="text-xs text-slate-400 mb-2">
            Unique backend verification ID & Hall Ticket eligibility
          </p>
          <div className="pt-2 border-t border-slate-800 text-[11px] space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Hall Ticket:</span>
              <span className={`font-semibold ${request.hall_ticket_eligibility === 'ELIGIBLE' ? 'text-emerald-400' : 'text-slate-400'}`}>
                {request.hall_ticket_eligibility}
              </span>
            </div>
            {request.verification_id && (
              <div className="flex justify-between items-center font-mono text-[10px] text-blue-300 bg-blue-950/40 px-1.5 py-0.5 rounded border border-blue-900/50">
                <span>ID:</span>
                <span>{request.verification_id}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
