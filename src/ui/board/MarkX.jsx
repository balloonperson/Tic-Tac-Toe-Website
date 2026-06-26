const MARK_STROKE = 11

export default function MarkX() {
  return (
    <svg className="mark mark-x" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <line x1="20" y1="20" x2="80" y2="80" strokeWidth={MARK_STROKE} />
      <line x1="80" y1="20" x2="20" y2="80" strokeWidth={MARK_STROKE} />
    </svg>
  )
}
