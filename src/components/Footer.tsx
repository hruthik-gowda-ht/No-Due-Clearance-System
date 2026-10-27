// ==============================================================================
// COLLEGE NO-DUE CLEARANCE MANAGEMENT SYSTEM
// Footer Component
// ==============================================================================

import React from 'react';
import { ShieldCheck, GraduationCap, School } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-auto border-t border-slate-800/80 bg-[#070a12]/80 backdrop-blur-md py-6 text-xs text-slate-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2">
          <span className="text-slate-300 font-semibold">
            Cauvery Institute of Technology
          </span>
          <span className="hidden sm:inline">•</span>
          <span className="text-slate-400">Affiliated to VTU</span>
          <span className="hidden sm:inline">•</span>
          <span>College No-Due Clearance Management System (2026–2027)</span>
        </div>

        <div className="flex items-center gap-4 text-[11px]">
          <span className="flex items-center gap-1 text-emerald-400/80">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            PostgreSQL & RLS Enforced Security
          </span>
          <span>•</span>
          <span>All rights reserved &copy; {new Date().getFullYear()}</span>
        </div>
      </div>
    </footer>
  );
};
