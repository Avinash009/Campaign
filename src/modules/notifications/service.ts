import type { NotificationType, Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"

/**
 * In-app notifications. Phase 2 uses them for team invitations/acceptance;
 * later phases add lead-created and campaign events.
 */

export interface CreateNotificationInput {
  userId: string
  businessId?: string | null
  type: NotificationType
  title: string
  body?: string
  linkUrl?: string
}

export async function createNotification(input: CreateNotificationInput): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        userId: input.userId,
        businessId: input.businessId ?? null,
        type: input.type,
        title: input.title,
        body: input.body ?? null,
        linkUrl: input.linkUrl ?? null,
      },
    })
  } catch (error) {
    logger.error("notification.create_failed", {
      userId: input.userId,
      type: input.type,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

/** Notifies every active OWNER/ADMIN of a business except `exceptUserId`. */
export async function notifyManagers(
  businessId: string,
  input: Omit<CreateNotificationInput, "userId" | "businessId"> & { exceptUserId?: string },
): Promise<void> {
  const managers = await prisma.businessMember.findMany({
    where: {
      businessId,
      status: "ACTIVE",
      role: { in: ["OWNER", "ADMIN"] },
      userId: { not: null },
    },
    select: { userId: true },
  })

  await Promise.all(
    managers
      .map((member) => member.userId)
      .filter((userId): userId is string => Boolean(userId) && userId !== input.exceptUserId)
      .map((userId) =>
        createNotification({
          userId,
          businessId,
          type: input.type,
          title: input.title,
          body: input.body,
          linkUrl: input.linkUrl,
        }),
      ),
  )
}

export interface NotificationSummary {
  id: string
  type: NotificationType
  title: string
  body: string | null
  linkUrl: string | null
  isRead: boolean
  createdAt: Date
}

export async function listNotifications(userId: string, take = 20): Promise<NotificationSummary[]> {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      type: true,
      title: true,
      body: true,
      linkUrl: true,
      isRead: true,
      createdAt: true,
    },
  })
}

export async function markNotificationRead(userId: string, notificationId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { isRead: true, readAt: new Date() },
  })
}

export type NotificationCreateManyInput = Prisma.NotificationCreateManyInput
