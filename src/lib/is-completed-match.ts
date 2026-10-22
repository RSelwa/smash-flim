import type { CompletedMatch, Match } from "@server/schemas.ts"

export const isCompletedMatch = (match: Match): match is CompletedMatch =>
  match.winnerId !== null
