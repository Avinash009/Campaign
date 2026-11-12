import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { ApiError } from "@/lib/errors"
import { logger } from "@/lib/logger"
import { recordAudit } from "@/modules/audit/service"
import { getEmailService } from "@/modules/email"
import { hashPassword } from "./password"
import { emailExists } from "./repository"
import { registerSchema, type RegisterInput } from "./schemas"

/**
 * Owner account registration (docs/API.md §3, Phase 2 task 2.1).
 * Creates the user only — the business is created during onboarding once the
 * owner has provided their business details.
 */

export interface RegisterOwnerResult {
  userId: string
  /** Console email transport reports `false` — nothing is delivered in dev. */
  welcomeEmailDelivered: boolean
}

export async function registerOwner(
  input: RegisterInput,
  meta: { ipAddress?: string } = {},
): Promise<RegisterOwnerResult> {
  const data = registerSchema.parse(input)
  const email = data.email.trim().toLowerCase()
  const name = data.name.trim()

  if (await emailExists(email)) {
    throw ApiError.conflict(
      "email_taken",
      "An account with this email already exists. Try signing in instead.",
    )
  }

  const passwordHash = await hashPassword(data.password)

  let user: { id: string }
  try {
    user = await prisma.user.create({
      data: { name, email, passwordHash },
      select: { id: true },
    })
  } catch (error) {
    // Unique-violation race between the check above and the insert.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw ApiError.conflict(
        "email_taken",
        "An account with this email already exists. Try signing in instead.",
      )
    }
    throw error
  }

  await recordAudit({
    actorId: user.id,
    action: "user.registered",
    entityType: "User",
    entityId: user.id,
    metadata: { email },
    ipAddress: meta.ipAddress,
  })

  // Console transport logs the message and reports delivered: false. We never
  // tell the user an email was sent when it was not.
  const emailResult = await getEmailService().send({
    to: email,
    subject: "Welcome to CampaignHub",
    text: `Hi ${name}, your account is ready. Sign in and add your business details to get started.`,
    templateId: "welcome",
  })

  logger.info("auth.register", {
    userId: user.id,
    welcomeEmailDelivered: emailResult.delivered,
  })

  return { userId: user.id, welcomeEmailDelivered: emailResult.delivered }
}
