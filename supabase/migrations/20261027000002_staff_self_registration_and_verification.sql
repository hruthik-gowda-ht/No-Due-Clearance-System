-- ==============================================================================
-- CAUVERY INSTITUTE OF TECHNOLOGY (Affiliated to VTU)
-- Migration 07: Staff Self-Registration, Responsibility Configuration & Verification Governance
-- Sections 28 & 29: Genuine Accounts Only, Immediate Login with Gated Operational Access
-- ==============================================================================

-- 1. Extend profiles table with staff self-registration and verification metadata
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS staff_id text UNIQUE,
ADD COLUMN IF NOT EXISTS requested_role text,
ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'PENDING' CHECK (verification_status IN ('PENDING', 'VERIFIED', 'REJECTED')),
ADD COLUMN IF NOT EXISTS verified_at timestamptz,
ADD COLUMN IF NOT EXISTS verified_by uuid REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS rejection_reason text,
ADD COLUMN IF NOT EXISTS subjects text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS responsibilities text[] DEFAULT '{}';

-- 2. Pre-existing Admins and Students are marked verified by default
UPDATE public.profiles
SET is_verified = true, verification_status = 'VERIFIED'
WHERE role IN ('admin', 'student') AND (is_verified IS NULL OR is_verified = false);

-- 3. Dedicated Staff Role Requests & Institutional Verification Table
CREATE TABLE IF NOT EXISTS public.staff_role_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    requested_role text NOT NULL CHECK (requested_role IN ('faculty', 'library_staff', 'accounts_staff', 'lab_staff', 'hod')),
    department_id uuid REFERENCES public.departments(id),
    designation text NOT NULL,
    subjects text[] DEFAULT '{}',
    semester integer,
    requested_responsibilities text[] DEFAULT '{}',
    status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'VERIFIED', 'REJECTED')),
    reviewed_by uuid REFERENCES public.profiles(id),
    reviewed_at timestamptz,
    rejection_reason text,
    created_at timestamptz DEFAULT now()
);

-- Index for efficient querying by administrators
CREATE INDEX IF NOT EXISTS idx_staff_role_requests_status ON public.staff_role_requests(status);
CREATE INDEX IF NOT EXISTS idx_staff_role_requests_staff ON public.staff_role_requests(staff_id);

-- 4. Row Level Security on staff_role_requests
ALTER TABLE public.staff_role_requests ENABLE ROW LEVEL SECURITY;

-- Staff members can view their own role requests
CREATE POLICY "Staff can view their own role requests"
ON public.staff_role_requests FOR SELECT
TO authenticated
USING (staff_id = auth.uid());

-- Administrators can view all role requests
CREATE POLICY "Admins can view all staff role requests"
ON public.staff_role_requests FOR SELECT
TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Administrators can update/approve staff role requests
CREATE POLICY "Admins can update staff role requests"
ON public.staff_role_requests FOR UPDATE
TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- 5. Trigger: Prohibit Public Registration for Admin Role & Enforce Initial Verification Gating
CREATE OR REPLACE FUNCTION public.check_staff_registration_security()
RETURNS trigger AS $$
BEGIN
    -- Public self-registration must never grant 'admin' role
    IF NEW.role = 'admin' AND (TG_OP = 'INSERT') THEN
        -- Only existing admins can insert admin profiles
        IF auth.uid() IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
            RAISE EXCEPTION 'Public self-registration for the Administrator role is strictly prohibited.';
        END IF;
    END IF;

    -- Self-registered staff must begin with is_verified = false and verification_status = 'PENDING'
    IF NEW.role != 'student' AND NEW.role != 'admin' AND (TG_OP = 'INSERT') THEN
        IF auth.uid() IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
            NEW.is_verified := false;
            NEW.verification_status := 'PENDING';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_check_staff_registration_security ON public.profiles;
CREATE TRIGGER trg_check_staff_registration_security
BEFORE INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.check_staff_registration_security();

-- 6. Trigger: Ensure only verified faculty can be selected for student No-Due requests
CREATE OR REPLACE FUNCTION public.check_assigned_faculty_verified()
RETURNS trigger AS $$
BEGIN
    IF NEW.assigned_faculty_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = NEW.assigned_faculty_id
              AND role = 'faculty'
              AND is_active = true
              AND is_verified = true
        ) THEN
            RAISE EXCEPTION 'Cannot assign unverified, inactive, or non-faculty staff to a No-Due clearance request.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_check_assigned_faculty_verified ON public.no_due_requests;
CREATE TRIGGER trg_check_assigned_faculty_verified
BEFORE INSERT OR UPDATE OF assigned_faculty_id ON public.no_due_requests
FOR EACH ROW
EXECUTE FUNCTION public.check_assigned_faculty_verified();
