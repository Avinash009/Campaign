import { prisma } from "@/lib/prisma"

/** Look up a user by email including their active business memberships. */
export async function getUserWithMemberships(email: string) {
  return prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: {
      memberships: {
        where: { status: "ACTIVE" },
        select: { businessId: true, role: true },
      },
    },
  })
}

/** Record the last successful login (best-effort — never blocks login). */
export async function touchLastLogin(userId: string): Promise<void> {
  await prisma.user
    .update({ where: { id: userId }, data: { lastLoginAt: new Date() } })
    .catch(() => undefined)
}

/** Whether an account already exists for this email (case-insensitive). */
export async function emailExists(email: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { id: true },
  })
  return Boolean(user)
}
