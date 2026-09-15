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
import { useCreatePond, useUpdatePond } from "@/hooks/use-ponds"
import { errorMessage, type Pond } from "@/lib/api"

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
    void run(() =>
      pond
        ? updatePond.mutateAsync({
            id: pond.id,
            name: name.trim(),
            notes: notes.trim() || null,
          })
        : createPond.mutateAsync({
            name: name.trim(),
            notes: notes.trim() || undefined,
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
            : "Register a pond so a monitoring device can be assigned to it."}
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
          Optional — location, species, size
        </p>
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
