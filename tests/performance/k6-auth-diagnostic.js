import http from 'k6/http'
import { sleep } from 'k6'

const BASE = (__ENV.BASE_URL || 'http://localhost:3000').replace(/\/$/, '')

export const options = {
    vus: 1,
    iterations: 1,
}

export default function () {
    const login = http.post(
        `${BASE}/api/auth/sign-in/email`,
        JSON.stringify({
            email: __ENV.PERF_EMAIL,
            password: __ENV.PERF_PASSWORD,
        }),
        {
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
        }
    )

    console.log(`LOGIN STATUS: ${login.status}`)

    const jar = http.cookieJar()
    const cookies = jar.cookiesForURL(BASE)

    console.log(`COOKIE NAMES AFTER LOGIN: ${Object.keys(cookies).join(', ')}`)
    console.log(`COOKIE COUNT: ${Object.keys(cookies).length}`)

    for (let i = 1; i <= 5; i++) {
        const response = http.get(`${BASE}/api/school`)

        console.log(`CHECK ${i}: HTTP ${response.status}`)
        if (response.status !== 200) {
            console.log(`ERROR BODY: ${response.body}`)
        }

        if (i < 5) sleep(15)
    }
}
