-- ==============================================================================
-- COLLEGE NO-DUE CLEARANCE MANAGEMENT SYSTEM
-- Migration 06: Student-to-Faculty Workflow & Pre-Review Teacher Reassignment Governance
-- ==============================================================================

-- 1. Add designation column to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS designation VARCHAR(100);

-- 2. Add review commencement tracking to no_due_requests
ALTER TABLE public.no_due_requests
ADD COLUMN IF NOT EXISTS faculty_review_started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS faculty_review_started_by UUID REFERENCES public.profiles(id);

-- 3. Create immutable teacher reassignment audit table
CREATE TABLE IF NOT EXISTS public.teacher_reassignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES public.no_due_requests(id) ON DELETE CASCADE,
    previous_faculty_id UUID REFERENCES public.profiles(id),
    previous_faculty_name TEXT NOT NULL,
    new_faculty_id UUID NOT NULL REFERENCES public.profiles(id),
    new_faculty_name TEXT NOT NULL,
    initiated_by_user_id UUID NOT NULL REFERENCES public.profiles(id),
    initiated_by_role VARCHAR(20) NOT NULL,
    reason TEXT,
    result VARCHAR(20) NOT NULL DEFAULT 'SUCCESS',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookup by request ID
CREATE INDEX IF NOT EXISTS idx_teacher_reassignments_request 
ON public.teacher_reassignments(request_id, created_at DESC);

-- 4. Transactional enforcement: Restrict student teacher changes once review has begun
CREATE OR REPLACE FUNCTION public.check_teacher_reassignment_eligibility()
RETURNS TRIGGER AS $$
DECLARE
    v_initiator_role TEXT;
    v_new_faculty_active BOOLEAN;
    v_new_faculty_dept TEXT;
    v_new_faculty_dept_id UUID;
    v_prev_faculty_name TEXT;
    v_new_faculty_name TEXT;
BEGIN
    -- Check if assigned faculty has changed
    IF NEW.assigned_faculty_id IS DISTINCT FROM OLD.assigned_faculty_id THEN
        -- Query role of authenticated user initiating change
        SELECT role INTO v_initiator_role
        FROM public.profiles
        WHERE id = auth.uid();

        -- Fallback if auth.uid() not present in direct calls: treat as student if modifying own request
        IF v_initiator_role IS NULL AND auth.uid() = OLD.student_id THEN
            v_initiator_role := 'student';
        END IF;

        -- Rule 3: Lock teacher changes once review begins for students
        IF v_initiator_role = 'student' THEN
            IF OLD.faculty_review_started_at IS NOT NULL OR OLD.faculty_status != 'PENDING' THEN
                RAISE EXCEPTION 'Cannot change assigned teacher because faculty review has already commenced.';
            END IF;
        END IF;

        -- Validate new faculty account is active and authorized for the student's department
        SELECT is_active, department, department_id, full_name
        INTO v_new_faculty_active, v_new_faculty_dept, v_new_faculty_dept_id, v_new_faculty_name
        FROM public.profiles
        WHERE id = NEW.assigned_faculty_id AND role = 'faculty';

        IF v_new_faculty_active IS NOT TRUE THEN
            RAISE EXCEPTION 'The selected replacement teacher is not active or not authorized for this department.';
        END IF;

        -- Retrieve previous faculty name
        SELECT full_name INTO v_prev_faculty_name
        FROM public.profiles
        WHERE id = OLD.assigned_faculty_id;

        -- Create immutable audit record in teacher_reassignments table
        INSERT INTO public.teacher_reassignments (
            request_id,
            previous_faculty_id,
            previous_faculty_name,
            new_faculty_id,
            new_faculty_name,
            initiated_by_user_id,
            initiated_by_role,
            reason,
            result
        ) VALUES (
            NEW.id,
            OLD.assigned_faculty_id,
            COALESCE(v_prev_faculty_name, 'Unassigned'),
            NEW.assigned_faculty_id,
            COALESCE(v_new_faculty_name, 'Assigned Faculty'),
            COALESCE(auth.uid(), OLD.student_id),
            COALESCE(v_initiator_role, 'student'),
            'Reassigned via clearance governance workflow',
            'SUCCESS'
        );

        -- Send persistent in-app notifications
        INSERT INTO public.notifications (
            recipient_id,
            title,
            message,
            type,
            link
        ) VALUES (
            NEW.assigned_faculty_id,
            'No-Due Clearance Request Assigned to You',
            'Clearance request ' || NEW.request_code || ' has been assigned to you for academic verification.',
            'action_required',
            '/faculty'
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_check_teacher_reassignment ON public.no_due_requests;
CREATE TRIGGER trg_check_teacher_reassignment
BEFORE UPDATE ON public.no_due_requests
FOR EACH ROW
EXECUTE FUNCTION public.check_teacher_reassignment_eligibility();
