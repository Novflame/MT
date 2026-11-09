# Release hardening and account lifecycle — implementation report

**Verdict: NOT READY FOR PRODUCTION.** The source changes and isolated tests are in place, but a clean dependency install could not complete because the environment could not resolve `registry.npmjs.org`. As a result, semantic TypeScript checking, ESLint, the Next.js production build, and a current npm advisory audit could not be completed. No production database was opened or modified during the migration tests.

## Implemented account lifecycle

### Central account and lifecycle state

- Added additive central migration `drizzle/central/0001_account_lifecycle.sql` with `must_change_password`, `provisioning_status`, provisioning type/reference/metadata fields, and `account_audit_log`.
- Existing accounts migrate with `must_change_password = false` and `provisioning_status = 'active'`; the migration does not reset existing passwords, sessions, school IDs, or role assignments.
- Added central schema fields in `src/db/centeral-schema.ts` and a startup migration verifier in `scripts/migrate-central.cjs`.
- Account creation uses Better Auth's normal `signUpEmail` path so Better Auth hashes the password. The initial password is generated with `node:crypto.randomBytes(24).toString('base64url')` (192 bits of cryptographic randomness); it is never written to the audit log. The API returns it once to the authorized administrator, and the UI warns that it must be copied and delivered securely.
- Provisioning status stays `provisioning` until the school profile/link is committed. On link failure the central account is disabled and the intended target is retained for repair; no cross-database account deletion is attempted.
- Added a principal-only repair endpoint for recoverable failed accounts. It is idempotent for existing staff, student, and parent links and requires configured email delivery to send a password-reset link before the account is considered usable.

### Staff accounts

- `POST /api/settings/users` supports one account or an `accounts` batch. The staff form includes a CSV-style bulk-entry panel. Batch rows return individual success/failure results, user IDs for failed partial operations, one-time credentials for successful rows, and email-verification status.
- `POST /api/staff` creates the central Better Auth account, links `staffProfiles`, marks provisioning active, and returns the one-time password once.
- The server derives the school from the authenticated central account and validates role assignment. Principals can assign supported operational roles; deputies cannot create a principal or another deputy. A role sent by the browser is not trusted.
- The staff account UI no longer asks an administrator to choose a reusable password. It displays the generated password once and reports whether email verification was accepted, unavailable, or failed. The bulk-entry panel accepts one CSV row per account and shows independent results and one-time credentials for successful rows.

### Student and parent portal accounts

- `POST /api/portal-users` derives the school from the authenticated account and ignores a client-supplied `schoolId`.
- Student account creation derives the display name from the selected student profile and links `studentUsers` in a school-database transaction.
- Parent account creation links the central account to `parents` and links selected children through `parentStudents` in a school-database transaction.
- Selecting a parent profile with an existing login reuses that account and adds child links; it does not create a duplicate account. Duplicate parent-child relationships are skipped.
- The portal page now lists portal-account status and supports enable/disable, reset, resend-verification, and principal-only repair actions. Disabling an account preserves its academic records and relationships.

### First login, password reset, verification, and disablement

- New provisioned accounts start with `must_change_password = true`.
- `src/auth/session.ts` blocks protected server access for forced-password-change, banned, or failed/incomplete accounts. Protected data access through `getSchoolDB()` also requires a valid active account context. Page guards redirect forced-change users to `/change-password`; API session checks reject access.
- `POST /api/account/change-initial-password` calls Better Auth's password-change API and only clears the gate after that call succeeds. The gate is not cleared by a client-supplied flag.
- Added `/forgot-password` and `/reset-password` pages and a public reset-request endpoint. Better Auth reset tokens and email-verification tokens are configured with a one-hour expiry; Better Auth handles token validation and one-time consumption. Successful password reset clears the forced-change flag and Better Auth is configured to revoke sessions on reset.
- Admin reset revokes existing sessions and sets the password-change gate before requesting a reset email. Unverified accounts also receive a verification request when email delivery is configured.
- Account disablement sets Better Auth's `banned` state and deletes central sessions. The request-session guard also checks account state, so an old cookie is not sufficient to continue using protected APIs.
- Email verification is only treated as available when `BETTER_AUTH_URL`, `RESEND_API_KEY`, and `EMAIL_FROM` are configured. The Resend integration uses HTTPS and does not log verification URLs or tokens. Phone numbers are **not verified**: no SMS/OTP provider is integrated, and the UI explicitly says so. No email or SMS was sent during these tests.

## Backups and data integrity

- School backup manifests now optionally include a SHA-256 digest for the school's upload directory; file names and content hashes both contribute to the digest.
- Backup verification checks upload checksums and can reject a manifest for a different school. Backup download/restore paths pass the current school ID to verification.
- Backup archives include permitted per-school upload files, and import validation only extracts the manifest, database, and per-school upload subtree. Restore stages both the database and upload directory and retains rollback paths until integrity checks pass.
- These backup/restore changes were syntax-checked and the directory hashing helper was tested, but the HTTP restore path has **not** been run end-to-end against on-disk databases and uploads.

## Migrations and data preservation

- Added central migration `0001_account_lifecycle.sql` plus Drizzle journal/snapshot metadata.
- The existing school migration sequence includes `0006_normalize_final_exam_type.sql` and `0007_grade_integrity_constraints.sql`; these are additive/normalizing changes with compatibility checks.
- Legacy student migration compatibility is tested against a populated SQLite fixture. The central migration test starts from the prior central schema with a user, credential account, and session, then verifies they survive the new migration.
- Tests use in-memory or temporary SQLite databases only. They do not point at a production `central.db` or school database.

## Automated test results actually run

The following tests were run directly in this environment, using the globally installed TypeScript compiler module to transpile the route files for the Node test harness because project dependencies could not be installed:

- **11 Node tests passed** (`tests/*.test.cjs`): staff role escalation rejection; staff account/profile link and client `schoolId` override; existing parent-account reuse; session guard for forced-change/banned/failed/expired sessions; initial-password gate clearing only after Better Auth succeeds; cryptographic password uniqueness/format; role-assignment policy; actual permission map; lifecycle schema/source assertions; database-path validation; upload-directory checksum stability/change detection.
- **3 migration compatibility tests passed** (`tests/test_migration_compatibility.py`): legacy student preservation; case-insensitive final-exam normalization; grade-integrity constraints.
- **7 account/portal migration tests passed** (`tests/test_account_lifecycle_migrations.py`): empty central database migration; existing central user/account/session preservation; lifecycle states; audit schema; parent multi-child links and duplicate rejection; one-to-one student portal links; separate SQLite school-file data isolation.
- **Total: 21 tests passed, 0 failed.** These are focused mocked-handler and SQLite integration tests, not a full browser or live Next.js integration suite.
- TypeScript syntax transpilation: **0 parser/syntax diagnostics** across `.ts`/`.tsx` files.
- `node --check scripts/migrate-central.cjs`: **passed**.

## Checks blocked by environment

- `npm ci --ignore-scripts --no-audit --no-fund` failed because requests to `registry.npmjs.org` returned `EAI_AGAIN`; npm then reported `Exit handler never called`. This is a network/DNS/dependency-install blocker, not evidence that the code passes or fails type checking.
- `npm run typecheck` could not start a semantic check: `TS2688: Cannot find type definition file for 'node'` because `node_modules` is not installed.
- `npm run lint` could not run: `eslint: not found`.
- `npm run build` could not run: `next: not found`.
- `npm audit` could not retrieve advisories because the npm audit endpoint returned `EAI_AGAIN`. No security-audit pass is claimed.
- Docker startup and browser UI testing were not run.

## Required production configuration

Set these secrets/paths in the deployment environment; do not commit them:

- `BETTER_AUTH_URL` and `NEXT_PUBLIC_BETTER_AUTH_URL`: the actual externally reachable app origin (not `localhost` for a public deployment).
- `BETTER_AUTH_SECRET`: a long random secret.
- `INTERNAL_REGISTRATION_SECRET`: a separate random secret, not the Better Auth secret.
- `RESEND_API_KEY` and `EMAIL_FROM`: required for email verification/password reset. Without them, email addresses remain unverified and self-service reset/failed-account repair cannot be completed. The app does not claim to send mail when this is missing.
- `CENTRAL_DATABASE_PATH`, `SCHOOL_DATABASE_DIR`, `BACKUP_DIRECTORY`, and `SCHOOL_UPLOADS_DIR`: point these at persistent storage. Docker Compose configures `/app/data` for persistent data.
- `DAILY_REPORT_CRON_SECRET`: a separate random secret of at least 32 characters for the daily report endpoint.
- A real SMS/OTP provider and verification workflow are still required if phone verification is a production requirement.

## Recommended verification sequence on a network-enabled machine

1. Back up the real central and school databases and uploads.
2. Run `npm ci` without deleting or regenerating `package-lock.json`.
3. Run `npm run typecheck`, `npm run lint`, `npm test`, `npm audit`, and `npm run build`.
4. Start against copied test databases and verify the central migration via `npm run db:migrate:central` / `node scripts/migrate-central.cjs`; test school migrations through the app's runtime migration path on copies only.
5. Exercise real Better Auth signup/sign-in/reset/verification with a configured email provider.
6. Exercise two independent school databases through actual HTTP requests for every sensitive route, including imports, exports, reports, promotion, and backup restore.
7. Test backup/restore rollback on disk, restart the Docker container, and verify both database and upload persistence.

See `API_ROUTE_INVENTORY.md` for the source-derived inventory of 50 API route files and which endpoints have focused automated coverage. See `MODIFIED_FILES.md` for the complete added/changed file list.
