import { type FormEvent, useId, useState } from "react"
import { PLAYER_NAME_MAX_LENGTH } from "@server/constants.ts"
import type { Player, PlayerInput } from "@server/schemas.ts"
import { CharacterPicker } from "@/components/character-picker"
import { Button } from "@/components/ui/button"
import { DialogFooter } from "@/components/ui/dialog"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

type PlayerFormProps = {
  initialPlayer?: Pick<Player, "name" | "character">
  submitLabel: string
  isPending: boolean
  onSubmit: (player: PlayerInput) => void
}

export const PlayerForm = ({
  initialPlayer,
  submitLabel,
  isPending,
  onSubmit,
}: PlayerFormProps) => {
  const nameId = useId()
  const [name, setName] = useState(initialPlayer?.name ?? "")
  const [character, setCharacter] = useState(initialPlayer?.character ?? null)

  const canSubmit = character !== null && !isPending

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (character) onSubmit({ name, character })
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <Field>
        <FieldLabel htmlFor={nameId}>Name</FieldLabel>
        <Input
          id={nameId}
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={PLAYER_NAME_MAX_LENGTH}
          autoComplete="off"
          required
        />
      </Field>
      <CharacterPicker value={character} onValueChange={setCharacter} />
      <DialogFooter>
        <Button type="submit" disabled={!canSubmit}>
          {submitLabel}
        </Button>
      </DialogFooter>
    </form>
  )
}
