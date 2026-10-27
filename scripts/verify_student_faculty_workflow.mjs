// ==============================================================================
// VERIFICATION TEST SUITE: COMPLETE STUDENT-TO-FACULTY WORKFLOW
// Student registration, mandatory dynamic teacher selection, request submission,
// pre-review student teacher reassignment, post-review backend lock & audit trail
// ==============================================================================

import { Engine, initializeEngine } from '../src/services/store.ts';
import { api } from '../src/services/api.ts';

console.log('====================================================================');
console.log('VERIFICATION TEST SUITE: STUDENT-TO-FACULTY WORKFLOW & REASSIGNMENT');
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
  // ----------------------------------------------------------------------------
  // TEST GROUP 1: Student Registration & Authentication with Registration Number
  // ----------------------------------------------------------------------------
  console.log('--- TEST GROUP 1: Student Registration & USN Authentication ---');
  
  // Clean initialization
  initializeEngine();

  const cseDept = Engine.getDepartments().find((d) => d.code === 'CSE');
  check('CSE department exists in managed department registry', Boolean(cseDept));

  const admin = Engine.getProfiles().find((p) => p.role === 'admin');
  check('System Administrator account active', Boolean(admin && admin.role === 'admin'));

  // 1. Register Student
  const studentData = {
    fullName: 'Rahul Sharma',
    studentId: '1CR22CS105',
    departmentId: cseDept.id,
    department: cseDept.name,
    semester: 5,
    academicYear: '2026-2027',
    password: 'password123',
  };

  const student = Engine.registerStudent(studentData);
  check('Student registered successfully', Boolean(student.id && student.student_id === '1CR22CS105'));
  check('Student role is strictly student', student.role === 'student');

  // Duplicate registration number check
  let dupBlocked = false;
  try {
    Engine.registerStudent(studentData);
  } catch (err) {
    dupBlocked = true;
  }
  check('Duplicate Registration Number strictly blocked', dupBlocked);

  // Authenticate student with Registration Number (USN) & password
  const loggedInStudent = Engine.authenticateStudent('1CR22CS105', 'password123');
  check('Student logs in using Registration Number and password', loggedInStudent.id === student.id);

  // ----------------------------------------------------------------------------
  // TEST GROUP 2: Mandatory Teacher-Selection Step & Dynamic Empty State
  // ----------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 2: Mandatory Dynamic Teacher Selection Step ---');

  // Verify faculty list for CSE when no faculty is created yet
  const cseFacultyInitial = await api.getFacultyForDepartment(cseDept.name);
  check('Initially zero faculty exist in CSE department', cseFacultyInitial.length === 0);

  // When no faculty exist, verify submission is blocked with exact mandatory message
  let blockedSubmissionWithoutFaculty = false;
  let blockedMessage = '';
  try {
    await api.createNoDueRequest(student.id, cseDept.name, '2026-2027', 5, 'Semester end clearance');
  } catch (err) {
    blockedSubmissionWithoutFaculty = true;
    blockedMessage = err.message;
  }
  check('Submission blocked when no faculty exists in student department', blockedSubmissionWithoutFaculty);
  check(
    'Exact required empty-state message returned on blocked submission',
    blockedMessage ===
      'Your No-Due request cannot be submitted because no faculty member is currently assigned to verify your academic details. Please contact the administrator or try again after a faculty member has been assigned.'
  );

  // Provision two genuine faculty members in CSE department by Administrator
  const faculty1 = Engine.provisionStaff(
    {
      fullName: 'Prof. Ramesh K',
      email: 'ramesh.cse@cauvery.edu.in',
      role: 'faculty',
      departmentId: cseDept.id,
      designation: 'Associate Professor',
      password: 'password123',
    },
    admin.id
  );
  check('Admin provisions first genuine faculty member', Boolean(faculty1.id && faculty1.designation === 'Associate Professor'));

  const faculty2 = Engine.provisionStaff(
    {
      fullName: 'Dr. Savitha Murthy',
      email: 'savitha.cse@cauvery.edu.in',
      role: 'faculty',
      departmentId: cseDept.id,
      designation: 'Assistant Professor',
      password: 'password123',
    },
    admin.id
  );
  check('Admin provisions second genuine faculty member', Boolean(faculty2.id && faculty2.designation === 'Assistant Professor'));

  // Re-query teacher list dynamically from database
  const cseFacultyUpdated = await api.getFacultyForDepartment(cseDept.name);
  check('Dynamically retrieved faculty list contains exactly 2 created teachers', cseFacultyUpdated.length === 2);
  check('Only genuine created faculty appear in teacher selection list', cseFacultyUpdated.every((f) => f.role === 'faculty' && f.is_active));

  // ----------------------------------------------------------------------------
  // TEST GROUP 3: Request Submission with Selected Teacher & Direct Routing
  // ----------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 3: Request Submission with Selected Teacher ---');

  // Student selects faculty1 and submits request
  const createdReq = await api.createNoDueRequest(
    student.id,
    cseDept.name,
    '2026-2027',
    5,
    'Coursework completed, request clearance.',
    faculty1.id
  );

  check('Request successfully created in database', Boolean(createdReq.id));
  check('Request code generated in ND-2026-XXXXXX format', createdReq.request_code.startsWith('ND-2026-'));
  check('Request assigned to selected teacher (faculty1)', createdReq.assigned_faculty_id === faculty1.id);
  check('Assigned faculty name matches selected teacher', createdReq.assigned_faculty_name === faculty1.full_name);
  check('Initial status is PENDING_FACULTY_REVIEW', createdReq.status === 'PENDING_FACULTY_REVIEW');
  check('Faculty stage status is PENDING', createdReq.faculty_status === 'PENDING');
  check('Faculty review has not commenced yet', !createdReq.faculty_review_started_at);

  // Verify request appears in faculty1's work queue
  const faculty1Queue = Engine.getRequestsForFaculty(faculty1.id);
  check('Request appears directly in selected teacher work queue', faculty1Queue.some((r) => r.id === createdReq.id));

  // Verify request does NOT appear in faculty2's work queue
  const faculty2QueueInitial = Engine.getRequestsForFaculty(faculty2.id);
  check('Request does not appear in unassigned faculty work queue', !faculty2QueueInitial.some((r) => r.id === createdReq.id));

  // Verify persistent in-app notification created for faculty1
  const faculty1Notifications = Engine.getNotifications(faculty1.id);
  check('In-app notification created for responsible faculty member', faculty1Notifications.length > 0);
  check('Notification references request code', faculty1Notifications[0].message.includes(createdReq.request_code));

  // ----------------------------------------------------------------------------
  // TEST GROUP 4: Pre-Review Student Teacher Reassignment ("Change Teacher")
  // ----------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 4: Pre-Review Student Teacher Reassignment ---');

  // While awaiting review, student changes teacher from faculty1 to faculty2
  const reassignResult = await api.reassignTeacher({
    requestId: createdReq.id,
    newFacultyId: faculty2.id,
    userId: student.id,
    role: 'student',
    reason: 'Transferred to section mentored by Dr. Savitha',
  });

  check('Teacher reassignment succeeds before review commences', Boolean(reassignResult.request));
  check('Assigned teacher updated to faculty2', reassignResult.request.assigned_faculty_id === faculty2.id);
  check('Assigned faculty name updated to Dr. Savitha Murthy', reassignResult.request.assigned_faculty_name === faculty2.full_name);
  check('Original request ID is preserved', reassignResult.request.id === createdReq.id);
  check('Original request code is preserved', reassignResult.request.request_code === createdReq.request_code);

  // Check work queue routing: removed from faculty1, added to faculty2
  const faculty1QueueAfter = Engine.getRequestsForFaculty(faculty1.id);
  const faculty2QueueAfter = Engine.getRequestsForFaculty(faculty2.id);
  check('Request removed from previous teacher work queue', !faculty1QueueAfter.some((r) => r.id === createdReq.id));
  check('Request routed to new teacher work queue', faculty2QueueAfter.some((r) => r.id === createdReq.id));

  // Check immutable audit history in request
  const reassHistory = reassignResult.request.reassignment_history;
  check('Immutable reassignment history recorded on request', Boolean(reassHistory && reassHistory.length === 1));
  check('Audit record contains previous faculty ID', reassHistory[0].previous_faculty_id === faculty1.id);
  check('Audit record contains new faculty ID', reassHistory[0].new_faculty_id === faculty2.id);
  check('Audit record contains student initiator ID', reassHistory[0].initiated_by_user_id === student.id);
  check('Audit record contains student reason', reassHistory[0].reason === 'Transferred to section mentored by Dr. Savitha');
  check('Audit record contains SUCCESS result', reassHistory[0].result === 'SUCCESS');

  // Check persistent notifications for new teacher & student
  const faculty2Notifications = Engine.getNotifications(faculty2.id);
  check('Notification delivered to new teacher', faculty2Notifications.some((n) => n.title.includes('Assigned to You')));

  const studentNotifications = Engine.getNotifications(student.id);
  check('Notification delivered to student confirming teacher change', studentNotifications.some((n) => n.title.includes('Teacher Assignment Updated')));

  // Unauthorized student cannot change another student's request
  let crossStudentBlocked = false;
  try {
    await api.reassignTeacher({
      requestId: createdReq.id,
      newFacultyId: faculty1.id,
      userId: 'usr-different-student',
      role: 'student',
      reason: 'Malicious attempt',
    });
  } catch (err) {
    crossStudentBlocked = true;
  }
  check('Unauthorized student strictly blocked from changing another request', crossStudentBlocked);

  // ----------------------------------------------------------------------------
  // TEST GROUP 5: Lock Teacher Changes Once Faculty Review Begins
  // ----------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 5: Post-Review Backend Lock Enforcement ---');

  // Faculty2 starts review
  const reqUnderReview = await api.startFacultyReview(createdReq.id, faculty2.id);
  check('Faculty review commenced timestamp recorded by backend', Boolean(reqUnderReview.faculty_review_started_at));

  // Student attempts to change teacher AFTER review has begun -> MUST BE BLOCKED BY BACKEND!
  let postReviewStudentChangeBlocked = false;
  let postReviewErrorMessage = '';
  try {
    await api.reassignTeacher({
      requestId: createdReq.id,
      newFacultyId: faculty1.id,
      userId: student.id,
      role: 'student',
      reason: 'Attempted change after review started',
    });
  } catch (err) {
    postReviewStudentChangeBlocked = true;
    postReviewErrorMessage = err.message;
  }

  check('Student-initiated teacher change strictly blocked after review commences', postReviewStudentChangeBlocked);
  check(
    'Exact backend restriction message returned',
    postReviewErrorMessage === 'Cannot change assigned teacher because faculty review has already commenced.'
  );

  // Confirm original assignment was NOT corrupted or modified by failed attempt
  const untouchedReq = Engine.getRequestById(createdReq.id);
  check('Assignment remains intact with faculty2 after blocked attempt', untouchedReq.assigned_faculty_id === faculty2.id);

  // After review commences, authorized Administrator CAN reassign if necessary
  const adminReassign = await api.reassignTeacher({
    requestId: createdReq.id,
    newFacultyId: faculty1.id,
    userId: admin.id,
    role: 'admin',
    reason: 'Administrative reassignment due to leave of absence',
  });
  check('Authorized Administrator can reassign request with reason after review commenced', adminReassign.request.assigned_faculty_id === faculty1.id);
  check('Admin reassignment preserved in immutable audit history', adminReassign.request.reassignment_history.length === 2);

  // ----------------------------------------------------------------------------
  // TEST GROUP 6: Complete Downstream Workflow Integrity
  // ----------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 6: Downstream Clearance Workflow Integrity ---');

  const studentAcadRecord = Engine.getAcademicRecords().find((a) => a.student_id === student.id);
  check('Student academic record exists', Boolean(studentAcadRecord));
  if (studentAcadRecord) {
    Engine.updateAcademicRecord(
      studentAcadRecord.id,
      90,
      'Attendance satisfactory',
      faculty1.id
    );
  }

  // Faculty1 approves academic verification
  const facultyApprovedReq = await api.approveFacultyAcademic(
    createdReq.id,
    faculty1.id,
    'Coursework and attendance verified.'
  );
  check('Faculty approval succeeds', facultyApprovedReq.faculty_status === 'APPROVED');
  check('Request transitions to IN_REVIEW for parallel clearances', facultyApprovedReq.status === 'IN_REVIEW');

  // Verify parallel clearances initialized (Library, Accounts, Lab)
  const clearanceItems = Engine.getClearanceItems().filter((ci) => ci.request_id === createdReq.id);
  check('Three parallel clearance items created', clearanceItems.length === 3);

  console.log('\n====================================================================');
  console.log(`ALL STUDENT-TO-FACULTY WORKFLOW CHECKS PASSED: ${passCount} of ${totalCount}`);
  console.log('====================================================================\n');
}

runTests().catch((err) => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
