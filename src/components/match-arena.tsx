import { useState } from "react"
import { DragDropProvider, useDraggable, useDroppable } from "@dnd-kit/react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { type InferRequestType, parseResponse } from "hono/client"
import { Swords, X } from "lucide-react"
import { toast } from "sonner"
import { getEloChange } from "@server/elo.ts"
import type { Player } from "@server/schemas.ts"
import { PlayerAvatar } from "@/components/player-avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { client } from "@/lib/api"
import { playersQuery } from "@/lib/queries"

const SLOTS = [
  { id: "player1", label: "Player 1", opponentId: "player2" },
  { id: "player2", label: "Player 2", opponentId: "player1" },
] as const

type SlotId = (typeof SLOTS)[number]["id"]

const EMPTY_SLOTS: Record<SlotId, number | null> = {
  player1: null,
  player2: null,
}

type FighterSlotProps = {
  id: SlotId
  label: string
  player: Player | undefined
  opponent: Player | undefined
  onClear: () => void
}

const FighterSlot = ({
  id,
  label,
  player,
  opponent,
  onClear,
}: FighterSlotProps) => {
  const { ref, isDropTarget } = useDroppable({ id })

  return (
    <div
      ref={ref}
      data-drop-target={isDropTarget || undefined}
      className="relative flex min-h-60 flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-6 text-center transition-colors data-drop-target:border-primary data-drop-target:bg-primary/5"
    >
      <span className="absolute top-3 left-4 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </span>
      {player ? (
        <>
          <Button
            size="icon-sm"
            variant="ghost"
            className="absolute top-2 right-2"
            aria-label={`Remove ${player.name}`}
            onClick={onClear}
          >
            <X />
          </Button>
          <PlayerAvatar
            name={player.name}
            character={player.character}
            className="size-24"
          />
          <div>
            <p className="font-heading text-lg font-semibold">{player.name}</p>
            <p className="text-sm text-muted-foreground tabular-nums">
              {player.elo} ELO
            </p>
          </div>
          {opponent && (
            <Badge variant="secondary" className="tabular-nums">
              +{getEloChange(player.elo, opponent.elo)} if wins
            </Badge>
          )}
        </>
      ) : (
        <p className="text-sm text-muted-foreground">Drop a fighter here</p>
      )}
    </div>
  )
}

type DraggableFighterProps = {
  player: Player
  isInArena: boolean
}

const DraggableFighter = ({ player, isInArena }: DraggableFighterProps) => {
  const { ref, isDragging } = useDraggable({
    id: player.id,
    disabled: isInArena,
  })

  return (
    <button
      ref={ref}
      type="button"
      disabled={isInArena}
      data-dragging={isDragging || undefined}
      className="flex cursor-grab touch-none items-center gap-2 rounded-full border bg-background py-1 pr-3 pl-1 text-sm font-medium shadow-xs select-none disabled:cursor-not-allowed disabled:opacity-40 data-dragging:cursor-grabbing data-dragging:shadow-lg"
    >
      <PlayerAvatar name={player.name} character={player.character} />
      {player.name}
      <span className="text-xs text-muted-foreground tabular-nums">
        {player.elo}
      </span>
    </button>
  )
}

export const MatchArena = () => {
  const { data: players = [] } = useQuery(playersQuery)
  const [slots, setSlots] = useState(EMPTY_SLOTS)

  const createMatch = useMutation({
    mutationFn: (
      json: InferRequestType<typeof client.api.matches.$post>["json"],
    ) => parseResponse(client.api.matches.$post({ json })),
    onSuccess: (match) => {
      toast.success(`${match.player1Name} vs ${match.player2Name}, fight!`)
      setSlots(EMPTY_SLOTS)
    },
  })

  const findPlayer = (playerId: number | null) =>
    players.find((player) => player.id === playerId)
  const slotPlayers = {
    player1: findPlayer(slots.player1),
    player2: findPlayer(slots.player2),
  }
  const playersInArena = new Set(Object.values(slots))
  const hasTwoFighters =
    slotPlayers.player1 !== undefined && slotPlayers.player2 !== undefined
  const canStart = hasTwoFighters && !createMatch.isPending

  const handleStart = () => {
    const { player1, player2 } = slotPlayers
    if (!player1 || !player2) return
    createMatch.mutate({ player1Id: player1.id, player2Id: player2.id })
  }

  return (
    <Card className="max-sm:gap-4 max-sm:bg-transparent max-sm:ring-0 max-sm:[--card-spacing:0]">
      <CardHeader>
        <CardTitle>Arena</CardTitle>
        <CardDescription>
          Drag two fighters into the arena, then start the match.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <DragDropProvider
          onDragEnd={({ canceled, operation: { source, target } }) => {
            const slot = SLOTS.find(({ id }) => id === target?.id)
            if (canceled || !source || !slot) return
            setSlots((current) => ({
              ...current,
              [slot.id]: Number(source.id),
            }))
          }}
        >
          <div className="relative grid auto-rows-fr gap-4 sm:grid-cols-2">
            {SLOTS.map(({ id, label, opponentId }) => (
              <FighterSlot
                key={id}
                id={id}
                label={label}
                player={slotPlayers[id]}
                opponent={slotPlayers[opponentId]}
                onClear={() =>
                  setSlots((current) => ({ ...current, [id]: null }))
                }
              />
            ))}
            <span className="pointer-events-none absolute top-1/2 left-1/2 -translate-1/2 rounded-full bg-background px-3 py-1 font-heading text-lg font-bold italic ring-1 ring-border">
              VS
            </span>
          </div>
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
                  isInArena={playersInArena.has(player.id)}
                />
              ))}
            </div>
          )}
        </DragDropProvider>
        <Button
          size="lg"
          className="justify-self-center"
          disabled={!canStart}
          onClick={handleStart}
        >
          <Swords data-icon="inline-start" />
          Start match
        </Button>
      </CardContent>
    </Card>
  )
}
