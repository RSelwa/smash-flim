import { useMutation } from "@tanstack/react-query"
import { parseResponse } from "hono/client"
import { Undo2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { client } from "@/lib/api"

type UndoResultButtonProps = {
  matchId: number
}

export const UndoResultButton = ({ matchId }: UndoResultButtonProps) => {
  const undoResult = useMutation({
    mutationFn: () =>
      parseResponse(
        client.api.matches[":id"].winner.$delete({
          param: { id: String(matchId) },
        }),
      ),
    onSuccess: () => {
      toast.success("Result undone")
    },
  })

  return (
    <Button
      size="icon-xs"
      variant="ghost"
      aria-label="Undo result"
      disabled={undoResult.isPending}
      onClick={() => undoResult.mutate()}
    >
      <Undo2 />
    </Button>
  )
}
