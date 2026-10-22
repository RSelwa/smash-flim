export const STARTING_ELO = 1000

export const PLAYER_NAME_MAX_LENGTH = 32

export const MATCH_STATUS = {
  pending: "pending",
  completed: "completed",
} as const

export const SQL_NOW = "strftime('%Y-%m-%dT%H:%M:%fZ', 'now')"
