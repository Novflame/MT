
import { defineConfig } from "drizzle-kit"

export default defineConfig({
    schema: "./src/db/schema.ts",

    out: "./drizzle/school",

    dialect: "sqlite",

    dbCredentials: {
        url: "./databases/school_11.db",
    },
})

