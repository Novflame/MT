SCHOOL PERFORMANCE TEST KIT

Copy the contents of this folder into the root of your application, preserving folders:
- scripts/performance/seed-school.cjs
- tests/performance/k6-school.js
- tests/performance/monitor-node.ps1
- tests/performance/.gitignore
- tests/ui/school-smoke.spec.cjs
- playwright.performance.config.cjs
- PERFORMANCE_TESTING.md

Read PERFORMANCE_TESTING.md before running anything. The seeder refuses to run without PERF_TEST_CONFIRM=YES and a school name containing "Performance". Use a dedicated local test school only.
