const K_FACTOR = 32
const RATING_SCALE = 400

const getExpectedScore = (rating: number, opponentRating: number) =>
  1 / (1 + 10 ** ((opponentRating - rating) / RATING_SCALE))

export const getEloChange = (winnerElo: number, loserElo: number) =>
  Math.round(K_FACTOR * (1 - getExpectedScore(winnerElo, loserElo)))
