-- ==============================================================================
-- SECTION 35: MULTI-SUBJECT FACULTY ATTENDANCE, INDIVIDUAL APPROVALS & STRICT WORKFLOW GATING
-- 1. Table schema: teacher_approval_decisions (Immutable decision history)
-- 2. Alter subject_attendance_records for individual approvals, status & locking
-- 3. Trigger: Attendance validation before approval and locking enforcement
-- 4. Trigger: Strict server-side workflow gating blocking progression until all teachers approve
-- 5. RLS policies protecting teacher decisions and cross-faculty isolation
-- ==============================================================================

-- 1. Table schema: teacher_approval_decisions
CREATE TABLE IF NOT EXISTS public.teacher_approval_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES public.no_due_requests(id) ON DELETE CASCADE,
    subject_record_id UUID REFERENCES public.subject_attendance_records(id) ON DELETE SET NULL,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
    subject_name TEXT NOT NULL,
    faculty_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    faculty_name TEXT,
    decision TEXT NOT NULL CHECK (decision IN ('APPROVE', 'REJECT', 'CORRECTION_REQUIRED')),
    attendance_percentage NUMERIC(5,2),
    classes_held INTEGER,
    classes_conducted INTEGER,
    classes_attended INTEGER,
    remarks TEXT,
    decided_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teacher_decisions_req ON public.teacher_approval_decisions(request_id);
CREATE INDEX IF NOT EXISTS idx_teacher_decisions_fac ON public.teacher_approval_decisions(faculty_id);
CREATE INDEX IF NOT EXISTS idx_teacher_decisions_sub ON public.teacher_approval_decisions(subject_record_id);

-- 2. Add columns to subject_attendance_records for approval tracking and locking
ALTER TABLE IF EXISTS public.subject_attendance_records
    ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'WAITING_FOR_ATTENDANCE'
        CHECK (approval_status IN ('WAITING_FOR_ATTENDANCE', 'AWAITING_APPROVAL', 'APPROVED', 'REJECTED', 'CORRECTION_REQUIRED')),
    ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS approved_by_name TEXT,
    ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS approval_remarks TEXT,
    ADD COLUMN IF NOT EXISTS rejection_remarks TEXT,
    ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. Trigger Function: enforce subject attendance lock against ordinary edits
CREATE OR REPLACE FUNCTION public.check_subject_attendance_lock()
RETURNS TRIGGER AS $$
BEGIN
    -- If previously locked and approved, only admin or explicit correction flow can unlock
    IF OLD.is_locked = TRUE AND OLD.approval_status = 'APPROVED' THEN
        -- Allow unlocking only if transitioning to CORRECTION_REQUIRED or initiated by admin
        IF NEW.approval_status = 'CORRECTION_REQUIRED' AND NEW.is_locked = FALSE THEN
            -- Allowed: unclocking for correction
            NULL;
        ELSIF (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin' THEN
            -- Allowed: admin override
            NULL;
        ELSE
            RAISE EXCEPTION 'Attendance record for "%" is approved and locked. A correction must be requested before edits can be made.', OLD.subject_name;
        END IF;
    END IF;

    -- Automatically set approval_status to AWAITING_APPROVAL when attendance is entered
    IF NEW.classes_held IS NOT NULL AND NEW.classes_attended IS NOT NULL THEN
        IF NEW.approval_status = 'WAITING_FOR_ATTENDANCE' THEN
            NEW.approval_status := 'AWAITING_APPROVAL';
        END IF;
    END IF;

    -- When approval_status becomes APPROVED, enforce valid attendance and set is_locked
    IF NEW.approval_status = 'APPROVED' THEN
        IF NEW.classes_held IS NULL OR NEW.classes_held <= 0 OR NEW.classes_attended IS NULL OR NEW.classes_attended < 0 THEN
            RAISE EXCEPTION 'Approval Blocked: Valid attendance (Total Conducted and Attended classes) must be entered and saved before approval.';
        END IF;
        NEW.is_locked := TRUE;
        NEW.approved_at := COALESCE(NEW.approved_at, NOW());
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_subject_attendance_lock ON public.subject_attendance_records;
CREATE TRIGGER trg_check_subject_attendance_lock
BEFORE UPDATE ON public.subject_attendance_records
FOR EACH ROW
EXECUTE FUNCTION public.check_subject_attendance_lock();

-- 4. Trigger Function: Strict workflow gate blocking academic verification and clearance progression
CREATE OR REPLACE FUNCTION public.enforce_all_subject_approvals_gate()
RETURNS TRIGGER AS $$
DECLARE
    v_total_subjects INTEGER;
    v_unapproved_count INTEGER;
    v_rejected_subject TEXT;
    v_correction_subject TEXT;
    v_unentered_subject TEXT;
    v_pending_teacher TEXT;
BEGIN
    -- Gate applies when faculty_status is transitioning to APPROVED or status is advancing beyond PENDING
    IF NEW.faculty_status = 'APPROVED' AND (OLD.faculty_status IS NULL OR OLD.faculty_status != 'APPROVED') THEN
        SELECT COUNT(*) INTO v_total_subjects
        FROM public.subject_attendance_records
        WHERE request_id = NEW.id;

        IF v_total_subjects > 0 THEN
            -- Check for rejected subjects
            SELECT subject_name INTO v_rejected_subject
            FROM public.subject_attendance_records
            WHERE request_id = NEW.id AND approval_status = 'REJECTED'
            LIMIT 1;

            IF v_rejected_subject IS NOT NULL THEN
                RAISE EXCEPTION 'Academic Approval Blocked: Attendance for subject "%" was rejected by subject teacher. Issue must be corrected and approved before proceeding.', v_rejected_subject;
            END IF;

            -- Check for correction required subjects
            SELECT subject_name INTO v_correction_subject
            FROM public.subject_attendance_records
            WHERE request_id = NEW.id AND approval_status = 'CORRECTION_REQUIRED'
            LIMIT 1;

            IF v_correction_subject IS NOT NULL THEN
                RAISE EXCEPTION 'Academic Approval Blocked: Subject "%" has corrections pending requested by subject teacher. Re-review and approval required.', v_correction_subject;
            END IF;

            -- Check for unentered subjects
            SELECT subject_name INTO v_unentered_subject
            FROM public.subject_attendance_records
            WHERE request_id = NEW.id AND (status != 'ENTERED' OR attendance_percentage IS NULL)
            LIMIT 1;

            IF v_unentered_subject IS NOT NULL THEN
                RAISE EXCEPTION 'Academic Approval Blocked: Attendance has not been entered for subject "%".', v_unentered_subject;
            END IF;

            -- Check for pending approvals
            SELECT faculty_name INTO v_pending_teacher
            FROM public.subject_attendance_records
            WHERE request_id = NEW.id AND approval_status != 'APPROVED'
            LIMIT 1;

            IF v_pending_teacher IS NOT NULL THEN
                RAISE EXCEPTION 'Academic Approval Blocked: One or more subject teachers have not approved attendance (Teacher: %). All required subject teachers must approve.', v_pending_teacher;
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_all_subject_approvals_gate ON public.no_due_requests;
CREATE TRIGGER trg_enforce_all_subject_approvals_gate
BEFORE UPDATE ON public.no_due_requests
FOR EACH ROW
EXECUTE FUNCTION public.enforce_all_subject_approvals_gate();

-- 5. Enable RLS on teacher_approval_decisions
ALTER TABLE public.teacher_approval_decisions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for teacher_approval_decisions
DROP POLICY IF EXISTS "Teacher approval decisions viewable by participants" ON public.teacher_approval_decisions;
CREATE POLICY "Teacher approval decisions viewable by participants"
ON public.teacher_approval_decisions FOR SELECT TO authenticated
USING (
    faculty_id = auth.uid()
    OR (SELECT student_id FROM public.no_due_requests WHERE id = teacher_approval_decisions.request_id) = auth.uid()
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'hod')
);

DROP POLICY IF EXISTS "Teacher approval decisions insertable by authorized faculty or admin" ON public.teacher_approval_decisions;
CREATE POLICY "Teacher approval decisions insertable by authorized faculty or admin"
ON public.teacher_approval_decisions FOR INSERT TO authenticated
WITH CHECK (
    faculty_id = auth.uid()
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);
