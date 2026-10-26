import type { CompletedMatch } from "@server/schemas.ts"
import { formatDay } from "@/lib/format"

export const getPlayDays = (newestFirstMatches: CompletedMatch[]) => {
  const lastSnapshotByDay = new Map(
    newestFirstMatches
      .toReversed()
      .map(
        ({ playedAt }, snapshotIndex) =>
          [
            new Date(playedAt).toDateString(),
            { label: formatDay(playedAt), snapshotIndex },
          ] as const,
      ),
  )
  return [...lastSnapshotByDay.values()]
}
