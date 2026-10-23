import { type DatabaseSync } from "node:sqlite"
import { z } from "zod"
import { type BracketNode, getBracketRounds } from "./bracket.ts"

const SELECT_TOURNAMENT_MATCHES = `
  select
    id,
    tournament_round as round,
    tournament_position as position,
    winner_id as winnerId
  from matches
  where tournament_id = ?
`

const INSERT_TOURNAMENT_MATCH = `
  insert into matches (
    player1_id,
    player2_id,
    tournament_id,
    tournament_round,
    tournament_position
  ) values (:player1Id, :player2Id, :tournamentId, :round, :position)
`

const slotsSchema = z.array(z.object({ playerId: z.number().nullable() }))

const bracketMatchesSchema = z.array(
  z.object({
    id: z.number(),
    round: z.number(),
    position: z.number(),
    winnerId: z.number().nullable(),
  }),
)

const isReadyToPlay = ({ matchId, player1Id, player2Id }: BracketNode) =>
  matchId === null && player1Id !== null && player2Id !== null

export const createTournamentBracket = (db: DatabaseSync) => {
  const selectSlots = db.prepare(
    "select player_id as playerId from tournament_slots where tournament_id = ? order by slot",
  )
  const selectMatches = db.prepare(SELECT_TOURNAMENT_MATCHES)
  const insertMatch = db.prepare(INSERT_TOURNAMENT_MATCH)

  const findRounds = (tournamentId: number) => {
    const slots = slotsSchema
      .parse(selectSlots.all(tournamentId))
      .map(({ playerId }) => playerId)
    const matches = bracketMatchesSchema.parse(selectMatches.all(tournamentId))
    return getBracketRounds(slots, matches)
  }

  const scheduleReadyMatches = (tournamentId: number) => {
    findRounds(tournamentId)
      .flat()
      .filter(isReadyToPlay)
      .forEach(({ player1Id, player2Id, round, position }) => {
        insertMatch.run({ player1Id, player2Id, tournamentId, round, position })
      })
  }

  return { findRounds, scheduleReadyMatches }
}
