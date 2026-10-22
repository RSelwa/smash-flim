import { useQuery } from "@tanstack/react-query"
import { MATCH_STATUS } from "@server/constants.ts"
import { MatchHistoryTable } from "@/components/match-history-table"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { isCompletedMatch } from "@/lib/is-completed-match"
import { matchesQuery } from "@/lib/queries"

export const MatchesPage = () => {
  const { data: matches = [] } = useQuery(
    matchesQuery({ status: MATCH_STATUS.completed }),
  )
  const completedMatches = matches.filter(isCompletedMatch)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Match history</CardTitle>
        <CardDescription>
          {completedMatches.length} matches played
        </CardDescription>
      </CardHeader>
      <CardContent>
        <MatchHistoryTable matches={completedMatches} />
      </CardContent>
    </Card>
  )
}
