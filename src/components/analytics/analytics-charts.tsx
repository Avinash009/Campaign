"use client"

import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { LEAD_STATUS_LABELS } from "@/modules/leads/labels"
import type {
  CampaignPerformanceRow,
  LeadStatusRow,
  PerformancePoint,
} from "@/modules/analytics/types"

/**
 * Recharts wrappers (Phase 5). Presentational only: all numbers are computed on
 * the server and passed in, so the charts can never invent activity.
 */

const AXIS = { fontSize: 12, fill: "var(--muted-foreground)" }

const TOOLTIP_STYLE = {
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--card)",
  color: "var(--card-foreground)",
  fontSize: 12,
}

/** Page views + unique visitors (left axis) and enquiries (right axis). */
export function PerformanceChart({ data }: { data: PerformancePoint[] }) {
  return (
    <div
      className="h-72 w-full"
      role="img"
      aria-label="Page views, unique visitors and enquiries over time"
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -12 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="label"
            tick={AXIS}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            minTickGap={24}
          />
          <YAxis
            yAxisId="views"
            tick={AXIS}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            width={40}
          />
          <YAxis
            yAxisId="leads"
            orientation="right"
            tick={AXIS}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            width={32}
          />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Area
            yAxisId="views"
            type="monotone"
            dataKey="pageViews"
            name="Page views"
            stroke="var(--chart-1)"
            fill="var(--chart-1)"
            fillOpacity={0.12}
            strokeWidth={2}
          />
          <Line
            yAxisId="views"
            type="monotone"
            dataKey="visitors"
            name="Unique visitors"
            stroke="var(--chart-2)"
            strokeWidth={2}
            dot={false}
          />
          <Line
            yAxisId="leads"
            type="monotone"
            dataKey="leads"
            name="Enquiries"
            stroke="var(--chart-3)"
            strokeWidth={2}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Campaign-wise enquiry comparison (top eight by selected window). */
export function CampaignComparisonChart({ data }: { data: CampaignPerformanceRow[] }) {
  const rows = data
    .filter((row) => row.pageViews > 0 || row.leads > 0)
    .slice(0, 8)
    .map((row) => ({ name: row.name, leads: row.leads }))

  return (
    <div className="h-72 w-full" role="img" aria-label="Enquiries by campaign">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={rows}
          layout="vertical"
          margin={{ top: 8, right: 16, bottom: 0, left: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
          <XAxis
            type="number"
            allowDecimals={false}
            tick={AXIS}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={132}
            tick={AXIS}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Bar dataKey="leads" name="Enquiries" fill="var(--chart-1)" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Campaign-wise conversion rate — only campaigns that tracked visits. */
export function CampaignConversionChart({ data }: { data: CampaignPerformanceRow[] }) {
  const rows = data
    .filter((row) => row.conversionRate !== null)
    .slice(0, 8)
    .map((row) => ({ name: row.name, rate: row.conversionRate ?? 0 }))

  return (
    <div className="h-72 w-full" role="img" aria-label="Conversion rate by campaign">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={rows}
          layout="vertical"
          margin={{ top: 8, right: 24, bottom: 0, left: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
          <XAxis
            type="number"
            unit="%"
            tick={AXIS}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={132}
            tick={AXIS}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(value) => [`${Number(value).toFixed(1)}%`, "Conversion"]}
          />
          <Bar dataKey="rate" name="Conversion" fill="var(--chart-3)" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Current lead pipeline split — current status of enquiries received in the window. */
export function LeadStatusChart({ data }: { data: LeadStatusRow[] }) {
  const rows = data.map((row) => ({
    name: LEAD_STATUS_LABELS[row.status],
    count: row.count,
  }))

  return (
    <div className="h-72 w-full" role="img" aria-label="Enquiries by current status">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="name"
            tick={AXIS}
            tickLine={false}
            axisLine={false}
            interval={0}
          />
          <YAxis
            allowDecimals={false}
            tick={AXIS}
            tickLine={false}
            axisLine={false}
            width={32}
          />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Bar dataKey="count" name="Enquiries" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
