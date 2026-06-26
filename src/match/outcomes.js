import { MARK_X } from '../rules/constants.js'

export function mapGameResult(winner, difficulty, playAs) {
  if (!winner) {
    return 'draw'
  }

  if (difficulty === 'yourself') {
    return winner === MARK_X ? 'x-win' : 'o-win'
  }

  return winner === playAs ? 'win' : 'lose'
}
