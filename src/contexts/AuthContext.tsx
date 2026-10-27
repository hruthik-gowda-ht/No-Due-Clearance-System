// ==============================================================================
// COLLEGE NO-DUE CLEARANCE MANAGEMENT SYSTEM
// Authentication Context & Session Management
// ==============================================================================

import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole, StaffRegistrationParams } from '../types/database';
import { api } from '../services/api';
import { Engine } from '../services/store';

interface AuthContextType {
  user: UserProfile | null;
  role: UserRole | null;
  isLoading: boolean;
  error: string | null;
  loginStudent: (registrationNumber: string, pass: string) => Promise<void>;
  registerStudent: (params: {
    fullName: string;
    studentId: string;
    departmentId: string;
    academicYear?: string;
    semester?: number;
    email?: string;
    password: string;
  }) => Promise<UserProfile>;
  registerStaff: (params: StaffRegistrationParams) => Promise<UserProfile>;
  loginStaff: (email: string, pass: string) => Promise<void>;
  changePassword: (currentPass: string, newPass: string) => Promise<UserProfile>;
  logout: () => void;
  clearError: () => void;
  refreshUser: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const CURRENT_USER_SESSION_KEY = 'cit_auth_active_user_id';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check saved session
    const savedUserId = localStorage.getItem(CURRENT_USER_SESSION_KEY);
    if (savedUserId) {
      const profile = Engine.getProfileById(savedUserId);
      if (profile && profile.is_active) {
        setUser(profile);
      } else {
        localStorage.removeItem(CURRENT_USER_SESSION_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  const registerStudent = async (params: {
    fullName: string;
    studentId: string;
    departmentId: string;
    academicYear?: string;
    semester?: number;
    email?: string;
    password: string;
  }): Promise<UserProfile> => {
    setIsLoading(true);
    setError(null);
    try {
      const profile = await api.registerStudent(params);
      setUser(profile);
      localStorage.setItem(CURRENT_USER_SESSION_KEY, profile.id);
      return profile;
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const registerStaff = async (params: StaffRegistrationParams): Promise<UserProfile> => {
    setIsLoading(true);
    setError(null);
    try {
      const profile = await api.registerStaff(params);
      setUser(profile);
      localStorage.setItem(CURRENT_USER_SESSION_KEY, profile.id);
      return profile;
    } catch (err: any) {
      setError(err.message || 'Staff registration failed.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const loginStudent = async (studentId: string, pass: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const profile = await api.loginWithStudentId(studentId, pass);
      setUser(profile);
      localStorage.setItem(CURRENT_USER_SESSION_KEY, profile.id);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const loginStaff = async (email: string, pass: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const profile = await api.loginWithStaffEmail(email, pass);
      setUser(profile);
      localStorage.setItem(CURRENT_USER_SESSION_KEY, profile.id);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your staff credentials.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const changePassword = async (currentPass: string, newPass: string): Promise<UserProfile> => {
    if (!user) throw new Error('You must be logged in to change your password.');
    setIsLoading(true);
    setError(null);
    try {
      const updated = await api.changePassword(user.id, currentPass, newPass);
      setUser(updated);
      return updated;
    } catch (err: any) {
      setError(err.message || 'Password update failed.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = () => {
    if (user) {
      const updated = Engine.getProfileById(user.id);
      if (updated) {
        setUser(updated);
      }
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(CURRENT_USER_SESSION_KEY);
    setError(null);
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user ? user.role : null,
        isLoading,
        error,
        registerStudent,
        registerStaff,
        loginStudent,
        loginStaff,
        changePassword,
        logout,
        clearError,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
