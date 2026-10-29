import { queryOptions } from "@tanstack/react-query"
import { type InferRequestType, parseResponse } from "hono/client"
import { MATCH_STATUS } from "@server/constants.ts"
import { client } from "@/lib/api"
import { isCompletedMatch } from "@/lib/is-completed-match"

type MatchesQuery = InferRequestType<typeof client.api.matches.$get>["query"]

export const playersQuery = queryOptions({
  queryKey: ["players"],
  queryFn: () => parseResponse(client.api.players.$get()),
})

export const matchesQuery = (query: MatchesQuery) =>
  queryOptions({
    queryKey: ["matches", query],
    queryFn: () => parseResponse(client.api.matches.$get({ query })),
  })

export const completedMatchesQuery = queryOptions({
  ...matchesQuery({ status: MATCH_STATUS.completed }),
  select: (matches) => matches.filter(isCompletedMatch),
})

export const tournamentsQuery = queryOptions({
  queryKey: ["tournaments"],
  queryFn: () => parseResponse(client.api.tournaments.$get()),
})
