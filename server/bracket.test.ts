import { afterEach, describe, expect, it, vi } from "vitest"
import { drawBracket, getBracketRounds } from "./bracket.ts"

const mockRandomValues = (values: number[]) => {
  values.reduce(
    (spy, value) => spy.mockReturnValueOnce(value),
    vi.spyOn(Math, "random"),
  )
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe("drawBracket", () => {
  it("should place the seeds in the standard bracket order", () => {
    mockRandomValues([0.1, 0.2, 0.3, 0.4, 0.5, 0.6])

    expect(drawBracket([1, 2, 3, 4, 5, 6, 7, 8])).toEqual([
      1, 8, 4, 5, 2, 7, 3, 6,
    ])
  })

  it("should draw every player but the two best ranked at random", () => {
    mockRandomValues([0.6, 0.5, 0.4, 0.3, 0.2, 0.1])

    expect(drawBracket([1, 2, 3, 4, 5, 6, 7, 8])).toEqual([
      1, 3, 7, 6, 2, 4, 8, 5,
    ])
  })

  it("should give the byes to the best ranked players", () => {
    mockRandomValues([0.1, 0.2])

    expect(drawBracket([1, 2, 3, 4, 5])).toEqual([
      1,
      null,
      4,
      5,
      2,
      null,
      3,
      null,
    ])
  })

  it("should make two players meet in the final straight away", () => {
    expect(drawBracket([1, 2])).toEqual([1, 2])
  })
})

describe("getBracketRounds", () => {
  it("should advance a player with a bye to the next round", () => {
    const rounds = getBracketRounds([1, null, 2, 3], [])

    expect(rounds).toEqual([
      [
        {
          round: 0,
          position: 0,
          matchId: null,
          player1Id: 1,
          player2Id: null,
          winnerId: 1,
        },
        {
          round: 0,
          position: 1,
          matchId: null,
          player1Id: 2,
          player2Id: 3,
          winnerId: null,
        },
      ],
      [
        {
          round: 1,
          position: 0,
          matchId: null,
          player1Id: 1,
          player2Id: null,
          winnerId: null,
        },
      ],
    ])
  })

  it("should advance the winner of a match to the next round", () => {
    const rounds = getBracketRounds(
      [1, null, 2, 3],
      [{ id: 7, round: 0, position: 1, winnerId: 3 }],
    )

    expect(rounds[0]?.[1]).toMatchObject({ matchId: 7, winnerId: 3 })
    expect(rounds[1]?.[0]).toMatchObject({ player1Id: 1, player2Id: 3 })
  })

  it("should crown the winner of the final", () => {
    const rounds = getBracketRounds(
      [1, 2],
      [{ id: 1, round: 0, position: 0, winnerId: 2 }],
    )

    expect(rounds).toHaveLength(1)
    expect(rounds[0]?.[0]?.winnerId).toBe(2)
  })
})
