import "dotenv/config";
import { defineConfig } from "drizzle-kit";

// Migrations and schema introspection run as the schema owner.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/data/schema/index.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
  strict: true,
  verbose: true,
});
