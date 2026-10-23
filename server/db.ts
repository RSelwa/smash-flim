import { DatabaseSync } from "node:sqlite"
import { z } from "zod"
import { SQL_NOW } from "./constants.ts"

const MIGRATIONS = [
  `
  create table if not exists players (
    id integer primary key,
    name text not null unique collate nocase,
    elo integer not null,
    created_at text not null default (${SQL_NOW})
  );

  create table if not exists matches (
    id integer primary key,
    player1_id integer not null references players (id),
    player2_id integer not null references players (id),
    winner_id integer references players (id),
    player1_elo_before integer,
    player2_elo_before integer,
    elo_change integer,
    created_at text not null default (${SQL_NOW}),
    played_at text,
    check (player1_id <> player2_id),
    check (winner_id is null or winner_id in (player1_id, player2_id))
  );

  create index if not exists matches_player1_id on matches (player1_id);
  create index if not exists matches_player2_id on matches (player2_id);
  `,
  "alter table players add column character text",
  `
  create table tournaments (
    id integer primary key,
    created_at text not null default (${SQL_NOW})
  );

  create table tournament_slots (
    tournament_id integer not null references tournaments (id),
    slot integer not null,
    player_id integer references players (id),
    primary key (tournament_id, slot),
    unique (tournament_id, player_id)
  );

  alter table matches add column tournament_id integer references tournaments (id);
  alter table matches add column tournament_round integer;
  alter table matches add column tournament_position integer;

  create unique index matches_tournament_node
    on matches (tournament_id, tournament_round, tournament_position);
  `,
]

const userVersionSchema = z.object({ user_version: z.number() })

export const openDatabase = (location: string) => {
  const db = new DatabaseSync(location)
  db.exec("pragma journal_mode = wal")

  const { user_version: appliedCount } = userVersionSchema.parse(
    db.prepare("pragma user_version").get(),
  )
  MIGRATIONS.slice(appliedCount).forEach((migration, index) => {
    db.exec(
      `begin; ${migration}; pragma user_version = ${appliedCount + index + 1}; commit;`,
    )
  })

  return db
}
