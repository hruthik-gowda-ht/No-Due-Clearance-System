// ==============================================================================
// COLLEGE NO-DUE CLEARANCE MANAGEMENT SYSTEM
// Main Application Router & Shell — Secure Role-Based Access Guards (Section 23)
// ==============================================================================

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { UserRole } from './types/database';

import { Login } from './pages/Login';
import { StudentDashboard } from './pages/StudentDashboard';
import { NewRequest } from './pages/NewRequest';
import { FacultyDashboard } from './pages/FacultyDashboard';
import { ClearanceDashboard } from './pages/ClearanceDashboard';
import { HodDashboard } from './pages/HodDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { PublicVerify } from './pages/PublicVerify';
import { StaffOnboarding } from './pages/StaffOnboarding';
import { PasswordChangeModal } from './components/PasswordChangeModal';

// Role-based home redirector
const HomeRedirect: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If staff member is unverified, route to onboarding/status screen (Section 28.F)
  if (user.role !== 'student' && user.role !== 'admin') {
    if (user.is_verified === false || user.verification_status === 'PENDING' || user.verification_status === 'REJECTED') {
      return <Navigate to="/staff/onboarding" replace />;
    }
  }

  switch (user.role) {
    case 'student':
      return <Navigate to="/student" replace />;
    case 'faculty':
      return <Navigate to="/faculty" replace />;
    case 'library_staff':
      return <Navigate to="/clearance/library" replace />;
    case 'accounts_staff':
      return <Navigate to="/clearance/accounts" replace />;
    case 'lab_staff':
      return <Navigate to="/clearance/lab" replace />;
    case 'hod':
      return <Navigate to="/hod" replace />;
    case 'admin':
      return <Navigate to="/admin" replace />;
    default:
      return <Navigate to="/login" replace />;
  }
};

// Protected Route Guard: Enforces authentic session and strict role authorization (Section 23.C & 28.F)
interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
  allowUnverifiedStaff?: boolean;
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles, allowUnverifiedStaff, children }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Unauthenticated visitors are blocked and redirected to login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Block unverified staff from operational dashboards (Section 28.F)
  if (
    !allowUnverifiedStaff &&
    user.role !== 'student' &&
    user.role !== 'admin' &&
    (user.is_verified === false || user.verification_status === 'PENDING' || user.verification_status === 'REJECTED')
  ) {
    return <Navigate to="/staff/onboarding" replace />;
  }

  // Block unauthorized cross-role access (e.g. student accessing /admin or /faculty)
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="min-h-screen flex flex-col bg-[#090d16] text-slate-100 font-sans selection:bg-blue-600 selection:text-white">
          <Navbar />
          <PasswordChangeModal />
          <main className="flex-1 pb-16">
            <Routes>
              {/* Home redirect based on authentication state and user role */}
              <Route path="/" element={<HomeRedirect />} />

              {/* Public Authentication Pages */}
              <Route path="/login" element={<Login defaultMode="signin" />} />
              <Route path="/register" element={<Login defaultMode="signup" />} />

              {/* Protected Student Routes */}
              <Route
                path="/student"
                element={
                  <ProtectedRoute allowedRoles={['student']}>
                    <StudentDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/new-request"
                element={
                  <ProtectedRoute allowedRoles={['student']}>
                    <NewRequest />
                  </ProtectedRoute>
                }
              />

              {/* Protected Faculty Advisor Route */}
              <Route
                path="/faculty"
                element={
                  <ProtectedRoute allowedRoles={['faculty']}>
                    <FacultyDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Protected Clearance Authorities Routes */}
              <Route
                path="/clearance/library"
                element={
                  <ProtectedRoute allowedRoles={['library_staff']}>
                    <ClearanceDashboard authority="library" />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/clearance/accounts"
                element={
                  <ProtectedRoute allowedRoles={['accounts_staff']}>
                    <ClearanceDashboard authority="accounts" />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/clearance/lab"
                element={
                  <ProtectedRoute allowedRoles={['lab_staff']}>
                    <ClearanceDashboard authority="lab" />
                  </ProtectedRoute>
                }
              />

              {/* Protected HOD Final Review Route */}
              <Route
                path="/hod"
                element={
                  <ProtectedRoute allowedRoles={['hod']}>
                    <HodDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Protected Admin Console Route */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Protected Staff Onboarding & Verification Route (Section 28.F) */}
              <Route
                path="/staff/onboarding"
                element={
                  <ProtectedRoute
                    allowedRoles={['faculty', 'library_staff', 'accounts_staff', 'lab_staff', 'hod', 'admin']}
                    allowUnverifiedStaff={true}
                  >
                    <StaffOnboarding />
                  </ProtectedRoute>
                }
              />

              {/* Public Verification Route — Accessible to everyone without login (Section 23.C) */}
              <Route path="/verify" element={<PublicVerify />} />
              <Route path="/verify/:id" element={<PublicVerify />} />

              {/* Fallback Catch-all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
