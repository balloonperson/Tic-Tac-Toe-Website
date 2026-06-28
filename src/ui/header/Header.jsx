import PlayAsPanel from '../setup/PlayAsPanel.jsx'
import DifficultyPanel from '../setup/DifficultyPanel.jsx'

export default function Header({
  playAs,
  difficulty,
  isAiMode,
  onPlayAsChange,
  onDifficultyChange,
}) {
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
          <PlayAsPanel
            playAs={playAs}
            isAiMode={isAiMode}
            onPlayAsChange={onPlayAsChange}
          />
          <DifficultyPanel difficulty={difficulty} onDifficultyChange={onDifficultyChange} />
        </div>
      </div>
    </div>
  )
}
