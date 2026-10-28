// ==============================================================================
// VERIFICATION TEST SUITE: SECTION 33
// Section 33: Faculty-Entered Attendance After No-Due Request Submission
// Acceptance Criteria & Institutional Rules
// ==============================================================================

import fs from 'fs';
import path from 'path';
import { Engine, initializeEngine } from '../src/services/store.ts';
import { api } from '../src/services/api.ts';

console.log('====================================================================');
console.log('VERIFICATION TEST SUITE: SECTION 33 ACCEPTANCE CRITERIA');
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

  console.log('--- TEST GROUP 1: Provision Multi-Faculty Department (CSE) ---');
  const admin = Engine.getProfiles().find((p) => p.role === 'admin' && p.is_active) ||
    Engine.bootstrapInitialAdmin('admin@gmail.com', 'AdminPass@2026');
  check('Admin active for test setup', !!admin);

  const depts = Engine.getDepartments();
  const cseDept = depts.find((d) => d.code === 'CSE') || Engine.addDepartment('CSE', 'Computer Science and Engineering', admin.id);
  check('CSE Department ready', !!cseDept);

  // Faculty 1: Teaches Operating Systems (CSE Sem 5)
  const fac1 = Engine.provisionStaff(
    {
      fullName: 'Dr. Chaitra N',
      email: 'chaitra.sec33@cauvery.edu.in',
      role: 'faculty',
      departmentId: cseDept.id,
      designation: 'Associate Professor',
      password: 'FacultyPassword@2026',
      subjects: ['Operating Systems'],
      semester: 5,
    },
    admin.id
  );

  // Faculty 2: Teaches Database Management Systems (CSE Sem 5)
  const fac2 = Engine.provisionStaff(
    {
      fullName: 'Prof. Ramesh K',
      email: 'ramesh.sec33@cauvery.edu.in',
      role: 'faculty',
      departmentId: cseDept.id,
      designation: 'Assistant Professor',
      password: 'FacultyPassword@2026',
      subjects: ['Database Management Systems'],
      semester: 5,
    },
    admin.id
  );

  // HOD for CSE
  const cseHod = Engine.provisionStaff(
    {
      fullName: 'Dr. Srikantappa As',
      email: 'hod.sec33@cauvery.edu.in',
      role: 'hod',
      departmentId: cseDept.id,
      designation: 'Professor & HOD',
      password: 'HodPassword@2026',
    },
    admin.id
  );

  check('Faculty 1 provisioned for Operating Systems', fac1.subjects.includes('Operating Systems'));
  check('Faculty 2 provisioned for Database Management Systems', fac2.subjects.includes('Database Management Systems'));
  check('HOD provisioned for CSE', !!cseHod);

  console.log('\n--- TEST GROUP 2: Student Registration & Empty Initial Attendance (Req A & 1, 2) ---');
  const studentUsn = '1CR22CS101';
  const student = Engine.registerStudent({
    studentId: studentUsn,
    fullName: 'Ananya Rao',
    email: 'ananya.rao.sec33@cauvery.edu.in',
    departmentId: cseDept.id,
    password: 'StudentPass@2026',
    semester: 5,
  });
  check('Student registered successfully', !!student);

  // Check initial academic record
  const initialAcad = Engine.getAcademicRecordForStudent(student.id, '2026-2027', 5);
  check('Initial academic record exists for student', !!initialAcad);
  check('Initial attendance percentage is strictly NULL (Section 33.A)', initialAcad.attendance_percentage === null);
  check('Initial eligibility is strictly NULL (Section 33.A)', initialAcad.is_eligible === null);
  check('Initial attendance status is AWAITING_FACULTY_ENTRY', initialAcad.attendance_status === 'AWAITING_FACULTY_ENTRY');

  console.log('\n--- TEST GROUP 3: Student Submits No-Due Request With Selected Teacher ---');
  const req = Engine.createRequest(
    student.id,
    cseDept.name,
    '2026-2027',
    5,
    'Applying for 5th semester No-Due clearance',
    fac1.id
  );
  check('No-Due request created successfully', !!req);
  check('Request attendance percentage is strictly NULL initially', req.attendance_percentage === null);
  check('Request attendance status is AWAITING_FACULTY_ENTRY', req.attendance_status === 'AWAITING_FACULTY_ENTRY');
  check('Academic verification status is PENDING', req.faculty_status === 'PENDING');

  // Check subject attendance records were initialized for the 2 subjects taught by department faculty
  const subRecords = Engine.getSubjectAttendanceForStudent(student.id, req.id);
  check('Subject attendance entries initialized for request', subRecords.length === 2, `Count: ${subRecords.length}`);

  const osSub = subRecords.find((s) => s.subject_name === 'Operating Systems');
  const dbSub = subRecords.find((s) => s.subject_name === 'Database Management Systems');
  check('Operating Systems assigned to Faculty 1', osSub && osSub.faculty_id === fac1.id);
  check('Database Systems assigned to Faculty 2', dbSub && dbSub.faculty_id === fac2.id);
  check('OS attendance percentage is initially NULL', osSub.attendance_percentage === null);
  check('DBMS attendance percentage is initially NULL', dbSub.attendance_percentage === null);
  check('OS status is AWAITING_ENTRY', osSub.status === 'AWAITING_ENTRY');
  check('DBMS status is AWAITING_ENTRY', dbSub.status === 'AWAITING_ENTRY');

  console.log('\n--- TEST GROUP 4: Incomplete Attendance Approval Block (Req A & D) ---');
  let blockedEmptyApproval = false;
  try {
    Engine.verifyFacultyApproval(req.id, fac1.id, 'Illegal approval without attendance');
  } catch (err) {
    blockedEmptyApproval = true;
  }
  check('Academic verification approval blocked when attendance is empty/incomplete', blockedEmptyApproval);

  console.log('\n--- TEST GROUP 5: Authorization & Cross-Subject Tampering Prevention (Req B & 4, 8) ---');
  // 1. Student attempting to modify attendance must be blocked
  let studentBlocked = false;
  try {
    Engine.recordSubjectAttendance({
      subjectRecordId: osSub.id,
      attendancePercentage: 95,
      facultyId: student.id,
    });
  } catch (err) {
    studentBlocked = true;
  }
  check('Student blocked from entering or modifying attendance (Req B & 8)', studentBlocked);

  // 2. Faculty 2 attempting to modify Faculty 1's subject (OS) must be blocked
  let crossFacultyBlocked = false;
  try {
    Engine.recordSubjectAttendance({
      subjectRecordId: osSub.id,
      attendancePercentage: 95,
      facultyId: fac2.id, // fac2 is assigned to DBMS, not OS!
    });
  } catch (err) {
    crossFacultyBlocked = true;
  }
  check('Faculty 2 blocked from entering attendance for Faculty 1 assigned subject (Req B.5 & 8)', crossFacultyBlocked);

  // 3. Percentage validation: values < 0 or > 100 must be rejected
  let invalidPctBlocked = false;
  try {
    Engine.recordSubjectAttendance({
      subjectRecordId: osSub.id,
      attendancePercentage: 115,
      facultyId: fac1.id,
    });
  } catch (err) {
    invalidPctBlocked = true;
  }
  check('Invalid percentage (> 100%) rejected by validator (Req B.6)', invalidPctBlocked);

  console.log('\n--- TEST GROUP 6: Partial Subject Entry & Overall Calculation Suppression (Req C & 5) ---');
  // Faculty 1 enters Operating Systems attendance: 42 attended out of 45 classes held (93.33%)
  const osResult = Engine.recordSubjectAttendance({
    subjectRecordId: osSub.id,
    classesHeld: 45,
    classesAttended: 42,
    remarks: 'Good attendance in OS lecture and lab',
    facultyId: fac1.id,
  });
  check('Faculty 1 successfully enters attendance for Operating Systems', osResult.subjectRecord.status === 'ENTERED');
  check('OS calculated percentage is 93.33%', osResult.subjectRecord.attendance_percentage === 93.33);

  // Check that overall attendance remains suppressed while DBMS attendance is still missing!
  const partialAcad = Engine.getAcademicRecordForStudent(student.id, '2026-2027', 5);
  check('Overall percentage is NOT displayed while subject data is missing (Req C & 5)', partialAcad.attendance_percentage === null);
  check('Attendance status transitions to ATTENDANCE_INCOMPLETE', partialAcad.attendance_status === 'ATTENDANCE_INCOMPLETE');
  check('Eligibility is NOT evaluated while incomplete', partialAcad.is_eligible === null);

  // Check approval is still blocked while incomplete
  let blockedIncompleteApproval = false;
  try {
    Engine.verifyFacultyApproval(req.id, fac1.id, 'Premature approval attempt');
  } catch (err) {
    blockedIncompleteApproval = true;
  }
  check('Academic verification blocked while any required subject is incomplete', blockedIncompleteApproval);

  console.log('\n--- TEST GROUP 7: Second Subject Entry & Automatic Overall Calculation (Req B, C, D & 6, 7) ---');
  // Faculty 2 enters Database Systems attendance: 38 attended out of 50 classes held (76.0%)
  const dbResult = Engine.recordSubjectAttendance({
    subjectRecordId: dbSub.id,
    classesHeld: 50,
    classesAttended: 38,
    remarks: 'Moderate attendance in DBMS',
    facultyId: fac2.id,
  });
  check('Faculty 2 successfully enters attendance for Database Systems', dbResult.subjectRecord.status === 'ENTERED');
  check('DBMS calculated percentage is 76%', dbResult.subjectRecord.attendance_percentage === 76.0);

  // Overall attendance should now be automatically calculated!
  // Weighted calculation: (42 + 38) / (45 + 50) = 80 / 95 = 84.21%
  const completedAcad = Engine.getAcademicRecordForStudent(student.id, '2026-2027', 5);
  check('Overall attendance status is ENTERED', completedAcad.attendance_status === 'ENTERED');
  check('Overall attendance calculated via WEIGHTED_CLASS_COUNT', completedAcad.calculation_method === 'WEIGHTED_CLASS_COUNT');
  check('Calculated overall percentage is 84.21%', completedAcad.attendance_percentage === 84.21);

  // Attendance threshold is default 85%. Since 84.21% < 85%, student is not eligible!
  check('Student marked NOT ELIGIBLE due to attendance shortage (< 85%) (Req D & 7)', completedAcad.is_eligible === false);

  // Faculty verification approval blocked due to shortage
  let blockedShortageApproval = false;
  try {
    Engine.verifyFacultyApproval(req.id, fac1.id, 'Approval despite shortage');
  } catch (err) {
    blockedShortageApproval = true;
  }
  check('Faculty approval blocked when calculated overall attendance < threshold (84.21% < 85%)', blockedShortageApproval);

  console.log('\n--- TEST GROUP 8: Subject Correction, Eligibility Recalculation & Approval (Req D & 9, 10) ---');
  // Faculty 2 corrects DBMS attendance after condonation/makeup class: 44 attended out of 50 classes (88.0%)
  // Total: (42 + 44) / (45 + 50) = 86 / 95 = 90.53%
  Engine.recordSubjectAttendance({
    subjectRecordId: dbSub.id,
    classesHeld: 50,
    classesAttended: 44,
    remarks: 'Makeup classes completed, updated to 44/50',
    facultyId: fac2.id,
  });

  const updatedAcad = Engine.getAcademicRecordForStudent(student.id, '2026-2027', 5);
  check('Recalculated overall attendance is 90.53%', updatedAcad.attendance_percentage === 90.53);
  check('Student is now ELIGIBLE for academic clearance (90.53% >= 85%)', updatedAcad.is_eligible === true);

  // Audit trail verification
  const auditLogs = Engine.getAuditLogs();
  const attLogs = auditLogs.filter((l) => l.action === 'ENTER_SUBJECT_ATTENDANCE');
  check('Audit log records ENTER_SUBJECT_ATTENDANCE events with history (Req F & 9)', attLogs.length >= 3);

  // Subject teachers approve attendance (Section 35 workflow gate)
  const reqSubjects = Engine.getSubjectAttendanceForStudent(student.id, req.id);
  for (const s of reqSubjects) {
    Engine.processSubjectTeacherDecision({
      subjectRecordId: s.id,
      facultyId: s.faculty_id,
      decision: 'APPROVE',
      remarks: 'Subject attendance approved by teacher',
    });
  }

  // Now responsible Faculty 1 can approve academic verification
  const approvedReq = Engine.verifyFacultyApproval(req.id, fac1.id, 'All subject attendance verified and complete.');
  check('Academic verification successfully approved', approvedReq.faculty_status === 'APPROVED');
  check('Request transitioned to IN_REVIEW for parallel clearances', approvedReq.status === 'IN_REVIEW');

  // Verify clearance items were created
  const clearanceItems = Engine.getClearanceItems().filter((ci) => ci.request_id === req.id);
  check('Parallel clearance desks initialized (Library, Accounts, Lab)', clearanceItems.length === 3);

  console.log('\n--- TEST GROUP 9: Downstream Clearance Workflow Continuity (Req G.10) ---');
  // Process departmental approvals
  const libStaff = Engine.provisionStaff(
    { fullName: 'Library Head', email: 'lib.sec33@cauvery.edu.in', role: 'library_staff', departmentId: cseDept.id, designation: 'Librarian', password: 'Password@2026' },
    admin.id
  );
  const accStaff = Engine.provisionStaff(
    { fullName: 'Accounts Head', email: 'acc.sec33@cauvery.edu.in', role: 'accounts_staff', departmentId: cseDept.id, designation: 'Accountant', password: 'Password@2026' },
    admin.id
  );
  const labStaff = Engine.provisionStaff(
    { fullName: 'Lab Head', email: 'lab.sec33@cauvery.edu.in', role: 'lab_staff', departmentId: cseDept.id, designation: 'Lab Instructor', password: 'Password@2026' },
    admin.id
  );

  const libItem = clearanceItems.find((i) => i.authority === 'library');
  const accItem = clearanceItems.find((i) => i.authority === 'accounts');
  const labItem = clearanceItems.find((i) => i.authority === 'lab');

  Engine.processClearanceDecision({ itemId: libItem.id, reviewerId: libStaff.id, decision: 'approve', remarks: 'No books overdue' });
  Engine.processClearanceDecision({ itemId: accItem.id, reviewerId: accStaff.id, decision: 'approve', remarks: 'Tuition fees cleared' });
  Engine.processClearanceDecision({ itemId: labItem.id, reviewerId: labStaff.id, decision: 'approve', remarks: 'Lab apparatus returned' });

  const readyForHod = Engine.getRequestById(req.id);
  check('All 3 desks approved, request transitioned to HOD_REVIEW', readyForHod.status === 'HOD_REVIEW');

  // HOD Final Clearance
  const finalCleared = Engine.processHodFinalClearance({
    requestId: req.id,
    hodId: cseHod.id,
    decision: 'approve',
    remarks: 'Approved for VTU examination hall ticket.',
  });

  check('HOD issues final clearance (CLEARED)', finalCleared.status === 'CLEARED');
  check('Verification ID generated', !!finalCleared.verification_id);
  check('Verification ID format CIT-VTU-2026-XXXXXXXX', finalCleared.verification_id.startsWith('CIT-VTU-2026-'));
  check('Hall ticket eligibility granted', finalCleared.hall_ticket_eligibility === 'ELIGIBLE');

  console.log('\n====================================================================');
  console.log(`SUMMARY: All ${passCount} / ${totalCount} checks PASSED!`);
  console.log('SECTION 33 ACCEPTANCE CRITERIA FULLY SATISFIED & VALIDATED');
  console.log('====================================================================\n');
}

runTests().catch((err) => {
  console.error('\n❌ TEST RUN ENCOUNTERED FATAL ERROR:', err);
  process.exit(1);
});
