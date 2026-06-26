import MarkO from './MarkO.jsx'
import MarkX from './MarkX.jsx'

export default function Cell({ index, mark, disabled, onClick }) {
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
