import { useEffect, useState } from 'react'
import { STRATEGIES } from '../ai/strategies.js'
import { EMPTY_BOARD, resolveGameOutcome } from '../rules/board.js'
import { MARK_O, MARK_X } from '../rules/constants.js'
import { getAiMark, getTurnLabel, isAiMode } from '../setup/helpers.js'
import { DEFAULT_DIFFICULTY, DEFAULT_PLAY_AS } from '../setup/options.js'
import { mapGameResult } from './outcomes.js'

const AI_MOVE_DELAY_MS = 400

export function useMatch() {
  const [gameState, setGameState] = useState('idle')
  const [currentMark, setCurrentMark] = useState(MARK_X)
  const [board, setBoard] = useState(EMPTY_BOARD)
  const [result, setResult] = useState(null)
  const [difficulty, setDifficulty] = useState(DEFAULT_DIFFICULTY)
  const [playAs, setPlayAs] = useState(DEFAULT_PLAY_AS)

  const aiMode = isAiMode(difficulty)
  const aiMark = getAiMark(playAs)

  const resetBoard = () => {
    setBoard(EMPTY_BOARD)
    setResult(null)
  }

  const startGame = () => {
    setCurrentMark(MARK_X)
    resetBoard()
    setGameState('playing')
  }

  const restartGame = () => {
    setCurrentMark(MARK_X)
    resetBoard()
    setGameState('playing')
  }

  const finishMove = (nextBoard, placedMark) => {
    setBoard(nextBoard)

    const { winner, isDraw } = resolveGameOutcome(nextBoard)

    if (winner) {
      setResult(mapGameResult(winner, difficulty, playAs))
      setGameState('ended')
      return
    }

    if (isDraw) {
      setResult('draw')
      setGameState('ended')
      return
    }

    setCurrentMark(placedMark === MARK_X ? MARK_O : MARK_X)
  }

  useEffect(() => {
    if (gameState !== 'playing' || currentMark !== aiMark) {
      return
    }

    if (!aiMode) {
      return
    }

    const strategy = STRATEGIES[difficulty]
    if (!strategy) {
      return
    }

    const timer = setTimeout(() => {
      const move = strategy(board, aiMark, playAs)

      if (move === null) {
        return
      }

      const nextBoard = [...board]
      nextBoard[move] = aiMark
      finishMove(nextBoard, aiMark)
    }, AI_MOVE_DELAY_MS)

    return () => clearTimeout(timer)
  }, [gameState, currentMark, board, difficulty, playAs, aiMark, aiMode])

  const handleCellClick = (index) => {
    if (gameState !== 'playing' || board[index]) {
      return
    }

    if (aiMode && currentMark !== playAs) {
      return
    }

    const nextBoard = [...board]
    nextBoard[index] = aiMode ? playAs : currentMark
    finishMove(nextBoard, aiMode ? playAs : currentMark)
  }

  const handlePlayAsChange = (mark) => {
    if (!aiMode) {
      return
    }

    setPlayAs(mark)
  }

  const turnLabel = getTurnLabel(currentMark, playAs, aiMode)
  const isUserTurn = aiMode ? currentMark === playAs : true
  const isPlaying = gameState === 'playing'
  const showBoard = gameState !== 'idle'

  const isCellDisabled = (mark) => {
    if (!isPlaying || mark) {
      return true
    }

    if (!aiMode) {
      return false
    }

    return currentMark !== playAs
  }

  return {
    gameState,
    board,
    result,
    difficulty,
    playAs,
    aiMode,
    currentMark,
    turnLabel,
    isUserTurn,
    isPlaying,
    showBoard,
    startGame,
    restartGame,
    handleCellClick,
    handlePlayAsChange,
    setDifficulty,
    isCellDisabled,
  }
}
