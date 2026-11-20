export const AVATAR_COLORS = [
  '#00F0FF', // Neon Cyan
  '#FF4D6D', // Electric Coral
  '#FFB703', // Championship Gold
  '#10B981', // Tactical Emerald
  '#A855F7', // Ultraviolet
  '#38BDF8', // Sky Pulse
  '#FB7185', // Rose Flare
  '#F97316', // Plasma Amber
];

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateRoomCode(length = 5) {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

export function createInitialPlayer({
  id,
  name,
  color = AVATAR_COLORS[0],
  isBot = false,
  botSkill = 'smart',
  joinedAt = Date.now(),
}) {
  return {
    id,
    name: (name || 'Player').trim().slice(0, 18) || 'Player',
    color,
    isBot: Boolean(isBot),
    botSkill: isBot ? botSkill : null,
    online: true,
    wins: 0,
    normalWins: 0,
    expertWins: 0,
    draws: 0,
    losses: 0,
    matchesPlayed: 0,
    streak: 0,
    bestStreak: 0,
    queueStatus: 'idle',
    queueDifficulty: null,
    joinedAt,
  };
}

export function rankPlayers(playersInput) {
  const list = Array.isArray(playersInput)
    ? playersInput.slice()
    : Object.values(playersInput || {});

  const enriched = list.map((p) => {
    const wins = Number(p.wins) || 0;
    const normalWins = Number(p.normalWins) || 0;
    const expertWins = Number(p.expertWins) || 0;
    const draws = Number(p.draws) || 0;
    const losses = Number(p.losses) || 0;
    const matchesPlayed = Number(p.matchesPlayed) || wins + draws + losses;
    const winRate = matchesPlayed > 0 ? Math.round((wins / matchesPlayed) * 100) : 0;

    return {
      ...p,
      wins,
      normalWins,
      expertWins,
      draws,
      losses,
      matchesPlayed,
      streak: Number(p.streak) || 0,
      bestStreak: Number(p.bestStreak) || 0,
      winRate,
    };
  });

  enriched.sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.winRate !== a.winRate) return b.winRate - a.winRate;
    if (b.expertWins !== a.expertWins) return b.expertWins - a.expertWins;
    if (b.draws !== a.draws) return b.draws - a.draws;
    if (a.losses !== b.losses) return a.losses - b.losses;
    return (a.joinedAt || 0) - (b.joinedAt || 0);
  });

  return enriched.map((p, idx) => ({
    ...p,
    rank: idx + 1,
  }));
}

function updatePlayerStats(player, isWinner, isDraw, difficulty) {
  const updated = {
    ...player,
    matchesPlayed: (Number(player.matchesPlayed) || 0) + 1,
  };
  if (isDraw) {
    updated.draws = (Number(updated.draws) || 0) + 1;
    updated.streak = 0;
  } else if (isWinner) {
    updated.wins = (Number(updated.wins) || 0) + 1;
    if (difficulty === 'expert') {
      updated.expertWins = (Number(updated.expertWins) || 0) + 1;
    } else {
      updated.normalWins = (Number(updated.normalWins) || 0) + 1;
    }
    updated.streak = (Number(updated.streak) || 0) + 1;
    updated.bestStreak = Math.max(Number(updated.bestStreak) || 0, updated.streak);
  } else {
    updated.losses = (Number(updated.losses) || 0) + 1;
    updated.streak = 0;
  }
  return updated;
}

export function applyMatchResultToPlayers(
  playersMap,
  { playerXId, playerOId, winnerId, isDraw, difficulty }
) {
  const next = { ...(playersMap || {}) };
  if (next[playerXId]) {
    next[playerXId] = updatePlayerStats(
      next[playerXId],
      winnerId === playerXId,
      isDraw,
      difficulty
    );
  }
  if (next[playerOId]) {
    next[playerOId] = updatePlayerStats(
      next[playerOId],
      winnerId === playerOId,
      isDraw,
      difficulty
    );
  }
  return next;
}

export function createFinalsBracket(rankedPlayers, size = 2, finalsDifficulty = 'expert') {
  if (!Array.isArray(rankedPlayers) || rankedPlayers.length < 2) {
    throw new Error('Need at least 2 players to start Championship Finals');
  }

  const effectiveSize = size === 4 && rankedPlayers.length >= 4 ? 4 : 2;
  const difficulty = finalsDifficulty === 'normal' ? 'normal' : 'expert';

  if (effectiveSize === 2) {
    return {
      size: 2,
      difficulty,
      championId: null,
      slots: {
        final: {
          id: 'final',
          round: 'Grand Final',
          seedA: 1,
          seedB: 2,
          playerXId: rankedPlayers[0].id,
          playerOId: rankedPlayers[1].id,
          winnerId: null,
          rematchCount: 0,
          matchId: null,
          status: 'active',
        },
      },
    };
  }

  return {
    size: 4,
    difficulty,
    championId: null,
    slots: {
      sf1: {
        id: 'sf1',
        round: 'Semifinal 1',
        seedA: 1,
        seedB: 4,
        playerXId: rankedPlayers[0].id,
        playerOId: rankedPlayers[3].id,
        winnerId: null,
        rematchCount: 0,
        matchId: null,
        status: 'active',
      },
      sf2: {
        id: 'sf2',
        round: 'Semifinal 2',
        seedA: 2,
        seedB: 3,
        playerXId: rankedPlayers[1].id,
        playerOId: rankedPlayers[2].id,
        winnerId: null,
        rematchCount: 0,
        matchId: null,
        status: 'active',
      },
      final: {
        id: 'final',
        round: 'Grand Final',
        seedA: null,
        seedB: null,
        playerXId: null,
        playerOId: null,
        winnerId: null,
        rematchCount: 0,
        matchId: null,
        status: 'pending',
      },
    },
  };
}

export function advanceFinalsBracket(finals, slotId, winnerId, isDraw) {
  if (!finals || !finals.slots || !finals.slots[slotId]) {
    throw new Error(`Invalid finals slot: ${slotId}`);
  }

  const nextSlots = {
    ...finals.slots,
    [slotId]: { ...finals.slots[slotId] },
  };
  if (finals.slots.final && slotId !== 'final') {
    nextSlots.final = { ...finals.slots.final };
  }

  const slot = nextSlots[slotId];
  const nextFinals = {
    ...finals,
    slots: nextSlots,
  };

  // Draws in Finals trigger a Sudden-Death Rematch with swapped X/O sides
  if (isDraw || !winnerId) {
    slot.rematchCount = (Number(slot.rematchCount) || 0) + 1;
    slot.status = 'active';
    const prevX = slot.playerXId;
    const prevO = slot.playerOId;
    slot.playerXId = prevO;
    slot.playerOId = prevX;
    return {
      finals: nextFinals,
      action: 'rematch',
      swapSides: true,
      slot,
    };
  }

  slot.winnerId = winnerId;
  slot.status = 'completed';

  if (slotId === 'final') {
    nextFinals.championId = winnerId;
    return {
      finals: nextFinals,
      action: 'champion',
      championId: winnerId,
    };
  }

  const sf1Winner = nextSlots.sf1?.winnerId || null;
  const sf2Winner = nextSlots.sf2?.winnerId || null;

  if (sf1Winner && sf2Winner && nextSlots.final) {
    nextSlots.final.playerXId = sf1Winner;
    nextSlots.final.playerOId = sf2Winner;
    nextSlots.final.status = 'active';
    return {
      finals: nextFinals,
      action: 'spawn_final',
      finalSlot: nextSlots.final,
    };
  }

  return {
    finals: nextFinals,
    action: 'waiting_other_semi',
  };
}

export function getAllowedMatchDifficulties(settings) {
  const mode = settings?.leagueDifficulty || 'selectable';
  if (mode === 'normal') return ['normal'];
  if (mode === 'expert') return ['expert'];
  return ['normal', 'expert'];
}
