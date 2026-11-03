import { useEffect, useState } from "react"
import { DragDropProvider, useDroppable } from "@dnd-kit/react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { type InferRequestType, parseResponse } from "hono/client"
import { Dices, Swords, X } from "lucide-react"
import { toast } from "sonner"
import { CHARACTERS } from "@server/characters.ts"
import type { Character, Player } from "@server/schemas.ts"
import { DraggableFighter } from "@/components/draggable-fighter"
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
import { addFighterToSlots } from "@/lib/add-fighter-to-slots"
import { client } from "@/lib/api"
import { buildReel } from "@/lib/build-reel"
import { formatEloDelta } from "@/lib/format"
import { getCharacterImageUrl } from "@/lib/get-character-image-url"
import { getEloStakes } from "@/lib/get-elo-stakes"
import { completedMatchesQuery, playersQuery } from "@/lib/queries"

const SLOTS = [
  { id: "player1", label: "Player 1", opponentId: "player2", spinMs: 1600 },
  { id: "player2", label: "Player 2", opponentId: "player1", spinMs: 2200 },
] as const

type SlotId = (typeof SLOTS)[number]["id"]

type Roll = {
  playerId: number
  reel: Character[]
  spinCount: number
}

const EMPTY_SLOTS: Record<SlotId, number | null> = {
  player1: null,
  player2: null,
}

const EMPTY_ROLLS: Record<SlotId, Roll | null> = {
  player1: null,
  player2: null,
}

type CharacterReelProps = {
  reel: Character[]
  spinMs: number
  playerName: string
  onReroll: () => void
}

const CharacterReel = ({
  reel,
  spinMs,
  playerName,
  onReroll,
}: CharacterReelProps) => {
  const [isSpun, setIsSpun] = useState(false)

  useEffect(() => {
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => setIsSpun(true))
    })
    return () => cancelAnimationFrame(frame)
  }, [])

  const landedId = reel.at(-1)
  const landedName = CHARACTERS.find(({ id }) => id === landedId)?.name
  const landedOffset = ((reel.length - 1) / reel.length) * 100

  return (
    <div className="grid justify-items-center gap-2">
      <button
        type="button"
        aria-label={`Reroll the fighter of ${playerName}`}
        title="Reroll"
        onClick={onReroll}
        className="relative size-24 overflow-hidden rounded-xl border bg-muted outline-none transition-colors hover:border-muted-foreground/50 focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <span
          className="flex flex-col transition-transform ease-[cubic-bezier(0.2,0.8,0.2,1.04)] motion-reduce:transition-none"
          style={{
            transitionDuration: `${spinMs}ms`,
            transform: isSpun ? `translateY(-${landedOffset}%)` : undefined,
          }}
        >
          {reel.map((characterId, index) => (
            <img
              key={`${index}-${characterId}`}
              src={getCharacterImageUrl(characterId)}
              alt=""
              className="size-24 shrink-0 object-cover"
            />
          ))}
        </span>
        <span className="pointer-events-none absolute inset-0 bg-linear-to-b from-black/60 via-transparent to-black/60" />
      </button>
      <p
        data-spun={isSpun || undefined}
        className="text-sm font-medium opacity-0 transition-opacity data-spun:opacity-100 motion-reduce:transition-none"
        style={{ transitionDelay: `${spinMs}ms` }}
      >
        {landedName}
      </p>
    </div>
  )
}

type FighterSlotProps = {
  id: SlotId
  label: string
  player: Player | undefined
  opponent: Player | undefined
  roll: Roll | undefined
  spinMs: number
  onClear: () => void
  onReroll: () => void
}

const FighterSlot = ({
  id,
  label,
  player,
  opponent,
  roll,
  spinMs,
  onClear,
  onReroll,
}: FighterSlotProps) => {
  const { ref, isDropTarget } = useDroppable({ id })
  const { data: completedMatches = [] } = useQuery(completedMatchesQuery)
  const stakes =
    player && opponent && getEloStakes(completedMatches, player, opponent)

  return (
    <div
      ref={ref}
      data-drop-target={isDropTarget || undefined}
      className="relative flex min-h-40 flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-6 text-center transition-colors data-drop-target:border-primary data-drop-target:bg-primary/5"
    >
      <span className="absolute top-3 left-4 text-xs font-medium text-muted-foreground">
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
          {roll ? (
            <CharacterReel
              key={roll.spinCount}
              reel={roll.reel}
              spinMs={spinMs}
              playerName={player.name}
              onReroll={onReroll}
            />
          ) : (
            <PlayerAvatar
              name={player.name}
              character={player.character}
              className="size-24"
            />
          )}
          <div>
            <p className="font-heading text-lg font-medium">{player.name}</p>
            <p className="text-sm text-muted-foreground tabular-nums">
              {player.elo} ELO
            </p>
          </div>
          {stakes && (
            <div className="flex flex-wrap justify-center gap-2">
              <Badge variant="success" className="tabular-nums">
                {formatEloDelta(stakes.win)} if wins
              </Badge>
              <Badge variant="destructive" className="tabular-nums">
                {formatEloDelta(stakes.loss)} if loses
              </Badge>
            </div>
          )}
        </>
      ) : (
        <p className="text-sm text-muted-foreground">Drop a fighter here</p>
      )}
    </div>
  )
}

export const MatchArena = () => {
  const { data: players = [] } = useQuery(playersQuery)
  const [slots, setSlots] = useState(EMPTY_SLOTS)
  const [rolls, setRolls] = useState(EMPTY_ROLLS)

  const createMatch = useMutation({
    mutationFn: (
      json: InferRequestType<typeof client.api.matches.$post>["json"],
    ) => parseResponse(client.api.matches.$post({ json })),
    onSuccess: (match) => {
      toast.success(`${match.player1Name} vs ${match.player2Name} started`)
      setSlots(EMPTY_SLOTS)
      setRolls(EMPTY_ROLLS)
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
  const hasAnyFighter =
    slotPlayers.player1 !== undefined || slotPlayers.player2 !== undefined
  const canStart = hasTwoFighters && !createMatch.isPending

  const findSlotRoll = (slotId: SlotId) => {
    const roll = rolls[slotId]
    return roll?.playerId === slots[slotId] ? roll : undefined
  }

  const getNextRoll = (slotId: SlotId) => {
    const player = slotPlayers[slotId]
    if (!player) return null
    const roll = findSlotRoll(slotId)
    return {
      playerId: player.id,
      reel: buildReel(roll?.reel.at(-1) ?? player.character),
      spinCount: (rolls[slotId]?.spinCount ?? 0) + 1,
    }
  }

  const handleRollAll = () =>
    setRolls({
      player1: getNextRoll("player1"),
      player2: getNextRoll("player2"),
    })

  const handleReroll = (slotId: SlotId) => {
    const roll = getNextRoll(slotId)
    setRolls((current) => ({ ...current, [slotId]: roll }))
  }

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
          Drag or click two fighters into the arena, then start the match
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
          <div className="relative grid auto-rows-fr grid-cols-2 gap-4">
            {SLOTS.map(({ id, label, opponentId, spinMs }) => (
              <FighterSlot
                key={id}
                id={id}
                label={label}
                player={slotPlayers[id]}
                opponent={slotPlayers[opponentId]}
                roll={findSlotRoll(id)}
                spinMs={spinMs}
                onClear={() =>
                  setSlots((current) => ({ ...current, [id]: null }))
                }
                onReroll={() => handleReroll(id)}
              />
            ))}
            <span className="pointer-events-none absolute top-1/2 left-1/2 -translate-1/2 rounded-full bg-background px-3 py-1 font-heading text-sm font-medium ring-1 ring-border">
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
                  disabled={playersInArena.has(player.id)}
                  onClick={() =>
                    setSlots((current) => addFighterToSlots(current, player.id))
                  }
                />
              ))}
            </div>
          )}
        </DragDropProvider>
        <div className="flex flex-wrap justify-center gap-2">
          <Button
            size="lg"
            variant="outline"
            disabled={!hasAnyFighter}
            onClick={handleRollAll}
          >
            <Dices data-icon="inline-start" />
            Random fighters
          </Button>
          <Button size="lg" disabled={!canStart} onClick={handleStart}>
            <Swords data-icon="inline-start" />
            Start match
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
