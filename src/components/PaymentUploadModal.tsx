// ==============================================================================
// COLLEGE NO-DUE CLEARANCE MANAGEMENT SYSTEM
// PaymentUploadModal Component (Section 13, Step 4)
// Student payment QR display & screenshot evidence upload
// ==============================================================================

import React, { useState } from 'react';
import { ClearanceItem } from '../types/database';
import { Upload, X, QrCode, Copy, Check, AlertCircle, FileCheck, ShieldAlert } from 'lucide-react';

interface PaymentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: ClearanceItem;
  studentId: string;
  onSuccess: () => void;
  onSubmit: (params: {
    clearanceItemId: string;
    studentId: string;
    amount: number;
    screenshotUrl: string;
    transactionReference?: string;
    notes?: string;
  }) => Promise<any>;
}

export const PaymentUploadModal: React.FC<PaymentUploadModalProps> = ({
  isOpen,
  onClose,
  item,
  studentId,
  onSuccess,
  onSubmit,
}) => {
  const [screenshotDataUrl, setScreenshotDataUrl] = useState<string>('');
  const [transactionRef, setTransactionRef] = useState('');
  const [notes, setNotes] = useState('');
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const qr = item.payment_qr;
  const amount = item.payment_amount || 0;

  const handleCopyUpi = () => {
    if (qr?.upi_id) {
      navigator.clipboard.writeText(qr.upi_id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Rule Section 13 Step 4: Validate file type and 5MB max size
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('Invalid file format. Please upload a JPEG, PNG, or WebP screenshot.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('File size exceeds 5MB limit. Please compress or choose a smaller image.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setScreenshotDataUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!screenshotDataUrl) {
      setError('Please select or drop a payment screenshot image.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSubmit({
        clearanceItemId: item.id,
        studentId,
        amount,
        screenshotUrl: screenshotDataUrl,
        transactionReference: transactionRef.trim(),
        notes: notes.trim(),
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to upload payment evidence.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-2xl glass-panel rounded-2xl border border-blue-500/30 p-6 shadow-2xl overflow-y-auto max-h-[92vh]">
        <div className="flex items-center justify-between pb-4 border-b border-slate-700/60 mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100">
                Settle {item.authority.toUpperCase()} Dues & Fine
              </h3>
              <p className="text-xs text-slate-400">Step 3 & 4: External Payment & Screenshot Verification</p>
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
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Left: QR Code & Payment Details */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-700 flex flex-col items-center text-center">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Official Payment QR
            </span>
            <div className="p-2 bg-white rounded-xl shadow-lg mb-3">
              <img
                src={qr?.qr_image_url || `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=${qr?.upi_id || 'dues@college'}&pn=CollegeDues`}
                alt="Payment QR"
                className="w-44 h-44 object-contain"
              />
            </div>
            <div className="text-xl font-bold text-emerald-400 mb-1">
              ₹ {amount.toFixed(2)}
            </div>
            <p className="text-xs font-semibold text-slate-300 mb-2">{qr?.title || `${item.authority} Counter`}</p>

            {qr?.upi_id && (
              <div className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 mb-2">
                <span className="truncate">{qr.upi_id}</span>
                <button
                  type="button"
                  onClick={handleCopyUpi}
                  className="ml-2 text-blue-400 hover:text-blue-300 flex items-center gap-1 font-sans text-[11px]"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            )}

            {qr?.instructions && (
              <p className="text-[11px] text-slate-400 italic mt-1 leading-relaxed">
                "{qr.instructions}"
              </p>
            )}
          </div>

          {/* Right: Upload Form */}
          <form onSubmit={handleSubmit} className="flex flex-col justify-between space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Upload Payment Screenshot <span className="text-blue-400">*</span>
              </label>
              <div className="relative border-2 border-dashed border-slate-700 hover:border-blue-500/50 rounded-xl p-4 text-center cursor-pointer transition bg-slate-900/40">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                {screenshotDataUrl ? (
                  <div className="space-y-2">
                    <img
                      src={screenshotDataUrl}
                      alt="Preview"
                      className="max-h-28 mx-auto rounded-lg border border-slate-700 object-contain"
                    />
                    <div className="text-[11px] text-emerald-400 font-medium flex items-center justify-center gap-1">
                      <FileCheck className="w-3.5 h-3.5" /> Screenshot Attached (Click to replace)
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1 py-3">
                    <Upload className="w-7 h-7 mx-auto text-blue-400" />
                    <p className="text-xs font-medium text-slate-200">
                      Click to choose or drag screenshot
                    </p>
                    <p className="text-[10px] text-slate-500">
                      JPEG, PNG, WebP up to 5MB
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                UPI / Bank Reference (UTR) Number
              </label>
              <input
                type="text"
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
                placeholder="e.g. 429381048291"
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Student Remarks / Notes
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Paid via PhonePe, student ID entered in note."
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="p-2.5 rounded-lg bg-blue-950/30 border border-blue-900/40 text-[11px] text-blue-300 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
              <span>
                Your uploaded evidence will be forwarded directly to your assigned faculty advisor for verification. Upon faculty confirmation, clearance will return to Pending for final approval.
              </span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
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
                disabled={isSubmitting || !screenshotDataUrl}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/40 transition flex items-center gap-2 disabled:opacity-50"
              >
                <Upload className="w-3.5 h-3.5" />
                {isSubmitting ? 'Uploading Evidence...' : 'Submit Evidence'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
