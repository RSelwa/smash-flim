import { describe, expect, it } from "vitest"
import { STARTING_ELO } from "@server/constants.ts"
import type { Player } from "@server/schemas.ts"
import { getHiddenPlayerIds } from "@/lib/get-hidden-player-ids"

const createPlayer = (id: number, wins: number, losses: number) =>
  ({
    id,
    name: `Player ${id}`,
    character: null,
    elo: STARTING_ELO,
    wins,
    losses,
    createdAt: "2026-10-22T13:00:00.000Z",
  }) satisfies Player

const winner = createPlayer(1, 1, 0)
const loser = createPlayer(2, 0, 1)
const newcomer = createPlayer(3, 0, 0)
const players = [winner, loser, newcomer]

describe("when no player is toggled", () => {
  it("should hide only the players who have not played", () => {
    expect(getHiddenPlayerIds(players, [])).toEqual([newcomer.id])
  })
})

describe("when a player who has played is toggled", () => {
  it("should hide them too", () => {
    expect(getHiddenPlayerIds(players, [loser.id])).toEqual([
      loser.id,
      newcomer.id,
    ])
  })
})

describe("when a player who has not played is toggled", () => {
  it("should show them", () => {
    expect(getHiddenPlayerIds(players, [newcomer.id])).toEqual([])
  })
})
