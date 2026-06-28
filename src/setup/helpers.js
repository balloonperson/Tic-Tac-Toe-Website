import { MARK_O, MARK_X } from '../rules/constants.js'

export function isAiMode(difficulty) {
  return difficulty !== 'yourself'
}

export function getAiMark(playAs) {
  return playAs === MARK_X ? MARK_O : MARK_X
}

export function getTurnLabel(currentMark, playAs, aiMode) {
  if (!aiMode) {
    return currentMark
  }

  return currentMark === playAs ? 'You' : 'Opponent'
}
