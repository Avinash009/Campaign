import type {
  AiFollowUpInput,
  AiFollowUpMessage,
  AiFollowUpPlan,
  AiFollowUpService,
} from "./index"

/**
 * Rule-based follow-up assistant.
 *
 * Drafts messages from the lead's own details. CampaignHub never sends them:
 * the UI offers copy and click-to-contact actions only. The plan is
 * deterministic and labelled as rule-based, not AI prediction.
 */

const DAY_MS = 24 * 60 * 60 * 1000
const OPT_OUT_PATTERN = /\b(do not call|don't call|do not message|don't message|stop messaging|unsubscribe)\b/i

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || "there"
}

function dayDiff(from: Date, to: Date): number {
  return Math.round((from.getTime() - to.getTime()) / DAY_MS)
}

function interestPhrase(interestedIn: string | null | undefined): string {
  return interestedIn?.trim() ? ` about ${interestedIn.trim()}` : ""
}

function priorityFor(
  input: AiFollowUpInput,
  overdueByDays: number | null,
  optedOut: boolean,
): AiFollowUpPlan["priority"] {
  if (optedOut || input.status === "LOST" || input.status === "CONVERTED") return "low"
  if (overdueByDays !== null && overdueByDays > 0) return "high"
  if (input.status === "QUALIFIED") return "high"
  if (input.status === "NEW") {
    const ageDays = dayDiff(input.now ?? new Date(), input.createdAt)
    return ageDays >= 2 ? "high" : "medium"
  }
  if (input.status === "INTERESTED") return "medium"
  return "medium"
}

function nextActionFor(status: AiFollowUpInput["status"]): string {
  switch (status) {
    case "NEW":
      return "Call once and follow up on WhatsApp if there is no answer."
    case "CONTACTED":
      return "Check whether they reviewed the details and ask about the next step."
    case "INTERESTED":
      return "Confirm requirements and offer one specific next step."
    case "QUALIFIED":
      return "Propose a site visit, appointment or written quote with clear timing."
    case "CONVERTED":
      return "Send a short thank-you and check in later."
    case "LOST":
      return "No outreach needed. Re-engage only if the customer contacts you."
    default:
      return "Confirm the next step and the best time to call."
  }
}

function buildMessages(input: AiFollowUpInput): AiFollowUpMessage[] {
  if (input.status === "LOST" || input.status === "CONVERTED") {
    if (input.status === "CONVERTED") {
      const first = firstName(input.leadName)
      return [
        {
          channel: "WHATSAPP",
          label: "Thank-you message",
          body: `Hi ${first}, thank you for choosing ${input.businessName}. If you need anything else${interestPhrase(input.interestedIn)}, just reply here.`,
        },
      ]
    }
    return []
  }

  const first = firstName(input.leadName)
  const interest = interestPhrase(input.interestedIn)
  const business = input.businessName

  const callScript = `Call ${input.leadName}${interest}.
1. Confirm this is a good time to talk.
2. Ask what they need and their timeline.
3. Confirm the next step and book a specific date.
Do not quote prices or promises that are not already in the campaign.`

  const whatsapp = `Hi ${first}, this is ${business}${interest}. Thanks for your enquiry${input.campaignName ? ` about ${input.campaignName}` : ""}. When would be a good time for a quick call?`

  const emailBody = `Hi ${first},

Thank you for your enquiry${interest}. We would like to understand what you need and share the right details.

Could you confirm a convenient time for a short call, or reply with any questions you have?

Regards,
${business}`

  const messages: AiFollowUpMessage[] = [
    { channel: "CALL", label: "Call script", body: callScript },
    { channel: "WHATSAPP", label: "WhatsApp draft", body: whatsapp },
  ]

  if (input.email?.trim()) {
    messages.push({
      channel: "EMAIL",
      label: "Email draft",
      subject: `${business}: your enquiry${interest}`,
      body: emailBody,
    })
  }

  return messages
}

export function suggestFollowUp(input: AiFollowUpInput): AiFollowUpPlan {
  const now = input.now ?? new Date()
  const optedOut = OPT_OUT_PATTERN.test(`${input.message ?? ""}`)
  const overdueByDays = input.nextFollowUpAt
    ? dayDiff(now, input.nextFollowUpAt)
    : null

  const cautions: string[] = []
  if (!input.consentGiven) {
    cautions.push("Consent to be contacted is not recorded. Confirm before calling or messaging.")
  }
  if (optedOut) {
    cautions.push("The customer asked not to be contacted. Do not call or message them.")
  }
  if (input.status === "LOST") {
    cautions.push("The lead is marked lost. Re-engage only if the customer contacts you.")
  }
  if (overdueByDays !== null && overdueByDays > 0) {
    cautions.push(
      `The scheduled follow-up is overdue by ${overdueByDays} day${overdueByDays === 1 ? "" : "s"}.`,
    )
  }

  let summary: string
  if (optedOut) {
    summary = "The customer opted out of contact. Pause outreach."
  } else if (input.status === "LOST") {
    summary = "This lead is marked lost. Do not chase unless they get back in touch."
  } else if (input.status === "CONVERTED") {
    summary = "This lead already converted. A short thank-you is enough."
  } else if (overdueByDays !== null && overdueByDays > 0) {
    summary = `Follow-up is overdue by ${overdueByDays} day${overdueByDays === 1 ? "" : "s"}.`
  } else if (overdueByDays !== null) {
    summary = `Follow-up is scheduled in ${Math.abs(overdueByDays)} day${Math.abs(overdueByDays) === 1 ? "" : "s"}.`
  } else {
    summary = "No follow-up is scheduled yet."
  }

  let suggestedWhen: string
  if (optedOut || input.status === "LOST") {
    suggestedWhen = "Only if the customer contacts you"
  } else if (input.status === "CONVERTED") {
    suggestedWhen = "3–5 days after conversion"
  } else if (overdueByDays !== null && overdueByDays > 0) {
    suggestedWhen = "Today"
  } else if (input.nextFollowUpAt) {
    suggestedWhen = "Keep the scheduled date"
  } else if (input.status === "NEW") {
    suggestedWhen = "Within 24 hours"
  } else {
    suggestedWhen = "Within 2 days"
  }

  return {
    priority: priorityFor(input, overdueByDays, optedOut),
    summary,
    nextAction: optedOut ? "Pause outreach and record the opt-out." : nextActionFor(input.status),
    suggestedWhen,
    messages: optedOut ? [] : buildMessages(input),
    cautions,
  }
}

/** Service wrapper matching the module contract. */
export class RuleBasedFollowUpService implements AiFollowUpService {
  suggestFollowUp(input: AiFollowUpInput): AiFollowUpPlan {
    return suggestFollowUp(input)
  }
}
