import { useState } from 'react'

const CELL_COUNT = 9

function App() {
  const [gameState, setGameState] = useState('idle')
  const [currentTurn, setCurrentTurn] = useState('user')

  const startGame = () => {
    setCurrentTurn('user')
    setGameState('playing')
  }

  const restartGame = () => {
    setCurrentTurn('user')
    setGameState('playing')
  }

  const turnLabel = currentTurn === 'user' ? 'You' : 'Opponent'
  const isPlaying = gameState === 'playing'

  return (
    <main className="app">
      <h1 className="title">Tic-Tac-Toe</h1>

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
              {Array.from({ length: CELL_COUNT }, (_, index) => (
                <button
                  key={index}
                  className="cell-button"
                  type="button"
                  aria-label={`Square ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

export default App
