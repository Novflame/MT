TIMETABLE & CLASS SESSIONS MODULE — SOURCE PATCH

Target project: D:\school\school-management--system

WHAT IS INCLUDED
- Per-school feature flag stored in the central database table `school_feature_flags`.
- Weekly class timetable and slot management (create/update/deactivate).
- Idempotent daily session generation from weekly slots.
- Teacher check-in/check-out, late-minute calculation, and substitution/cancellation handling.
- Independent per-session student attendance; the legacy `attendance` table is unchanged.
- Deduplicated notifications for missing teacher check-in/check-out and missing student attendance.
- Teacher performance report derived from session and attendance records.
- Role/school/teacher-assignment checks and audit records.
- Timetable settings page, timetable page, dashboard navigation, and teacher dashboard entry.

APPLYING THE SOURCE
1. Extract this archive into the project root and allow it to merge the `src/` directory.
2. Do not run migration commands yet if you are not ready to migrate.
3. The feature flag defaults to disabled for every school. The current dev school will remain disabled until an administrator enables it after migrations.

MIGRATION — WHEN YOU AUTHORIZE IT
The source schema has been updated, but this patch intentionally contains NO generated migration SQL, NO journal changes, and NO applied migrations.
When ready, from the project root:
  npm run db:generate
  npm run db:generate:central
Review the generated school and central SQL + snapshots/journals before applying anything.

Important existing project behavior:
- `predev` and `prestart` run central migrations automatically.
- `getSchoolDB()` invokes the project's school runtime migrator when a school DB connection is opened.
Therefore, after generating migrations, do not start the app until you intend to apply the generated migrations. Take backups first.
- Do not use `drizzle-kit push`.

BACKGROUND NOTIFICATIONS
Set a strong `TIMETABLE_CRON_SECRET` environment variable. Configure an external scheduler to POST `/api/timetable/cron` with:
  Authorization: Bearer <TIMETABLE_CRON_SECRET>
Run it every 5–10 minutes. The endpoint skips schools whose timetable feature flag is disabled.

TIME ZONE
`TIMETABLE_TIME_ZONE` defaults to `Africa/Khartoum`. Set it to the school's IANA timezone if the school operates elsewhere.

VALIDATION PERFORMED HERE
- Parsed all 219 TypeScript/TSX source files with the installed TypeScript transpiler: zero syntax diagnostics.
- Added and ran 5 structural contract tests: all 5 passed.
- Confirmed the legacy `attendance` schema block was not changed.
- Confirmed final-year certificate files and central `schools` schema were not changed.
- No database was opened or modified; no migration was generated or applied.
- Full `npm run typecheck`, lint, and runtime/database tests were not run because the supplied archives do not contain the project root `package.json`, installed `node_modules`, or actual database files.

API SUMMARY
- GET/POST/PATCH/DELETE `/api/timetable`
- GET/POST/PATCH `/api/timetable/sessions`
- POST `/api/timetable/sessions/:sessionId/teacher-attendance`
- GET/PUT `/api/timetable/sessions/:sessionId/student-attendance`
- GET `/api/timetable/reports/teachers`
- GET `/api/timetable/status`
- GET/PATCH `/api/settings/timetable`
- POST `/api/timetable/cron`
