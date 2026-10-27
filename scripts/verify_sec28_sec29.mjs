// ==============================================================================
// VERIFICATION TEST SUITE: SECTIONS 28 & 29
// Section 28: Staff Self-Registration, Role Selection & Responsibility Configuration
// Section 29: Database Cleanup & Prevention of Random Demo Accounts
// ==============================================================================

import { Engine, initializeEngine } from '../src/services/store.ts';

console.log('====================================================================');
console.log('VERIFICATION TEST SUITE: SECTIONS 28 & 29 ACCEPTANCE CRITERIA');
console.log('====================================================================\n');

let passCount = 0;
let totalCount = 0;

function check(desc, condition, extra = '') {
  totalCount++;
  if (!condition) {
    console.error(`❌ [FAIL] ${desc}${extra ? ` -> ${extra}` : ''}`);
    throw new Error(`Failed: ${desc}`);
  }
  passCount++;
  console.log(`✅ [PASS] ${desc}${extra ? ` (${extra})` : ''}`);
}

async function runTests() {
  // Fresh initialization
  initializeEngine();

  const departments = Engine.getDepartments();
  check('Departments exist in database', departments.length >= 4, `Found: ${departments.length}`);
  const cseDept = departments.find((d) => d.code === 'CSE') || departments[0];

  console.log('\n--- SECTION 28.A & 28.G: Self-Registration Boundaries & Admin Prohibition ---');

  // 1. Prohibit self-registration for Admin role
  let adminRegistrationBlocked = false;
  try {
    Engine.registerStaff({
      fullName: 'Malicious Admin Wannabe',
      staffId: 'STAFF-ADM-999',
      email: 'fakeadmin@cauvery.edu.in',
      password: 'password123',
      confirmPassword: 'password123',
      requestedRole: 'admin',
      departmentId: cseDept.id,
      designation: 'Hacker',
      academicYear: '2026-2027',
      responsibilities: ['Full Access'],
    });
  } catch (err) {
    adminRegistrationBlocked = err.message.includes('prohibited');
  }
  check('Self-registration for Admin role is strictly prohibited', adminRegistrationBlocked);

  // 2. Validate password match
  let passwordMismatchBlocked = false;
  try {
    Engine.registerStaff({
      fullName: 'Test Professor',
      staffId: 'STAFF-CSE-101',
      email: 'testprof@cauvery.edu.in',
      password: 'password123',
      confirmPassword: 'mismatchPassword',
      requestedRole: 'faculty',
      departmentId: cseDept.id,
      designation: 'Assistant Professor',
      academicYear: '2026-2027',
      responsibilities: ['Academic verification'],
    });
  } catch (err) {
    passwordMismatchBlocked = err.message.includes('do not match');
  }
  check('Password confirmation mismatch is caught and rejected', passwordMismatchBlocked);

  console.log('\n--- SECTION 28.B, 28.C & 28.F: Faculty Self-Registration & Immediate Login with Gated Operational Access ---');

  // 3. Register genuine faculty member
  const newFaculty = Engine.registerStaff({
    fullName: 'Dr. Ramesh Kumar',
    staffId: 'CIT-FAC-101',
    email: 'ramesh.kumar@cauvery.edu.in',
    password: 'securePassword123',
    confirmPassword: 'securePassword123',
    requestedRole: 'faculty',
    departmentId: cseDept.id,
    designation: 'Associate Professor',
    academicYear: '2026-2027',
    subjects: ['CS501 Computer Networks', 'CS502 Operating Systems'],
    semester: 5,
    responsibilities: ['Academic verification', 'Attendance verification', 'Assignment verification'],
  });

  check('Faculty profile created with valid ID', !!newFaculty.id);
  check('Faculty Staff ID stored correctly', newFaculty.staff_id === 'CIT-FAC-101');
  check('Faculty account defaults to unverified', newFaculty.is_verified === false);
  check('Faculty verification status is PENDING', newFaculty.verification_status === 'PENDING');
  check('Faculty requested role is recorded', newFaculty.requested_role === 'faculty');
  check('Faculty role is stored', newFaculty.role === 'faculty');
  check('Subjects taught recorded', newFaculty.subjects.length === 2);
  check('Semester handled recorded', newFaculty.semester === 5);
  check('Requested responsibilities recorded', newFaculty.responsibilities.length === 3);

  // 4. Immediate login availability
  const loggedInStaff = Engine.authenticateStaff('ramesh.kumar@cauvery.edu.in', 'securePassword123');
  check('Staff can log in immediately after registration', loggedInStaff.id === newFaculty.id);
  check('Authenticated profile retains unverified state', loggedInStaff.verification_status === 'PENDING');

  // 5. Duplicate Staff ID prevention
  let duplicateStaffIdBlocked = false;
  try {
    Engine.registerStaff({
      fullName: 'Another Faculty',
      staffId: 'CIT-FAC-101',
      email: 'another@cauvery.edu.in',
      password: 'password123',
      confirmPassword: 'password123',
      requestedRole: 'faculty',
      departmentId: cseDept.id,
      designation: 'Lecturer',
      academicYear: '2026-2027',
      responsibilities: ['Academic verification'],
    });
  } catch (err) {
    duplicateStaffIdBlocked = err.message.includes('already registered');
  }
  check('Duplicate Staff ID is blocked', duplicateStaffIdBlocked);

  // 6. Gated operational access: Unverified faculty cannot access queue or approve
  const unverifiedQueue = Engine.getRequestsForFaculty(newFaculty.id);
  check('Unverified faculty receives empty operational work queue', unverifiedQueue.length === 0);

  let unverifiedApprovalBlocked = false;
  try {
    Engine.verifyFacultyApproval('any-req-id', newFaculty.id, 'Approved');
  } catch (err) {
    unverifiedApprovalBlocked = err.message.includes('verification required');
  }
  check('Unverified faculty is blocked from approving clearance requests', unverifiedApprovalBlocked);

  console.log('\n--- SECTION 28.D: Student Teacher Selection & Verified Faculty Directory ---');

  // 7. Student teacher directory only displays verified faculty
  const selectableTeachersBefore = Engine.getFacultyForDepartment(cseDept.id);
  check(
    'Unverified faculty does NOT appear in selectable teacher list for students',
    !selectableTeachersBefore.some((t) => t.id === newFaculty.id),
    `Count before verification: ${selectableTeachersBefore.length}`
  );

  console.log('\n--- SECTION 28.B: Multi-Category Staff Self-Registration ---');

  // 8. Register Library Staff
  const libraryStaff = Engine.registerStaff({
    fullName: 'Smt. Lakshmi Devi',
    staffId: 'CIT-LIB-201',
    email: 'lakshmi.library@cauvery.edu.in',
    password: 'password123',
    confirmPassword: 'password123',
    requestedRole: 'library_staff',
    departmentId: cseDept.id,
    designation: 'Senior Librarian',
    academicYear: '2026-2027',
    responsibilities: ['Library clearance', 'Payment evidence review'],
  });
  check('Library staff registered successfully with PENDING status', libraryStaff.verification_status === 'PENDING');

  // 9. Register Accounts Staff
  const accountsStaff = Engine.registerStaff({
    fullName: 'Shri Anand Murthy',
    staffId: 'CIT-ACC-301',
    email: 'anand.accounts@cauvery.edu.in',
    password: 'password123',
    confirmPassword: 'password123',
    requestedRole: 'accounts_staff',
    departmentId: cseDept.id,
    designation: 'Accounts Officer',
    academicYear: '2026-2027',
    responsibilities: ['Accounts clearance', 'Payment evidence review'],
  });
  check('Accounts staff registered successfully with PENDING status', accountsStaff.verification_status === 'PENDING');

  // 10. Register Lab Staff
  const labStaff = Engine.registerStaff({
    fullName: 'Shri Suresh Babu',
    staffId: 'CIT-LAB-401',
    email: 'suresh.lab@cauvery.edu.in',
    password: 'password123',
    confirmPassword: 'password123',
    requestedRole: 'lab_staff',
    departmentId: cseDept.id,
    designation: 'Systems Administrator',
    academicYear: '2026-2027',
    responsibilities: ['Laboratory clearance'],
  });
  check('Laboratory staff registered successfully with PENDING status', labStaff.verification_status === 'PENDING');

  // 11. Register HOD
  const hodStaff = Engine.registerStaff({
    fullName: 'Dr. Sudha Rao',
    staffId: 'CIT-HOD-501',
    email: 'sudha.hod@cauvery.edu.in',
    password: 'password123',
    confirmPassword: 'password123',
    requestedRole: 'hod',
    departmentId: cseDept.id,
    designation: 'Professor & Head',
    academicYear: '2026-2027',
    responsibilities: ['Department-level HOD review'],
  });
  check('HOD staff registered successfully with PENDING status', hodStaff.verification_status === 'PENDING');

  // 12. Unverified operational gating for all staff categories
  let unverifiedLibDecisionBlocked = false;
  try {
    Engine.processClearanceDecision({
      itemId: 'any-item',
      reviewerId: libraryStaff.id,
      decision: 'approve',
      remarks: 'Attempted unverified approval',
    });
  } catch (err) {
    unverifiedLibDecisionBlocked = err.message.includes('Institutional verification required');
  }
  check('Unverified Library staff cannot process clearance decisions', unverifiedLibDecisionBlocked);

  let unverifiedHodDecisionBlocked = false;
  try {
    Engine.processHodFinalClearance({
      requestId: 'any-req',
      hodId: hodStaff.id,
      decision: 'approve',
      remarks: 'Attempted unverified approval',
    });
  } catch (err) {
    unverifiedHodDecisionBlocked = err.message.includes('Institutional verification required');
  }
  check('Unverified HOD cannot process final clearance decisions', unverifiedHodDecisionBlocked);

  console.log('\n--- SECTION 28.E: Institutional Verification & Privilege Escalation Prevention ---');

  const adminProfile = Engine.getProfiles().find((p) => p.role === 'admin');
  check('System Administrator account exists', !!adminProfile);

  // 13. Non-admin cannot verify staff
  let nonAdminVerifyBlocked = false;
  try {
    Engine.verifyStaffRole({
      staffId: newFaculty.id,
      adminId: libraryStaff.id, // non-admin
    });
  } catch (err) {
    nonAdminVerifyBlocked = err.message.includes('Only system administrators');
  }
  check('Non-admin cannot verify staff accounts or grant roles', nonAdminVerifyBlocked);

  // 14. Admin verifies Faculty
  const pendingListBefore = Engine.getPendingStaffVerifications();
  check('Pending staff verifications list contains new staff', pendingListBefore.length >= 5);

  const verifiedFaculty = Engine.verifyStaffRole({
    staffId: newFaculty.id,
    role: 'faculty',
    designation: 'Associate Professor',
    responsibilities: ['Academic verification', 'Attendance verification', 'Assignment verification'],
    adminId: adminProfile.id,
  });
  check('Faculty verified by Admin', verifiedFaculty.is_verified === true);
  check('Faculty status is VERIFIED', verifiedFaculty.verification_status === 'VERIFIED');
  check('Faculty verified_by is Admin ID', verifiedFaculty.verified_by === adminProfile.id);

  // 15. Verified faculty now appears in student teacher selection
  const selectableTeachersAfter = Engine.getFacultyForDepartment(cseDept.id);
  check(
    'Verified faculty appears in selectable teacher directory for their department',
    selectableTeachersAfter.some((t) => t.id === newFaculty.id),
    `Selectable faculty count: ${selectableTeachersAfter.length}`
  );

  // 16. Verify remaining staff roles
  Engine.verifyStaffRole({ staffId: libraryStaff.id, role: 'library_staff', adminId: adminProfile.id });
  Engine.verifyStaffRole({ staffId: accountsStaff.id, role: 'accounts_staff', adminId: adminProfile.id });
  Engine.verifyStaffRole({ staffId: labStaff.id, role: 'lab_staff', adminId: adminProfile.id });
  Engine.verifyStaffRole({ staffId: hodStaff.id, role: 'hod', adminId: adminProfile.id });

  // 17. Rejection testing
  const rejectedFaculty = Engine.registerStaff({
    fullName: 'Fake Imposter',
    staffId: 'FAKE-999',
    email: 'imposter@outside.com',
    password: 'password123',
    confirmPassword: 'password123',
    requestedRole: 'faculty',
    departmentId: cseDept.id,
    designation: 'Adjunct',
    academicYear: '2026-2027',
    responsibilities: ['Academic verification'],
  });

  const rejectedResult = Engine.rejectStaffVerification({
    staffId: rejectedFaculty.id,
    reason: 'Staff ID not found in institutional HR records',
    adminId: adminProfile.id,
  });
  check('Staff verification successfully rejected', rejectedResult.verification_status === 'REJECTED');
  check('Rejection reason recorded', rejectedResult.rejection_reason === 'Staff ID not found in institutional HR records');
  check('Rejected faculty remains unselectable by students', !Engine.getFacultyForDepartment(cseDept.id).some((t) => t.id === rejectedFaculty.id));

  // 18. Audit log records
  const auditLogs = Engine.getAuditLogs();
  const verifyLogs = auditLogs.filter((l) => l.action === 'STAFF_ROLE_VERIFIED');
  const rejectLogs = auditLogs.filter((l) => l.action === 'STAFF_ROLE_REJECTED' || l.action === 'STAFF_VERIFICATION_REJECTED');
  check('Audit log contains STAFF_ROLE_VERIFIED events', verifyLogs.length >= 5);
  check('Audit log contains STAFF_VERIFICATION_REJECTED events', rejectLogs.length >= 1);

  console.log('\n--- SECTION 29: Database Cleanup & Zero Demo Accounts ---');

  // 19. Run database cleanup
  const cleanupResult = Engine.cleanupDatabaseDemoData(adminProfile.id);
  check('Database cleanup executed', cleanupResult.genuineProfilesCount > 0);
  check('Cleanup preserved genuine verified faculty', cleanupResult.genuineFacultyCount >= 1);

  // Ensure no fictional accounts remain
  const profilesAfterCleanup = Engine.getProfiles();
  const fictionalEmails = ['prof.sharma@cauvery.edu.in', 'dr.anita@cauvery.edu.in', 'hod.cse@cauvery.edu.in', 'demo@cauvery.edu.in'];
  const hasFictional = profilesAfterCleanup.some((p) => fictionalEmails.includes(p.email));
  check('Zero fictional demo accounts remain in application profiles', !hasFictional);

  console.log('\n--- END-TO-END WORKFLOW CONTINUITY: Student to Verified Faculty Clearance ---');

  // 20. Student self-registers
  const student = Engine.registerStudent({
    fullName: 'Pooja Hegde',
    studentId: '1CR22CS088',
    departmentId: cseDept.id,
    academicYear: '2026-2027',
    semester: 5,
    initialAttendance: 91.5,
    password: 'password123',
    confirmPassword: 'password123',
  });
  check('Student account registered', !!student.id);

  // 21. Student creates No-Due request selecting verified faculty
  const req = Engine.createRequest(student.id, '2026-2027', 5, 'Final semester graduation clearance', undefined, newFaculty.id);
  check('No-Due request created and assigned to verified faculty', req.assigned_faculty_id === newFaculty.id);
  check('Request initial state is PENDING_FACULTY_REVIEW', req.status === 'PENDING_FACULTY_REVIEW');

  // 22. Verified faculty approves
  const facultyQueue = Engine.getRequestsForFaculty(newFaculty.id);
  check('Verified faculty receives request in queue', facultyQueue.length >= 1);

  const approvedByFac = Engine.verifyFacultyApproval(req.id, newFaculty.id, 'Academic criteria and attendance verified.');
  check('Verified faculty successfully approved request, transitioned to IN_REVIEW', approvedByFac.status === 'IN_REVIEW');
  check('Faculty status is APPROVED', approvedByFac.faculty_status === 'APPROVED');

  // 23. Verified clearance authorities approve
  Engine.processClearanceDecision({
    itemId: `item-${req.id}-library`,
    reviewerId: libraryStaff.id,
    decision: 'approve',
    remarks: 'No dues in library.',
  });
  Engine.processClearanceDecision({
    itemId: `item-${req.id}-accounts`,
    reviewerId: accountsStaff.id,
    decision: 'approve',
    remarks: 'All fee receipts cleared.',
  });
  const approvedByLab = Engine.processClearanceDecision({
    itemId: `item-${req.id}-lab`,
    reviewerId: labStaff.id,
    decision: 'approve',
    remarks: 'Hardware lab kits returned.',
  });
  check('All departmental desks approved, transitioned to HOD_REVIEW', approvedByLab.status === 'HOD_REVIEW');

  // 24. Verified HOD approves
  const finalCert = Engine.processHodFinalClearance({
    requestId: req.id,
    hodId: hodStaff.id,
    decision: 'approve',
    remarks: 'Granted institutional clearance.',
  });
  check('Verified HOD issued final clearance', finalCert.status === 'CLEARED');
  check('Digital clearance verification ID generated', !!finalCert.verification_id);
  check('Hall ticket eligibility granted', finalCert.hall_ticket_eligibility === 'ELIGIBLE');

  console.log('\n====================================================================');
  console.log(`SUMMARY: All ${passCount} / ${totalCount} checks PASSED!`);
  console.log('SECTIONS 28 & 29 VERIFICATION COMPLETE & VALIDATED');
  console.log('====================================================================');
}

runTests().catch((err) => {
  console.error('Fatal error during test suite execution:', err);
  process.exit(1);
});
