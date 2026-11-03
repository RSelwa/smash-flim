import { type ReactNode, useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { MATCH_STATUS, STARTING_ELO } from "@server/constants.ts"
import { replayClassicElo } from "@server/replay-classic-elo.ts"
import { replayElo } from "@server/replay-elo.ts"
import type { Player } from "@server/schemas.ts"
import { LineChart } from "@/components/line-chart"
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
import { getEloFloor } from "@/lib/get-elo-floor"
import { getEloHistory } from "@/lib/get-elo-history"
import { getHiddenPlayerIds } from "@/lib/get-hidden-player-ids"
import { getPlayDays } from "@/lib/get-play-days"
import { getPlayerDataKey, getRankHistory } from "@/lib/get-rank-history"
import { getSeriesColor } from "@/lib/get-series-color"
import { isCompletedMatch } from "@/lib/is-completed-match"
import { matchesQuery, playersQuery } from "@/lib/queries"

type Snapshot = Record<string, number> & { match: number }

const toChartRow = (
  snapshot: Snapshot,
  label: string,
  dataKeys: string[],
  toValue: (value: number | undefined) => number,
) => ({
  match: snapshot.match,
  label,
  ...Object.fromEntries(dataKeys.map((key) => [key, toValue(snapshot[key])])),
})

type ChartToggleButtonProps = {
  isPressed: boolean
  onClick: () => void
  children: ReactNode
}

const ChartToggleButton = ({
  isPressed,
  onClick,
  children,
}: ChartToggleButtonProps) => (
  <Button
    variant="ghost"
    size="xs"
    aria-pressed={isPressed}
    onClick={onClick}
    className="text-muted-foreground aria-pressed:bg-muted aria-pressed:text-foreground"
  >
    {children}
  </Button>
)

type PlayerLegendProps = {
  players: Player[]
  getPlayerColor: (playerId: number) => string
  hiddenPlayerIds: number[]
  onToggle: (playerId: number) => void
}

const PlayerLegend = ({
  players,
  getPlayerColor,
  hiddenPlayerIds,
  onToggle,
}: PlayerLegendProps) => (
  <div className="flex flex-wrap items-center justify-center gap-1 pt-4">
    {players.map((player) => (
      <button
        key={player.id}
        type="button"
        aria-pressed={!hiddenPlayerIds.includes(player.id)}
        onClick={() => onToggle(player.id)}
        className="group flex items-center gap-2 rounded-md px-2 py-1 text-sm transition-colors hover:bg-muted aria-[pressed=false]:text-muted-foreground aria-[pressed=false]:line-through"
      >
        <span
          className="size-2 shrink-0 rounded-full group-aria-[pressed=false]:opacity-30"
          style={{ backgroundColor: getPlayerColor(player.id) }}
        />
        {player.name}
      </button>
    ))}
  </div>
)

export const RankingsPage = () => {
  const { data: players = [], isPending: isPlayersPending } =
    useQuery(playersQuery)
  const { data: matches = [], isPending: isMatchesPending } = useQuery(
    matchesQuery({ status: MATCH_STATUS.completed }),
  )
  const [toggledPlayerIds, setToggledPlayerIds] = useState<number[]>([])
  const [isByDate, setIsByDate] = useState(false)
  const [isClassicElo, setIsClassicElo] = useState(false)

  const {
    chartPlayers,
    visiblePlayers,
    hiddenPlayerIds,
    rankRows,
    eloRows,
    eloFloor,
  } = useMemo(() => {
    const completedMatches = matches.filter(isCompletedMatch)
    const eloHistory = getEloHistory(
      players,
      completedMatches,
      isClassicElo ? replayClassicElo : replayElo,
    )
    const latestSnapshot = eloHistory.at(-1)
    const chartPlayers = players.filter(
      ({ id }) => latestSnapshot?.[getPlayerDataKey(id)] !== undefined,
    )
    const hiddenPlayerIds = getHiddenPlayerIds(chartPlayers, toggledPlayerIds)
    const visiblePlayers = chartPlayers.filter(
      ({ id }) => !hiddenPlayerIds.includes(id),
    )
    const rankHistory = getRankHistory(visiblePlayers, eloHistory)
    const points = isByDate
      ? getPlayDays(completedMatches)
      : eloHistory.map(({ match }, snapshotIndex) => ({
          label: `Match ${match}`,
          snapshotIndex,
        }))
    const dataKeys = visiblePlayers.map(({ id }) => getPlayerDataKey(id))
    const eloFloor = getEloFloor(
      points.flatMap(({ snapshotIndex }) =>
        dataKeys.map((key) => eloHistory[snapshotIndex][key] ?? STARTING_ELO),
      ),
    )
    return {
      chartPlayers,
      visiblePlayers,
      hiddenPlayerIds,
      eloFloor,
      rankRows: points.map(({ label, snapshotIndex }) =>
        toChartRow(rankHistory[snapshotIndex], label, dataKeys, (rank) =>
          rank === undefined ? 0 : visiblePlayers.length + 1 - rank,
        ),
      ),
      eloRows: points.map(({ label, snapshotIndex }) =>
        toChartRow(
          eloHistory[snapshotIndex],
          label,
          dataKeys,
          (elo) => (elo ?? STARTING_ELO) - eloFloor,
        ),
      ),
    }
  }, [players, matches, toggledPlayerIds, isByDate, isClassicElo])

  const isPending = isPlayersPending || isMatchesPending
  if (isPending) return null

  const rankCount = visiblePlayers.length
  const getPlayerColor = (playerId: number) =>
    getSeriesColor(players.findIndex(({ id }) => id === playerId))
  const series = visiblePlayers.map((player) => ({
    dataKey: getPlayerDataKey(player.id),
    label: player.name,
    color: getPlayerColor(player.id),
  }))

  const formatRank = (value: number) => {
    const isRank = Number.isInteger(value) && value >= 1 && value <= rankCount
    return isRank ? `#${rankCount + 1 - value}` : ""
  }
  const formatElo = (value: number) => String(value + eloFloor)

  const togglePlayer = (playerId: number) =>
    setToggledPlayerIds((current) =>
      current.includes(playerId)
        ? current.filter((id) => id !== playerId)
        : [...current, playerId],
    )

  const xAxisKey = isByDate ? "label" : "match"
  const snapshotMoment = isByDate
    ? "at the end of each day"
    : "after each match"
  const chartToggles = (
    <CardAction className="flex flex-wrap justify-end gap-x-3 gap-y-1">
      <div className="flex gap-1">
        <ChartToggleButton
          isPressed={!isClassicElo}
          onClick={() => setIsClassicElo(false)}
        >
          New ELO
        </ChartToggleButton>
        <ChartToggleButton
          isPressed={isClassicElo}
          onClick={() => setIsClassicElo(true)}
        >
          Classic ELO
        </ChartToggleButton>
      </div>
      <div className="flex gap-1">
        <ChartToggleButton
          isPressed={!isByDate}
          onClick={() => setIsByDate(false)}
        >
          By match
        </ChartToggleButton>
        <ChartToggleButton
          isPressed={isByDate}
          onClick={() => setIsByDate(true)}
        >
          By date
        </ChartToggleButton>
      </div>
    </CardAction>
  )

  const playerLegend = (
    <PlayerLegend
      players={chartPlayers}
      getPlayerColor={getPlayerColor}
      hiddenPlayerIds={hiddenPlayerIds}
      onToggle={togglePlayer}
    />
  )

  return (
    <div className="grid gap-6">
      <Card className="overflow-visible">
        <CardHeader>
          <CardTitle>Ranking over time</CardTitle>
          <CardDescription>
            Leaderboard position {snapshotMoment}. Click a name to leave it out
            of the ranking.
          </CardDescription>
          {chartToggles}
        </CardHeader>
        <CardContent>
          {rankRows.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>No ranking yet</EmptyTitle>
                <EmptyDescription>
                  Report a match to start the chart
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <>
              <div className="h-96">
                <LineChart
                  data={rankRows}
                  series={series}
                  xKey={xAxisKey}
                  formatValue={formatRank}
                  yTickCount={rankCount}
                  hasEndLabels
                />
              </div>
              {playerLegend}
            </>
          )}
        </CardContent>
      </Card>
      {eloRows.length > 0 && (
        <Card className="overflow-visible">
          <CardHeader>
            <CardTitle>ELO over time</CardTitle>
            <CardDescription>
              Rating {snapshotMoment}, to see the gaps. Click a name to hide it.
            </CardDescription>
            {chartToggles}
          </CardHeader>
          <CardContent>
            <div className="h-96">
              <LineChart
                data={eloRows}
                series={series}
                xKey={xAxisKey}
                formatValue={formatElo}
              />
            </div>
            {playerLegend}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
