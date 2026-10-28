// ==============================================================================
// VERIFICATION TEST SUITE: SECTION 34
// Section 34: Fix Attendance Entry, Multiple Faculty Selection, and Workflow Continuity
// Cauvery Institute of Technology ClearCampus Application
// ==============================================================================

import { Engine, initializeEngine } from '../src/services/store.ts';
import { api } from '../src/services/api.ts';

console.log('====================================================================');
console.log('VERIFICATION TEST SUITE: SECTION 34 ACCEPTANCE CRITERIA');
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

  console.log('--- TEST GROUP 1: Provision Departments & Multiple Faculty Accounts ---');
  const admin = Engine.getProfiles().find((p) => p.role === 'admin' && p.is_active) ||
    Engine.bootstrapInitialAdmin('admin@gmail.com', 'AdminPass@2026');
  check('Admin active for test setup', !!admin);

  const depts = Engine.getDepartments();
  const cseDept = depts.find((d) => d.code === 'CSE') || Engine.addDepartment('CSE', 'Computer Science and Engineering', admin.id);
  const meDept = depts.find((d) => d.code === 'ME') || Engine.addDepartment('ME', 'Mechanical Engineering', admin.id);
  check('CSE and ME Departments available', !!cseDept && !!meDept);

  // Faculty 1: Teaches Operating Systems (CSE)
  const fac1 = Engine.provisionStaff(
    {
      fullName: 'Dr. Chaitra N',
      email: 'chaitra.sec34@cauvery.edu.in',
      role: 'faculty',
      departmentId: cseDept.id,
      designation: 'Associate Professor',
      password: 'FacultyPassword@2026',
      subjects: ['Operating Systems'],
      semester: 5,
    },
    admin.id
  );

  // Faculty 2: Teaches Database Management Systems (CSE)
  const fac2 = Engine.provisionStaff(
    {
      fullName: 'Prof. Ramesh K',
      email: 'ramesh.sec34@cauvery.edu.in',
      role: 'faculty',
      departmentId: cseDept.id,
      designation: 'Assistant Professor',
      password: 'FacultyPassword@2026',
      subjects: ['Database Management Systems'],
      semester: 5,
    },
    admin.id
  );

  // Faculty 3: CSE Faculty Advisor (Academic Verification & Mentor)
  const fac3 = Engine.provisionStaff(
    {
      fullName: 'Dr. Girish B',
      email: 'girish.sec34@cauvery.edu.in',
      role: 'faculty',
      departmentId: cseDept.id,
      designation: 'Associate Professor',
      password: 'FacultyPassword@2026',
      subjects: [],
      semester: 5,
    },
    admin.id
  );

  // Faculty 4: Mechanical faculty (unauthorized for CSE)
  const meFac = Engine.provisionStaff(
    {
      fullName: 'Prof. Suresh ME',
      email: 'suresh.me.sec34@cauvery.edu.in',
      role: 'faculty',
      departmentId: meDept.id,
      designation: 'Assistant Professor',
      password: 'FacultyPassword@2026',
      subjects: ['Thermodynamics'],
      semester: 5,
    },
    admin.id
  );

  // Staff: Library, Accounts, Lab & HOD
  const libStaff = Engine.provisionStaff(
    {
      fullName: 'Librarian CIT',
      email: 'library.sec34@cauvery.edu.in',
      role: 'library_staff',
      departmentId: cseDept.id,
      designation: 'Librarian',
      password: 'StaffPassword@2026',
    },
    admin.id
  );

  const accStaff = Engine.provisionStaff(
    {
      fullName: 'Accounts Officer CIT',
      email: 'accounts.sec34@cauvery.edu.in',
      role: 'accounts_staff',
      departmentId: cseDept.id,
      designation: 'Accounts Superintendent',
      password: 'StaffPassword@2026',
    },
    admin.id
  );

  const labStaff = Engine.provisionStaff(
    {
      fullName: 'Lab Instructor CIT',
      email: 'lab.sec34@cauvery.edu.in',
      role: 'lab_staff',
      departmentId: cseDept.id,
      designation: 'Lab Instructor',
      password: 'StaffPassword@2026',
    },
    admin.id
  );

  const cseHod = Engine.provisionStaff(
    {
      fullName: 'Dr. Srikantappa As',
      email: 'hod.cse.sec34@cauvery.edu.in',
      role: 'hod',
      departmentId: cseDept.id,
      designation: 'Professor & HOD',
      password: 'HodPassword@2026',
    },
    admin.id
  );

  check('Faculty 1, 2, 3 provisioned in CSE', !!fac1 && !!fac2 && !!fac3);
  check('ME Faculty provisioned in ME', !!meFac);
  check('Library, Accounts, Lab & HOD provisioned', !!libStaff && !!accStaff && !!labStaff && !!cseHod);

  console.log('\n--- TEST GROUP 2: Eligible Faculty Dynamic Filtering (Req E & 8) ---');
  // Student registers in CSE
  const student = Engine.registerStudent({
    fullName: 'Ananya Sharma',
    email: 'ananya.sec34@cauvery.edu.in',
    studentId: '1CR22CS201',
    department: 'CSE',
    departmentId: cseDept.id,
    semester: 5,
    academicYear: '2026-2027',
    batch: '2022-2026',
    password: 'StudentPass@2026',
    assignedFacultyId: fac1.id,
  });
  check('Student registered in CSE', !!student);

  // Retrieve eligible faculty for student's department
  const eligibleFaculty = await api.getFacultyForDepartment(cseDept.id);
  const eligibleIds = eligibleFaculty.map((f) => f.id);
  check('Only CSE faculty returned in eligible list', !eligibleIds.includes(meFac.id));
  check('Faculty 1, 2, 3 included in eligible list', eligibleIds.includes(fac1.id) && eligibleIds.includes(fac2.id) && eligibleIds.includes(fac3.id));
  check('All eligible faculty are active and verified', eligibleFaculty.every((f) => f.is_active));

  console.log('\n--- TEST GROUP 3: Multi-Faculty Selection for New Request (Req E & 6) ---');
  // Student submits No-Due request selecting MULTIPLE faculty members: fac1 and fac2
  const multiFacultyIds = [fac1.id, fac2.id];
  const newReq = await api.createNoDueRequest({
    studentId: student.id,
    academicYear: '2026-2027',
    semester: 5,
    selectedFacultyId: multiFacultyIds,
    studyMode: 'REGULAR',
  });

  check('Request created with request code', !!newReq && !!newReq.request_code);
  check('Request contains assigned_faculty_ids array', Array.isArray(newReq.assigned_faculty_ids) && newReq.assigned_faculty_ids.length === 2);
  check('assigned_faculty_ids matches selected faculty', newReq.assigned_faculty_ids.includes(fac1.id) && newReq.assigned_faculty_ids.includes(fac2.id));
  check('Primary assigned_faculty_id synced for backward compatibility', newReq.assigned_faculty_id === fac1.id);

  // Check relational request_faculty_assignments table
  const assignments = Engine.getRequestFacultyAssignments(newReq.id);
  check('Relational request_faculty_assignments records created', assignments.length >= 2);
  check('Relational assignments link to fac1 and fac2', assignments.some((a) => a.faculty_id === fac1.id) && assignments.some((a) => a.faculty_id === fac2.id));

  // Check faculty_review_tasks table
  const reviewTasks = Engine.getFacultyReviewTasks(newReq.id);
  check('Relational faculty_review_tasks created for all assigned faculty', reviewTasks.length >= 2);
  check('Both fac1 and fac2 have review tasks', reviewTasks.some((t) => t.faculty_id === fac1.id) && reviewTasks.some((t) => t.faculty_id === fac2.id));

  // Check both faculty see the request in their dashboard
  const fac1Requests = await api.getFacultyDashboardData(fac1.id);
  const fac2Requests = await api.getFacultyDashboardData(fac2.id);
  check('Faculty 1 sees the request in queue', fac1Requests.requests.some((r) => r.id === newReq.id));
  check('Faculty 2 sees the request in queue', fac2Requests.requests.some((r) => r.id === newReq.id));

  console.log('\n--- TEST GROUP 4: Initial Attendance Is Empty & Overall Attendance Unavailable (Req B, D & 4, 5) ---');
  const initialAcad = await api.getAcademicRecordForStudent(student.id, '2026-2027', 5);
  check('Initial attendance percentage is NULL', initialAcad.attendance_percentage === null);
  check('Initial attendance status is AWAITING_FACULTY_ENTRY', initialAcad.attendance_status === 'AWAITING_FACULTY_ENTRY');
  check('No fabricated or placeholder attendance values (e.g. not 0% or 85%)', initialAcad.attendance_percentage !== 0 && initialAcad.attendance_percentage !== 85);

  const initialSubjectRecords = await api.getSubjectAttendanceForStudent(student.id, '2026-2027', 5);
  check('Initial subject attendance records created for required subjects', initialSubjectRecords.length >= 2);
  check('All initial subject attendance records are AWAITING_ENTRY', initialSubjectRecords.every((s) => s.status === 'AWAITING_ENTRY' && s.attendance_percentage === null));

  console.log('\n--- TEST GROUP 5: Class Counts Entry & Calculation (Req A, B & 1, 2) ---');
  // Find subject record assigned to fac1 (Operating Systems)
  const osRecord = initialSubjectRecords.find((s) => s.faculty_id === fac1.id);
  check('Operating Systems record assigned to Faculty 1 found', !!osRecord);

  // Test 2: Validation of invalid counts
  // Test negative classes conducted
  let threwExpected = false;
  try {
    await api.recordSubjectAttendance({
      subjectRecordId: osRecord.id,
      classesHeld: -10,
      classesAttended: 5,
      facultyId: fac1.id,
    });
  } catch (err) {
    threwExpected = true;
  }
  check('Rejected negative classes conducted', threwExpected);

  // Test zero classes conducted
  threwExpected = false;
  try {
    await api.recordSubjectAttendance({
      subjectRecordId: osRecord.id,
      classesHeld: 0,
      classesAttended: 0,
      facultyId: fac1.id,
    });
  } catch (err) {
    threwExpected = true;
  }
  check('Rejected zero classes conducted', threwExpected);

  // Test attended > conducted
  threwExpected = false;
  try {
    await api.recordSubjectAttendance({
      subjectRecordId: osRecord.id,
      classesHeld: 40,
      classesAttended: 45,
      facultyId: fac1.id,
    });
  } catch (err) {
    threwExpected = true;
  }
  check('Rejected classes attended exceeding conducted', threwExpected);

  // Test fractional / non-integer counts
  threwExpected = false;
  try {
    await api.recordSubjectAttendance({
      subjectRecordId: osRecord.id,
      classesHeld: 40.5,
      classesAttended: 34,
      facultyId: fac1.id,
    });
  } catch (err) {
    threwExpected = true;
  }
  check('Rejected non-integer classes conducted', threwExpected);

  // Test 1: Valid attendance entry: Conducted = 40, Attended = 34 -> (34 / 40) * 100 = 85.00%
  const osResult = await api.recordSubjectAttendance({
    subjectRecordId: osRecord.id,
    classesHeld: 40,
    classesAttended: 34,
    remarks: 'Consistent laboratory and lecture performance',
    facultyId: fac1.id,
  });
  const updatedOs = osResult.subjectRecord;

  check('Calculated attendance percentage is exactly 85%', updatedOs.attendance_percentage === 85);
  check('Preserved actual classes_held count in database', updatedOs.classes_held === 40);
  check('Preserved actual classes_conducted count in database', (updatedOs.classes_conducted || updatedOs.classes_held) === 40);
  check('Preserved actual classes_attended count in database', updatedOs.classes_attended === 34);
  check('Status marked ENTERED', updatedOs.status === 'ENTERED');

  console.log('\n--- TEST GROUP 6: Subject Faculty Authorization & Tampering Protection (Req C & 3, 12) ---');
  // Faculty 1 attempts to enter attendance for DBMS (assigned to Faculty 2)
  const dbmsRecord = initialSubjectRecords.find((s) => s.faculty_id === fac2.id);
  check('Database Systems record assigned to Faculty 2 found', !!dbmsRecord);

  threwExpected = false;
  try {
    await api.recordSubjectAttendance({
      subjectRecordId: dbmsRecord.id,
      classesHeld: 45,
      classesAttended: 40,
      facultyId: fac1.id, // UNAUTHORIZED! fac1 does not teach DBMS
    });
  } catch (err) {
    threwExpected = true;
  }
  check('Faculty 1 blocked from entering attendance for unassigned subject DBMS', threwExpected);

  // Mechanical faculty attempts to enter attendance
  threwExpected = false;
  try {
    await api.recordSubjectAttendance({
      subjectRecordId: dbmsRecord.id,
      classesHeld: 45,
      classesAttended: 40,
      facultyId: meFac.id, // UNAUTHORIZED! Different department
    });
  } catch (err) {
    threwExpected = true;
  }
  check('Mechanical faculty blocked from entering attendance for CSE subject', threwExpected);

  // Partial attendance check: Overall attendance must NOT be calculated yet
  const partialAcad = await api.getAcademicRecordForStudent(student.id, '2026-2027', 5);
  check('Overall attendance remains incomplete while required subjects missing', partialAcad.attendance_status === 'ATTENDANCE_INCOMPLETE');
  check('Overall attendance percentage remains NULL during partial entry', partialAcad.attendance_percentage === null);

  console.log('\n--- TEST GROUP 7: Complete Subject Attendance & Combined Count Formula (Req D & 5) ---');
  // Faculty 2 enters DBMS attendance: Conducted = 50, Attended = 42 -> 84.00%
  // Combined formula: (34 + 42) / (40 + 50) = 76 / 90 * 100 = 84.44%
  const dbmsResult = await api.recordSubjectAttendance({
    subjectRecordId: dbmsRecord.id,
    classesHeld: 50,
    classesAttended: 42,
    remarks: 'Regular attendance',
    facultyId: fac2.id,
  });
  const updatedDbms = dbmsResult.subjectRecord;

  check('DBMS attendance calculated to 84%', updatedDbms.attendance_percentage === 84);

  const completedAcad = await api.getAcademicRecordForStudent(student.id, '2026-2027', 5);
  check('Overall attendance status is ENTERED', completedAcad.attendance_status === 'ENTERED');
  // Combined: (34+42) / (40+50) = 76 / 90 = 84.44%
  check('Combined class count calculation: 76 / 90 = 84.44%', completedAcad.attendance_percentage === 84.44);
  check('Does NOT use simple average (which would be (85+84)/2 = 84.50%)', completedAcad.attendance_percentage !== 84.5);
  check('Evaluates against 85% threshold (84.44% < 85% -> shortage / not eligible)', completedAcad.is_eligible === false);

  console.log('\n--- TEST GROUP 8: Downstream Clearance Progress Before Faculty Change ---');
  // Mark Library clearance stage as approved to verify workflow continuity
  const reqBeforeReassign = Engine.getRequestById(newReq.id);
  const libItem = reqBeforeReassign.clearance_items.find((i) => i.authority === 'library');
  check('Library clearance item present', !!libItem);

  const approvedLibItem = Engine.updateClearanceItem({
    id: libItem.id,
    status: 'APPROVED',
    remarks: 'All books returned, no dues pending',
    reviewed_by: libStaff.id,
    reviewed_by_name: libStaff.full_name,
    reviewed_at: new Date().toISOString(),
  });
  check('Library clearance approved', approvedLibItem.status === 'APPROVED');

  console.log('\n--- TEST GROUP 9: Multi-Faculty Selection When Changing Teachers & Workflow Continuity (Req F, G & 7, 9, 10) ---');
  // Student changes assigned faculty before review begins:
  // Reassigns to Faculty 2 and Faculty 3
  const origReqId = newReq.id;
  const origCreatedAt = newReq.created_at;
  const origCode = newReq.request_code;

  const reassignResult = await api.reassignTeacher({
    requestId: newReq.id,
    newFacultyIds: [fac2.id, fac3.id],
    userId: student.id,
    role: 'student',
    reason: 'Elective specialization section update',
  });

  check('Reassignment succeeded', !!reassignResult && !!reassignResult.request);
  const reqAfterReassign = reassignResult.request;

  // Criterion 9: Preserves original request ID, submission date, request code
  check('CRITICAL: Request ID preserved (NOT recreated)', reqAfterReassign.id === origReqId);
  check('CRITICAL: Request submission date preserved', reqAfterReassign.created_at === origCreatedAt);
  check('CRITICAL: Request code preserved', reqAfterReassign.request_code === origCode);

  // Criterion 10: Preserves completed clearance stages (Library remains APPROVED)
  const libItemAfter = reqAfterReassign.clearance_items.find((i) => i.authority === 'library');
  check('CRITICAL: Library approval preserved (NOT reset)', libItemAfter.status === 'APPROVED');
  check('CRITICAL: Library approval comments intact', libItemAfter.remarks === 'All books returned, no dues pending');

  // Criterion 9: Preserves previously entered attendance records
  const subjectsAfterReassign = await api.getSubjectAttendanceForStudent(student.id, '2026-2027', 5);
  const osRecordAfter = subjectsAfterReassign.find((s) => s.subject_name === 'Operating Systems');
  const dbmsRecordAfter = subjectsAfterReassign.find((s) => s.subject_name === 'Database Management Systems');
  check('CRITICAL: Operating Systems attendance preserved (85%)', osRecordAfter.attendance_percentage === 85 && osRecordAfter.classes_attended === 34);
  check('CRITICAL: DBMS attendance preserved (84%)', dbmsRecordAfter.attendance_percentage === 84 && dbmsRecordAfter.classes_attended === 42);

  // Check multi-faculty assignments updated
  check('Request assigned_faculty_ids updated to fac2 and fac3', reqAfterReassign.assigned_faculty_ids.includes(fac2.id) && reqAfterReassign.assigned_faculty_ids.includes(fac3.id));
  check('Request assigned_faculty_ids no longer includes fac1', !reqAfterReassign.assigned_faculty_ids.includes(fac1.id));

  // Check audit history
  check('Reassignment recorded in reassignment_history', reqAfterReassign.reassignment_history.length >= 1);
  const lastReassign = reqAfterReassign.reassignment_history[reqAfterReassign.reassignment_history.length - 1];
  check('Reassignment history records new faculty names', lastReassign.new_faculty_names.includes('Prof. Ramesh K') && lastReassign.new_faculty_names.includes('Dr. Girish B'));
  check('Reassignment audit trail recorded in audit logs', Engine.getAuditLogs(origReqId).some((l) => l.action === 'REASSIGN_REQUEST_TEACHER' || l.action === 'TEACHER_REASSIGNED'));

  // Check relational request_faculty_assignments updated
  const assignmentsAfter = Engine.getRequestFacultyAssignments(origReqId);
  check('Relational assignments updated to active for fac2 and fac3', assignmentsAfter.some((a) => a.faculty_id === fac2.id && a.status === 'ASSIGNED'));

  console.log('\n--- TEST GROUP 10: Review Commencement Locks Student Changes (Req F, G & 11) ---');
  // Faculty 2 starts review
  const reviewStartedReq = await api.startFacultyReview(origReqId, fac2.id);
  check('Faculty review started timestamp recorded', !!reviewStartedReq.faculty_review_started_at);

  // Student attempts to change faculty after review begins -> MUST BE BLOCKED
  threwExpected = false;
  try {
    await api.reassignTeacher({
      requestId: origReqId,
      newFacultyIds: [fac1.id],
      userId: student.id,
      role: 'student',
      reason: 'Attempting change after review commenced',
    });
  } catch (err) {
    threwExpected = true;
  }
  check('Student cannot change faculty after review has commenced', threwExpected);

  // Admin CAN still reassign even after review has commenced
  const adminReassign = await api.reassignTeacher({
    requestId: origReqId,
    newFacultyIds: [fac2.id, fac3.id],
    userId: admin.id,
    role: 'admin',
    reason: 'Administrative authorized rebalance',
  });
  check('Admin authorized reassignment permitted after review commencement', !!adminReassign);

  console.log('\n--- TEST GROUP 11: End-to-End Workflow to Final Clearance (Req I & 13) ---');
  // Condone attendance or set valid count so student can clear
  // Let's record an updated attendance for DBMS to reach >= 85%
  await api.recordSubjectAttendance({
    subjectRecordId: dbmsRecord.id,
    classesHeld: 50,
    classesAttended: 45, // (34 + 45) / (40 + 50) = 79 / 90 = 87.78% >= 85%
    remarks: 'Attendance updated after approved medical exemption',
    facultyId: fac2.id,
  });

  const finalAcad = await api.getAcademicRecordForStudent(student.id, '2026-2027', 5);
  check('Attendance updated to 87.78% (79/90)', finalAcad.attendance_percentage === 87.78);
  check('Student is now eligible (>= 85%)', finalAcad.is_eligible === true);

  // Subject teachers approve their subjects (Section 35 workflow gate)
  const reqSubjects = Engine.getSubjectAttendanceForStudent(student.id, origReqId);
  for (const s of reqSubjects) {
    Engine.processSubjectTeacherDecision({
      subjectRecordId: s.id,
      facultyId: s.faculty_id,
      decision: 'APPROVE',
      remarks: 'Approved by subject teacher',
    });
  }

  // Faculty approval
  const facultyApproved = await api.verifyFacultyApproval(origReqId, fac2.id, 'Academic criteria met with satisfactory coursework');
  check('Faculty status APPROVED', facultyApproved.faculty_status === 'APPROVED');

  // Complete other departmental stages: Accounts, Lab using processClearanceDecision
  const accItem = Engine.getClearanceItems().find((i) => i.request_id === origReqId && i.authority === 'accounts');
  const labItem = Engine.getClearanceItems().find((i) => i.request_id === origReqId && i.authority === 'lab');

  if (accItem) {
    Engine.processClearanceDecision({
      clearanceItemId: accItem.id,
      reviewerId: accStaff.id,
      decision: 'approve',
      remarks: 'All semester fee dues cleared',
    });
  }
  if (labItem) {
    Engine.processClearanceDecision({
      clearanceItemId: labItem.id,
      reviewerId: labStaff.id,
      decision: 'approve',
      remarks: 'Computing hardware lab returned intact',
    });
  }

  // HOD Final Verification
  const hodFinal = Engine.processHodFinalClearance({
    requestId: origReqId,
    hodId: cseHod.id,
    decision: 'approve',
    remarks: 'All department dues, academic requirements, and faculty reviews verified',
  });
  check('Request officially CLEARED by HOD', hodFinal.status === 'CLEARED');
  check('Public verification ID generated', !!hodFinal.verification_id);

  // Public verification lookup works
  const publicVerify = Engine.getPublicVerification(hodFinal.verification_id);
  check('Public verification lookup succeeded', !!publicVerify);
  check('Public verification shows student name', publicVerify.student_name === 'Ananya Sharma');
  check('Public verification shows CLEARED', publicVerify.status.includes('CLEARED'));

  console.log('\n====================================================================');
  console.log(`ALL TESTS PASSED: ${passCount} / ${totalCount} checks passed!`);
  console.log('====================================================================');
}

runTests().catch((err) => {
  console.error('\n❌ TEST SUITE FAILED WITH ERROR:', err);
  process.exit(1);
});
