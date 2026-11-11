/**
 * Vitest global setup: unit tests import modules that validate env or
 * instantiate PrismaClient, so required env vars get safe test values here.
 * NODE_ENV=test is set by Vitest itself.
 */

process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5432/campaignhub_test"
process.env.AUTH_SECRET ??= "unit-test-secret-value-0123456789abcdef"
process.env.APP_URL ??= "http://localhost:3000"
