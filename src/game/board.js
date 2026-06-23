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

export function checkWinner(board) {
  for (const [a, b, c] of WIN_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a]
    }
  }

  return null
}

export function getAvailableMoves(board) {
  return board.reduce((moves, cell, index) => {
    if (cell === null) {
      moves.push(index)
    }

    return moves
  }, [])
}

export function isBoardFull(board) {
  return board.every((cell) => cell !== null)
}

export function resolveGameOutcome(board) {
  const winner = checkWinner(board)

  return {
    winner,
    isDraw: !winner && isBoardFull(board),
  }
}
