import { expect, it } from "vitest"
import { SERIES_COLORS } from "@/constants/chart"
import { getSeriesColor } from "@/lib/get-series-color"

it("should give the leader the first color", () => {
  expect(getSeriesColor(0)).toBe(SERIES_COLORS[0])
})

it("should cycle back to the first color past the last one", () => {
  expect(getSeriesColor(SERIES_COLORS.length)).toBe(SERIES_COLORS[0])
})
