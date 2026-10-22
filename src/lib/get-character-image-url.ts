import type { Character } from "@server/schemas.ts"

const CHARACTER_IMAGE_DIRECTORY = "/characters"

export const getCharacterImageUrl = (character: Character) =>
  `${CHARACTER_IMAGE_DIRECTORY}/${character}.webp`
