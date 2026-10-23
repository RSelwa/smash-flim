import { useState } from "react"
import { DragDropProvider, useDroppable } from "@dnd-kit/react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { type InferRequestType, parseResponse } from "hono/client"
import { Shuffle, X } from "lucide-react"
import { generatePath, Link, useNavigate } from "react-router"
import { toast } from "sonner"
import { MIN_TOURNAMENT_PLAYERS } from "@server/constants.ts"
import type { Player } from "@server/schemas.ts"
import { DraggableFighter } from "@/components/draggable-fighter"
import { PlayerAvatar } from "@/components/player-avatar"
import { PlayerLink } from "@/components/player-link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import { client } from "@/lib/api"
import { formatDate } from "@/lib/format"
import { getChampionId } from "@/lib/get-champion-id"
import { playersQuery, tournamentsQuery } from "@/lib/queries"

const PARTICIPANTS_ZONE_ID = "participants"

type ParticipantsZoneProps = {
  participants: Player[]
  onRemove: (playerId: number) => void
}

const ParticipantsZone = ({
  participants,
  onRemove,
}: ParticipantsZoneProps) => {
  const { ref, isDropTarget } = useDroppable({ id: PARTICIPANTS_ZONE_ID })

  return (
    <div
      ref={ref}
      data-drop-target={isDropTarget || undefined}
      className="flex min-h-40 flex-wrap content-start gap-2 rounded-xl border-2 border-dashed p-4 transition-colors data-drop-target:border-primary data-drop-target:bg-primary/5"
    >
      {participants.length === 0 ? (
        <p className="m-auto text-sm text-muted-foreground">
          Drop the participants here
        </p>
      ) : (
        participants.map((player) => (
          <span
            key={player.id}
            className="flex items-center gap-2 rounded-full border bg-background p-1 text-sm font-medium shadow-xs"
          >
            <PlayerAvatar name={player.name} character={player.character} />
            {player.name}
            <span className="text-xs text-muted-foreground tabular-nums">
              {player.elo}
            </span>
            <Button
              size="icon-xs"
              variant="ghost"
              aria-label={`Remove ${player.name}`}
              onClick={() => onRemove(player.id)}
            >
              <X />
            </Button>
          </span>
        ))
      )}
    </div>
  )
}

export const TournamentsPage = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: players = [] } = useQuery(playersQuery)
  const { data: tournaments = [] } = useQuery(tournamentsQuery)
  const [participantIds, setParticipantIds] = useState<number[]>([])

  const createTournament = useMutation({
    mutationFn: (
      json: InferRequestType<typeof client.api.tournaments.$post>["json"],
    ) => parseResponse(client.api.tournaments.$post({ json })),
    onSuccess: (tournament) => {
      queryClient.setQueryData(tournamentsQuery.queryKey, (current = []) => [
        tournament,
        ...current,
      ])
      toast.success("Bracket drawn, fight!")
      void navigate(
        generatePath(ROUTE_PATH.tournament, { id: String(tournament.id) }),
      )
    },
  })

  const findPlayer = (playerId: number | null) =>
    players.find((player) => player.id === playerId)
  const participants = players.filter(({ id }) => participantIds.includes(id))
  const hasEnoughParticipants = participants.length >= MIN_TOURNAMENT_PLAYERS
  const canDraw = hasEnoughParticipants && !createTournament.isPending

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>New tournament</CardTitle>
          <CardDescription>
            Drag the participants in, then draw the bracket. The best ELO are
            seeded and get the byes, the rest is drawn at random.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <DragDropProvider
            onDragEnd={({ canceled, operation: { source, target } }) => {
              const isDroppedOnParticipants =
                !canceled && target?.id === PARTICIPANTS_ZONE_ID
              if (!isDroppedOnParticipants || !source) return
              setParticipantIds((current) => [...current, Number(source.id)])
            }}
          >
            <ParticipantsZone
              participants={participants}
              onRemove={(playerId) =>
                setParticipantIds((current) =>
                  current.filter((id) => id !== playerId),
                )
              }
            />
            {players.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No fighters yet. Add players with “New player”.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {players.map((player) => (
                  <DraggableFighter
                    key={player.id}
                    player={player}
                    disabled={participantIds.includes(player.id)}
                  />
                ))}
              </div>
            )}
          </DragDropProvider>
          <Button
            size="lg"
            className="justify-self-center"
            disabled={!canDraw}
            onClick={() =>
              createTournament.mutate({ playerIds: participantIds })
            }
          >
            <Shuffle data-icon="inline-start" />
            Draw bracket
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tournaments</CardTitle>
        </CardHeader>
        <CardContent>
          {tournaments.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>No tournament yet</EmptyTitle>
                <EmptyDescription>
                  Draw a bracket to start the first one.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tournament</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Champion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tournaments.map((tournament) => {
                  const champion = findPlayer(getChampionId(tournament.rounds))
                  return (
                    <TableRow key={tournament.id}>
                      <TableCell>
                        <Link
                          to={generatePath(ROUTE_PATH.tournament, {
                            id: String(tournament.id),
                          })}
                          className="font-medium underline-offset-4 hover:underline"
                        >
                          Tournament #{tournament.id}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(tournament.createdAt)}
                      </TableCell>
                      <TableCell>
                        {champion ? (
                          <PlayerLink
                            id={champion.id}
                            name={champion.name}
                            character={champion.character}
                          />
                        ) : (
                          <Badge variant="secondary">In progress</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
