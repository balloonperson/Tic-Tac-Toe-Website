export const MARK_X = 'X'
export const MARK_O = 'O'

export const EMPTY_FIRST_MOVES = { [MARK_X]: null, [MARK_O]: null }

export const CELL_COUNT = 9
export const EMPTY_BOARD = Array(CELL_COUNT).fill(null)

export const WIN_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
]
