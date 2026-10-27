// ==============================================================================
// COLLEGE NO-DUE CLEARANCE MANAGEMENT SYSTEM
// RejectionModal Component (Section 10 & 11)
// Structured rejection with mandatory categories & optional payment requirement
// ==============================================================================

import React, { useState } from 'react';
import { RejectionCategoryType, PaymentQrConfig } from '../types/database';
import { AlertTriangle, X, DollarSign, QrCode, FileText } from 'lucide-react';

interface RejectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  stageName: string;
  isClearanceAuthority?: boolean;
  availableQrs?: PaymentQrConfig[];
  onSubmit: (data: {
    category: RejectionCategoryType;
    explanation: string;
    paymentRequired: boolean;
    paymentAmount?: number;
    paymentQrId?: string;
    paymentInstructions?: string;
  }) => Promise<void>;
}

export const RejectionModal: React.FC<RejectionModalProps> = ({
  isOpen,
  onClose,
  title,
  stageName,
  isClearanceAuthority = false,
  availableQrs = [],
  onSubmit,
}) => {
  const [category, setCategory] = useState<RejectionCategoryType>('other');
  const [explanation, setExplanation] = useState('');
  const [paymentRequired, setPaymentRequired] = useState(false);
  const [amount, setAmount] = useState<string>('');
  const [selectedQrId, setSelectedQrId] = useState<string>(availableQrs[0]?.id || '');
  const [instructions, setInstructions] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Section 10 Rule: When Other is selected, explanation is mandatory
    if (category === 'other' && (!explanation || !explanation.trim())) {
      setError('An explanation is mandatory when category "Other" is selected.');
      return;
    }

    let parsedAmount: number | undefined;
    if (paymentRequired) {
      parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        setError('Please enter a valid positive payment amount.');
        return;
      }
      if (!selectedQrId) {
        setError('Please select a configured Payment QR.');
        return;
      }
    }

    try {
      setIsSubmitting(true);
      await onSubmit({
        category,
        explanation: explanation.trim(),
        paymentRequired,
        paymentAmount: parsedAmount,
        paymentQrId: paymentRequired ? selectedQrId : undefined,
        paymentInstructions: paymentRequired ? instructions.trim() : undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit rejection decision.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-xl glass-panel rounded-2xl border border-rose-500/30 p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between pb-4 border-b border-slate-700/60 mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100">{title}</h3>
              <p className="text-xs text-slate-400">Authority / Stage: {stageName}</p>
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

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Category Dropdown */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Rejection Category <span className="text-rose-400">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as RejectionCategoryType)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="attendance_shortage">Attendance Shortage</option>
              <option value="assignment_pending">Assignment Pending</option>
              <option value="fee_due">Tuition / Semester Fee Due</option>
              <option value="book_due">Library Overdue Books / Late Fine</option>
              <option value="equipment_damage">Lab Equipment Damage / Breakage</option>
              <option value="other">Other (Specific Details Mandatory)</option>
            </select>
          </div>

          {/* Explanation Textarea */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Detailed Explanation / Remarks {category === 'other' && <span className="text-rose-400">*</span>}
            </label>
            <textarea
              rows={3}
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="State the clear reason for rejection and required corrective action for the student..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder:text-slate-500"
            />
          </div>

          {/* Payment Required Section for Clearance Authorities */}
          {isClearanceAuthority && (
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-700/80 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-amber-400" />
                  <span className="text-sm font-semibold text-slate-200">
                    Require Fine / Dues Settle Payment?
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={paymentRequired}
                    onChange={(e) => setPaymentRequired(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              </div>

              {paymentRequired && (
                <div className="space-y-3 pt-3 border-t border-slate-800 animate-in fade-in">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Amount Due (₹) <span className="text-amber-400">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold">₹</span>
                      <input
                        type="number"
                        step="0.01"
                        min="1"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="e.g. 350.00"
                        className="w-full pl-8 pr-3.5 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  {availableQrs.length > 0 && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Select Payment QR Configuration <span className="text-amber-400">*</span>
                      </label>
                      <select
                        value={selectedQrId}
                        onChange={(e) => setSelectedQrId(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-amber-500"
                      >
                        {availableQrs.map((qr) => (
                          <option key={qr.id} value={qr.id}>
                            {qr.title} ({qr.upi_id})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Payment Instructions
                    </label>
                    <input
                      type="text"
                      value={instructions}
                      onChange={(e) => setInstructions(e.target.value)}
                      placeholder="e.g. Scan QR, complete payment and upload screenshot with UTR reference."
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-900/40 transition flex items-center gap-2 disabled:opacity-50"
            >
              <AlertTriangle className="w-4 h-4" />
              {isSubmitting ? 'Recording Rejection...' : 'Confirm Rejection'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
