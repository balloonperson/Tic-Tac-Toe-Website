import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'

type Mark = 'X' | 'O'
type CellValue = Mark | null
type Board = CellValue[]
type GameState = 'idle' | 'playing' | 'ended'
type Difficulty = 'yourself' | 'random' | 'optimal'
type PlayAs = Mark
type GameResult = 'win' | 'lose' | 'draw' | 'x-win' | 'o-win' | null

type Strategy = (board: Board, aiMark?: Mark, humanMark?: Mark) => number | null

const MARK_X: Mark = 'X'
const MARK_O: Mark = 'O'
const CELL_COUNT = 9
const EMPTY_BOARD: Board = Array(CELL_COUNT).fill(null)
const AI_MOVE_DELAY_MS = 400

const WIN_LINES: [number, number, number][] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
]

const DIFFICULTIES: { id: Difficulty; label: string }[] = [
  { id: 'yourself', label: 'Play Yourself' },
  { id: 'random', label: 'Random' },
  { id: 'optimal', label: 'Optimal' },
]

const DEFAULT_DIFFICULTY: Difficulty = 'optimal'
const DEFAULT_PLAY_AS: PlayAs = 'X'
const GRID_STROKE = 0.45
const MARK_STROKE = 11

function checkWinner(board: Board): Mark | null {
  for (const [a, b, c] of WIN_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a]
    }
  }

  return null
}

function getAvailableMoves(board: Board): number[] {
  return board.reduce<number[]>((moves, cell, index) => {
    if (cell === null) {
      moves.push(index)
    }

    return moves
  }, [])
}

function isBoardFull(board: Board): boolean {
  return board.every((cell) => cell !== null)
}

function resolveGameOutcome(board: Board): { winner: Mark | null; isDraw: boolean } {
  const winner = checkWinner(board)

  return {
    winner,
    isDraw: !winner && isBoardFull(board),
  }
}

function minimax(
  board: Board,
  depth: number,
  isAiTurn: boolean,
  aiMark: Mark,
  humanMark: Mark,
): number {
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

function getBestMove(board: Board, aiMark: Mark = MARK_O, humanMark: Mark = MARK_X): number | null {
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

function getRandomMove(board: Board): number | null {
  const moves = getAvailableMoves(board)

  if (moves.length === 0) {
    return null
  }

  return moves[Math.floor(Math.random() * moves.length)]
}

const STRATEGIES: Record<Exclude<Difficulty, 'yourself'>, Strategy> = {
  random: (board) => getRandomMove(board),
  optimal: (board, aiMark, humanMark) => getBestMove(board, aiMark, humanMark),
}

function isAiMode(difficulty: Difficulty): boolean {
  return difficulty !== 'yourself'
}

function getAiMark(playAs: PlayAs): Mark {
  return playAs === MARK_X ? MARK_O : MARK_X
}

function getTurnLabel(currentMark: Mark, playAs: PlayAs, aiMode: boolean): string {
  if (!aiMode) {
    return currentMark
  }

  return currentMark === playAs ? 'You' : 'Opponent'
}

function mapGameResult(winner: Mark, difficulty: Difficulty, playAs: PlayAs): GameResult {
  if (difficulty === 'yourself') {
    return winner === MARK_X ? 'x-win' : 'o-win'
  }

  return winner === playAs ? 'win' : 'lose'
}

function useMatch() {
  const [gameState, setGameState] = useState<GameState>('idle')
  const [currentMark, setCurrentMark] = useState<Mark>(MARK_X)
  const [board, setBoard] = useState<Board>(EMPTY_BOARD)
  const [result, setResult] = useState<GameResult>(null)
  const [difficulty, setDifficulty] = useState<Difficulty>(DEFAULT_DIFFICULTY)
  const [playAs, setPlayAs] = useState<PlayAs>(DEFAULT_PLAY_AS)

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

  const finishMove = (nextBoard: Board, placedMark: Mark) => {
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

    const strategy = STRATEGIES[difficulty as Exclude<Difficulty, 'yourself'>]
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

  const handleCellClick = (index: number) => {
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

  const handlePlayAsChange = (mark: PlayAs) => {
    if (!aiMode) {
      return
    }

    setPlayAs(mark)
  }

  const turnLabel = getTurnLabel(currentMark, playAs, aiMode)
  const isUserTurn = aiMode ? currentMark === playAs : true
  const isPlaying = gameState === 'playing'
  const showBoard = gameState !== 'idle'

  const isCellDisabled = (mark: CellValue) => {
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
    showBoard,
    startGame,
    restartGame,
    handleCellClick,
    handlePlayAsChange,
    setDifficulty,
    isCellDisabled,
  }
}

function MarkX() {
  return (
    <svg className="mark mark-x" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <line x1="20" y1="20" x2="80" y2="80" strokeWidth={MARK_STROKE} />
      <line x1="80" y1="20" x2="20" y2="80" strokeWidth={MARK_STROKE} />
    </svg>
  )
}

function MarkO() {
  return (
    <svg className="mark mark-o" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <circle cx="50" cy="50" r="30" strokeWidth={MARK_STROKE} />
    </svg>
  )
}

type CellProps = {
  index: number
  mark: CellValue
  disabled: boolean
  onClick: (index: number) => void
}

function Cell({ index, mark, disabled, onClick }: CellProps) {
  return (
    <button
      className="cell-button"
      type="button"
      aria-label={`Square ${index + 1}`}
      onClick={() => onClick(index)}
      disabled={disabled}
    >
      {mark === 'X' && <MarkX />}
      {mark === 'O' && <MarkO />}
    </button>
  )
}

type BoardProps = {
  board: Board
  showBoard: boolean
  isCellDisabled: (mark: CellValue) => boolean
  onCellClick: (index: number) => void
}

function Board({ board, showBoard, isCellDisabled, onCellClick }: BoardProps) {
  return (
    <div className="board-wrap">
      <div className="board-container">
        <svg className="board" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
          <line x1="33.333" y1="0" x2="33.333" y2="100" strokeWidth={GRID_STROKE} />
          <line x1="66.666" y1="0" x2="66.666" y2="100" strokeWidth={GRID_STROKE} />
          <line x1="0" y1="33.333" x2="100" y2="33.333" strokeWidth={GRID_STROKE} />
          <line x1="0" y1="66.666" x2="100" y2="66.666" strokeWidth={GRID_STROKE} />
        </svg>

        {showBoard && (
          <div className="cell-grid">
            {board.map((mark, index) => (
              <Cell
                key={index}
                index={index}
                mark={mark}
                disabled={isCellDisabled(mark)}
                onClick={onCellClick}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

type PlayAsPanelProps = {
  playAs: PlayAs
  isAiMode: boolean
  onPlayAsChange: (mark: PlayAs) => void
}

function PlayAsPanel({ playAs, isAiMode, onPlayAsChange }: PlayAsPanelProps) {
  return (
    <aside className="play-as-panel">
      <h2 className="play-as-title">Play As:</h2>
      <div className="play-as-buttons">
        <button
          className={`play-as-button play-as-button--x ${playAs === 'X' ? 'play-as-button--active' : ''}`}
          type="button"
          onClick={() => onPlayAsChange('X')}
          disabled={!isAiMode}
        >
          X
        </button>
        <button
          className={`play-as-button play-as-button--o ${playAs === 'O' ? 'play-as-button--active' : ''}`}
          type="button"
          onClick={() => onPlayAsChange('O')}
          disabled={!isAiMode}
        >
          O
        </button>
      </div>
    </aside>
  )
}

type DifficultyPanelProps = {
  difficulty: Difficulty
  onDifficultyChange: (difficulty: Difficulty) => void
}

function DifficultyPanel({ difficulty, onDifficultyChange }: DifficultyPanelProps) {
  return (
    <aside className="difficulty-panel">
      <h2 className="difficulty-title">Difficulty</h2>
      <div className="difficulty-buttons">
        {DIFFICULTIES.map(({ id, label }) => (
          <button
            key={id}
            className={`difficulty-button ${difficulty === id ? 'difficulty-button--active' : ''}`}
            type="button"
            onClick={() => onDifficultyChange(id)}
          >
            {label}
          </button>
        ))}
      </div>
    </aside>
  )
}

type HeaderProps = {
  playAs: PlayAs
  difficulty: Difficulty
  isAiMode: boolean
  onPlayAsChange: (mark: PlayAs) => void
  onDifficultyChange: (difficulty: Difficulty) => void
}

function Header({ playAs, difficulty, isAiMode, onPlayAsChange, onDifficultyChange }: HeaderProps) {
  return (
    <div className="app-header">
      <h1 className="title">Tic-Tac-Toe</h1>

      <div className="header-body">
        <p className="game-summary">
          Get three in a row to win.
          <br />
          Start begins play.
          <br />
          Play As picks X or O.
          <br />
          Difficulty sets the opponent.
          <br />
          Tap open squares on your turn.
          <br />
          Restart clears the board.
        </p>

        <div className="header-controls">
          <PlayAsPanel playAs={playAs} isAiMode={isAiMode} onPlayAsChange={onPlayAsChange} />
          <DifficultyPanel difficulty={difficulty} onDifficultyChange={onDifficultyChange} />
        </div>
      </div>
    </div>
  )
}

type MatchStatusProps = {
  gameState: GameState
  result: GameResult
  isAiMode: boolean
  isUserTurn: boolean
  currentMark: Mark
  turnLabel: string
  onStart: () => void
  onRestart: () => void
}

function MatchStatus({
  gameState,
  result,
  isAiMode,
  isUserTurn,
  currentMark,
  turnLabel,
  onStart,
  onRestart,
}: MatchStatusProps) {
  return (
    <div className="game-status">
      {gameState === 'idle' || gameState === 'ended' ? (
        <button
          className="game-action"
          type="button"
          onClick={gameState === 'idle' ? onStart : onRestart}
        >
          {gameState === 'idle' ? 'Start' : 'Restart'}
        </button>
      ) : (
        <p
          className={`turn-label ${
            isAiMode
              ? isUserTurn
                ? 'turn-label--user'
                : 'turn-label--opponent'
              : currentMark === 'X'
                ? 'turn-label--user'
                : 'turn-label--opponent'
          }`}
        >
          Turn: {turnLabel}
        </p>
      )}

      {result === 'win' && <p className="game-result game-result--win">You Win</p>}
      {result === 'lose' && <p className="game-result game-result--lose">You Lose</p>}
      {result === 'x-win' && <p className="game-result game-result--win">X Wins</p>}
      {result === 'o-win' && <p className="game-result game-result--lose">O Wins</p>}
      {result === 'draw' && <p className="game-result game-result--draw">Draw</p>}
    </div>
  )
}

function App() {
  const {
    gameState,
    board,
    result,
    difficulty,
    playAs,
    aiMode,
    currentMark,
    turnLabel,
    isUserTurn,
    showBoard,
    startGame,
    restartGame,
    handleCellClick,
    handlePlayAsChange,
    setDifficulty,
    isCellDisabled,
  } = useMatch()

  return (
    <main className="app">
      <Header
        playAs={playAs}
        difficulty={difficulty}
        isAiMode={aiMode}
        onPlayAsChange={handlePlayAsChange}
        onDifficultyChange={setDifficulty}
      />

      <MatchStatus
        gameState={gameState}
        result={result}
        isAiMode={aiMode}
        isUserTurn={isUserTurn}
        currentMark={currentMark}
        turnLabel={turnLabel}
        onStart={startGame}
        onRestart={restartGame}
      />

      <Board
        board={board}
        showBoard={showBoard}
        isCellDisabled={isCellDisabled}
        onCellClick={handleCellClick}
      />
    </main>
  )
}

const rootElement = document.getElementById('root')

if (rootElement) {
  createRoot(rootElement).render(<App />)
}
