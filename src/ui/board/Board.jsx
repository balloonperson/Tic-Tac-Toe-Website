import Cell from './Cell.jsx'

const GRID_STROKE = 0.45

export default function Board({ board, showBoard, isCellDisabled, onCellClick }) {
  return (
    <div className="board-wrap">
      <div className="board-container">
        <svg className="board" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
          <line x1="33.333" y1="0" x2="33.333" y2="100" strokeWidth={GRID_STROKE} />
          <line x1="66.666" y1="0" x2="66.666" y2="100" strokeWidth={GRID_STROKE} />
          <line x1="0" y1="33.333" x2="100" y2="33.333" strokeWidth={GRID_STROKE} />
          <line x1="0" y1="66.666" x2="100" y2="66.666" strokeWidth={GRID_STROKE} />
        </svg>

        {showBoard && (
          <div className="cell-grid">
            {board.map((mark, index) => (
              <Cell
                key={index}
                index={index}
                mark={mark}
                disabled={isCellDisabled(mark)}
                onClick={onCellClick}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
