import * as React from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { FloatingLabelInput } from "@/components/ui/floating-input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useCreatePond, useUpdatePond } from "@/hooks/use-ponds"
import { errorMessage, type Pond, type PondType } from "@/lib/api"
import { POND_TYPES } from "@/lib/pond-types"

const UNSET_POND_TYPE = "unset"

type PondFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  // null creates a new pond.
  pond: Pond | null
}

export function PondFormDialog({
  open,
  onOpenChange,
  pond,
}: PondFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <PondForm
          key={pond?.id ?? "new"}
          pond={pond}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}

function PondForm({ pond, onDone }: { pond: Pond | null; onDone: () => void }) {
  const [name, setName] = React.useState(pond?.name ?? "")
  const [notes, setNotes] = React.useState(pond?.notes ?? "")
  const [fishSpecies, setFishSpecies] = React.useState(pond?.fishSpecies ?? "")
  const [pondType, setPondType] = React.useState<
    PondType | typeof UNSET_POND_TYPE
  >(pond?.pondType ?? UNSET_POND_TYPE)
  const [error, setError] = React.useState<string | null>(null)
  const createPond = useCreatePond()
  const updatePond = useUpdatePond()
  const isPending = createPond.isPending || updatePond.isPending

  async function run(action: () => Promise<unknown>) {
    setError(null)
    try {
      await action()
      onDone()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const resolvedPondType = pondType === UNSET_POND_TYPE ? null : pondType
    void run(() =>
      pond
        ? updatePond.mutateAsync({
            id: pond.id,
            name: name.trim(),
            notes: notes.trim() || null,
            fishSpecies: fishSpecies.trim() || null,
            pondType: resolvedPondType,
          })
        : createPond.mutateAsync({
            name: name.trim(),
            notes: notes.trim() || undefined,
            fishSpecies: fishSpecies.trim() || undefined,
            pondType: resolvedPondType ?? undefined,
          })
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>{pond ? "Edit pond" : "Add pond"}</DialogTitle>
        <DialogDescription>
          {pond
            ? "Rename the pond, update its notes, or archive it."
            : "Register a pond so a monitoring device can be assigned to it. Fish species and pond type can be added now or later."}
        </DialogDescription>
      </DialogHeader>

      <FloatingLabelInput
        id="pond-name"
        label="Name"
        required
        maxLength={80}
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      <div className="flex flex-col gap-1.5">
        <FloatingLabelInput
          id="pond-notes"
          label="Notes"
          maxLength={500}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
        <p className="px-0.5 text-xs text-muted-foreground">
          Optional — location, size
        </p>
      </div>

      <FloatingLabelInput
        id="pond-fish-species"
        label="Fish species"
        maxLength={120}
        value={fishSpecies}
        onChange={(event) => setFishSpecies(event.target.value)}
      />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="pond-type">Pond type</Label>
        <Select
          items={[{ value: UNSET_POND_TYPE, label: "Not set" }, ...POND_TYPES]}
          value={pondType}
          onValueChange={(next) =>
            setPondType(
              (next as PondType | typeof UNSET_POND_TYPE) ?? UNSET_POND_TYPE
            )
          }
        >
          <SelectTrigger id="pond-type" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={UNSET_POND_TYPE}>Not set</SelectItem>
            {POND_TYPES.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <DialogFooter>
        {pond ? (
          <Button
            type="button"
            variant={pond.status === "ACTIVE" ? "destructive" : "outline"}
            disabled={isPending}
            className="sm:mr-auto"
            onClick={() =>
              void run(() =>
                updatePond.mutateAsync({
                  id: pond.id,
                  status: pond.status === "ACTIVE" ? "ARCHIVED" : "ACTIVE",
                })
              )
            }
          >
            {pond.status === "ACTIVE" ? "Archive pond" : "Restore pond"}
          </Button>
        ) : null}
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : pond ? "Save changes" : "Add pond"}
        </Button>
      </DialogFooter>
    </form>
  )
}
