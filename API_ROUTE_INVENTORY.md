# API route inventory and test coverage

Generated from the source tree: **50 route files**. This is a source-derived inventory, not a claim that every endpoint has passed a security test.

| Route | Methods | Guard / permission detected | Automated test status |
|---|---|---|---|
| /api/academic-years | GET, POST | getRequestSession: active session, password-change, ban and provisioning state guard; verify resource role scope | Not directly exercised by current route tests |
| /api/account/change-initial-password | POST | No explicit guard detected by source scan; manual review required | POST — mocked API integration (forced-password gate) |
| /api/account/request-password-reset | POST | Public endpoint; input/rate/provider controls need live testing | Not directly exercised by current route tests |
| /api/account | GET, PATCH | getRequestSession: active session, password-change, ban and provisioning state guard; verify resource role scope | Not directly exercised by current route tests |
| /api/analytics | GET | reports.read | Not directly exercised by current route tests |
| /api/attendance/roster | GET | getRequestSession: active session, password-change, ban and provisioning state guard; verify resource role scope | Not directly exercised by current route tests |
| /api/attendance | POST, GET, PATCH | getRequestSession: active session, password-change, ban and provisioning state guard; verify resource role scope | Not directly exercised by current route tests |
| /api/auth/{...all} | method export not detected | Better Auth handler and configured hooks | Not directly exercised by current route tests |
| /api/backups/{backupId}/download | GET | backups.read | Not directly exercised by current route tests |
| /api/backups/{backupId}/restore | POST | backups.restore | Not directly exercised by current route tests |
| /api/backups/{backupId}/verify | GET | backups.read | Not directly exercised by current route tests |
| /api/backups/history | GET | backups.read | Not directly exercised by current route tests |
| /api/backups/import | POST | backups.create | Not directly exercised by current route tests |
| /api/backups | POST | backups.create | Not directly exercised by current route tests |
| /api/certificates/{enrollmentId} | GET | results.read | Not directly exercised by current route tests |
| /api/class-heads | POST, GET | getRequestSession: active session, password-change, ban and provisioning state guard; verify resource role scope | Not directly exercised by current route tests |
| /api/classes | GET, POST | classes.read, classes.create | Not directly exercised by current route tests |
| /api/core-subjects | GET, POST | subjects.read, subjects.update | Not directly exercised by current route tests |
| /api/department-heads | GET, POST | departments.read, departments.update | Not directly exercised by current route tests |
| /api/departments | GET, POST, PATCH, DELETE | departments.read, departments.create, departments.update, departments.delete | Not directly exercised by current route tests |
| /api/enrollments | GET | results.read | Not directly exercised by current route tests |
| /api/exams | GET, POST, PATCH, DELETE | exams.read, exams.create, exams.update, exams.delete | Not directly exercised by current route tests |
| /api/grades | GET, POST | grades.read, grades.create | Not directly exercised by current route tests |
| /api/notifications | GET, PATCH | requireSession: authenticated session guard; verify resource role scope | Not directly exercised by current route tests |
| /api/parent-students | GET, POST | users.update | Not directly exercised by current route tests |
| /api/portal-users | POST | users.create | POST — mocked API integration (existing parent account reuse) |
| /api/promotion | GET, POST, PATCH | requireSession: authenticated session guard; verify resource role scope | Not directly exercised by current route tests |
| /api/register-school | POST | Public endpoint; input/rate/provider controls need live testing | Not directly exercised by current route tests |
| /api/reports/daily/check | POST | Cron secret / system guard | Not directly exercised by current route tests |
| /api/reports | GET | reports.read | Not directly exercised by current route tests |
| /api/results | GET | results.read | Not directly exercised by current route tests |
| /api/school/logo | POST | getRequestSession: active session, password-change, ban and provisioning state guard; verify resource role scope | Not directly exercised by current route tests |
| /api/school | GET, PATCH | getRequestSession: active session, password-change, ban and provisioning state guard; verify resource role scope | Not directly exercised by current route tests |
| /api/school-certificates/export | POST | requireSession: authenticated session guard; verify resource role scope | Not directly exercised by current route tests |
| /api/school-certificates/final-year-preview | GET | requireSession: authenticated session guard; verify resource role scope | Not directly exercised by current route tests |
| /api/school-certificates | GET, POST | requireSession: authenticated session guard; verify resource role scope | Not directly exercised by current route tests |
| /api/settings/users/{id}/repair | POST | users.update | Not directly exercised by current route tests |
| /api/settings/users/{id} | PATCH, DELETE, POST | users.update, users.delete | Not directly exercised by current route tests |
| /api/settings/users/{id}/verify-email | POST | users.update | Not directly exercised by current route tests |
| /api/settings/users | GET, POST | users.read, users.create | POST — mocked API integration (role escalation and one-time credentials); GET — not route-tested |
| /api/staff/{userId} | GET, PATCH | users.read, users.update | Not directly exercised by current route tests |
| /api/staff | POST, GET | users.create, users.read | POST — mocked API integration (profile link and client schoolId override); GET — not route-tested |
| /api/students/{id}/profile | GET | getRequestSession: active session, password-change, ban and provisioning state guard; verify resource role scope | Not directly exercised by current route tests |
| /api/students/{id} | PATCH, DELETE | students.update, students.delete | Not directly exercised by current route tests |
| /api/students/check-parent | POST | students.create | Not directly exercised by current route tests |
| /api/students/import | GET, POST | getRequestSession: active session, password-change, ban and provisioning state guard; verify resource role scope | Not directly exercised by current route tests |
| /api/students | POST | getRequestSession: active session, password-change, ban and provisioning state guard; verify resource role scope | Not directly exercised by current route tests |
| /api/subjects | GET, POST, PATCH, DELETE | subjects.read, subjects.create, subjects.update, subjects.delete | Not directly exercised by current route tests |
| /api/teacher-assignments | POST, GET | getRequestSession: active session, password-change, ban and provisioning state guard; verify resource role scope | Not directly exercised by current route tests |
| /api/tests | GET, POST, PATCH, DELETE | tests.read, tests.create, tests.update, tests.delete | Not directly exercised by current route tests |

## Coverage limits

- The route tests load actual handler code but mock authentication, central persistence, and school persistence. They verify selected authorization and lifecycle behavior, not every endpoint end-to-end.
- SQLite migration tests use isolated in-memory/temporary databases. The two-school fixture proves file separation at the SQLite layer; it is not a live HTTP test against two deployed schools.
- Backup hashing is tested, but backup/restore HTTP routes have not been executed end-to-end.
- Review all routes marked “manual review required” or with only a tenant/session guard before production, especially imports, exports, reports, academic promotion, and backup restore.
