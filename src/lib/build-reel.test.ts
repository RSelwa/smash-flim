import { describe, expect, it } from "vitest"
import { CHARACTERS } from "@server/characters.ts"
import { buildReel } from "@/lib/build-reel"

const COSTUME_IDS = new Set<string>(
  CHARACTERS.filter((character) => "costumeOf" in character).map(
    ({ id }) => id,
  ),
)

describe("buildReel", () => {
  it("should start on the character already shown", () => {
    expect(buildReel("mario").at(0)).toBe("mario")
  })

  it("should never land on the character already shown", () => {
    const alwaysFirst = () => 0

    expect(buildReel("mario", alwaysFirst).at(-1)).not.toBe("mario")
  })

  it("should never spin through an alternate costume", () => {
    const reel = buildReel(null)

    expect(reel.filter((id) => COSTUME_IDS.has(id))).toEqual([])
  })
})
