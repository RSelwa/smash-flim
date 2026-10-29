import { expect, it } from "vitest"
import { replayClassicElo } from "./replay-classic-elo.ts"

const MARIO_ID = 1
const LINK_ID = 2
const KIRBY_ID = 3
const PLAYED_AT = "2026-10-22T14:00:00.000Z"

const createMatch = (
  player1Id: number,
  player2Id: number,
  winnerId: number,
) => ({
  player1Id,
  player2Id,
  winnerId,
  playedAt: PLAYED_AT,
})

const getFinalElos = (matches: ReturnType<typeof createMatch>[]) =>
  Object.fromEntries(replayClassicElo(matches).at(-1) ?? [])

it("should transfer half the K factor between two new players", () => {
  expect(getFinalElos([createMatch(MARIO_ID, LINK_ID, MARIO_ID)])).toEqual({
    [MARIO_ID]: 1016,
    [LINK_ID]: 984,
  })
})

it("should give the favourite fewer points for beating the underdog", () => {
  expect(
    getFinalElos([
      createMatch(MARIO_ID, LINK_ID, MARIO_ID),
      createMatch(MARIO_ID, LINK_ID, MARIO_ID),
    ]),
  ).toEqual({ [MARIO_ID]: 1031, [LINK_ID]: 969 })
})

it("should give the underdog more points for an upset", () => {
  expect(
    getFinalElos([
      createMatch(MARIO_ID, LINK_ID, MARIO_ID),
      createMatch(MARIO_ID, LINK_ID, LINK_ID),
    ]),
  ).toEqual({ [MARIO_ID]: 999, [LINK_ID]: 1001 })
})

it("should leave a player who did not play untouched", () => {
  const [, afterSecondMatch] = replayClassicElo([
    createMatch(MARIO_ID, LINK_ID, MARIO_ID),
    createMatch(MARIO_ID, KIRBY_ID, KIRBY_ID),
  ])

  expect(afterSecondMatch.get(LINK_ID)).toBe(984)
})
