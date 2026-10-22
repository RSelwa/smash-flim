import { type ComponentProps } from "react"
import type { Character } from "@server/schemas.ts"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getCharacterImageUrl } from "@/lib/get-character-image-url"

const INITIALS_LENGTH = 2

type PlayerAvatarProps = Pick<
  ComponentProps<typeof Avatar>,
  "size" | "className"
> & {
  name: string
  character: Character | null
}

export const PlayerAvatar = ({
  name,
  character,
  size,
  className,
}: PlayerAvatarProps) => (
  <Avatar size={size} className={className}>
    {character && <AvatarImage src={getCharacterImageUrl(character)} alt="" />}
    <AvatarFallback>
      {name.slice(0, INITIALS_LENGTH).toUpperCase()}
    </AvatarFallback>
  </Avatar>
)
