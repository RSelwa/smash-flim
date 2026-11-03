import { useQuery } from "@tanstack/react-query"
import { Trophy } from "lucide-react"
import { generatePath, Link, useParams } from "react-router"
import { CHARACTERS } from "@server/characters.ts"
import { MATCH_STATUS, STARTING_ELO } from "@server/constants.ts"
import { EditPlayerDialog } from "@/components/edit-player-dialog"
import { LineChart } from "@/components/line-chart"
import { PlayerAvatar } from "@/components/player-avatar"
import { PlayerLink } from "@/components/player-link"
import { UndoResultButton } from "@/components/undo-result-button"
import {
  Card,
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
import {
  formatDate,
  formatDay,
  formatEloDelta,
  formatWinRate,
} from "@/lib/format"
import { getChampionId } from "@/lib/get-champion-id"
import { getEloFloor } from "@/lib/get-elo-floor"
import { getSeriesColor } from "@/lib/get-series-color"
import { isCompletedMatch } from "@/lib/is-completed-match"
import { matchesQuery, playersQuery, tournamentsQuery } from "@/lib/queries"

export const PlayerPage = () => {
  const { id = "" } = useParams()
  const { data: players = [], isPending } = useQuery(playersQuery)
  const playerIndex = players.findIndex((player) => String(player.id) === id)
  const player = players[playerIndex]
  const { data: matches = [] } = useQuery({
    ...matchesQuery({ playerId: id, status: MATCH_STATUS.completed }),
    enabled: player !== undefined,
  })
  const { data: tournaments = [] } = useQuery(tournamentsQuery)

  if (isPending) return null

  if (!player) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Player not found</EmptyTitle>
          <EmptyDescription>This fighter left the arena</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  const history = matches.filter(isCompletedMatch).map((match) => {
    const isPlayer1 = match.player1Id === player.id
    const eloBefore = isPlayer1
      ? match.player1EloBefore
      : match.player2EloBefore
    const hasWon = match.winnerId === player.id
    const eloDelta = isPlayer1 ? match.player1EloChange : match.player2EloChange
    return {
      match,
      hasWon,
      eloDelta,
      eloAfter: eloBefore + eloDelta,
      opponent: isPlayer1
        ? {
            id: match.player2Id,
            name: match.player2Name,
            character: match.player2Character,
          }
        : {
            id: match.player1Id,
            name: match.player1Name,
            character: match.player1Character,
          },
    }
  })
  const chartData = [
    { game: 0, elo: STARTING_ELO },
    ...history
      .toReversed()
      .map(({ eloAfter }, index) => ({ game: index + 1, elo: eloAfter })),
  ]
  const mainName = CHARACTERS.find(({ id }) => id === player.character)?.name
  const wonTournaments = tournaments.filter(
    ({ rounds }) => getChampionId(rounds) === player.id,
  )
  const elos = chartData.map(({ elo }) => elo)
  const peakElo = Math.max(...elos)
  const eloFloor = getEloFloor(elos)
  const chartRows = chartData.map(({ game, elo }) => ({
    game,
    label: `Match ${game}`,
    elo: elo - eloFloor,
  }))
  const formatElo = (value: number) => String(value + eloFloor)
  const stats = [
    { label: "ELO", value: player.elo },
    { label: "Rank", value: `#${playerIndex + 1} / ${players.length}` },
    { label: "Peak", value: peakElo },
    { label: "W–L", value: `${player.wins}–${player.losses}` },
    { label: "Win rate", value: formatWinRate(player) },
  ]

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center gap-4">
        <PlayerAvatar
          name={player.name}
          character={player.character}
          className="size-20"
        />
        <div className="grid gap-1">
          <h1 className="font-heading text-2xl font-medium">{player.name}</h1>
          <p className="text-sm text-muted-foreground">
            Main: {mainName ?? "none yet"}
          </p>
        </div>
        <div className="ml-auto">
          <EditPlayerDialog player={player} />
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {stats.map(({ label, value }) => (
          <Card key={label} size="sm">
            <CardContent>
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="text-xl font-medium tabular-nums">{value}</dd>
            </CardContent>
          </Card>
        ))}
      </dl>

      {wonTournaments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Trophies</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-wrap gap-3">
              {wonTournaments.map((tournament) => (
                <li key={tournament.id}>
                  <Link
                    to={generatePath(ROUTE_PATH.tournament, {
                      id: String(tournament.id),
                    })}
                    className="grid w-28 justify-items-center gap-1 rounded-lg border p-3 text-center transition-colors hover:bg-muted"
                  >
                    <Trophy className="mb-1 size-10 text-amber-400" />
                    <span className="text-sm font-medium">
                      Tournament #{tournament.id}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDay(tournament.createdAt)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card className="overflow-visible">
        <CardHeader>
          <CardTitle>ELO over time</CardTitle>
          <CardDescription>After each match</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <LineChart
              data={chartRows}
              series={[
                {
                  dataKey: "elo",
                  label: "ELO",
                  color: getSeriesColor(playerIndex),
                },
              ]}
              xKey="game"
              formatValue={formatElo}
              hasArea
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Matches</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">No match played yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Played</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>Opponent</TableHead>
                  <TableHead className="text-right">ELO</TableHead>
                  <TableHead>
                    <span className="sr-only">Undo</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map(
                  ({ match, hasWon, eloDelta, eloAfter, opponent }) => (
                    <TableRow key={match.id}>
                      <TableCell className="text-muted-foreground">
                        {formatDate(match.playedAt)}
                      </TableCell>
                      <TableCell
                        className={
                          hasWon
                            ? "text-green-700 dark:text-green-400"
                            : "text-destructive"
                        }
                      >
                        {hasWon ? "Win" : "Loss"}
                      </TableCell>
                      <TableCell>
                        <PlayerLink {...opponent} />
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {eloAfter}{" "}
                        <span className="text-muted-foreground">
                          ({formatEloDelta(eloDelta)})
                        </span>
                      </TableCell>
                      <TableCell className="w-0">
                        <UndoResultButton matchId={match.id} />
                      </TableCell>
                    </TableRow>
                  ),
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
