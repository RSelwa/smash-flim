import { expect, it } from "vitest"
import { STARTING_ELO } from "@server/constants.ts"
import { replayClassicElo } from "@server/replay-classic-elo.ts"
import { replayElo } from "@server/replay-elo.ts"
import type { CompletedMatch, Player } from "@server/schemas.ts"
import { getEloHistory } from "@/lib/get-elo-history"

const JOINED_AT = "2026-10-22T13:00:00.000Z"
const FIRST_MATCH_AT = "2026-10-22T14:00:00.000Z"
const LATE_JOINED_AT = "2026-10-22T14:30:00.000Z"
const SECOND_MATCH_AT = "2026-10-22T15:00:00.000Z"

const createPlayer = (id: number, name: string, createdAt = JOINED_AT) =>
  ({
    id,
    name,
    character: null,
    elo: STARTING_ELO,
    wins: 0,
    losses: 0,
    createdAt,
  }) satisfies Player

const mario = createPlayer(1, "Mario")
const link = createPlayer(2, "Link")

const newestFirstMatches = [
  {
    id: 2,
    createdAt: SECOND_MATCH_AT,
    playedAt: SECOND_MATCH_AT,
    winnerId: mario.id,
    player1Id: mario.id,
    player1Name: mario.name,
    player1Character: null,
    player1Elo: mario.elo,
    player1EloBefore: 908,
    player1EloChange: 92,
    player2Id: link.id,
    player2Name: link.name,
    player2Character: null,
    player2Elo: link.elo,
    player2EloBefore: 1092,
    player2EloChange: -92,
    tournamentId: null,
  },
  {
    id: 1,
    createdAt: FIRST_MATCH_AT,
    playedAt: FIRST_MATCH_AT,
    winnerId: link.id,
    player1Id: mario.id,
    player1Name: mario.name,
    player1Character: null,
    player1Elo: mario.elo,
    player1EloBefore: STARTING_ELO,
    player1EloChange: -92,
    player2Id: link.id,
    player2Name: link.name,
    player2Character: null,
    player2Elo: link.elo,
    player2EloBefore: STARTING_ELO,
    player2EloChange: 92,
    tournamentId: null,
  },
] satisfies CompletedMatch[]

it("should give every player their ELO after each match, oldest first", () => {
  const kirby = createPlayer(3, "Kirby")

  const eloHistory = getEloHistory(
    [mario, kirby, link],
    newestFirstMatches,
    replayElo,
  )

  expect(eloHistory).toEqual([
    { match: 1, "player-1": 908, "player-3": 1000, "player-2": 1092 },
    { match: 2, "player-1": 1000, "player-3": 1000, "player-2": 1000 },
  ])
})

it("should rate the matches with the system it is given", () => {
  const eloHistory = getEloHistory(
    [mario, link],
    newestFirstMatches,
    replayClassicElo,
  )

  expect(eloHistory).toEqual([
    { match: 1, "player-1": 984, "player-2": 1016 },
    { match: 2, "player-1": 1001, "player-2": 999 },
  ])
})

it("should leave a player out of the matches played before they joined", () => {
  const kirby = createPlayer(3, "Kirby", LATE_JOINED_AT)

  const [firstSnapshot, secondSnapshot] = getEloHistory(
    [mario, kirby, link],
    newestFirstMatches,
    replayElo,
  )

  expect(firstSnapshot).not.toHaveProperty("player-3")
  expect(secondSnapshot).toHaveProperty("player-3", STARTING_ELO)
})
