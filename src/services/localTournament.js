import {
  createNormalState,
  applyNormalMove,
  createExpertState,
  applyExpertMove,
} from '../engine/gameLogic.js';
import { BOT_NAMES } from '../engine/botAI.js';
import {
  AVATAR_COLORS,
  createInitialPlayer,
  rankPlayers,
  applyMatchResultToPlayers,
  createFinalsBracket,
  advanceFinalsBracket,
  getAllowedMatchDifficulties,
} from '../engine/tournamentLogic.js';

const LOCAL_STORAGE_KEY = 'ttt_arena_local_v1';

function makeId(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function loadLocalTournament() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveLocalTournament(tournament) {
  try {
    if (!tournament) {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      return;
    }
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(tournament));
  } catch {
    // ignore storage quota errors
  }
}

export function clearLocalTournament() {
  saveLocalTournament(null);
}

export function createLocalTournament({
  name = 'Pass & Play Arena',
  humanPlayers = [],
  botCount = 0,
  botSkill = 'smart',
  leagueDifficulty = 'selectable',
  finalsDifficulty = 'expert',
}) {
  const players = {};
  const now = Date.now();

  humanPlayers.forEach((hp, idx) => {
    const id = makeId('p');
    players[id] = createInitialPlayer({
      id,
      name: hp.name || `Player ${idx + 1}`,
      color: hp.color || AVATAR_COLORS[idx % AVATAR_COLORS.length],
      isBot: false,
      joinedAt: now + idx,
    });
  });

  for (let i = 0; i < botCount; i++) {
    const id = makeId('bot');
    const usedNames = new Set(Object.values(players).map((p) => p.name));
    const botName =
      BOT_NAMES.find((n) => !usedNames.has(n)) || `Bot-${Object.keys(players).length + 1}`;
    players[id] = createInitialPlayer({
      id,
      name: botName,
      color: AVATAR_COLORS[(humanPlayers.length + i) % AVATAR_COLORS.length],
      isBot: true,
      botSkill,
      joinedAt: now + humanPlayers.length + i,
    });
  }

  const tournament = {
    code: 'LOCAL',
    mode: 'local',
    name: name.trim() || 'Pass & Play Arena',
    hostId: Object.keys(players)[0] || null,
    status: 'league',
    season: 1,
    championId: null,
    settings: {
      leagueDifficulty,
      finalsDifficulty,
      turnTimerSec: 0,
      isPublic: false,
    },
    players,
    matches: {},
    activeMatchId: null,
    finals: null,
    history: [],
    createdAt: now,
    updatedAt: now,
  };

  saveLocalTournament(tournament);
  return tournament;
}

export function addLocalPlayer(tournament, { name, color, isBot = false, botSkill = 'smart' }) {
  if (!tournament) return tournament;
  const count = Object.keys(tournament.players || {}).length;
  if (count >= 16) return tournament;

  const usedNames = new Set(Object.values(tournament.players || {}).map((p) => p.name));
  let finalName = (name || '').trim();
  if (!finalName) {
    finalName = isBot
      ? BOT_NAMES.find((n) => !usedNames.has(n)) || `Bot-${count + 1}`
      : `Player ${count + 1}`;
  }

  const id = makeId(isBot ? 'bot' : 'p');
  const player = createInitialPlayer({
    id,
    name: finalName,
    color: color || AVATAR_COLORS[count % AVATAR_COLORS.length],
    isBot,
    botSkill,
  });

  const next = {
    ...tournament,
    players: { ...tournament.players, [id]: player },
    updatedAt: Date.now(),
  };
  saveLocalTournament(next);
  return next;
}

export function removeLocalPlayer(tournament, playerId) {
  if (!tournament || !tournament.players?.[playerId]) return tournament;
  const nextPlayers = { ...tournament.players };
  delete nextPlayers[playerId];
  const next = {
    ...tournament,
    players: nextPlayers,
    updatedAt: Date.now(),
  };
  saveLocalTournament(next);
  return next;
}

export function updateLocalSettings(tournament, partialSettings) {
  if (!tournament) return tournament;
  const next = {
    ...tournament,
    settings: {
      ...tournament.settings,
      ...partialSettings,
    },
    updatedAt: Date.now(),
  };
  saveLocalTournament(next);
  return next;
}

function buildMatchObject({
  playerXId,
  playerOId,
  difficulty,
  stage = 'league',
  finalsSlotId = null,
  rematchCount = 0,
}) {
  const id = makeId('m');
  const game = difficulty === 'expert' ? createExpertState() : createNormalState();
  return {
    id,
    playerXId,
    playerOId,
    difficulty,
    stage,
    finalsSlotId,
    rematchCount,
    status: 'active',
    winnerId: null,
    isDraw: false,
    forfeitBy: null,
    statsApplied: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    game,
  };
}

export function startLocalMatch(
  tournament,
  { playerXId, playerOId, difficulty, stage = 'league', finalsSlotId = null, rematchCount = 0 }
) {
  if (!tournament || !playerXId || !playerOId || playerXId === playerOId) return tournament;
  const allowed = getAllowedMatchDifficulties(tournament.settings);
  const chosenDifficulty =
    stage === 'league'
      ? allowed.includes(difficulty)
        ? difficulty
        : allowed[0]
      : difficulty;

  const match = buildMatchObject({
    playerXId,
    playerOId,
    difficulty: chosenDifficulty,
    stage,
    finalsSlotId,
    rematchCount,
  });

  const next = {
    ...tournament,
    matches: {
      ...tournament.matches,
      [match.id]: match,
    },
    activeMatchId: match.id,
    updatedAt: Date.now(),
  };
  saveLocalTournament(next);
  return next;
}

export function startQuickLocalMatch(tournament, requestedDifficulty) {
  const list = Object.values(tournament?.players || {});
  if (list.length < 2) return tournament;

  // Prefer players with fewest matches played, randomized among ties
  const shuffled = list
    .map((p) => ({ p, sortKey: (p.matchesPlayed || 0) + Math.random() * 0.75 }))
    .sort((a, b) => a.sortKey - b.sortKey);

  // Avoid Bot vs Bot if at least one human exists
  let p1 = shuffled[0].p;
  let p2 = shuffled[1].p;
  if (p1.isBot && p2.isBot) {
    const human = shuffled.find((x) => !x.p.isBot);
    if (human) p2 = human.p;
  }

  const swap = Math.random() < 0.5;
  return startLocalMatch(tournament, {
    playerXId: swap ? p2.id : p1.id,
    playerOId: swap ? p1.id : p2.id,
    difficulty: requestedDifficulty,
  });
}

function finalizeCompletedLocalMatch(tournament, completedMatch, nextMatches) {
  const nextPlayers = applyMatchResultToPlayers(tournament.players, {
    playerXId: completedMatch.playerXId,
    playerOId: completedMatch.playerOId,
    winnerId: completedMatch.winnerId,
    isDraw: completedMatch.isDraw,
    difficulty: completedMatch.difficulty,
  });

  const historyEntry = {
    id: completedMatch.id,
    playerXId: completedMatch.playerXId,
    playerOId: completedMatch.playerOId,
    winnerId: completedMatch.winnerId,
    isDraw: completedMatch.isDraw,
    difficulty: completedMatch.difficulty,
    stage: completedMatch.stage,
    finishedAt: Date.now(),
  };

  let nextFinals = tournament.finals;
  let championId = tournament.championId;

  if (completedMatch.finalsSlotId && nextFinals) {
    const adv = advanceFinalsBracket(
      nextFinals,
      completedMatch.finalsSlotId,
      completedMatch.winnerId,
      completedMatch.isDraw
    );
    nextFinals = adv.finals;

    if (adv.action === 'rematch') {
      const rematch = buildMatchObject({
        playerXId: adv.slot.playerXId,
        playerOId: adv.slot.playerOId,
        difficulty: nextFinals.difficulty,
        stage: completedMatch.stage,
        finalsSlotId: completedMatch.finalsSlotId,
        rematchCount: adv.slot.rematchCount,
      });
      nextMatches[rematch.id] = rematch;
      nextFinals = {
        ...nextFinals,
        slots: {
          ...nextFinals.slots,
          [completedMatch.finalsSlotId]: {
            ...nextFinals.slots[completedMatch.finalsSlotId],
            matchId: rematch.id,
          },
        },
      };
    } else if (adv.action === 'spawn_final') {
      const finalMatch = buildMatchObject({
        playerXId: adv.finalSlot.playerXId,
        playerOId: adv.finalSlot.playerOId,
        difficulty: nextFinals.difficulty,
        stage: 'final',
        finalsSlotId: 'final',
        rematchCount: 0,
      });
      nextMatches[finalMatch.id] = finalMatch;
      nextFinals = {
        ...nextFinals,
        slots: {
          ...nextFinals.slots,
          final: {
            ...nextFinals.slots.final,
            matchId: finalMatch.id,
          },
        },
      };
    } else if (adv.action === 'champion') {
      championId = adv.championId;
    }
  }

  return {
    ...tournament,
    players: nextPlayers,
    matches: nextMatches,
    finals: nextFinals,
    championId,
    history: [historyEntry, ...(tournament.history || [])].slice(0, 25),
    updatedAt: Date.now(),
  };
}

export function applyLocalMove(tournament, matchId, move) {
  const match = tournament?.matches?.[matchId];
  if (!match || match.status !== 'active') return tournament;

  const game = match.game;
  const symbol = game.turn;

  const res =
    game.difficulty === 'expert'
      ? applyExpertMove(game, move.boardIndex, move.cellIndex, symbol)
      : applyNormalMove(game, move.cellIndex, symbol);

  if (!res.valid) return tournament;

  const nextGame = res.state;
  const ended = Boolean(nextGame.winner || nextGame.isDraw);
  const winnerId =
    nextGame.winner === 'X'
      ? match.playerXId
      : nextGame.winner === 'O'
        ? match.playerOId
        : null;

  const updatedMatch = {
    ...match,
    game: nextGame,
    status: ended ? 'completed' : 'active',
    winnerId,
    isDraw: Boolean(nextGame.isDraw),
    statsApplied: ended,
    updatedAt: Date.now(),
  };

  const nextMatches = {
    ...tournament.matches,
    [matchId]: updatedMatch,
  };

  if (!ended) {
    const next = { ...tournament, matches: nextMatches, updatedAt: Date.now() };
    saveLocalTournament(next);
    return next;
  }

  const finalized = finalizeCompletedLocalMatch(tournament, updatedMatch, nextMatches);
  saveLocalTournament(finalized);
  return finalized;
}

export function forfeitLocalMatch(tournament, matchId, forfeitingPlayerId) {
  const match = tournament?.matches?.[matchId];
  if (!match || match.status !== 'active') return tournament;

  const winnerId = forfeitingPlayerId === match.playerXId ? match.playerOId : match.playerXId;
  const updatedMatch = {
    ...match,
    status: 'completed',
    winnerId,
    isDraw: false,
    forfeitBy: forfeitingPlayerId,
    statsApplied: true,
    updatedAt: Date.now(),
  };

  const nextMatches = {
    ...tournament.matches,
    [matchId]: updatedMatch,
  };

  const finalized = finalizeCompletedLocalMatch(tournament, updatedMatch, nextMatches);
  saveLocalTournament(finalized);
  return finalized;
}

export function startLocalFinals(tournament, { size = 2, finalsDifficulty } = {}) {
  if (!tournament) return tournament;
  const ranked = rankPlayers(tournament.players);
  if (ranked.length < 2) return tournament;

  const diff = finalsDifficulty || tournament.settings?.finalsDifficulty || 'expert';
  const bracket = createFinalsBracket(ranked, size, diff);
  const nextMatches = { ...tournament.matches };
  let firstMatchId = null;

  const updatedSlots = { ...bracket.slots };
  for (const slotKey of Object.keys(updatedSlots)) {
    const slot = updatedSlots[slotKey];
    if (slot.status !== 'active' || !slot.playerXId || !slot.playerOId) continue;

    const match = buildMatchObject({
      playerXId: slot.playerXId,
      playerOId: slot.playerOId,
      difficulty: bracket.difficulty,
      stage: slotKey === 'final' ? 'final' : 'semifinal',
      finalsSlotId: slotKey,
      rematchCount: 0,
    });
    nextMatches[match.id] = match;
    updatedSlots[slotKey] = { ...slot, matchId: match.id };
    if (!firstMatchId) firstMatchId = match.id;
  }

  const next = {
    ...tournament,
    status: 'finals',
    championId: null,
    settings: {
      ...tournament.settings,
      finalsDifficulty: bracket.difficulty,
    },
    finals: {
      ...bracket,
      slots: updatedSlots,
    },
    matches: nextMatches,
    activeMatchId: firstMatchId,
    updatedAt: Date.now(),
  };
  saveLocalTournament(next);
  return next;
}

export function setLocalActiveMatch(tournament, matchId) {
  if (!tournament) return tournament;
  const next = {
    ...tournament,
    activeMatchId: matchId || null,
    updatedAt: Date.now(),
  };
  saveLocalTournament(next);
  return next;
}

export function startNewLocalSeason(tournament, { resetStats = true } = {}) {
  if (!tournament) return tournament;
  let nextPlayers = { ...tournament.players };
  if (resetStats) {
    for (const id of Object.keys(nextPlayers)) {
      nextPlayers[id] = {
        ...nextPlayers[id],
        wins: 0,
        normalWins: 0,
        expertWins: 0,
        draws: 0,
        losses: 0,
        matchesPlayed: 0,
        streak: 0,
        bestStreak: 0,
      };
    }
  }
  const next = {
    ...tournament,
    status: 'league',
    season: resetStats ? (tournament.season || 1) + 1 : tournament.season || 1,
    championId: null,
    finals: null,
    activeMatchId: null,
    players: nextPlayers,
    updatedAt: Date.now(),
  };
  saveLocalTournament(next);
  return next;
}
