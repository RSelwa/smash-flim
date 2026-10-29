import { existsSync } from "node:fs"
import { backup, DatabaseSync } from "node:sqlite"
import { openDatabase } from "./db.ts"
import { rebuildElo } from "./rebuild-elo.ts"

const [sourcePath, targetPath] = process.argv.slice(2)

if (!sourcePath || !targetPath) {
  console.error("Usage: node server/seed-database.ts <source.db> <target.db>")
  process.exit(1)
}
if (existsSync(targetPath)) {
  console.error(`${targetPath} already exists, refusing to overwrite it`)
  process.exit(1)
}

const source = new DatabaseSync(sourcePath, { readOnly: true })
await backup(source, targetPath)
source.close()

const db = openDatabase(targetPath)
db.exec("begin")
rebuildElo(db)
db.exec("commit")
db.close()

console.log(`Seeded ${targetPath} from ${sourcePath}`)
