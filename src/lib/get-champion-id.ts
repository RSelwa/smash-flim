import type { BracketNode } from "@server/bracket.ts"

export const getChampionId = (rounds: BracketNode[][]) =>
  rounds.at(-1)?.[0]?.winnerId ?? null
