import type { Player } from "@server/schemas.ts"

const NO_GAMES_WIN_RATE = "—"

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
})
const pastYearDateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
})
const dayFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
})
const percentFormatter = new Intl.NumberFormat(undefined, { style: "percent" })
const signedFormatter = new Intl.NumberFormat(undefined, {
  signDisplay: "exceptZero",
})

export const formatDate = (isoDate: string) => {
  const date = new Date(isoDate)
  const isThisYear = date.getFullYear() === new Date().getFullYear()
  return (isThisYear ? dateFormatter : pastYearDateFormatter).format(date)
}

export const formatDay = (isoDate: string) =>
  dayFormatter.format(new Date(isoDate))

export const formatEloDelta = (delta: number) => signedFormatter.format(delta)

export const formatWinRate = ({
  wins,
  losses,
}: Pick<Player, "wins" | "losses">) => {
  const gamesPlayed = wins + losses
  if (gamesPlayed === 0) return NO_GAMES_WIN_RATE
  return percentFormatter.format(wins / gamesPlayed)
}
