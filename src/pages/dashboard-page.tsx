import { useMutation, useQuery } from "@tanstack/react-query"
import { parseResponse } from "hono/client"
import { X } from "lucide-react"
import { Link } from "react-router"
import { toast } from "sonner"
import { MATCH_STATUS } from "@server/constants.ts"
import { getEloChange } from "@server/elo.ts"
import { MatchArena } from "@/components/match-arena"
import { MatchHistoryTable } from "@/components/match-history-table"
import { PlayerAvatar } from "@/components/player-avatar"
import { PlayerLink } from "@/components/player-link"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ROUTE_PATH } from "@/constants/routes"
import { client } from "@/lib/api"
import { formatWinRate } from "@/lib/format"
import { isCompletedMatch } from "@/lib/is-completed-match"
import { matchesQuery, playersQuery } from "@/lib/queries"

const PODIUM = ["🥇", "🥈", "🥉"]
const RECENT_MATCHES_LIMIT = 8

type WinnerVariables = {
  matchId: number
  winnerId: number
}

export const DashboardPage = () => {
  const { data: players = [] } = useQuery(playersQuery)
  const { data: pendingMatches = [] } = useQuery(
    matchesQuery({ status: MATCH_STATUS.pending }),
  )
  const { data: recentMatches = [] } = useQuery(
    matchesQuery({
      status: MATCH_STATUS.completed,
      limit: String(RECENT_MATCHES_LIMIT),
    }),
  )

  const setWinner = useMutation({
    mutationFn: ({ matchId, winnerId }: WinnerVariables) =>
      parseResponse(
        client.api.matches[":id"].winner.$post({
          param: { id: String(matchId) },
          json: { winnerId },
        }),
      ),
    onSuccess: (match) => {
      const isPlayer1Winner = match.winnerId === match.player1Id
      const winnerName = isPlayer1Winner ? match.player1Name : match.player2Name
      toast.success(`${winnerName} wins! +${match.eloChange} ELO`)
    },
  })

  const cancelMatch = useMutation({
    mutationFn: (matchId: number) =>
      parseResponse(
        client.api.matches[":id"].$delete({ param: { id: String(matchId) } }),
      ),
  })

  const isReporting = setWinner.isPending || cancelMatch.isPending

  return (
    <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
      <div className="lg:col-span-2">
        <MatchArena />
      </div>
      <Card className="lg:col-start-2 lg:row-start-2">
        <CardHeader>
          <CardTitle>Ongoing matches</CardTitle>
          <CardDescription>
            Who won? The button shows the ELO at stake.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingMatches.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No match in progress. Start one in the arena.
            </p>
          ) : (
            <ul className="grid gap-3">
              {pendingMatches.map((match) => {
                const fighters = [
                  {
                    id: match.player1Id,
                    name: match.player1Name,
                    character: match.player1Character,
                    elo: match.player1Elo,
                    opponentElo: match.player2Elo,
                  },
                  {
                    id: match.player2Id,
                    name: match.player2Name,
                    character: match.player2Character,
                    elo: match.player2Elo,
                    opponentElo: match.player1Elo,
                  },
                ]
                return (
                  <li
                    key={match.id}
                    className="grid gap-2 rounded-lg border p-3"
                  >
                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-sm">
                      {fighters.map((fighter) => (
                        <span
                          key={fighter.id}
                          className="flex min-w-0 items-center gap-2 font-medium even:flex-row-reverse even:text-right"
                        >
                          <PlayerAvatar
                            name={fighter.name}
                            character={fighter.character}
                          />
                          <span className="truncate">
                            {fighter.name}{" "}
                            <span className="text-muted-foreground tabular-nums">
                              {fighter.elo}
                            </span>
                          </span>
                        </span>
                      ))}
                      <span className="col-start-2 row-start-1 text-xs text-muted-foreground uppercase">
                        vs
                      </span>
                    </div>
                    <div className="flex gap-2">
                      {fighters.map((fighter) => (
                        <Button
                          key={fighter.id}
                          size="sm"
                          variant="secondary"
                          className="min-w-0 flex-1"
                          disabled={isReporting}
                          onClick={() =>
                            setWinner.mutate({
                              matchId: match.id,
                              winnerId: fighter.id,
                            })
                          }
                        >
                          <span className="truncate">{fighter.name} won</span>
                          <span className="text-muted-foreground tabular-nums">
                            +{getEloChange(fighter.elo, fighter.opponentElo)}
                          </span>
                        </Button>
                      ))}
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label="Cancel match"
                        disabled={isReporting}
                        onClick={() => cancelMatch.mutate(match.id)}
                      >
                        <X />
                      </Button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-start-1 lg:row-span-2 lg:row-start-2">
        <CardHeader>
          <CardTitle>Leaderboard</CardTitle>
          <CardDescription>
            {players.length} fighters ranked by ELO
          </CardDescription>
        </CardHeader>
        <CardContent>
          {players.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>No fighters yet</EmptyTitle>
                <EmptyDescription>
                  Add players to start the ladder.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Player</TableHead>
                  <TableHead className="text-right">ELO</TableHead>
                  <TableHead className="text-right">W–L</TableHead>
                  <TableHead className="text-right">Win rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {players.map((player, index) => (
                  <TableRow key={player.id}>
                    <TableCell className="tabular-nums">
                      {PODIUM[index] ?? index + 1}
                    </TableCell>
                    <TableCell>
                      <PlayerLink
                        id={player.id}
                        name={player.name}
                        character={player.character}
                      />
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {player.elo}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground tabular-nums">
                      {player.wins}–{player.losses}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground tabular-nums">
                      {formatWinRate(player)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-start-2 lg:row-start-3">
        <CardHeader>
          <CardTitle>Recent results</CardTitle>
          <CardAction>
            <Button asChild variant="link" size="sm">
              <Link to={ROUTE_PATH.matches}>View all</Link>
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <MatchHistoryTable matches={recentMatches.filter(isCompletedMatch)} />
        </CardContent>
      </Card>
    </div>
  )
}
