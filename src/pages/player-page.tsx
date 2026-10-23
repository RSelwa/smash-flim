import { useQuery } from "@tanstack/react-query"
import { useParams } from "react-router"
import { CHARACTERS } from "@server/characters.ts"
import { MATCH_STATUS, STARTING_ELO } from "@server/constants.ts"
import { Area } from "@/components/dither-kit/area"
import { AreaChart } from "@/components/dither-kit/area-chart"
import { type ChartConfig } from "@/components/dither-kit/chart-context"
import { Grid } from "@/components/dither-kit/grid"
import { Tooltip } from "@/components/dither-kit/tooltip"
import { XAxis } from "@/components/dither-kit/x-axis"
import { YAxis } from "@/components/dither-kit/y-axis"
import { EditPlayerDialog } from "@/components/edit-player-dialog"
import { PlayerAvatar } from "@/components/player-avatar"
import { PlayerLink } from "@/components/player-link"
import { UndoResultButton } from "@/components/undo-result-button"
import { Badge } from "@/components/ui/badge"
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
import { formatDate, formatEloDelta, formatWinRate } from "@/lib/format"
import { getEloFloor } from "@/lib/get-elo-floor"
import { isCompletedMatch } from "@/lib/is-completed-match"
import { matchesQuery, playersQuery } from "@/lib/queries"

const chartConfig = {
  elo: { label: "ELO", color: "blue" },
} satisfies ChartConfig

export const PlayerPage = () => {
  const { id = "" } = useParams()
  const { data: players = [], isPending } = useQuery(playersQuery)
  const playerIndex = players.findIndex((player) => String(player.id) === id)
  const player = players[playerIndex]
  const { data: matches = [] } = useQuery({
    ...matchesQuery({ playerId: id, status: MATCH_STATUS.completed }),
    enabled: player !== undefined,
  })

  if (isPending) return null

  if (!player) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Player not found</EmptyTitle>
          <EmptyDescription>This fighter left the arena.</EmptyDescription>
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
    const eloDelta = hasWon ? match.eloChange : -match.eloChange
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
          <h1 className="font-heading text-2xl font-semibold">{player.name}</h1>
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
              <dd className="text-xl font-semibold tabular-nums">{value}</dd>
            </CardContent>
          </Card>
        ))}
      </dl>

      <Card className="overflow-visible">
        <CardHeader>
          <CardTitle>ELO over time</CardTitle>
          <CardDescription>After each match</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <AreaChart data={chartRows} config={chartConfig}>
              <Grid />
              <XAxis dataKey="game" />
              <YAxis tickFormatter={formatElo} />
              <Tooltip labelKey="label" valueFormatter={formatElo} />
              <Area dataKey="elo" />
            </AreaChart>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Matches</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No match played yet.
            </p>
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
                      <TableCell>
                        <Badge variant={hasWon ? "default" : "destructive"}>
                          {hasWon ? "Win" : "Loss"}
                        </Badge>
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
