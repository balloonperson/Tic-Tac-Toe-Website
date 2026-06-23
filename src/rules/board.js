import { WIN_LINES } from './constants.js'

export { CELL_COUNT, EMPTY_BOARD, WIN_LINES } from './constants.js'

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
