import type { Player } from "@server/schemas.ts"

const hasPlayed = ({ wins, losses }: Player) => wins + losses > 0

export const getHiddenPlayerIds = (
  players: Player[],
  toggledPlayerIds: number[],
) =>
  players
    .filter(
      (player) => hasPlayed(player) === toggledPlayerIds.includes(player.id),
    )
    .map(({ id }) => id)
