-- ==============================================================================
-- COLLEGE NO-DUE CLEARANCE MANAGEMENT SYSTEM
-- Migration 03: Storage Buckets & Reference Seed Data
-- ==============================================================================

-- 1. Storage Buckets Creation
INSERT INTO storage.buckets (id, name, public)
VALUES 
    ('payment_evidence', 'payment_evidence', false),
    ('qr_codes', 'qr_codes', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies for payment_evidence (Private Bucket)
CREATE POLICY "Students can upload payment evidence"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'payment_evidence');

CREATE POLICY "Staff and Students can view payment evidence"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'payment_evidence');

-- Storage Policies for qr_codes (Public Read, Admin Write)
CREATE POLICY "Public can view QR codes"
ON storage.objects FOR SELECT
USING (bucket_id = 'qr_codes');

CREATE POLICY "Admin can manage QR codes"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'qr_codes' AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- 2. Initial Payment QR Configurations
INSERT INTO public.payment_qr_configs (id, authority, title, upi_id, account_details, qr_image_url, instructions, is_active)
VALUES
    (
        '11111111-1111-1111-1111-111111111111',
        'library',
        'Central Library Fine Collection Desk',
        'mitlibrary@collegeupi',
        'A/C: 98765432101, IFSC: MITB0001234, Bank: State College Bank',
        'https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=upi://pay?pa=mitlibrary@collegeupi&pn=Central+Library+Dues',
        'Scan QR using any UPI app (GPay, PhonePe, Paytm). Mention your Student ID in the transaction note. Keep the payment screenshot ready for upload.',
        true
    ),
    (
        '22222222-2222-2222-2222-222222222222',
        'accounts',
        'Office of Finance & Student Accounts',
        'mitaccounts@collegeupi',
        'A/C: 98765432102, IFSC: MITB0001234, Bank: State College Bank',
        'https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=upi://pay?pa=mitaccounts@collegeupi&pn=Accounts+Office+Tuition+Dues',
        'Scan to pay pending semester fees, hostel dues, or examination fees. Upload transaction screenshot with UTR number visible.',
        true
    ),
    (
        '33333333-3333-3333-3333-333333333333',
        'lab',
        'Department Laboratories Breakage & Consumables Counter',
        'mitlabs@collegeupi',
        'A/C: 98765432103, IFSC: MITB0001234, Bank: State College Bank',
        'https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=upi://pay?pa=mitlabs@collegeupi&pn=Laboratory+Equipment+Dues',
        'Scan to settle laboratory breakage or consumable dues. Upload receipt or UPI confirmation screenshot.',
        true
    )
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    upi_id = EXCLUDED.upi_id,
    instructions = EXCLUDED.instructions;
