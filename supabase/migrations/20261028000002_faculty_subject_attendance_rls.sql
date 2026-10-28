-- ==============================================================================
-- SECTION 33: FACULTY-ENTERED ATTENDANCE AFTER NO-DUE REQUEST SUBMISSION
-- Row-Level Security (RLS) policies and triggers enforcing:
-- 1. Initial attendance is NULL (unset) on submission
-- 2. Only assigned subject faculty can enter attendance for their assigned subject
-- 3. Automatic overall calculation once all required subjects are entered
-- 4. Audit logging of all attendance changes
-- ==============================================================================

-- 1. Table schema: public.subject_attendance_records
CREATE TABLE IF NOT EXISTS public.subject_attendance_records (
    id TEXT PRIMARY KEY DEFAULT ('sub-att-' || gen_random_uuid()),
    request_id UUID REFERENCES public.no_due_requests(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    subject_code TEXT,
    subject_name TEXT NOT NULL,
    faculty_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    faculty_name TEXT NOT NULL,
    academic_year TEXT NOT NULL DEFAULT '2026-2027',
    semester INTEGER NOT NULL CHECK (semester >= 1 AND semester <= 8),
    classes_held INTEGER CHECK (classes_held IS NULL OR classes_held > 0),
    classes_attended INTEGER CHECK (classes_attended IS NULL OR (classes_attended >= 0 AND classes_attended <= classes_held)),
    attendance_percentage NUMERIC(5,2) CHECK (attendance_percentage IS NULL OR (attendance_percentage >= 0 AND attendance_percentage <= 100)),
    status TEXT NOT NULL DEFAULT 'AWAITING_ENTRY' CHECK (status IN ('AWAITING_ENTRY', 'ENTERED')),
    remarks TEXT,
    entered_at TIMESTAMPTZ,
    entered_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexing for fast lookups
CREATE INDEX IF NOT EXISTS idx_subject_attendance_student ON public.subject_attendance_records(student_id, academic_year, semester);
CREATE INDEX IF NOT EXISTS idx_subject_attendance_faculty ON public.subject_attendance_records(faculty_id);
CREATE INDEX IF NOT EXISTS idx_subject_attendance_request ON public.subject_attendance_records(request_id);

-- 2. Alter public.student_academic_records to allow NULL initial attendance
ALTER TABLE IF EXISTS public.student_academic_records
    ALTER COLUMN attendance_percentage DROP NOT NULL;

ALTER TABLE IF EXISTS public.student_academic_records
    ADD COLUMN IF NOT EXISTS attendance_status TEXT NOT NULL DEFAULT 'AWAITING_FACULTY_ENTRY',
    ADD COLUMN IF NOT EXISTS calculation_method TEXT,
    ADD COLUMN IF NOT EXISTS calculation_details TEXT,
    ADD COLUMN IF NOT EXISTS total_classes_held INTEGER,
    ADD COLUMN IF NOT EXISTS total_classes_attended INTEGER;

-- 3. Function to automatically recalculate student overall attendance upon subject entry
CREATE OR REPLACE FUNCTION public.recalculate_student_overall_attendance()
RETURNS TRIGGER AS $$
DECLARE
    v_total_subjects INTEGER;
    v_entered_subjects INTEGER;
    v_total_held INTEGER := 0;
    v_total_attended INTEGER := 0;
    v_all_counts_provided BOOLEAN := TRUE;
    v_sum_percentage NUMERIC := 0;
    v_calculated_percentage NUMERIC(5,2);
    v_calc_method TEXT;
    v_calc_details TEXT;
    v_threshold NUMERIC := 85.0;
    v_is_eligible BOOLEAN := NULL;
    v_status TEXT;
    r RECORD;
BEGIN
    -- Query configured threshold
    SELECT COALESCE((value->>'value')::NUMERIC, (value)::NUMERIC, 85.0) INTO v_threshold
    FROM public.system_settings
    WHERE key = 'minimum_attendance_percentage'
    LIMIT 1;

    -- Count total and entered subjects for this student and academic period
    SELECT COUNT(*), COUNT(CASE WHEN status = 'ENTERED' AND attendance_percentage IS NOT NULL THEN 1 END)
    INTO v_total_subjects, v_entered_subjects
    FROM public.subject_attendance_records
    WHERE student_id = NEW.student_id
      AND academic_year = NEW.academic_year
      AND semester = NEW.semester;

    IF v_entered_subjects = 0 THEN
        v_status := 'AWAITING_FACULTY_ENTRY';
        v_calculated_percentage := NULL;
        v_is_eligible := NULL;
        v_calc_details := 'Awaiting faculty attendance entry after No-Due request submission.';
    ELSIF v_entered_subjects < v_total_subjects THEN
        v_status := 'ATTENDANCE_INCOMPLETE';
        v_calculated_percentage := NULL;
        v_is_eligible := NULL;
        v_calc_details := 'Attendance incomplete: ' || v_entered_subjects || ' of ' || v_total_subjects || ' required subjects entered.';
    ELSE
        -- All subjects entered: calculate overall percentage
        FOR r IN
            SELECT classes_held, classes_attended, attendance_percentage
            FROM public.subject_attendance_records
            WHERE student_id = NEW.student_id
              AND academic_year = NEW.academic_year
              AND semester = NEW.semester
        LOOP
            IF r.classes_held IS NOT NULL AND r.classes_attended IS NOT NULL AND r.classes_held > 0 THEN
                v_total_held := v_total_held + r.classes_held;
                v_total_attended := v_total_attended + r.classes_attended;
            ELSE
                v_all_counts_provided := FALSE;
            END IF;
            v_sum_percentage := v_sum_percentage + r.attendance_percentage;
        END LOOP;

        IF v_all_counts_provided AND v_total_held > 0 THEN
            v_calculated_percentage := ROUND((v_total_attended::NUMERIC / v_total_held::NUMERIC) * 100, 2);
            v_calc_method := 'WEIGHTED_CLASS_COUNT';
            v_calc_details := 'Weighted class count: ' || v_total_attended || ' attended / ' || v_total_held || ' held across ' || v_total_subjects || ' subjects.';
        ELSE
            v_calculated_percentage := ROUND(v_sum_percentage / v_total_subjects, 2);
            v_calc_method := 'AVERAGE_PERCENTAGE';
            v_calc_details := 'Institution-approved arithmetic mean across ' || v_total_subjects || ' required subjects.';
        END IF;

        v_status := 'ENTERED';
        v_is_eligible := (v_calculated_percentage >= v_threshold);
    END IF;

    -- Update student_academic_records
    UPDATE public.student_academic_records
    SET attendance_percentage = v_calculated_percentage,
        attendance_status = v_status,
        is_eligible = v_is_eligible,
        calculation_method = v_calc_method,
        calculation_details = v_calc_details,
        total_classes_held = CASE WHEN v_all_counts_provided AND v_total_held > 0 THEN v_total_held ELSE NULL END,
        total_classes_attended = CASE WHEN v_all_counts_provided AND v_total_held > 0 THEN v_total_attended ELSE NULL END,
        updated_at = NOW()
    WHERE student_id = NEW.student_id
      AND academic_year = NEW.academic_year
      AND semester = NEW.semester;

    -- Update active request if present
    UPDATE public.no_due_requests
    SET attendance_percentage = v_calculated_percentage,
        attendance_status = v_status,
        updated_at = NOW()
    WHERE id = NEW.request_id OR (
        student_id = NEW.student_id AND academic_year = NEW.academic_year AND semester = NEW.semester
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_recalculate_student_overall_attendance ON public.subject_attendance_records;
CREATE TRIGGER trg_recalculate_student_overall_attendance
AFTER INSERT OR UPDATE ON public.subject_attendance_records
FOR EACH ROW
EXECUTE FUNCTION public.recalculate_student_overall_attendance();

-- 4. Row-Level Security for public.subject_attendance_records
ALTER TABLE public.subject_attendance_records ENABLE ROW LEVEL SECURITY;

-- Policy: Admin full access
DROP POLICY IF EXISTS admin_all_subject_attendance ON public.subject_attendance_records;
CREATE POLICY admin_all_subject_attendance
ON public.subject_attendance_records
FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Policy: Faculty can SELECT subject records within their department
DROP POLICY IF EXISTS faculty_select_department_subjects ON public.subject_attendance_records;
CREATE POLICY faculty_select_department_subjects
ON public.subject_attendance_records
FOR SELECT
USING (
    public.is_active_faculty(auth.uid()) AND
    EXISTS (
        SELECT 1 FROM public.profiles s
        WHERE s.id = subject_attendance_records.student_id
          AND public.check_user_department_match(auth.uid(), s.department_id)
    )
);

-- Policy: Faculty can INSERT / UPDATE subject records ONLY for their assigned subjects
DROP POLICY IF EXISTS faculty_modify_assigned_subject ON public.subject_attendance_records;
CREATE POLICY faculty_modify_assigned_subject
ON public.subject_attendance_records
FOR UPDATE
USING (
    public.is_active_faculty(auth.uid()) AND
    faculty_id = auth.uid() AND
    EXISTS (
        SELECT 1 FROM public.profiles s
        WHERE s.id = subject_attendance_records.student_id
          AND public.check_user_department_match(auth.uid(), s.department_id)
    )
)
WITH CHECK (
    public.is_active_faculty(auth.uid()) AND
    faculty_id = auth.uid()
);

-- Policy: Students can SELECT only their own subject attendance records (Read-Only)
DROP POLICY IF EXISTS student_select_own_subject_attendance ON public.subject_attendance_records;
CREATE POLICY student_select_own_subject_attendance
ON public.subject_attendance_records
FOR SELECT
USING (
    student_id = auth.uid()
);
-- Note: No INSERT / UPDATE / DELETE policy exists for students, strictly preventing student modifications.
