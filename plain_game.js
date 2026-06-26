const MARK_X = 'X'
const MARK_O = 'O'
const CELL_COUNT = 9
const EMPTY_BOARD = Array(CELL_COUNT).fill(null)
const AI_MOVE_DELAY_MS = 400

const WIN_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
]

const DIFFICULTIES = [
  { id: 'yourself', label: 'Play Yourself' },
  { id: 'random', label: 'Random' },
  { id: 'optimal', label: 'Optimal' },
]

const DEFAULT_DIFFICULTY = 'optimal'
const DEFAULT_PLAY_AS = 'X'

function checkWinner(board) {
  for (const [a, b, c] of WIN_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a]
    }
  }

  return null
}

function getAvailableMoves(board) {
  return board.reduce((moves, cell, index) => {
    if (cell === null) {
      moves.push(index)
    }

    return moves
  }, [])
}

function isBoardFull(board) {
  return board.every((cell) => cell !== null)
}

function resolveGameOutcome(board) {
  const winner = checkWinner(board)

  return {
    winner,
    isDraw: !winner && isBoardFull(board),
  }
}

function minimax(board, depth, isAiTurn, aiMark, humanMark) {
  const winner = checkWinner(board)

  if (winner === aiMark) {
    return 10 - depth
  }

  if (winner === humanMark) {
    return depth - 10
  }

  if (isBoardFull(board)) {
    return 0
  }

  const availableMoves = getAvailableMoves(board)

  if (isAiTurn) {
    return availableMoves.reduce((bestScore, move) => {
      board[move] = aiMark
      const score = minimax(board, depth + 1, false, aiMark, humanMark)
      board[move] = null
      return Math.max(score, bestScore)
    }, -Infinity)
  }

  return availableMoves.reduce((bestScore, move) => {
    board[move] = humanMark
    const score = minimax(board, depth + 1, true, aiMark, humanMark)
    board[move] = null
    return Math.min(score, bestScore)
  }, Infinity)
}

function getBestMove(board, aiMark = MARK_O, humanMark = MARK_X) {
  const boardCopy = [...board]
  const availableMoves = getAvailableMoves(boardCopy)

  if (availableMoves.length === 0) {
    return null
  }

  let bestMove = availableMoves[0]
  let bestScore = -Infinity

  for (const move of availableMoves) {
    boardCopy[move] = aiMark
    const score = minimax(boardCopy, 0, false, aiMark, humanMark)
    boardCopy[move] = null

    if (score > bestScore) {
      bestScore = score
      bestMove = move
    }
  }

  return bestMove
}

function getRandomMove(board) {
  const moves = getAvailableMoves(board)

  if (moves.length === 0) {
    return null
  }

  return moves[Math.floor(Math.random() * moves.length)]
}

const STRATEGIES = {
  random: (board) => getRandomMove(board),
  optimal: (board, aiMark, humanMark) => getBestMove(board, aiMark, humanMark),
}

function isAiMode(difficulty) {
  return difficulty !== 'yourself'
}

function getAiMark(playAs) {
  return playAs === MARK_X ? MARK_O : MARK_X
}

function getTurnLabel(currentMark, playAs, aiMode) {
  if (!aiMode) {
    return currentMark
  }

  return currentMark === playAs ? 'You' : 'Opponent'
}

function mapGameResult(winner, difficulty, playAs) {
  if (!winner) {
    return 'draw'
  }

  if (difficulty === 'yourself') {
    return winner === MARK_X ? 'x-win' : 'o-win'
  }

  return winner === playAs ? 'win' : 'lose'
}

const MARK_X_SVG =
  '<svg class="mark mark-x" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" aria-hidden="true">' +
  '<line x1="20" y1="20" x2="80" y2="80" stroke-width="11" />' +
  '<line x1="80" y1="20" x2="20" y2="80" stroke-width="11" />' +
  '</svg>'

const MARK_O_SVG =
  '<svg class="mark mark-o" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" aria-hidden="true">' +
  '<circle cx="50" cy="50" r="30" stroke-width="11" />' +
  '</svg>'

const state = {
  gameState: 'idle',
  currentMark: MARK_X,
  board: [...EMPTY_BOARD],
  result: null,
  difficulty: DEFAULT_DIFFICULTY,
  playAs: DEFAULT_PLAY_AS,
  aiTimer: null,
}

function getAiMode() {
  return isAiMode(state.difficulty)
}

function getAiMarkForState() {
  return getAiMark(state.playAs)
}

function resetBoard() {
  state.board = [...EMPTY_BOARD]
  state.result = null
}

function clearAiTimer() {
  if (state.aiTimer !== null) {
    clearTimeout(state.aiTimer)
    state.aiTimer = null
  }
}

function finishMove(nextBoard, placedMark) {
  state.board = nextBoard

  const { winner, isDraw } = resolveGameOutcome(nextBoard)

  if (winner) {
    state.result = mapGameResult(winner, state.difficulty, state.playAs)
    state.gameState = 'ended'
    render()
    return
  }

  if (isDraw) {
    state.result = 'draw'
    state.gameState = 'ended'
    render()
    return
  }

  state.currentMark = placedMark === MARK_X ? MARK_O : MARK_X
  render()
  scheduleAiMove()
}

function scheduleAiMove() {
  clearAiTimer()

  const aiMode = getAiMode()
  const aiMark = getAiMarkForState()

  if (state.gameState !== 'playing' || state.currentMark !== aiMark || !aiMode) {
    return
  }

  const strategy = STRATEGIES[state.difficulty]
  if (!strategy) {
    return
  }

  state.aiTimer = setTimeout(() => {
    state.aiTimer = null

    const move = strategy(state.board, aiMark, state.playAs)

    if (move === null) {
      return
    }

    const nextBoard = [...state.board]
    nextBoard[move] = aiMark
    finishMove(nextBoard, aiMark)
  }, AI_MOVE_DELAY_MS)
}

function startGame() {
  clearAiTimer()
  state.currentMark = MARK_X
  resetBoard()
  state.gameState = 'playing'
  render()
  scheduleAiMove()
}

function restartGame() {
  startGame()
}

function handleCellClick(index) {
  if (state.gameState !== 'playing' || state.board[index]) {
    return
  }

  const aiMode = getAiMode()

  if (aiMode && state.currentMark !== state.playAs) {
    return
  }

  clearAiTimer()

  const nextBoard = [...state.board]
  const placedMark = aiMode ? state.playAs : state.currentMark
  nextBoard[index] = placedMark
  finishMove(nextBoard, placedMark)
}

function handlePlayAsChange(mark) {
  if (!getAiMode()) {
    return
  }

  state.playAs = mark
  render()
}

function setDifficulty(difficulty) {
  state.difficulty = difficulty
  render()
}

function isCellDisabled(mark) {
  if (state.gameState !== 'playing' || mark) {
    return true
  }

  if (!getAiMode()) {
    return false
  }

  return state.currentMark !== state.playAs
}

function renderPlayAsPanel() {
  const aiMode = getAiMode()
  const panel = document.getElementById('play-as-panel')

  panel.querySelectorAll('.play-as-button').forEach((button) => {
    const mark = button.dataset.mark
    button.classList.toggle('play-as-button--active', mark === state.playAs)
    button.disabled = !aiMode
  })
}

function renderDifficultyPanel() {
  document.querySelectorAll('.difficulty-button').forEach((button) => {
    button.classList.toggle('difficulty-button--active', button.dataset.difficulty === state.difficulty)
  })
}

function renderGameStatus() {
  const statusEl = document.getElementById('game-status')
  statusEl.innerHTML = ''

  if (state.gameState === 'idle' || state.gameState === 'ended') {
    const button = document.createElement('button')
    button.className = 'game-action'
    button.type = 'button'
    button.textContent = state.gameState === 'idle' ? 'Start' : 'Restart'
    button.addEventListener('click', state.gameState === 'idle' ? startGame : restartGame)
    statusEl.appendChild(button)
  } else {
    const aiMode = getAiMode()
    const isUserTurn = aiMode ? state.currentMark === state.playAs : true
    const turnLabel = getTurnLabel(state.currentMark, state.playAs, aiMode)

    const turnEl = document.createElement('p')
    let turnClass = 'turn-label'

    if (aiMode) {
      turnClass += isUserTurn ? ' turn-label--user' : ' turn-label--opponent'
    } else {
      turnClass += state.currentMark === MARK_X ? ' turn-label--user' : ' turn-label--opponent'
    }

    turnEl.className = turnClass
    turnEl.textContent = `Turn: ${turnLabel}`
    statusEl.appendChild(turnEl)
  }

  if (state.result === 'win') {
    const resultEl = document.createElement('p')
    resultEl.className = 'game-result game-result--win'
    resultEl.textContent = 'You Win'
    statusEl.appendChild(resultEl)
  } else if (state.result === 'lose') {
    const resultEl = document.createElement('p')
    resultEl.className = 'game-result game-result--lose'
    resultEl.textContent = 'You Lose'
    statusEl.appendChild(resultEl)
  } else if (state.result === 'x-win') {
    const resultEl = document.createElement('p')
    resultEl.className = 'game-result game-result--win'
    resultEl.textContent = 'X Wins'
    statusEl.appendChild(resultEl)
  } else if (state.result === 'o-win') {
    const resultEl = document.createElement('p')
    resultEl.className = 'game-result game-result--lose'
    resultEl.textContent = 'O Wins'
    statusEl.appendChild(resultEl)
  } else if (state.result === 'draw') {
    const resultEl = document.createElement('p')
    resultEl.className = 'game-result game-result--draw'
    resultEl.textContent = 'Draw'
    statusEl.appendChild(resultEl)
  }
}

function renderBoard() {
  const cellGrid = document.getElementById('cell-grid')
  const showBoard = state.gameState !== 'idle'

  cellGrid.hidden = !showBoard

  if (!showBoard) {
    return
  }

  cellGrid.querySelectorAll('.cell-button').forEach((button, index) => {
    const mark = state.board[index]
    const disabled = isCellDisabled(mark)

    button.disabled = disabled
    button.innerHTML = ''

    if (mark === MARK_X) {
      button.innerHTML = MARK_X_SVG
    } else if (mark === MARK_O) {
      button.innerHTML = MARK_O_SVG
    }
  })
}

function render() {
  renderPlayAsPanel()
  renderDifficultyPanel()
  renderGameStatus()
  renderBoard()
}

function initDifficultyButtons() {
  const container = document.getElementById('difficulty-buttons')
  container.innerHTML = ''

  DIFFICULTIES.forEach(({ id, label }) => {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'difficulty-button'
    button.dataset.difficulty = id
    button.textContent = label
    button.addEventListener('click', () => setDifficulty(id))
    container.appendChild(button)
  })
}

function initPlayAsButtons() {
  document.querySelectorAll('.play-as-button').forEach((button) => {
    button.addEventListener('click', () => handlePlayAsChange(button.dataset.mark))
  })
}

function initBoard() {
  const cellGrid = document.getElementById('cell-grid')
  cellGrid.innerHTML = ''

  for (let index = 0; index < CELL_COUNT; index += 1) {
    const button = document.createElement('button')
    button.className = 'cell-button'
    button.type = 'button'
    button.setAttribute('aria-label', `Square ${index + 1}`)
    button.addEventListener('click', () => handleCellClick(index))
    cellGrid.appendChild(button)
  }
}

function init() {
  initDifficultyButtons()
  initPlayAsButtons()
  initBoard()
  render()
}

init()
