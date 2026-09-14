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
import { useRotateDeviceSecret, useUpdateDevice } from "@/hooks/use-ponds"
import { errorMessage, type Device, type DeviceCredentials } from "@/lib/api"

type ManageDeviceDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  device: Device | null
}

export function ManageDeviceDialog({
  open,
  onOpenChange,
  device,
}: ManageDeviceDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {device ? (
          <ManageDeviceForm
            key={device.id}
            device={device}
            onDone={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function ManageDeviceForm({
  device,
  onDone,
}: {
  device: Device
  onDone: () => void
}) {
  const [label, setLabel] = React.useState(device.label ?? "")
  const [hardwareModel, setHardwareModel] = React.useState(
    device.hardwareModel ?? ""
  )
  const [pondId, setPondId] = React.useState(device.pondId)
  const [error, setError] = React.useState<string | null>(null)
  const [confirmingRotate, setConfirmingRotate] = React.useState(false)
  const [credentials, setCredentials] =
    React.useState<DeviceCredentials | null>(null)
  const updateDevice = useUpdateDevice()
  const rotateSecret = useRotateDeviceSecret()
  const isPending = updateDevice.isPending || rotateSecret.isPending

  async function run(action: () => Promise<unknown>) {
    setError(null)
    try {
      await action()
      return true
    } catch (err) {
      setError(errorMessage(err))
      return false
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const saved = await run(() =>
      updateDevice.mutateAsync({
        id: device.id,
        label: label.trim() || null,
        hardwareModel: hardwareModel.trim() || null,
        pondId,
      })
    )
    if (saved) onDone()
  }

  async function handleToggleStatus() {
    const saved = await run(() =>
      updateDevice.mutateAsync({
        id: device.id,
        status: device.status === "ACTIVE" ? "DISABLED" : "ACTIVE",
      })
    )
    if (saved) onDone()
  }

  async function handleRotate() {
    await run(async () => {
      const result = await rotateSecret.mutateAsync(device.id)
      setCredentials(result.credentials)
    })
    setConfirmingRotate(false)
  }

  if (credentials) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>New secret for {device.serial}</DialogTitle>
          <DialogDescription>
            The old secret has stopped working. The unit won't be heard from
            until it's reflashed with this one.
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
        <DialogTitle>{device.serial}</DialogTitle>
        <DialogDescription>
          Secret version {device.secretVersion} · firmware{" "}
          {device.firmwareVersion ?? "unknown"}
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="manage-device-pond">Pond</Label>
        <PondSelect
          id="manage-device-pond"
          value={pondId}
          onChange={setPondId}
          currentPondId={device.pondId}
        />
        <p className="text-xs text-muted-foreground">
          Readings already recorded stay with the pond they were measured in.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="manage-device-model">Hardware model</Label>
          <Input
            id="manage-device-model"
            maxLength={80}
            value={hardwareModel}
            onChange={(event) => setHardwareModel(event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="manage-device-label">Label</Label>
          <Input
            id="manage-device-label"
            maxLength={80}
            value={label}
            onChange={(event) => setLabel(event.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2 rounded-lg border p-3">
        {confirmingRotate ? (
          <>
            <p className="text-sm">
              Rotating invalidates the current secret immediately. The unit
              stays offline until it's reflashed with the new one.
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={isPending}
                onClick={handleRotate}
              >
                Rotate secret
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setConfirmingRotate(false)}
              >
                Cancel
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() => setConfirmingRotate(true)}
            >
              Rotate secret…
            </Button>
            <Button
              type="button"
              variant={device.status === "ACTIVE" ? "destructive" : "outline"}
              size="sm"
              disabled={isPending}
              onClick={handleToggleStatus}
            >
              {device.status === "ACTIVE" ? "Disable device" : "Enable device"}
            </Button>
          </div>
        )}
      </div>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <DialogFooter>
        <Button type="submit" disabled={isPending}>
          {updateDevice.isPending ? "Saving…" : "Save changes"}
        </Button>
      </DialogFooter>
    </form>
  )
}
