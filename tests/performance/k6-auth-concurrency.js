import http from 'k6/http'
import { check, sleep } from 'k6'

const BASE = (__ENV.BASE_URL || 'http://localhost:3000').replace(/\/$/, '')
const EMAIL = __ENV.PERF_EMAIL
const PASSWORD = __ENV.PERF_PASSWORD

export const options = {
    scenarios: {
        auth_concurrency: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '1m', target: 5 },
                { duration: '2m', target: 10 },
                { duration: '2m', target: 25 },
                { duration: '2m', target: 50 },
                { duration: '1m', target: 0 },
            ],
            gracefulRampDown: '10s',
        },
    },
}

let authenticated = false

export default function authConcurrency() {
    const vu = __VU

    if (!authenticated) {
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
                tags: { kind: 'auth' },
            }
        )

        console.log(`VU ${vu}: LOGIN STATUS ${login.status}`)

        if (login.status !== 200) {
            console.error(`VU ${vu}: LOGIN FAILED`)
            sleep(5)
            return
        }

        // Inspect response cookies without exposing their values.
        const responseCookies = login.cookies || {}

        for (const [name, entries] of Object.entries(responseCookies)) {
            for (const cookie of entries) {
                console.log(`VU ${vu}: RESPONSE COOKIE ${name}`)
                console.log(`  domain=${cookie.domain}`)
                console.log(`  path=${cookie.path}`)
                console.log(`  secure=${cookie.secure}`)
                console.log(`  httpOnly=${cookie.http_only}`)
                console.log(`  sameSite=${cookie.same_site}`)
            }
        }

        const jarCookies = http.cookieJar().cookiesForURL(BASE)

        console.log(
            `VU ${vu}: JAR COOKIES ${
                Object.keys(jarCookies).join(', ') || 'NONE'
            }`
        )

        authenticated = true
        console.log(`VU ${vu}: LOGIN OK`)
    }

    const cookies = http.cookieJar().cookiesForURL(`${BASE}/api/school`)
    const cookieNames = Object.keys(cookies)

    const hasSessionCookie = cookieNames.some(name =>
        name.includes('session_token')
    )

    const response = http.get(`${BASE}/api/school`, {
        timeout: '30s',
        tags: { kind: 'api' },
    })

    if (response.status !== 200) {
        console.error(
            `VU ${vu}: API ${response.status}, sessionCookie=${hasSessionCookie}, cookieNames=${cookieNames.join(',') || 'NONE'}`
        )
        console.error(`VU ${vu}: BODY ${response.body}`)
    }

    check(response, {
        'school API returns 200': r => r.status === 200,
    })

    sleep(2)
}