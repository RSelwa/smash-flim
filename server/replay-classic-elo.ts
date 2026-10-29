import { STARTING_ELO } from "./constants.ts"
import { getExpectedScore, type RatedMatch } from "./elo.ts"

const K_FACTOR = 32

export const replayClassicElo = (oldestFirstMatches: RatedMatch[]) => {
  const elos = new Map<number, number>()

  return oldestFirstMatches.map(({ player1Id, player2Id, winnerId }) => {
    const player1Elo = elos.get(player1Id) ?? STARTING_ELO
    const player2Elo = elos.get(player2Id) ?? STARTING_ELO
    const [winnerElo, loserElo] =
      winnerId === player1Id
        ? [player1Elo, player2Elo]
        : [player2Elo, player1Elo]
    const eloChange = Math.round(
      K_FACTOR * (1 - getExpectedScore(winnerElo, loserElo)),
    )
    const player1Delta = winnerId === player1Id ? eloChange : -eloChange
    elos.set(player1Id, player1Elo + player1Delta)
    elos.set(player2Id, player2Elo - player1Delta)
    return new Map(elos)
  })
}
