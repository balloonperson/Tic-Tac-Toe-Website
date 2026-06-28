import { AnimatedMarkX } from '../../animations/index.js'
import MarkO from './MarkO.jsx'

export default function Cell({ index, mark, disabled, onClick }) {
  return (
    <button
      className="cell-button"
      type="button"
      aria-label={`Square ${index + 1}`}
      onClick={() => onClick(index)}
      disabled={disabled}
    >
      {mark === 'X' && <AnimatedMarkX />}
      {mark === 'O' && <MarkO />}
    </button>
  )
}
