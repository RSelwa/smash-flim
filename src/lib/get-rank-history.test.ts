import { describe, expect, it } from "vitest"
import { STARTING_ELO } from "@server/constants.ts"
import { type Player } from "@server/schemas.ts"
import { getRankHistory } from "@/lib/get-rank-history"

const createPlayer = (id: number, name: string) =>
  ({
    id,
    name,
    character: null,
    elo: STARTING_ELO,
    wins: 0,
    losses: 0,
    createdAt: "2026-10-22T13:00:00.000Z",
  }) satisfies Player

describe("getRankHistory", () => {
  const mario = createPlayer(1, "Mario")
  const link = createPlayer(2, "Link")
  const kirby = createPlayer(3, "Kirby")
  const eloHistory = [
    { match: 1, "player-1": 908, "player-2": 1092, "player-3": STARTING_ELO },
    { match: 2, "player-1": 1120, "player-2": STARTING_ELO, "player-3": 880 },
  ]

  it("should rank the players by ELO after each match", () => {
    const rankHistory = getRankHistory([mario, kirby, link], eloHistory)

    expect(rankHistory).toEqual([
      { match: 1, "player-2": 1, "player-3": 2, "player-1": 3 },
      { match: 2, "player-1": 1, "player-2": 2, "player-3": 3 },
    ])
  })

  it("should move a player up a place when the one above is left out", () => {
    const [withKirby] = getRankHistory([mario, kirby, link], eloHistory)
    const [withoutKirby] = getRankHistory([mario, link], eloHistory)

    expect(withKirby).toHaveProperty("player-1", 3)
    expect(withoutKirby).toEqual({ match: 1, "player-2": 1, "player-1": 2 })
  })

  it("should break an ELO tie by name", () => {
    const bowser = createPlayer(4, "Bowser")

    const [firstSnapshot] = getRankHistory(
      [mario, kirby, link, bowser],
      [{ match: 1, "player-3": STARTING_ELO, "player-4": STARTING_ELO }],
    )

    expect(firstSnapshot).toEqual({ match: 1, "player-4": 1, "player-3": 2 })
  })

  it("should leave out a player missing from a snapshot", () => {
    const [firstSnapshot] = getRankHistory(
      [mario, kirby, link],
      [{ match: 1, "player-1": 908, "player-2": 1092 }],
    )

    expect(firstSnapshot).not.toHaveProperty("player-3")
  })

  it("should return no snapshot when no match was played", () => {
    expect(getRankHistory([mario, link], [])).toEqual([])
  })
})
