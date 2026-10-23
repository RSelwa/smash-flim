import { describe, expect, it } from "vitest"
import { STARTING_ELO } from "./constants.ts"
import { replayElo } from "./replay-elo.ts"

const MARIO_ID = 1
const LINK_ID = 2
const KIRBY_ID = 3
const SAMUS_ID = 4

const undoneMatch = {
  id: 1,
  player1Id: MARIO_ID,
  player2Id: LINK_ID,
  winnerId: MARIO_ID,
  player1EloBefore: STARTING_ELO,
  player2EloBefore: STARTING_ELO,
}

describe("replayElo", () => {
  it("should give both players back their rating from before the undone match", () => {
    const { elos } = replayElo(undoneMatch, [])

    expect(Object.fromEntries(elos)).toEqual({
      [MARIO_ID]: STARTING_ELO,
      [LINK_ID]: STARTING_ELO,
    })
  })

  it("should recompute a later match from the corrected rating", () => {
    const { matches, elos } = replayElo(undoneMatch, [
      {
        id: 2,
        player1Id: MARIO_ID,
        player2Id: KIRBY_ID,
        winnerId: MARIO_ID,
        player1EloBefore: 1016,
        player2EloBefore: STARTING_ELO,
      },
    ])

    expect(matches).toEqual([
      {
        id: 2,
        player1EloBefore: STARTING_ELO,
        player2EloBefore: STARTING_ELO,
        eloChange: 16,
      },
    ])
    expect(Object.fromEntries(elos)).toMatchObject({
      [MARIO_ID]: 1016,
      [KIRBY_ID]: 984,
    })
  })

  it("should leave a later match between untouched players as it was", () => {
    const { matches } = replayElo(undoneMatch, [
      {
        id: 2,
        player1Id: KIRBY_ID,
        player2Id: SAMUS_ID,
        winnerId: KIRBY_ID,
        player1EloBefore: 1100,
        player2EloBefore: 900,
      },
    ])

    expect(matches).toEqual([
      { id: 2, player1EloBefore: 1100, player2EloBefore: 900, eloChange: 8 },
    ])
  })
})
