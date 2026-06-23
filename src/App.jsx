import { useEffect, useState } from 'react'
import { getBestMove, getRandomMove } from './game/ai.js'
import { EMPTY_BOARD, resolveGameOutcome } from './game/board.js'

const DIFFICULTIES = [
  { id: 'yourself', label: 'Play Yourself' },
  { id: 'random', label: 'Random' },
  { id: 'optimal', label: 'Optimal' },
]

function App() {
  const [gameState, setGameState] = useState('idle')
  const [currentMark, setCurrentMark] = useState('X')
  const [board, setBoard] = useState(EMPTY_BOARD)
  const [result, setResult] = useState(null)
  const [difficulty, setDifficulty] = useState('optimal')
  const [playAs, setPlayAs] = useState('X')

  const isAiMode = difficulty !== 'yourself'
  const aiMark = playAs === 'X' ? 'O' : 'X'

  const resetBoard = () => {
    setBoard(EMPTY_BOARD)
    setResult(null)
  }

  const startGame = () => {
    setCurrentMark('X')
    resetBoard()
    setGameState('playing')
  }

  const restartGame = () => {
    setCurrentMark('X')
    resetBoard()
    setGameState('playing')
  }

  const finishMove = (nextBoard, placedMark) => {
    setBoard(nextBoard)

    const { winner, isDraw } = resolveGameOutcome(nextBoard)

    if (winner) {
      if (difficulty === 'yourself') {
        setResult(winner === 'X' ? 'x-win' : 'o-win')
      } else {
        setResult(winner === playAs ? 'win' : 'lose')
      }
      setGameState('ended')
      return
    }

    if (isDraw) {
      setResult('draw')
      setGameState('ended')
      return
    }

    setCurrentMark(placedMark === 'X' ? 'O' : 'X')
  }

  useEffect(() => {
    if (gameState !== 'playing' || currentMark !== aiMark) {
      return
    }

    if (!isAiMode) {
      return
    }

    const timer = setTimeout(() => {
      const move =
        difficulty === 'optimal' ? getBestMove(board, aiMark, playAs) : getRandomMove(board)

      if (move === null) {
        return
      }

      const nextBoard = [...board]
      nextBoard[move] = aiMark
      finishMove(nextBoard, aiMark)
    }, 400)

    return () => clearTimeout(timer)
  }, [gameState, currentMark, board, difficulty, playAs, aiMark, isAiMode])

  const handleCellClick = (index) => {
    if (gameState !== 'playing' || board[index]) {
      return
    }

    if (isAiMode && currentMark !== playAs) {
      return
    }

    const nextBoard = [...board]
    nextBoard[index] = isAiMode ? playAs : currentMark
    finishMove(nextBoard, isAiMode ? playAs : currentMark)
  }

  const handlePlayAsChange = (mark) => {
    if (!isAiMode) {
      return
    }

    setPlayAs(mark)
  }

  const turnLabel = isAiMode
    ? currentMark === playAs
      ? 'You'
      : 'Opponent'
    : currentMark

  const isUserTurn = isAiMode ? currentMark === playAs : true
  const isPlaying = gameState === 'playing'
  const showBoard = gameState !== 'idle'

  const isCellDisabled = (mark) => {
    if (!isPlaying || mark) {
      return true
    }

    if (!isAiMode) {
      return false
    }

    return currentMark !== playAs
  }

  return (
    <main className="app">
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
          <aside className="play-as-panel">
            <h2 className="play-as-title">Play As:</h2>
            <div className="play-as-buttons">
              <button
                className={`play-as-button play-as-button--x ${playAs === 'X' ? 'play-as-button--active' : ''}`}
                type="button"
                onClick={() => handlePlayAsChange('X')}
                disabled={!isAiMode}
              >
                X
              </button>
              <button
                className={`play-as-button play-as-button--o ${playAs === 'O' ? 'play-as-button--active' : ''}`}
                type="button"
                onClick={() => handlePlayAsChange('O')}
                disabled={!isAiMode}
              >
                O
              </button>
            </div>
          </aside>

          <aside className="difficulty-panel">
          <h2 className="difficulty-title">Difficulty</h2>
          <div className="difficulty-buttons">
            {DIFFICULTIES.map(({ id, label }) => (
              <button
                key={id}
                className={`difficulty-button ${difficulty === id ? 'difficulty-button--active' : ''}`}
                type="button"
                onClick={() => setDifficulty(id)}
              >
                {label}
              </button>
            ))}
          </div>
        </aside>
          </div>
        </div>
      </div>

      <div className="game-status">
        {gameState === 'idle' || gameState === 'ended' ? (
          <button
            className="game-action"
            type="button"
            onClick={gameState === 'idle' ? startGame : restartGame}
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

      <div className="board-wrap">
        <div className="board-container">
          <svg className="board" viewBox="0 0 100 100" aria-hidden="true">
            <line x1="33.333" y1="0" x2="33.333" y2="100" />
            <line x1="66.666" y1="0" x2="66.666" y2="100" />
            <line x1="0" y1="33.333" x2="100" y2="33.333" />
            <line x1="0" y1="66.666" x2="100" y2="66.666" />
          </svg>

          {showBoard && (
            <div className="cell-grid">
              {board.map((mark, index) => (
                <button
                  key={index}
                  className="cell-button"
                  type="button"
                  aria-label={`Square ${index + 1}`}
                  onClick={() => handleCellClick(index)}
                  disabled={isCellDisabled(mark)}
                >
                  {mark === 'X' && (
                    <svg className="mark mark-x" viewBox="0 0 100 100" aria-hidden="true">
                      <line x1="20" y1="20" x2="80" y2="80" />
                      <line x1="80" y1="20" x2="20" y2="80" />
                    </svg>
                  )}
                  {mark === 'O' && (
                    <svg className="mark mark-o" viewBox="0 0 100 100" aria-hidden="true">
                      <circle cx="50" cy="50" r="30" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

export default App
