import { getElos, type RatedMatch } from "./elo.ts"

export const replayElo = (oldestFirstMatches: RatedMatch[]) =>
  oldestFirstMatches.map((_, index) =>
    getElos(oldestFirstMatches.slice(0, index + 1)),
  )
