import { getBestMove, getRandomMove } from './minimax.js'

export const STRATEGIES = {
  random: (board) => getRandomMove(board),
  optimal: (board, aiMark, humanMark) => getBestMove(board, aiMark, humanMark),
}
