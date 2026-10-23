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

const SELECT_NEXT_MATCH = `
  select next.id, next.winner_id as winnerId
  from matches m
  join matches next
    on next.tournament_id = m.tournament_id
    and next.tournament_round = m.tournament_round + 1
    and next.tournament_position = m.tournament_position / 2
  where m.id = ?
`

const slotsSchema = z.array(z.object({ playerId: z.number().nullable() }))

const nextMatchSchema = z
  .object({ id: z.number(), winnerId: z.number().nullable() })
  .optional()

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
  const selectNextMatch = db.prepare(SELECT_NEXT_MATCH)

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

  const findNextMatch = (matchId: number) =>
    nextMatchSchema.parse(selectNextMatch.get(matchId))

  return { findRounds, scheduleReadyMatches, findNextMatch }
}
