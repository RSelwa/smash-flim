import { SERIES_COLORS } from "@/constants/chart"

export const getSeriesColor = (rankIndex: number) =>
  SERIES_COLORS[rankIndex % SERIES_COLORS.length] ?? SERIES_COLORS[0]
