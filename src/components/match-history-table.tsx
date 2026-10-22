import type { CompletedMatch } from "@server/schemas.ts"
import { PlayerLink } from "@/components/player-link"
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
    eloBefore: match.player1EloBefore,
  }
  const player2 = {
    id: match.player2Id,
    name: match.player2Name,
    character: match.player2Character,
    eloBefore: match.player2EloBefore,
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
              <TableCell>
                <PlayerLink
                  id={winner.id}
                  name={winner.name}
                  character={winner.character}
                />{" "}
                <span className="text-muted-foreground tabular-nums">
                  {winner.eloBefore + match.eloChange}
                </span>
              </TableCell>
              <TableCell>
                <PlayerLink
                  id={loser.id}
                  name={loser.name}
                  character={loser.character}
                />{" "}
                <span className="text-muted-foreground tabular-nums">
                  {loser.eloBefore - match.eloChange}
                </span>
              </TableCell>
              <TableCell className="text-right font-medium tabular-nums">
                {formatEloDelta(match.eloChange)}
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
