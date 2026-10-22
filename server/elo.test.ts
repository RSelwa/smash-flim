import { describe, expect, it } from "vitest"
import { getEloChange } from "./elo.ts"

describe("getEloChange", () => {
  it("should transfer half the K factor between equal ratings", () => {
    expect(getEloChange(1000, 1000)).toBe(16)
  })

  it("should give the favourite fewer points for beating the underdog", () => {
    expect(getEloChange(1200, 1000)).toBe(8)
  })

  it("should give the underdog more points for an upset", () => {
    expect(getEloChange(1000, 1200)).toBe(24)
  })
})
