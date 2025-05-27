#!/usr/bin/env node

// Migration script for deployment
const { execSync } = require("child_process");

console.log("Running database migrations for deployment...");

try {
  // Run Drizzle migration
  console.log("Creating database tables...");
  execSync("npx drizzle-kit push --force", { stdio: "inherit" });
  console.log("Database migration completed successfully!");
} catch (error) {
  console.error("Migration failed:", error.message);
  process.exit(1);
}
