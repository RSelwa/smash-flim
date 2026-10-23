import { getEloChange } from "./elo.ts"
import { type PlayedMatch } from "./schemas.ts"

export const replayElo = (
  undoneMatch: PlayedMatch,
  laterMatches: PlayedMatch[],
) => {
  const elos = new Map([
    [undoneMatch.player1Id, undoneMatch.player1EloBefore],
    [undoneMatch.player2Id, undoneMatch.player2EloBefore],
  ])

  const matches = laterMatches.map((match) => {
    const player1EloBefore = elos.get(match.player1Id) ?? match.player1EloBefore
    const player2EloBefore = elos.get(match.player2Id) ?? match.player2EloBefore
    const isPlayer1Winner = match.winnerId === match.player1Id
    const eloChange = isPlayer1Winner
      ? getEloChange(player1EloBefore, player2EloBefore)
      : getEloChange(player2EloBefore, player1EloBefore)
    const player1Delta = isPlayer1Winner ? eloChange : -eloChange
    elos.set(match.player1Id, player1EloBefore + player1Delta)
    elos.set(match.player2Id, player2EloBefore - player1Delta)
    return { id: match.id, player1EloBefore, player2EloBefore, eloChange }
  })

  return { matches, elos }
}
