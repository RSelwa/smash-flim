import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { STARTING_ELO } from "@server/constants.ts"
import { getEloStakes } from "@/lib/get-elo-stakes"

const NOW = "2026-10-22T16:00:00.000Z"
const MARIO = { id: 1, elo: 1092 }
const LINK = { id: 2, elo: 908 }
const KIRBY = { id: 3, elo: STARTING_ELO }
const MARIO_BEAT_LINK = {
  player1Id: MARIO.id,
  player2Id: LINK.id,
  winnerId: MARIO.id,
  playedAt: "2026-10-22T14:00:00.000Z",
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
})

afterEach(() => {
  vi.useRealTimers()
})

it("should stake the same amount either way between two new players", () => {
  expect(getEloStakes([], KIRBY, { id: 4, elo: STARTING_ELO })).toEqual({
    win: 92,
    loss: -92,
  })
})

it("should stake less on a win for the favourite than for the underdog", () => {
  const favouriteStakes = getEloStakes([MARIO_BEAT_LINK], MARIO, LINK)
  const underdogStakes = getEloStakes([MARIO_BEAT_LINK], LINK, MARIO)

  expect(favouriteStakes.win).toBeLessThan(underdogStakes.win)
})
