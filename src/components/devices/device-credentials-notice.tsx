import * as React from "react"
import { Check, Copy, KeyRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { DeviceCredentials } from "@/lib/api"

export function DeviceCredentialsNotice({
  credentials,
}: {
  credentials: DeviceCredentials
}) {
  const [copied, setCopied] = React.useState(false)
  const snippet = `#define DEVICE_ID "${credentials.deviceId}"\n#define DEVICE_SECRET "${credentials.deviceSecret}"`

  async function handleCopy() {
    await navigator.clipboard.writeText(snippet)
    setCopied(true)
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="flex gap-2 text-sm text-muted-foreground">
        <KeyRound className="mt-0.5 size-4 shrink-0" />
        <span>
          Paste these lines into the unit's <code>include/unit_config.h</code>. The
          secret isn't shown again — if it's lost, rotate it and reflash the
          unit.
        </span>
      </p>
      <div className="flex items-start gap-2 rounded-lg border bg-muted/50 p-2">
        <pre className="min-w-0 flex-1 overflow-x-auto font-heading text-xs whitespace-pre select-all">
          {snippet}
        </pre>
        <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
          {copied ? <Check /> : <Copy />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <p className="text-xs break-all text-muted-foreground">
        Publishes to <code>{credentials.topic}</code>
      </p>
    </div>
  )
}
