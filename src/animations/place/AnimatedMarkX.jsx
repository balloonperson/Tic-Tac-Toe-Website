import MarkX from '../../ui/board/MarkX.jsx'
import { useXPlaceAnimation } from './useXPlaceAnimation.js'

export default function AnimatedMarkX() {
  const placeClass = useXPlaceAnimation()
  return <MarkX className={placeClass} />
}
