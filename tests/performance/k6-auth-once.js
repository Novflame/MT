import http from 'k6/http'
import { check } from 'k6'

const BASE = (__ENV.BASE_URL || 'http://localhost:3000').replace(/\/$/, '')
const EMAIL = __ENV.PERF_EMAIL
const PASSWORD = __ENV.PERF_PASSWORD

export const options = {
    vus: 1,
    iterations: 1,
}

export default function authOnce() {
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

    console.log(`LOGIN STATUS: ${login.status}`)

    const responseCookies = login.cookies || {}

    for (const [name, entries] of Object.entries(responseCookies)) {
        for (const cookie of entries) {
            console.log(`RESPONSE COOKIE: ${name}`)
            console.log(`DOMAIN: ${cookie.domain}`)
            console.log(`PATH: ${cookie.path}`)
            console.log(`SECURE: ${cookie.secure}`)
            console.log(`HTTP ONLY: ${cookie.http_only}`)
            console.log(`SAME SITE: ${cookie.same_site}`)
        }
    }

    const setCookieHeader = Object.keys(login.headers || {}).some(
        key => key.toLowerCase() === 'set-cookie'
    )

    console.log(`SET-COOKIE HEADER EXISTS: ${setCookieHeader}`)

    const jarBefore = http.cookieJar().cookiesForURL(BASE)

    console.log(
        `JAR AFTER LOGIN: ${Object.keys(jarBefore).join(', ') || 'NONE'}`
    )

    const response = http.get(`${BASE}/api/school`, {
        timeout: '30s',
    })

    const jarAfter = http.cookieJar().cookiesForURL(
        `${BASE}/api/school`
    )

    console.log(`SCHOOL API STATUS: ${response.status}`)
    console.log(
        `JAR BEFORE API: ${Object.keys(jarBefore).join(', ') || 'NONE'}`
    )
    console.log(
        `JAR AT API: ${Object.keys(jarAfter).join(', ') || 'NONE'}`
    )

    check(response, {
        'school API returns 200': r => r.status === 200,
    })
}