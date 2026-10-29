import type { CompletedMatch } from "@server/schemas.ts"
import { PlayerLink } from "@/components/player-link"
import { UndoResultButton } from "@/components/undo-result-button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatDate, formatEloDelta } from "@/lib/format"

type MatchHistoryTableProps = {
  matches: CompletedMatch[]
}

const getResult = (match: CompletedMatch) => {
  const player1 = {
    id: match.player1Id,
    name: match.player1Name,
    character: match.player1Character,
    eloChange: match.player1EloChange,
  }
  const player2 = {
    id: match.player2Id,
    name: match.player2Name,
    character: match.player2Character,
    eloChange: match.player2EloChange,
  }
  const isPlayer1Winner = match.winnerId === match.player1Id
  return isPlayer1Winner
    ? { winner: player1, loser: player2 }
    : { winner: player2, loser: player1 }
}

export const MatchHistoryTable = ({ matches }: MatchHistoryTableProps) => {
  if (matches.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>No matches yet</EmptyTitle>
          <EmptyDescription>
            Results show up here once reported.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Played</TableHead>
          <TableHead>Winner</TableHead>
          <TableHead>Loser</TableHead>
          <TableHead className="text-right">ELO swing</TableHead>
          <TableHead>
            <span className="sr-only">Undo</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {matches.map((match) => {
          const { winner, loser } = getResult(match)
          return (
            <TableRow key={match.id}>
              <TableCell className="text-muted-foreground">
                {formatDate(match.playedAt)}
              </TableCell>
              <TableCell className="bg-green-500/10 dark:bg-green-500/20">
                <div className="flex items-center justify-between gap-2">
                  <PlayerLink
                    id={winner.id}
                    name={winner.name}
                    character={winner.character}
                  />
                  <span className="text-green-700 tabular-nums dark:text-green-400">
                    {formatEloDelta(winner.eloChange)}
                  </span>
                </div>
              </TableCell>
              <TableCell className="bg-destructive/10 dark:bg-destructive/20">
                <div className="flex items-center justify-between gap-2">
                  <PlayerLink
                    id={loser.id}
                    name={loser.name}
                    character={loser.character}
                  />
                  <span className="text-destructive tabular-nums">
                    {formatEloDelta(loser.eloChange)}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-right font-medium tabular-nums">
                {formatEloDelta(winner.eloChange)}
              </TableCell>
              <TableCell className="w-0">
                <UndoResultButton matchId={match.id} />
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
