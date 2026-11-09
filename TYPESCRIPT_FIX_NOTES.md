# TypeScript errors reported on 2026-10-29

Applied fixes for the reported compiler errors:

- `src/app/api/settings/users/[id]/repair/route.ts`: execute synchronous better-sqlite3 relational lookups with `.select().from(...).where(...).get()` inside the synchronous transaction instead of treating the lazy relational query object as a row.
- `src/app/api/staff/route.ts`: import the missing `and` operator.
- `src/app/api/students/[id]/route.ts`: import `promotionDecisions`, `resultCertificates`, `schoolCertificates`, and `studentUsers` used by the delete/archive flow.
- `src/auth/authorization.ts`: import `studentUsers`, `parents`, `parentStudents`, `departmentHeads`, and `academicYears` used by record-level authorization.
- `src/components/exams/ExamsManager.tsx`: explicitly type the `useSyncExternalStore` server snapshots so the language remains the `Language` union rather than widening to `string`.
- `src/lib/school-certificate-pdf.ts`: bridge the `fontkit` type mismatch through `unknown` to the exact parameter type expected by `PDFDocument.registerFontkit`; no `any` was added.

Validation performed in this environment:
- `npm test`: 11 Node tests + 3 migration tests + 7 account lifecycle/tenant isolation tests passed (21 total).
- ZIP integrity: passed.
- `npm ci --ignore-scripts --no-audit --no-fund --prefer-offline`: timed out; full semantic TypeScript check, ESLint and Next.js production build could not be run because installation did not complete.

The syntax-only check is separate from `tsc --noEmit` and is not a substitute for the full semantic check. Run `npm ci`, `npm run typecheck`, `npm run lint`, and `npm run build` on a machine where the npm registry is reachable before deployment.
