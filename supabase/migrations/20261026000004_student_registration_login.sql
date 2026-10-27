-- ==============================================================================
-- CAUVERY INSTITUTE OF TECHNOLOGY (Affiliated to VTU)
-- Migration 0004: Student Registration Number Login & Secure Authorization
-- ==============================================================================

-- 1. Ensure Case-Insensitive Unique Index on Student Registration Number (student_id)
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_student_reg_number_unique
ON public.profiles (UPPER(TRIM(student_id)))
WHERE student_id IS NOT NULL;

-- 2. Secure Server-Side Mapping Function for Student Registration Number Authentication
-- Resolves the registered student's internal email address without exposing account enumeration
CREATE OR REPLACE FUNCTION public.resolve_student_identifier(p_student_id TEXT)
RETURNS TABLE (email TEXT)
SECURITY DEFINER
SET search_path = public, private, auth, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
    v_clean_id TEXT;
BEGIN
    IF p_student_id IS NULL OR TRIM(p_student_id) = '' THEN
        RETURN;
    END IF;

    v_clean_id := UPPER(TRIM(p_student_id));

    RETURN QUERY
    SELECT p.email
    FROM public.profiles p
    WHERE UPPER(TRIM(p.student_id)) = v_clean_id
      AND p.role = 'student'
      AND p.is_active = true
    LIMIT 1;
END;
$$;

-- Restrict function execution permissions to authorized API consumers
REVOKE ALL ON FUNCTION public.resolve_student_identifier(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_student_identifier(TEXT) TO anon, authenticated, service_role;

-- 3. Automatic Synchronization Trigger to private.student_identities
CREATE OR REPLACE FUNCTION private.sync_student_identity_from_profile()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, private, auth, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.role = 'student' AND NEW.student_id IS NOT NULL AND TRIM(NEW.student_id) != '' THEN
        INSERT INTO private.student_identities (
            student_id,
            user_id,
            email,
            is_active
        )
        VALUES (
            UPPER(TRIM(NEW.student_id)),
            NEW.id,
            LOWER(TRIM(NEW.email)),
            NEW.is_active
        )
        ON CONFLICT (student_id) DO UPDATE
        SET email = EXCLUDED.email,
            is_active = EXCLUDED.is_active;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_student_identity ON public.profiles;
CREATE TRIGGER trg_sync_student_identity
    AFTER INSERT OR UPDATE OF student_id, email, is_active, role
    ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION private.sync_student_identity_from_profile();
