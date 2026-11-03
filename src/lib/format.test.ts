import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { formatDate } from "@/lib/format"

const NOW = "2026-11-03T12:00:00.000Z"

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
})

afterEach(() => {
  vi.useRealTimers()
})

it("should leave the year out of a date from this year", () => {
  expect(formatDate("2026-10-23T13:01:00.000Z")).not.toContain("2026")
})

it("should keep the year of a date from a past year", () => {
  expect(formatDate("2025-10-23T13:01:00.000Z")).toContain("2025")
})
