import { beforeEach, expect, it } from "vitest"
import { type DatabaseSync } from "node:sqlite"
import { STARTING_ELO } from "./constants.ts"
import { openDatabase } from "./db.ts"
import { rebuildElo } from "./rebuild-elo.ts"

const OUTDATED_ELO = 1234
const SEED = `
  insert into players (id, name, elo) values
    (1, 'Mario', ${OUTDATED_ELO}),
    (2, 'Link', ${OUTDATED_ELO}),
    (3, 'Kirby', ${OUTDATED_ELO}),
    (4, 'Samus', ${OUTDATED_ELO});
  insert into matches (id, player1_id, player2_id, winner_id, played_at) values
    (1, 1, 2, 1, '2026-10-22T14:00:00.000Z'),
    (2, 2, 3, 2, '2026-10-22T15:00:00.000Z');
  insert into matches (id, player1_id, player2_id) values (3, 1, 4);
`

let db: DatabaseSync

beforeEach(() => {
  db = openDatabase(":memory:")
  db.exec(SEED)
  rebuildElo(db)
})

it("should record each player's ELO before every result and its change", () => {
  const snapshots = db
    .prepare(
      `select
        id,
        player1_elo_before as player1EloBefore,
        player1_elo_change as player1EloChange,
        player2_elo_before as player2EloBefore,
        player2_elo_change as player2EloChange
      from matches order by id`,
    )
    .all()

  expect(snapshots).toEqual([
    {
      id: 1,
      player1EloBefore: STARTING_ELO,
      player1EloChange: 92,
      player2EloBefore: STARTING_ELO,
      player2EloChange: -92,
    },
    {
      id: 2,
      player1EloBefore: 908,
      player1EloChange: 92,
      player2EloBefore: STARTING_ELO,
      player2EloChange: -120,
    },
    {
      id: 3,
      player1EloBefore: null,
      player1EloChange: null,
      player2EloBefore: null,
      player2EloChange: null,
    },
  ])
})

it("should rate every player in both systems, starting ELO without results", () => {
  const players = db
    .prepare(
      "select id, elo, classic_elo as classicElo from players order by id",
    )
    .all()

  expect(players).toEqual([
    { id: 1, elo: 1120, classicElo: 1016 },
    { id: 2, elo: 1000, classicElo: 1001 },
    { id: 3, elo: 880, classicElo: 983 },
    { id: 4, elo: STARTING_ELO, classicElo: STARTING_ELO },
  ])
})
