"use client"

import { useEffect, useRef } from "react"
import {
  VISITOR_COOKIE,
  VISITOR_COOKIE_MAX_AGE,
  isValidVisitorId,
} from "@/lib/visitor"

interface CampaignViewTrackerProps {
  campaignSlug: string
}

function readVisitorCookie(): string | null {
  const prefix = `${VISITOR_COOKIE}=`
  const entry = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix))
  if (!entry) return null
  const value = decodeURIComponent(entry.slice(prefix.length))
  return isValidVisitorId(value) ? value : null
}

function createVisitorId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID()
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")
}

function getVisitorId(): string {
  const existing = readVisitorCookie()
  if (existing) return existing

  const id = createVisitorId()
  document.cookie = `${VISITOR_COOKIE}=${encodeURIComponent(id)}; path=/; max-age=${VISITOR_COOKIE_MAX_AGE}; SameSite=Lax`
  return id
}

function utmFromLocation() {
  const params = new URLSearchParams(window.location.search)
  const value = (key: string) => {
    const raw = params.get(key)?.trim()
    return raw ? raw.slice(0, 160) : undefined
  }
  return {
    utmSource: value("utm_source"),
    utmMedium: value("utm_medium"),
    utmCampaign: value("utm_campaign"),
    utmTerm: value("utm_term"),
    utmContent: value("utm_content"),
  }
}

/**
 * Sends one first-party page-view beacon per visit. It respects Do Not Track
 * and Global Privacy Control, and silently does nothing when the browser blocks
 * storage or the request fails — analytics must never break the landing page.
 */
export function CampaignViewTracker({ campaignSlug }: CampaignViewTrackerProps) {
  const sent = useRef(false)

  useEffect(() => {
    if (sent.current) return
    sent.current = true

    const navigatorWithGpc = navigator as Navigator & { globalPrivacyControl?: boolean }
    if (navigator.doNotTrack === "1" || navigatorWithGpc.globalPrivacyControl === true) {
      return
    }

    let visitorId: string
    try {
      visitorId = getVisitorId()
    } catch {
      return
    }

    const payload = {
      type: "PAGE_VIEW",
      visitorId,
      referrer: document.referrer || undefined,
      ...utmFromLocation(),
    }

    void fetch(`/api/public/campaigns/${encodeURIComponent(campaignSlug)}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => undefined)
  }, [campaignSlug])

  return null
}
