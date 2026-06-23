import { useEffect, useState } from 'react'
import { getBestMove } from './game/ai.js'
import { EMPTY_BOARD, resolveGameOutcome } from './game/board.js'

function App() {
  const [gameState, setGameState] = useState('idle')
  const [currentTurn, setCurrentTurn] = useState('user')
  const [board, setBoard] = useState(EMPTY_BOARD)
  const [result, setResult] = useState(null)

  const resetBoard = () => {
    setBoard(EMPTY_BOARD)
    setResult(null)
  }

  const startGame = () => {
    setCurrentTurn('user')
    resetBoard()
    setGameState('playing')
  }

  const restartGame = () => {
    setCurrentTurn('user')
    resetBoard()
    setGameState('playing')
  }

  const finishMove = (nextBoard, placedMark) => {
    setBoard(nextBoard)

    const { winner, isDraw } = resolveGameOutcome(nextBoard)

    if (winner === 'X') {
      setResult('win')
      setGameState('ended')
      return
    }

    if (winner === 'O') {
      setResult('lose')
      setGameState('ended')
      return
    }

    if (isDraw) {
      setResult('draw')
      setGameState('ended')
      return
    }

    setCurrentTurn(placedMark === 'X' ? 'opponent' : 'user')
  }

  useEffect(() => {
    if (gameState !== 'playing' || currentTurn !== 'opponent') {
      return
    }

    const timer = setTimeout(() => {
      const move = getBestMove(board)

      if (move === null) {
        return
      }

      const nextBoard = [...board]
      nextBoard[move] = 'O'
      finishMove(nextBoard, 'O')
    }, 400)

    return () => clearTimeout(timer)
  }, [gameState, currentTurn, board])

  const handleCellClick = (index) => {
    if (gameState !== 'playing' || currentTurn !== 'user' || board[index]) {
      return
    }

    const nextBoard = [...board]
    nextBoard[index] = 'X'
    finishMove(nextBoard, 'X')
  }

  const turnLabel = currentTurn === 'user' ? 'You' : 'Opponent'
  const isPlaying = gameState === 'playing'

  return (
    <main className="app">
      <h1 className="title">Tic-Tac-Toe</h1>

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
          <p className={`turn-label ${currentTurn === 'user' ? 'turn-label--user' : 'turn-label--opponent'}`}>
            Turn: {turnLabel}
          </p>
        )}

        {result === 'win' && <p className="game-result game-result--win">You Win</p>}
        {result === 'lose' && <p className="game-result game-result--lose">You Lose</p>}
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

          {isPlaying && (
            <div className="cell-grid">
              {board.map((mark, index) => (
                <button
                  key={index}
                  className="cell-button"
                  type="button"
                  aria-label={`Square ${index + 1}`}
                  onClick={() => handleCellClick(index)}
                  disabled={Boolean(mark) || currentTurn !== 'user'}
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
