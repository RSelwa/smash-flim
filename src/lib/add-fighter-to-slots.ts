type ArenaSlots = {
  player1: number | null
  player2: number | null
}

export const addFighterToSlots = (slots: ArenaSlots, playerId: number) =>
  slots.player1 === null
    ? { ...slots, player1: playerId }
    : { ...slots, player2: playerId }
