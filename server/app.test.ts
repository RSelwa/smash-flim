import { testClient } from "hono/testing"
import { assert, beforeEach, describe, expect, it } from "vitest"
import { createApp } from "./app.ts"
import { MATCH_STATUS, STARTING_ELO } from "./constants.ts"
import { openDatabase } from "./db.ts"
import { type Character } from "./schemas.ts"

const DEFAULT_CHARACTER = "mario"
const TOURNAMENT_PLAYER_NAMES = ["Mario", "Link", "Kirby", "Samus"]

const createClient = () => testClient(createApp(openDatabase(":memory:")))

type Client = ReturnType<typeof createClient>

const createPlayer = async (
  client: Client,
  name: string,
  character: Character = DEFAULT_CHARACTER,
) => {
  const response = await client.api.players.$post({
    json: { name, character },
  })
  return response.json()
}

const createMatch = async (
  client: Client,
  player1Id: number,
  player2Id: number,
) => {
  const response = await client.api.matches.$post({
    json: { player1Id, player2Id },
  })
  return response.json()
}

const setWinner = (client: Client, matchId: number, winnerId: number) =>
  client.api.matches[":id"].winner.$post({
    param: { id: String(matchId) },
    json: { winnerId },
  })

const createTournament = (client: Client, playerIds: number[]) =>
  client.api.tournaments.$post({ json: { playerIds } })

const createTournamentPlayers = (client: Client, names: string[]) =>
  Promise.all(names.map((name) => createPlayer(client, name)))

const getPendingMatches = async (client: Client) => {
  const response = await client.api.matches.$get({
    query: { status: MATCH_STATUS.pending },
  })
  return response.json()
}

describe("players api", () => {
  it("should create a player at the starting ELO", async () => {
    const client = createClient()

    const player = await createPlayer(client, "Raphael", "pikachu")

    expect(player).toMatchObject({
      name: "Raphael",
      character: "pikachu",
      elo: STARTING_ELO,
      wins: 0,
      losses: 0,
    })
  })

  it("should reject a name already taken, whatever its case", async () => {
    const client = createClient()
    await createPlayer(client, "Mario")

    const response = await client.api.players.$post({
      json: { name: "mario", character: DEFAULT_CHARACTER },
    })

    expect(response.status).toBe(409)
    expect(await response.json()).toEqual({ error: "mario already exists" })
  })

  it("should reject a blank name", async () => {
    const client = createClient()

    const response = await client.api.players.$post({
      json: { name: "  ", character: DEFAULT_CHARACTER },
    })

    expect(response.status).toBe(400)
  })

  it("should reject an unknown character", async () => {
    const client = createClient()

    const response = await client.api.players.$post({
      json: { name: "Mario", character: "goku" as Character },
    })

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: "Pick a character" })
  })

  it("should update the name and character of a player", async () => {
    const client = createClient()
    const player = await createPlayer(client, "Mario")

    const response = await client.api.players[":id"].$put({
      param: { id: String(player.id) },
      json: { name: "Dr. Mario", character: "dr-mario" },
    })

    expect(await response.json()).toMatchObject({
      id: player.id,
      name: "Dr. Mario",
      character: "dr-mario",
    })
  })

  it("should let a player change the case of their own name", async () => {
    const client = createClient()
    const player = await createPlayer(client, "mario")

    const response = await client.api.players[":id"].$put({
      param: { id: String(player.id) },
      json: { name: "Mario", character: DEFAULT_CHARACTER },
    })

    expect(await response.json()).toMatchObject({ name: "Mario" })
  })

  it("should reject a name taken by another player", async () => {
    const client = createClient()
    await createPlayer(client, "Mario")
    const link = await createPlayer(client, "Link")

    const response = await client.api.players[":id"].$put({
      param: { id: String(link.id) },
      json: { name: "MARIO", character: DEFAULT_CHARACTER },
    })

    expect(response.status).toBe(409)
  })

  it("should not update an unknown player", async () => {
    const client = createClient()

    const response = await client.api.players[":id"].$put({
      param: { id: "999" },
      json: { name: "Mario", character: DEFAULT_CHARACTER },
    })

    expect(response.status).toBe(404)
  })
})

describe("matches api", () => {
  it("should create a pending match", async () => {
    const client = createClient()
    const mario = await createPlayer(client, "Mario")
    const link = await createPlayer(client, "Link")

    const match = await createMatch(client, mario.id, link.id)

    expect(match).toMatchObject({
      player1Name: "Mario",
      player2Name: "Link",
      winnerId: null,
      eloChange: null,
    })
  })

  it("should reject a match against oneself", async () => {
    const client = createClient()
    const mario = await createPlayer(client, "Mario")

    const response = await client.api.matches.$post({
      json: { player1Id: mario.id, player2Id: mario.id },
    })

    expect(response.status).toBe(400)
  })

  it("should reject a match with an unknown player", async () => {
    const client = createClient()
    const mario = await createPlayer(client, "Mario")

    const response = await client.api.matches.$post({
      json: { player1Id: mario.id, player2Id: 999 },
    })

    expect(response.status).toBe(404)
  })

  it("should reject a winner outside the match", async () => {
    const client = createClient()
    const mario = await createPlayer(client, "Mario")
    const link = await createPlayer(client, "Link")
    const kirby = await createPlayer(client, "Kirby")
    const match = await createMatch(client, mario.id, link.id)

    const response = await setWinner(client, match.id, kirby.id)

    expect(response.status).toBe(400)
  })

  it("should cancel a pending match", async () => {
    const client = createClient()
    const mario = await createPlayer(client, "Mario")
    const link = await createPlayer(client, "Link")
    const match = await createMatch(client, mario.id, link.id)

    const response = await client.api.matches[":id"].$delete({
      param: { id: String(match.id) },
    })
    const matches = await (await client.api.matches.$get({ query: {} })).json()

    expect(response.status).toBe(204)
    expect(matches).toEqual([])
  })

  it("should list only the matches of the requested status", async () => {
    const client = createClient()
    const mario = await createPlayer(client, "Mario")
    const link = await createPlayer(client, "Link")
    const playedMatch = await createMatch(client, mario.id, link.id)
    const pendingMatch = await createMatch(client, mario.id, link.id)
    await setWinner(client, playedMatch.id, mario.id)

    const response = await client.api.matches.$get({
      query: { status: MATCH_STATUS.pending },
    })
    const matches = await response.json()

    expect(matches.map(({ id }) => id)).toEqual([pendingMatch.id])
  })

  describe("when a winner is set", () => {
    let client: Client
    let marioId: number
    let linkId: number
    let matchId: number

    beforeEach(async () => {
      client = createClient()
      marioId = (await createPlayer(client, "Mario")).id
      linkId = (await createPlayer(client, "Link")).id
      matchId = (await createMatch(client, marioId, linkId)).id
      await setWinner(client, matchId, linkId)
    })

    it("should transfer ELO from the loser to the winner", async () => {
      const players = await (await client.api.players.$get()).json()

      expect(players).toMatchObject([
        { id: linkId, elo: 1016, wins: 1, losses: 0 },
        { id: marioId, elo: 984, wins: 0, losses: 1 },
      ])
    })

    it("should record the ratings before the match", async () => {
      const [match] = await (
        await client.api.matches.$get({ query: { playerId: String(marioId) } })
      ).json()

      expect(match).toMatchObject({
        winnerId: linkId,
        eloChange: 16,
        player1EloBefore: STARTING_ELO,
        player2EloBefore: STARTING_ELO,
      })
    })

    it("should reject a second winner", async () => {
      const response = await setWinner(client, matchId, marioId)

      expect(response.status).toBe(409)
    })

    it("should refuse to cancel the match", async () => {
      const response = await client.api.matches[":id"].$delete({
        param: { id: String(matchId) },
      })

      expect(response.status).toBe(409)
    })
  })
})

describe("tournaments api", () => {
  it("should schedule the first round as pending matches", async () => {
    const client = createClient()
    const players = await createTournamentPlayers(
      client,
      TOURNAMENT_PLAYER_NAMES,
    )

    const response = await createTournament(
      client,
      players.map(({ id }) => id),
    )
    const tournament = await response.json()
    const pendingMatches = await getPendingMatches(client)

    expect(response.status).toBe(201)
    expect(pendingMatches.map(({ tournamentId }) => tournamentId)).toEqual([
      tournament.id,
      tournament.id,
    ])
  })

  it("should give the bye to the best ELO", async () => {
    const client = createClient()
    const kirby = await createPlayer(client, "Kirby")
    const link = await createPlayer(client, "Link")
    const mario = await createPlayer(client, "Mario")
    const match = await createMatch(client, mario.id, link.id)
    await setWinner(client, match.id, mario.id)

    const response = await createTournament(client, [
      link.id,
      kirby.id,
      mario.id,
    ])
    const tournament = await response.json()

    expect(tournament.rounds[0]?.[0]).toMatchObject({
      player1Id: mario.id,
      player2Id: null,
      winnerId: mario.id,
    })
  })

  it("should schedule a match between two byes straight away", async () => {
    const client = createClient()
    const players = await createTournamentPlayers(client, [
      ...TOURNAMENT_PLAYER_NAMES,
      "Zelda",
    ])

    await createTournament(
      client,
      players.map(({ id }) => id),
    )
    const pendingMatches = await getPendingMatches(client)

    expect(pendingMatches).toHaveLength(2)
  })

  it("should reject fewer than two players", async () => {
    const client = createClient()
    const mario = await createPlayer(client, "Mario")

    const response = await createTournament(client, [mario.id])

    expect(response.status).toBe(400)
  })

  it("should reject the same player twice", async () => {
    const client = createClient()
    const mario = await createPlayer(client, "Mario")

    const response = await createTournament(client, [mario.id, mario.id])

    expect(response.status).toBe(400)
  })

  it("should reject an unknown player", async () => {
    const client = createClient()
    const mario = await createPlayer(client, "Mario")

    const response = await createTournament(client, [mario.id, 999])

    expect(response.status).toBe(404)
  })

  it("should refuse to cancel a tournament match", async () => {
    const client = createClient()
    const players = await createTournamentPlayers(client, ["Mario", "Link"])
    await createTournament(
      client,
      players.map(({ id }) => id),
    )
    const [final] = await getPendingMatches(client)
    assert(final)

    const response = await client.api.matches[":id"].$delete({
      param: { id: String(final.id) },
    })

    expect(response.status).toBe(409)
  })

  describe("when every first-round match is reported", () => {
    let client: Client
    let finalistIds: number[]

    beforeEach(async () => {
      client = createClient()
      const players = await createTournamentPlayers(
        client,
        TOURNAMENT_PLAYER_NAMES,
      )
      await createTournament(
        client,
        players.map(({ id }) => id),
      )
      const firstRound = await getPendingMatches(client)
      finalistIds = firstRound.map(({ player1Id }) => player1Id)
      await Promise.all(
        firstRound.map(({ id, player1Id }) => setWinner(client, id, player1Id)),
      )
    })

    it("should schedule the final between the winners", async () => {
      const [final] = await getPendingMatches(client)
      assert(final)

      expect([final.player1Id, final.player2Id]).toEqual(
        expect.arrayContaining(finalistIds),
      )
    })

    it("should crown the winner of the final", async () => {
      const [final] = await getPendingMatches(client)
      assert(final)

      await setWinner(client, final.id, final.player2Id)
      const [tournament] = await (await client.api.tournaments.$get()).json()

      expect(tournament?.rounds.at(-1)?.[0]?.winnerId).toBe(final.player2Id)
    })
  })
})
