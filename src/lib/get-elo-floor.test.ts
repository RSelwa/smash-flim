import { expect, it } from "vitest"
import { getEloFloor } from "@/lib/get-elo-floor"

it("should round the lowest ELO down to the axis step below its padding", () => {
  expect(getEloFloor([1073, 953, 1000])).toBe(900)
})

it("should step down once more when the padding crosses a step", () => {
  expect(getEloFloor([1015])).toBe(950)
})

it("should return 0 when there is no ELO", () => {
  expect(getEloFloor([])).toBe(0)
})
