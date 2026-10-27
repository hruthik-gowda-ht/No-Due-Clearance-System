-- ==============================================================================
-- CAUVERY INSTITUTE OF TECHNOLOGY (Affiliated to VTU)
-- COLLEGE NO-DUE CLEARANCE MANAGEMENT SYSTEM
-- Migration 01: Core Schema, Enums & Institutional Tables
-- ==============================================================================

-- 1. Create Canonical Enums
CREATE TYPE user_role AS ENUM (
    'student',
    'faculty',
    'library_staff',
    'accounts_staff',
    'lab_staff',
    'hod',
    'admin'
);

CREATE TYPE request_status AS ENUM (
    'SUBMITTED',
    'IN_REVIEW',
    'ACTION_REQUIRED',
    'PAYMENT_VERIFICATION_PENDING',
    'RESUBMISSION_REQUIRED',
    'HOD_REVIEW',
    'REJECTED',
    'CLEARED'
);

CREATE TYPE stage_status AS ENUM (
    'PENDING',
    'IN_REVIEW',
    'APPROVED',
    'REJECTED',
    'RESUBMISSION_REQUIRED'
);

CREATE TYPE authority_type AS ENUM (
    'library',
    'accounts',
    'lab'
);

CREATE TYPE payment_status AS ENUM (
    'NOT_REQUIRED',
    'PENDING_PAYMENT',
    'PENDING_REVIEW',
    'CONFIRMED',
    'REJECTED'
);

CREATE TYPE rejection_category_type AS ENUM (
    'attendance_shortage',
    'assignment_pending',
    'other'
);

CREATE TYPE hall_ticket_eligibility_type AS ENUM (
    'NOT_ELIGIBLE',
    'ELIGIBLE'
);

-- 2. Administratively Managed Departments Table (Section 2, 4 & 11)
CREATE TABLE IF NOT EXISTS public.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Seed default VTU engineering departments
INSERT INTO public.departments (code, name, is_active)
VALUES 
    ('CSE', 'Computer Science & Engineering', true),
    ('ISE', 'Information Science & Engineering', true),
    ('ECE', 'Electronics & Communication Engineering', true),
    ('ME', 'Mechanical Engineering', true),
    ('CV', 'Civil Engineering', true),
    ('AIML', 'Artificial Intelligence & Machine Learning', true)
ON CONFLICT (code) DO NOTHING;

-- 3. Administratively Managed Academic Periods Table (Section 2 & 11)
CREATE TABLE IF NOT EXISTS public.academic_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    academic_year TEXT NOT NULL,
    semester INTEGER NOT NULL CHECK (semester >= 1 AND semester <= 8),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_academic_period UNIQUE (academic_year, semester)
);

INSERT INTO public.academic_periods (academic_year, semester, is_active)
VALUES
    ('2026-2027', 1, true),
    ('2026-2027', 2, true),
    ('2026-2027', 3, true),
    ('2026-2027', 4, true),
    ('2026-2027', 5, true),
    ('2026-2027', 6, true),
    ('2026-2027', 7, true),
    ('2026-2027', 8, true)
ON CONFLICT (academic_year, semester) DO NOTHING;

-- 4. Profiles Table (Section 4 & 11)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role user_role NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    student_id TEXT UNIQUE, -- Institutional Student ID e.g. 1CR24CS001
    department_id UUID REFERENCES public.departments(id),
    department TEXT NOT NULL,
    batch TEXT,
    academic_year TEXT DEFAULT '2026-2027',
    semester INTEGER,
    assigned_faculty_id UUID REFERENCES public.profiles(id),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. Student Identities Mapping (Section 5)
CREATE TABLE IF NOT EXISTS private.student_identities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id TEXT NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    failed_attempts INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. System Settings Table (Section 7 & 11)
CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES public.profiles(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

INSERT INTO public.system_settings (key, value, description)
VALUES 
    ('minimum_attendance_percentage', '85'::jsonb, 'Default minimum attendance percentage required for academic eligibility at Cauvery Institute of Technology'),
    ('college_name', '"Cauvery Institute of Technology"'::jsonb, 'Official College Name'),
    ('university', '"VTU"'::jsonb, 'University Affiliation'),
    ('active_academic_year', '"2026-2027"'::jsonb, 'Current Academic Year')
ON CONFLICT (key) DO NOTHING;

-- 7. Student Academic Records Table (Section 7 & 11)
CREATE TABLE IF NOT EXISTS public.student_academic_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    faculty_id UUID NOT NULL REFERENCES public.profiles(id),
    academic_year TEXT NOT NULL DEFAULT '2026-2027',
    semester INTEGER NOT NULL CHECK (semester >= 1 AND semester <= 8),
    attendance_percentage NUMERIC(5,2) NOT NULL CHECK (attendance_percentage >= 0 AND attendance_percentage <= 100),
    is_eligible BOOLEAN NOT NULL DEFAULT false,
    academic_remarks TEXT,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_student_academic_period UNIQUE (student_id, academic_year, semester)
);

-- 8. Payment QR Configurations (Section 9 & 11)
CREATE TABLE IF NOT EXISTS public.payment_qr_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    authority authority_type NOT NULL,
    title TEXT NOT NULL,
    upi_id TEXT NOT NULL,
    account_details TEXT,
    qr_image_url TEXT NOT NULL,
    instructions TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 9. Clearance Requests Table (Central Workflow, Section 6 & 11)
CREATE TABLE IF NOT EXISTS public.no_due_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_code TEXT NOT NULL UNIQUE, -- e.g. ND-2026-000125
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    department TEXT NOT NULL,
    academic_year TEXT NOT NULL DEFAULT '2026-2027',
    semester INTEGER NOT NULL,
    status request_status NOT NULL DEFAULT 'SUBMITTED',
    
    -- Discrete stage approvals
    faculty_status stage_status NOT NULL DEFAULT 'PENDING',
    faculty_remarks TEXT,
    faculty_reviewed_at TIMESTAMPTZ,
    
    library_status stage_status NOT NULL DEFAULT 'PENDING',
    accounts_status stage_status NOT NULL DEFAULT 'PENDING',
    lab_status stage_status NOT NULL DEFAULT 'PENDING',
    
    hod_status stage_status NOT NULL DEFAULT 'PENDING',
    hod_remarks TEXT,
    hod_reviewed_at TIMESTAMPTZ,
    
    -- Final Clearance & Hall Ticket fields
    verification_id TEXT UNIQUE,
    cleared_at TIMESTAMPTZ,
    hall_ticket_eligibility hall_ticket_eligibility_type NOT NULL DEFAULT 'NOT_ELIGIBLE',
    hall_ticket_status TEXT NOT NULL DEFAULT 'NOT YET RELEASED',
    
    student_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Prevent duplicate active requests for same student, academic year, and semester
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_clearance_request 
ON public.no_due_requests (student_id, academic_year, semester) 
WHERE status != 'REJECTED';

-- 10. Clearance Items (Independent records for Library, Accounts, Laboratory)
CREATE TABLE IF NOT EXISTS public.clearance_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES public.no_due_requests(id) ON DELETE CASCADE,
    authority authority_type NOT NULL,
    status stage_status NOT NULL DEFAULT 'PENDING',
    remarks TEXT,
    reviewed_by UUID REFERENCES public.profiles(id),
    reviewed_at TIMESTAMPTZ,
    
    -- Payment requirements (Section 9)
    payment_required BOOLEAN NOT NULL DEFAULT false,
    payment_amount NUMERIC(10,2) CHECK (payment_amount IS NULL OR payment_amount > 0),
    payment_qr_id UUID REFERENCES public.payment_qr_configs(id),
    payment_instructions TEXT,
    payment_status payment_status NOT NULL DEFAULT 'NOT_REQUIRED',
    responsible_payment_authority TEXT NOT NULL DEFAULT 'authority', -- 'faculty' or 'authority'
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_request_clearance_authority UNIQUE (request_id, authority)
);

-- 11. Payment Submissions (Student uploads & Reviewer confirmations)
CREATE TABLE IF NOT EXISTS public.payment_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clearance_item_id UUID NOT NULL REFERENCES public.clearance_items(id) ON DELETE CASCADE,
    request_id UUID NOT NULL REFERENCES public.no_due_requests(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    authority authority_type NOT NULL,
    amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
    screenshot_url TEXT NOT NULL,
    transaction_reference TEXT,
    student_notes TEXT,
    
    verification_status payment_status NOT NULL DEFAULT 'PENDING_REVIEW',
    reviewer_remarks TEXT,
    verified_by UUID REFERENCES public.profiles(id),
    verified_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 12. Rejection History (Preserves complete historical record of rejections, Section 8 & 10)
CREATE TABLE IF NOT EXISTS public.rejection_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES public.no_due_requests(id) ON DELETE CASCADE,
    clearance_item_id UUID REFERENCES public.clearance_items(id) ON DELETE SET NULL,
    authority_or_stage TEXT NOT NULL, -- 'faculty', 'library', 'accounts', 'lab', 'hod'
    rejection_category rejection_category_type NOT NULL,
    explanation TEXT NOT NULL,
    payment_required BOOLEAN NOT NULL DEFAULT false,
    payment_amount NUMERIC(10,2),
    rejected_by UUID NOT NULL REFERENCES public.profiles(id),
    previous_status TEXT NOT NULL,
    resulting_status TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 13. Resubmission History (Tracks each student resubmission on the same request ID)
CREATE TABLE IF NOT EXISTS public.resubmission_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES public.no_due_requests(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    resubmitted_stage TEXT NOT NULL,
    student_comments TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 14. Verification Records Table (Section 10 & 11 - Authoritative minimal public records)
CREATE TABLE IF NOT EXISTS public.verification_records (
    verification_id TEXT PRIMARY KEY,
    request_id UUID NOT NULL REFERENCES public.no_due_requests(id) ON DELETE CASCADE,
    request_code TEXT NOT NULL,
    student_id_masked TEXT NOT NULL,
    student_name TEXT NOT NULL,
    department TEXT NOT NULL,
    academic_year TEXT NOT NULL,
    semester INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'NO-DUE CLEARED',
    cleared_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    hall_ticket_eligibility TEXT NOT NULL DEFAULT 'ELIGIBLE',
    hall_ticket_status TEXT NOT NULL DEFAULT 'NOT YET RELEASED',
    college_name TEXT NOT NULL DEFAULT 'Cauvery Institute of Technology',
    university TEXT NOT NULL DEFAULT 'VTU',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 15. System Audit Logs (Section 13)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    user_role TEXT NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    previous_state JSONB,
    new_state JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 16. Persistent In-App Notifications (Section 14)
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info',
    link TEXT,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
