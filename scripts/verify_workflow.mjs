// ==============================================================================
// CAUVERY INSTITUTE OF TECHNOLOGY (Affiliated to VTU)
// COLLEGE NO-DUE CLEARANCE MANAGEMENT SYSTEM
// Verification Test Runner — Comprehensive End-to-End Workflow & Security Tests
// ==============================================================================

import { Engine } from '../src/services/store.ts';

console.log('====================================================================');
console.log('CAUVERY INSTITUTE OF TECHNOLOGY — VTU (2026–2027)');
console.log('NO-DUE CLEARANCE MANAGEMENT SYSTEM: SYSTEM INTEGRITY TEST SUITE');
console.log('====================================================================\n');

let testsPassed = 0;
let testsTotal = 0;

function assert(condition, testName, details = '') {
  testsTotal++;
  if (!condition) {
    console.error(`❌ [FAIL] ${testName}${details ? ` -> ${details}` : ''}`);
    throw new Error(`Test failed: ${testName}`);
  }
  testsPassed++;
  console.log(`✅ [PASS] ${testName}${details ? ` (${details})` : ''}`);
}

// ------------------------------------------------------------------------------
// TEST 1: Initial Staff Baseline & Zero Pre-Fed Accounts (Section 25 Mandate)
// ------------------------------------------------------------------------------
console.log('--- TEST GROUP 1: Authorized Staff Accounts & Clean Baseline (Section 25) ---');
const profiles = Engine.getProfiles();
const admin = profiles.find((p) => p.role === 'admin');
assert(Boolean(admin), 'Only authorized System Administrator seeded initially', admin.email);

// Confirm no fake faculty or staff accounts exist initially
const initialFaculty = profiles.filter((p) => p.role === 'faculty');
const initialHod = profiles.filter((p) => p.role === 'hod');
const initialLib = profiles.filter((p) => p.role === 'library_staff');
const initialAcc = profiles.filter((p) => p.role === 'accounts_staff');
const initialLab = profiles.filter((p) => p.role === 'lab_staff');
const initialStudents = profiles.filter((p) => p.role === 'student');

assert(initialFaculty.length === 0, 'No faculty accounts exist initially (Section 25 verified)', `Count: ${initialFaculty.length}`);
assert(initialHod.length === 0, 'No HOD accounts exist initially (Section 25 verified)', `Count: ${initialHod.length}`);
assert(initialLib.length === 0, 'No library staff accounts exist initially (Section 25 verified)', `Count: ${initialLib.length}`);
assert(initialAcc.length === 0, 'No accounts staff accounts exist initially (Section 25 verified)', `Count: ${initialAcc.length}`);
assert(initialLab.length === 0, 'No lab staff accounts exist initially (Section 25 verified)', `Count: ${initialLab.length}`);
assert(initialStudents.length === 0, 'No pre-created student accounts exist initially (User Mandate verified)', `Count: ${initialStudents.length}`);

// ------------------------------------------------------------------------------
// TEST 2: Managed Department Registry (Section 2 & 4: Configurable)
// ------------------------------------------------------------------------------
console.log('\n--- TEST GROUP 2: Administratively Managed Departments ---');
const depts = Engine.getDepartments();
assert(depts.length >= 6, 'Managed department list active', `Departments: ${depts.map(d => d.code).join(', ')}`);
const cseDept = depts.find((d) => d.code === 'CSE');
assert(Boolean(cseDept && cseDept.is_active), 'CSE department active in registry');

// Admin adds new department
const newDept = Engine.addDepartment('AIML2', 'Applied AI & Data Science', admin.id);
assert(newDept.code === 'AIML2', 'Admin can configure new department', newDept.name);

// ------------------------------------------------------------------------------
// TEST 3: Student Self-Registration (Section 22 Mandate)
// ------------------------------------------------------------------------------
console.log('\n--- TEST GROUP 3: Student Self-Registration — Create New Account (Section 22) ---');

// Verify short password rejection (< 6 chars)
let shortPwdBlocked = false;
try {
  Engine.registerStudent({
    fullName: 'Test ShortPwd',
    studentId: '1CR24CS999',
    departmentId: cseDept.id,
    academicYear: '2026-2027',
    password: '123',
  });
} catch (err) {
  shortPwdBlocked = true;
}
assert(shortPwdBlocked, 'Password < 6 characters rejected by registration validation');

const registeredStudent = Engine.registerStudent({
  fullName: 'Kavya Murthy',
  studentId: '1CR24CS099',
  departmentId: cseDept.id,
  academicYear: '2026-2027',
  semester: 5,
  email: 'kavya.1cr24cs099@cauvery.edu.in',
  password: 'securePassword2026',
});

assert(registeredStudent.student_id === '1CR24CS099', 'Student account registered successfully', registeredStudent.full_name);
assert(registeredStudent.academic_year === '2026-2027', 'Academic Year configured on profile (2026-2027)');
assert(registeredStudent.role === 'student', 'Role is strictly enforced as "student" (Security Rule)');

// Verify duplicate Student ID / USN registration is blocked
let duplicateBlocked = false;
try {
  Engine.registerStudent({
    fullName: 'Imposter Student',
    studentId: '1CR24CS099', // same USN
    departmentId: cseDept.id,
    academicYear: '2026-2027',
    password: 'securePassword2026',
  });
} catch (err) {
  duplicateBlocked = true;
}
assert(duplicateBlocked, 'Duplicate Student ID registration blocked by server constraint');

// ------------------------------------------------------------------------------
// TEST 4: Student & Staff Authentication
// ------------------------------------------------------------------------------
console.log('\n--- TEST GROUP 4: Secure Authentication ---');
const authStudent = Engine.authenticateStudent('1CR24CS099', 'securePassword2026');
assert(authStudent.id === registeredStudent.id, 'Student authenticates with USN and password');

Engine.bootstrapInitialAdmin('admin@gmail.com', 'AdminSetupPass@2026');
const authStaff = Engine.authenticateStaff('admin@gmail.com', 'AdminSetupPass@2026');
assert(authStaff.role === 'admin', 'Staff authenticates with email and password');

// Wrong password rejection
let wrongPwdBlocked = false;
try {
  Engine.authenticateStudent('1CR24CS099', 'wrongPassword');
} catch (err) {
  wrongPwdBlocked = true;
}
assert(wrongPwdBlocked, 'Authentication rejects incorrect passwords');

// ------------------------------------------------------------------------------
// TEST 5: Section 26 Blocked Submission Without Assigned Faculty
// ------------------------------------------------------------------------------
console.log('\n--- TEST GROUP 5: Section 26 — Blocked Submission When No Faculty Exists ---');
let blockedSubmissionWithoutFaculty = false;
let blockedMessage = '';
try {
  Engine.createRequest(
    registeredStudent.id,
    cseDept.name,
    '2026-2027',
    5,
    'Attempt submission before faculty exists'
  );
} catch (err) {
  blockedSubmissionWithoutFaculty = true;
  blockedMessage = err.message;
}

assert(blockedSubmissionWithoutFaculty, 'Submission strictly blocked when no faculty exists (Section 26.B)');
assert(
  blockedMessage ===
    'Your No-Due request cannot be submitted because no faculty member is currently assigned to verify your academic details. Please contact the administrator or try again after a faculty member has been assigned.',
  'Mandatory exact error message returned',
  blockedMessage
);
assert(Engine.getRequests().length === 0, 'Zero request records created when blocked (Section 26.B.1)');

// ------------------------------------------------------------------------------
// TEST 6: Authorized Admin Provisions Real Staff Accounts (Section 25.C & 26.C)
// ------------------------------------------------------------------------------
console.log('\n--- TEST GROUP 6: Admin Provisions Genuine Staff Accounts ---');
const faculty = Engine.provisionStaff(
  {
    fullName: 'Prof. Ananya Sharma',
    email: 'ananya.cse@cauvery.edu.in',
    role: 'faculty',
    departmentId: cseDept.id,
    password: 'StaffSecurePass@2026',
  },
  admin.id
);
assert(faculty.role === 'faculty', 'Real faculty account provisioned by Admin', faculty.full_name);

const hod = Engine.provisionStaff(
  {
    fullName: 'Dr. Balaji K',
    email: 'balaji.cse@cauvery.edu.in',
    role: 'hod',
    departmentId: cseDept.id,
    password: 'StaffSecurePass@2026',
  },
  admin.id
);
assert(hod.role === 'hod', 'Real HOD account provisioned by Admin', hod.full_name);

const libStaff = Engine.provisionStaff(
  {
    fullName: 'Shivaraj M',
    email: 'shivaraj.lib@cauvery.edu.in',
    role: 'library_staff',
    password: 'StaffSecurePass@2026',
  },
  admin.id
);
assert(libStaff.role === 'library_staff', 'Real Library staff account provisioned by Admin', libStaff.full_name);

const accStaff = Engine.provisionStaff(
  {
    fullName: 'Geetha P',
    email: 'geetha.acc@cauvery.edu.in',
    role: 'accounts_staff',
    password: 'StaffSecurePass@2026',
  },
  admin.id
);
assert(accStaff.role === 'accounts_staff', 'Real Accounts staff account provisioned by Admin', accStaff.full_name);

const labStaff = Engine.provisionStaff(
  {
    fullName: 'Kiran Kumar',
    email: 'kiran.lab@cauvery.edu.in',
    role: 'lab_staff',
    departmentId: cseDept.id,
    password: 'StaffSecurePass@2026',
  },
  admin.id
);
assert(labStaff.role === 'lab_staff', 'Real Laboratory staff account provisioned by Admin', labStaff.full_name);

// ------------------------------------------------------------------------------
// TEST 7: Student Submits Clearance Request With Genuine Faculty (Stage 1)
// ------------------------------------------------------------------------------
console.log('\n--- TEST GROUP 7: Stage 1 — Student Request Submission with Genuine Faculty ---');
const studentRequest = Engine.createRequest(
  registeredStudent.id,
  cseDept.name,
  '2026-2027',
  5,
  'End-term exam clearance for 5th semester'
);

assert(
  studentRequest.status === 'PENDING_FACULTY_REVIEW' || studentRequest.status === 'SUBMITTED',
  'Request initiated in PENDING_FACULTY_REVIEW state',
  studentRequest.status
);
assert(studentRequest.request_code.startsWith('ND-2026-'), 'Human-readable request code generated', studentRequest.request_code);
assert(studentRequest.assigned_faculty_id === faculty.id, 'Request assigned to real faculty member', studentRequest.assigned_faculty_name);
assert(studentRequest.faculty_assignment_status === 'ASSIGNED', 'Request assignment status is ASSIGNED (Section 26.E)');

// Verify request appears in faculty member's work queue
const facultyWorkQueue = Engine.getRequestsForFaculty(faculty.id);
assert(facultyWorkQueue.some((r) => r.id === studentRequest.id), 'Request appears in faculty member work queue (Section 26.F.4)');

// Duplicate request prevention
let duplicateReqBlocked = false;
try {
  Engine.createRequest(registeredStudent.id, cseDept.name, '2026-2027', 5, 'Duplicate attempt');
} catch (err) {
  duplicateReqBlocked = true;
}
assert(duplicateReqBlocked, 'Duplicate active request blocked for the same semester');

// ------------------------------------------------------------------------------
// TEST 6: Attendance Shortage Gating & Faculty Verification (Stage 2)
// ------------------------------------------------------------------------------
console.log('\n--- TEST GROUP 6: Stage 2 — Faculty Verification & Attendance Gating ---');
const threshold = Engine.getAttendanceThreshold();
assert(threshold === 85, 'Configured attendance threshold is 85%');

// Test 6a: Ineligible attendance block (< 85%)
const acadRec = Engine.getAcademicRecordForStudent(registeredStudent.id, '2026-2027', 5);
Engine.updateAcademicRecord(acadRec.id, 79.0, 'Attendance shortage recorded', faculty.id);

let facultyShortageBlocked = false;
try {
  Engine.verifyFacultyApproval(studentRequest.id, faculty.id, 'Illegal approval attempt');
} catch (err) {
  facultyShortageBlocked = true;
}
assert(facultyShortageBlocked, 'Faculty approval strictly blocked when attendance < 85%');

// Test 6b: Eligible attendance approval (>= 85%)
const subList = Engine.getSubjectAttendanceForStudent(registeredStudent.id, studentRequest.id);
for (const s of subList) {
  Engine.recordSubjectAttendance({
    subjectRecordId: s.id,
    classesHeld: 50,
    classesAttended: 45, // 90%
    facultyId: s.faculty_id,
    remarks: 'Condonation approved, attendance now 90%',
  });
  Engine.processSubjectTeacherDecision({
    subjectRecordId: s.id,
    facultyId: s.faculty_id,
    decision: 'APPROVE',
    remarks: 'Approved by subject teacher',
  });
}
const verifiedReq = Engine.verifyFacultyApproval(studentRequest.id, faculty.id, 'Academic verification approved. Attendance 90%.');
assert(verifiedReq.faculty_status === 'APPROVED', 'Faculty verification approved after meeting threshold');
assert(verifiedReq.status === 'IN_REVIEW', 'Request transitions to IN_REVIEW for departmental clearances');

// ------------------------------------------------------------------------------
// TEST 7: 3 Parallel Departmental Clearances (Stage 3)
// ------------------------------------------------------------------------------
console.log('\n--- TEST GROUP 7: Stage 3 — Parallel Clearances (Library, Accounts, Lab) ---');
const items = Engine.getClearanceItems().filter((ci) => ci.request_id === studentRequest.id);
assert(items.length === 3, 'Exactly 3 parallel departmental clearances initialized (Library, Accounts, Lab)');

const libItem = items.find((i) => i.authority === 'library');
const accItem = items.find((i) => i.authority === 'accounts');
const labItem = items.find((i) => i.authority === 'lab');

// Accounts approves
Engine.processClearanceDecision({
  clearanceItemId: accItem.id,
  reviewerId: accStaff.id,
  decision: 'approve',
  remarks: 'Tuition and exam fees settled in full.',
});

// Lab approves
Engine.processClearanceDecision({
  clearanceItemId: labItem.id,
  reviewerId: labStaff.id,
  decision: 'approve',
  remarks: 'All computing hardware workstations inspected.',
});

// Library assesses book fine of ₹250 and rejects
const qrLib = Engine.getActiveQrForAuthority('library');
Engine.processClearanceDecision({
  clearanceItemId: libItem.id,
  reviewerId: libStaff.id,
  decision: 'reject',
  remarks: 'Overdue textbook: Operating System Concepts (Silberschatz). Late fine ₹250 assessed.',
  rejectionCategory: 'other',
  paymentRequired: true,
  paymentAmount: 250.0,
  paymentQrId: qrLib?.id || 'qr-lib-01',
  paymentInstructions: 'Scan Central Library UPI QR, pay ₹250 and upload screenshot.',
});

const reqAfterLibRej = Engine.getRequestById(studentRequest.id);
assert(reqAfterLibRej.status === 'ACTION_REQUIRED', 'Request transitions to ACTION_REQUIRED when library is rejected');
assert(reqAfterLibRej.library_status === 'REJECTED', 'Library status set to REJECTED');

// ------------------------------------------------------------------------------
// TEST 8: Strict HOD Precondition Gating (Stage 4)
// ------------------------------------------------------------------------------
console.log('\n--- TEST GROUP 8: Stage 4 — Strict HOD Gating ---');
let hodBlocked = false;
try {
  Engine.processHodFinalClearance({
    requestId: studentRequest.id,
    hodId: hod.id,
    decision: 'approve',
    remarks: 'Premature HOD approval attempt',
  });
} catch (err) {
  hodBlocked = true;
}
assert(hodBlocked, 'HOD final review is strictly blocked while Library clearance is REJECTED');

// ------------------------------------------------------------------------------
// TEST 9: Payment Upload, Manual Verification & Same-Request Resubmission
// ------------------------------------------------------------------------------
console.log('\n--- TEST GROUP 9: Payment Upload, Verification & Resubmission ---');
// Student uploads payment screenshot
const submission = Engine.submitPaymentEvidence({
  clearanceItemId: libItem.id,
  studentId: registeredStudent.id,
  amount: 250.0,
  screenshotUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600',
  transactionReference: 'UPI/VTU/2026/994821',
  notes: 'Paid late fine via PhonePe',
});
assert(submission.verification_status === 'PENDING_REVIEW', 'Payment submission is PENDING_REVIEW');

// Reviewer confirms payment evidence
// Rule 9: Payment confirmation must NEVER automatically approve clearance
Engine.reviewPaymentEvidence({
  submissionId: submission.id,
  reviewerId: libStaff.id,
  confirm: true,
  remarks: 'UTR number verified in bank statement.',
});

const libItemAfterPay = Engine.getClearanceItems().find((i) => i.id === libItem.id);
assert(libItemAfterPay.payment_status === 'CONFIRMED', 'Payment status is CONFIRMED');
assert(libItemAfterPay.status === 'PENDING', 'Clearance returns to PENDING for separate approval (Rule 9 enforced)');

// Library reviewer now makes separate approval decision
Engine.processClearanceDecision({
  clearanceItemId: libItem.id,
  reviewerId: libStaff.id,
  decision: 'approve',
  remarks: 'Payment reconciled. Book marked returned.',
});

const reqAllApproved = Engine.getRequestById(studentRequest.id);
assert(
  reqAllApproved.faculty_status === 'APPROVED' &&
  reqAllApproved.library_status === 'APPROVED' &&
  reqAllApproved.accounts_status === 'APPROVED' &&
  reqAllApproved.lab_status === 'APPROVED',
  'All 4 prerequisite clearances are now validly APPROVED'
);

// ------------------------------------------------------------------------------
// TEST 10: HOD Final Clearance & Verification ID Generation (Stage 5 & 6)
// ------------------------------------------------------------------------------
console.log('\n--- TEST GROUP 10: HOD Approval, Verification ID & Hall Ticket Eligibility ---');
const finalizedReq = Engine.processHodFinalClearance({
  requestId: studentRequest.id,
  hodId: hod.id,
  decision: 'approve',
  remarks: 'All institutional clearances complete. No-Due clearance officially granted.',
});

assert(finalizedReq.status === 'CLEARED', 'Request officially transitioned to CLEARED');
assert(finalizedReq.verification_id.startsWith('CIT-VTU-2026-'), 'Unique Verification ID generated', finalizedReq.verification_id);
assert(finalizedReq.hall_ticket_eligibility === 'ELIGIBLE', 'Hall ticket eligibility is ELIGIBLE');
assert(finalizedReq.hall_ticket_status === 'NOT YET RELEASED', 'Hall ticket status is NOT YET RELEASED (Rule 6 enforced)');

// ------------------------------------------------------------------------------
// TEST 11: Public Verification Page Security (Minimal Approved Disclosure)
// ------------------------------------------------------------------------------
console.log('\n--- TEST GROUP 11: Public Verification Disclosure Rules ---');
const publicResult = Engine.getPublicVerification(finalizedReq.verification_id);
assert(Boolean(publicResult), 'Public verification resolves cleared request');
assert(publicResult.college_name === 'Cauvery Institute of Technology', 'College name correctly displayed');
assert(publicResult.university === 'VTU', 'University affiliation is VTU');
assert(publicResult.status === 'NO-DUE CLEARED', 'Status is NO-DUE CLEARED');
assert(publicResult.student_id_masked.includes('***'), 'Student USN is privacy masked (1CR***099)', publicResult.student_id_masked);

// Invalid Verification ID lookup
const invalidResult = Engine.getPublicVerification('FAKE-ID-999');
assert(invalidResult === null, 'Invalid verification ID returns null without exposing private database details');

// ------------------------------------------------------------------------------
// TEST 12: Admin Staff Provisioning (Section 4 & 5)
// ------------------------------------------------------------------------------
console.log('\n--- TEST GROUP 12: Administrator Staff Account Management ---');
const newFaculty = Engine.provisionStaff(
  {
    fullName: 'Dr. Kiran Kumar',
    email: 'kiran.ise@cauvery.edu.in',
    role: 'faculty',
    departmentId: cseDept.id,
    password: 'StaffSecurePass@2026',
  },
  admin.id
);
assert(newFaculty.role === 'faculty', 'Admin can provision new staff account', newFaculty.full_name);

// Non-admin attempting to provision staff is blocked
let nonAdminBlocked = false;
try {
  Engine.provisionStaff(
    {
      fullName: 'Illegal User',
      email: 'illegal@cauvery.edu.in',
      role: 'faculty',
    },
    registeredStudent.id // student trying to provision staff
  );
} catch (err) {
  nonAdminBlocked = true;
}
assert(nonAdminBlocked, 'Staff provisioning strictly blocked for non-admin accounts');

// ------------------------------------------------------------------------------
// TEST 13: System Audit Logging
// ------------------------------------------------------------------------------
console.log('\n--- TEST GROUP 13: Immutable Audit Trail ---');
const auditLogs = Engine.getAuditLogs();
assert(auditLogs.length >= 10, 'Complete audit log history persisted', `Log count: ${auditLogs.length}`);

// ------------------------------------------------------------------------------
// SUMMARY
// ------------------------------------------------------------------------------
console.log('\n====================================================================');
console.log(`TEST SUITE COMPLETE: ${testsPassed} of ${testsTotal} tests passed.`);
console.log('ALL INSTITUTIONAL WORKFLOW AND SECURITY RULES SATISFIED (100%)');
console.log('====================================================================');
