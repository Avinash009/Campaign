import { getEnv } from "@/lib/env"
import { logger } from "@/lib/logger"

/**
 * Email service abstraction.
 * Development uses the console transport which LOGS emails and reports
 * `delivered: false` — nothing pretends to be sent. A real provider
 * (SMTP/Resend/SES) plugs in behind the same interface in a later phase.
 */

export interface EmailMessage {
  to: string
  subject: string
  text?: string
  html?: string
  /** Logical template id for future branded templates (e.g. "team_invite"). */
  templateId?: string
  data?: Record<string, unknown>
}

export interface EmailSendResult {
  delivered: boolean
  driver: string
}

export interface EmailService {
  readonly driver: string
  send(message: EmailMessage): Promise<EmailSendResult>
}

export class ConsoleEmailService implements EmailService {
  readonly driver = "console"

  async send(message: EmailMessage): Promise<EmailSendResult> {
    logger.info("email.console_transport", {
      to: message.to,
      subject: message.subject,
      templateId: message.templateId,
      bodyPreview: message.text?.slice(0, 200),
    })
    return { delivered: false, driver: this.driver }
  }
}

export function getEmailService(): EmailService {
  const env = getEnv()
  switch (env.EMAIL_DRIVER) {
    case "console":
      return new ConsoleEmailService()
    default:
      // Future: "smtp" | "resend" …
      return new ConsoleEmailService()
  }
}
