import { defineConfig } from "drizzle-kit"

export default defineConfig({
    schema: "./src/db/centeral-schema.ts",

    out: "./drizzle/central",

    dialect: "sqlite",

    dbCredentials: {
        url: process.env.CENTRAL_DATABASE_PATH ?? "./central.db",
    },
})
