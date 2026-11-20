import { WIN_LINES, checkLineWinner, getLegalMoves } from './gameLogic.js';

export const BOT_NAMES = [
  'NovaBot',
  'HexMind',
  'PulseAI',
  'CipherX',
  'VoltBot',
  'AstraAI',
  'ApexUnit',
  'EchoBot',
];

const MACRO_WEIGHTS = [1.3, 1.0, 1.3, 1.0, 1.65, 1.0, 1.3, 1.0, 1.3];
const CELL_WEIGHTS = [1.15, 0.9, 1.15, 0.9, 1.35, 0.9, 1.15, 0.9, 1.15];

function pickRandom(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function findImmediateLineWinners(cells, symbol) {
  const winningCells = [];
  for (let i = 0; i < 9; i++) {
    if (cells[i] !== null) continue;
    const copy = cells.slice();
    copy[i] = symbol;
    if (checkLineWinner(copy).winner === symbol) {
      winningCells.push(i);
    }
  }
  return winningCells;
}

function countOpenThreats(cells, symbol) {
  const opp = symbol === 'X' ? 'O' : 'X';
  let twoInRow = 0;
  let oneInRow = 0;
  for (const [a, b, c] of WIN_LINES) {
    const line = [cells[a], cells[b], cells[c]];
    if (line.includes(opp)) continue;
    const count = line.filter((v) => v === symbol).length;
    if (count === 2) twoInRow++;
    else if (count === 1) oneInRow++;
  }
  return { twoInRow, oneInRow };
}

function minimaxNormal(board, currentTurn, botSymbol, depth, alpha, beta, memo) {
  const { winner } = checkLineWinner(board);
  if (winner === botSymbol) return 100 - depth;
  if (winner) return depth - 100;
  if (board.every(Boolean)) return 0;

  const key = board.map((c) => c || '.').join('') + currentTurn;
  if (memo.has(key)) return memo.get(key);

  const oppSymbol = botSymbol === 'X' ? 'O' : 'X';
  const isMax = currentTurn === botSymbol;
  let best = isMax ? -Infinity : Infinity;

  for (let i = 0; i < 9; i++) {
    if (board[i] !== null) continue;
    board[i] = currentTurn;
    const score = minimaxNormal(
      board,
      isMax ? oppSymbol : botSymbol,
      botSymbol,
      depth + 1,
      alpha,
      beta,
      memo
    );
    board[i] = null;

    if (isMax) {
      if (score > best) best = score;
      if (best > alpha) alpha = best;
    } else {
      if (score < best) best = score;
      if (best < beta) beta = best;
    }
    if (beta <= alpha) break;
  }

  memo.set(key, best);
  return best;
}

export function chooseNormalBotMove(state, botSymbol, skill = 'smart') {
  const legal = getLegalMoves(state);
  if (legal.length === 0) return null;

  const oppSymbol = botSymbol === 'X' ? 'O' : 'X';

  // Always take an immediate winning move
  const instantWins = findImmediateLineWinners(state.board, botSymbol);
  if (instantWins.length > 0) {
    return { cellIndex: pickRandom(instantWins) };
  }

  // Smart bot always blocks; Casual bot blocks 65% of immediate threats
  const oppWins = findImmediateLineWinners(state.board, oppSymbol);
  if (oppWins.length > 0 && (skill === 'smart' || Math.random() < 0.65)) {
    return { cellIndex: pickRandom(oppWins) };
  }

  // Opening shortcut if completely empty board
  if (state.moveCount === 0) {
    if (skill === 'smart') {
      return { cellIndex: pickRandom([0, 2, 4, 6, 8]) };
    }
    return pickRandom(legal);
  }

  if (skill === 'casual' && Math.random() < 0.35) {
    return pickRandom(legal);
  }

  const memo = new Map();
  const scored = legal.map(({ cellIndex }) => {
    const boardCopy = state.board.slice();
    boardCopy[cellIndex] = botSymbol;
    const score = minimaxNormal(boardCopy, oppSymbol, botSymbol, 0, -Infinity, Infinity, memo);
    return { cellIndex, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const topScore = scored[0].score;
  const bestMoves = scored.filter((m) => m.score === topScore);

  if (skill === 'smart' && Math.random() < 0.92) {
    return { cellIndex: pickRandom(bestMoves).cellIndex };
  }
  if (skill === 'smart' && scored.length > 1) {
    // Small human-like imperfection (8%) only on non-fatal moves
    const nonLosing = scored.filter((m) => m.score >= 0);
    if (nonLosing.length > 0) {
      return { cellIndex: pickRandom(nonLosing).cellIndex };
    }
  }
  const topSlice = scored.slice(0, Math.max(1, Math.ceil(scored.length * 0.4)));
  return { cellIndex: pickRandom(topSlice).cellIndex };
}

export function chooseExpertBotMove(state, botSymbol, skill = 'smart') {
  const legal = getLegalMoves(state);
  if (legal.length === 0) return null;

  const oppSymbol = botSymbol === 'X' ? 'O' : 'X';

  // Precompute macro-level immediate wins & opponent threats
  const macroWinBoardsForBot = new Set(findImmediateLineWinners(state.macroBoard, botSymbol));
  const macroWinBoardsForOpp = new Set(findImmediateLineWinners(state.macroBoard, oppSymbol));

  // 1. Instant macro match win!
  for (let b = 0; b < 9; b++) {
    if (!macroWinBoardsForBot.has(b)) continue;
    const miniWins = findImmediateLineWinners(state.miniBoards[b], botSymbol);
    if (miniWins.length > 0) {
      return { boardIndex: b, cellIndex: miniWins[0] };
    }
  }

  // 2. Instant macro match threat block!
  const urgentBlocks = [];
  for (let b = 0; b < 9; b++) {
    if (!macroWinBoardsForOpp.has(b)) continue;
    const oppMiniWins = findImmediateLineWinners(state.miniBoards[b], oppSymbol);
    if (oppMiniWins.length > 0) {
      // Even better if we can win this mini-board outright in 1 move!
      const botMiniWins = findImmediateLineWinners(state.miniBoards[b], botSymbol);
      if (botMiniWins.length > 0) {
        return { boardIndex: b, cellIndex: botMiniWins[0] };
      }
      urgentBlocks.push({ boardIndex: b, cellIndex: oppMiniWins[0] });
    }
  }
  if (urgentBlocks.length > 0 && (skill === 'smart' || Math.random() < 0.7)) {
    return pickRandom(urgentBlocks);
  }

  // Precompute mini-board tactical maps
  const miniInfo = state.miniBoards.map((mini, b) => {
    if (state.macroBoard[b] !== null) return null;
    return {
      botWins: new Set(findImmediateLineWinners(mini, botSymbol)),
      oppWins: new Set(findImmediateLineWinners(mini, oppSymbol)),
      emptyCount: mini.filter((v) => v === null).length,
      beforeBotThreats: countOpenThreats(mini, botSymbol),
      beforeOppThreats: countOpenThreats(mini, oppSymbol),
    };
  });

  const macroBotThreats = countOpenThreats(state.macroBoard, botSymbol);
  const macroOppThreats = countOpenThreats(state.macroBoard, oppSymbol);

  const scored = legal.map(({ boardIndex, cellIndex }) => {
    const info = miniInfo[boardIndex];
    const mini = state.miniBoards[boardIndex];
    let score = 0;

    // Macro board line value for claiming boardIndex
    let macroSynergyBot = 0;
    let macroSynergyOpp = 0;
    for (const [a, b, c] of WIN_LINES) {
      if (a !== boardIndex && b !== boardIndex && c !== boardIndex) continue;
      const vals = [state.macroBoard[a], state.macroBoard[b], state.macroBoard[c]];
      if (!vals.includes(oppSymbol)) {
        const botCnt = vals.filter((v) => v === botSymbol).length;
        macroSynergyBot += botCnt === 2 ? 40 : botCnt === 1 ? 14 : 4;
      }
      if (!vals.includes(botSymbol)) {
        const oppCnt = vals.filter((v) => v === oppSymbol).length;
        macroSynergyOpp += oppCnt === 2 ? 35 : oppCnt === 1 ? 10 : 2;
      }
    }

    const macroFactor = MACRO_WEIGHTS[boardIndex];
    const cellFactor = CELL_WEIGHTS[cellIndex];

    const winsMini = info.botWins.has(cellIndex);
    const blocksMini = info.oppWins.has(cellIndex);
    const willAutoReset = !winsMini && info.emptyCount === 1;

    if (winsMini) {
      score += (260 + macroSynergyBot * 3 + macroSynergyOpp * 2) * macroFactor;
    } else if (willAutoReset) {
      // Tactical auto-reset evaluation: good if opponent was threatening, bad if we were ahead
      const oppPressure = info.beforeOppThreats.twoInRow * 30 + info.beforeOppThreats.oneInRow * 5;
      const botPressure = info.beforeBotThreats.twoInRow * 25 + info.beforeBotThreats.oneInRow * 5;
      score += (oppPressure - botPressure - 8) * macroFactor;
    } else {
      if (blocksMini) {
        score += (120 + macroSynergyOpp * 2.5) * macroFactor;
      }

      const nextMini = mini.slice();
      nextMini[cellIndex] = botSymbol;
      const afterBotThreats = countOpenThreats(nextMini, botSymbol);
      const gainedTwo = afterBotThreats.twoInRow - info.beforeBotThreats.twoInRow;
      const gainedOne = afterBotThreats.oneInRow - info.beforeBotThreats.oneInRow;

      score += gainedTwo * 38 * macroFactor;
      if (afterBotThreats.twoInRow >= 2) {
        // Creating a fork inside the mini-board
        score += 55 * macroFactor;
      }
      score += gainedOne * 9 * macroFactor;
      score += (macroSynergyBot + macroSynergyOpp * 0.5) * 1.4;
      score += cellFactor * 6 * macroFactor;

      // Slight bonus for contesting active macro threats
      if (macroBotThreats.twoInRow > 0 || macroOppThreats.twoInRow > 0) {
        score += (macroSynergyBot + macroSynergyOpp) * 0.6;
      }
    }

    // Small noise so identical situations feel natural
    score += Math.random() * 1.5;

    return { boardIndex, cellIndex, score };
  });

  scored.sort((a, b) => b.score - a.score);

  if (skill === 'smart') {
    const chosen = scored[0];
    return { boardIndex: chosen.boardIndex, cellIndex: chosen.cellIndex };
  }

  // Casual picks among top 35% of reasonable moves
  const poolSize = Math.max(1, Math.min(8, Math.ceil(scored.length * 0.35)));
  const chosen = pickRandom(scored.slice(0, poolSize));
  return { boardIndex: chosen.boardIndex, cellIndex: chosen.cellIndex };
}

export function chooseBotMove(state, botSymbol, skill = 'smart') {
  if (!state || state.winner || state.isDraw) return null;
  if (state.difficulty === 'expert') {
    return chooseExpertBotMove(state, botSymbol, skill);
  }
  return chooseNormalBotMove(state, botSymbol, skill);
}
