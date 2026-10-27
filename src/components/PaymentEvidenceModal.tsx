// ==============================================================================
// COLLEGE NO-DUE CLEARANCE MANAGEMENT SYSTEM
// PaymentEvidenceModal Component (Section 4.2 & 13, Step 5)
// Faculty review and confirmation/rejection of payment screenshot evidence
// ==============================================================================

import React, { useState } from 'react';
import { PaymentSubmission } from '../types/database';
import { CheckCircle2, XCircle, X, ZoomIn, AlertTriangle, ShieldCheck, User } from 'lucide-react';

interface PaymentEvidenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  submission: PaymentSubmission;
  facultyId: string;
  onSuccess: () => void;
  onSubmit: (params: {
    submissionId: string;
    facultyId: string;
    confirm: boolean;
    remarks?: string;
  }) => Promise<any>;
}

export const PaymentEvidenceModal: React.FC<PaymentEvidenceModalProps> = ({
  isOpen,
  onClose,
  submission,
  facultyId,
  onSuccess,
  onSubmit,
}) => {
  const [remarks, setRemarks] = useState('');
  const [isZoomed, setIsZoomed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAction = async (confirm: boolean) => {
    if (!confirm && (!remarks || !remarks.trim())) {
      setError('Please provide a reason when rejecting payment evidence.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSubmit({
        submissionId: submission.id,
        facultyId,
        confirm,
        remarks: remarks.trim(),
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Action failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-3xl glass-panel rounded-2xl border border-slate-700 p-6 shadow-2xl overflow-y-auto max-h-[92vh]">
        <div className="flex items-center justify-between pb-4 border-b border-slate-700/60 mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100">
                Faculty Payment Verification Review
              </h3>
              <p className="text-xs text-slate-400">
                Verifying student evidence for {submission.authority.toUpperCase()} clearance
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/40 border border-rose-500/50 text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Left: Screenshot preview */}
          <div className="flex flex-col items-center">
            <div className="w-full flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Uploaded Payment Evidence
              </span>
              <button
                type="button"
                onClick={() => setIsZoomed(!isZoomed)}
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                <ZoomIn className="w-3.5 h-3.5" /> {isZoomed ? 'Normal' : 'Zoom'}
              </button>
            </div>
            <div
              className={`w-full overflow-hidden rounded-xl border border-slate-700 bg-slate-950 flex items-center justify-center p-2 cursor-pointer transition-all ${
                isZoomed ? 'max-h-[500px]' : 'max-h-[320px]'
              }`}
              onClick={() => setIsZoomed(!isZoomed)}
            >
              <img
                src={submission.screenshot_url}
                alt="Payment Evidence"
                className="max-h-full max-w-full object-contain rounded-lg"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              Uploaded at: {new Date(submission.created_at).toLocaleString()}
            </p>
          </div>

          {/* Right: Submission details & decision */}
          <div className="flex flex-col justify-between space-y-4">
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-700/80 space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                <User className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-semibold text-slate-200">
                  {submission.student_name}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400">Authority:</span>
                  <p className="font-semibold text-slate-200 uppercase">{submission.authority}</p>
                </div>
                <div>
                  <span className="text-slate-400">Claimed Amount:</span>
                  <p className="font-bold text-emerald-400 text-sm">₹ {submission.amount.toFixed(2)}</p>
                </div>
                <div>
                  <span className="text-slate-400">Transaction UTR:</span>
                  <p className="font-mono text-slate-200">
                    {submission.transaction_reference || 'Not provided'}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400">Current Status:</span>
                  <p className="font-semibold text-amber-400">Pending Review</p>
                </div>
              </div>

              {submission.student_notes && (
                <div className="pt-2 border-t border-slate-800 text-xs">
                  <span className="text-slate-400">Student Notes:</span>
                  <p className="text-slate-300 italic mt-0.5">"{submission.student_notes}"</p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Faculty Remarks / Feedback
              </label>
              <textarea
                rows={3}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Remarks (e.g. Verified with UTR on bank statement, or Reason for rejection)..."
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-purple-500 placeholder:text-slate-500"
              />
            </div>

            <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-900/40 text-[11px] text-purple-300 leading-relaxed">
              <strong>Workflow Note (Rule 4.2):</strong> Confirming this payment will return the {submission.authority} clearance back to <em>Pending</em> for the clearance staff to perform final review. It does NOT bypass normal clearance authority approval.
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleAction(false)}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600/80 hover:bg-rose-500 text-white transition flex items-center gap-1.5 disabled:opacity-50"
              >
                <XCircle className="w-4 h-4" />
                Reject Evidence
              </button>
              <button
                type="button"
                onClick={() => handleAction(true)}
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/40 transition flex items-center gap-1.5 disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                Confirm Payment Evidence
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
