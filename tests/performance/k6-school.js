import http from 'k6/http'
import { check, sleep, fail } from 'k6'

const BASE_URL = (__ENV.BASE_URL || 'http://localhost:3000').replace(/\/$/, '')
const EMAIL = __ENV.PERF_EMAIL
const PASSWORD = __ENV.PERF_PASSWORD
const TEST_TYPE = (__ENV.TEST_TYPE || 'load').toLowerCase()

if (!EMAIL || !PASSWORD) throw new Error('Set PERF_EMAIL and PERF_PASSWORD to the dedicated Performance Lab principal.')

const scenarios = {
  load: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '2m', target: 10 },
      { duration: '3m', target: 25 },
      { duration: '5m', target: 50 },
      { duration: '2m', target: 0 },
    ],
    gracefulRampDown: '30s',
  },
  stress: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '2m', target: 20 },
      { duration: '3m', target: 50 },
      { duration: '3m', target: 100 },
      { duration: '3m', target: 150 },
      { duration: '3m', target: 200 },
      { duration: '2m', target: 0 },
    ],
    gracefulRampDown: '30s',
  },
  endurance: {
    executor: 'constant-vus',
    vus: Number(__ENV.ENDURANCE_VUS || 30),
    duration: __ENV.ENDURANCE_DURATION || '60m',
    gracefulStop: '30s',
  },
}

if (!scenarios[TEST_TYPE]) throw new Error(`Unknown TEST_TYPE "${TEST_TYPE}". Use load, stress, or endurance.`)

const thresholdSets = {
  load: {
    http_req_failed: ['rate<0.01'],
    'http_req_duration{kind:api}': ['p(95)<1500'],
    'http_req_duration{kind:page}': ['p(95)<3000'],
    checks: ['rate>0.99'],
  },
  stress: {
    http_req_failed: ['rate<0.05'],
    'http_req_duration{kind:api}': ['p(95)<5000'],
    'http_req_duration{kind:page}': ['p(95)<8000'],
    checks: ['rate>0.95'],
  },
  endurance: {
    http_req_failed: ['rate<0.01'],
    'http_req_duration{kind:api}': ['p(95)<2000'],
    'http_req_duration{kind:page}': ['p(95)<3500'],
    checks: ['rate>0.99'],
  },
}

export const options = {
  scenarios: { school_workload: scenarios[TEST_TYPE] },
  thresholds: thresholdSets[TEST_TYPE],
  summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
  userAgent: 'SchoolManagement-PerformanceTest/1.0',
}

let authenticated = false

function assertOk(response, label) {
  const ok = check(response, {
    [`${label} returns HTTP 200`]: (r) => r.status === 200,
    [`${label} did not redirect to login`]: (r) => !String(r.url || '').includes('/login'),
  })
  if (!ok && (response.status === 401 || response.status === 403)) {
    fail(`${label} rejected the test session with HTTP ${response.status}. Check role and session configuration.`)
  }
}

function get(path, kind) {
  const response = http.get(`${BASE_URL}${path}`, {
    tags: { kind, route: path },
    redirects: 5,
    timeout: '30s',
  })
  assertOk(response, path)
}

export default function () {
  if (!authenticated) {
    const login = http.post(`${BASE_URL}/api/auth/sign-in/email`, JSON.stringify({
      email: EMAIL,
      password: PASSWORD,
    }), {
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      tags: { kind: 'auth', route: 'sign-in' },
      timeout: '30s',
    })
    const ok = check(login, { 'principal login succeeds': (r) => r.status === 200 })
    if (!ok) fail(`Login failed with HTTP ${login.status}. Check PERF_EMAIL/PERF_PASSWORD.`)
    authenticated = true
  }

  // Page navigation workload: HTML response time and server-side rendering.
  get('/dashboard', 'page')
  get('/students', 'page')
  get('/classes', 'page')
  get('/subjects', 'page')
  get('/staff', 'page')
  get('/reports', 'page')

  // API workload: tenant lookup, dashboard analytics, roster-sized payloads and directory reads.
  get('/api/school', 'api')
  get('/api/analytics', 'api')
  get('/api/classes', 'api')
  get('/api/subjects', 'api')
  get('/api/staff', 'api')
  get('/api/enrollments', 'api')
  get('/api/academic-years', 'api')

  sleep(1)
}

export function handleSummary(data) {
  const summary = {
    testType: TEST_TYPE,
    generatedAt: new Date().toISOString(),
    metrics: {},
  }
  for (const [name, metric] of Object.entries(data.metrics || {})) {
    if (metric.values) summary.metrics[name] = metric.values
  }
  return {
    [`performance-results/${TEST_TYPE}-summary.json`]: JSON.stringify(data, null, 2),
    stdout: JSON.stringify(summary, null, 2),
  }
}
