import { expect, it } from "vitest"
import type { BracketNode } from "@server/bracket.ts"
import { getChampionId } from "@/lib/get-champion-id"

const createFinal = (winnerId: number | null) =>
  ({
    round: 0,
    position: 0,
    matchId: 1,
    player1Id: 1,
    player2Id: 2,
    winnerId,
  }) satisfies BracketNode

it("should return the winner of the final", () => {
  expect(getChampionId([[createFinal(2)]])).toBe(2)
})

it("should return null while the final is not played", () => {
  expect(getChampionId([[createFinal(null)]])).toBeNull()
})
