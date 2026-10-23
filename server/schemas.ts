import { z } from "zod"
import { CHARACTERS } from "./characters.ts"
import {
  MATCH_STATUS,
  MIN_TOURNAMENT_PLAYERS,
  PLAYER_NAME_MAX_LENGTH,
} from "./constants.ts"

const idSchema = z.coerce.number().int().positive()

const characterSchema = z.literal(
  CHARACTERS.map(({ id }) => id),
  "Pick a character",
)

export const idParamSchema = z.object({ id: idSchema })

export const playerInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(PLAYER_NAME_MAX_LENGTH, "Name is too long"),
  character: characterSchema,
})

export const createMatchSchema = z
  .object({
    player1Id: z.number().int().positive(),
    player2Id: z.number().int().positive(),
  })
  .refine(({ player1Id, player2Id }) => player1Id !== player2Id, {
    message: "Pick two different players",
  })

export const setWinnerSchema = z.object({
  winnerId: z.number().int().positive(),
})

export const createTournamentSchema = z.object({
  playerIds: z
    .array(z.number().int().positive())
    .min(MIN_TOURNAMENT_PLAYERS, "Pick at least two players")
    .refine((playerIds) => new Set(playerIds).size === playerIds.length, {
      message: "Pick each player once",
    }),
})

export const matchesQuerySchema = z.object({
  status: z.enum(MATCH_STATUS).optional(),
  playerId: idSchema.optional(),
  limit: idSchema.optional(),
})

export const playerSchema = z.object({
  id: z.number(),
  name: z.string(),
  character: characterSchema.nullable(),
  elo: z.number(),
  wins: z.number(),
  losses: z.number(),
  createdAt: z.string(),
})

const matchBaseSchema = z.object({
  id: z.number(),
  createdAt: z.string(),
  player1Id: z.number(),
  player1Name: z.string(),
  player1Character: characterSchema.nullable(),
  player1Elo: z.number(),
  player2Id: z.number(),
  player2Name: z.string(),
  player2Character: characterSchema.nullable(),
  player2Elo: z.number(),
  tournamentId: z.number().nullable(),
})

const pendingMatchSchema = matchBaseSchema.extend({
  winnerId: z.null(),
  playedAt: z.null(),
  eloChange: z.null(),
  player1EloBefore: z.null(),
  player2EloBefore: z.null(),
})

const completedMatchSchema = matchBaseSchema.extend({
  winnerId: z.number(),
  playedAt: z.string(),
  eloChange: z.number(),
  player1EloBefore: z.number(),
  player2EloBefore: z.number(),
})

export const matchSchema = z.union([pendingMatchSchema, completedMatchSchema])

export const playedMatchSchema = completedMatchSchema.pick({
  id: true,
  player1Id: true,
  player2Id: true,
  winnerId: true,
  player1EloBefore: true,
  player2EloBefore: true,
})

export type Character = z.infer<typeof characterSchema>
export type PlayerInput = z.infer<typeof playerInputSchema>
export type Player = z.infer<typeof playerSchema>
export type Match = z.infer<typeof matchSchema>
export type PendingMatch = z.infer<typeof pendingMatchSchema>
export type CompletedMatch = z.infer<typeof completedMatchSchema>
export type PlayedMatch = z.infer<typeof playedMatchSchema>
export type MatchesFilter = z.infer<typeof matchesQuerySchema>
