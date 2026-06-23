export default function MatchStatus({
  gameState,
  result,
  isAiMode,
  isUserTurn,
  currentMark,
  turnLabel,
  onStart,
  onRestart,
}) {
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
