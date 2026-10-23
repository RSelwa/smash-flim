const ELO_AXIS_PADDING = 20
const ELO_AXIS_STEP = 50

export const getEloFloor = (elos: number[]) => {
  if (elos.length === 0) return 0
  return (
    Math.floor((Math.min(...elos) - ELO_AXIS_PADDING) / ELO_AXIS_STEP) *
    ELO_AXIS_STEP
  )
}
