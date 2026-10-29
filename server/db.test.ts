import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { DatabaseSync } from "node:sqlite"
import { afterEach, expect, it } from "vitest"
import { openDatabase } from "./db.ts"

const LEGACY_SCHEMA = `
  create table players (
    id integer primary key,
    name text not null unique collate nocase,
    elo integer not null,
    created_at text not null default (datetime('now'))
  );
  insert into players (name, elo) values ('Mario', 1016);
`

let directory = ""

const openLegacyDatabase = () => {
  directory = mkdtempSync(path.join(tmpdir(), "smash-elo-"))
  const location = path.join(directory, "smash.db")
  const legacyDb = new DatabaseSync(location)
  legacyDb.exec(LEGACY_SCHEMA)
  legacyDb.close()
  return openDatabase(location)
}

afterEach(() => {
  rmSync(directory, { recursive: true, force: true })
})

it("should keep the players of a database created before characters", () => {
  const db = openLegacyDatabase()

  expect(db.prepare("select name, elo, character from players").all()).toEqual([
    { name: "Mario", elo: 1016, character: null },
  ])
})

it("should carry the ELO of an existing database over to the classic ELO", () => {
  const db = openLegacyDatabase()

  expect(
    db.prepare("select classic_elo as classicElo from players").all(),
  ).toEqual([{ classicElo: 1016 }])
})
