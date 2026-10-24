import { useDraggable } from "@dnd-kit/react"
import type { Player } from "@server/schemas.ts"
import { PlayerAvatar } from "@/components/player-avatar"

type DraggableFighterProps = {
  player: Player
  disabled: boolean
  onClick: () => void
}

export const DraggableFighter = ({
  player,
  disabled,
  onClick,
}: DraggableFighterProps) => {
  const { ref, isDragging } = useDraggable({ id: player.id, disabled })

  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled}
      onClick={onClick}
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
