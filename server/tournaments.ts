import { Hono } from "hono"
import { HTTPException } from "hono/http-exception"
import { type DatabaseSync } from "node:sqlite"
import { z } from "zod"
import { drawBracket } from "./bracket.ts"
import { createTournamentSchema } from "./schemas.ts"
import { createTournamentBracket } from "./tournament-bracket.ts"
import { validate } from "./validate.ts"

const SELECT_TOURNAMENTS = `
  select id, created_at as createdAt
  from tournaments
  where :tournamentId is null or id = :tournamentId
  order by id desc
`

const SELECT_RANKED_PLAYER_IDS = `
  select id
  from players
  where id in (select value from json_each(?))
  order by elo desc, name
`

const tournamentsSchema = z.array(
  z.object({ id: z.number(), createdAt: z.string() }),
)

const idRowSchema = z.object({ id: z.number() })

export const createTournamentsRoutes = (db: DatabaseSync) => {
  const bracket = createTournamentBracket(db)
  const selectTournaments = db.prepare(SELECT_TOURNAMENTS)
  const selectRankedPlayerIds = db.prepare(SELECT_RANKED_PLAYER_IDS)
  const insertTournament = db.prepare(
    "insert into tournaments default values returning id",
  )
  const insertSlot = db.prepare(
    "insert into tournament_slots (tournament_id, slot, player_id) values (?, ?, ?)",
  )

  const findTournaments = (tournamentId: number | null) =>
    tournamentsSchema
      .parse(selectTournaments.all({ tournamentId }))
      .map((tournament) => ({
        ...tournament,
        rounds: bracket.findRounds(tournament.id),
      }))

  const findTournament = (tournamentId: number) => {
    const [tournament] = findTournaments(tournamentId)
    if (!tournament) {
      throw new HTTPException(404, { message: "Tournament not found" })
    }
    return tournament
  }

  const createTournament = (rankedPlayerIds: number[]) => {
    db.exec("begin")
    try {
      const { id } = idRowSchema.parse(insertTournament.get())
      drawBracket(rankedPlayerIds).forEach((playerId, slot) => {
        insertSlot.run(id, slot, playerId)
      })
      bracket.scheduleReadyMatches(id)
      db.exec("commit")
      return id
    } catch (error) {
      db.exec("rollback")
      throw error
    }
  }

  return new Hono()
    .get("/", (c) => c.json(findTournaments(null)))
    .post("/", validate("json", createTournamentSchema), (c) => {
      const { playerIds } = c.req.valid("json")
      const rankedPlayerIds = z
        .array(idRowSchema)
        .parse(selectRankedPlayerIds.all(JSON.stringify(playerIds)))
        .map(({ id }) => id)
      if (rankedPlayerIds.length !== playerIds.length) {
        throw new HTTPException(404, { message: "Player not found" })
      }

      const id = createTournament(rankedPlayerIds)
      return c.json(findTournament(id), 201)
    })
}
