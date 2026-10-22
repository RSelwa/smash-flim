import { mkdirSync } from "node:fs"
import path from "node:path"
import { serve } from "@hono/node-server"
import { createApp } from "./app.ts"
import { openDatabase } from "./db.ts"

const DEFAULT_PORT = 3000
const DEFAULT_DATABASE_PATH = path.join(import.meta.dirname, "../data/smash.db")
const SHUTDOWN_SIGNALS = ["SIGINT", "SIGTERM"] as const

const databasePath = process.env.DATABASE_PATH ?? DEFAULT_DATABASE_PATH
const port = process.env.PORT
  ? Number.parseInt(process.env.PORT, 10)
  : DEFAULT_PORT

mkdirSync(path.dirname(databasePath), { recursive: true })
const db = openDatabase(databasePath)
const app = createApp(db)

const server = serve(
  { fetch: app.fetch, port, hostname: process.env.HOST },
  ({ address, port }) => {
    console.log(`Smash ELO API listening on ${address}:${port}`)
  },
)

for (const signal of SHUTDOWN_SIGNALS) {
  process.on(signal, () => {
    server.close()
    db.close()
    process.exit(0)
  })
}
