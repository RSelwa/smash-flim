import { existsSync, mkdirSync } from "node:fs"
import path from "node:path"
import { serve } from "@hono/node-server"
import { serveStatic } from "@hono/node-server/serve-static"
import { createApp } from "./app.ts"
import { openDatabase } from "./db.ts"

const DEFAULT_PORT = 3000
const DEFAULT_DATABASE_PATH = path.join(import.meta.dirname, "../data/smash.db")
const DIST_DIR = path.join(import.meta.dirname, "../dist")
const SHUTDOWN_SIGNALS = ["SIGINT", "SIGTERM"] as const

const databasePath = process.env.DATABASE_PATH ?? DEFAULT_DATABASE_PATH
const port = process.env.PORT
  ? Number.parseInt(process.env.PORT, 10)
  : DEFAULT_PORT

mkdirSync(path.dirname(databasePath), { recursive: true })
const db = openDatabase(databasePath)
const app = createApp(db)

if (existsSync(DIST_DIR)) {
  app
    .use("*", serveStatic({ root: DIST_DIR }))
    .get("*", serveStatic({ root: DIST_DIR, path: "index.html" }))
}

const server = serve({ fetch: app.fetch, port }, ({ port }) => {
  console.log(`Smash ELO listening on http://localhost:${port}`)
})

for (const signal of SHUTDOWN_SIGNALS) {
  process.on(signal, () => {
    server.close()
    db.close()
    process.exit(0)
  })
}
