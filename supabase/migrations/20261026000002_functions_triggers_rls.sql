-- ==============================================================================
-- CAUVERY INSTITUTE OF TECHNOLOGY (Affiliated to VTU)
-- COLLEGE NO-DUE CLEARANCE MANAGEMENT SYSTEM
-- Migration 02: Functions, State Transitions, Triggers & RLS Policies
-- ==============================================================================

-- 1. Helper function: Get current configured minimum attendance threshold
CREATE OR REPLACE FUNCTION public.get_attendance_threshold()
RETURNS NUMERIC AS $$
DECLARE
    threshold NUMERIC;
BEGIN
    SELECT COALESCE((value::text)::numeric, 85)
    INTO threshold
    FROM public.system_settings
    WHERE key = 'minimum_attendance_percentage';
    
    RETURN COALESCE(threshold, 85.0);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 2. Trigger: Automatically compute academic eligibility on record insert/update
CREATE OR REPLACE FUNCTION public.trg_compute_academic_eligibility()
RETURNS TRIGGER AS $$
DECLARE
    min_threshold NUMERIC;
BEGIN
    min_threshold := public.get_attendance_threshold();
    NEW.is_eligible := (NEW.attendance_percentage >= min_threshold);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_calc_eligibility ON public.student_academic_records;
CREATE TRIGGER trg_calc_eligibility
BEFORE INSERT OR UPDATE OF attendance_percentage ON public.student_academic_records
FOR EACH ROW EXECUTE FUNCTION public.trg_compute_academic_eligibility();

-- 3. Audit Logging Helper Function
CREATE OR REPLACE FUNCTION public.log_audit_event(
    p_user_id UUID,
    p_user_role TEXT,
    p_action TEXT,
    p_entity_type TEXT,
    p_entity_id TEXT,
    p_previous_state JSONB DEFAULT NULL,
    p_new_state JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO public.audit_logs (
        user_id,
        user_role,
        action,
        entity_type,
        entity_id,
        previous_state,
        new_state
    ) VALUES (
        p_user_id,
        p_user_role,
        p_action,
        p_entity_type,
        p_entity_id,
        p_previous_state,
        p_new_state
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Notification Helper Function
CREATE OR REPLACE FUNCTION public.create_notification(
    p_recipient_id UUID,
    p_title TEXT,
    p_message TEXT,
    p_type TEXT DEFAULT 'info',
    p_link TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    notif_id UUID;
BEGIN
    INSERT INTO public.notifications (
        recipient_id,
        title,
        message,
        type,
        link
    ) VALUES (
        p_recipient_id,
        p_title,
        p_message,
        p_type,
        p_link
    ) RETURNING id INTO notif_id;
    
    RETURN notif_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Business Logic: Faculty Academic Verification
CREATE OR REPLACE FUNCTION public.verify_faculty_academic_approval(
    p_request_id UUID,
    p_faculty_id UUID,
    p_remarks TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_req RECORD;
    v_acad RECORD;
    v_min_threshold NUMERIC;
BEGIN
    SELECT * INTO v_req FROM public.no_due_requests WHERE id = p_request_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Clearance request not found';
    END IF;

    SELECT * INTO v_acad 
    FROM public.student_academic_records 
    WHERE student_id = v_req.student_id 
      AND academic_year = v_req.academic_year 
      AND semester = v_req.semester;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Academic record for this student and semester was not found. Cannot evaluate eligibility.';
    END IF;

    v_min_threshold := public.get_attendance_threshold();

    -- Rule 7: Attendance below threshold blocks academic approval
    IF v_acad.attendance_percentage < v_min_threshold THEN
        RAISE EXCEPTION 'Academic approval blocked: Student attendance (% %%) is below the mandatory threshold of % %%.', 
            v_acad.attendance_percentage, v_min_threshold;
    END IF;

    UPDATE public.no_due_requests
    SET faculty_status = 'APPROVED',
        faculty_remarks = p_remarks,
        faculty_reviewed_at = timezone('utc'::text, now()),
        status = 'IN_REVIEW',
        updated_at = timezone('utc'::text, now())
    WHERE id = p_request_id;

    -- Initialize the 3 parallel departmental clearances
    INSERT INTO public.clearance_items (request_id, authority, status, payment_status)
    VALUES 
        (p_request_id, 'library', 'PENDING', 'NOT_REQUIRED'),
        (p_request_id, 'accounts', 'PENDING', 'NOT_REQUIRED'),
        (p_request_id, 'lab', 'PENDING', 'NOT_REQUIRED')
    ON CONFLICT (request_id, authority) DO NOTHING;

    -- Audit log
    PERFORM public.log_audit_event(
        p_faculty_id,
        'faculty',
        'APPROVE_ACADEMIC_VERIFICATION',
        'no_due_requests',
        p_request_id::text,
        jsonb_build_object('faculty_status', v_req.faculty_status),
        jsonb_build_object('faculty_status', 'APPROVED', 'attendance', v_acad.attendance_percentage)
    );

    -- Notify Student
    PERFORM public.create_notification(
        v_req.student_id,
        'Academic Verification Approved',
        'Faculty verification approved. Departmental clearances (Library, Accounts, Laboratory) are now open in parallel.',
        'success',
        '/student'
    );

    RETURN jsonb_build_object('success', true, 'request_id', p_request_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Business Logic: Faculty Academic Rejection
CREATE OR REPLACE FUNCTION public.reject_faculty_academic_verification(
    p_request_id UUID,
    p_faculty_id UUID,
    p_category rejection_category_type,
    p_explanation TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_req RECORD;
BEGIN
    SELECT * INTO v_req FROM public.no_due_requests WHERE id = p_request_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Clearance request not found';
    END IF;

    IF p_category = 'other' AND (p_explanation IS NULL OR trim(p_explanation) = '') THEN
        RAISE EXCEPTION 'An explanation is mandatory when category "other" is selected.';
    END IF;

    UPDATE public.no_due_requests
    SET faculty_status = 'REJECTED',
        faculty_remarks = p_explanation,
        faculty_reviewed_at = timezone('utc'::text, now()),
        status = 'RESUBMISSION_REQUIRED',
        updated_at = timezone('utc'::text, now())
    WHERE id = p_request_id;

    -- Record in Rejection History
    INSERT INTO public.rejection_history (
        request_id,
        authority_or_stage,
        rejection_category,
        explanation,
        rejected_by,
        previous_status,
        resulting_status
    ) VALUES (
        p_request_id,
        'faculty',
        p_category,
        p_explanation,
        p_faculty_id,
        v_req.faculty_status::text,
        'REJECTED'
    );

    -- Audit log
    PERFORM public.log_audit_event(
        p_faculty_id,
        'faculty',
        'REJECT_ACADEMIC_VERIFICATION',
        'no_due_requests',
        p_request_id::text,
        jsonb_build_object('faculty_status', v_req.faculty_status),
        jsonb_build_object('faculty_status', 'REJECTED', 'category', p_category, 'explanation', p_explanation)
    );

    -- Notify Student
    PERFORM public.create_notification(
        v_req.student_id,
        'Academic Verification Action Required',
        'Academic verification rejected: ' || p_explanation || '. Please review corrective actions.',
        'action_required',
        '/student'
    );

    RETURN jsonb_build_object('success', true, 'request_id', p_request_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Business Logic: Clearance Authority Decision (Library, Accounts, Lab)
CREATE OR REPLACE FUNCTION public.process_clearance_decision(
    p_item_id UUID,
    p_reviewer_id UUID,
    p_decision TEXT, -- 'approve' or 'reject'
    p_remarks TEXT,
    p_rejection_category rejection_category_type DEFAULT NULL,
    p_payment_required BOOLEAN DEFAULT false,
    p_payment_amount NUMERIC DEFAULT NULL,
    p_payment_qr_id UUID DEFAULT NULL,
    p_payment_instructions TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_item RECORD;
    v_req RECORD;
    v_reviewer RECORD;
    v_all_approved BOOLEAN;
BEGIN
    SELECT * INTO v_item FROM public.clearance_items WHERE id = p_item_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Clearance item not found';
    END IF;

    SELECT * INTO v_req FROM public.no_due_requests WHERE id = v_item.request_id;

    -- Stage Dependency: Faculty verification must be approved first!
    IF v_req.faculty_status != 'APPROVED' THEN
        RAISE EXCEPTION 'Cannot review clearance: Faculty academic verification is not yet approved.';
    END IF;

    SELECT * INTO v_reviewer FROM public.profiles WHERE id = p_reviewer_id;

    -- Verify authorized role
    IF (v_item.authority = 'library' AND v_reviewer.role != 'library_staff') OR
       (v_item.authority = 'accounts' AND v_reviewer.role != 'accounts_staff') OR
       (v_item.authority = 'lab' AND v_reviewer.role != 'lab_staff') THEN
        IF v_reviewer.role != 'admin' THEN
            RAISE EXCEPTION 'Unauthorized: Your role cannot review this clearance authority.';
        END IF;
    END IF;

    IF p_decision = 'approve' THEN
        UPDATE public.clearance_items
        SET status = 'APPROVED',
            remarks = p_remarks,
            reviewed_by = p_reviewer_id,
            reviewed_at = timezone('utc'::text, now()),
            payment_status = 'NOT_REQUIRED',
            updated_at = timezone('utc'::text, now())
        WHERE id = p_item_id;

        IF v_item.authority = 'library' THEN
            UPDATE public.no_due_requests SET library_status = 'APPROVED' WHERE id = v_item.request_id;
        ELSIF v_item.authority = 'accounts' THEN
            UPDATE public.no_due_requests SET accounts_status = 'APPROVED' WHERE id = v_item.request_id;
        ELSIF v_item.authority = 'lab' THEN
            UPDATE public.no_due_requests SET lab_status = 'APPROVED' WHERE id = v_item.request_id;
        END IF;

        -- Check if all 3 clearances are now approved
        SELECT (
            COUNT(*) FILTER (WHERE status = 'APPROVED') = 3
        ) INTO v_all_approved
        FROM public.clearance_items
        WHERE request_id = v_item.request_id;

        -- If all 3 clearances AND faculty are approved, automatically advance to HOD review!
        IF v_all_approved AND v_req.faculty_status = 'APPROVED' THEN
            UPDATE public.no_due_requests
            SET status = 'HOD_REVIEW',
                updated_at = timezone('utc'::text, now())
            WHERE id = v_item.request_id;

            -- Notify HOD
            INSERT INTO public.notifications (recipient_id, title, message, type, link)
            SELECT id, 'Request Awaiting HOD Final Clearance Review', 
                   'Request ' || v_req.request_code || ' has passed all 4 clearances and is awaiting final HOD review.',
                   'action_required', '/hod'
            FROM public.profiles WHERE role = 'hod' AND department = v_req.department
            LIMIT 1;
        END IF;

        -- Notify Student
        PERFORM public.create_notification(
            v_req.student_id,
            initcap(v_item.authority::text) || ' Clearance Approved',
            'Your ' || v_item.authority::text || ' clearance has been approved.',
            'success',
            '/student'
        );

    ELSIF p_decision = 'reject' THEN
        IF p_rejection_category IS NULL THEN
            RAISE EXCEPTION 'Rejection category is mandatory';
        END IF;

        IF p_rejection_category = 'other' AND (p_remarks IS NULL OR trim(p_remarks) = '') THEN
            RAISE EXCEPTION 'Explanation is mandatory when category "other" is selected.';
        END IF;

        IF p_payment_required THEN
            IF p_payment_amount IS NULL OR p_payment_amount <= 0 THEN
                RAISE EXCEPTION 'A positive payment amount is required when payment is requested.';
            END IF;
            IF p_payment_qr_id IS NULL THEN
                RAISE EXCEPTION 'A configured payment QR must be selected.';
            END IF;
        END IF;

        UPDATE public.clearance_items
        SET status = 'REJECTED',
            remarks = p_remarks,
            reviewed_by = p_reviewer_id,
            reviewed_at = timezone('utc'::text, now()),
            payment_required = p_payment_required,
            payment_amount = p_payment_amount,
            payment_qr_id = p_payment_qr_id,
            payment_instructions = p_payment_instructions,
            payment_status = CASE WHEN p_payment_required THEN 'PENDING_PAYMENT'::payment_status ELSE 'NOT_REQUIRED'::payment_status END,
            updated_at = timezone('utc'::text, now())
        WHERE id = p_item_id;

        IF v_item.authority = 'library' THEN
            UPDATE public.no_due_requests SET library_status = 'REJECTED', status = 'ACTION_REQUIRED' WHERE id = v_item.request_id;
        ELSIF v_item.authority = 'accounts' THEN
            UPDATE public.no_due_requests SET accounts_status = 'REJECTED', status = 'ACTION_REQUIRED' WHERE id = v_item.request_id;
        ELSIF v_item.authority = 'lab' THEN
            UPDATE public.no_due_requests SET lab_status = 'REJECTED', status = 'ACTION_REQUIRED' WHERE id = v_item.request_id;
        END IF;

        INSERT INTO public.rejection_history (
            request_id,
            clearance_item_id,
            authority_or_stage,
            rejection_category,
            explanation,
            payment_required,
            payment_amount,
            rejected_by,
            previous_status,
            resulting_status
        ) VALUES (
            v_item.request_id,
            p_item_id,
            v_item.authority::text,
            p_rejection_category,
            p_remarks,
            p_payment_required,
            p_payment_amount,
            p_reviewer_id,
            v_item.status::text,
            'REJECTED'
        );

        -- Notify Student
        PERFORM public.create_notification(
            v_req.student_id,
            initcap(v_item.authority::text) || ' Clearance Action Required',
            'Your ' || v_item.authority::text || ' clearance was rejected: ' || p_remarks || 
            CASE WHEN p_payment_required THEN ' (Payment required: ₹' || p_payment_amount::text || ')' ELSE '' END,
            'action_required',
            '/student'
        );
    ELSE
        RAISE EXCEPTION 'Invalid decision. Must be approve or reject.';
    END IF;

    -- Audit log
    PERFORM public.log_audit_event(
        p_reviewer_id,
        v_reviewer.role::text,
        'CLEARANCE_DECISION_' || upper(p_decision),
        'clearance_items',
        p_item_id::text,
        jsonb_build_object('status', v_item.status),
        jsonb_build_object('status', p_decision, 'remarks', p_remarks, 'payment_required', p_payment_required)
    );

    RETURN jsonb_build_object('success', true, 'item_id', p_item_id, 'decision', p_decision);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Business Logic: Student Submits Payment Evidence (Section 9)
CREATE OR REPLACE FUNCTION public.submit_payment_evidence(
    p_clearance_item_id UUID,
    p_student_id UUID,
    p_amount NUMERIC,
    p_screenshot_url TEXT,
    p_transaction_ref TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_item RECORD;
    v_req RECORD;
    v_sub_id UUID;
BEGIN
    SELECT * INTO v_item FROM public.clearance_items WHERE id = p_clearance_item_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Clearance item not found';
    END IF;

    SELECT * INTO v_req FROM public.no_due_requests WHERE id = v_item.request_id;
    IF v_req.student_id != p_student_id THEN
        RAISE EXCEPTION 'Unauthorized: You can only upload payment evidence for your own clearance item.';
    END IF;

    IF NOT v_item.payment_required THEN
        RAISE EXCEPTION 'Payment is not required for this clearance item.';
    END IF;

    INSERT INTO public.payment_submissions (
        clearance_item_id,
        request_id,
        student_id,
        authority,
        amount,
        screenshot_url,
        transaction_reference,
        student_notes,
        verification_status
    ) VALUES (
        p_clearance_item_id,
        v_item.request_id,
        p_student_id,
        v_item.authority,
        p_amount,
        p_screenshot_url,
        p_transaction_ref,
        p_notes,
        'PENDING_REVIEW'
    ) RETURNING id INTO v_sub_id;

    UPDATE public.clearance_items
    SET payment_status = 'PENDING_REVIEW',
        updated_at = timezone('utc'::text, now())
    WHERE id = p_clearance_item_id;

    UPDATE public.no_due_requests
    SET status = 'PAYMENT_VERIFICATION_PENDING',
        updated_at = timezone('utc'::text, now())
    WHERE id = v_item.request_id;

    -- Audit log
    PERFORM public.log_audit_event(
        p_student_id,
        'student',
        'UPLOAD_PAYMENT_EVIDENCE',
        'payment_submissions',
        v_sub_id::text,
        NULL,
        jsonb_build_object('amount', p_amount, 'authority', v_item.authority)
    );

    RETURN jsonb_build_object('success', true, 'submission_id', v_sub_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Business Logic: Payment Evidence Review (Section 9)
CREATE OR REPLACE FUNCTION public.review_payment_evidence(
    p_submission_id UUID,
    p_reviewer_id UUID,
    p_confirm BOOLEAN,
    p_remarks TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_sub RECORD;
    v_item RECORD;
    v_req RECORD;
    v_reviewer RECORD;
BEGIN
    SELECT * INTO v_sub FROM public.payment_submissions WHERE id = p_submission_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payment submission not found';
    END IF;

    SELECT * INTO v_item FROM public.clearance_items WHERE id = v_sub.clearance_item_id;
    SELECT * INTO v_req FROM public.no_due_requests WHERE id = v_sub.request_id;
    SELECT * INTO v_reviewer FROM public.profiles WHERE id = p_reviewer_id;

    IF p_confirm THEN
        UPDATE public.payment_submissions
        SET verification_status = 'CONFIRMED',
            reviewer_remarks = p_remarks,
            verified_by = p_reviewer_id,
            verified_at = timezone('utc'::text, now())
        WHERE id = p_submission_id;

        -- Rule 9: Payment confirmation must never automatically approve the clearance.
        -- Returns clearance to PENDING for original authority to do separate clearance review!
        UPDATE public.clearance_items
        SET payment_status = 'CONFIRMED',
            status = 'PENDING',
            updated_at = timezone('utc'::text, now())
        WHERE id = v_sub.clearance_item_id;

        IF v_item.authority = 'library' THEN
            UPDATE public.no_due_requests SET library_status = 'PENDING' WHERE id = v_item.request_id;
        ELSIF v_item.authority = 'accounts' THEN
            UPDATE public.no_due_requests SET accounts_status = 'PENDING' WHERE id = v_item.request_id;
        ELSIF v_item.authority = 'lab' THEN
            UPDATE public.no_due_requests SET lab_status = 'PENDING' WHERE id = v_item.request_id;
        END IF;

        UPDATE public.no_due_requests
        SET status = 'IN_REVIEW',
            updated_at = timezone('utc'::text, now())
        WHERE id = v_item.request_id;

        -- Notify Student
        PERFORM public.create_notification(
            v_req.student_id,
            'Payment Evidence Confirmed',
            'Your payment evidence for ' || v_item.authority::text || ' has been confirmed. Clearance returned to Pending for final sign-off.',
            'info',
            '/student'
        );
    ELSE
        UPDATE public.payment_submissions
        SET verification_status = 'REJECTED',
            reviewer_remarks = p_remarks,
            verified_by = p_reviewer_id,
            verified_at = timezone('utc'::text, now())
        WHERE id = p_submission_id;

        UPDATE public.clearance_items
        SET payment_status = 'REJECTED',
            updated_at = timezone('utc'::text, now())
        WHERE id = v_sub.clearance_item_id;

        UPDATE public.no_due_requests
        SET status = 'ACTION_REQUIRED',
            updated_at = timezone('utc'::text, now())
        WHERE id = v_item.request_id;

        -- Notify Student
        PERFORM public.create_notification(
            v_req.student_id,
            'Payment Evidence Rejected',
            'Your payment evidence for ' || v_item.authority::text || ' was rejected: ' || COALESCE(p_remarks, 'Please re-upload valid evidence.'),
            'action_required',
            '/student'
        );
    END IF;

    -- Audit log
    PERFORM public.log_audit_event(
        p_reviewer_id,
        v_reviewer.role::text,
        CASE WHEN p_confirm THEN 'CONFIRM_PAYMENT_EVIDENCE' ELSE 'REJECT_PAYMENT_EVIDENCE' END,
        'payment_submissions',
        p_submission_id::text,
        NULL,
        jsonb_build_object('confirmed', p_confirm, 'remarks', p_remarks)
    );

    RETURN jsonb_build_object('success', true, 'confirmed', p_confirm);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Business Logic: HOD Final Clearance Review & Verification ID Issuance (Section 6 & 14)
CREATE OR REPLACE FUNCTION public.process_hod_final_clearance(
    p_request_id UUID,
    p_hod_id UUID,
    p_decision TEXT,
    p_remarks TEXT,
    p_rejection_category rejection_category_type DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_req RECORD;
    v_hod RECORD;
    v_student RECORD;
    v_unique_verification_id TEXT;
BEGIN
    SELECT * INTO v_req FROM public.no_due_requests WHERE id = p_request_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Clearance request not found';
    END IF;

    SELECT * INTO v_hod FROM public.profiles WHERE id = p_hod_id;
    IF v_hod.role != 'hod' AND v_hod.role != 'admin' THEN
        RAISE EXCEPTION 'Unauthorized: Only Head of Department can perform final clearance review.';
    END IF;

    SELECT * INTO v_student FROM public.profiles WHERE id = v_req.student_id;

    IF p_decision = 'approve' THEN
        -- Rule 4 & 6: HOD approval is strictly impossible until ALL 4 preceding clearances are approved!
        IF v_req.faculty_status != 'APPROVED' THEN
            RAISE EXCEPTION 'Precondition Failed: Faculty academic verification must be Approved.';
        END IF;

        IF v_req.library_status != 'APPROVED' THEN
            RAISE EXCEPTION 'Precondition Failed: Central Library clearance must be Approved.';
        END IF;

        IF v_req.accounts_status != 'APPROVED' THEN
            RAISE EXCEPTION 'Precondition Failed: Accounts clearance must be Approved.';
        END IF;

        IF v_req.lab_status != 'APPROVED' THEN
            RAISE EXCEPTION 'Precondition Failed: Laboratory clearance must be Approved.';
        END IF;

        -- Generate unique Verification ID (Format: CIT-VTU-2026-XXXXXXXX)
        v_unique_verification_id := 'CIT-VTU-2026-' || upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));

        -- Update request
        UPDATE public.no_due_requests
        SET status = 'CLEARED',
            hod_status = 'APPROVED',
            hod_remarks = p_remarks,
            hod_reviewed_at = timezone('utc'::text, now()),
            verification_id = v_unique_verification_id,
            cleared_at = timezone('utc'::text, now()),
            hall_ticket_eligibility = 'ELIGIBLE',
            hall_ticket_status = 'NOT YET RELEASED',
            updated_at = timezone('utc'::text, now())
        WHERE id = p_request_id;

        -- Create minimal authoritative public verification record (Section 10 & 11)
        INSERT INTO public.verification_records (
            verification_id,
            request_id,
            request_code,
            student_id_masked,
            student_name,
            department,
            academic_year,
            semester,
            status,
            cleared_at,
            hall_ticket_eligibility,
            hall_ticket_status,
            college_name,
            university
        ) VALUES (
            v_unique_verification_id,
            p_request_id,
            v_req.request_code,
            CASE 
                WHEN length(COALESCE(v_student.student_id, '')) > 5 THEN
                    substring(v_student.student_id from 1 for 3) || '***' || substring(v_student.student_id from length(v_student.student_id)-2)
                ELSE 'STU***01'
            END,
            v_student.full_name,
            v_req.department,
            v_req.academic_year,
            v_req.semester,
            'NO-DUE CLEARED',
            timezone('utc'::text, now()),
            'ELIGIBLE',
            'NOT YET RELEASED',
            'Cauvery Institute of Technology',
            'VTU'
        );

        -- Audit log
        PERFORM public.log_audit_event(
            p_hod_id,
            'hod',
            'FINAL_NO_DUE_CLEARED',
            'no_due_requests',
            p_request_id::text,
            jsonb_build_object('status', v_req.status),
            jsonb_build_object('status', 'CLEARED', 'verification_id', v_unique_verification_id, 'hall_ticket', 'ELIGIBLE')
        );

        -- Notify Student
        PERFORM public.create_notification(
            v_req.student_id,
            '🎉 NO-DUE CLEARED! Final Clearance Granted',
            'Congratulations! Your No-Due Clearance has been granted by Head of Department. Verification ID: ' || v_unique_verification_id || '. Hall Ticket Eligibility: ELIGIBLE.',
            'success',
            '/student'
        );

        RETURN jsonb_build_object(
            'success', true,
            'status', 'CLEARED',
            'verification_id', v_unique_verification_id,
            'hall_ticket_eligibility', 'ELIGIBLE'
        );

    ELSIF p_decision = 'reject' THEN
        IF p_rejection_category IS NULL THEN
            RAISE EXCEPTION 'Rejection category is mandatory';
        END IF;

        IF p_rejection_category = 'other' AND (p_remarks IS NULL OR trim(p_remarks) = '') THEN
            RAISE EXCEPTION 'Explanation is mandatory when category "other" is selected.';
        END IF;

        UPDATE public.no_due_requests
        SET status = 'REJECTED',
            hod_status = 'REJECTED',
            hod_remarks = p_remarks,
            hod_reviewed_at = timezone('utc'::text, now()),
            updated_at = timezone('utc'::text, now())
        WHERE id = p_request_id;

        INSERT INTO public.rejection_history (
            request_id,
            authority_or_stage,
            rejection_category,
            explanation,
            rejected_by,
            previous_status,
            resulting_status
        ) VALUES (
            p_request_id,
            'hod',
            p_rejection_category,
            p_remarks,
            p_hod_id,
            v_req.hod_status::text,
            'REJECTED'
        );

        PERFORM public.create_notification(
            v_req.student_id,
            'Final Clearance Rejected by HOD',
            'Your final clearance was rejected by HOD: ' || p_remarks,
            'action_required',
            '/student'
        );

        RETURN jsonb_build_object('success', true, 'status', 'REJECTED');
    ELSE
        RAISE EXCEPTION 'Invalid decision';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Business Logic: Same-Request Resubmission (Section 8)
CREATE OR REPLACE FUNCTION public.resubmit_clearance_request(
    p_request_id UUID,
    p_student_id UUID,
    p_comments TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_req RECORD;
BEGIN
    SELECT * INTO v_req FROM public.no_due_requests WHERE id = p_request_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Clearance request not found';
    END IF;

    IF v_req.student_id != p_student_id THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    IF v_req.status NOT IN ('ACTION_REQUIRED', 'RESUBMISSION_REQUIRED', 'REJECTED') THEN
        RAISE EXCEPTION 'Request is not currently in a resubmittable state';
    END IF;

    -- Record in Resubmission History on SAME request ID
    INSERT INTO public.resubmission_history (
        request_id,
        student_id,
        resubmitted_stage,
        student_comments
    ) VALUES (
        p_request_id,
        p_student_id,
        v_req.status::text,
        p_comments
    );

    -- Reset status: reopen only affected clearances while preserving valid approvals!
    IF v_req.faculty_status = 'REJECTED' THEN
        UPDATE public.no_due_requests
        SET faculty_status = 'PENDING',
            status = 'SUBMITTED',
            updated_at = timezone('utc'::text, now())
        WHERE id = p_request_id;
    ELSE
        UPDATE public.clearance_items
        SET status = 'PENDING',
            updated_at = timezone('utc'::text, now())
        WHERE request_id = p_request_id AND status = 'REJECTED';

        UPDATE public.no_due_requests
        SET status = 'IN_REVIEW',
            updated_at = timezone('utc'::text, now())
        WHERE id = p_request_id;
    END IF;

    -- Audit log
    PERFORM public.log_audit_event(
        p_student_id,
        'student',
        'RESUBMIT_REQUEST',
        'no_due_requests',
        p_request_id::text,
        jsonb_build_object('previous_status', v_req.status),
        jsonb_build_object('comments', p_comments)
    );

    RETURN jsonb_build_object('success', true, 'message', 'Request successfully resubmitted on same request ID');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Public Verification Helper (Section 10 & Rule 2.11)
CREATE OR REPLACE FUNCTION public.get_public_verification_record(p_verification_id TEXT)
RETURNS TABLE (
    verification_id TEXT,
    request_code TEXT,
    student_name TEXT,
    student_id_masked TEXT,
    department TEXT,
    academic_year TEXT,
    semester INTEGER,
    status TEXT,
    cleared_at TIMESTAMPTZ,
    hall_ticket_eligibility TEXT,
    hall_ticket_status TEXT,
    college_name TEXT,
    university TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        v.verification_id,
        v.request_code,
        v.student_name,
        v.student_id_masked,
        v.department,
        v.academic_year,
        v.semester,
        v.status,
        v.cleared_at,
        v.hall_ticket_eligibility,
        v.hall_ticket_status,
        v.college_name,
        v.university
    FROM public.verification_records v
    WHERE v.verification_id = p_verification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. Enable Row Level Security (RLS) on all exposed tables
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_academic_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_qr_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.no_due_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clearance_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rejection_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resubmission_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 14. RLS Policies
-- Departments & Academic Periods: Read for all authenticated, write for admin
CREATE POLICY "Anyone can view active departments" ON public.departments
FOR SELECT USING (is_active = true OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admin manages departments" ON public.departments
FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Anyone can view active academic periods" ON public.academic_periods
FOR SELECT USING (is_active = true OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admin manages academic periods" ON public.academic_periods
FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Profiles:
CREATE POLICY "Users can view active profiles" ON public.profiles
FOR SELECT USING (is_active = true);

CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE USING (auth.uid() = id);

-- Section 22: Allow students to create their own student profile during registration, strictly enforcing student role
CREATE POLICY "Students can insert own student profile" ON public.profiles
FOR INSERT WITH CHECK (auth.uid() = id AND role = 'student');

-- System Settings:
CREATE POLICY "Anyone can view system settings" ON public.system_settings
FOR SELECT USING (true);

CREATE POLICY "Only admin can update system settings" ON public.system_settings
FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Academic Records:
CREATE POLICY "Students can view own academic record" ON public.student_academic_records
FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Faculty can view and manage assigned student academic records" ON public.student_academic_records
FOR ALL USING (
    faculty_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'hod'))
);

-- Payment QR Configs:
CREATE POLICY "Authenticated users view active QRs" ON public.payment_qr_configs
FOR SELECT USING (is_active = true OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admin manages payment QRs" ON public.payment_qr_configs
FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Clearance Requests:
CREATE POLICY "Students can view own requests" ON public.no_due_requests
FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Students can insert own requests" ON public.no_due_requests
FOR INSERT WITH CHECK (student_id = auth.uid());

CREATE POLICY "Staff can view requests within scope" ON public.no_due_requests
FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role != 'student')
);

-- Clearance Items:
CREATE POLICY "Students can view clearance items for their requests" ON public.clearance_items
FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.no_due_requests WHERE id = clearance_items.request_id AND student_id = auth.uid())
);

CREATE POLICY "Library staff can manage library items" ON public.clearance_items
FOR ALL USING (authority = 'library' AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'library_staff'));

CREATE POLICY "Accounts staff can manage accounts items" ON public.clearance_items
FOR ALL USING (authority = 'accounts' AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'accounts_staff'));

CREATE POLICY "Lab staff can manage lab items" ON public.clearance_items
FOR ALL USING (authority = 'lab' AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'lab_staff'));

CREATE POLICY "Admin and HOD can view all clearance items" ON public.clearance_items
FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'hod')));

-- Payment Submissions:
CREATE POLICY "Students view and insert own payment submissions" ON public.payment_submissions
FOR ALL USING (student_id = auth.uid());

CREATE POLICY "Staff can view and review payment submissions" ON public.payment_submissions
FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role != 'student'));

-- Verification Records (Public Select Allowed for Minimal Verification):
CREATE POLICY "Public can view verification records" ON public.verification_records
FOR SELECT USING (true);

-- Rejections & Resubmissions:
CREATE POLICY "View rejection history" ON public.rejection_history
FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.no_due_requests WHERE id = rejection_history.request_id AND student_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role != 'student')
);

CREATE POLICY "View resubmission history" ON public.resubmission_history
FOR SELECT USING (
    student_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role != 'student')
);

-- Audit Logs:
CREATE POLICY "Only admin can view audit logs" ON public.audit_logs
FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Notifications:
CREATE POLICY "Users view and update own notifications" ON public.notifications
FOR ALL USING (recipient_id = auth.uid());
