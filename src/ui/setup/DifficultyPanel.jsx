import { DIFFICULTIES } from '../../setup/options.js'

export default function DifficultyPanel({ difficulty, onDifficultyChange }) {
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
