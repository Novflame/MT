# School Management System

A multi-school school-management application built with Next.js App Router, Better Auth, Drizzle ORM and SQLite. Each school has its own SQLite database while authentication and school membership live in the central database.

## Included modules

- Authentication and school registration
- Multi-school isolation
- RBAC and permission checks
- Academic years, classes, departments and subjects
- Students and academic-year enrollment
- Staff, teacher assignments, heads of class and heads of department
- Attendance
- Tests and exams
- Grade entry and grade notifications
- Calculated results and report cards
- Reports and analytics
- Parent/student portal accounts
- Parent/student linking
- Parent and student portals
- Notifications

## Requirements

- Node.js 20.9+
- npm 10+

## Local setup

1. Copy `.env.example` to `.env`.
2. Set a strong `BETTER_AUTH_SECRET`.
3. Set a separate `INTERNAL_REGISTRATION_SECRET`.
4. Install dependencies:

```bash
npm install
```

5. Start the application:

```bash
npm run dev
```

The application migrates the central authentication database and each school database automatically at runtime. A new school registration also creates its school database, applies the school migrations and seeds default departments plus an active academic year.

## Production

```bash
npm install
npm run build
npm start
```

Keep `central.db` and the entire `databases/` directory on persistent storage. SQLite is appropriate for a persistent Node server or VM; do not put these databases on an ephemeral serverless filesystem.

For Docker:

```bash
docker compose up --build -d
```

The compose file persists the central database and school databases in Docker volumes.

## Database commands

The supplied Drizzle configs are preserved:

- `drizzle.config.ts` -> the existing school SQLite config
- `drizzle.school.config.ts` -> the existing school SQLite config
- `drizzle.central.config.ts` -> central Better Auth database

Runtime migrations are already wired into `src/db/central.ts` and `src/db/index.ts`.

## First use

1. Open `/register`.
2. Create the school and principal account.
3. Log in.
4. Create classes and subjects as needed.
5. Create staff accounts and teacher assignments.
6. Create student records and enroll them into the active academic year.
7. Create tests/exams.
8. Enter grades.
9. Review results, report cards, reports and analytics.
10. Create parent/student portal accounts and link parent accounts to students.

## Environment

Required in production:

- `BETTER_AUTH_URL`
- `NEXT_PUBLIC_BETTER_AUTH_URL`
- `BETTER_AUTH_SECRET`
- `INTERNAL_REGISTRATION_SECRET`

Optional:

- `CENTRAL_DATABASE_PATH` (default `./central.db`)
- `SCHOOL_DATABASE_DIR` (default `./databases`)

## Important deployment constraint

The original uploaded project did not include a package lockfile or dependency manifest. This completed archive therefore includes a new `package.json` but intentionally does not claim a generated lockfile. Run `npm install` in the deployment environment to resolve and lock the dependency tree for that environment.
