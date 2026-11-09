import http from 'k6/http'
import { check, sleep } from 'k6'

const BASE = (__ENV.BASE_URL || 'http://localhost:3000').replace(/\/$/, '')
const EMAIL = __ENV.PERF_EMAIL
const PASSWORD = __ENV.PERF_PASSWORD

export const options = {
    scenarios: {
        auth_test: {
            executor: 'per-vu-iterations',
            vus: 5,
            iterations: 1,
            maxDuration: '1m',
        },
    },
}

export default function authFiveVUs() {
    const vu = __VU

    const login = http.post(
        `${BASE}/api/auth/sign-in/email`,
        JSON.stringify({
            email: EMAIL,
            password: PASSWORD,
        }),
        {
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            timeout: '30s',
        }
    )

    const cookies = http.cookieJar().cookiesForURL(BASE)
    const cookieNames = Object.keys(cookies)

    console.log(
        `VU ${vu}: LOGIN=${login.status}, COOKIES=${cookieNames.join(',') || 'NONE'}`
    )

    if (login.status !== 200) {
        console.error(`VU ${vu}: LOGIN FAILED: ${login.body}`)
        return
    }

    const response = http.get(`${BASE}/api/school`, {
        timeout: '30s',
    })

    console.log(`VU ${vu}: API=${response.status}`)

    check(response, {
        'login successful': () => login.status === 200,
        'session cookie stored': () =>
            cookieNames.some(name => name.includes('session_token')),
        'school API returns 200': () => response.status === 200,
    })

    sleep(1)
}