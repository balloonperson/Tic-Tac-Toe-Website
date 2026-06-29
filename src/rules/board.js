import { MARK_O, MARK_X, WIN_LINES } from './constants.js'

export {
  CELL_COUNT,
  EMPTY_BOARD,
  EMPTY_FIRST_MOVES,
  WIN_LINES,
} from './constants.js'

function isExcludedFirstMove(line, winner, firstMoves) {
  const firstMove = winner === MARK_X ? firstMoves[MARK_X] : firstMoves[MARK_O]

  return firstMove !== null && line.includes(firstMove)
}

export function applyFirstMove(firstMoves, mark, index) {
  if (firstMoves[mark] !== null) {
    return firstMoves
  }

  return { ...firstMoves, [mark]: index }
}

export function checkWinner(board, firstMoves = {}) {
  for (const line of WIN_LINES) {
    const [a, b, c] = line

    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      if (isExcludedFirstMove(line, board[a], firstMoves)) {
        continue
      }

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

export function resolveGameOutcome(board, firstMoves = {}) {
  const winner = checkWinner(board, firstMoves)

  return {
    winner,
    isDraw: !winner && isBoardFull(board),
  }
}
