import { useState } from "react"
import { RadioGroup } from "radix-ui"
import { CHARACTERS } from "@server/characters.ts"
import type { Character } from "@server/schemas.ts"
import { Input } from "@/components/ui/input"
import { getCharacterImageUrl } from "@/lib/get-character-image-url"

type CharacterPickerProps = {
  value: Character | null
  onValueChange: (character: Character) => void
}

export const CharacterPicker = ({
  value,
  onValueChange,
}: CharacterPickerProps) => {
  const [search, setSearch] = useState("")
  const normalizedSearch = search.trim().toLowerCase()
  const characters = CHARACTERS.filter(({ name }) =>
    name.toLowerCase().includes(normalizedSearch),
  )

  const handleValueChange = (id: string) => {
    const selected = CHARACTERS.find((character) => character.id === id)
    if (selected) onValueChange(selected.id)
  }

  return (
    <div className="grid gap-2">
      <Input
        type="search"
        placeholder="Search a character"
        aria-label="Search a character"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      <RadioGroup.Root
        aria-label="Character"
        value={value ?? ""}
        onValueChange={handleValueChange}
        className="grid max-h-72 grid-cols-4 gap-2 overflow-y-auto p-1 sm:grid-cols-6"
      >
        {characters.map(({ id, name }) => (
          <RadioGroup.Item
            key={id}
            value={id}
            title={name}
            className="grid gap-1 rounded-lg p-1 text-center outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 data-[state=checked]:bg-primary/10 data-[state=checked]:ring-2 data-[state=checked]:ring-primary"
          >
            <img
              src={getCharacterImageUrl(id)}
              alt=""
              loading="lazy"
              className="aspect-square w-full rounded-md object-cover"
            />
            <span className="truncate text-[0.65rem] leading-tight">
              {name}
            </span>
          </RadioGroup.Item>
        ))}
      </RadioGroup.Root>
      {characters.length === 0 && (
        <p className="text-center text-sm text-muted-foreground">
          No character matches “{search}”.
        </p>
      )}
    </div>
  )
}
