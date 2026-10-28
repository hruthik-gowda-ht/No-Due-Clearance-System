// ==============================================================================
// VERIFICATION TEST SUITE: SECTION 35
// Multi-Subject Faculty Attendance, Individual Approvals, and Strict Workflow Gating
// Cauvery Institute of Technology ClearCampus Application (VTU 2026–2027)
// ==============================================================================

import { Engine, initializeEngine } from '../src/services/store.ts';
import { api } from '../src/services/api.ts';

console.log('====================================================================');
console.log('VERIFICATION TEST SUITE: SECTION 35 ACCEPTANCE CRITERIA');
console.log('Multi-Subject Faculty Attendance, Individual Approvals & Workflow Gating');
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

  console.log('--- SETUP: Provision Institutional Department, Staff & Teachers ---');
  // Admin: Dr. Srikantappa As
  const admin = Engine.getProfiles().find((p) => p.role === 'admin' && p.is_active) ||
    Engine.bootstrapInitialAdmin('admin@gmail.com', 'AdminPass@2026');
  check('Institutional Administrator active (Dr. Srikantappa As)', !!admin && admin.full_name === 'Dr. Srikantappa As');

  const depts = Engine.getDepartments();
  const cseDept = depts.find((d) => d.code === 'CSE') || Engine.addDepartment('CSE', 'Computer Science and Engineering', admin.id);
  const meDept = depts.find((d) => d.code === 'ME') || Engine.addDepartment('ME', 'Mechanical Engineering', admin.id);
  check('CSE and ME departments initialized', !!cseDept && !!meDept);

  // Subject Teacher A: Teaches Operating Systems
  const teacherA = Engine.provisionStaff(
    {
      fullName: 'Dr. Chaitra N (OS)',
      email: 'chaitra.sec35@cauvery.edu.in',
      role: 'faculty',
      departmentId: cseDept.id,
      designation: 'Associate Professor',
      password: 'FacultyPassword@2026',
      subjects: ['Operating Systems'],
      semester: 5,
    },
    admin.id
  );

  // Subject Teacher B: Teaches Database Management Systems
  const teacherB = Engine.provisionStaff(
    {
      fullName: 'Prof. Ramesh K (DBMS)',
      email: 'ramesh.sec35@cauvery.edu.in',
      role: 'faculty',
      departmentId: cseDept.id,
      designation: 'Assistant Professor',
      password: 'FacultyPassword@2026',
      subjects: ['Database Management Systems'],
      semester: 5,
    },
    admin.id
  );

  // Subject Teacher C: Teaches Computer Networks
  const teacherC = Engine.provisionStaff(
    {
      fullName: 'Dr. Girish B (CN)',
      email: 'girish.sec35@cauvery.edu.in',
      role: 'faculty',
      departmentId: cseDept.id,
      designation: 'Associate Professor',
      password: 'FacultyPassword@2026',
      subjects: ['Computer Networks'],
      semester: 5,
    },
    admin.id
  );

  // Primary Academic Verification Advisor
  const academicAdvisor = Engine.provisionStaff(
    {
      fullName: 'Prof. Manjunath V (Advisor)',
      email: 'manjunath.sec35@cauvery.edu.in',
      role: 'faculty',
      departmentId: cseDept.id,
      designation: 'Assistant Professor',
      password: 'FacultyPassword@2026',
      subjects: [],
      semester: 5,
    },
    admin.id
  );

  // ME Faculty (Unauthorized for CSE subjects)
  const meTeacher = Engine.provisionStaff(
    {
      fullName: 'Prof. Suresh ME',
      email: 'suresh.me.sec35@cauvery.edu.in',
      role: 'faculty',
      departmentId: meDept.id,
      designation: 'Assistant Professor',
      password: 'FacultyPassword@2026',
      subjects: ['Thermodynamics'],
      semester: 5,
    },
    admin.id
  );

  // Departmental Staff: Library, Accounts, Lab, HOD
  const libStaff = Engine.provisionStaff(
    {
      fullName: 'Smt. Lakshmi R',
      email: 'lib.sec35@cauvery.edu.in',
      role: 'library_staff',
      departmentId: cseDept.id,
      designation: 'Librarian',
      password: 'StaffPassword@2026',
    },
    admin.id
  );

  const accStaff = Engine.provisionStaff(
    {
      fullName: 'Sri. Venkatesh M',
      email: 'acc.sec35@cauvery.edu.in',
      role: 'accounts_staff',
      departmentId: cseDept.id,
      designation: 'Accounts Officer',
      password: 'StaffPassword@2026',
    },
    admin.id
  );

  const labStaff = Engine.provisionStaff(
    {
      fullName: 'Sri. Anand Lab',
      email: 'lab.sec35@cauvery.edu.in',
      role: 'lab_staff',
      departmentId: cseDept.id,
      designation: 'Lab Instructor',
      password: 'StaffPassword@2026',
    },
    admin.id
  );

  const hod = Engine.provisionStaff(
    {
      fullName: 'Dr. Puttaswamy HOD',
      email: 'hod.sec35@cauvery.edu.in',
      role: 'hod',
      departmentId: cseDept.id,
      designation: 'Professor & Head',
      password: 'StaffPassword@2026',
    },
    admin.id
  );

  check('Staff members provisioned across academic, library, accounts, lab, and HOD roles',
    !!teacherA && !!teacherB && !!teacherC && !!academicAdvisor && !!libStaff && !!accStaff && !!labStaff && !!hod
  );

  // Student 1 for Acceptance Tests 1 to 4
  const student1 = Engine.registerStudent({
    fullName: 'Varun Kumar (Sec 35 Student 1)',
    email: 'varun.sec35@cauvery.edu.in',
    studentId: '1CR23CS101',
    departmentId: cseDept.id,
    semester: 5,
    academicYear: '2026-2027',
    password: 'StudentPass@2026',
  });
  check('Student 1 registered', !!student1);

  // Student submits No-Due request with multiple faculty assigned
  const req1 = Engine.createRequest(
    student1.id,
    'CSE',
    '2026-2027',
    5,
    'Section 35 Acceptance Test Request',
    [academicAdvisor.id, teacherA.id, teacherB.id, teacherC.id]
  );
  check('Clearance request 1 created with multi-faculty assignments', !!req1 && req1.assigned_faculty_ids.length >= 3);

  // Check 35.1: Subject attendance records created separately
  const subRecords1 = Engine.getSubjectAttendanceForStudent(student1.id, req1.id);
  check('Section 35.1: 3 distinct subject attendance records created for request 1', subRecords1.length === 3);

  const osSub = subRecords1.find((s) => s.subject_name.toLowerCase().includes('operating systems'));
  const dbmsSub = subRecords1.find((s) => s.subject_name.toLowerCase().includes('database management systems'));
  const cnSub = subRecords1.find((s) => s.subject_name.toLowerCase().includes('computer networks'));

  check('Each subject has its own teacher assigned',
    !!osSub && osSub.faculty_id === teacherA.id &&
    !!dbmsSub && dbmsSub.faculty_id === teacherB.id &&
    !!cnSub && cnSub.faculty_id === teacherC.id
  );

  check('Section 35.1.6: Unentered attendance percentage is NULL (waiting for attendance)',
    osSub.attendance_percentage === null &&
    osSub.approval_status === 'WAITING_FOR_ATTENDANCE' &&
    osSub.is_locked === false
  );

  // ==============================================================================
  // ACCEPTANCE TEST 1: One of three teachers approves; the next stage remains blocked
  // ==============================================================================
  console.log('\n--- ACCEPTANCE TEST 1: One of Three Teachers Approves; Next Stage Remains Blocked ---');

  // Teacher A enters valid attendance for Operating Systems: 40 conducted, 36 attended = 90%
  const entRes1 = Engine.recordSubjectAttendance({
    subjectRecordId: osSub.id,
    classesHeld: 40,
    classesAttended: 36,
    facultyId: teacherA.id,
    remarks: 'Attendance entered by Dr. Chaitra N',
  });
  check('Teacher A entered attendance for Operating Systems (40 conducted, 36 attended = 90%)',
    entRes1.subjectRecord.attendance_percentage === 90 &&
    entRes1.subjectRecord.approval_status === 'AWAITING_APPROVAL'
  );

  // Teacher A approves Operating Systems
  const appRes1 = Engine.processSubjectTeacherDecision({
    subjectRecordId: osSub.id,
    facultyId: teacherA.id,
    decision: 'APPROVE',
    remarks: 'Operating Systems attendance approved.',
  });
  check('Teacher A explicitly approved Operating Systems',
    appRes1.subjectRecord.approval_status === 'APPROVED' &&
    appRes1.subjectRecord.approved_by === teacherA.id &&
    appRes1.subjectRecord.is_locked === true
  );

  // Check progress: 1 of 3 approved
  const acadProg1 = Engine.getAcademicRecordForStudent(student1.id, req1.academic_year, req1.semester);
  check('Progress shows 1 of 3 subject teachers approved',
    acadProg1.subject_approvals_count === 1 &&
    acadProg1.subject_approvals_total === 3 &&
    acadProg1.all_subject_approvals_completed === false
  );

  // Verify next stage (Academic Verification) remains blocked
  let test1Blocked = false;
  try {
    Engine.verifyFacultyApproval(req1.id, academicAdvisor.id, 'Attempting early approval');
  } catch (err) {
    test1Blocked = true;
    check('Academic verification blocked when 1 of 3 approved', err.message.includes('Academic Approval Blocked') || err.message.includes('awaiting'));
  }
  check('Acceptance Test 1 PASS: Next stage remains blocked with 1 of 3 approved', test1Blocked);

  // ==============================================================================
  // ACCEPTANCE TEST 2: Two of three teachers approve; the next stage remains blocked
  // ==============================================================================
  console.log('\n--- ACCEPTANCE TEST 2: Two of Three Teachers Approve; Next Stage Remains Blocked ---');

  // Teacher B enters valid attendance for DBMS: 42 conducted, 38 attended = 90.48%
  Engine.recordSubjectAttendance({
    subjectRecordId: dbmsSub.id,
    classesHeld: 42,
    classesAttended: 38,
    facultyId: teacherB.id,
    remarks: 'Attendance entered by Prof. Ramesh K',
  });

  // Teacher B approves DBMS
  Engine.processSubjectTeacherDecision({
    subjectRecordId: dbmsSub.id,
    facultyId: teacherB.id,
    decision: 'APPROVE',
    remarks: 'DBMS attendance approved.',
  });

  // Check progress: 2 of 3 approved
  const acadProg2 = Engine.getAcademicRecordForStudent(student1.id, req1.academic_year, req1.semester);
  check('Progress shows 2 of 3 subject teachers approved',
    acadProg2.subject_approvals_count === 2 &&
    acadProg2.subject_approvals_total === 3 &&
    acadProg2.all_subject_approvals_completed === false
  );

  // Verify next stage remains blocked
  let test2Blocked = false;
  try {
    Engine.verifyFacultyApproval(req1.id, academicAdvisor.id, 'Attempting approval with 2 of 3');
  } catch (err) {
    test2Blocked = true;
    check('Academic verification blocked when 2 of 3 approved', err.message.includes('Computer Networks') || err.message.includes('Academic Approval Blocked'));
  }
  check('Acceptance Test 2 PASS: Next stage remains blocked with 2 of 3 approved', test2Blocked);

  // ==============================================================================
  // ACCEPTANCE TEST 3: All three teachers enter attendance, but one has not approved; next stage remains blocked
  // ==============================================================================
  console.log('\n--- ACCEPTANCE TEST 3: All Three Enter Attendance, But One Has Not Approved; Next Stage Blocked ---');

  // Teacher C enters valid attendance for Computer Networks: 45 conducted, 40 attended = 88.89%
  Engine.recordSubjectAttendance({
    subjectRecordId: cnSub.id,
    classesHeld: 45,
    classesAttended: 40,
    facultyId: teacherC.id,
    remarks: 'CN attendance entered, but not yet approved.',
  });

  const cnSubAfterEntry = Engine.getSubjectAttendanceRecords().find((s) => s.id === cnSub.id);
  check('Teacher C entered attendance, status is AWAITING_APPROVAL',
    cnSubAfterEntry.attendance_percentage === 88.89 &&
    cnSubAfterEntry.approval_status === 'AWAITING_APPROVAL' &&
    cnSubAfterEntry.is_locked === false
  );

  // All 3 teachers have entered attendance, but Teacher C has not approved!
  let test3Blocked = false;
  try {
    Engine.verifyFacultyApproval(req1.id, academicAdvisor.id, 'Attempting approval before Teacher C approves');
  } catch (err) {
    test3Blocked = true;
    check('Gate strictly enforces that entering attendance != approval',
      err.message.includes('awaiting explicit approval from teacher Dr. Girish B') ||
      err.message.includes('Academic Approval Blocked')
    );
  }
  check('Acceptance Test 3 PASS: Next stage remains blocked when 3 entered but 1 unapproved', test3Blocked);

  // ==============================================================================
  // ACCEPTANCE TEST 4: All required teachers enter valid attendance and approve; system may advance
  // ==============================================================================
  console.log('\n--- ACCEPTANCE TEST 4: All Required Teachers Approve; System May Advance ---');

  // Teacher C explicitly approves Computer Networks
  Engine.processSubjectTeacherDecision({
    subjectRecordId: cnSub.id,
    facultyId: teacherC.id,
    decision: 'APPROVE',
    remarks: 'Computer Networks attendance approved.',
  });

  // Verify all 3 subjects are approved
  const acadProg4 = Engine.getAcademicRecordForStudent(student1.id, req1.academic_year, req1.semester);
  check('All 3 of 3 subject teachers have approved',
    acadProg4.subject_approvals_count === 3 &&
    acadProg4.subject_approvals_total === 3 &&
    acadProg4.all_subject_approvals_completed === true
  );

  // Overall attendance calculation check: (36 + 38 + 40) / (40 + 42 + 45) = 114 / 127 = 89.76% >= 85%
  check('Overall weighted attendance automatically calculated',
    acadProg4.attendance_percentage === 89.76 &&
    acadProg4.is_eligible === true
  );

  // Primary Academic Advisor conducts academic verification -> SUCCEEDS!
  const req1Approved = Engine.verifyFacultyApproval(
    req1.id,
    academicAdvisor.id,
    'All subject attendance records verified and approved by respective teachers.'
  );
  check('Academic verification successfully approved',
    req1Approved.faculty_status === 'APPROVED' &&
    req1Approved.status === 'IN_REVIEW'
  );

  // Downstream stages (e.g. Library clearance) can now proceed
  const libItems = Engine.getClearanceItems().filter((ci) => ci.request_id === req1.id && ci.authority === 'library');
  check('Library clearance item exists and is ready for review', libItems.length > 0 && libItems[0].status === 'PENDING');

  const req1Lib = Engine.processClearanceDecision({
    itemId: libItems[0].id,
    reviewerId: libStaff.id,
    decision: 'approve',
    remarks: 'No library dues.',
  });
  check('Departmental library clearance approved following successful academic verification',
    req1Lib.library_status === 'APPROVED'
  );
  check('Acceptance Test 4 PASS: System advances after all subject teachers approve and prerequisites met', true);

  // ==============================================================================
  // ACCEPTANCE TEST 5: One teacher rejects or requests a correction; the next stage remains blocked
  // ==============================================================================
  console.log('\n--- ACCEPTANCE TEST 5: One Teacher Rejects or Requests Correction; Next Stage Blocked ---');

  // Student 2 for Test 5
  const student2 = Engine.registerStudent({
    fullName: 'Ananya Sharma (Sec 35 Student 2)',
    email: 'ananya.sec35@cauvery.edu.in',
    studentId: '1CR23CS102',
    departmentId: cseDept.id,
    semester: 5,
    academicYear: '2026-2027',
    password: 'StudentPass@2026',
  });

  const req2 = Engine.createRequest(
    student2.id,
    'CSE',
    '2026-2027',
    5,
    'Test 5 Request',
    [academicAdvisor.id, teacherA.id, teacherB.id, teacherC.id]
  );

  const subRecords2 = Engine.getSubjectAttendanceForStudent(student2.id, req2.id);
  const osSub2 = subRecords2.find((s) => s.subject_name.toLowerCase().includes('operating systems'));
  const dbmsSub2 = subRecords2.find((s) => s.subject_name.toLowerCase().includes('database management systems'));
  const cnSub2 = subRecords2.find((s) => s.subject_name.toLowerCase().includes('computer networks'));

  // Teacher A enters & approves OS
  Engine.recordSubjectAttendance({ subjectRecordId: osSub2.id, classesHeld: 40, classesAttended: 38, facultyId: teacherA.id });
  Engine.processSubjectTeacherDecision({ subjectRecordId: osSub2.id, facultyId: teacherA.id, decision: 'APPROVE' });

  // Teacher B enters attendance for DBMS, but flags CORRECTION_REQUIRED due to discrepancy
  Engine.recordSubjectAttendance({ subjectRecordId: dbmsSub2.id, classesHeld: 40, classesAttended: 30, facultyId: teacherB.id });
  Engine.processSubjectTeacherDecision({
    subjectRecordId: dbmsSub2.id,
    facultyId: teacherB.id,
    decision: 'CORRECTION_REQUIRED',
    remarks: 'Medical certificate attendance adjustment needed.',
  });

  // Teacher C enters & approves CN
  Engine.recordSubjectAttendance({ subjectRecordId: cnSub2.id, classesHeld: 45, classesAttended: 42, facultyId: teacherC.id });
  Engine.processSubjectTeacherDecision({ subjectRecordId: cnSub2.id, facultyId: teacherC.id, decision: 'APPROVE' });

  // Verify next stage is blocked due to CORRECTION_REQUIRED on DBMS
  let test5CorrBlocked = false;
  try {
    Engine.verifyFacultyApproval(req2.id, academicAdvisor.id, 'Attempting approval while correction pending');
  } catch (err) {
    test5CorrBlocked = true;
    check('Gate blocked on CORRECTION_REQUIRED', err.message.includes('corrections pending'));
  }
  check('Progression blocked when subject requires correction', test5CorrBlocked);

  // Now Teacher B rejects attendance
  Engine.processSubjectTeacherDecision({
    subjectRecordId: dbmsSub2.id,
    facultyId: teacherB.id,
    decision: 'REJECT',
    remarks: 'Attendance record rejected due to falsified attendance claim.',
  });

  // Verify next stage is blocked due to REJECTED on DBMS
  let test5RejBlocked = false;
  try {
    Engine.verifyFacultyApproval(req2.id, academicAdvisor.id, 'Attempting approval while subject rejected');
  } catch (err) {
    test5RejBlocked = true;
    check('Gate blocked on REJECTED status', err.message.includes('rejected by'));
  }
  check('Acceptance Test 5 PASS: Rejection or correction request stops workflow progression', test5RejBlocked);

  // ==============================================================================
  // ACCEPTANCE TEST 6: Teacher attempts to approve another teacher's subject; operation denied
  // ==============================================================================
  console.log('\n--- ACCEPTANCE TEST 6: Teacher Attempts Unauthorized Cross-Subject Approval; Denied ---');

  // Teacher B (DBMS) attempts to approve Teacher A's subject (Operating Systems)
  let test6DeniedCrossSubject = false;
  try {
    Engine.processSubjectTeacherDecision({
      subjectRecordId: osSub.id,
      facultyId: teacherB.id, // Teacher B trying to approve Teacher A's subject
      decision: 'APPROVE',
      remarks: 'Unauthorized approval attempt',
    });
  } catch (err) {
    test6DeniedCrossSubject = true;
    check('Cross-teacher approval rejected', err.message.includes('not authorized to approve attendance for another teacher'));
  }
  check('Cross-subject approval by unauthorized teacher is denied', test6DeniedCrossSubject);

  // Mechanical Engineering teacher attempts to approve CSE subject
  let test6DeniedCrossDept = false;
  try {
    Engine.processSubjectTeacherDecision({
      subjectRecordId: osSub.id,
      facultyId: meTeacher.id,
      decision: 'APPROVE',
    });
  } catch (err) {
    test6DeniedCrossDept = true;
    check('Cross-department approval rejected', err.message.includes('Access Denied'));
  }
  check('Acceptance Test 6 PASS: Unauthorized teacher approvals strictly denied', test6DeniedCrossDept);

  // ==============================================================================
  // ACCEPTANCE TEST 7: User attempts to bypass gate by calling backend endpoint directly; denied
  // ==============================================================================
  console.log('\n--- ACCEPTANCE TEST 7: Bypass Gate by Direct Endpoint Invocation; Denied ---');

  // Student 3 with fresh unapproved request
  const student3 = Engine.registerStudent({
    fullName: 'Sneha Patel (Sec 35 Student 3)',
    email: 'sneha.sec35@cauvery.edu.in',
    studentId: '1CR23CS103',
    departmentId: cseDept.id,
    semester: 5,
    academicYear: '2026-2027',
    password: 'StudentPass@2026',
  });

  const req3 = Engine.createRequest(
    student3.id,
    'CSE',
    '2026-2027',
    5,
    'Test 7 Bypass Attempt',
    [academicAdvisor.id, teacherA.id, teacherB.id, teacherC.id]
  );

  // Direct backend call 1: Call verifyFacultyApproval without subject approvals
  let test7BypassDirectVerify = false;
  try {
    Engine.verifyFacultyApproval(req3.id, academicAdvisor.id, 'Bypassing subject approvals');
  } catch (err) {
    test7BypassDirectVerify = true;
    check('Direct backend verifyFacultyApproval call blocked', err.message.includes('Academic Approval Blocked'));
  }
  check('Direct academic verification bypass denied', test7BypassDirectVerify);

  // Direct backend call 2: Call processClearanceDecision for Accounts or Library to jump over attendance
  const req3LibItem = Engine.getClearanceItems().find((ci) => ci.request_id === req3.id && ci.authority === 'library');
  let test7BypassDownstream = false;
  try {
    Engine.processClearanceDecision({
      itemId: req3LibItem.id,
      reviewerId: libStaff.id,
      decision: 'approve',
      remarks: 'Attempting downstream bypass',
    });
  } catch (err) {
    test7BypassDownstream = true;
    check('Direct downstream clearance bypass blocked by server gate', err.message.includes('Clearance Review Blocked'));
  }
  check('Acceptance Test 7 PASS: Direct backend bypass attempts are denied at trusted layer', test7BypassDownstream);

  // ==============================================================================
  // ACCEPTANCE TEST 8: Two teachers submit approvals simultaneously; state remains consistent
  // ==============================================================================
  console.log('\n--- ACCEPTANCE TEST 8: Simultaneous Multi-Teacher Approvals; Consistent State ---');

  // Student 4 for concurrent approval test
  const student4 = Engine.registerStudent({
    fullName: 'Rohit Verma (Sec 35 Student 4)',
    email: 'rohit.sec35@cauvery.edu.in',
    studentId: '1CR23CS104',
    departmentId: cseDept.id,
    semester: 5,
    academicYear: '2026-2027',
    password: 'StudentPass@2026',
  });

  const req4 = Engine.createRequest(
    student4.id,
    'CSE',
    '2026-2027',
    5,
    'Test 8 Concurrent Approvals',
    [academicAdvisor.id, teacherA.id, teacherB.id, teacherC.id]
  );

  const subRecords4 = Engine.getSubjectAttendanceForStudent(student4.id, req4.id);
  const osSub4 = subRecords4.find((s) => s.subject_name.toLowerCase().includes('operating systems'));
  const dbmsSub4 = subRecords4.find((s) => s.subject_name.toLowerCase().includes('database management systems'));
  const cnSub4 = subRecords4.find((s) => s.subject_name.toLowerCase().includes('computer networks'));

  // Enter valid attendance for all three
  Engine.recordSubjectAttendance({ subjectRecordId: osSub4.id, classesHeld: 40, classesAttended: 36, facultyId: teacherA.id });
  Engine.recordSubjectAttendance({ subjectRecordId: dbmsSub4.id, classesHeld: 42, classesAttended: 38, facultyId: teacherB.id });
  Engine.recordSubjectAttendance({ subjectRecordId: cnSub4.id, classesHeld: 45, classesAttended: 40, facultyId: teacherC.id });

  // Simulate concurrent approvals using Promise.all
  console.log('Dispatching concurrent approvals from Teacher A and Teacher B...');
  const [resA, resB] = await Promise.all([
    api.processSubjectTeacherDecision({
      subjectRecordId: osSub4.id,
      facultyId: teacherA.id,
      decision: 'APPROVE',
      remarks: 'Concurrent approval A',
    }),
    api.processSubjectTeacherDecision({
      subjectRecordId: dbmsSub4.id,
      facultyId: teacherB.id,
      decision: 'APPROVE',
      remarks: 'Concurrent approval B',
    }),
  ]);

  check('Concurrent approval from Teacher A resolved', resA.subjectRecord.approval_status === 'APPROVED');
  check('Concurrent approval from Teacher B resolved', resB.subjectRecord.approval_status === 'APPROVED');

  // Verify database consistency: both approvals must exist and be locked
  const updatedSubs4 = Engine.getSubjectAttendanceForStudent(student4.id, req4.id);
  const updatedOs4 = updatedSubs4.find((s) => s.id === osSub4.id);
  const updatedDbms4 = updatedSubs4.find((s) => s.id === dbmsSub4.id);

  check('Both subject records are APPROVED and locked in persistent storage',
    updatedOs4.approval_status === 'APPROVED' && updatedOs4.is_locked === true &&
    updatedDbms4.approval_status === 'APPROVED' && updatedDbms4.is_locked === true
  );

  // Check decision log in TEACHER_APPROVAL_DECISIONS
  const decisions = Engine.getTeacherApprovalDecisions(req4.id);
  check('Decision history records persisted for both concurrent approvals',
    decisions.some((d) => d.faculty_id === teacherA.id && d.decision === 'APPROVE') &&
    decisions.some((d) => d.faculty_id === teacherB.id && d.decision === 'APPROVE')
  );

  // Check progress: exactly 2 of 3 approved
  const acadProg4Sim = Engine.getAcademicRecordForStudent(student4.id, req4.academic_year, req4.semester);
  check('Academic progress accurately reflects 2 of 3 approved without losing updates',
    acadProg4Sim.subject_approvals_count === 2 &&
    acadProg4Sim.subject_approvals_total === 3
  );
  check('Acceptance Test 8 PASS: Concurrent approvals maintain state consistency without loss', true);

  // ==============================================================================
  // ACCEPTANCE TEST 9: Teacher's assignment changes; validates new assignment & preserves audit history
  // ==============================================================================
  console.log('\n--- ACCEPTANCE TEST 9: Teacher Assignment Changes; Validates New Assignment & Preserves Audit History ---');

  // Provision replacement teacher for Operating Systems (CSE)
  const teacherAReplacement = Engine.provisionStaff(
    {
      fullName: 'Prof. Shashi Kumar (OS Replacement)',
      email: 'shashi.sec35@cauvery.edu.in',
      role: 'faculty',
      departmentId: cseDept.id,
      designation: 'Assistant Professor',
      password: 'FacultyPassword@2026',
      subjects: ['Operating Systems'],
      semester: 5,
    },
    admin.id
  );
  check('Replacement teacher provisioned for Operating Systems', !!teacherAReplacement);

  // On Request 4, Operating Systems was previously approved by Teacher A.
  // Admin reassigns the request teacher to teacherAReplacement
  const priorDecisionsCount = Engine.getTeacherApprovalDecisions(req4.id).length;

  const reassignRes = Engine.reassignTeacher({
    requestId: req4.id,
    newFacultyIds: [academicAdvisor.id, teacherAReplacement.id, teacherB.id, teacherC.id],
    userId: admin.id,
    role: 'admin',
    reason: 'Teacher A on institutional leave; transferred to Prof. Shashi Kumar',
  });

  check('Teacher reassignment completed successfully',
    reassignRes.request.assigned_faculty_ids.includes(teacherAReplacement.id)
  );

  // Verify Section 35.6 rule: "Do not silently transfer an old teacher's approval to a new teacher."
  const subAfterReassign = Engine.getSubjectAttendanceForStudent(student4.id, req4.id).find((s) => s.id === osSub4.id);
  check('Section 35.6: Operating Systems assigned teacher updated to new teacher',
    subAfterReassign.faculty_id === teacherAReplacement.id &&
    subAfterReassign.faculty_name === teacherAReplacement.full_name
  );

  check('Section 35.6: Previous approval was NOT silently transferred; resets to AWAITING_APPROVAL and unlocked',
    subAfterReassign.approval_status === 'AWAITING_APPROVAL' &&
    subAfterReassign.is_locked === false
  );

  // Verify previous decision history and audit logs are preserved
  const decisionsAfter = Engine.getTeacherApprovalDecisions(req4.id);
  check('Section 35.6: Previous teacher approval decision records fully preserved in audit history',
    decisionsAfter.length >= priorDecisionsCount &&
    decisionsAfter.some((d) => d.faculty_id === teacherA.id && d.decision === 'APPROVE')
  );

  // Verify the new teacher can now review and approve
  const newTeacherDecision = Engine.processSubjectTeacherDecision({
    subjectRecordId: subAfterReassign.id,
    facultyId: teacherAReplacement.id,
    decision: 'APPROVE',
    remarks: 'Re-reviewed and approved by replacement faculty Prof. Shashi Kumar',
  });

  check('New teacher successfully reviewed and approved their subject',
    newTeacherDecision.subjectRecord.approval_status === 'APPROVED' &&
    newTeacherDecision.subjectRecord.approved_by === teacherAReplacement.id
  );

  check('Acceptance Test 9 PASS: Assignment change validated, previous audit history preserved, no silent transfer', true);

  console.log('\n====================================================================');
  console.log(`ALL SECTION 35 ACCEPTANCE TESTS PASSED: ${passCount} / ${totalCount} checks successful!`);
  console.log('====================================================================\n');
}

runTests().catch((err) => {
  console.error('\n❌ SECTION 35 TEST SUITE FAILED:', err);
  process.exit(1);
});
