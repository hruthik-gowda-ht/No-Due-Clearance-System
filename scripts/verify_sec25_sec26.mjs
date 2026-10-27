// ==============================================================================
// VERIFICATION TEST SUITE: SECTIONS 25 & 26
// Section 25: Remove Random Faculty Accounts & Display Real Created Accounts
// Section 26: Prevent No-Due Requests from Remaining Pending Without Assigned Faculty
// ==============================================================================

import { Engine, initializeEngine } from '../src/services/store.ts';
import { api } from '../src/services/api.ts';

console.log('====================================================================');
console.log('VERIFICATION TEST SUITE: SECTIONS 25 & 26 ACCEPTANCE CRITERIA');
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
  // SECTION 25 TESTS: Clean Baseline, Real Accounts Only
  // ----------------------------------------------------------------------------
  console.log('--- SECTION 25: Clean Baseline, Real Accounts Only ---');

  // Ensure engine is freshly initialized
  initializeEngine();

  const allProfiles = Engine.getProfiles();
  const facultyList = allProfiles.filter((p) => p.role === 'faculty');
  const hodList = allProfiles.filter((p) => p.role === 'hod');
  const libList = allProfiles.filter((p) => p.role === 'library_staff');
  const accList = allProfiles.filter((p) => p.role === 'accounts_staff');
  const labList = allProfiles.filter((p) => p.role === 'lab_staff');
  const adminList = allProfiles.filter((p) => p.role === 'admin');

  // Criterion 25.1 & 25.2: No fake staff accounts exist initially
  check('No faculty accounts exist initially', facultyList.length === 0, `Count: ${facultyList.length}`);
  check('No HOD accounts exist initially', hodList.length === 0, `Count: ${hodList.length}`);
  check('No Library staff accounts exist initially', libList.length === 0, `Count: ${libList.length}`);
  check('No Accounts staff accounts exist initially', accList.length === 0, `Count: ${accList.length}`);
  check('No Laboratory staff accounts exist initially', labList.length === 0, `Count: ${labList.length}`);
  check('Only authorized System Administrator exists initially', adminList.length === 1 && (adminList[0].email === 'admin@gmail.com' || adminList[0].email === 'admin@cauvery.edu.in'));

  const admin = adminList[0];

  // Criterion 25.4: Student cannot create a faculty account or escalate privileges
  let privilegeEscalationBlocked = false;
  try {
    Engine.provisionStaff(
      {
        fullName: 'Hacker Faculty',
        email: 'hacker@cauvery.edu.in',
        role: 'faculty',
      },
      'fake-student-id' // unauthorized caller
    );
  } catch (err) {
    privilegeEscalationBlocked = true;
  }
  check('Non-admin caller cannot provision faculty or staff accounts', privilegeEscalationBlocked);

  // Criterion 25.3: Real account created by Admin appears correctly
  const realFaculty = Engine.provisionStaff(
    {
      fullName: 'Dr. Chaitra N',
      email: 'chaitra.cse@cauvery.edu.in',
      role: 'faculty',
      departmentId: 'dept-cse',
      password: 'password123',
    },
    admin.id
  );
  check('Admin provisions genuine faculty account', realFaculty.role === 'faculty' && realFaculty.full_name === 'Dr. Chaitra N');

  const refreshedFacultyList = Engine.getProfiles().filter((p) => p.role === 'faculty');
  check('Faculty list contains only genuinely created account', refreshedFacultyList.length === 1 && refreshedFacultyList[0].id === realFaculty.id);

  // ----------------------------------------------------------------------------
  // SECTION 26 TESTS: Prevent No-Due Requests Without Assigned Faculty
  // ----------------------------------------------------------------------------
  console.log('\n--- SECTION 26: Faculty Availability Verification & Assignment Governance ---');

  // Register student in Mechanical Engineering (ME) where NO faculty exists
  const meStudent = Engine.registerStudent({
    fullName: 'Rahul Varma',
    studentId: '1CR24ME001',
    departmentId: 'dept-me',
    academicYear: '2026-2027',
    semester: 5,
    email: 'rahul.1cr24me001@cauvery.edu.in',
    password: 'password123',
  });
  check('Student registered in ME department', meStudent.student_id === '1CR24ME001');

  // Test Criterion 26.1 & 26.2: Submission blocked when no faculty exists in department
  let submissionBlocked = false;
  let submissionErrorMsg = '';
  try {
    Engine.createRequest(
      meStudent.id,
      'Mechanical Engineering',
      '2026-2027',
      5,
      'Clearance attempt without department faculty'
    );
  } catch (err) {
    submissionBlocked = true;
    submissionErrorMsg = err.message;
  }

  check('Request submission blocked when no eligible faculty exists in department', submissionBlocked);
  const expectedMsg = 'Your No-Due request cannot be submitted because no faculty member is currently assigned to verify your academic details. Please contact the administrator or try again after a faculty member has been assigned.';
  check('Exact required error message returned to user', submissionErrorMsg === expectedMsg, submissionErrorMsg);

  // Verify no request record was created in database
  const requestsForMe = Engine.getRequests().filter((r) => r.student_id === meStudent.id);
  check('Zero request records created for blocked submission', requestsForMe.length === 0);

  // Criterion 26.3: Provision faculty for ME and test successful submission
  const meFaculty = Engine.provisionStaff(
    {
      fullName: 'Prof. Harish Gowda',
      email: 'harish.me@cauvery.edu.in',
      role: 'faculty',
      departmentId: 'dept-me',
      password: 'password123',
    },
    admin.id
  );
  check('Admin provisions genuine ME faculty member', meFaculty.full_name === 'Prof. Harish Gowda');

  // Retry submission for Rahul Varma now that faculty is available
  const acceptedRequest = Engine.createRequest(
    meStudent.id,
    'Mechanical Engineering',
    '2026-2027',
    5,
    'End-term clearance for 5th semester'
  );
  check(
    'Request successfully submitted once authorized faculty exists',
    acceptedRequest.status === 'PENDING_FACULTY_REVIEW' || acceptedRequest.status === 'SUBMITTED',
    acceptedRequest.status
  );
  check('Request code properly generated', acceptedRequest.request_code.startsWith('ND-2026-'), acceptedRequest.request_code);
  check('Request is assigned to the ME faculty member', acceptedRequest.assigned_faculty_id === meFaculty.id);
  check('Faculty assignment status is ASSIGNED', acceptedRequest.faculty_assignment_status === 'ASSIGNED');

  // Criterion 26.4: Request appears in faculty work queue
  const meFacultyQueue = Engine.getRequestsForFaculty(meFaculty.id);
  check('Request appears in the responsible faculty member work queue', meFacultyQueue.some((r) => r.id === acceptedRequest.id));

  // Criterion 26.5: Faculty member can review only requests within authorized scope
  let unauthorizedReviewBlocked = false;
  try {
    // CSE faculty (Dr. Chaitra N) attempts to review ME student's request
    Engine.verifyFacultyApproval(acceptedRequest.id, realFaculty.id, 'Unauthorized cross-department review');
  } catch (err) {
    unauthorizedReviewBlocked = true;
  }
  check('Cross-department or unauthorized faculty cannot review request outside scope', unauthorizedReviewBlocked);

  // Criterion 26.6: Disabling/deactivating faculty marks request as REASSIGNMENT_REQUIRED safely
  Engine.updateProfileStatus(meFaculty.id, false, admin.id);
  const reqAfterDeactivation = Engine.getRequestById(acceptedRequest.id);
  check(
    'Deactivating responsible faculty transitions request assignment status to REASSIGNMENT_REQUIRED',
    reqAfterDeactivation?.faculty_assignment_status === 'REASSIGNMENT_REQUIRED'
  );
  check(
    'Request history and workflow status preserved',
    reqAfterDeactivation?.status === 'PENDING_FACULTY_REVIEW' || reqAfterDeactivation?.status === 'SUBMITTED',
    reqAfterDeactivation?.status
  );

  // Criterion 26.4: Deactivated faculty does not see request in active work queue
  const deactivatedQueue = Engine.getRequestsForFaculty(meFaculty.id);
  check('Deactivated faculty no longer sees reassignment-required request in work queue', deactivatedQueue.length === 0);

  // Criterion 26.D: Admin assigns a replacement faculty member
  const replacementMeFaculty = Engine.provisionStaff(
    {
      fullName: 'Prof. Nanjunda Swamy',
      email: 'nanjunda.me@cauvery.edu.in',
      role: 'faculty',
      departmentId: 'dept-me',
      password: 'password123',
    },
    admin.id
  );

  const reassignedReq = Engine.assignFacultyToRequest(acceptedRequest.id, replacementMeFaculty.id, admin.id);
  check('Admin reassigns eligible replacement faculty member', reassignedReq.assigned_faculty_id === replacementMeFaculty.id);
  check('Assignment status returns to ASSIGNED', reassignedReq.faculty_assignment_status === 'ASSIGNED');

  const replacementQueue = Engine.getRequestsForFaculty(replacementMeFaculty.id);
  check('Reassigned request immediately appears in new faculty member work queue', replacementQueue.some((r) => r.id === acceptedRequest.id));

  // Criterion 26.7: Direct API availability check
  const studentCse = Engine.registerStudent({
    fullName: 'Anupama Rao',
    studentId: '1CR24CS002',
    departmentId: 'dept-cse',
    academicYear: '2026-2027',
    semester: 5,
    email: 'anupama.1cr24cs002@cauvery.edu.in',
    password: 'password123',
  });

  const apiReq = await api.createNoDueRequest(
    studentCse.id,
    'Computer Science & Engineering',
    '2026-2027',
    5,
    'API request submission'
  );
  check('API correctly routes to available faculty and assigns request', apiReq.assigned_faculty_id === realFaculty.id);

  console.log('\n====================================================================');
  console.log(`ALL SECTIONS 25 & 26 ACCEPTANCE CHECKS PASSED: ${passCount} of ${totalCount}`);
  console.log('====================================================================\n');
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
