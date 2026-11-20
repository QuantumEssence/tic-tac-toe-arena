import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createNormalState,
  applyNormalMove,
  createExpertState,
  applyExpertMove,
  serializeGameState,
  deserializeGameState,
  getLegalMoves,
} from '../gameLogic.js';
import { chooseBotMove } from '../botAI.js';
import {
  createInitialPlayer,
  rankPlayers,
  applyMatchResultToPlayers,
  createFinalsBracket,
  advanceFinalsBracket,
  getAllowedMatchDifficulties,
} from '../tournamentLogic.js';

describe('Normal 3x3 Game Logic', () => {
  it('detects row/diagonal win and rejects illegal moves', () => {
    let state = createNormalState();
    state = applyNormalMove(state, 0, 'X').state;
    state = applyNormalMove(state, 3, 'O').state;
    state = applyNormalMove(state, 1, 'X').state;
    state = applyNormalMove(state, 4, 'O').state;

    const dup = applyNormalMove(state, 0, 'X');
    assert.equal(dup.valid, false);

    const wrongTurn = applyNormalMove(state, 2, 'O');
    assert.equal(wrongTurn.valid, false);

    const winRes = applyNormalMove(state, 2, 'X');
    assert.equal(winRes.valid, true);
    assert.equal(winRes.state.winner, 'X');
    assert.deepEqual(winRes.state.winLine, [0, 1, 2]);
  });

  it('detects draw when board fills without winner', () => {
    const seq = [
      [0, 'X'], [1, 'O'], [2, 'X'],
      [4, 'O'], [3, 'X'], [5, 'O'],
      [7, 'X'], [6, 'O'], [8, 'X'],
    ];
    let state = createNormalState();
    for (const [cell, sym] of seq) {
      state = applyNormalMove(state, cell, sym).state;
    }
    assert.equal(state.winner, null);
    assert.equal(state.isDraw, true);
  });
});

describe('Expert Free-Choice Nested 3x3 Game Logic', () => {
  it('allows free choice across any un-won mini-board regardless of previous cell', () => {
    let state = createExpertState();
    const r1 = applyExpertMove(state, 0, 8, 'X');
    assert.equal(r1.valid, true);
    state = r1.state;

    const r2 = applyExpertMove(state, 4, 4, 'O');
    assert.equal(r2.valid, true);
    assert.equal(r2.state.miniBoards[4][4], 'O');
  });

  it('auto-resets a mini-board cleanly when it fills in a draw', () => {
    let state = createExpertState();
    const drawSeq = [
      [0, 'X'], [1, 'O'], [2, 'X'],
      [4, 'O'], [3, 'X'], [5, 'O'],
      [7, 'X'], [6, 'O'], [8, 'X'],
    ];
    let lastRes;
    for (const [cell, sym] of drawSeq) {
      lastRes = applyExpertMove(state, 0, cell, sym);
      assert.equal(lastRes.valid, true);
      state = lastRes.state;
    }

    assert.equal(lastRes.resetMiniBoard, 0);
    assert.equal(state.macroBoard[0], null);
    assert.equal(state.miniBoards[0].every((c) => c === null), true);
    assert.equal(state.resetCounts[0], 1);
    assert.equal(state.lastReset.boardIndex, 0);
    assert.equal(state.lastReset.count, 1);

    const afterReset = applyExpertMove(state, 0, 4, 'O');
    assert.equal(afterReset.valid, true);
    assert.equal(afterReset.state.miniBoards[0][4], 'O');
  });

  it('claims macro cell when a mini-board is won and detects macro match win', () => {
    let state = createExpertState();
    const pairs = [
      [0, 0, 8, 0], [0, 1, 8, 1], [0, 2, 8, 3],
      [1, 0, 7, 0], [1, 1, 7, 1], [1, 2, 7, 3],
      [2, 0, 6, 0], [2, 1, 6, 1],
    ];
    for (const [xb, xc, ob, oc] of pairs) {
      state = applyExpertMove(state, xb, xc, 'X').state;
      state = applyExpertMove(state, ob, oc, 'O').state;
    }
    assert.equal(state.macroBoard[0], 'X');
    assert.equal(state.macroBoard[1], 'X');

    const blocked = applyExpertMove(state, 0, 4, 'X');
    assert.equal(blocked.valid, false);

    const finalWin = applyExpertMove(state, 2, 2, 'X');
    assert.equal(finalWin.valid, true);
    assert.equal(finalWin.state.macroBoard[2], 'X');
    assert.equal(finalWin.state.winner, 'X');
    assert.deepEqual(finalWin.state.winLine, [0, 1, 2]);
  });

  it('serializes and deserializes cleanly without null-array corruption', () => {
    let state = createExpertState();
    state = applyExpertMove(state, 4, 4, 'X').state;
    state = applyExpertMove(state, 2, 0, 'O').state;

    const encoded = serializeGameState(state);
    assert.equal(encoded.macroStr, '.........');
    assert.equal(encoded.miniStrs[4], '....X....');
    assert.equal(encoded.miniStrs[2], 'O........');

    const roundTrip = JSON.parse(JSON.stringify(encoded));
    const restored = deserializeGameState(roundTrip);
    assert.equal(restored.difficulty, 'expert');
    assert.equal(restored.miniBoards[4][4], 'X');
    assert.equal(restored.miniBoards[2][0], 'O');
    assert.equal(restored.turn, 'X');
    assert.equal(getLegalMoves(restored).length, 79);
  });
});

describe('Bot AI (Normal & Expert)', () => {
  it('Normal bot takes an immediate winning move', () => {
    let state = createNormalState();
    state = applyNormalMove(state, 0, 'X').state;
    state = applyNormalMove(state, 3, 'O').state;
    state = applyNormalMove(state, 1, 'X').state;
    state = applyNormalMove(state, 4, 'O').state;
    const move = chooseBotMove(state, 'X', 'smart');
    assert.deepEqual(move, { cellIndex: 2 });
  });

  it('Expert bot returns legal move and takes instant macro win', () => {
    let state = createExpertState();
    state.macroBoard[0] = 'X';
    state.macroBoard[1] = 'X';
    state.miniBoards[2][0] = 'X';
    state.miniBoards[2][4] = 'X';
    state.turn = 'X';

    const move = chooseBotMove(state, 'X', 'smart');
    assert.deepEqual(move, { boardIndex: 2, cellIndex: 8 });
  });
});

describe('Tournament League, Ranking & Finals Bracket', () => {
  it('ranks players by Total Wins primary, then Win %, Expert Wins, Draws', () => {
    let players = {
      p1: createInitialPlayer({ id: 'p1', name: 'Alice', joinedAt: 1 }),
      p2: createInitialPlayer({ id: 'p2', name: 'Bob', joinedAt: 2 }),
      p3: createInitialPlayer({ id: 'p3', name: 'Cara', joinedAt: 3 }),
      p4: createInitialPlayer({ id: 'p4', name: 'Dan', joinedAt: 4 }),
    };

    players = applyMatchResultToPlayers(players, {
      playerXId: 'p2',
      playerOId: 'p1',
      winnerId: 'p2',
      isDraw: false,
      difficulty: 'expert',
    });
    players = applyMatchResultToPlayers(players, {
      playerXId: 'p1',
      playerOId: 'p3',
      winnerId: 'p1',
      isDraw: false,
      difficulty: 'normal',
    });
    players = applyMatchResultToPlayers(players, {
      playerXId: 'p3',
      playerOId: 'p4',
      winnerId: 'p3',
      isDraw: false,
      difficulty: 'expert',
    });

    const ranked = rankPlayers(players);
    assert.deepEqual(ranked.map((p) => p.id), ['p2', 'p3', 'p1', 'p4']);
    assert.equal(ranked[0].expertWins, 1);
    assert.equal(ranked[0].winRate, 100);
  });

  it('handles Top 4 Finals bracket, Sudden-Death rematch on draw, and crowning Champion', () => {
    const ranked = [
      { id: 'p1', name: 'Seed1' },
      { id: 'p2', name: 'Seed2' },
      { id: 'p3', name: 'Seed3' },
      { id: 'p4', name: 'Seed4' },
    ];
    let finals = createFinalsBracket(ranked, 4, 'expert');
    assert.equal(finals.difficulty, 'expert');
    assert.equal(finals.slots.sf1.playerXId, 'p1');
    assert.equal(finals.slots.sf1.playerOId, 'p4');
    assert.equal(finals.slots.sf2.playerXId, 'p2');
    assert.equal(finals.slots.sf2.playerOId, 'p3');

    const sf1Draw = advanceFinalsBracket(finals, 'sf1', null, true);
    finals = sf1Draw.finals;
    assert.equal(sf1Draw.action, 'rematch');
    assert.equal(sf1Draw.swapSides, true);
    assert.equal(finals.slots.sf1.rematchCount, 1);
    assert.equal(finals.slots.sf1.playerXId, 'p4');
    assert.equal(finals.slots.sf1.playerOId, 'p1');

    const sf1Win = advanceFinalsBracket(finals, 'sf1', 'p1', false);
    finals = sf1Win.finals;
    assert.equal(sf1Win.action, 'waiting_other_semi');

    const sf2Win = advanceFinalsBracket(finals, 'sf2', 'p2', false);
    finals = sf2Win.finals;
    assert.equal(sf2Win.action, 'spawn_final');
    assert.equal(finals.slots.final.playerXId, 'p1');
    assert.equal(finals.slots.final.playerOId, 'p2');
    assert.equal(finals.slots.final.status, 'active');

    const finalWin = advanceFinalsBracket(finals, 'final', 'p2', false);
    assert.equal(finalWin.action, 'champion');
    assert.equal(finalWin.championId, 'p2');
    assert.equal(finalWin.finals.championId, 'p2');
  });

  it('respects configurable league difficulty modes', () => {
    assert.deepEqual(getAllowedMatchDifficulties({ leagueDifficulty: 'selectable' }), [
      'normal',
      'expert',
    ]);
    assert.deepEqual(getAllowedMatchDifficulties({ leagueDifficulty: 'normal' }), ['normal']);
    assert.deepEqual(getAllowedMatchDifficulties({ leagueDifficulty: 'expert' }), ['expert']);
  });
});
