import { getElos, type RatedMatch } from "@server/elo.ts"
import { type Player } from "@server/schemas.ts"

type Fighter = Pick<Player, "id" | "elo">

export const getEloStakes = (
  completedMatches: RatedMatch[],
  player: Fighter,
  opponent: Fighter,
) => {
  const playedAt = new Date().toISOString()
  const getEloChangeIfWon = (winnerId: number) => {
    const elos = getElos([
      ...completedMatches,
      { player1Id: player.id, player2Id: opponent.id, winnerId, playedAt },
    ])
    return (elos.get(player.id) ?? player.elo) - player.elo
  }

  return {
    win: getEloChangeIfWon(player.id),
    loss: getEloChangeIfWon(opponent.id),
  }
}
