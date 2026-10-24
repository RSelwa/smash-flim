import { describe, expect, it } from "vitest"
import { addFighterToSlots } from "@/lib/add-fighter-to-slots"

describe("when the arena is empty", () => {
  it("should take the first slot", () => {
    expect(addFighterToSlots({ player1: null, player2: null }, 1)).toEqual({
      player1: 1,
      player2: null,
    })
  })
})

describe("when only the second slot is taken", () => {
  it("should take the first slot", () => {
    expect(addFighterToSlots({ player1: null, player2: 2 }, 1)).toEqual({
      player1: 1,
      player2: 2,
    })
  })
})

describe("when only the first slot is taken", () => {
  it("should take the second slot", () => {
    expect(addFighterToSlots({ player1: 1, player2: null }, 2)).toEqual({
      player1: 1,
      player2: 2,
    })
  })
})

describe("when both slots are taken", () => {
  it("should replace the second fighter", () => {
    expect(addFighterToSlots({ player1: 1, player2: 2 }, 3)).toEqual({
      player1: 1,
      player2: 3,
    })
  })
})
