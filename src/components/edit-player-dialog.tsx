import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { parseResponse } from "hono/client"
import { Pencil } from "lucide-react"
import { toast } from "sonner"
import type { Player, PlayerInput } from "@server/schemas.ts"
import { PlayerForm } from "@/components/player-form"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { client } from "@/lib/api"

type EditPlayerDialogProps = {
  player: Player
}

export const EditPlayerDialog = ({ player }: EditPlayerDialogProps) => {
  const [isOpen, setIsOpen] = useState(false)

  const updatePlayer = useMutation({
    mutationFn: (json: PlayerInput) =>
      parseResponse(
        client.api.players[":id"].$put({
          param: { id: String(player.id) },
          json,
        }),
      ),
    onSuccess: () => {
      toast.success("Player updated")
      setIsOpen(false)
    },
  })

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil data-icon="inline-start" />
          Edit player
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit {player.name}</DialogTitle>
          <DialogDescription>
            Name and main only. ELO and match history stay as they are.
          </DialogDescription>
        </DialogHeader>
        <PlayerForm
          initialPlayer={player}
          submitLabel="Save changes"
          isPending={updatePlayer.isPending}
          onSubmit={updatePlayer.mutate}
        />
      </DialogContent>
    </Dialog>
  )
}
