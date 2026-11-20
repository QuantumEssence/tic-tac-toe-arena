export const WIN_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export function checkLineWinner(cells) {
  for (let i = 0; i < WIN_LINES.length; i++) {
    const [a, b, c] = WIN_LINES[i];
    if (cells[a] && cells[a] === cells[b] && cells[a] === cells[c]) {
      return { winner: cells[a], line: [a, b, c] };
    }
  }
  return { winner: null, line: null };
}

export function createNormalState() {
  return {
    difficulty: 'normal',
    board: Array(9).fill(null),
    turn: 'X',
    winner: null,
    winLine: null,
    isDraw: false,
    lastMove: null,
    moveCount: 0,
  };
}

export function applyNormalMove(state, cellIndex, symbol) {
  if (!state || state.difficulty !== 'normal') {
    return { valid: false, reason: 'Invalid game mode', state };
  }
  if (state.winner || state.isDraw) {
    return { valid: false, reason: 'Match already finished', state };
  }
  if (symbol !== 'X' && symbol !== 'O') {
    return { valid: false, reason: 'Invalid player symbol', state };
  }
  if (state.turn !== symbol) {
    return { valid: false, reason: 'Not your turn', state };
  }
  if (!Number.isInteger(cellIndex) || cellIndex < 0 || cellIndex > 8) {
    return { valid: false, reason: 'Cell index out of bounds', state };
  }
  if (state.board[cellIndex] !== null) {
    return { valid: false, reason: 'Cell is already occupied', state };
  }

  const nextBoard = state.board.slice();
  nextBoard[cellIndex] = symbol;

  const { winner, line } = checkLineWinner(nextBoard);
  const isDraw = !winner && nextBoard.every(Boolean);
  const nextTurn = symbol === 'X' ? 'O' : 'X';

  return {
    valid: true,
    state: {
      ...state,
      board: nextBoard,
      turn: winner || isDraw ? state.turn : nextTurn,
      winner: winner || null,
      winLine: line || null,
      isDraw,
      lastMove: { cellIndex, symbol },
      moveCount: (state.moveCount || 0) + 1,
    },
  };
}

export function createExpertState() {
  return {
    difficulty: 'expert',
    macroBoard: Array(9).fill(null),
    miniBoards: Array.from({ length: 9 }, () => Array(9).fill(null)),
    miniWinLines: Array(9).fill(null),
    resetCounts: Array(9).fill(0),
    turn: 'X',
    winner: null,
    winLine: null,
    isDraw: false,
    lastMove: null,
    lastReset: null,
    moveCount: 0,
  };
}

/**
 * Free-Choice Nested 3x3 Expert Rules:
 * - Players can play in any empty cell of any un-won mini-board on every turn.
 * - Winning a mini-board claims that macro cell.
 * - If a mini-board fills with no winner (draw), it automatically resets to 9 empty cells.
 */
export function applyExpertMove(state, boardIndex, cellIndex, symbol) {
  if (!state || state.difficulty !== 'expert') {
    return { valid: false, reason: 'Invalid game mode', state };
  }
  if (state.winner || state.isDraw) {
    return { valid: false, reason: 'Match already finished', state };
  }
  if (symbol !== 'X' && symbol !== 'O') {
    return { valid: false, reason: 'Invalid player symbol', state };
  }
  if (state.turn !== symbol) {
    return { valid: false, reason: 'Not your turn', state };
  }
  if (
    !Number.isInteger(boardIndex) ||
    boardIndex < 0 ||
    boardIndex > 8 ||
    !Number.isInteger(cellIndex) ||
    cellIndex < 0 ||
    cellIndex > 8
  ) {
    return { valid: false, reason: 'Board or cell index out of bounds', state };
  }
  if (state.macroBoard[boardIndex] !== null) {
    return { valid: false, reason: 'Mini-board already claimed', state };
  }
  if (state.miniBoards[boardIndex][cellIndex] !== null) {
    return { valid: false, reason: 'Cell is already occupied', state };
  }

  const nextMacro = state.macroBoard.slice();
  const nextMiniBoards = state.miniBoards.map((mini, idx) =>
    idx === boardIndex ? mini.slice() : mini.slice()
  );
  const nextMiniWinLines = state.miniWinLines.slice();
  const nextResetCounts = state.resetCounts.slice();

  nextMiniBoards[boardIndex][cellIndex] = symbol;

  let lastReset = state.lastReset || null;
  let capturedMiniBoard = null;
  let resetMiniBoard = null;

  const miniResult = checkLineWinner(nextMiniBoards[boardIndex]);
  if (miniResult.winner) {
    nextMacro[boardIndex] = miniResult.winner;
    nextMiniWinLines[boardIndex] = miniResult.line;
    capturedMiniBoard = boardIndex;
  } else if (nextMiniBoards[boardIndex].every(Boolean)) {
    // Auto-Reset on mini-board draw
    nextMiniBoards[boardIndex] = Array(9).fill(null);
    nextResetCounts[boardIndex] = (nextResetCounts[boardIndex] || 0) + 1;
    lastReset = {
      boardIndex,
      count: nextResetCounts[boardIndex],
      at: Date.now(),
    };
    resetMiniBoard = boardIndex;
  }

  const macroResult = checkLineWinner(nextMacro);
  const isDraw = !macroResult.winner && nextMacro.every(Boolean);
  const nextTurn = symbol === 'X' ? 'O' : 'X';

  return {
    valid: true,
    capturedMiniBoard,
    resetMiniBoard,
    state: {
      ...state,
      macroBoard: nextMacro,
      miniBoards: nextMiniBoards,
      miniWinLines: nextMiniWinLines,
      resetCounts: nextResetCounts,
      turn: macroResult.winner || isDraw ? state.turn : nextTurn,
      winner: macroResult.winner || null,
      winLine: macroResult.line || null,
      isDraw,
      lastMove: { boardIndex, cellIndex, symbol },
      lastReset,
      moveCount: (state.moveCount || 0) + 1,
    },
  };
}

function encodeBoard(cells) {
  return cells.map((c) => (c === 'X' || c === 'O' ? c : '.')).join('');
}

function decodeBoard(str) {
  const safe = typeof str === 'string' ? str.padEnd(9, '.') : '.........';
  const out = [];
  for (let i = 0; i < 9; i++) {
    const ch = safe[i];
    out.push(ch === 'X' || ch === 'O' ? ch : null);
  }
  return out;
}

/**
 * Serializes game state using fixed-length strings so Firebase RTDB never strips null slots.
 */
export function serializeGameState(state) {
  if (!state) return null;
  if (state.difficulty === 'expert') {
    return {
      difficulty: 'expert',
      macroStr: encodeBoard(state.macroBoard),
      miniStrs: state.miniBoards.map(encodeBoard),
      resetCounts: state.resetCounts.map((n) => Number(n) || 0),
      turn: state.turn || 'X',
      winner: state.winner || '',
      isDraw: Boolean(state.isDraw),
      lastMove: state.lastMove || null,
      lastReset: state.lastReset || null,
      moveCount: Number(state.moveCount) || 0,
    };
  }
  return {
    difficulty: 'normal',
    boardStr: encodeBoard(state.board),
    turn: state.turn || 'X',
    winner: state.winner || '',
    isDraw: Boolean(state.isDraw),
    lastMove: state.lastMove || null,
    moveCount: Number(state.moveCount) || 0,
  };
}

export function deserializeGameState(raw) {
  if (!raw) return createNormalState();
  if (raw.difficulty === 'expert') {
    if (Array.isArray(raw.macroBoard) && Array.isArray(raw.miniBoards)) {
      return raw;
    }
    const macroBoard = decodeBoard(raw.macroStr);
    const miniStrs = Array.isArray(raw.miniStrs) ? raw.miniStrs : [];
    const miniBoards = Array.from({ length: 9 }, (_, i) => decodeBoard(miniStrs[i]));
    const miniWinLines = miniBoards.map((mini, idx) =>
      macroBoard[idx] ? checkLineWinner(mini).line : null
    );
    const resetCounts = Array.from({ length: 9 }, (_, i) =>
      Array.isArray(raw.resetCounts) ? Number(raw.resetCounts[i]) || 0 : 0
    );
    const macroRes = checkLineWinner(macroBoard);
    const winner = raw.winner || macroRes.winner || null;
    return {
      difficulty: 'expert',
      macroBoard,
      miniBoards,
      miniWinLines,
      resetCounts,
      turn: raw.turn || 'X',
      winner: winner || null,
      winLine: winner ? macroRes.line : null,
      isDraw: Boolean(raw.isDraw),
      lastMove: raw.lastMove || null,
      lastReset: raw.lastReset || null,
      moveCount: Number(raw.moveCount) || 0,
    };
  }

  if (Array.isArray(raw.board)) {
    return raw;
  }
  const board = decodeBoard(raw.boardStr);
  const res = checkLineWinner(board);
  const winner = raw.winner || res.winner || null;
  return {
    difficulty: 'normal',
    board,
    turn: raw.turn || 'X',
    winner: winner || null,
    winLine: winner ? res.line : null,
    isDraw: Boolean(raw.isDraw),
    lastMove: raw.lastMove || null,
    moveCount: Number(raw.moveCount) || 0,
  };
}

export function getLegalMoves(state) {
  if (!state || state.winner || state.isDraw) return [];
  if (state.difficulty === 'expert') {
    const moves = [];
    for (let b = 0; b < 9; b++) {
      if (state.macroBoard[b] !== null) continue;
      for (let c = 0; c < 9; c++) {
        if (state.miniBoards[b][c] === null) {
          moves.push({ boardIndex: b, cellIndex: c });
        }
      }
    }
    return moves;
  }
  const moves = [];
  for (let c = 0; c < 9; c++) {
    if (state.board[c] === null) {
      moves.push({ cellIndex: c });
    }
  }
  return moves;
}
