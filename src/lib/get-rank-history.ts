import { type Player } from "@server/schemas.ts"
import { type EloSnapshot } from "@/lib/get-elo-history"

type RankSnapshot = Record<string, number> & { match: number }

export const getPlayerDataKey = (playerId: number) => `player-${playerId}`

export const getRankHistory = (players: Player[], eloHistory: EloSnapshot[]) =>
  eloHistory.map((snapshot): RankSnapshot => {
    const getElo = ({ id }: Player) => snapshot[getPlayerDataKey(id)]
    const ranks = players
      .filter((player) => getElo(player) !== undefined)
      .toSorted((a, b) => getElo(b) - getElo(a) || a.name.localeCompare(b.name))
      .map(
        ({ id }, rankIndex) => [getPlayerDataKey(id), rankIndex + 1] as const,
      )
    return { match: snapshot.match, ...Object.fromEntries(ranks) }
  })
