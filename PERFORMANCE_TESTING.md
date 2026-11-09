# School UI, Runtime, Load, Stress and Endurance Test Kit

This kit is based on the supplied `src/` snapshot and its Drizzle migrations. It adds test tooling only; it does not modify application source code or delete data.

## 1. What the simulation creates

Run the seeder against a **separate, empty school** whose displayed school name contains `Performance` (for example, `Performance Lab`). It creates data through the application's authenticated API routes:

| Entity | Quantity |
|---|---:|
| Classes | 6 |
| Subjects | 21 |
| Core subjects | 6 per class (36 class-subject selections) |
| Teacher accounts | 40 |
| Teacher/class/subject assignments | 126 |
| Student profiles | 1,000 |
| Parent profiles | 1,000 (one per student) |

The 40 teacher accounts have their one-time passwords changed automatically to test-only passwords and are saved locally. Student and parent **profiles** are created by default, not portal login accounts. To also provision 1,000 student and 1,000 parent portal accounts, set `PERF_CREATE_PORTAL_ACCOUNTS=1` before running the seeder. That optional step creates 2,000 additional accounts and can take considerably longer.

The six default core subjects are English, Arabic, Mathematics, General Science, History, and Computer Studies. Edit `coreNames` in `scripts/performance/seed-school.cjs` if the school's curriculum defines a different set.

## 2. Safety requirements — read before running

1. Use a **dedicated test school**, not your real school. Create it through the app's normal registration flow and name it `Performance Lab`.
2. Use a local development/test server only. Do not point this kit at a production URL or a live database.
3. The seeder requires `PERF_TEST_CONFIRM=YES` and verifies the signed-in school's name contains `Performance` before creating anything.
4. It refuses to run if classes, subjects, enrollments, or staff profiles already exist. It never deletes or overwrites records.
5. If seeding stops partway through, do not rerun against that partially populated school. Create a fresh dedicated test school and seed that one.
6. Test accounts and passwords are synthetic. Keep `tests/performance/.credentials.local.json` private and never commit it.

For strongest isolation, use a separate local copy of the app with separate `CENTRAL_DATABASE_PATH` and `SCHOOL_DATABASE_DIR` environment paths before creating the test school. Keep the same migration process as the application; do not manually copy or edit production database files.

## 3. Install test tools

From the project root in PowerShell:

```powershell
npm install -D @playwright/test
npx playwright install chromium
```

Install Grafana k6 on Windows, then confirm it is available:

```powershell
winget install --id Grafana.k6 -e
k6 version
```

The existing Node/Python `npm test` suite is separate and should remain green before and after performance testing.

## 4. Create the school simulation

Start the app in the dedicated local environment. In a new PowerShell window:

```powershell
$env:PERF_BASE_URL = "http://localhost:3000"
$env:PERF_EMAIL = "YOUR_PERFORMANCE_PRINCIPAL_EMAIL"
$env:PERF_PASSWORD = "YOUR_PERFORMANCE_PRINCIPAL_PASSWORD"
$env:PERF_TEST_CONFIRM = "YES"
node scripts/performance/seed-school.cjs
```

If you want the additional 2,000 portal login accounts, set this **before the first and only seed run** (do not run the seeder a second time):

```powershell
$env:PERF_CREATE_PORTAL_ACCOUNTS = "1"
node scripts/performance/seed-school.cjs
```

Choose either the default seed command or this optional-account command on a fresh school. The first successful run populates it; the script will intentionally refuse a second run.

The seeder writes:
- `tests/performance/.credentials.local.json` — local-only teacher (and optional portal) credentials.
- `tests/performance/.seed-manifest.local.json` — generated entity IDs and counts.

## 5. UI smoke and responsive test

Keep the app running. In another PowerShell window:

```powershell
$env:BASE_URL = "http://localhost:3000"
$env:PERF_EMAIL = "YOUR_PERFORMANCE_PRINCIPAL_EMAIL"
$env:PERF_PASSWORD = "YOUR_PERFORMANCE_PRINCIPAL_PASSWORD"
npx playwright test --config=playwright.performance.config.cjs
```

The browser test signs in as principal, visits the dashboard and major admin pages, records navigation timings, captures screenshots, checks browser exceptions and HTTP 5xx responses, then checks horizontal overflow at a 390px mobile viewport.

Outputs:
- `performance-results/ui-navigation-timings.json`
- `performance-results/ui-screenshots/`
- `performance-results/playwright-report/`
- `performance-results/playwright-artifacts/`

This is a smoke/visual-layout test, not a full pixel-by-pixel visual regression suite.

## 6. Load, stress and endurance tests

Set the dedicated test principal credentials in each PowerShell session:

```powershell
$env:BASE_URL = "http://localhost:3000"
$env:PERF_EMAIL = "YOUR_PERFORMANCE_PRINCIPAL_EMAIL"
$env:PERF_PASSWORD = "YOUR_PERFORMANCE_PRINCIPAL_PASSWORD"
New-Item -ItemType Directory -Force performance-results | Out-Null
```

### A. Load testing — expected traffic

Ramps through 10, 25, then 50 concurrent virtual users. The run lasts about 12 minutes.

```powershell
k6 run -e TEST_TYPE=load tests/performance/k6-school.js
```

### B. Stress testing — find the failure point

Ramps through 20, 50, 100, 150, then 200 concurrent virtual users. Watch the first stage where latency, HTTP errors, or failed checks rise sharply. Do not run this against production.

```powershell
k6 run -e TEST_TYPE=stress tests/performance/k6-school.js
```

### C. Endurance testing — sustained operation

Runs 30 concurrent virtual users for 60 minutes by default.

```powershell
k6 run -e TEST_TYPE=endurance tests/performance/k6-school.js
```

To adjust endurance load/duration:

```powershell
k6 run -e TEST_TYPE=endurance -e ENDURANCE_VUS=40 -e ENDURANCE_DURATION=90m tests/performance/k6-school.js
```

The k6 script creates a separate authenticated session per virtual user by signing in once per VU. It repeatedly requests the dashboard, student/class/subject/staff/report pages, and the school, analytics, classes, subjects, staff, enrollments, and academic-year APIs. It intentionally uses a principal account to exercise the broad administrative workload. This is a concurrency simulation, not 200 distinct human identities unless the optional portal accounts are also created and a role-mixed test is added.

Each run writes a raw JSON summary to `performance-results/<test-type>-summary.json` and prints key metrics to the terminal.

## 7. Monitor Node.js memory and CPU during endurance

In a separate PowerShell window while endurance is running:

```powershell
.\tests\performance\monitor-node.ps1 -DurationMinutes 60 -IntervalSeconds 10
```

The CSV records Node process CPU time, working set, private memory, threads, and handles. Check whether memory continues to rise rather than stabilizing, whether the process restarts, and whether latency worsens over time.

## 8. How to interpret the results

| Test | Primary question | Watch |
|---|---|---|
| Load | Does the app handle expected concurrent use? | p95 response time, request failure rate, throughput, checks |
| Stress | At what concurrency does service quality break? | first sustained p95/error-rate jump, 5xx/timeout onset, recovery after ramp-down |
| Endurance | Does performance degrade during long operation? | early-vs-late p95, error rate, Node memory trend, process restarts |
| UI smoke | Do real pages render and remain usable? | route status, DOMContentLoaded, browser exceptions, screenshots, mobile overflow |

Initial thresholds are intentionally explicit but should be treated as a first baseline, not a universal SLA:
- Load: API p95 < 1.5s, page p95 < 3s, failed requests < 1%.
- Stress: API p95 < 5s, page p95 < 8s, failed requests < 5%. A threshold breach helps identify the capacity boundary.
- Endurance: API p95 < 2s, page p95 < 3.5s, failed requests < 1%.

Compare results on the same machine, same build mode, same dataset, and same browser. For a meaningful runtime baseline, use a production build (`npm run build` then `npm run start`) rather than relying only on `next dev`; development mode has extra compilation and debugging overhead.

## 9. Important scope limits

- This kit does not create exam, grade, or attendance history yet. Those should be added after confirming the exact academic-year and grading rules for the dedicated test school.
- The current load profile uses one principal identity with one session per virtual user. It measures request concurrency and database contention, not realistic role distribution.
- It does not test external email delivery, payment services, or production infrastructure.
- Do not infer a production capacity number from one laptop/desktop run. Record CPU, RAM, storage type, Node version, database size, and build mode with each result.
