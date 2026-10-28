-- ==============================================================================
-- COLLEGE NO-DUE CLEARANCE MANAGEMENT SYSTEM
-- Migration 08: Initial Administrator Account & Privilege Enforcement (Sections 30 & 31)
-- Safe, Idempotent Server-Side Provisioning, Prevents Unauthorized Role Escalation
-- Passwords must never be hardcoded in migration scripts (Section 31.B & 31.C)
-- ==============================================================================

-- 1. Create Tombstones table for removed default system accounts (Section 30 Requirement 10)
CREATE TABLE IF NOT EXISTS public.system_account_tombstones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier TEXT NOT NULL UNIQUE,
    account_type TEXT NOT NULL,
    removed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    removed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reason TEXT
);

ALTER TABLE public.system_account_tombstones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only administrators can view or manage account tombstones"
ON public.system_account_tombstones FOR ALL
TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
)
WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 2. Add must_change_password column to profiles if not present (Section 30 Requirement 9)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'profiles' 
          AND column_name = 'must_change_password'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN must_change_password BOOLEAN DEFAULT false;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'profiles' 
          AND column_name = 'is_temporary_password'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN is_temporary_password BOOLEAN DEFAULT false;
    END IF;
END $$;

-- 3. Trigger to strictly prevent role escalation to 'admin' by unauthorized users (Section 30 Requirement 7)
CREATE OR REPLACE FUNCTION public.prevent_unauthorized_admin_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- If role is being changed to admin or inserted as admin
    IF (TG_OP = 'INSERT' AND NEW.role = 'admin') OR 
       (TG_OP = 'UPDATE' AND NEW.role = 'admin' AND OLD.role IS DISTINCT FROM 'admin') THEN
        -- Allow service_role or server-side bootstrap process, otherwise verify caller is an authorized admin
        IF auth.role() != 'service_role' AND auth.uid() IS NOT NULL THEN
            IF NOT EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE id = auth.uid() AND role = 'admin'
            ) THEN
                RAISE EXCEPTION 'Security violation: Ordinary users cannot assign or elevate themselves to the Administrator role.';
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_unauthorized_admin_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_unauthorized_admin_escalation
BEFORE INSERT OR UPDATE OF role ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_unauthorized_admin_escalation();

-- 4. Stored Procedure for Secure, Server-Side Initial Admin Provisioning (Section 31.C)
-- Passwords must be supplied via secure environment variables or CLI parameter, never hardcoded in git.
CREATE OR REPLACE FUNCTION public.provision_initial_admin(
    p_email TEXT DEFAULT 'admin@gmail.com',
    p_temporary_password TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_admin_id UUID := '00000000-0000-0000-0000-000000000001'::UUID;
    v_existing_auth_id UUID;
    v_is_tombstoned BOOLEAN;
BEGIN
    -- Check if initial admin account was explicitly deleted or tombstoned (Requirement 10)
    SELECT EXISTS (
        SELECT 1 FROM public.system_account_tombstones WHERE identifier = p_email
    ) INTO v_is_tombstoned;

    IF v_is_tombstoned THEN
        RAISE NOTICE 'Initial admin account % was previously disabled or removed. Skipping recreation.', p_email;
        RETURN NULL;
    END IF;

    -- If running in Supabase environment with auth.users
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
        SELECT id INTO v_existing_auth_id FROM auth.users WHERE email = p_email;

        IF v_existing_auth_id IS NULL AND p_temporary_password IS NOT NULL THEN
            INSERT INTO auth.users (
                id,
                instance_id,
                email,
                encrypted_password,
                email_confirmed_at,
                raw_app_meta_data,
                raw_user_meta_data,
                created_at,
                updated_at,
                role,
                aud
            ) VALUES (
                v_admin_id,
                '00000000-0000-0000-0000-000000000000',
                p_email,
                crypt(p_temporary_password, gen_salt('bf')),
                now(),
                jsonb_build_object('provider', 'email', 'providers', array['email']),
                jsonb_build_object('role', 'admin', 'full_name', 'Dr. Srikantappa As', 'must_change_password', true),
                now(),
                now(),
                'authenticated',
                'authenticated'
            );
            v_existing_auth_id := v_admin_id;
        ELSIF v_existing_auth_id IS NOT NULL THEN
            v_admin_id := v_existing_auth_id;
        END IF;
    END IF;

    -- Upsert initial admin profile in public.profiles (Idempotent: DO NOT OVERWRITE existing credentials)
    INSERT INTO public.profiles (
        id,
        role,
        full_name,
        email,
        staff_id,
        department,
        designation,
        is_active,
        is_verified,
        verification_status,
        must_change_password,
        is_temporary_password,
        verified_at,
        created_at
    ) VALUES (
        v_admin_id,
        'admin',
        'Dr. Srikantappa As',
        p_email,
        'CIT-ADM-001',
        'Central Institutional Administration',
        'Institutional System Administrator',
        true,
        true,
        'VERIFIED',
        true,
        true,
        now(),
        now()
    )
    ON CONFLICT (id) DO UPDATE SET
        role = 'admin',
        is_verified = true,
        verification_status = 'VERIFIED'
    WHERE profiles.role != 'admin';

    -- Audit log
    INSERT INTO public.audit_logs (
        user_id,
        user_role,
        action,
        entity_type,
        entity_id,
        new_state
    ) VALUES (
        v_admin_id,
        'admin',
        'INITIAL_ADMIN_BOOTSTRAP',
        'profiles',
        v_admin_id,
        jsonb_build_object('email', p_email, 'role', 'admin', 'must_change_password', true)
    );

    RETURN v_admin_id;
END;
$$;
