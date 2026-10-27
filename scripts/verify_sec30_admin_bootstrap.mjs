// ==============================================================================
// VERIFICATION TEST SUITE: SECTION 30
// Section 30: Create the Initial Admin Account & Authorization System
// ==============================================================================

import { Engine, initializeEngine } from '../src/services/store.ts';

console.log('====================================================================');
console.log('VERIFICATION TEST SUITE: SECTION 30 ACCEPTANCE CRITERIA');
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

  const TEST_TEMP_PASS = process.env.INITIAL_ADMIN_PASSWORD || 'TemporarySetupPass@2026';
  const TEST_EMAIL = 'admin@gmail.com';

  console.log('--- TEST GROUP 1: Initial Admin Creation & Attributes (Req 1 & 2) ---');

  // 1. Run bootstrap
  const bootstrapped = Engine.bootstrapInitialAdmin(TEST_EMAIL, TEST_TEMP_PASS);
  check('Initial Admin bootstrap succeeded', !!bootstrapped);
  check('Initial Admin email is admin@gmail.com', bootstrapped.email.toLowerCase() === TEST_EMAIL);
  check('Initial Admin role is strictly admin', bootstrapped.role === 'admin');
  check('Initial Admin is active', bootstrapped.is_active === true);
  check('Initial Admin is institutionally verified', bootstrapped.is_verified === true);
  check('Initial Admin verification status is VERIFIED', bootstrapped.verification_status === 'VERIFIED');
  check('Initial Admin has official Staff ID', bootstrapped.staff_id === 'CIT-ADM-001');
  check('Initial Admin must change password on first login', bootstrapped.must_change_password === true);

  console.log('\n--- TEST GROUP 2: Authentication with Temporary Password (Req 3) ---');

  // 2. Authenticate with temporary credentials
  const authenticatedAdmin = Engine.authenticateStaff(TEST_EMAIL, TEST_TEMP_PASS);
  check('Admin authenticates successfully with temporary password', authenticatedAdmin.id === bootstrapped.id);
  check('Authenticated profile retains must_change_password flag', authenticatedAdmin.must_change_password === true);

  // 3. Reject invalid password
  let wrongPassBlocked = false;
  try {
    Engine.authenticateStaff('admin@gmail.com', 'wrongpassword');
  } catch (err) {
    wrongPassBlocked = true;
  }
  check('Authentication rejects incorrect passwords', wrongPassBlocked);

  console.log('\n--- TEST GROUP 3: Password Exposure Protection (Req 6) ---');

  // 4. Ensure password is never exposed in profile object or public state
  check('Password field is not in UserProfile object', !('password' in authenticatedAdmin));
  check('PasswordHash field is not in UserProfile object', !('passwordHash' in authenticatedAdmin));

  console.log('\n--- TEST GROUP 4: Security & Privilege Escalation Prevention (Req 7) ---');

  // 5. Prohibit public self-registration for Admin role
  let publicAdminRegBlocked = false;
  try {
    Engine.registerStaff({
      fullName: 'Attacker Wannabe',
      staffId: 'STAFF-999',
      email: 'attacker@outside.com',
      password: 'password123',
      confirmPassword: 'password123',
      requestedRole: 'admin',
      departmentId: 'dept-cse',
      designation: 'Hacker',
    });
  } catch (err) {
    publicAdminRegBlocked = err.message.includes('prohibited');
  }
  check('Ordinary users cannot self-register as Admin', publicAdminRegBlocked);

  // 6. Non-admin cannot verify staff accounts or grant admin roles
  let nonAdminVerifyBlocked = false;
  try {
    Engine.verifyStaffRole({
      staffId: bootstrapped.id,
      adminId: 'non-admin-user-id',
    });
  } catch (err) {
    nonAdminVerifyBlocked = err.message.includes('administrators');
  }
  check('Non-admin users cannot grant admin roles or verify staff accounts', nonAdminVerifyBlocked);

  console.log('\n--- TEST GROUP 5: Mandatory Password Change on First Login (Req 9) ---');

  // 7. Reject new password < 6 characters
  let shortPassBlocked = false;
  try {
    Engine.changePassword(bootstrapped.id, TEST_TEMP_PASS, 'short');
  } catch (err) {
    shortPassBlocked = err.message.includes('at least 6 characters');
  }
  check('New password < 6 characters is rejected', shortPassBlocked);

  // 8. Reject new password identical to temporary password
  let samePassBlocked = false;
  try {
    Engine.changePassword(bootstrapped.id, TEST_TEMP_PASS, TEST_TEMP_PASS);
  } catch (err) {
    samePassBlocked = err.message.includes('different from your temporary password');
  }
  check('New password identical to temporary password is rejected', samePassBlocked);

  // 9. Reject incorrect current password
  let wrongCurrentPassBlocked = false;
  try {
    Engine.changePassword(bootstrapped.id, 'incorrectCurrentPass', 'SuperSecureAdminPass@2026');
  } catch (err) {
    wrongCurrentPassBlocked = err.message.includes('Current password does not match');
  }
  check('Incorrect current password is rejected', wrongCurrentPassBlocked);

  // 10. Successfully change password
  const updatedAdmin = Engine.changePassword(
    bootstrapped.id,
    TEST_TEMP_PASS,
    'SuperSecureAdminPass@2026'
  );
  check('Password successfully updated', !!updatedAdmin);
  check('must_change_password flag cleared to false', updatedAdmin.must_change_password === false);
  check('is_temporary_password flag cleared to false', updatedAdmin.is_temporary_password === false);

  // 11. Old temporary password is now rejected
  let oldPassRejected = false;
  try {
    Engine.authenticateStaff(TEST_EMAIL, TEST_TEMP_PASS);
  } catch (err) {
    oldPassRejected = true;
  }
  check('Old temporary password is rejected after password change', oldPassRejected);

  // 12. New permanent password succeeds
  const reAuth = Engine.authenticateStaff('admin@gmail.com', 'SuperSecureAdminPass@2026');
  check('New permanent password authenticates successfully', reAuth.id === bootstrapped.id);
  check('Re-authenticated profile has must_change_password === false', reAuth.must_change_password === false);

  // 13. Audit log recorded password change
  const auditLogs = Engine.getAuditLogs();
  const passChangeLog = auditLogs.find((l) => l.action === 'ADMIN_PASSWORD_CHANGED');
  check('ADMIN_PASSWORD_CHANGED recorded in system audit log', !!passChangeLog);

  console.log('\n--- TEST GROUP 6: Idempotency of Bootstrap Setup (Req 8) ---');

  // 14. Rerunning bootstrap does not create duplicates or overwrite updated password
  const secondBootstrap = Engine.bootstrapInitialAdmin(TEST_EMAIL, TEST_TEMP_PASS);
  check('Bootstrap rerun returns existing admin profile', !!secondBootstrap);
  check('Bootstrap rerun preserves existing admin ID', secondBootstrap.id === bootstrapped.id);

  // Total admin count remains 1
  const allAdmins = Engine.getProfiles().filter((p) => p.role === 'admin' && p.is_active);
  check('No duplicate admin accounts created by rerunning bootstrap', allAdmins.length === 1);

  // Verify updated password was NOT overwritten by rerunning bootstrap
  const authAfterRerun = Engine.authenticateStaff('admin@gmail.com', 'SuperSecureAdminPass@2026');
  check('Existing updated password preserved across bootstrap reruns', authAfterRerun.id === bootstrapped.id);

  console.log('\n--- TEST GROUP 7: Admin Privileges & System Management (Req 5) ---');

  // 15. Manage Departments
  const newDept = Engine.addDepartment('BIO', 'Biotechnology Engineering', bootstrapped.id);
  check('Admin can add institutional department', newDept.code === 'BIO');

  const toggledDept = Engine.toggleDepartment(newDept.id, bootstrapped.id);
  check('Admin can toggle department status', toggledDept.is_active === false);

  // 16. Manage Academic Settings (Attendance Threshold)
  Engine.updateAttendanceThreshold(82, bootstrapped.id);
  check('Admin can update minimum attendance threshold', Engine.getAttendanceThreshold() === 82);

  // 17. Manage Payment QRs
  const newQr = Engine.savePaymentQr(
    {
      authority: 'library',
      title: 'Central Library Fee Desk',
      upi_id: 'citlibrary@upi',
      instructions: 'Pay fee dues and upload receipt',
      is_active: true,
    },
    bootstrapped.id
  );
  check('Admin can configure Payment QR settings', newQr.upi_id === 'citlibrary@upi');

  // 18. Manage Staff Accounts: Provisioning & Verification
  const provisionedStaff = Engine.provisionStaff(
    {
      fullName: 'Prof. Varun Sharma',
      email: 'varun.sharma@cauvery.edu.in',
      role: 'faculty',
      departmentId: 'dept-cse',
      designation: 'Assistant Professor',
      password: 'TemporaryStaffPass@2026',
    },
    bootstrapped.id
  );
  check('Admin can provision staff account', provisionedStaff.email === 'varun.sharma@cauvery.edu.in');

  // 19. View System Audit Trail
  const systemLogs = Engine.getAuditLogs();
  check('Admin can access system audit trail', systemLogs.length >= 5);

  console.log('\n--- TEST GROUP 8: Account Tombstone & Non-Recreation of Deleted Admin (Req 10) ---');

  // 20. Remove admin account and verify tombstone prevents recreation
  Engine.removeAdminAccount(bootstrapped.id, bootstrapped.id);

  // Verify account is deactivated
  const deactivatedProfile = Engine.getProfileById(bootstrapped.id);
  check('Admin account deactivated', deactivatedProfile.is_active === false);

  // Rerunning bootstrap must NOT recreate it
  const recreateAttempt = Engine.bootstrapInitialAdmin(TEST_EMAIL);
  check('Bootstrap does NOT recreate disabled/removed default Admin account (Requirement 10)', recreateAttempt === null);

  console.log('\n====================================================================');
  console.log(`SUMMARY: All ${passCount} / ${totalCount} checks PASSED!`);
  console.log('SECTION 30 ACCEPTANCE CRITERIA FULLY SATISFIED & VALIDATED');
  console.log('====================================================================\n');
}

runTests().catch((err) => {
  console.error('Fatal error during test suite execution:', err);
  process.exit(1);
});
