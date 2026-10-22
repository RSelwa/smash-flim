import { STARTING_ELO } from "@server/constants.ts"
import type { CompletedMatch, Player } from "@server/schemas.ts"

type RankSnapshot = Record<string, number> & { match: number }

export const getPlayerDataKey = (playerId: number) => `player-${playerId}`

export const getRankHistory = (
  players: Player[],
  newestFirstMatches: CompletedMatch[],
) => {
  const elos = new Map<number, number>()
  const getElo = ({ id }: Player) => elos.get(id) ?? STARTING_ELO

  return newestFirstMatches.toReversed().map((match, index): RankSnapshot => {
    const player1Delta =
      match.winnerId === match.player1Id ? match.eloChange : -match.eloChange
    elos.set(match.player1Id, match.player1EloBefore + player1Delta)
    elos.set(match.player2Id, match.player2EloBefore - player1Delta)
    const ranks = players
      .filter(({ createdAt }) => createdAt <= match.playedAt)
      .toSorted((a, b) => getElo(b) - getElo(a) || a.name.localeCompare(b.name))
      .map(
        ({ id }, rankIndex) => [getPlayerDataKey(id), rankIndex + 1] as const,
      )
    return { match: index + 1, ...Object.fromEntries(ranks) }
  })
}
