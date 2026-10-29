import { STARTING_ELO } from "@server/constants.ts"
import { type RatedMatch } from "@server/elo.ts"
import type { CompletedMatch, Player } from "@server/schemas.ts"
import { getPlayerDataKey } from "@/lib/get-rank-history"

export type EloSnapshot = Record<string, number> & { match: number }

export const getEloHistory = (
  players: Player[],
  newestFirstMatches: CompletedMatch[],
  replay: (oldestFirstMatches: RatedMatch[]) => Map<number, number>[],
) => {
  const oldestFirstMatches = newestFirstMatches.toReversed()
  const elosAfterEachMatch = replay(oldestFirstMatches)

  return oldestFirstMatches.map((match, index): EloSnapshot => {
    const elos = elosAfterEachMatch[index]
    const playerElos = players
      .filter(({ createdAt }) => createdAt <= match.playedAt)
      .map(
        ({ id }) =>
          [getPlayerDataKey(id), elos.get(id) ?? STARTING_ELO] as const,
      )
    return { match: index + 1, ...Object.fromEntries(playerElos) }
  })
}
