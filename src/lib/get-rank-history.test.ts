import { describe, expect, it } from "vitest"
import { STARTING_ELO } from "@server/constants.ts"
import type { CompletedMatch, Player } from "@server/schemas.ts"
import { getRankHistory } from "@/lib/get-rank-history"

const JOINED_AT = "2026-10-22T13:00:00.000Z"
const FIRST_MATCH_AT = "2026-10-22T14:00:00.000Z"
const LATE_JOINED_AT = "2026-10-22T14:30:00.000Z"
const SECOND_MATCH_AT = "2026-10-22T15:00:00.000Z"

type MatchFixture = {
  id: number
  player1: Player
  player2: Player
  player1EloBefore: number
  player2EloBefore: number
  winner: Player
  eloChange: number
  playedAt: string
}

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

const createMatch = ({
  id,
  player1,
  player2,
  player1EloBefore,
  player2EloBefore,
  winner,
  eloChange,
  playedAt,
}: MatchFixture) =>
  ({
    id,
    createdAt: playedAt,
    playedAt,
    winnerId: winner.id,
    eloChange,
    player1Id: player1.id,
    player1Name: player1.name,
    player1Character: player1.character,
    player1Elo: player1.elo,
    player1EloBefore,
    player2Id: player2.id,
    player2Name: player2.name,
    player2Character: player2.character,
    player2Elo: player2.elo,
    player2EloBefore,
  }) satisfies CompletedMatch

describe("getRankHistory", () => {
  const mario = createPlayer(1, "Mario")
  const link = createPlayer(2, "Link")
  const newestFirstMatches = [
    createMatch({
      id: 2,
      player1: mario,
      player2: link,
      player1EloBefore: 984,
      player2EloBefore: 1016,
      winner: mario,
      eloChange: 17,
      playedAt: SECOND_MATCH_AT,
    }),
    createMatch({
      id: 1,
      player1: mario,
      player2: link,
      player1EloBefore: STARTING_ELO,
      player2EloBefore: STARTING_ELO,
      winner: link,
      eloChange: 16,
      playedAt: FIRST_MATCH_AT,
    }),
  ]

  it("should rank the players by ELO after each match, oldest first", () => {
    const kirby = createPlayer(3, "Kirby")

    const rankHistory = getRankHistory([mario, kirby, link], newestFirstMatches)

    expect(rankHistory).toEqual([
      { match: 1, "player-2": 1, "player-3": 2, "player-1": 3 },
      { match: 2, "player-1": 1, "player-3": 2, "player-2": 3 },
    ])
  })

  it("should break an ELO tie by name", () => {
    const zelda = createPlayer(3, "Zelda")
    const bowser = createPlayer(4, "Bowser")

    const rankHistory = getRankHistory(
      [mario, zelda, bowser, link],
      newestFirstMatches,
    )

    expect(rankHistory[0]).toEqual({
      match: 1,
      "player-2": 1,
      "player-4": 2,
      "player-3": 3,
      "player-1": 4,
    })
  })

  it("should leave a player out of the matches played before they joined", () => {
    const kirby = createPlayer(3, "Kirby", LATE_JOINED_AT)

    const [firstSnapshot, secondSnapshot] = getRankHistory(
      [mario, kirby, link],
      newestFirstMatches,
    )

    expect(firstSnapshot).not.toHaveProperty("player-3")
    expect(secondSnapshot).toHaveProperty("player-3", 2)
  })

  it("should return no snapshot when no match was played", () => {
    expect(getRankHistory([mario, link], [])).toEqual([])
  })
})
