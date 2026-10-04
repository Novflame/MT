import { defineConfig } from "drizzle-kit"

export default defineConfig({
    schema: "./src/db/schema.ts",

    out: "./drizzle/school",

    dialect: "sqlite",

    dbCredentials: {
        url: "./databases/.schema-template.db",
    },
})