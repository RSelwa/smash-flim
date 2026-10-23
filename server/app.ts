import { Hono } from "hono"
import { HTTPException } from "hono/http-exception"
import { type DatabaseSync } from "node:sqlite"
import { createMatchesRoutes } from "./matches.ts"
import { createPlayersRoutes } from "./players.ts"
import { createTournamentsRoutes } from "./tournaments.ts"

export const createApp = (db: DatabaseSync) =>
  new Hono()
    .route("/api/players", createPlayersRoutes(db))
    .route("/api/matches", createMatchesRoutes(db))
    .route("/api/tournaments", createTournamentsRoutes(db))
    .onError((error, c) => {
      if (error instanceof HTTPException) {
        return c.json({ error: error.message }, error.status)
      }

      console.error(error)
      return c.json({ error: "Internal server error" }, 500)
    })

export type AppType = ReturnType<typeof createApp>
