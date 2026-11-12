import type { Metadata } from "next"
import { Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { InviteMemberForm } from "@/components/dashboard/invite-member-form"
import { requireBusinessContext } from "@/modules/auth/session"
import { canManageTeam } from "@/modules/auth/rbac"
import { getTeamOverview, type TeamMember } from "@/modules/business/service"
import { formatDate, formatDateTime } from "@/lib/format"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Team",
}

const ROLE_LABELS: Record<TeamMember["role"], string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  MEMBER: "Member",
}

const STATUS_STYLES: Record<TeamMember["status"], string> = {
  ACTIVE: "bg-emerald-500/10 text-emerald-700",
  INVITED: "bg-amber-500/10 text-amber-700",
  REVOKED: "bg-secondary text-secondary-foreground",
}

const STATUS_LABELS: Record<TeamMember["status"], string> = {
  ACTIVE: "Active",
  INVITED: "Invited",
  REVOKED: "Revoked",
}

/** Team list + invitations (Phase 2 task 2.5). */
export default async function TeamPage() {
  const context = await requireBusinessContext()
  const overview = await getTeamOverview(context.businessId)

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Team</h1>
        <p className="text-sm text-muted-foreground">
          People who can sign in to {context.businessName} and work its campaigns and
          leads.
        </p>
      </div>

      <InviteMemberForm
        canInvite={canManageTeam(context.role)}
        seatLimit={overview.seatLimit}
        seatsUsed={overview.seatsUsed}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="size-5 text-primary" aria-hidden /> Members
          </CardTitle>
          <CardDescription>
            {overview.seatsUsed} of {overview.seatLimit ?? "unlimited"} seats used
            {overview.planName ? ` on the ${overview.planName} plan` : ""}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Joined / invited</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {overview.members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="min-w-0 space-y-0.5">
                      <p className="truncate text-sm font-medium">{member.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{ROLE_LABELS[member.role]}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={STATUS_STYLES[member.status]}>
                      {STATUS_LABELS[member.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">
                    {member.status === "INVITED" && member.invitationExpiresAt
                      ? `Expires ${formatDateTime(member.invitationExpiresAt)}`
                      : member.joinedAt
                        ? formatDate(member.joinedAt)
                        : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Invitations cannot grant ownership. Ownership stays with the business creator.
      </p>
    </div>
  )
}
