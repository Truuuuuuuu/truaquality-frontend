import * as React from "react"
import { Check, Copy, KeyRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { DeviceCredentials } from "@/lib/api"

function CredentialRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = React.useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(value)
    setCopied(true)
  }

  return (
    <div className="flex items-start gap-2 rounded-lg border bg-muted/50 p-2">
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate font-heading text-xs select-all">{value}</p>
      </div>
      <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
        {copied ? <Check /> : <Copy />}
        {copied ? "Copied" : "Copy"}
      </Button>
    </div>
  )
}

export function DeviceCredentialsNotice({
  credentials,
}: {
  credentials: DeviceCredentials
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="flex gap-2 text-sm text-muted-foreground">
        <KeyRound className="mt-0.5 size-4 shrink-0" />
        <span>
          Enter these on the unit's setup page: hold its BOOT button for 5
          seconds, then join the <code>TruAquality-XXXX</code> WiFi network it
          opens. The secret isn't shown again — if it's lost, rotate it and
          enter the new one on the unit.
        </span>
      </p>
      <div className="flex flex-col gap-2">
        <CredentialRow label="Device ID" value={credentials.deviceId} />
        <CredentialRow label="Device secret" value={credentials.deviceSecret} />
      </div>
      <p className="text-xs break-all text-muted-foreground">
        Publishes to <code>{credentials.topic}</code>
      </p>
    </div>
  )
}
