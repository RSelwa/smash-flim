import { type DatabaseSync } from "node:sqlite"
import { z } from "zod"
import { STARTING_ELO } from "./constants.ts"
import { replayClassicElo } from "./replay-classic-elo.ts"
import { replayElo } from "./replay-elo.ts"
import { playedMatchSchema } from "./schemas.ts"

const SELECT_PLAYED_MATCHES = `
  select
    id,
    player1_id as player1Id,
    player2_id as player2Id,
    winner_id as winnerId,
    played_at as playedAt
  from matches
  where winner_id is not null
  order by played_at, id
`

const UPDATE_ELO_SNAPSHOT = `
  update matches set
    player1_elo_before = :player1EloBefore,
    player2_elo_before = :player2EloBefore,
    player1_elo_change = :player1EloChange,
    player2_elo_change = :player2EloChange
  where id = :id
`

export const rebuildElo = (db: DatabaseSync) => {
  const matches = z
    .array(playedMatchSchema)
    .parse(db.prepare(SELECT_PLAYED_MATCHES).all())
  const updateEloSnapshot = db.prepare(UPDATE_ELO_SNAPSHOT)
  const setElo = db.prepare("update players set elo = ? where id = ?")
  const setClassicElo = db.prepare(
    "update players set classic_elo = ? where id = ?",
  )
  const elosAfterEachMatch = replayElo(matches)

  matches.forEach(({ id, player1Id, player2Id }, index) => {
    const elosBefore =
      elosAfterEachMatch[index - 1] ?? new Map<number, number>()
    const elosAfter = elosAfterEachMatch[index]
    const player1EloBefore = elosBefore.get(player1Id) ?? STARTING_ELO
    const player2EloBefore = elosBefore.get(player2Id) ?? STARTING_ELO
    const player1EloAfter = elosAfter.get(player1Id) ?? STARTING_ELO
    const player2EloAfter = elosAfter.get(player2Id) ?? STARTING_ELO
    updateEloSnapshot.run({
      id,
      player1EloBefore,
      player2EloBefore,
      player1EloChange: player1EloAfter - player1EloBefore,
      player2EloChange: player2EloAfter - player2EloBefore,
    })
  })

  db.prepare("update players set elo = ?, classic_elo = ?").run(
    STARTING_ELO,
    STARTING_ELO,
  )
  elosAfterEachMatch.at(-1)?.forEach((elo, playerId) => {
    setElo.run(elo, playerId)
  })
  replayClassicElo(matches)
    .at(-1)
    ?.forEach((classicElo, playerId) => {
      setClassicElo.run(classicElo, playerId)
    })
}
