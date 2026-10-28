// ==============================================================================
// VERIFICATION TEST SUITE: SECTION 32
// Section 32: Navigation Cleanup, Multi-Faculty Selection, Department Data Isolation,
// and Professional UI Acceptance Criteria
// ==============================================================================

import fs from 'fs';
import path from 'path';
import { Engine, initializeEngine } from '../src/services/store.ts';
import { api } from '../src/services/api.ts';

console.log('====================================================================');
console.log('VERIFICATION TEST SUITE: SECTION 32 ACCEPTANCE CRITERIA');
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
  initializeEngine();

  console.log('--- TEST GROUP 1: Initial Navigation & Verification Button Cleanup (Req A & 1) ---');
  
  // 1. Check Navbar.tsx does NOT have prominent Verification button
  const navbarSource = fs.readFileSync(path.resolve('src/components/Navbar.tsx'), 'utf-8');
  const hasNavbarVerify = navbarSource.includes('to="/verify"') || navbarSource.includes("to='/verify'");
  check('Prominent Verification button removed from main Navbar header', !hasNavbarVerify);

  // 2. Check Footer.tsx contains discreet link to /verify
  const footerSource = fs.readFileSync(path.resolve('src/components/Footer.tsx'), 'utf-8');
  const hasFooterVerify = footerSource.includes('/verify');
  check('Discreet Public Verification Lookup link provided in Footer', hasFooterVerify);

  // 3. Check App.tsx maintains /verify and /verify/:id routes
  const appSource = fs.readFileSync(path.resolve('src/App.tsx'), 'utf-8');
  check('App router maintains /verify route', appSource.includes('path="/verify"'));
  check('App router maintains /verify/:id route', appSource.includes('path="/verify/:id"'));

  console.log('\n--- TEST GROUP 2: Setup Distinct Institutional Departments & Staff ---');

  // Setup admin
  const admin = Engine.getProfiles().find((p) => p.role === 'admin' && p.is_active) ||
    Engine.bootstrapInitialAdmin('admin@gmail.com', 'AdminPass@2026');
  check('Admin active for test provisioning', !!admin);

  // Departments: CSE and ME
  const depts = Engine.getDepartments();
  const cseDept = depts.find((d) => d.code === 'CSE') || Engine.addDepartment('CSE', 'Computer Science and Engineering', admin.id);
  const meDept = depts.find((d) => d.code === 'ME') || Engine.addDepartment('ME', 'Mechanical Engineering', admin.id);
  check('CSE department active', !!cseDept);
  check('ME department active', !!meDept);

  // Provision Faculty 1 in CSE
  const cseFaculty1 = Engine.provisionStaff(
    {
      fullName: 'Dr. Chaitra N',
      email: 'chaitra.sec32@cauvery.edu.in',
      role: 'faculty',
      departmentId: cseDept.id,
      designation: 'Associate Professor',
      password: 'FacultyPassword@2026',
    },
    admin.id
  );
  cseFaculty1.subjects = 'Operating Systems, Algorithms';
  cseFaculty1.semester = 5;

  // Provision Faculty 2 in CSE
  const cseFaculty2 = Engine.provisionStaff(
    {
      fullName: 'Prof. Ramesh K',
      email: 'ramesh.sec32@cauvery.edu.in',
      role: 'faculty',
      departmentId: cseDept.id,
      designation: 'Assistant Professor',
      password: 'FacultyPassword@2026',
    },
    admin.id
  );
  cseFaculty2.subjects = 'Database Systems, Web Technologies';
  cseFaculty2.semester = 5;

  // Provision Faculty in ME (unrelated department)
  const meFaculty = Engine.provisionStaff(
    {
      fullName: 'Dr. Harish Gowda',
      email: 'harish.sec32@cauvery.edu.in',
      role: 'faculty',
      departmentId: meDept.id,
      designation: 'Professor',
      password: 'FacultyPassword@2026',
    },
    admin.id
  );

  // Provision Lab Staff in CSE
  const cseLabStaff = Engine.provisionStaff(
    {
      fullName: 'Kiran Kumar CSE Lab',
      email: 'kiran.cselab@cauvery.edu.in',
      role: 'lab_staff',
      departmentId: cseDept.id,
      designation: 'Lab Instructor',
      password: 'LabPassword@2026',
    },
    admin.id
  );

  // Provision Lab Staff in ME
  const meLabStaff = Engine.provisionStaff(
    {
      fullName: 'Mahesh ME Lab',
      email: 'mahesh.melab@cauvery.edu.in',
      role: 'lab_staff',
      departmentId: meDept.id,
      designation: 'Senior Lab Instructor',
      password: 'LabPassword@2026',
    },
    admin.id
  );

  // Provision HOD for CSE
  const cseHod = Engine.provisionStaff(
    {
      fullName: 'Dr. Balaji K',
      email: 'balaji.sec32@cauvery.edu.in',
      role: 'hod',
      departmentId: cseDept.id,
      designation: 'HOD CSE',
      password: 'HodPassword@2026',
    },
    admin.id
  );

  // Provision HOD for ME
  const meHod = Engine.provisionStaff(
    {
      fullName: 'Dr. Suresh Gowda ME HOD',
      email: 'suresh.mehod@cauvery.edu.in',
      role: 'hod',
      departmentId: meDept.id,
      designation: 'HOD Mechanical Engineering',
      password: 'HodPassword@2026',
    },
    admin.id
  );

  // Provision Central Library and Accounts staff
  const libStaff = Engine.provisionStaff(
    {
      fullName: 'Shivaraj Library',
      email: 'shivaraj.sec32@cauvery.edu.in',
      role: 'library_staff',
      departmentId: 'dept-central',
      designation: 'Chief Librarian',
      password: 'StaffPassword@2026',
    },
    admin.id
  );
  const accStaff = Engine.provisionStaff(
    {
      fullName: 'Geetha Accounts',
      email: 'geetha.sec32@cauvery.edu.in',
      role: 'accounts_staff',
      departmentId: 'dept-central',
      designation: 'Accounts Officer',
      password: 'StaffPassword@2026',
    },
    admin.id
  );

  console.log('\n--- TEST GROUP 3: Multi-Faculty Selection in Student Department (Req B & 3, 4, 6) ---');

  // Register Student 1 in CSE
  const cseStudent = Engine.registerStudent({
    fullName: 'Kavya Murthy',
    studentId: '1CR24CS032',
    email: 'kavya.cs032@cauvery.edu.in',
    departmentId: cseDept.id,
    password: 'StudentPass@2026',
    confirmPassword: 'StudentPass@2026',
    academicYear: '2026-2027',
    semester: 5,
  });
  check('Student registered in CSE department', cseStudent.department === cseDept.name);

  // Query available faculty for CSE student
  const cseAvailableTeachers = await api.getFacultyForDepartment(cseDept.id, { academic_year: '2026-2027', semester: 5 });
  check('Student sees multiple eligible teachers for CSE', cseAvailableTeachers.length >= 2);
  check('Dr. Chaitra N is an eligible option', cseAvailableTeachers.some((t) => t.id === cseFaculty1.id));
  check('Prof. Ramesh K is an eligible option', cseAvailableTeachers.some((t) => t.id === cseFaculty2.id));
  check('ME Faculty (Dr. Harish) does NOT appear in CSE teacher list', !cseAvailableTeachers.some((t) => t.id === meFaculty.id));

  // Verify fake / unverified faculty never appears
  const unverifiedFac = Engine.registerStaff({
    fullName: 'Fake Unverified Faculty',
    staffId: 'FAKE-FAC-099',
    email: 'fake.fac@cauvery.edu.in',
    password: 'Password@2026',
    confirmPassword: 'Password@2026',
    requestedRole: 'faculty',
    departmentId: cseDept.id,
    designation: 'Lecturer',
  });
  const teachersAfterFake = await api.getFacultyForDepartment(cseDept.id);
  check('Unverified faculty never appears in eligible teacher directory', !teachersAfterFake.some((t) => t.id === unverifiedFac.id));

  console.log('\n--- TEST GROUP 4: Request Submission Routed to Selected Teacher (Req B & 5) ---');

  // Submit request selecting cseFaculty2 specifically
  const cseReq = Engine.createRequest(
    cseStudent.id,
    cseDept.name,
    '2026-2027',
    5,
    'No-due clearance for semester 5',
    cseFaculty2.id
  );
  check('Request successfully created', !!cseReq.id);
  check('Request assigned strictly to selected faculty2', cseReq.assigned_faculty_id === cseFaculty2.id);
  check('Request assigned faculty name matches faculty2', cseReq.assigned_faculty_name === cseFaculty2.full_name);

  // Check queues: Must appear in faculty2 queue, NOT faculty1 queue
  const fac2Queue = Engine.getRequestsForFaculty(cseFaculty2.id);
  const fac1Queue = Engine.getRequestsForFaculty(cseFaculty1.id);
  check('Request appears in selected teacher work queue', fac2Queue.some((r) => r.id === cseReq.id));
  check('Request does NOT appear in unselected teacher work queue', !fac1Queue.some((r) => r.id === cseReq.id));

  // Register Student 2 in ME and create request with meFaculty
  const meStudent = Engine.registerStudent({
    fullName: 'Anil Kumar ME',
    studentId: '1CR24ME032',
    email: 'anil.me032@cauvery.edu.in',
    departmentId: meDept.id,
    password: 'StudentPass@2026',
    confirmPassword: 'StudentPass@2026',
    academicYear: '2026-2027',
    semester: 5,
  });
  const meReq = Engine.createRequest(
    meStudent.id,
    meDept.name,
    '2026-2027',
    5,
    'ME Department Clearance',
    meFaculty.id
  );
  check('ME Request successfully created', !!meReq.id);

  console.log('\n--- TEST GROUP 5: Strict Department-Level Isolation for Laboratory Staff (Req C & 7) ---');

  // Approve faculty verification for both to activate parallel departmental desks
  Engine.updateAttendanceThreshold(80, admin.id);

  // Section 33: Enter required subject attendance prior to faculty verification approval
  const cseSub = Engine.getSubjectAttendanceForStudent(cseStudent.id, cseReq.id);
  cseSub.forEach((s) => {
    Engine.recordSubjectAttendance({
      subjectRecordId: s.id,
      classesHeld: 50,
      classesAttended: 44,
      facultyId: s.faculty_id,
      remarks: 'Satisfactory attendance',
    });
    Engine.processSubjectTeacherDecision({
      subjectRecordId: s.id,
      facultyId: s.faculty_id,
      decision: 'APPROVE',
      remarks: 'Approved',
    });
  });

  const meSub = Engine.getSubjectAttendanceForStudent(meStudent.id, meReq.id);
  meSub.forEach((s) => {
    Engine.recordSubjectAttendance({
      subjectRecordId: s.id,
      classesHeld: 50,
      classesAttended: 43,
      facultyId: s.faculty_id,
      remarks: 'Satisfactory attendance in ME',
    });
    Engine.processSubjectTeacherDecision({
      subjectRecordId: s.id,
      facultyId: s.faculty_id,
      decision: 'APPROVE',
      remarks: 'Approved',
    });
  });

  Engine.verifyFacultyApproval(cseReq.id, cseFaculty2.id, 'CSE Academic verification approved.');
  Engine.verifyFacultyApproval(meReq.id, meFaculty.id, 'ME Academic verification approved.');

  // Fetch Lab clearance data for CSE Lab Staff
  const cseLabData = await api.getAuthorityClearanceData('lab', cseLabStaff.id);
  check('CSE Lab Staff receives clearance items', cseLabData.items.length > 0);
  check('CSE Lab Staff sees CSE student clearance request', cseLabData.items.some((i) => i.request_id === cseReq.id));
  check('CSE Lab Staff CANNOT see ME student clearance request (Isolated)', !cseLabData.items.some((i) => i.request_id === meReq.id));

  // Fetch Lab clearance data for ME Lab Staff
  const meLabData = await api.getAuthorityClearanceData('lab', meLabStaff.id);
  check('ME Lab Staff sees ME student clearance request', meLabData.items.some((i) => i.request_id === meReq.id));
  check('ME Lab Staff CANNOT see CSE student clearance request (Isolated)', !meLabData.items.some((i) => i.request_id === cseReq.id));

  console.log('\n--- TEST GROUP 6: Backend Authorization & Tampering Protection (Req D & 9, 10) ---');

  // 1. CSE Lab Staff attempts to approve ME lab clearance item -> MUST BE DENIED!
  const meLabItem = Engine.getClearanceItems().find((i) => i.request_id === meReq.id && i.authority === 'lab');
  let labTamperingBlocked = false;
  try {
    Engine.processClearanceDecision({
      itemId: meLabItem.id,
      reviewerId: cseLabStaff.id,
      decision: 'approve',
      remarks: 'Attempted cross-department approval',
    });
  } catch (err) {
    labTamperingBlocked = err.message.includes('Access Denied') || err.message.includes('restricted');
  }
  check('CSE Lab Staff blocked from approving ME clearance item (Backend Enforced)', labTamperingBlocked);

  // 2. ME Lab Staff attempts to approve CSE lab clearance item -> MUST BE DENIED!
  const cseLabItem = Engine.getClearanceItems().find((i) => i.request_id === cseReq.id && i.authority === 'lab');
  let meLabTamperingBlocked = false;
  try {
    Engine.processClearanceDecision({
      itemId: cseLabItem.id,
      reviewerId: meLabStaff.id,
      decision: 'approve',
      remarks: 'Attempted cross-department approval',
    });
  } catch (err) {
    meLabTamperingBlocked = err.message.includes('Access Denied') || err.message.includes('restricted');
  }
  check('ME Lab Staff blocked from approving CSE clearance item (Backend Enforced)', meLabTamperingBlocked);

  // 3. Admin cannot directly approve departmental clearance without staff authority
  let adminClearanceApprovalBlocked = false;
  try {
    Engine.processClearanceDecision({
      itemId: cseLabItem.id,
      reviewerId: admin.id,
      decision: 'approve',
      remarks: 'Admin direct sign-off',
    });
  } catch (err) {
    adminClearanceApprovalBlocked = err.message.includes('Unauthorized') || err.message.includes('Administrative oversight');
  }
  check('Admin directly signing off clearance decision is blocked (Separation of authority)', adminClearanceApprovalBlocked);

  // 4. URL tampering protection: Laboratory staff cannot view request outside department
  let directUrlTamperingBlocked = false;
  try {
    Engine.getRequestById(meReq.id, cseLabStaff.id);
  } catch (err) {
    directUrlTamperingBlocked = err.message.includes('Access Denied');
  }
  check('Direct request ID lookup outside department blocked for Lab Staff', directUrlTamperingBlocked);

  console.log('\n--- TEST GROUP 7: Strict Department Isolation for HOD & Final Review (Req C & 8, 9) ---');

  // HOD Dashboard Queue Isolation
  const cseHodRequests = await api.getHodDashboardData(cseHod.id);
  const meHodRequests = await api.getHodDashboardData(meHod.id);
  check('CSE HOD sees CSE request', cseHodRequests.some((r) => r.id === cseReq.id));
  check('CSE HOD CANNOT see ME request (HOD Isolation)', !cseHodRequests.some((r) => r.id === meReq.id));
  check('ME HOD sees ME request', meHodRequests.some((r) => r.id === meReq.id));
  check('ME HOD CANNOT see CSE request (HOD Isolation)', !meHodRequests.some((r) => r.id === cseReq.id));

  // Approve Library, Accounts, and Lab for CSE Request
  const cseLibItem = Engine.getClearanceItems().find((i) => i.request_id === cseReq.id && i.authority === 'library');
  const cseAccItem = Engine.getClearanceItems().find((i) => i.request_id === cseReq.id && i.authority === 'accounts');
  Engine.processClearanceDecision({
    itemId: cseLibItem.id,
    reviewerId: libStaff.id,
    decision: 'approve',
    remarks: 'Library books returned.',
  });
  Engine.processClearanceDecision({
    itemId: cseAccItem.id,
    reviewerId: accStaff.id,
    decision: 'approve',
    remarks: 'Fee dues settled.',
  });
  Engine.processClearanceDecision({
    itemId: cseLabItem.id,
    reviewerId: cseLabStaff.id,
    decision: 'approve',
    remarks: 'CSE lab kits inspected.',
  });

  // Check CSE request is now in HOD_REVIEW
  const reqReadyForHod = Engine.getRequestById(cseReq.id);
  check('CSE request transitioned to HOD_REVIEW', reqReadyForHod.status === 'HOD_REVIEW');

  // ME HOD attempts to finalize CSE request -> MUST BE BLOCKED!
  let meHodTamperingBlocked = false;
  try {
    Engine.processHodFinalClearance({
      requestId: cseReq.id,
      hodId: meHod.id,
      decision: 'approve',
      remarks: 'Cross department HOD approval',
    });
  } catch (err) {
    meHodTamperingBlocked = err.message.includes('Access Denied');
  }
  check('ME HOD blocked from approving CSE request (HOD Department Isolation)', meHodTamperingBlocked);

  // Authorized CSE HOD approves CSE request -> SUCCESS!
  const clearedResult = Engine.processHodFinalClearance({
    requestId: cseReq.id,
    hodId: cseHod.id,
    decision: 'approve',
    remarks: 'All 4 clearances confirmed. No-Due clearance granted.',
  });
  check('Authorized CSE HOD successfully grants final clearance', clearedResult.status === 'CLEARED');
  check('Verification ID generated', !!clearedResult.verification_id);
  check('Verification ID format is CIT-VTU-2026-XXXXXXXX', clearedResult.verification_id.startsWith('CIT-VTU-2026-'));

  console.log('\n--- TEST GROUP 8: Public Verification & UI Accessibility (Req A & 2, 11, 12) ---');

  // Public verification lookup works with generated Verification ID
  const publicRecord = await api.getPublicVerificationRecord(clearedResult.verification_id);
  check('Public verification resolves cleared student record', !!publicRecord);
  check('Student name exposed in public record', publicRecord.student_name === cseStudent.full_name);
  check('Student ID masked for privacy (Rule 2.11)', publicRecord.student_id_masked.includes('***'));
  check('Department exposed in public record', publicRecord.department === cseDept.name);
  check('Hall ticket status is NOT YET RELEASED', publicRecord.hall_ticket_status === 'NOT YET RELEASED');

  console.log('\n====================================================================');
  console.log(`SUMMARY: All ${passCount} / ${totalCount} checks PASSED!`);
  console.log('SECTION 32 ACCEPTANCE CRITERIA FULLY SATISFIED & VALIDATED');
  console.log('====================================================================\n');
}

runTests().catch((err) => {
  console.error('Fatal error during test suite execution:', err);
  process.exit(1);
});
