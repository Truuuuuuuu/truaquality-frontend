import * as React from "react"
import { DeviceCredentialsNotice } from "@/components/devices/device-credentials-notice"
import { PondSelect } from "@/components/devices/pond-select"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useCreateDevice } from "@/hooks/use-ponds"
import { errorMessage, type DeviceCredentials } from "@/lib/api"

type RegisterDeviceDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function RegisterDeviceDialog({
  open,
  onOpenChange,
}: RegisterDeviceDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <RegisterDeviceForm onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}

function RegisterDeviceForm({ onDone }: { onDone: () => void }) {
  const [serial, setSerial] = React.useState("")
  const [hardwareModel, setHardwareModel] = React.useState("")
  const [label, setLabel] = React.useState("")
  const [pondId, setPondId] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [credentials, setCredentials] =
    React.useState<DeviceCredentials | null>(null)
  const createDevice = useCreateDevice()

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    try {
      const result = await createDevice.mutateAsync({
        serial: serial.trim(),
        hardwareModel: hardwareModel.trim() || undefined,
        label: label.trim() || undefined,
        pondId: pondId ?? undefined,
      })
      setCredentials(result.credentials)
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  if (credentials) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>Device registered</DialogTitle>
          <DialogDescription>
            {serial.trim()} can publish readings once it's set up with these
            credentials.
          </DialogDescription>
        </DialogHeader>
        <DeviceCredentialsNotice credentials={credentials} />
        <DialogFooter>
          <Button onClick={onDone}>Done</Button>
        </DialogFooter>
      </>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>Register device</DialogTitle>
        <DialogDescription>
          Add a sensor unit and optionally assign it to a pond. You'll get its
          device credentials on the next step.
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="device-serial">Serial</Label>
        <Input
          id="device-serial"
          required
          maxLength={64}
          placeholder="MAC address or the ID printed on the unit"
          value={serial}
          onChange={(event) => setSerial(event.target.value)}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="device-model">Hardware model</Label>
          <Input
            id="device-model"
            maxLength={80}
            placeholder="ESP32 NodeMCU-32S"
            value={hardwareModel}
            onChange={(event) => setHardwareModel(event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="device-label">Label</Label>
          <Input
            id="device-label"
            maxLength={80}
            placeholder="Optional"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
          />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="device-pond">Pond</Label>
        <PondSelect id="device-pond" value={pondId} onChange={setPondId} />
      </div>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <DialogFooter>
        <Button type="submit" disabled={createDevice.isPending}>
          {createDevice.isPending ? "Registering…" : "Register device"}
        </Button>
      </DialogFooter>
    </form>
  )
}
