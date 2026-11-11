import { describe, expect, it, vi } from "vitest"
import { ConsoleEmailService } from "./index"

describe("ConsoleEmailService", () => {
  it("honestly reports that nothing was delivered", async () => {
    const service = new ConsoleEmailService()
    const result = await service.send({
      to: "owner@example.com",
      subject: "Welcome to CampaignHub",
      text: "Your business profile is ready.",
    })
    expect(result).toEqual({ delivered: false, driver: "console" })
  })

  it("logs the email through the structured logger", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined)
    const service = new ConsoleEmailService()
    await service.send({
      to: "owner@example.com",
      subject: "Welcome to CampaignHub",
      templateId: "team_invite",
    })
    expect(logSpy).toHaveBeenCalled()
    const line = logSpy.mock.calls[0]?.[0] as string
    const entry = JSON.parse(line) as { message: string; context: { to: string; subject: string } }
    expect(entry.message).toBe("email.console_transport")
    expect(entry.context.to).toBe("owner@example.com")
    expect(entry.context.subject).toBe("Welcome to CampaignHub")
  })
})
