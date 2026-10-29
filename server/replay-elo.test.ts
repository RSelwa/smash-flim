import { expect, it } from "vitest"
import { replayElo } from "./replay-elo.ts"

const MARIO_ID = 1
const LINK_ID = 2
const KIRBY_ID = 3

it("should rate each match from the results played up to it", () => {
  const elosAfterEachMatch = replayElo([
    {
      player1Id: MARIO_ID,
      player2Id: LINK_ID,
      winnerId: MARIO_ID,
      playedAt: "2026-10-22T14:00:00.000Z",
    },
    {
      player1Id: LINK_ID,
      player2Id: KIRBY_ID,
      winnerId: LINK_ID,
      playedAt: "2026-10-22T15:00:00.000Z",
    },
  ])

  expect(elosAfterEachMatch.map((elos) => Object.fromEntries(elos))).toEqual([
    { [MARIO_ID]: 1092, [LINK_ID]: 908 },
    { [MARIO_ID]: 1120, [LINK_ID]: 1000, [KIRBY_ID]: 880 },
  ])
})
