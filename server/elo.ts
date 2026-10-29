import { STARTING_ELO } from "./constants.ts"
import { type PlayedMatch } from "./schemas.ts"

const RATING_SCALE = 400
const RATING_SPREAD = 250
const HALF_LIFE_DAYS = 60
const DAY_IN_MS = 86_400_000
const MAX_ITERATIONS = 50
const CONVERGED_STEP = 0.01
const LOG_SCALE = Math.log(10) / RATING_SCALE
const PRIOR_PRECISION = 1 / RATING_SPREAD ** 2

export type RatedMatch = Omit<PlayedMatch, "id">

export const getExpectedScore = (rating: number, opponentRating: number) =>
  1 / (1 + 10 ** ((opponentRating - rating) / RATING_SCALE))

const solveLinearSystem = (matrix: number[][], vector: number[]) => {
  const size = vector.length
  for (let pivot = 0; pivot < size; pivot++) {
    for (let row = pivot + 1; row < size; row++) {
      const factor = matrix[row][pivot] / matrix[pivot][pivot]
      for (let column = pivot; column < size; column++) {
        matrix[row][column] -= factor * matrix[pivot][column]
      }
      vector[row] -= factor * vector[pivot]
    }
  }

  const solution = vector.map(() => 0)
  for (let row = size - 1; row >= 0; row--) {
    const solvedPart = solution.reduce(
      (sum, value, column) => sum + matrix[row][column] * value,
      0,
    )
    solution[row] = (vector[row] - solvedPart) / matrix[row][row]
  }
  return solution
}

export const getElos = (matches: RatedMatch[]) => {
  const playerIds = [
    ...new Set(
      matches.flatMap(({ player1Id, player2Id }) => [player1Id, player2Id]),
    ),
  ]
  const latestPlayedAt = Math.max(
    ...matches.map(({ playedAt }) => Date.parse(playedAt)),
  )
  const games = matches.map(({ player1Id, player2Id, winnerId, playedAt }) => {
    const loserId = winnerId === player1Id ? player2Id : player1Id
    const ageInDays = (latestPlayedAt - Date.parse(playedAt)) / DAY_IN_MS
    return {
      winner: playerIds.indexOf(winnerId),
      loser: playerIds.indexOf(loserId),
      weight: 0.5 ** (ageInDays / HALF_LIFE_DAYS),
    }
  })

  const elos = playerIds.map(() => STARTING_ELO)
  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    const gradient = elos.map((elo) => (STARTING_ELO - elo) * PRIOR_PRECISION)
    const curvature = playerIds.map((_, row) =>
      playerIds.map((_, column) => (row === column ? PRIOR_PRECISION : 0)),
    )
    games.forEach(({ winner, loser, weight }) => {
      const surprise = 1 - getExpectedScore(elos[winner], elos[loser])
      const pull = weight * LOG_SCALE * surprise
      const information = weight * LOG_SCALE ** 2 * surprise * (1 - surprise)
      gradient[winner] += pull
      gradient[loser] -= pull
      curvature[winner][winner] += information
      curvature[loser][loser] += information
      curvature[winner][loser] -= information
      curvature[loser][winner] -= information
    })

    const steps = solveLinearSystem(curvature, gradient)
    steps.forEach((step, index) => {
      elos[index] += step
    })
    const isConverged = steps.every((step) => Math.abs(step) < CONVERGED_STEP)
    if (isConverged) break
  }

  return new Map(
    playerIds.map((playerId, index) => [playerId, Math.round(elos[index])]),
  )
}
