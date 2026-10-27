# College No-Due Clearance Management System (ClearCampus)
**Cauvery Institute of Technology** (Affiliated to **Visvesvaraya Technological University - VTU**)  
**Academic Year:** 2026–2027  
**System Name:** College No-Due Clearance Management System  
**Repository:** [https://github.com/hruthik-gowda-ht/No-Due-Clearance-System](https://github.com/hruthik-gowda-ht/No-Due-Clearance-System)

---

## 1. Executive Summary & Institutional Architecture

The **College No-Due Clearance Management System** is a production-grade, secure, database-backed enterprise web application engineered for **Cauvery Institute of Technology**, affiliated with **VTU** for Academic Year **2026–2027**.

Every institutional operation is governed by backend constraints, state machine transitions, PostgreSQL Row-Level Security (RLS) policies, and immutable audit logs:
- **Zero Hardcoded Accounts & Fakes:** Fictional faculty profiles, mock user arrays, and fake demo accounts have been completely purged from the codebase.
- **Dynamic Teacher Selection:** Students select their verifying faculty member from genuinely registered and institutionally verified teachers within their department.
- **Pre-Review Reassignment & Post-Review Lock:** Students can reassign their clearance to another verified faculty member before review commences. Once review begins, the assignment is strictly locked on the server.
- **Staff Self-Registration & Verification Gating:** Faculty, Library, Accounts, Laboratory, and HOD staff register their own accounts. To prevent unauthorized operational decisions, self-registered staff have gated access until explicitly verified by the System Administrator.
- **HOD Final Review Gating:** Final clearance review by the Head of Department is strictly blocked by database triggers until all four prerequisite clearances (Faculty Advisor, Central Library, Student Accounts, and Laboratories) are explicitly approved.
- **Dynamic Attendance Threshold:** Server-evaluated attendance threshold (defaults to 85%, configurable by the Administrator).
- **Audit Logging & Security:** Every state change, role verification, and password change is permanently recorded in the system audit trail.

---

## 2. Institutional Roles & Operational Responsibilities

The system implements the mandatory institutional roles:

| Role Identifier | Official Title | Scope & Institutional Responsibilities | Provisioning Mechanism |
|---|---|---|---|
| `student` | Enrolled Student | Submits No-Due clearance requests (`ND-2026-XXXXXX`); selects verifying faculty member; reassigns faculty before review; uploads payment evidence; monitors clearance progress; accesses digital clearance certificate (`CIT-VTU-2026-XXXXXXXX`) and hall ticket eligibility. | Self-Registration (`/login` -> Create Student Account) |
| `faculty` | Faculty Advisor | Verifies student academic standing and term attendance against the institutional threshold; reviews designated evidence; approves or rejects clearance. | Self-Registration (`/login` -> Create Staff Account) + Admin Verification |
| `library_staff` | Central Library Staff | Manages book returns, catalog holds, and library desk clearances; configures payment QR codes; reviews payment evidence. | Self-Registration + Admin Verification |
| `accounts_staff` | Student Accounts Staff | Reviews tuition fees, examination dues, and hostel fee clearances; configures payment QR codes; verifies transaction evidence. | Self-Registration + Admin Verification |
| `lab_staff` | Laboratory Staff | Inspects apparatus, computing equipment, and consumable dues; configures payment QR codes; reviews equipment clearance. | Self-Registration + Admin Verification |
| `hod` | Head of Department | Conducts final institutional review after all prerequisite approvals are valid; grants final digital clearance and generates Verification ID. | Self-Registration + Admin Verification |
| `admin` | System Administrator | Verifies pending staff accounts; assigns responsibilities; provisions academic departments; configures attendance policy; reviews audit logs. | CLI / Server Bootstrap Script (Idempotent) |

---

## 3. Technology Stack

### Frontend
- **Framework:** React 18 with TypeScript & Vite
- **Styling:** Vanilla Tailwind CSS with custom institutional design tokens & dark mode
- **Routing:** React Router DOM (v6) with role-guarded route boundaries
- **Icons:** Lucide React icons
- **Visuals:** Canvas-Confetti for official clearance issuance

### Backend & Persistence
- **Database:** PostgreSQL with versioned Supabase migrations
- **Access Control:** PostgreSQL Row-Level Security (RLS) on all tables
- **Storage:** Private Supabase Storage bucket (`payment_evidence`) with signed URL access
- **Business Logic:** PostgreSQL stored procedures (RPCs) with transactional state transitions
- **Authoritative In-Memory Engine:** Embedded PostgreSQL store (`src/services/store.ts`) for deterministic local execution and automated CI/CD testing without external network dependencies.

---

## 4. Authentication & Registration Portal

The application header and login portal (`/login`) provide 4 dedicated tabs:

```
┌────────────────────────────────────────────────────────────────────────┐
│  [ Student Login ]  [ Create Student Account ]  [ Staff Login ]  [ Create Staff Account ]  │
└────────────────────────────────────────────────────────────────────────┘
```

1. **Student Login:** USN (Registration Number) and password authentication.
2. **Create Student Account:** Student self-registration requiring Full Name, official USN, department selection from active registry, academic year (`2026-2027`), current semester (1–8), email, and secure password (minimum 6 characters).
3. **Staff Login:** Institutional email and password authentication with immediate redirection to role-specific dashboards.
4. **Create Staff Account:** Institutional staff self-registration for Faculty, Library Staff, Accounts Staff, Laboratory Staff, and HOD. Public self-registration for the `admin` role is strictly blocked by server-side constraints.

---

## 5. Security & Secret Protection (Section 31 Guidelines)

This project strictly follows enterprise security practices to protect sensitive credentials:
- **No Committed Secrets:** Actual `.env` files, Supabase `service_role` keys, database passwords, and personal credentials are never committed to version control.
- **Git Ignore Safeguards:** `.gitignore` includes `.env`, `.env.*`, `*.pem`, `*.key`, and build artifacts, while preserving `.env.example`.
- **Public vs. Privileged API Keys:** Only the public Supabase Anon key (`VITE_SUPABASE_ANON_KEY`) is ever accessible to frontend code. The Supabase service-role key is strictly reserved for server-side scripts.
- **No Hardcoded Passwords:** Source code, seed scripts, database migrations, and frontend forms contain zero hardcoded administrator passwords.

---

## 6. Secure Initial Admin Account Setup (Section 30 & 31)

To create the initial Administrator account without publishing credentials:

### Method A: Server-Side CLI Script (Recommended)
Run the administrative bootstrap script from your secure terminal:

```bash
# Syntax: node scripts/bootstrap_initial_admin.mjs <adminEmail> <temporaryPassword>
node scripts/bootstrap_initial_admin.mjs admin@cauvery.edu.in YourSecureTemporaryPassword123!
```

### Method B: Environment Variables
Define the credentials in your local `.env` file (which is git-ignored):

```env
INITIAL_ADMIN_EMAIL=admin@cauvery.edu.in
INITIAL_ADMIN_PASSWORD=YourSecureTemporaryPassword123!
```

Then execute:
```bash
node scripts/bootstrap_initial_admin.mjs
```

### Mandatory Security Policies Enforced:
1. **First-Login Password Change:** The administrator is required to set a permanent, private password on initial login.
2. **Idempotent Execution:** Rerunning the bootstrap script preserves existing administrator credentials and will not overwrite updated passwords.
3. **Tombstone Enforcement:** If an initial admin account was explicitly deleted by the institution, rerunning the script will not accidentally recreate it.
4. **Privilege Escalation Prevention:** Database triggers strictly block ordinary users from elevating themselves to the `admin` role.

---

## 7. Database Migrations & Reproducibility

Database migrations are located in `supabase/migrations/`:

| Migration File | Description |
|---|---|
| `20261026000001_initial_schema.sql` | Core tables, Enums, Foreign Keys, Unique Constraints, and Performance Indexes |
| `20261026000002_functions_triggers_rls.sql` | Row-Level Security (RLS) policies, approval triggers, and state machine validation |
| `20261026000003_storage_and_seed.sql` | Private storage bucket (`payment_evidence`) policies and institutional QR configurations |
| `20261026000004_student_registration_login.sql` | USN authentication and student self-registration constraints |
| `20261026000005_faculty_assignment_and_verification.sql` | Dynamic teacher selection and faculty verification gating |
| `20261027000001_student_faculty_workflow_and_reassignment.sql` | Pre-review reassignment, post-review lock, and immutable reassignment audit logs |
| `20261027000002_staff_self_registration_and_verification.sql` | Multi-category staff registration and administrator verification procedures |
| `20261027000003_create_initial_admin.sql` | Tombstone tables, admin privilege escalation prevention, and server-side provisioning RPC |

---

## 8. Installation & Local Development Setup

### Prerequisites
- Node.js (v18.0.0 or higher)
- npm (v9.0.0 or higher)
- Git (v2.30.0 or higher)

### Setup Steps
1. **Clone the repository:**
   ```bash
   git clone https://github.com/hruthik-gowda-ht/No-Due-Clearance-System.git
   cd No-Due-Clearance-System
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` to supply your institutional details and Supabase API credentials.

4. **Bootstrap the Initial Admin account:**
   ```bash
   node scripts/bootstrap_initial_admin.mjs admin@cauvery.edu.in TemporaryPassword123!
   ```

5. **Start the local development server:**
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

---

## 9. Automated Testing & Verification Suites

Execute the comprehensive automated test suites to validate institutional business logic, security constraints, and workflow integrity:

```bash
# 1. End-to-End Clearance Workflow Suite (41 assertions)
npx tsx scripts/verify_workflow.mjs

# 2. Student-to-Faculty Workflow & Reassignment Suite (50 assertions)
npx tsx scripts/verify_student_faculty_workflow.mjs

# 3. Staff Self-Registration & Administrative Verification Suite (49 assertions)
npx tsx scripts/verify_sec28_sec29.mjs

# 4. Initial Admin Account Bootstrap & Privilege Protection Suite (37 assertions)
npx tsx scripts/verify_sec30_admin_bootstrap.mjs

# 5. Production TypeScript Typecheck & Build
npm run build
```

---

## 10. Institutional Compliance & Integrity Notice

This application has been verified against all VTU and Cauvery Institute of Technology institutional requirements:
- Zero mock accounts or fictional faculty profiles exist in production.
- No-Due requests cannot be approved when term attendance is below the configured threshold (default 85%).
- HOD approval is strictly gated behind all 4 prerequisite clearances.
- Payment screenshots require human desk sign-off and return clearance to `PENDING` rather than auto-clearing.
- Public certificate verification at `/verify/:id` enforces USN privacy masking (`1CR***099`).
