import { Hono } from "hono"
import { HTTPException } from "hono/http-exception"
import { type DatabaseSync } from "node:sqlite"
import { z } from "zod"
import { MATCH_STATUS, SQL_NOW } from "./constants.ts"
import { getEloChange } from "./elo.ts"
import {
  createMatchSchema,
  idParamSchema,
  matchSchema,
  matchesQuerySchema,
  setWinnerSchema,
  type MatchesFilter,
} from "./schemas.ts"
import { createTournamentBracket } from "./tournament-bracket.ts"
import { validate } from "./validate.ts"

const SELECT_MATCHES = `
  select
    m.id,
    m.created_at as createdAt,
    m.played_at as playedAt,
    m.winner_id as winnerId,
    m.elo_change as eloChange,
    m.player1_id as player1Id,
    p1.name as player1Name,
    p1.character as player1Character,
    p1.elo as player1Elo,
    m.player1_elo_before as player1EloBefore,
    m.player2_id as player2Id,
    p2.name as player2Name,
    p2.character as player2Character,
    p2.elo as player2Elo,
    m.player2_elo_before as player2EloBefore,
    m.tournament_id as tournamentId
  from matches m
  join players p1 on p1.id = m.player1_id
  join players p2 on p2.id = m.player2_id
  where (:matchId is null or m.id = :matchId)
    and (:status is null or (m.winner_id is null) = (:status = '${MATCH_STATUS.pending}'))
    and (:playerId is null or :playerId in (m.player1_id, m.player2_id))
  order by coalesce(m.played_at, m.created_at) desc, m.id desc
  limit coalesce(:limit, -1)
`

const UPDATE_WINNER = `
  update matches set
    winner_id = :winnerId,
    player1_elo_before = :player1EloBefore,
    player2_elo_before = :player2EloBefore,
    elo_change = :eloChange,
    played_at = ${SQL_NOW}
  where id = :id
`

type MatchFilters = MatchesFilter & { matchId?: number }

export const createMatchesRoutes = (db: DatabaseSync) => {
  const tournamentBracket = createTournamentBracket(db)
  const selectMatches = db.prepare(SELECT_MATCHES)
  const countPlayers = db.prepare(
    "select count(*) as count from players where id in (?, ?)",
  )
  const insertMatch = db.prepare(
    "insert into matches (player1_id, player2_id) values (?, ?) returning id",
  )
  const updateWinner = db.prepare(UPDATE_WINNER)
  const updateElo = db.prepare("update players set elo = elo + ? where id = ?")
  const deleteMatch = db.prepare("delete from matches where id = ?")

  const findMatches = ({ matchId, status, playerId, limit }: MatchFilters) =>
    z.array(matchSchema).parse(
      selectMatches.all({
        matchId: matchId ?? null,
        status: status ?? null,
        playerId: playerId ?? null,
        limit: limit ?? null,
      }),
    )

  const findMatch = (matchId: number) => {
    const [match] = findMatches({ matchId })
    if (!match) {
      throw new HTTPException(404, { message: "Match not found" })
    }
    return match
  }

  return new Hono()
    .get("/", validate("query", matchesQuerySchema), (c) =>
      c.json(findMatches(c.req.valid("query"))),
    )
    .post("/", validate("json", createMatchSchema), (c) => {
      const { player1Id, player2Id } = c.req.valid("json")
      const { count } = z
        .object({ count: z.number() })
        .parse(countPlayers.get(player1Id, player2Id))
      if (count !== 2) {
        throw new HTTPException(404, { message: "Player not found" })
      }

      const { id } = z
        .object({ id: z.number() })
        .parse(insertMatch.get(player1Id, player2Id))
      return c.json(findMatch(id), 201)
    })
    .post(
      "/:id/winner",
      validate("param", idParamSchema),
      validate("json", setWinnerSchema),
      (c) => {
        const { id } = c.req.valid("param")
        const { winnerId } = c.req.valid("json")
        const match = findMatch(id)
        if (match.winnerId !== null) {
          throw new HTTPException(409, {
            message: "Match already has a winner",
          })
        }

        const isPlayer1Winner = winnerId === match.player1Id
        const isPlayer2Winner = winnerId === match.player2Id
        if (!isPlayer1Winner && !isPlayer2Winner) {
          throw new HTTPException(400, {
            message: "Winner must be one of the two players",
          })
        }

        const [winnerElo, loserElo] = isPlayer1Winner
          ? [match.player1Elo, match.player2Elo]
          : [match.player2Elo, match.player1Elo]
        const loserId = isPlayer1Winner ? match.player2Id : match.player1Id
        const eloChange = getEloChange(winnerElo, loserElo)

        db.exec("begin")
        try {
          updateWinner.run({
            id,
            winnerId,
            player1EloBefore: match.player1Elo,
            player2EloBefore: match.player2Elo,
            eloChange,
          })
          updateElo.run(eloChange, winnerId)
          updateElo.run(-eloChange, loserId)
          if (match.tournamentId !== null) {
            tournamentBracket.scheduleReadyMatches(match.tournamentId)
          }
          db.exec("commit")
        } catch (error) {
          db.exec("rollback")
          throw error
        }

        return c.json(findMatch(id))
      },
    )
    .delete("/:id", validate("param", idParamSchema), (c) => {
      const { id } = c.req.valid("param")
      const match = findMatch(id)
      if (match.winnerId !== null) {
        throw new HTTPException(409, {
          message: "A completed match cannot be cancelled",
        })
      }
      if (match.tournamentId !== null) {
        throw new HTTPException(409, {
          message: "A tournament match cannot be cancelled",
        })
      }

      deleteMatch.run(id)
      return c.body(null, 204)
    })
}
