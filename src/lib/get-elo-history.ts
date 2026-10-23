import { STARTING_ELO } from "@server/constants.ts"
import type { CompletedMatch, Player } from "@server/schemas.ts"
import { getPlayerDataKey } from "@/lib/get-rank-history"

type EloSnapshot = Record<string, number> & { match: number }

export const getEloHistory = (
  players: Player[],
  newestFirstMatches: CompletedMatch[],
) => {
  const elos = new Map<number, number>()

  return newestFirstMatches.toReversed().map((match, index): EloSnapshot => {
    const player1Delta =
      match.winnerId === match.player1Id ? match.eloChange : -match.eloChange
    elos.set(match.player1Id, match.player1EloBefore + player1Delta)
    elos.set(match.player2Id, match.player2EloBefore - player1Delta)
    const playerElos = players
      .filter(({ createdAt }) => createdAt <= match.playedAt)
      .map(
        ({ id }) =>
          [getPlayerDataKey(id), elos.get(id) ?? STARTING_ELO] as const,
      )
    return { match: index + 1, ...Object.fromEntries(playerElos) }
  })
}
