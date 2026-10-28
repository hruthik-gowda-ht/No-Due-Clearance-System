-- ==============================================================================
-- SECTION 32: DEPARTMENT-LEVEL DATA ISOLATION & ACCESS CONTROL
-- Row-Level Security (RLS) policies and backend verification functions
-- enforcing strict department boundaries across Laboratory, Faculty, HOD, and Staff.
-- ==============================================================================

-- 1. Helper function to check if a user belongs to a specified department (ID, Code, or Name)
CREATE OR REPLACE FUNCTION public.check_user_department_match(
    p_user_id UUID,
    p_department_name_or_id TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_dept_id TEXT;
    v_user_dept_name TEXT;
    v_target_dept_id TEXT;
    v_target_dept_name TEXT;
BEGIN
    IF p_department_name_or_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Retrieve authenticated user's department attributes
    SELECT department_id, department INTO v_user_dept_id, v_user_dept_name
    FROM public.profiles
    WHERE id = p_user_id;

    IF v_user_dept_id IS NULL AND v_user_dept_name IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Direct string equality check (case-insensitive)
    IF LOWER(TRIM(v_user_dept_name)) = LOWER(TRIM(p_department_name_or_id)) OR
       LOWER(TRIM(v_user_dept_id)) = LOWER(TRIM(p_department_name_or_id)) THEN
        RETURN TRUE;
    END IF;

    -- Lookup canonical department ID and name from public.departments
    SELECT id, name INTO v_target_dept_id, v_target_dept_name
    FROM public.departments
    WHERE LOWER(id) = LOWER(TRIM(p_department_name_or_id))
       OR LOWER(code) = LOWER(TRIM(p_department_name_or_id))
       OR LOWER(name) = LOWER(TRIM(p_department_name_or_id))
    LIMIT 1;

    IF v_target_dept_id IS NOT NULL AND (
       LOWER(v_user_dept_id) = LOWER(v_target_dept_id) OR
       LOWER(v_user_dept_name) = LOWER(v_target_dept_name)
    ) THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 2. Enhanced RLS for public.no_due_requests with Department Isolation
ALTER TABLE public.no_due_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing overlapping policies if any
DROP POLICY IF EXISTS "department_isolation_requests_select" ON public.no_due_requests;
DROP POLICY IF EXISTS "department_isolation_requests_update" ON public.no_due_requests;

-- SELECT policy: Enforces strict institutional and departmental scope
CREATE POLICY "department_isolation_requests_select" ON public.no_due_requests
FOR SELECT USING (
    -- Student can view their own requests
    (auth.uid() = student_id)
    OR
    -- Admin has institutional system oversight
    (EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin' AND is_active = true
    ))
    OR
    -- Faculty can view requests only if assigned AND department matches
    (EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
          AND role = 'faculty'
          AND is_active = true
          AND is_verified = true
          AND id = assigned_faculty_id
          AND public.check_user_department_match(auth.uid(), department)
    ))
    OR
    -- Laboratory Staff can only view requests in their authorized department
    (EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
          AND role = 'lab_staff'
          AND is_active = true
          AND is_verified = true
          AND public.check_user_department_match(auth.uid(), department)
    ))
    OR
    -- HOD can only view requests within their authorized department
    (EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
          AND role = 'hod'
          AND is_active = true
          AND is_verified = true
          AND public.check_user_department_match(auth.uid(), department)
    ))
    OR
    -- Central Library and Accounts staff view requests relevant to their clearance desk
    (EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
          AND role IN ('library_staff', 'accounts_staff')
          AND is_active = true
          AND is_verified = true
    ))
);

-- 3. Enhanced RLS for public.clearance_items with Department Isolation
ALTER TABLE public.clearance_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "department_isolation_clearance_items_select" ON public.clearance_items;
DROP POLICY IF EXISTS "department_isolation_clearance_items_update" ON public.clearance_items;

CREATE POLICY "department_isolation_clearance_items_select" ON public.clearance_items
FOR SELECT USING (
    -- Admin has institutional read oversight
    (EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin' AND is_active = true
    ))
    OR
    -- Student can view clearance items of their own request
    (EXISTS (
        SELECT 1 FROM public.no_due_requests r
        WHERE r.id = request_id AND r.student_id = auth.uid()
    ))
    OR
    -- Library staff can view library clearance items
    (authority = 'library' AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'library_staff' AND is_active = true AND is_verified = true
    ))
    OR
    -- Accounts staff can view accounts clearance items
    (authority = 'accounts' AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'accounts_staff' AND is_active = true AND is_verified = true
    ))
    OR
    -- Laboratory staff can view lab items ONLY when parent request is in their department
    (authority = 'lab' AND EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.no_due_requests r ON r.id = request_id
        WHERE p.id = auth.uid()
          AND p.role = 'lab_staff'
          AND p.is_active = true
          AND p.is_verified = true
          AND public.check_user_department_match(p.id, r.department)
    ))
    OR
    -- HOD can view clearance items of requests in their department
    (EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.no_due_requests r ON r.id = request_id
        WHERE p.id = auth.uid()
          AND p.role = 'hod'
          AND p.is_active = true
          AND p.is_verified = true
          AND public.check_user_department_match(p.id, r.department)
    ))
);

-- UPDATE policy on clearance items enforces department match for lab staff
CREATE POLICY "department_isolation_clearance_items_update" ON public.clearance_items
FOR UPDATE USING (
    -- Admin oversight (cannot approve clearance without genuine staff role)
    (EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin' AND is_active = true
    ))
    OR
    (authority = 'library' AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'library_staff' AND is_active = true AND is_verified = true
    ))
    OR
    (authority = 'accounts' AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'accounts_staff' AND is_active = true AND is_verified = true
    ))
    OR
    (authority = 'lab' AND EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.no_due_requests r ON r.id = request_id
        WHERE p.id = auth.uid()
          AND p.role = 'lab_staff'
          AND p.is_active = true
          AND p.is_verified = true
          AND public.check_user_department_match(p.id, r.department)
    ))
);

-- 4. Enhanced RLS for public.payment_submissions
ALTER TABLE public.payment_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "department_isolation_payments_select" ON public.payment_submissions;

CREATE POLICY "department_isolation_payments_select" ON public.payment_submissions
FOR SELECT USING (
    -- Student can view their own payment submissions
    (auth.uid() = student_id)
    OR
    -- Admin can view payments
    (EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin' AND is_active = true
    ))
    OR
    -- Assigned Faculty can view payments for students assigned to them
    (EXISTS (
        SELECT 1 FROM public.no_due_requests r
        WHERE r.id = request_id
          AND r.assigned_faculty_id = auth.uid()
          AND public.check_user_department_match(auth.uid(), r.department)
    ))
    OR
    -- Lab staff can view payment submissions only for lab clearance items in their department
    (EXISTS (
        SELECT 1 FROM public.clearance_items ci
        JOIN public.no_due_requests r ON r.id = ci.request_id
        WHERE ci.id = clearance_item_id
          AND ci.authority = 'lab'
          AND EXISTS (
              SELECT 1 FROM public.profiles p
              WHERE p.id = auth.uid()
                AND p.role = 'lab_staff'
                AND p.is_active = true
                AND p.is_verified = true
                AND public.check_user_department_match(p.id, r.department)
          )
    ))
    OR
    -- Accounts and Library staff can view payments for their authorities
    (EXISTS (
        SELECT 1 FROM public.clearance_items ci
        WHERE ci.id = clearance_item_id
          AND ((ci.authority = 'accounts' AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'accounts_staff' AND is_active = true AND is_verified = true))
            OR (ci.authority = 'library' AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'library_staff' AND is_active = true AND is_verified = true)))
    ))
);
