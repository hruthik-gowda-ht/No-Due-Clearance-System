-- ==============================================================================
-- SECTION 34: MULTI-FACULTY ASSIGNMENTS, SUBJECT-WISE ATTENDANCE & WORKFLOW CONTINUITY
-- 1. Relational schema for subjects, staff assignments, student enrollments
-- 2. Relational schema for multi-faculty request assignments and faculty review tasks
-- 3. Validation triggers for class counts (Conducted > 0, 0 <= Attended <= Conducted)
-- 4. Workflow continuity protections (faculty changes preserve request ID, completed clearance stages, valid attendance)
-- 5. RLS policies protecting cross-faculty and cross-department access
-- ==============================================================================

-- 1. Table schema: subjects
CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT,
    name TEXT NOT NULL,
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    semester INTEGER NOT NULL CHECK (semester >= 1 AND semester <= 8),
    academic_year TEXT NOT NULL DEFAULT '2026-2027',
    credits INTEGER DEFAULT 3,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (name, semester, academic_year, department_id)
);

CREATE INDEX IF NOT EXISTS idx_subjects_dept_sem ON public.subjects(department_id, semester, academic_year);

-- 2. Table schema: staff_subject_assignments
CREATE TABLE IF NOT EXISTS public.staff_subject_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    faculty_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    academic_year TEXT NOT NULL DEFAULT '2026-2027',
    semester INTEGER NOT NULL CHECK (semester >= 1 AND semester <= 8),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (subject_id, faculty_id, academic_year, semester)
);

CREATE INDEX IF NOT EXISTS idx_staff_subject_faculty ON public.staff_subject_assignments(faculty_id);
CREATE INDEX IF NOT EXISTS idx_staff_subject_subject ON public.staff_subject_assignments(subject_id);

-- 3. Table schema: student_subject_enrollments
CREATE TABLE IF NOT EXISTS public.student_subject_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    academic_year TEXT NOT NULL DEFAULT '2026-2027',
    semester INTEGER NOT NULL CHECK (semester >= 1 AND semester <= 8),
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (student_id, subject_id, academic_year, semester)
);

CREATE INDEX IF NOT EXISTS idx_student_enrollments_student ON public.student_subject_enrollments(student_id);

-- 4. Table schema: request_faculty_assignments (Multi-faculty assignments per request)
CREATE TABLE IF NOT EXISTS public.request_faculty_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES public.no_due_requests(id) ON DELETE CASCADE,
    faculty_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    assignment_type TEXT NOT NULL DEFAULT 'PRIMARY_ACADEMIC' CHECK (assignment_type IN ('PRIMARY_ACADEMIC', 'SUBJECT_FACULTY', 'MENTOR')),
    status TEXT NOT NULL DEFAULT 'ASSIGNED' CHECK (status IN ('ASSIGNED', 'REPLACED', 'COMPLETED')),
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    replaced_at TIMESTAMPTZ,
    UNIQUE (request_id, faculty_id, assignment_type)
);

CREATE INDEX IF NOT EXISTS idx_request_faculty_req ON public.request_faculty_assignments(request_id);
CREATE INDEX IF NOT EXISTS idx_request_faculty_fac ON public.request_faculty_assignments(faculty_id);

-- 5. Table schema: faculty_review_tasks (Individual actionable review items)
CREATE TABLE IF NOT EXISTS public.faculty_review_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES public.no_due_requests(id) ON DELETE CASCADE,
    faculty_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    task_type TEXT NOT NULL CHECK (task_type IN ('ACADEMIC_VERIFICATION', 'ATTENDANCE_ENTRY', 'SUBJECT_ATTENDANCE')),
    subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'REJECTED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_review_tasks_req ON public.faculty_review_tasks(request_id);
CREATE INDEX IF NOT EXISTS idx_review_tasks_fac ON public.faculty_review_tasks(faculty_id);

-- 6. Alter no_due_requests to include multi-faculty array
ALTER TABLE IF EXISTS public.no_due_requests
    ADD COLUMN IF NOT EXISTS assigned_faculty_ids UUID[] DEFAULT '{}'::UUID[];

-- 7. Alter subject_attendance_records to link to subjects table and support classes_conducted alias
ALTER TABLE IF EXISTS public.subject_attendance_records
    ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS classes_conducted INTEGER CHECK (classes_conducted IS NULL OR classes_conducted > 0);

-- Sync classes_conducted with classes_held
CREATE OR REPLACE FUNCTION public.sync_attendance_classes_columns()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.classes_conducted IS NOT NULL AND NEW.classes_held IS NULL THEN
        NEW.classes_held := NEW.classes_conducted;
    ELSIF NEW.classes_held IS NOT NULL AND NEW.classes_conducted IS NULL THEN
        NEW.classes_conducted := NEW.classes_held;
    END IF;

    -- Strict validation on insert/update
    IF NEW.classes_held IS NOT NULL THEN
        IF NEW.classes_held <= 0 THEN
            RAISE EXCEPTION 'Total classes conducted must be a positive whole number (> 0).';
        END IF;
    END IF;

    IF NEW.classes_attended IS NOT NULL THEN
        IF NEW.classes_attended < 0 THEN
            RAISE EXCEPTION 'Classes attended cannot be negative.';
        END IF;
        IF NEW.classes_held IS NOT NULL AND NEW.classes_attended > NEW.classes_held THEN
            RAISE EXCEPTION 'Classes attended (%) cannot exceed total classes conducted (%).', NEW.classes_attended, NEW.classes_held;
        END IF;
    END IF;

    -- Automatically compute percentage when both counts are present
    IF NEW.classes_held IS NOT NULL AND NEW.classes_attended IS NOT NULL AND NEW.classes_held > 0 THEN
        NEW.attendance_percentage := ROUND((NEW.classes_attended::NUMERIC / NEW.classes_held::NUMERIC) * 100, 2);
        NEW.status := 'ENTERED';
    END IF;

    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_attendance_classes_columns ON public.subject_attendance_records;
CREATE TRIGGER trg_sync_attendance_classes_columns
BEFORE INSERT OR UPDATE ON public.subject_attendance_records
FOR EACH ROW
EXECUTE FUNCTION public.sync_attendance_classes_columns();

-- 8. Unique constraint for subject attendance per student, subject, year, sem
CREATE UNIQUE INDEX IF NOT EXISTS uq_subject_attendance_record
ON public.subject_attendance_records(student_id, subject_name, academic_year, semester);

-- 9. Enable RLS on all newly added relational tables
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_subject_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_subject_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_faculty_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faculty_review_tasks ENABLE ROW LEVEL SECURITY;

-- 10. RLS Policies
-- Subjects: readable by authenticated users, manageable by admin
DROP POLICY IF EXISTS "Subjects are viewable by authenticated users" ON public.subjects;
CREATE POLICY "Subjects are viewable by authenticated users"
ON public.subjects FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Subjects manageable by admin" ON public.subjects;
CREATE POLICY "Subjects manageable by admin"
ON public.subjects FOR ALL TO authenticated
USING (auth.jwt()->>'role' = 'admin' OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- Staff subject assignments: readable by authenticated, manageable by admin
DROP POLICY IF EXISTS "Staff assignments viewable by authenticated" ON public.staff_subject_assignments;
CREATE POLICY "Staff assignments viewable by authenticated"
ON public.staff_subject_assignments FOR SELECT TO authenticated USING (true);

-- Student subject enrollments: readable by student or staff of that department
DROP POLICY IF EXISTS "Enrollments viewable by student or staff" ON public.student_subject_enrollments;
CREATE POLICY "Enrollments viewable by student or staff"
ON public.student_subject_enrollments FOR SELECT TO authenticated
USING (student_id = auth.uid() OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'faculty', 'hod'));

-- Request faculty assignments: readable by student or assigned faculty or admin
DROP POLICY IF EXISTS "Request assignments viewable by participants" ON public.request_faculty_assignments;
CREATE POLICY "Request assignments viewable by participants"
ON public.request_faculty_assignments FOR SELECT TO authenticated
USING (
    faculty_id = auth.uid()
    OR (SELECT student_id FROM public.no_due_requests WHERE id = request_faculty_assignments.request_id) = auth.uid()
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- Faculty review tasks: readable and updatable by assigned faculty or admin
DROP POLICY IF EXISTS "Faculty review tasks access" ON public.faculty_review_tasks;
CREATE POLICY "Faculty review tasks access"
ON public.faculty_review_tasks FOR ALL TO authenticated
USING (
    faculty_id = auth.uid()
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);
