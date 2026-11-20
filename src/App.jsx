import React, { useState, useEffect, useCallback } from 'react';
import LandingHub from './components/LandingHub.jsx';
import TournamentArena from './components/TournamentArena.jsx';
import RulesModal from './components/RulesModal.jsx';
import { AVATAR_COLORS } from './engine/tournamentLogic.js';
import { isSoundMuted, setSoundMuted } from './services/soundEffects.js';
import {
  createOnlineRoom,
  joinOnlineRoom,
  leaveOnlineRoom,
  subscribeRoom,
  subscribePublicRooms,
  addOnlineBot,
  removeOnlineBot,
  updateOnlineSettings,
  sendChallenge,
  respondChallenge,
  enterQuickMatch,
  cancelQuickMatch,
  startBotMatch,
  submitOnlineMove,
  claimTurnTimeout,
  forfeitOnlineMatch,
  startOnlineFinals,
  startNewOnlineSeason,
} from './services/onlineTournament.js';
import {
  loadLocalTournament,
  clearLocalTournament,
  createLocalTournament,
  addLocalPlayer,
  removeLocalPlayer,
  updateLocalSettings,
  startLocalMatch,
  startQuickLocalMatch,
  applyLocalMove,
  forfeitLocalMatch,
  startLocalFinals,
  setLocalActiveMatch,
  startNewLocalSeason,
} from './services/localTournament.js';

const PROFILE_KEY = 'ttt_arena_profile_v1';

function loadOrCreateProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.id) return parsed;
    }
  } catch {
    // ignore storage error
  }
  const fresh = {
    id: `usr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    name: `Player_${Math.floor(100 + Math.random() * 899)}`,
    color: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
  };
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(fresh));
  } catch {
    // ignore
  }
  return fresh;
}

export default function App() {
  const [profile, setProfile] = useState(loadOrCreateProfile);
  const [muted, setMuted] = useState(isSoundMuted);
  const [showRules, setShowRules] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Online room state
  const [publicRooms, setPublicRooms] = useState([]);
  const [onlineRoomCode, setOnlineRoomCode] = useState('');
  const [onlineRoom, setOnlineRoom] = useState(null);
  const [onlineActiveMatchId, setOnlineActiveMatchId] = useState(null);

  // Local Pass & Play state
  const [savedLocal, setSavedLocal] = useState(loadLocalTournament);
  const [localRoom, setLocalRoom] = useState(null);

  const handleUpdateProfile = (patch) => {
    setProfile((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const handleToggleSound = () => {
    setMuted((prev) => {
      const next = !prev;
      setSoundMuted(next);
      return next;
    });
  };

  // Subscribe to Public Rooms when on Landing Hub
  useEffect(() => {
    if (onlineRoomCode || localRoom) return undefined;
    const unsub = subscribePublicRooms(setPublicRooms);
    return () => unsub();
  }, [onlineRoomCode, localRoom]);

  // Subscribe to current online room
  useEffect(() => {
    if (!onlineRoomCode) {
      setOnlineRoom(null);
      return undefined;
    }
    const unsub = subscribeRoom(
      onlineRoomCode,
      (data) => {
        if (!data) {
          setError('Room was closed or no longer exists.');
          setOnlineRoomCode('');
          setOnlineRoom(null);
          return;
        }
        setOnlineRoom(data);
      },
      (err) => {
        setError(err?.message || 'Realtime connection interrupted.');
      }
    );
    return () => unsub();
  }, [onlineRoomCode]);

  // Auto-join from ?room=CODE invite URL once on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const inviteCode = params.get('room');
    if (!inviteCode) return;

    const clean = inviteCode.trim().toUpperCase();
    if (!clean) return;

    setBusy(true);
    joinOnlineRoom({ code: clean, player: loadOrCreateProfile() })
      .then((joinedCode) => {
        setOnlineRoomCode(joinedCode);
        setOnlineActiveMatchId(null);
        window.history.replaceState({}, '', window.location.pathname);
      })
      .catch((err) => {
        setError(err?.message || 'Could not join invited room.');
      })
      .finally(() => setBusy(false));
  }, []);

  const handleCreateOnline = async (opts) => {
    setError('');
    setBusy(true);
    try {
      const code = await createOnlineRoom({
        hostPlayer: profile,
        ...opts,
      });
      setOnlineActiveMatchId(null);
      setOnlineRoomCode(code);
    } catch (err) {
      setError(err?.message || 'Failed to create online room.');
    } finally {
      setBusy(false);
    }
  };

  const handleJoinOnline = async (code) => {
    setError('');
    setBusy(true);
    try {
      const joined = await joinOnlineRoom({ code, player: profile });
      setOnlineActiveMatchId(null);
      setOnlineRoomCode(joined);
    } catch (err) {
      setError(err?.message || 'Failed to join room.');
    } finally {
      setBusy(false);
    }
  };

  const handleLeaveOnline = async () => {
    const code = onlineRoomCode;
    setOnlineRoomCode('');
    setOnlineRoom(null);
    setOnlineActiveMatchId(null);
    try {
      await leaveOnlineRoom({ code, playerId: profile.id });
    } catch {
      // ignore disconnect errors on leave
    }
  };

  const handleOnlineMove = useCallback(
    async (matchId, move, explicitPlayerId = null) => {
      if (!onlineRoomCode) return;
      try {
        await submitOnlineMove({
          code: onlineRoomCode,
          matchId,
          playerId: explicitPlayerId || profile.id,
          move,
        });
      } catch (err) {
        setError(err?.message || 'Move could not be submitted.');
      }
    },
    [onlineRoomCode, profile.id]
  );

  const handleOnlineClaimTimeout = useCallback(
    async (matchId) => {
      if (!onlineRoomCode) return;
      try {
        await claimTurnTimeout({ code: onlineRoomCode, matchId });
      } catch {
        // ignore race on timeout claim
      }
    },
    [onlineRoomCode]
  );

  const handleStartLocal = (opts) => {
    setError('');
    const created = createLocalTournament(opts);
    setLocalRoom(created);
    setSavedLocal(created);
  };

  const handleResumeLocal = () => {
    const loaded = loadLocalTournament();
    if (loaded) setLocalRoom(loaded);
  };

  const handleDiscardLocal = () => {
    clearLocalTournament();
    setSavedLocal(null);
  };

  const handleLeaveLocal = () => {
    setSavedLocal(loadLocalTournament());
    setLocalRoom(null);
  };

  return (
    <>
      {onlineRoom ? (
        <TournamentArena
          room={onlineRoom}
          myPlayerId={profile.id}
          activeMatchId={onlineActiveMatchId}
          onSelectMatch={setOnlineActiveMatchId}
          onLeave={handleLeaveOnline}
          onOpenRules={() => setShowRules(true)}
          muted={muted}
          onToggleSound={handleToggleSound}
          onMove={handleOnlineMove}
          onForfeit={(matchId, forfeitingId) =>
            forfeitOnlineMatch({
              code: onlineRoomCode,
              matchId,
              forfeitingPlayerId: forfeitingId,
            })
          }
          onRematch={async (oldMatch) => {
            const otherId =
              oldMatch.playerXId === profile.id ? oldMatch.playerOId : oldMatch.playerXId;
            const otherPlayer = onlineRoom.players?.[otherId];
            if (!otherPlayer) return;
            if (otherPlayer.isBot) {
              const id = await startBotMatch({
                code: onlineRoomCode,
                playerId: profile.id,
                botId: otherId,
                difficulty: oldMatch.difficulty,
              });
              if (id) setOnlineActiveMatchId(id);
            } else {
              await sendChallenge({
                code: onlineRoomCode,
                fromPlayer: onlineRoom.players[profile.id] || profile,
                toPlayer: otherPlayer,
                difficulty: oldMatch.difficulty,
              });
            }
          }}
          onClaimTimeout={handleOnlineClaimTimeout}
          onQuickMatch={async (diff) => {
            const res = await enterQuickMatch({
              code: onlineRoomCode,
              playerId: profile.id,
              difficulty: diff,
            });
            if (res?.matched && res.matchId) {
              setOnlineActiveMatchId(res.matchId);
            }
            return res;
          }}
          onCancelQuickMatch={() =>
            cancelQuickMatch({ code: onlineRoomCode, playerId: profile.id })
          }
          onChallengePlayer={async (targetPlayer, diff) => {
            const res = await sendChallenge({
              code: onlineRoomCode,
              fromPlayer: onlineRoom.players[profile.id] || profile,
              toPlayer: targetPlayer,
              difficulty: diff,
            });
            if (res?.immediate && res.matchId) {
              setOnlineActiveMatchId(res.matchId);
            }
            return res;
          }}
          onRespondChallenge={(challengeId, accept) =>
            respondChallenge({ code: onlineRoomCode, challengeId, accept })
          }
          onStartLocalPairMatch={() => {}}
          onAddBot={(skill) => addOnlineBot({ code: onlineRoomCode, skill })}
          onRemovePlayer={(botId) =>
            removeOnlineBot({ code: onlineRoomCode, botId })
          }
          onAddLocalPlayer={() => {}}
          onUpdateSettings={(partialSettings) =>
            updateOnlineSettings({ code: onlineRoomCode, partialSettings })
          }
          onStartFinals={(opts) =>
            startOnlineFinals({ code: onlineRoomCode, ...opts })
          }
          onNewSeason={(resetStats) =>
            startNewOnlineSeason({ code: onlineRoomCode, resetStats })
          }
        />
      ) : localRoom ? (
        <TournamentArena
          room={localRoom}
          myPlayerId={localRoom.hostId}
          activeMatchId={localRoom.activeMatchId}
          onSelectMatch={(matchId) =>
            setLocalRoom((prev) => setLocalActiveMatch(prev, matchId))
          }
          onLeave={handleLeaveLocal}
          onOpenRules={() => setShowRules(true)}
          muted={muted}
          onToggleSound={handleToggleSound}
          onMove={(matchId, move) =>
            setLocalRoom((prev) => applyLocalMove(prev, matchId, move))
          }
          onForfeit={(matchId, forfeitingId) =>
            setLocalRoom((prev) => forfeitLocalMatch(prev, matchId, forfeitingId))
          }
          onRematch={(oldMatch) =>
            setLocalRoom((prev) =>
              startLocalMatch(prev, {
                playerXId: oldMatch.playerOId,
                playerOId: oldMatch.playerXId,
                difficulty: oldMatch.difficulty,
              })
            )
          }
          onClaimTimeout={() => {}}
          onQuickMatch={(diff) =>
            setLocalRoom((prev) => startQuickLocalMatch(prev, diff))
          }
          onCancelQuickMatch={() => {}}
          onChallengePlayer={() => {}}
          onRespondChallenge={async () => null}
          onStartLocalPairMatch={(xId, oId, diff) =>
            setLocalRoom((prev) =>
              startLocalMatch(prev, {
                playerXId: xId,
                playerOId: oId,
                difficulty: diff,
              })
            )
          }
          onAddBot={(skill) =>
            setLocalRoom((prev) =>
              addLocalPlayer(prev, { isBot: true, botSkill: skill })
            )
          }
          onRemovePlayer={(id) =>
            setLocalRoom((prev) => removeLocalPlayer(prev, id))
          }
          onAddLocalPlayer={(opts) =>
            setLocalRoom((prev) => addLocalPlayer(prev, opts))
          }
          onUpdateSettings={(partial) =>
            setLocalRoom((prev) => updateLocalSettings(prev, partial))
          }
          onStartFinals={(opts) => {
            const next = startLocalFinals(localRoom, opts);
            setLocalRoom(next);
            return next?.activeMatchId || null;
          }}
          onNewSeason={(resetStats) =>
            setLocalRoom((prev) => startNewLocalSeason(prev, { resetStats }))
          }
        />
      ) : (
        <LandingHub
          profile={profile}
          onUpdateProfile={handleUpdateProfile}
          publicRooms={publicRooms}
          savedLocalTournament={savedLocal}
          onCreateOnline={handleCreateOnline}
          onJoinOnline={handleJoinOnline}
          onStartLocal={handleStartLocal}
          onResumeLocal={handleResumeLocal}
          onDiscardLocal={handleDiscardLocal}
          onOpenRules={() => setShowRules(true)}
          muted={muted}
          onToggleSound={handleToggleSound}
          busy={busy}
          error={error}
        />
      )}

      {showRules && <RulesModal onClose={() => setShowRules(false)} />}
    </>
  );
}
