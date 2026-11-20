import {
  ref,
  set,
  get,
  update,
  remove,
  onValue,
  onDisconnect,
  runTransaction,
  query,
  orderByChild,
  limitToLast,
} from '@firebase/database';
import { db } from './firebaseConfig.js';
import {
  createNormalState,
  applyNormalMove,
  createExpertState,
  applyExpertMove,
  serializeGameState,
  deserializeGameState,
} from '../engine/gameLogic.js';
import { BOT_NAMES, chooseBotMove } from '../engine/botAI.js';
import {
  AVATAR_COLORS,
  generateRoomCode,
  createInitialPlayer,
  rankPlayers,
  applyMatchResultToPlayers,
  createFinalsBracket,
  advanceFinalsBracket,
  getAllowedMatchDifficulties,
} from '../engine/tournamentLogic.js';

function makeId(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

const activeDisconnectHandles = new Map();

function clearTrackedDisconnects(code, playerId) {
  const key = `${code}:${playerId}`;
  const handles = activeDisconnectHandles.get(key);
  if (handles) {
    handles.forEach((h) => {
      try {
        h.cancel();
      } catch {
        // ignore cancel error
      }
    });
    activeDisconnectHandles.delete(key);
  }
}

function registerPresenceDisconnect(code, playerId) {
  clearTrackedDisconnects(code, playerId);
  const handles = [];
  const onlineRef = ref(db, `rooms/${code}/players/${playerId}/online`);
  const queueRef = ref(db, `rooms/${code}/players/${playerId}/queueStatus`);
  const queueDiffRef = ref(db, `rooms/${code}/players/${playerId}/queueDifficulty`);

  const h1 = onDisconnect(onlineRef);
  h1.set(false);
  handles.push(h1);

  const h2 = onDisconnect(queueRef);
  h2.set('idle');
  handles.push(h2);

  const h3 = onDisconnect(queueDiffRef);
  h3.set(null);
  handles.push(h3);

  activeDisconnectHandles.set(`${code}:${playerId}`, handles);
}

async function syncPublicRoomEntry(code) {
  const roomSnap = await get(ref(db, `rooms/${code}`));
  if (!roomSnap.exists()) {
    await remove(ref(db, `publicRooms/${code}`));
    return;
  }
  const room = roomSnap.val();
  const players = Object.values(room.players || {});
  const onlineHumans = players.filter((p) => !p.isBot && p.online !== false);

  if (!room.settings?.isPublic || onlineHumans.length === 0) {
    await remove(ref(db, `publicRooms/${code}`));
    return;
  }

  const hostName = room.players?.[room.hostId]?.name || onlineHumans[0]?.name || 'Host';
  await set(ref(db, `publicRooms/${code}`), {
    code,
    name: room.name || `Arena ${code}`,
    hostName,
    playerCount: players.filter((p) => p.isBot || p.online !== false).length,
    humanCount: onlineHumans.length,
    leagueDifficulty: room.settings?.leagueDifficulty || 'selectable',
    finalsDifficulty: room.settings?.finalsDifficulty || 'expert',
    status: room.status || 'league',
    updatedAt: Date.now(),
  });
}

function buildOnlineMatch({
  id = makeId('m'),
  playerXId,
  playerOId,
  difficulty,
  stage = 'league',
  finalsSlotId = '',
  rematchCount = 0,
  turnTimerSec = 0,
}) {
  const now = Date.now();
  const game = difficulty === 'expert' ? createExpertState() : createNormalState();
  const timer = Number(turnTimerSec) || 0;
  return {
    id,
    playerXId,
    playerOId,
    difficulty,
    stage,
    finalsSlotId: finalsSlotId || '',
    rematchCount: Number(rematchCount) || 0,
    turnTimerSec: timer,
    turnStartedAt: now,
    turnDeadline: timer > 0 ? now + timer * 1000 : 0,
    timeoutStreakX: 0,
    timeoutStreakO: 0,
    status: 'active',
    winnerId: '',
    isDraw: false,
    forfeitBy: '',
    statsApplied: false,
    createdAt: now,
    updatedAt: now,
    game: serializeGameState(game),
  };
}

function normalizeOnlineRoom(raw) {
  if (!raw) return null;

  const players = {};
  for (const [id, p] of Object.entries(raw.players || {})) {
    players[id] = {
      ...p,
      id,
      wins: Number(p.wins) || 0,
      normalWins: Number(p.normalWins) || 0,
      expertWins: Number(p.expertWins) || 0,
      draws: Number(p.draws) || 0,
      losses: Number(p.losses) || 0,
      matchesPlayed: Number(p.matchesPlayed) || 0,
      streak: Number(p.streak) || 0,
      bestStreak: Number(p.bestStreak) || 0,
      online: p.isBot ? true : p.online !== false,
      queueStatus: p.queueStatus || 'idle',
      queueDifficulty: p.queueDifficulty || null,
    };
  }

  const matches = {};
  for (const [id, m] of Object.entries(raw.matches || {})) {
    matches[id] = {
      ...m,
      id,
      winnerId: m.winnerId || null,
      finalsSlotId: m.finalsSlotId || null,
      forfeitBy: m.forfeitBy || null,
      isDraw: Boolean(m.isDraw),
      statsApplied: Boolean(m.statsApplied),
      turnTimerSec: Number(m.turnTimerSec) || 0,
      turnDeadline: Number(m.turnDeadline) || 0,
      game: deserializeGameState(m.game),
    };
  }

  let finals = null;
  if (raw.finals) {
    const slots = {};
    for (const [key, s] of Object.entries(raw.finals.slots || {})) {
      slots[key] = {
        ...s,
        id: key,
        playerXId: s.playerXId || null,
        playerOId: s.playerOId || null,
        winnerId: s.winnerId || null,
        matchId: s.matchId || null,
        rematchCount: Number(s.rematchCount) || 0,
      };
    }
    finals = {
      ...raw.finals,
      championId: raw.finals.championId || null,
      slots,
    };
  }

  const history = Object.values(raw.history || {})
    .map((h) => ({
      ...h,
      winnerId: h.winnerId || null,
      isDraw: Boolean(h.isDraw),
    }))
    .sort((a, b) => (b.finishedAt || 0) - (a.finishedAt || 0));

  const challenges = {};
  for (const [id, c] of Object.entries(raw.challenges || {})) {
    challenges[id] = {
      ...c,
      id,
      matchId: c.matchId || null,
    };
  }

  return {
    code: raw.code,
    mode: 'online',
    name: raw.name || `Arena ${raw.code}`,
    hostId: raw.hostId || '',
    status: raw.status || 'league',
    season: Number(raw.season) || 1,
    championId: raw.championId || null,
    settings: {
      leagueDifficulty: raw.settings?.leagueDifficulty || 'selectable',
      finalsDifficulty: raw.settings?.finalsDifficulty || 'expert',
      turnTimerSec: Number(raw.settings?.turnTimerSec) || 0,
      isPublic: Boolean(raw.settings?.isPublic),
    },
    players,
    matches,
    challenges,
    finals,
    history,
    createdAt: raw.createdAt || Date.now(),
    updatedAt: raw.updatedAt || Date.now(),
  };
}

export async function createOnlineRoom({
  hostPlayer,
  roomName,
  leagueDifficulty = 'selectable',
  finalsDifficulty = 'expert',
  turnTimerSec = 0,
  isPublic = true,
}) {
  let code = generateRoomCode(5);
  for (let i = 0; i < 6; i++) {
    const existing = await get(ref(db, `rooms/${code}`));
    if (!existing.exists()) break;
    code = generateRoomCode(5);
  }

  const now = Date.now();
  const initialHost = createInitialPlayer({
    id: hostPlayer.id,
    name: hostPlayer.name,
    color: hostPlayer.color,
    isBot: false,
    joinedAt: now,
  });

  const roomData = {
    code,
    name: (roomName || `${initialHost.name}'s Arena`).trim().slice(0, 32),
    hostId: initialHost.id,
    status: 'league',
    season: 1,
    championId: '',
    settings: {
      leagueDifficulty,
      finalsDifficulty,
      turnTimerSec: Number(turnTimerSec) || 0,
      isPublic: Boolean(isPublic),
    },
    players: {
      [initialHost.id]: initialHost,
    },
    createdAt: now,
    updatedAt: now,
  };

  await set(ref(db, `rooms/${code}`), roomData);
  registerPresenceDisconnect(code, initialHost.id);
  await syncPublicRoomEntry(code);

  return code;
}

export async function joinOnlineRoom({ code, player }) {
  const cleanCode = (code || '').trim().toUpperCase();
  if (!cleanCode) {
    throw new Error('Please enter a room code.');
  }

  const roomRef = ref(db, `rooms/${cleanCode}`);
  const snap = await get(roomRef);
  if (!snap.exists()) {
    throw new Error(`Room "${cleanCode}" not found.`);
  }

  const room = snap.val();
  const existingPlayers = room.players || {};
  const existingMe = existingPlayers[player.id];
  const currentTotal = Object.keys(existingPlayers).length;

  if (!existingMe && currentTotal >= 16) {
    throw new Error('This tournament room is full (max 16 players).');
  }

  const now = Date.now();
  const mergedPlayer = existingMe
    ? {
        ...existingMe,
        name: (player.name || existingMe.name).trim().slice(0, 18) || 'Player',
        color: player.color || existingMe.color,
        online: true,
        queueStatus: 'idle',
        queueDifficulty: null,
      }
    : createInitialPlayer({
        id: player.id,
        name: player.name,
        color: player.color,
        isBot: false,
        joinedAt: now,
      });

  const updates = {
    [`players/${player.id}`]: mergedPlayer,
    updatedAt: now,
  };

  const currentHost = existingPlayers[room.hostId];
  if (!room.hostId || !currentHost || (!currentHost.isBot && currentHost.online === false)) {
    updates.hostId = player.id;
  }

  await update(roomRef, updates);
  registerPresenceDisconnect(cleanCode, player.id);
  await syncPublicRoomEntry(cleanCode);

  return cleanCode;
}

export async function leaveOnlineRoom({ code, playerId }) {
  if (!code || !playerId) return;
  clearTrackedDisconnects(code, playerId);

  const roomRef = ref(db, `rooms/${code}`);
  const snap = await get(roomRef);
  if (!snap.exists()) return;

  const room = snap.val();
  const players = room.players || {};
  const updates = {
    [`players/${playerId}/online`]: false,
    [`players/${playerId}/queueStatus`]: 'idle',
    [`players/${playerId}/queueDifficulty`]: null,
    updatedAt: Date.now(),
  };

  // Clear from quick queues if waiting
  for (const diff of ['normal', 'expert']) {
    if (room.quickQueue?.[diff]?.playerId === playerId) {
      updates[`quickQueue/${diff}`] = null;
    }
  }

  if (room.hostId === playerId) {
    const nextHost = Object.values(players)
      .filter((p) => p.id !== playerId && !p.isBot && p.online !== false)
      .sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0))[0];
    if (nextHost) {
      updates.hostId = nextHost.id;
    }
  }

  await update(roomRef, updates);
  await syncPublicRoomEntry(code);
}

export function subscribeRoom(code, onData, onError) {
  const roomRef = ref(db, `rooms/${code}`);
  return onValue(
    roomRef,
    (snap) => {
      if (!snap.exists()) {
        onData(null);
        return;
      }
      onData(normalizeOnlineRoom(snap.val()));
    },
    (err) => {
      if (onError) onError(err);
    }
  );
}

export function subscribePublicRooms(onData) {
  const q = query(ref(db, 'publicRooms'), orderByChild('updatedAt'), limitToLast(25));
  return onValue(q, (snap) => {
    if (!snap.exists()) {
      onData([]);
      return;
    }
    const cutoff = Date.now() - 12 * 60 * 60 * 1000;
    const rooms = Object.values(snap.val() || {})
      .filter((r) => (r.humanCount || 0) > 0 && (r.updatedAt || 0) > cutoff)
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    onData(rooms);
  });
}

export async function addOnlineBot({ code, skill = 'smart' }) {
  const roomSnap = await get(ref(db, `rooms/${code}`));
  if (!roomSnap.exists()) return;
  const room = roomSnap.val();
  const players = room.players || {};
  const count = Object.keys(players).length;
  if (count >= 16) throw new Error('Room already has 16 players.');

  const usedNames = new Set(Object.values(players).map((p) => p.name));
  const botName = BOT_NAMES.find((n) => !usedNames.has(n)) || `Bot-${count + 1}`;
  const botId = makeId('bot');

  const bot = createInitialPlayer({
    id: botId,
    name: botName,
    color: AVATAR_COLORS[count % AVATAR_COLORS.length],
    isBot: true,
    botSkill: skill,
  });

  await update(ref(db, `rooms/${code}`), {
    [`players/${botId}`]: bot,
    updatedAt: Date.now(),
  });
  await syncPublicRoomEntry(code);
  return bot;
}

export async function removeOnlineBot({ code, botId }) {
  await remove(ref(db, `rooms/${code}/players/${botId}`));
  await syncPublicRoomEntry(code);
}

export async function updateOnlineSettings({ code, partialSettings }) {
  const roomRef = ref(db, `rooms/${code}`);
  const snap = await get(roomRef);
  if (!snap.exists()) return;
  const current = snap.val().settings || {};
  await update(roomRef, {
    settings: { ...current, ...partialSettings },
    updatedAt: Date.now(),
  });
  await syncPublicRoomEntry(code);
}

async function createMatchInRoom({
  code,
  playerXId,
  playerOId,
  difficulty,
  stage = 'league',
  finalsSlotId = '',
  rematchCount = 0,
  turnTimerSec = 0,
}) {
  const match = buildOnlineMatch({
    playerXId,
    playerOId,
    difficulty,
    stage,
    finalsSlotId,
    rematchCount,
    turnTimerSec,
  });
  await update(ref(db, `rooms/${code}`), {
    [`matches/${match.id}`]: match,
    updatedAt: Date.now(),
  });
  return match.id;
}

export async function startBotMatch({ code, playerId, botId, difficulty }) {
  const roomSnap = await get(ref(db, `rooms/${code}`));
  if (!roomSnap.exists()) throw new Error('Room not found');
  const room = roomSnap.val();
  const allowed = getAllowedMatchDifficulties(room.settings);
  const finalDiff = allowed.includes(difficulty) ? difficulty : allowed[0];
  const turnTimerSec = Number(room.settings?.turnTimerSec) || 0;

  const swap = Math.random() < 0.5;
  return createMatchInRoom({
    code,
    playerXId: swap ? botId : playerId,
    playerOId: swap ? playerId : botId,
    difficulty: finalDiff,
    stage: 'league',
    turnTimerSec,
  });
}

export async function sendChallenge({ code, fromPlayer, toPlayer, difficulty }) {
  const roomSnap = await get(ref(db, `rooms/${code}`));
  if (!roomSnap.exists()) throw new Error('Room not found');
  const room = roomSnap.val();
  const allowed = getAllowedMatchDifficulties(room.settings);
  const finalDiff = allowed.includes(difficulty) ? difficulty : allowed[0];

  if (toPlayer.isBot) {
    const matchId = await startBotMatch({
      code,
      playerId: fromPlayer.id,
      botId: toPlayer.id,
      difficulty: finalDiff,
    });
    return { immediate: true, matchId };
  }

  const challengeId = makeId('ch');
  await set(ref(db, `rooms/${code}/challenges/${challengeId}`), {
    id: challengeId,
    fromId: fromPlayer.id,
    fromName: fromPlayer.name,
    toId: toPlayer.id,
    toName: toPlayer.name,
    difficulty: finalDiff,
    status: 'pending',
    matchId: '',
    createdAt: Date.now(),
  });
  return { immediate: false, challengeId };
}

export async function respondChallenge({ code, challengeId, accept }) {
  const challengeRef = ref(db, `rooms/${code}/challenges/${challengeId}`);
  const snap = await get(challengeRef);
  if (!snap.exists()) return null;
  const challenge = snap.val();
  if (challenge.status !== 'pending') return null;

  if (!accept) {
    await update(challengeRef, { status: 'declined' });
    return null;
  }

  const roomSnap = await get(ref(db, `rooms/${code}`));
  const turnTimerSec = Number(roomSnap.val()?.settings?.turnTimerSec) || 0;
  const swap = Math.random() < 0.5;

  const matchId = await createMatchInRoom({
    code,
    playerXId: swap ? challenge.toId : challenge.fromId,
    playerOId: swap ? challenge.fromId : challenge.toId,
    difficulty: challenge.difficulty || 'normal',
    stage: 'league',
    turnTimerSec,
  });

  await update(challengeRef, {
    status: 'accepted',
    matchId,
  });
  return matchId;
}

export async function enterQuickMatch({ code, playerId, difficulty }) {
  const roomSnap = await get(ref(db, `rooms/${code}`));
  if (!roomSnap.exists()) throw new Error('Room not found');
  const room = roomSnap.val();
  const allowed = getAllowedMatchDifficulties(room.settings);
  const diff = allowed.includes(difficulty) ? difficulty : allowed[0];
  const turnTimerSec = Number(room.settings?.turnTimerSec) || 0;

  const queueRef = ref(db, `rooms/${code}/quickQueue/${diff}`);
  let pairedOpponentId = null;

  await runTransaction(queueRef, (current) => {
    if (
      current &&
      current.playerId &&
      current.playerId !== playerId &&
      room.players?.[current.playerId]?.online !== false
    ) {
      pairedOpponentId = current.playerId;
      return null;
    }
    pairedOpponentId = null;
    return {
      playerId,
      difficulty: diff,
      queuedAt: Date.now(),
    };
  });

  if (pairedOpponentId) {
    const swap = Math.random() < 0.5;
    const matchId = await createMatchInRoom({
      code,
      playerXId: swap ? pairedOpponentId : playerId,
      playerOId: swap ? playerId : pairedOpponentId,
      difficulty: diff,
      stage: 'league',
      turnTimerSec,
    });
    await update(ref(db, `rooms/${code}`), {
      [`players/${playerId}/queueStatus`]: 'idle',
      [`players/${playerId}/queueDifficulty`]: null,
      [`players/${pairedOpponentId}/queueStatus`]: 'idle',
      [`players/${pairedOpponentId}/queueDifficulty`]: null,
    });
    return { matched: true, matchId };
  }

  await update(ref(db, `rooms/${code}/players/${playerId}`), {
    queueStatus: 'queued',
    queueDifficulty: diff,
  });
  return { matched: false };
}

export async function cancelQuickMatch({ code, playerId }) {
  const roomRef = ref(db, `rooms/${code}`);
  const snap = await get(roomRef);
  if (!snap.exists()) return;
  const room = snap.val();
  const updates = {
    [`players/${playerId}/queueStatus`]: 'idle',
    [`players/${playerId}/queueDifficulty`]: null,
  };
  for (const diff of ['normal', 'expert']) {
    if (room.quickQueue?.[diff]?.playerId === playerId) {
      updates[`quickQueue/${diff}`] = null;
    }
  }
  await update(roomRef, updates);
}

export async function finalizeMatchIfEnded({ code, matchId }) {
  const statsFlagRef = ref(db, `rooms/${code}/matches/${matchId}/statsApplied`);
  const tx = await runTransaction(statsFlagRef, (current) => {
    if (current === true) return undefined;
    return true;
  });
  if (!tx.committed) return;

  const roomRef = ref(db, `rooms/${code}`);
  const snap = await get(roomRef);
  if (!snap.exists()) return;

  const room = normalizeOnlineRoom(snap.val());
  const match = room.matches?.[matchId];
  if (!match || match.status !== 'completed') return;

  const updatedPlayers = applyMatchResultToPlayers(room.players, {
    playerXId: match.playerXId,
    playerOId: match.playerOId,
    winnerId: match.winnerId,
    isDraw: match.isDraw,
    difficulty: match.difficulty,
  });

  const updates = {
    [`players/${match.playerXId}`]: updatedPlayers[match.playerXId] || null,
    [`players/${match.playerOId}`]: updatedPlayers[match.playerOId] || null,
    [`history/${matchId}`]: {
      id: matchId,
      playerXId: match.playerXId,
      playerOId: match.playerOId,
      winnerId: match.winnerId || '',
      isDraw: Boolean(match.isDraw),
      difficulty: match.difficulty,
      stage: match.stage,
      finishedAt: Date.now(),
    },
    updatedAt: Date.now(),
  };

  await update(roomRef, updates);

  if (match.finalsSlotId) {
    const finalsRef = ref(db, `rooms/${code}/finals`);
    let spawnAction = null;
    await runTransaction(finalsRef, (rawFinals) => {
      if (!rawFinals) return rawFinals;
      const normalizedSlots = {};
      for (const [k, s] of Object.entries(rawFinals.slots || {})) {
        normalizedSlots[k] = {
          ...s,
          id: k,
          playerXId: s.playerXId || null,
          playerOId: s.playerOId || null,
          winnerId: s.winnerId || null,
          matchId: s.matchId || null,
          rematchCount: Number(s.rematchCount) || 0,
        };
      }
      const normFinals = {
        ...rawFinals,
        championId: rawFinals.championId || null,
        slots: normalizedSlots,
      };
      const slot = normFinals.slots[match.finalsSlotId];
      if (!slot || slot.status === 'completed' || (slot.matchId && slot.matchId !== matchId)) {
        return undefined;
      }

      const adv = advanceFinalsBracket(
        normFinals,
        match.finalsSlotId,
        match.winnerId,
        match.isDraw
      );
      spawnAction = adv;
      const nextFinals = adv.finals;

      return {
        ...nextFinals,
        championId: nextFinals.championId || '',
        slots: Object.fromEntries(
          Object.entries(nextFinals.slots).map(([k, s]) => [
            k,
            {
              ...s,
              playerXId: s.playerXId || '',
              playerOId: s.playerOId || '',
              winnerId: s.winnerId || '',
              matchId: s.matchId || '',
            },
          ])
        ),
      };
    });

    if (spawnAction) {
      const followUpdates = {};
      if (spawnAction.action === 'rematch') {
        const rematch = buildOnlineMatch({
          playerXId: spawnAction.slot.playerXId,
          playerOId: spawnAction.slot.playerOId,
          difficulty: spawnAction.finals.difficulty,
          stage: match.stage,
          finalsSlotId: match.finalsSlotId,
          rematchCount: spawnAction.slot.rematchCount,
          turnTimerSec: room.settings.turnTimerSec,
        });
        followUpdates[`matches/${rematch.id}`] = rematch;
        followUpdates[`finals/slots/${match.finalsSlotId}/matchId`] = rematch.id;
      } else if (spawnAction.action === 'spawn_final') {
        const finalMatch = buildOnlineMatch({
          playerXId: spawnAction.finalSlot.playerXId,
          playerOId: spawnAction.finalSlot.playerOId,
          difficulty: spawnAction.finals.difficulty,
          stage: 'final',
          finalsSlotId: 'final',
          rematchCount: 0,
          turnTimerSec: room.settings.turnTimerSec,
        });
        followUpdates[`matches/${finalMatch.id}`] = finalMatch;
        followUpdates['finals/slots/final/matchId'] = finalMatch.id;
      } else if (spawnAction.action === 'champion') {
        followUpdates.championId = spawnAction.championId;
      }
      if (Object.keys(followUpdates).length > 0) {
        followUpdates.updatedAt = Date.now();
        await update(roomRef, followUpdates);
      }
    }
  }

  await syncPublicRoomEntry(code);
}

export async function submitOnlineMove({ code, matchId, playerId, move }) {
  const matchRef = ref(db, `rooms/${code}/matches/${matchId}`);
  let matchEnded = false;

  const tx = await runTransaction(matchRef, (rawMatch) => {
    if (!rawMatch || rawMatch.status !== 'active') return undefined;

    const game = deserializeGameState(rawMatch.game);
    const expectedId = game.turn === 'X' ? rawMatch.playerXId : rawMatch.playerOId;
    if (playerId !== expectedId) return undefined;

    const res =
      game.difficulty === 'expert'
        ? applyExpertMove(game, move.boardIndex, move.cellIndex, game.turn)
        : applyNormalMove(game, move.cellIndex, game.turn);

    if (!res.valid) return undefined;

    const nextGame = res.state;
    const ended = Boolean(nextGame.winner || nextGame.isDraw);
    matchEnded = ended;

    const now = Date.now();
    const timer = Number(rawMatch.turnTimerSec) || 0;
    const winnerId =
      nextGame.winner === 'X'
        ? rawMatch.playerXId
        : nextGame.winner === 'O'
          ? rawMatch.playerOId
          : '';

    return {
      ...rawMatch,
      game: serializeGameState(nextGame),
      status: ended ? 'completed' : 'active',
      winnerId,
      isDraw: Boolean(nextGame.isDraw),
      turnStartedAt: now,
      turnDeadline: !ended && timer > 0 ? now + timer * 1000 : 0,
      timeoutStreakX: game.turn === 'X' ? 0 : rawMatch.timeoutStreakX || 0,
      timeoutStreakO: game.turn === 'O' ? 0 : rawMatch.timeoutStreakO || 0,
      updatedAt: now,
    };
  });

  if (tx.committed && matchEnded) {
    await finalizeMatchIfEnded({ code, matchId });
  }
  return tx.committed;
}

export async function claimTurnTimeout({ code, matchId }) {
  const matchRef = ref(db, `rooms/${code}/matches/${matchId}`);
  let matchEnded = false;

  const tx = await runTransaction(matchRef, (rawMatch) => {
    if (!rawMatch || rawMatch.status !== 'active') return undefined;
    const deadline = Number(rawMatch.turnDeadline) || 0;
    if (!deadline || Date.now() < deadline) return undefined;

    const game = deserializeGameState(rawMatch.game);
    const isX = game.turn === 'X';
    const nextStreak = (isX ? rawMatch.timeoutStreakX || 0 : rawMatch.timeoutStreakO || 0) + 1;
    const now = Date.now();

    if (nextStreak >= 2) {
      matchEnded = true;
      return {
        ...rawMatch,
        status: 'completed',
        winnerId: isX ? rawMatch.playerOId : rawMatch.playerXId,
        isDraw: false,
        forfeitBy: isX ? rawMatch.playerXId : rawMatch.playerOId,
        turnDeadline: 0,
        updatedAt: now,
      };
    }

    const fallbackMove = chooseBotMove(game, game.turn, 'casual');
    if (!fallbackMove) return undefined;

    const res =
      game.difficulty === 'expert'
        ? applyExpertMove(game, fallbackMove.boardIndex, fallbackMove.cellIndex, game.turn)
        : applyNormalMove(game, fallbackMove.cellIndex, game.turn);

    if (!res.valid) return undefined;

    const nextGame = res.state;
    const ended = Boolean(nextGame.winner || nextGame.isDraw);
    matchEnded = ended;

    const timer = Number(rawMatch.turnTimerSec) || 0;
    const winnerId =
      nextGame.winner === 'X'
        ? rawMatch.playerXId
        : nextGame.winner === 'O'
          ? rawMatch.playerOId
          : '';

    return {
      ...rawMatch,
      game: serializeGameState(nextGame),
      status: ended ? 'completed' : 'active',
      winnerId,
      isDraw: Boolean(nextGame.isDraw),
      turnStartedAt: now,
      turnDeadline: !ended && timer > 0 ? now + timer * 1000 : 0,
      timeoutStreakX: isX ? nextStreak : rawMatch.timeoutStreakX || 0,
      timeoutStreakO: !isX ? nextStreak : rawMatch.timeoutStreakO || 0,
      updatedAt: now,
    };
  });

  if (tx.committed && matchEnded) {
    await finalizeMatchIfEnded({ code, matchId });
  }
}

export async function forfeitOnlineMatch({ code, matchId, forfeitingPlayerId }) {
  const matchRef = ref(db, `rooms/${code}/matches/${matchId}`);
  const tx = await runTransaction(matchRef, (rawMatch) => {
    if (!rawMatch || rawMatch.status !== 'active') return undefined;
    if (forfeitingPlayerId !== rawMatch.playerXId && forfeitingPlayerId !== rawMatch.playerOId) {
      return undefined;
    }
    const winnerId =
      forfeitingPlayerId === rawMatch.playerXId ? rawMatch.playerOId : rawMatch.playerXId;

    return {
      ...rawMatch,
      status: 'completed',
      winnerId,
      isDraw: false,
      forfeitBy: forfeitingPlayerId,
      turnDeadline: 0,
      updatedAt: Date.now(),
    };
  });

  if (tx.committed) {
    await finalizeMatchIfEnded({ code, matchId });
  }
}

export async function startOnlineFinals({ code, size = 2, finalsDifficulty }) {
  const roomRef = ref(db, `rooms/${code}`);
  const snap = await get(roomRef);
  if (!snap.exists()) return null;
  const room = normalizeOnlineRoom(snap.val());

  const ranked = rankPlayers(room.players);
  if (ranked.length < 2) {
    throw new Error('Need at least 2 players to start Championship Finals.');
  }

  const diff = finalsDifficulty || room.settings.finalsDifficulty || 'expert';
  const bracket = createFinalsBracket(ranked, size, diff);
  const updates = {
    status: 'finals',
    championId: '',
    'settings/finalsDifficulty': bracket.difficulty,
    updatedAt: Date.now(),
  };

  let firstMatchId = null;
  const serializedSlots = {};

  for (const [slotKey, slot] of Object.entries(bracket.slots)) {
    const cleanSlot = {
      ...slot,
      playerXId: slot.playerXId || '',
      playerOId: slot.playerOId || '',
      winnerId: slot.winnerId || '',
      matchId: slot.matchId || '',
    };
    if (slot.status === 'active' && slot.playerXId && slot.playerOId) {
      const match = buildOnlineMatch({
        playerXId: slot.playerXId,
        playerOId: slot.playerOId,
        difficulty: bracket.difficulty,
        stage: slotKey === 'final' ? 'final' : 'semifinal',
        finalsSlotId: slotKey,
        rematchCount: 0,
        turnTimerSec: room.settings.turnTimerSec,
      });
      updates[`matches/${match.id}`] = match;
      cleanSlot.matchId = match.id;
      if (!firstMatchId) firstMatchId = match.id;
    }
    serializedSlots[slotKey] = cleanSlot;
  }

  updates.finals = {
    ...bracket,
    championId: '',
    slots: serializedSlots,
  };

  await update(roomRef, updates);
  await syncPublicRoomEntry(code);
  return firstMatchId;
}

export async function startNewOnlineSeason({ code, resetStats = true }) {
  const roomRef = ref(db, `rooms/${code}`);
  const snap = await get(roomRef);
  if (!snap.exists()) return;
  const room = snap.val();

  const updates = {
    status: 'league',
    finals: null,
    championId: '',
    season: resetStats ? (Number(room.season) || 1) + 1 : Number(room.season) || 1,
    updatedAt: Date.now(),
  };

  if (resetStats && room.players) {
    for (const [id, p] of Object.entries(room.players)) {
      updates[`players/${id}`] = {
        ...p,
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

  await update(roomRef, updates);
  await syncPublicRoomEntry(code);
}
