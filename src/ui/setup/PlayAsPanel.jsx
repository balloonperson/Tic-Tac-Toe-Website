export default function PlayAsPanel({ playAs, isAiMode, onPlayAsChange }) {
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
