import { Hono } from "hono"
import { HTTPException } from "hono/http-exception"
import { type DatabaseSync } from "node:sqlite"
import { z } from "zod"
import { STARTING_ELO } from "./constants.ts"
import { idParamSchema, playerInputSchema, playerSchema } from "./schemas.ts"
import { validate } from "./validate.ts"

const SELECT_PLAYERS = `
  select
    p.id,
    p.name,
    p.character,
    p.elo,
    p.created_at as createdAt,
    count(m.id) filter (where m.winner_id = p.id) as wins,
    count(m.id) filter (where m.winner_id <> p.id) as losses
  from players p
  left join matches m
    on p.id in (m.player1_id, m.player2_id) and m.winner_id is not null
  where :playerId is null or p.id = :playerId
  group by p.id
  order by p.elo desc, p.name
`

export const createPlayersRoutes = (db: DatabaseSync) => {
  const selectPlayers = db.prepare(SELECT_PLAYERS)
  const insertPlayer = db.prepare(
    "insert into players (name, character, elo) values (?, ?, ?) on conflict do nothing returning id",
  )
  const selectOtherPlayerByName = db.prepare(
    "select id from players where name = ? and id <> ?",
  )
  const updatePlayer = db.prepare(
    "update players set name = ?, character = ? where id = ?",
  )

  const findPlayers = (playerId: number | null) =>
    z.array(playerSchema).parse(selectPlayers.all({ playerId }))

  const findPlayer = (playerId: number) => {
    const [player] = findPlayers(playerId)
    if (!player) {
      throw new HTTPException(404, { message: "Player not found" })
    }
    return player
  }

  return new Hono()
    .get("/", (c) => c.json(findPlayers(null)))
    .post("/", validate("json", playerInputSchema), (c) => {
      const { name, character } = c.req.valid("json")
      const inserted = insertPlayer.get(name, character, STARTING_ELO)
      if (!inserted) {
        throw new HTTPException(409, { message: `${name} already exists` })
      }

      const { id } = z.object({ id: z.number() }).parse(inserted)
      return c.json(findPlayer(id), 201)
    })
    .put(
      "/:id",
      validate("param", idParamSchema),
      validate("json", playerInputSchema),
      (c) => {
        const { id } = c.req.valid("param")
        const { name, character } = c.req.valid("json")
        const isNameTaken = selectOtherPlayerByName.get(name, id) !== undefined
        if (isNameTaken) {
          throw new HTTPException(409, { message: `${name} already exists` })
        }

        const { changes } = updatePlayer.run(name, character, id)
        if (changes === 0) {
          throw new HTTPException(404, { message: "Player not found" })
        }

        return c.json(findPlayer(id))
      },
    )
}
