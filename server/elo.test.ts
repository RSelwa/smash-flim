import { describe, expect, it } from "vitest"
import { getElos } from "./elo.ts"

const MARIO_ID = 1
const LINK_ID = 2
const KIRBY_ID = 3
const FIRST_MATCH_AT = "2026-10-22T14:00:00.000Z"
const SECOND_MATCH_AT = "2026-10-22T15:00:00.000Z"
const FOUR_MONTHS_EARLIER = "2026-06-22T14:00:00.000Z"

const createMatch = (
  player1Id: number,
  player2Id: number,
  winnerId: number,
  playedAt = FIRST_MATCH_AT,
) => ({ player1Id, player2Id, winnerId, playedAt })

describe("getElos", () => {
  it("should move the winner up and the loser down by the same amount", () => {
    const elos = getElos([createMatch(MARIO_ID, LINK_ID, LINK_ID)])

    expect(Object.fromEntries(elos)).toEqual({
      [MARIO_ID]: 908,
      [LINK_ID]: 1092,
    })
  })

  it("should give the same ratings whatever order the results come in", () => {
    const matches = [
      createMatch(MARIO_ID, LINK_ID, MARIO_ID),
      createMatch(LINK_ID, KIRBY_ID, LINK_ID),
      createMatch(KIRBY_ID, MARIO_ID, KIRBY_ID),
      createMatch(MARIO_ID, LINK_ID, MARIO_ID),
    ]

    expect(getElos(matches.toReversed())).toEqual(getElos(matches))
  })

  it("should count an old result less than a recent one", () => {
    const elos = getElos([
      createMatch(MARIO_ID, LINK_ID, LINK_ID, FOUR_MONTHS_EARLIER),
      createMatch(MARIO_ID, LINK_ID, MARIO_ID),
    ])

    expect(Object.fromEntries(elos)).toEqual({
      [MARIO_ID]: 1061,
      [LINK_ID]: 939,
    })
  })

  it("should raise a player whose beaten opponent goes on to win", () => {
    const elos = getElos([
      createMatch(MARIO_ID, LINK_ID, MARIO_ID),
      createMatch(LINK_ID, KIRBY_ID, LINK_ID, SECOND_MATCH_AT),
    ])

    expect(Object.fromEntries(elos)).toEqual({
      [MARIO_ID]: 1120,
      [LINK_ID]: 1000,
      [KIRBY_ID]: 880,
    })
  })
})
