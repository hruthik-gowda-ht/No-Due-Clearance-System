// ==============================================================================
// COLLEGE NO-DUE CLEARANCE MANAGEMENT SYSTEM
// Server-Side One-Time Initial Admin Bootstrap Script (Sections 30 & 31)
// Credentials provided via INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD or CLI args.
// Passwords are never hardcoded in source control (Section 31.B & 31.C).
// ==============================================================================

import { Engine, initializeEngine } from '../src/services/store.ts';
import { createClient } from '@supabase/supabase-js';

const ADMIN_EMAIL = (
  process.env.INITIAL_ADMIN_EMAIL ||
  process.argv[2] ||
  'admin@cauvery.edu.in'
).trim();

const ADMIN_TEMP_PASS = (
  process.env.INITIAL_ADMIN_PASSWORD ||
  process.argv[3] ||
  ''
).trim();

const ADMIN_ROLE = 'admin';

console.log('====================================================================');
console.log('INSTITUTIONAL SERVER-SIDE BOOTSTRAP: INITIAL ADMINISTRATOR (SEC 30)');
console.log('====================================================================\n');

async function bootstrap() {
  initializeEngine();

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  let supabaseLiveProvisioned = false;

  // 1. If Supabase Service Role Key is available in server environment, provision into Supabase Auth
  if (supabaseUrl && serviceRoleKey && !supabaseUrl.includes('placeholder')) {
    console.log('[Supabase Server] Connecting with authorized service-role client...');
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Check if user already exists in Supabase Auth (Idempotency: Requirement 8)
    const { data: userList, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
    if (listErr) {
      console.warn('[Supabase Server] Could not list users:', listErr.message);
    } else {
      const existingAuth = userList.users.find((u) => u.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase());

      if (existingAuth) {
        console.log(`[Supabase Server] Admin user ${ADMIN_EMAIL} already exists in Supabase Auth (ID: ${existingAuth.id}). Preserving credentials.`);
      } else {
        // Create new auth user
        const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
          email: ADMIN_EMAIL,
          password: ADMIN_TEMP_PASS,
          email_confirm: true,
          user_metadata: {
            role: ADMIN_ROLE,
            full_name: 'Dr. Srikantappa As',
            must_change_password: true,
          },
        });

        if (createErr) {
          console.error('[Supabase Server] Failed to create auth user:', createErr.message);
        } else {
          console.log(`[Supabase Server] Successfully provisioned auth user: ${newUser.user.email} (ID: ${newUser.user.id})`);
          supabaseLiveProvisioned = true;

          // Upsert into public.profiles
          const { error: profErr } = await supabaseAdmin.from('profiles').upsert({
            id: newUser.user.id,
            role: ADMIN_ROLE,
            full_name: 'Dr. Srikantappa As',
            email: ADMIN_EMAIL,
            staff_id: 'CIT-ADM-001',
            department: 'Central Institutional Administration',
            designation: 'Institutional System Administrator',
            is_active: true,
            is_verified: true,
            verification_status: 'VERIFIED',
            must_change_password: true,
            is_temporary_password: true,
          });

          if (profErr) {
            console.warn('[Supabase Server] Note on profile table sync:', profErr.message);
          }
        }
      }
    }
  } else {
    console.log('[Info] Standalone / Persistent local environment. Bootstrapping authoritative engine store.');
  }

  // 2. Authoritative Database Engine Bootstrap (Persistent Store & State Machine)
  const result = Engine.bootstrapInitialAdmin(ADMIN_EMAIL, ADMIN_TEMP_PASS);

  if (!result) {
    console.log('⚠️ [Notice] Initial admin account was previously disabled or removed. Skipping recreation (Requirement 10).');
    return;
  }

  console.log('--------------------------------------------------------------------');
  console.log('INITIAL ADMINISTRATOR ACCOUNT READY');
  console.log('--------------------------------------------------------------------');
  console.log(`• Email:                    ${result.email}`);
  console.log(`• Role:                     ${result.role}`);
  console.log(`• Staff ID:                 ${result.staff_id}`);
  console.log(`• Full Name:                ${result.full_name}`);
  console.log(`• Verification Status:      ${result.verification_status}`);
  console.log(`• Must Change Password:     ${result.must_change_password}`);
  console.log(`• Active Status:            ${result.is_active}`);
  console.log('--------------------------------------------------------------------');
  console.log('Note: Admin must change the temporary password on first login.');
  console.log('====================================================================\n');
}

bootstrap().catch((err) => {
  console.error('Bootstrap error:', err);
  process.exit(1);
});
