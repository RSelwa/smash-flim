import { expect, it } from "vitest"
import type { CompletedMatch } from "@server/schemas.ts"
import { formatDay } from "@/lib/format"
import { getPlayDays } from "@/lib/get-play-days"

const FIRST_DAY_MORNING = "2026-10-22T10:00:00.000Z"
const FIRST_DAY_LATER = "2026-10-22T11:00:00.000Z"
const SECOND_DAY = "2026-10-23T10:00:00.000Z"

const createMatch = (id: number, playedAt: string) =>
  ({
    id,
    createdAt: playedAt,
    playedAt,
    winnerId: 1,
    eloChange: 16,
    player1Id: 1,
    player1Name: "Mario",
    player1Character: null,
    player1Elo: 1016,
    player1EloBefore: 1000,
    player2Id: 2,
    player2Name: "Link",
    player2Character: null,
    player2Elo: 984,
    player2EloBefore: 1000,
    tournamentId: null,
  }) satisfies CompletedMatch

it("should keep the last snapshot of each day, oldest day first", () => {
  const newestFirstMatches = [
    createMatch(3, SECOND_DAY),
    createMatch(2, FIRST_DAY_LATER),
    createMatch(1, FIRST_DAY_MORNING),
  ]

  expect(getPlayDays(newestFirstMatches)).toEqual([
    { label: formatDay(FIRST_DAY_LATER), snapshotIndex: 1 },
    { label: formatDay(SECOND_DAY), snapshotIndex: 2 },
  ])
})

it("should return no day when no match was played", () => {
  expect(getPlayDays([])).toEqual([])
})
