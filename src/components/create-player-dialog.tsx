import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { parseResponse } from "hono/client"
import { UserPlus } from "lucide-react"
import { toast } from "sonner"
import { STARTING_ELO } from "@server/constants.ts"
import type { PlayerInput } from "@server/schemas.ts"
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

export const CreatePlayerDialog = () => {
  const [isOpen, setIsOpen] = useState(false)

  const createPlayer = useMutation({
    mutationFn: (json: PlayerInput) =>
      parseResponse(client.api.players.$post({ json })),
    onSuccess: (player) => {
      toast.success(`${player.name} joins the fight at ${player.elo} ELO`)
      setIsOpen(false)
    },
  })

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <UserPlus data-icon="inline-start" />
          New player
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>New player</DialogTitle>
          <DialogDescription>
            Everyone starts at {STARTING_ELO} ELO. Your main is your avatar.
          </DialogDescription>
        </DialogHeader>
        <PlayerForm
          submitLabel="Create player"
          isPending={createPlayer.isPending}
          onSubmit={createPlayer.mutate}
        />
      </DialogContent>
    </Dialog>
  )
}
