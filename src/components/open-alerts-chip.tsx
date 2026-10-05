import { StatusBadge } from "@/components/status-badge"
import type { Pond } from "@/lib/api"
import { openAlertSummary } from "@/lib/pond-status"

type OpenAlertsChipProps = {
  pond: Pond
  className?: string
}

// "Turbidity alert open" / "2 alerts open" beside a pond's status: an unresolved alert episode the
// card colour (the held verdict) may not show. Renders nothing for archived ponds or when none is open.
export function OpenAlertsChip({ pond, className }: OpenAlertsChipProps) {
  const summary = openAlertSummary(pond)
  if (!summary) return null
  return (
    <span title={summary.spoken} className="inline-flex">
      <StatusBadge status={summary.status} className={className}>
        {summary.text}
      </StatusBadge>
    </span>
  )
}
