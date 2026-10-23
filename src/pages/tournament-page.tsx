import { useMutation, useQuery } from "@tanstack/react-query"
import { parseResponse } from "hono/client"
import { useParams } from "react-router"
import { toast } from "sonner"
import type { BracketNode } from "@server/bracket.ts"
import { getEloChange } from "@server/elo.ts"
import type { Player } from "@server/schemas.ts"
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
import { client } from "@/lib/api"
import { formatDate } from "@/lib/format"
import { getChampionId } from "@/lib/get-champion-id"
import { playersQuery, tournamentsQuery } from "@/lib/queries"

const ROUND_LABELS_FROM_FINAL = ["Final", "Semifinals", "Quarterfinals"]
const BYE_LABEL = "Bye"
const TO_BE_DECIDED_LABEL = "TBD"

type WinnerVariables = {
  matchId: number
  winnerId: number
}

const getRoundLabel = (round: number, roundCount: number) =>
  ROUND_LABELS_FROM_FINAL[roundCount - 1 - round] ?? `Round ${round + 1}`

type BracketMatchCardProps = {
  node: BracketNode
  player1: Player | undefined
  player2: Player | undefined
  emptyLabel: string
  isReporting: boolean
  onReportWinner: (variables: WinnerVariables) => void
}

const BracketMatchCard = ({
  node: { matchId, winnerId },
  player1,
  player2,
  emptyLabel,
  isReporting,
  onReportWinner,
}: BracketMatchCardProps) => {
  const entrants = [
    { slot: "player1", player: player1, opponent: player2 },
    { slot: "player2", player: player2, opponent: player1 },
  ]
  const hasResult = winnerId !== null

  return (
    <li className="divide-y rounded-lg border bg-background">
      {entrants.map(({ slot, player, opponent }) => {
        if (!player) {
          return (
            <p
              key={slot}
              className="flex h-11 items-center px-2 text-sm text-muted-foreground"
            >
              {emptyLabel}
            </p>
          )
        }

        const isWinner = winnerId === player.id
        const isLoser = hasResult && !isWinner
        const canReport =
          matchId !== null && !hasResult && opponent !== undefined
        return (
          <div
            key={slot}
            data-winner={isWinner || undefined}
            data-loser={isLoser || undefined}
            className="flex h-11 items-center gap-2 px-2 text-sm data-loser:text-muted-foreground data-winner:font-semibold"
          >
            <PlayerAvatar
              name={player.name}
              character={player.character}
              size="sm"
            />
            <span className="min-w-0 flex-1 truncate">{player.name}</span>
            {canReport ? (
              <Button
                size="xs"
                variant="secondary"
                aria-label={`${player.name} won`}
                disabled={isReporting}
                onClick={() => onReportWinner({ matchId, winnerId: player.id })}
              >
                Won
                <span className="text-muted-foreground tabular-nums">
                  +{getEloChange(player.elo, opponent.elo)}
                </span>
              </Button>
            ) : (
              <span className="text-xs text-muted-foreground tabular-nums">
                {player.elo}
              </span>
            )}
          </div>
        )
      })}
    </li>
  )
}

export const TournamentPage = () => {
  const { id = "" } = useParams()
  const { data: tournaments = [], isPending: isTournamentsPending } =
    useQuery(tournamentsQuery)
  const { data: players = [], isPending: isPlayersPending } =
    useQuery(playersQuery)

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

  const isPending = isTournamentsPending || isPlayersPending
  if (isPending) return null

  const tournament = tournaments.find(
    ({ id: tournamentId }) => String(tournamentId) === id,
  )
  if (!tournament) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Tournament not found</EmptyTitle>
          <EmptyDescription>This bracket was never drawn.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  const findPlayer = (playerId: number | null) =>
    players.find((player) => player.id === playerId)
  const champion = findPlayer(getChampionId(tournament.rounds))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tournament #{tournament.id}</CardTitle>
        <CardDescription>
          Started {formatDate(tournament.createdAt)}
        </CardDescription>
        {champion && (
          <CardAction className="flex items-center gap-2">
            🏆
            <PlayerLink
              id={champion.id}
              name={champion.name}
              character={champion.character}
            />
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <div className="grid min-w-max auto-cols-[15rem] grid-flow-col gap-6">
          {tournament.rounds.map((nodes, round) => (
            <section key={round} className="flex flex-col gap-3">
              <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {getRoundLabel(round, tournament.rounds.length)}
              </h2>
              <ul className="flex flex-1 flex-col justify-around gap-4">
                {nodes.map((node) => (
                  <BracketMatchCard
                    key={node.position}
                    node={node}
                    player1={findPlayer(node.player1Id)}
                    player2={findPlayer(node.player2Id)}
                    emptyLabel={round === 0 ? BYE_LABEL : TO_BE_DECIDED_LABEL}
                    isReporting={setWinner.isPending}
                    onReportWinner={setWinner.mutate}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
