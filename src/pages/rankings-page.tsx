import { useQuery } from "@tanstack/react-query"
import {
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts"
import { MATCH_STATUS } from "@server/constants.ts"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import { getPlayerDataKey, getRankHistory } from "@/lib/get-rank-history"
import { isCompletedMatch } from "@/lib/is-completed-match"
import { matchesQuery, playersQuery } from "@/lib/queries"

const SERIES_COLORS = [
  { light: "#2a78d6", dark: "#3987e5" },
  { light: "#eb6834", dark: "#d95926" },
  { light: "#1baf7a", dark: "#199e70" },
  { light: "#eda100", dark: "#c98500" },
  { light: "#e87ba4", dark: "#d55181" },
  { light: "#008300", dark: "#008300" },
  { light: "#6250d6", dark: "#9085e9" },
  { light: "#e34948", dark: "#e66767" },
]
const OVERFLOW_SERIES_COLOR = "var(--muted-foreground)"
const NAME_LABEL_WIDTH = 96

export const RankingsPage = () => {
  const { data: players = [], isPending: isPlayersPending } =
    useQuery(playersQuery)
  const { data: matches = [], isPending: isMatchesPending } = useQuery(
    matchesQuery({ status: MATCH_STATUS.completed }),
  )

  const isPending = isPlayersPending || isMatchesPending
  if (isPending) return null

  const rankHistory = getRankHistory(players, matches.filter(isCompletedMatch))
  const latestSnapshot = rankHistory.at(-1)
  const rankedPlayers = players.filter(
    ({ id }) => latestSnapshot?.[getPlayerDataKey(id)] !== undefined,
  )
  const rankTicks = rankedPlayers.map((_, index) => index + 1)
  const chartConfig = Object.fromEntries(
    players
      .toSorted((a, b) => a.id - b.id)
      .map((player, index) => {
        const theme = SERIES_COLORS[index]
        const seriesConfig = theme
          ? { label: player.name, theme }
          : { label: player.name, color: OVERFLOW_SERIES_COLOR }
        return [getPlayerDataKey(player.id), seriesConfig] as const
      }),
  ) satisfies ChartConfig

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ranking over time</CardTitle>
        <CardDescription>Leaderboard position after each match</CardDescription>
      </CardHeader>
      <CardContent>
        {rankHistory.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>No ranking yet</EmptyTitle>
              <EmptyDescription>
                Report a match to start the chart.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-96 w-full"
          >
            <LineChart
              data={rankHistory}
              margin={{ left: 0, right: NAME_LABEL_WIDTH }}
            >
              <CartesianGrid vertical={false} />
              <XAxis dataKey="match" tickLine={false} axisLine={false} />
              <YAxis
                reversed
                width={32}
                tickLine={false}
                axisLine={false}
                domain={[1, rankedPlayers.length]}
                ticks={rankTicks}
                tickFormatter={(rank) => `#${rank}`}
              />
              <ChartTooltip
                content={({ active, label, payload }) => (
                  <ChartTooltipContent
                    active={active}
                    payload={payload.toSorted(
                      (a, b) => Number(a.value) - Number(b.value),
                    )}
                    labelFormatter={() => `Match ${label}`}
                  />
                )}
              />
              <ChartLegend
                content={<ChartLegendContent className="flex-wrap" />}
              />
              {rankedPlayers.map((player) => {
                const dataKey = getPlayerDataKey(player.id)
                return (
                  <Line
                    key={dataKey}
                    dataKey={dataKey}
                    name={player.name}
                    type="bumpX"
                    stroke={`var(--color-${dataKey})`}
                    strokeWidth={2}
                    dot={false}
                  >
                    <LabelList
                      dataKey={({ match }) =>
                        match === latestSnapshot?.match
                          ? player.name
                          : undefined
                      }
                      position="right"
                      className="fill-foreground"
                    />
                  </Line>
                )
              })}
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
