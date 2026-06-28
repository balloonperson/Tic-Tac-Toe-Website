import { useMatch } from './match/useMatch.js'
import Board from './ui/board/Board.jsx'
import Header from './ui/header/Header.jsx'
import MatchStatus from './ui/status/MatchStatus.jsx'

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

export default App
