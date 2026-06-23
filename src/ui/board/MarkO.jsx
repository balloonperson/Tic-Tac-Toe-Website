const MARK_STROKE = 11

export default function MarkO() {
  return (
    <svg className="mark mark-o" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <circle cx="50" cy="50" r="30" strokeWidth={MARK_STROKE} />
    </svg>
  )
}
