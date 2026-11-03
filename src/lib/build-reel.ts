import { CHARACTERS } from "@server/characters.ts"
import type { Character } from "@server/schemas.ts"

const SPIN_LENGTH = 24

const FIGHTER_IDS: Character[] = CHARACTERS.filter(
  (character) => !("costumeOf" in character),
).map(({ id }) => id)

const pickFighter = (random: () => number, excludedId: Character | null) => {
  const pool = FIGHTER_IDS.filter((id) => id !== excludedId)
  return pool[Math.floor(random() * pool.length)] ?? FIGHTER_IDS[0]
}

export const buildReel = (
  startId: Character | null,
  random: () => number = Math.random,
) => [
  ...(startId ? [startId] : []),
  ...Array.from({ length: SPIN_LENGTH }, () => pickFighter(random, null)),
  pickFighter(random, startId),
]
