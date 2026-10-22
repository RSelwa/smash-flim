import { queryOptions } from "@tanstack/react-query"
import { type InferRequestType, parseResponse } from "hono/client"
import { client } from "@/lib/api"

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
