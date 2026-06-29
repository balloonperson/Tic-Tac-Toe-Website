import { describe, expect, it } from 'vitest'
import {
  applyFirstMove,
  checkWinner,
  EMPTY_FIRST_MOVES,
  resolveGameOutcome,
} from './board.js'
import { MARK_O, MARK_X } from './constants.js'

function boardFrom(cells) {
  return cells.map((cell) => (cell === '.' ? null : cell))
}

describe('no-first-move rule', () => {
  describe('applyFirstMove', () => {
    it('records the first move index for a mark', () => {
      expect(applyFirstMove(EMPTY_FIRST_MOVES, MARK_X, 4)).toEqual({
        [MARK_X]: 4,
        [MARK_O]: null,
      })
    })

    it('does not overwrite an existing first move', () => {
      const firstMoves = { [MARK_X]: 0, [MARK_O]: null }

      expect(applyFirstMove(firstMoves, MARK_X, 4)).toBe(firstMoves)
    })

    it('tracks X and O first moves independently', () => {
      const afterX = applyFirstMove(EMPTY_FIRST_MOVES, MARK_X, 0)
      const afterO = applyFirstMove(afterX, MARK_O, 1)

      expect(afterO).toEqual({ [MARK_X]: 0, [MARK_O]: 1 })
    })
  })

  describe('checkWinner', () => {
    it('allows a win when the first move is not in the winning line', () => {
      const board = boardFrom(['X', 'X', 'X', '.', 'O', '.', '.', 'O', '.'])
      const firstMoves = { [MARK_X]: 4, [MARK_O]: 5 }

      expect(checkWinner(board, firstMoves)).toBe(MARK_X)
    })

    it('rejects a win when the first move is in the winning line', () => {
      const board = boardFrom(['X', 'X', 'X', '.', 'O', '.', '.', 'O', '.'])
      const firstMoves = { [MARK_X]: 0, [MARK_O]: 5 }

      expect(checkWinner(board, firstMoves)).toBeNull()
    })

    it('rejects only the line that contains the first move', () => {
      const board = boardFrom(['X', 'X', 'X', 'O', '.', '.', 'O', 'O', 'O'])
      const firstMoves = { [MARK_X]: 0, [MARK_O]: 1 }

      expect(checkWinner(board, firstMoves)).toBe(MARK_O)
    })

    it('does not let one player’s first move block the other player’s win', () => {
      const board = boardFrom(['X', 'O', 'X', '.', 'O', '.', 'X', 'O', '.'])
      const firstMoves = { [MARK_X]: 0, [MARK_O]: 2 }

      expect(checkWinner(board, firstMoves)).toBe(MARK_O)
    })

    it.each([
      {
        name: 'top row',
        board: ['X', 'X', 'X', '.', 'O', '.', '.', 'O', '.'],
        firstX: 4,
        firstO: 5,
        winner: MARK_X,
      },
      {
        name: 'middle row',
        board: ['O', 'X', '.', 'X', 'X', 'X', 'O', '.', '.'],
        firstX: 1,
        firstO: 0,
        winner: MARK_X,
      },
      {
        name: 'bottom row',
        board: ['O', 'X', '.', '.', 'O', '.', 'X', 'X', 'X'],
        firstX: 1,
        firstO: 0,
        winner: MARK_X,
      },
      {
        name: 'left column',
        board: ['X', 'O', '.', 'X', 'X', '.', 'X', 'O', '.'],
        firstX: 4,
        firstO: 1,
        winner: MARK_X,
      },
      {
        name: 'middle column',
        board: ['X', 'O', 'X', '.', 'O', '.', 'X', 'O', '.'],
        firstX: 0,
        firstO: 2,
        winner: MARK_O,
      },
      {
        name: 'right column',
        board: ['X', 'O', 'X', 'O', 'X', 'X', '.', 'O', 'X'],
        firstX: 0,
        firstO: 1,
        winner: MARK_X,
      },
      {
        name: 'main diagonal',
        board: ['X', 'O', '.', '.', 'X', 'O', 'O', '.', 'X'],
        firstX: 1,
        firstO: 2,
        winner: MARK_X,
      },
      {
        name: 'anti diagonal',
        board: ['O', 'O', 'X', 'X', 'X', 'O', 'X', '.', '.'],
        firstX: 3,
        firstO: 0,
        winner: MARK_X,
      },
    ])('detects a win on the $name when first move is outside the line', ({
      board,
      firstX,
      firstO,
      winner,
    }) => {
      const firstMoves = { [MARK_X]: firstX, [MARK_O]: firstO }

      expect(checkWinner(boardFrom(board), firstMoves)).toBe(winner)
    })

    it.each([
      {
        name: 'top row',
        board: ['X', 'X', 'X', '.', 'O', '.', '.', 'O', '.'],
        firstX: 0,
      },
      {
        name: 'middle row',
        board: ['O', 'X', '.', 'X', 'X', 'X', 'O', '.', '.'],
        firstX: 3,
      },
      {
        name: 'bottom row',
        board: ['O', 'X', '.', '.', 'O', '.', 'X', 'X', 'X'],
        firstX: 6,
      },
      {
        name: 'left column',
        board: ['X', 'O', '.', 'X', 'X', '.', 'X', 'O', '.'],
        firstX: 0,
      },
      {
        name: 'middle column',
        board: ['X', 'O', 'X', '.', 'O', '.', 'X', 'O', '.'],
        firstO: 1,
      },
      {
        name: 'right column',
        board: ['O', 'O', 'X', 'O', 'X', 'X', '.', 'O', 'X'],
        firstX: 2,
      },
      {
        name: 'main diagonal',
        board: ['X', 'O', '.', '.', 'X', 'O', 'O', '.', 'X'],
        firstX: 4,
      },
      {
        name: 'anti diagonal',
        board: ['O', 'O', 'X', 'X', 'X', 'O', 'X', '.', '.'],
        firstX: 6,
      },
    ])('rejects a win on the $name when the first move is in the line', ({
      board,
      firstX,
      firstO,
    }) => {
      const firstMoves = {
        [MARK_X]: firstX ?? null,
        [MARK_O]: firstO ?? 5,
      }

      expect(checkWinner(boardFrom(board), firstMoves)).toBeNull()
    })
  })

  describe('resolveGameOutcome', () => {
    it('reports no winner while the game is still in progress', () => {
      const board = boardFrom(['X', 'O', '.', '.', 'X', '.', '.', '.', '.'])

      expect(resolveGameOutcome(board, EMPTY_FIRST_MOVES)).toEqual({
        winner: null,
        isDraw: false,
      })
    })

    it('reports a winner when a valid line ignores the first move', () => {
      const board = boardFrom(['X', 'X', 'X', 'O', 'O', '.', '.', '.', '.'])
      const firstMoves = { [MARK_X]: 4, [MARK_O]: 3 }

      expect(resolveGameOutcome(board, firstMoves)).toEqual({
        winner: MARK_X,
        isDraw: false,
      })
    })

    it('reports no winner when the only complete line includes the first move', () => {
      const board = boardFrom(['X', 'X', 'X', 'O', 'O', '.', '.', '.', '.'])
      const firstMoves = { [MARK_X]: 0, [MARK_O]: 3 }

      expect(resolveGameOutcome(board, firstMoves)).toEqual({
        winner: null,
        isDraw: false,
      })
    })

    it('reports a draw on a full board with no valid winning line', () => {
      const board = boardFrom(['X', 'O', 'X', 'X', 'O', 'O', 'O', 'X', 'X'])
      const firstMoves = { [MARK_X]: 0, [MARK_O]: 1 }

      expect(resolveGameOutcome(board, firstMoves)).toEqual({
        winner: null,
        isDraw: true,
      })
    })
  })
})
