const TOP_SEED_COUNT = 2

export type BracketMatch = {
  id: number
  round: number
  position: number
  winnerId: number | null
}

export type BracketNode = {
  round: number
  position: number
  matchId: number | null
  player1Id: number | null
  player2Id: number | null
  winnerId: number | null
}

const getBracketSize = (playerCount: number) =>
  2 ** Math.ceil(Math.log2(playerCount))

const getSeedBySlot = (bracketSize: number): number[] => {
  if (bracketSize === 1) return [1]
  return getSeedBySlot(bracketSize / 2).flatMap((seed) => [
    seed,
    bracketSize + 1 - seed,
  ])
}

const shuffle = (playerIds: number[]) =>
  playerIds
    .map((playerId) => ({ playerId, sortKey: Math.random() }))
    .toSorted((a, b) => a.sortKey - b.sortKey)
    .map(({ playerId }) => playerId)

export const drawBracket = (rankedPlayerIds: number[]) => {
  const bracketSize = getBracketSize(rankedPlayerIds.length)
  const byeCount = bracketSize - rankedPlayerIds.length
  const seededCount = Math.max(byeCount, TOP_SEED_COUNT)
  const playerIdsBySeed = [
    ...rankedPlayerIds.slice(0, seededCount),
    ...shuffle(rankedPlayerIds.slice(seededCount)),
  ]
  return getSeedBySlot(bracketSize).map(
    (seed) => playerIdsBySeed[seed - 1] ?? null,
  )
}

export const getBracketRounds = (
  entrantIds: (number | null)[],
  matches: BracketMatch[],
  round = 0,
): BracketNode[][] => {
  if (entrantIds.length < 2) return []

  const nodes = Array.from(
    { length: entrantIds.length / 2 },
    (_, position): BracketNode => {
      const player1Id = entrantIds[position * 2] ?? null
      const player2Id = entrantIds[position * 2 + 1] ?? null
      const match = matches.find(
        (bracketMatch) =>
          bracketMatch.round === round && bracketMatch.position === position,
      )
      const isBye = round === 0 && (player1Id === null || player2Id === null)
      return {
        round,
        position,
        matchId: match?.id ?? null,
        player1Id,
        player2Id,
        winnerId: isBye ? (player1Id ?? player2Id) : (match?.winnerId ?? null),
      }
    },
  )
  const nextEntrantIds = nodes.map(({ winnerId }) => winnerId)
  return [nodes, ...getBracketRounds(nextEntrantIds, matches, round + 1)]
}
