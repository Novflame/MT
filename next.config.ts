import type { NextConfig } from "next"

const nextConfig: NextConfig = {
    reactStrictMode: true,

    allowedDevOrigins: [
        "192.168.0.102",
    ],

    output: "standalone",

    outputFileTracingIncludes: {
        "/**": [
            "./drizzle/central/**/*",
            "./drizzle/school/**/*",
        ],
    },
}

export default nextConfig