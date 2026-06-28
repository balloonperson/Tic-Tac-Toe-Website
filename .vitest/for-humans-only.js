import { describe, expect, it } from 'vitest'
import {
  checkWinner,
  EMPTY_BOARD,
  getAvailableMoves,
  isBoardFull,
  resolveGameOutcome,
} from '../src/rules/board.js'
import { MARK_O, MARK_X } from '../src/rules/constants.js'

function boardFrom(cells) {
  return cells.map((cell) => (cell === '.' ? null : cell))
}

describe('checkWinner', () => {
  it('returns null on an empty board', () => {
    expect(checkWinner(EMPTY_BOARD)).toBeNull()
  })

  it('returns null when there is no winning line', () => {
    const board = boardFrom(['X', 'O', 'X', 'X', 'O', 'O', 'O', 'X', 'X'])
    expect(checkWinner(board)).toBeNull()
  })

  it('detects X winning on the top row', () => {
    const board = boardFrom(['X', 'X', 'X', '.', 'O', '.', '.', 'O', '.'])
    expect(checkWinner(board)).toBe(MARK_X)
  })

  it('does not detect O winning on the middle column', () => {
    const board = boardFrom(['X', 'O', 'X', '.', 'O', '.', 'X', 'O', '.'])
    expect(checkWinner(board)).toBeNull()
  })

  it('does not detect X winning on the main diagonal through the middle', () => {
    const board = boardFrom(['X', 'O', '.', '.', 'X', 'O', 'O', '.', 'X'])
    expect(checkWinner(board)).toBeNull()
  })
})

describe('getAvailableMoves', () => {
  it('returns all indices on an empty board', () => {
    expect(getAvailableMoves(EMPTY_BOARD)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8])
  })

  it('returns only empty cell indices', () => {
    const board = boardFrom(['X', '.', 'O', '.', 'X', '.', '.', 'O', '.'])
    expect(getAvailableMoves(board)).toEqual([1, 3, 5, 6, 8])
  })

  it('returns an empty array when the board is full', () => {
    const board = boardFrom(['X', 'O', 'X', 'O', 'X', 'O', 'O', 'X', 'O'])
    expect(getAvailableMoves(board)).toEqual([])
  })
})

describe('isBoardFull', () => {
  it('returns false on an empty board', () => {
    expect(isBoardFull(EMPTY_BOARD)).toBe(false)
  })

  it('returns false when at least one cell is empty', () => {
    const board = boardFrom(['X', 'O', 'X', 'O', 'X', 'O', 'O', 'X', '.'])
    expect(isBoardFull(board)).toBe(false)
  })

  it('returns true when every cell is occupied', () => {
    const board = boardFrom(['X', 'O', 'X', 'O', 'X', 'O', 'O', 'X', 'O'])
    expect(isBoardFull(board)).toBe(true)
  })
})

describe('resolveGameOutcome', () => {
  it('reports no winner and not a draw while the game is in progress', () => {
    const board = boardFrom(['X', 'O', '.', '.', 'X', '.', '.', '.', '.'])
    expect(resolveGameOutcome(board)).toEqual({ winner: null, isDraw: false })
  })

  it('reports a winner when a line is complete', () => {
    const board = boardFrom(['X', 'X', 'X', 'O', 'O', '.', '.', '.', '.'])
    expect(resolveGameOutcome(board)).toEqual({ winner: MARK_X, isDraw: false })
  })

  it('reports a draw on a full board with no winner', () => {
    const board = boardFrom(['X', 'O', 'X', 'X', 'O', 'O', 'O', 'X', 'X'])
    expect(resolveGameOutcome(board)).toEqual({ winner: null, isDraw: true })
  })
})
