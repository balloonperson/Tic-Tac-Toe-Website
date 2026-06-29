import { checkWinner, getAvailableMoves, isBoardFull } from '../rules/board.js'

function minimax(board, depth, isAiTurn, aiMark, humanMark) {
  const winner = checkWinner(board)

  if (winner === aiMark) {
    return 10 - depth
  }

  if (winner === humanMark) {
    return depth - 10
  }

  if (isBoardFull(board)) {
    return 0
  }

  const availableMoves = getAvailableMoves(board)

  if (isAiTurn) {
    return availableMoves.reduce((bestScore, move) => {
      board[move] = aiMark
      const score = minimax(board, depth + 1, false, aiMark, humanMark)
      board[move] = null
      return Math.max(score, bestScore)
    }, -Infinity)
  }

  return availableMoves.reduce((bestScore, move) => {
    board[move] = humanMark
    const score = minimax(board, depth + 1, true, aiMark, humanMark)
    board[move] = null
    return Math.min(score, bestScore)
  }, Infinity)
}

export function getBestMove(board, aiMark = 'O', humanMark = 'X') {
  const boardCopy = [...board]
  const availableMoves = getAvailableMoves(boardCopy)

  if (availableMoves.length === 0) {
    return null
  }

  let bestMove = availableMoves[0]
  let bestScore = -Infinity

  for (const move of availableMoves) {
    boardCopy[move] = aiMark
    const score = minimax(boardCopy, 0, false, aiMark, humanMark)
    boardCopy[move] = null

    if (score > bestScore) {
      bestScore = score
      bestMove = move
    }
  }

  return bestMove
}

export function getRandomMove(board) {
  const moves = getAvailableMoves(board)

  if (moves.length === 0) {
    return null
  }

  return moves[Math.floor(Math.random() * moves.length)]
}
