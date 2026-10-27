-- ==============================================================================
-- COLLEGE NO-DUE CLEARANCE MANAGEMENT SYSTEM
-- Migration 05: Faculty Availability Validation & Assignment Governance (Sections 25 & 26)
-- ==============================================================================

-- 1. Create faculty assignment status enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'faculty_assignment_status_type') THEN
        CREATE TYPE faculty_assignment_status_type AS ENUM ('UNASSIGNED', 'ASSIGNED', 'REASSIGNMENT_REQUIRED');
    END IF;
END $$;

-- 2. Add assignment tracking columns to no_due_requests
ALTER TABLE public.no_due_requests 
ADD COLUMN IF NOT EXISTS assigned_faculty_id UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS faculty_assignment_status faculty_assignment_status_type NOT NULL DEFAULT 'UNASSIGNED';

-- 3. Create index for fast lookup of assigned faculty requests
CREATE INDEX IF NOT EXISTS idx_no_due_requests_faculty_assignment 
ON public.no_due_requests(assigned_faculty_id, faculty_assignment_status);

-- 4. Transactional enforcement of faculty availability before request insertion (Section 26.A & 26.B)
CREATE OR REPLACE FUNCTION public.check_faculty_availability_before_request()
RETURNS TRIGGER AS $$
DECLARE
    v_faculty_id UUID;
    v_student_dept_id UUID;
    v_student_dept_name TEXT;
    v_assigned_faculty_exists BOOLEAN;
BEGIN
    -- Query student's active department and pre-assigned faculty
    SELECT department_id, department, assigned_faculty_id 
    INTO v_student_dept_id, v_student_dept_name, v_faculty_id
    FROM public.profiles 
    WHERE id = NEW.student_id;

    -- Check if student's assigned faculty is genuine, active, and authorized
    IF v_faculty_id IS NOT NULL THEN
        SELECT EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = v_faculty_id 
              AND role = 'faculty' 
              AND is_active = true 
              AND (department_id = v_student_dept_id OR department = v_student_dept_name OR department = NEW.department)
        ) INTO v_assigned_faculty_exists;
    ELSE
        v_assigned_faculty_exists := false;
    END IF;

    -- If no valid assigned faculty, check if any active faculty exists for the department
    IF NOT v_assigned_faculty_exists THEN
        SELECT id INTO v_faculty_id
        FROM public.profiles
        WHERE role = 'faculty'
          AND is_active = true 
          AND (department_id = v_student_dept_id OR department = v_student_dept_name OR department = NEW.department)
        LIMIT 1;

        -- Section 26.B: Block submission with exact mandatory message if no active faculty exists
        IF v_faculty_id IS NULL THEN
            RAISE EXCEPTION 'Your No-Due request cannot be submitted because no faculty member is currently assigned to verify your academic details. Please contact the administrator or try again after a faculty member has been assigned.';
        END IF;

        -- Explicitly link the resolved faculty to the student profile
        UPDATE public.profiles SET assigned_faculty_id = v_faculty_id WHERE id = NEW.student_id;
    END IF;

    NEW.assigned_faculty_id := v_faculty_id;
    NEW.faculty_assignment_status := 'ASSIGNED';

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_verify_faculty_before_request ON public.no_due_requests;
CREATE TRIGGER trg_verify_faculty_before_request
BEFORE INSERT ON public.no_due_requests
FOR EACH ROW
EXECUTE FUNCTION public.check_faculty_availability_before_request();
