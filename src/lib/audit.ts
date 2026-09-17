import type { AuditEntry } from "@/lib/api"

// The actions the backend writes today, in the order they're offered as a filter. The log also holds
// history the code no longer produces — `office.create` and `user.promote_super_admin` from before the
// single-org refactor — which is why nothing here filters unknown actions out: they are the record, and
// an action with no entry below still renders, using its raw string.
const ACTION_LABELS: Record<string, string> = {
  "user.invite": "User invited",
  "user.resend_invite": "Invite resent",
  "user.enable": "User enabled",
  "user.disable": "User disabled",
  "user.promote_admin": "Promoted to admin",
  "user.delete_self": "Account deleted by its owner",
  "pond.create": "Pond created",
  "pond.update": "Pond updated",
  "pond.archive": "Pond archived",
  "pond.restore": "Pond restored",
  "device.register": "Device registered",
  "device.update": "Device updated",
  "device.assign": "Device assigned to pond",
  "device.unassign": "Device unassigned",
  "device.enable": "Device enabled",
  "device.disable": "Device disabled",
  "device.rotate_secret": "Device secret rotated",
}

// Falls back to the raw action so a historical or newly-added one is still readable rather than blank.
export function auditActionLabel(action: string) {
  return ACTION_LABELS[action] ?? action
}

export const AUDIT_TARGET_OPTIONS = [
  { value: "ALL", label: "All areas" },
  { value: "profile", label: "Users" },
  { value: "pond", label: "Ponds" },
  { value: "device", label: "Devices" },
] as const

export type AuditTargetFilter = (typeof AUDIT_TARGET_OPTIONS)[number]["value"]

export const AUDIT_ACTION_OPTIONS = [
  { value: "ALL", label: "All actions" },
  ...Object.keys(ACTION_LABELS).map((action) => ({
    value: action,
    label: ACTION_LABELS[action],
  })),
] as const satisfies readonly { value: string; label: string }[]

// Who did it. An actor whose profile is gone (or an action the system took itself) has no name left,
// so the raw id stands in rather than the row being dropped or silently attributed to nobody.
export function auditActorLabel(entry: AuditEntry) {
  if (entry.actor) return entry.actor.fullName
  if (entry.actorId) return `Deleted user (${entry.actorId.slice(0, 8)}…)`
  return "System"
}

// The interesting fields of an entry's metadata, flattened to "key: value" for a compact cell.
// Values that are themselves objects/arrays are JSON-stringified rather than rendered as "[object Object]".
export function auditMetadataPairs(
  metadata: Record<string, unknown> | null
): { key: string; value: string }[] {
  if (!metadata) return []
  return Object.entries(metadata)
    .filter(
      ([, value]) => value !== null && value !== undefined && value !== ""
    )
    .map(([key, value]) => ({
      key,
      value: typeof value === "object" ? JSON.stringify(value) : String(value),
    }))
}
