import { useMutation } from "@tanstack/react-query"
import { parseResponse } from "hono/client"
import { Trash2 } from "lucide-react"
import { useNavigate } from "react-router"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ROUTE_PATH } from "@/constants/routes"
import { client } from "@/lib/api"

type DeleteTournamentDialogProps = {
  tournamentId: number
}

export const DeleteTournamentDialog = ({
  tournamentId,
}: DeleteTournamentDialogProps) => {
  const navigate = useNavigate()

  const deleteTournament = useMutation({
    mutationFn: () =>
      parseResponse(
        client.api.tournaments[":id"].$delete({
          param: { id: String(tournamentId) },
        }),
      ),
    onSuccess: () => {
      toast.success("Tournament deleted")
      void navigate(ROUTE_PATH.tournaments)
    },
  })

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Trash2 data-icon="inline-start" />
          Delete
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete tournament #{tournamentId}?</DialogTitle>
          <DialogDescription>
            Its matches go with it, played ones included, and the ELO is
            refitted without them. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Keep it</Button>
          </DialogClose>
          <Button
            variant="destructive"
            disabled={deleteTournament.isPending}
            onClick={() => deleteTournament.mutate()}
          >
            Delete tournament
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
