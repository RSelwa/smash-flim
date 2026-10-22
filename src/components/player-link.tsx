import { generatePath, Link } from "react-router"
import type { Character } from "@server/schemas.ts"
import { PlayerAvatar } from "@/components/player-avatar"
import { ROUTE_PATH } from "@/constants/routes"

type PlayerLinkProps = {
  id: number
  name: string
  character: Character | null
}

export const PlayerLink = ({ id, name, character }: PlayerLinkProps) => (
  <Link
    to={generatePath(ROUTE_PATH.player, { id: String(id) })}
    className="inline-flex min-w-0 items-center gap-2 font-medium underline-offset-4 hover:underline"
  >
    <PlayerAvatar name={name} character={character} size="sm" />
    <span className="truncate">{name}</span>
  </Link>
)
