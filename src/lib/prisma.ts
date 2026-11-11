import { PrismaClient } from "@prisma/client"

/**
 * Prisma client singleton. In development, hot-reload would otherwise create a
 * new client (and exhaust database connections) on every change.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
