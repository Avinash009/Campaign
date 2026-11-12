import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"
import type { Prisma } from "@prisma/client"

/**
 * Audit trail for significant operations (registration, onboarding, profile
 * changes, team changes). Best-effort: an audit failure is logged but never
 * breaks the caller's transaction — the operation already succeeded.
 */

export interface AuditInput {
  actorId?: string | null
  businessId?: string | null
  /** Dotted action name, e.g. "business.profile_updated". */
  action: string
  entityType: string
  entityId?: string | null
  metadata?: Record<string, unknown>
  ipAddress?: string | null
}

export async function recordAudit(input: AuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: input.actorId ?? null,
        businessId: input.businessId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
        ipAddress: input.ipAddress ?? null,
      },
    })
  } catch (error) {
    logger.error("audit.write_failed", {
      action: input.action,
      entityType: input.entityType,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
