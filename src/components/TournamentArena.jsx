import React, { useState, useEffect, useRef } from 'react';
import {
  Copy,
  Check,
  Share2,
  Crown,
  Settings,
  HelpCircle,
  Volume2,
  VolumeX,
  LogOut,
  Swords,
  Trophy,
  Users,
  Grid3X3,
  X,
} from 'lucide-react';
import MatchStage from './MatchStage.jsx';
import LeaderboardPanel from './LeaderboardPanel.jsx';
import PlayersAndMatchesPanel from './PlayersAndMatchesPanel.jsx';
import FinalsBracket from './FinalsBracket.jsx';
import { chooseBotMove } from '../engine/botAI.js';
import {
  playMoveSound,
  playMiniCaptureSound,
  playMiniResetSound,
  playVictorySound,
  playDrawSound,
  playChallengePing,
} from '../services/soundEffects.js';

export default function TournamentArena({
  room,
  myPlayerId,
  activeMatchId,
  onSelectMatch,
  onLeave,
  onOpenRules,
  muted,
  onToggleSound,
  onMove,
  onForfeit,
  onRematch,
  onClaimTimeout,
  onQuickMatch,
  onCancelQuickMatch,
  onChallengePlayer,
  onRespondChallenge,
  onStartLocalPairMatch,
  onAddBot,
  onRemovePlayer,
  onAddLocalPlayer,
  onUpdateSettings,
  onStartFinals,
  onNewSeason,
}) {
  const isLocal = room.mode === 'local';
  const isHost = isLocal || room.hostId === myPlayerId;
  const playersList = Object.values(room.players || {});

  const [mobileTab, setMobileTab] = useState('arena');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showFinalsModal, setShowFinalsModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const [finalsSize, setFinalsSize] = useState(playersList.length >= 4 ? 4 : 2);
  const [finalsDiffModal, setFinalsDiffModal] = useState(
    room.settings?.finalsDifficulty || 'expert'
  );

  // Local state for Settings Modal
  const [editLeagueDiff, setEditLeagueDiff] = useState(
    room.settings?.leagueDifficulty || 'selectable'
  );
  const [editFinalsDiff, setEditFinalsDiff] = useState(
    room.settings?.finalsDifficulty || 'expert'
  );
  const [editTimer, setEditTimer] = useState(room.settings?.turnTimerSec || 0);
  const [editPublic, setEditPublic] = useState(Boolean(room.settings?.isPublic));

  const activeMatch = activeMatchId ? room.matches?.[activeMatchId] || null : null;

  // Track incoming challenges for audio ping
  const seenChallengesRef = useRef(new Set());
  const pendingChallengesForMe = Object.values(room.challenges || {}).filter(
    (c) => c.toId === myPlayerId && c.status === 'pending'
  );

  useEffect(() => {
    for (const c of pendingChallengesForMe) {
      if (!seenChallengesRef.current.has(c.id)) {
        seenChallengesRef.current.add(c.id);
        playChallengePing();
      }
    }
  }, [pendingChallengesForMe]);

  // Auto-open newly created active match involving me in Online mode
  const knownMatchesRef = useRef(new Set());
  const initializedRef = useRef(false);

  useEffect(() => {
    if (isLocal) return;
    const allMatches = Object.values(room.matches || {});
    if (!initializedRef.current) {
      initializedRef.current = true;
      allMatches.forEach((m) => knownMatchesRef.current.add(m.id));
      return;
    }

    for (const m of allMatches) {
      if (knownMatchesRef.current.has(m.id)) continue;
      knownMatchesRef.current.add(m.id);
      const involvesMe = m.playerXId === myPlayerId || m.playerOId === myPlayerId;
      if (m.status === 'active' && involvesMe) {
        const current = activeMatchId ? room.matches?.[activeMatchId] : null;
        if (!current || current.status !== 'active') {
          onSelectMatch(m.id);
          setMobileTab('arena');
        }
        break;
      }
    }
  }, [isLocal, room.matches, myPlayerId, activeMatchId, onSelectMatch]);

  // Audio feedback for currently viewed match
  const audioPrevRef = useRef(null);
  useEffect(() => {
    if (!activeMatch) {
      audioPrevRef.current = null;
      return;
    }
    const g = activeMatch.game;
    const macroClaimed = g.macroBoard ? g.macroBoard.filter(Boolean).length : 0;
    const totalResets = g.resetCounts
      ? g.resetCounts.reduce((acc, n) => acc + (Number(n) || 0), 0)
      : 0;
    const snap = {
      id: activeMatch.id,
      status: activeMatch.status,
      moveCount: g.moveCount || 0,
      macroClaimed,
      totalResets,
    };

    const prev = audioPrevRef.current;
    audioPrevRef.current = snap;
    if (!prev || prev.id !== snap.id) return;

    if (snap.status === 'completed' && prev.status === 'active') {
      if (activeMatch.isDraw) playDrawSound();
      else playVictorySound();
      return;
    }
    if (snap.totalResets > prev.totalResets) {
      playMiniResetSound();
    } else if (snap.macroClaimed > prev.macroClaimed) {
      playMiniCaptureSound();
    } else if (snap.moveCount > prev.moveCount) {
      playMoveSound(g.lastMove?.symbol || 'X');
    }
  }, [activeMatch]);

  // Automated AI Bot move execution
  const botTurnLockRef = useRef(new Set());
  useEffect(() => {
    const candidates = isLocal
      ? activeMatch
        ? [activeMatch]
        : []
      : Object.values(room.matches || {}).filter((m) => m.status === 'active');

    const timers = [];
    for (const m of candidates) {
      if (m.status !== 'active') continue;
      const g = m.game;
      const turnPlayerId = g.turn === 'X' ? m.playerXId : m.playerOId;
      const turnPlayer = room.players?.[turnPlayerId];
      if (!turnPlayer?.isBot) continue;

      if (!isLocal) {
        const otherPlayerId = g.turn === 'X' ? m.playerOId : m.playerXId;
        const otherPlayer = room.players?.[otherPlayerId];
        const iShouldDrive =
          otherPlayerId === myPlayerId || (otherPlayer?.isBot && isHost);
        if (!iShouldDrive) continue;
      }

      const lockKey = `${m.id}:${g.moveCount}`;
      if (botTurnLockRef.current.has(lockKey)) continue;

      const t = setTimeout(() => {
        if (botTurnLockRef.current.has(lockKey)) return;
        botTurnLockRef.current.add(lockKey);
        const move = chooseBotMove(g, g.turn, turnPlayer.botSkill || 'smart');
        if (move) {
          onMove(m.id, move, turnPlayerId);
        }
      }, 520);
      timers.push(t);
    }

    return () => timers.forEach(clearTimeout);
  }, [isLocal, activeMatch, room.matches, room.players, myPlayerId, isHost, onMove]);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(room.code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 1800);
    } catch {
      // ignore clipboard error
    }
  };

  const handleCopyInvite = async () => {
    try {
      const origin =
        window.Capacitor?.isNativePlatform?.() || window.location.hostname === 'localhost'
          ? 'https://ttt-arena-quantum.web.app'
          : window.location.origin;
      const url = `${origin}/?room=${room.code}`;
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 1800);
    } catch {
      // ignore clipboard error
    }
  };

  const openMatchAndFocus = (matchId) => {
    onSelectMatch(matchId);
    setMobileTab('arena');
  };

  const finalsCutoff = room.finals?.size || (playersList.length >= 4 ? 4 : 2);
  const myActiveMatches = Object.values(room.matches || {}).filter(
    (m) =>
      m.status === 'active' &&
      (isLocal || m.playerXId === myPlayerId || m.playerOId === myPlayerId)
  );

  return (
    <div className="app-shell">
      {/* Incoming Challenges (Online) */}
      {!isLocal && pendingChallengesForMe.length > 0 && (
        <div className="toast-stack">
          {pendingChallengesForMe.map((ch) => (
            <div key={ch.id} className="toast-card">
              <div style={{ fontWeight: 700, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '7px' }}>
                <Swords size={16} color="var(--x-color)" /> Match Challenge!
              </div>
              <div style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                <strong>{ch.fromName}</strong> challenges you to{' '}
                <strong style={{ color: ch.difficulty === 'expert' ? 'var(--gold)' : 'var(--x-color)' }}>
                  {ch.difficulty === 'expert' ? 'Expert 9×9' : 'Normal 3×3'}
                </strong>
                .
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  style={{ flex: 1 }}
                  onClick={async () => {
                    const matchId = await onRespondChallenge(ch.id, true);
                    if (matchId) openMatchAndFocus(matchId);
                  }}
                >
                  Accept &amp; Play
                </button>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => onRespondChallenge(ch.id, false)}
                >
                  Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Top Arena HUD */}
      <div className="panel arena-hud">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h2 className="font-display" style={{ fontSize: '1.2rem' }}>
                {room.name}
              </h2>
              <span className="badge badge-emerald">Season {room.season || 1}</span>
              {isLocal && <span className="badge badge-amber">Offline Pass &amp; Play</span>}
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
              <span className="badge">
                League:{' '}
                {room.settings?.leagueDifficulty === 'selectable'
                  ? 'Selectable (3×3 / 9×9)'
                  : room.settings?.leagueDifficulty === 'expert'
                    ? 'All Expert 9×9'
                    : 'All Normal 3×3'}
              </span>
              <span className="badge badge-gold">
                Finals: {room.settings?.finalsDifficulty === 'normal' ? 'Normal 3×3' : 'Expert 9×9'}
              </span>
              {room.settings?.turnTimerSec > 0 && (
                <span className="badge badge-x">Timer: {room.settings.turnTimerSec}s</span>
              )}
            </div>
          </div>

          {!isLocal && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="room-code-pill"
                onClick={handleCopyCode}
                title="Copy Room Code"
              >
                <span>{room.code}</span>
                {copiedCode ? <Check size={14} /> : <Copy size={14} />}
              </button>
              <button
                type="button"
                className="btn btn-sm"
                onClick={handleCopyInvite}
              >
                {copiedLink ? <Check size={14} /> : <Share2 size={14} />}
                {copiedLink ? 'Invite Copied!' : 'Invite Link'}
              </button>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {isHost && room.status !== 'finals' && (
            <button
              type="button"
              className="btn btn-gold btn-sm"
              disabled={playersList.length < 2}
              onClick={() => {
                setFinalsSize(playersList.length >= 4 ? 4 : 2);
                setFinalsDiffModal(room.settings?.finalsDifficulty || 'expert');
                setShowFinalsModal(true);
              }}
            >
              <Crown size={15} /> Start Finals
            </button>
          )}

          {isHost && (
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => {
                setEditLeagueDiff(room.settings?.leagueDifficulty || 'selectable');
                setEditFinalsDiff(room.settings?.finalsDifficulty || 'expert');
                setEditTimer(room.settings?.turnTimerSec || 0);
                setEditPublic(Boolean(room.settings?.isPublic));
                setShowSettingsModal(true);
              }}
              aria-label="Room Settings"
            >
              <Settings size={15} /> Settings
            </button>
          )}

          <button type="button" className="btn btn-sm" onClick={onOpenRules} aria-label="Rules">
            <HelpCircle size={15} /> Rules
          </button>

          <button
            type="button"
            className="btn btn-sm"
            onClick={onToggleSound}
            aria-label={muted ? 'Unmute Sound' : 'Mute Sound'}
          >
            {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>

          <button type="button" className="btn btn-sm btn-danger" onClick={onLeave}>
            <LogOut size={15} /> Leave
          </button>
        </div>
      </div>

      {/* Main Responsive Content */}
      <div className="arena-grid">
        {/* Left Stage (Active Match or Arena Center) */}
        <div className={mobileTab === 'arena' ? '' : 'desktop-hidden-mobile'}>
          {activeMatch ? (
            <MatchStage
              match={activeMatch}
              room={room}
              myPlayerId={myPlayerId}
              onMove={(mId, move) => onMove(mId, move)}
              onForfeit={onForfeit}
              onBack={() => onSelectMatch(null)}
              onRematch={onRematch}
              onOpenMatch={openMatchAndFocus}
              onClaimTimeout={onClaimTimeout}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <FinalsBracket
                finals={room.finals}
                players={room.players}
                matches={room.matches}
                myPlayerId={myPlayerId}
                isHost={isHost}
                isLocal={isLocal}
                onOpenMatch={openMatchAndFocus}
                onNewSeason={onNewSeason}
              />

              <div className="panel">
                <div className="panel-body" style={{ display: 'grid', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <h3 className="font-display" style={{ fontSize: '1.1rem' }}>
                        Ready for Battle
                      </h3>
                      <p style={{ margin: '4px 0 0', fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
                        {isLocal
                          ? 'Open Matchmaking (Players tab on mobile, or right panel on desktop) to start a random or custom pair match.'
                          : 'Hit Quick Match or Challenge any player in Matchmaking. Share the Room Code to bring more friends in!'}
                      </p>
                    </div>
                  </div>

                  {myActiveMatches.length > 0 && (
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {myActiveMatches.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => openMatchAndFocus(m.id)}
                        >
                          <Swords size={14} /> Resume:{' '}
                          {room.players?.[m.playerXId]?.name} vs{' '}
                          {room.players?.[m.playerOId]?.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar (Standings + Players/Matchmaking + Bracket on mobile tabs) */}
        <div className="arena-sidebar">
          <div className={mobileTab === 'standings' ? '' : 'desktop-hidden-mobile'}>
            <LeaderboardPanel
              players={room.players}
              myPlayerId={myPlayerId}
              hostId={room.hostId}
              championId={room.championId}
              finalsCutoff={finalsCutoff}
            />
          </div>

          <div className={mobileTab === 'players' ? '' : 'desktop-hidden-mobile'}>
            <PlayersAndMatchesPanel
              room={room}
              myPlayerId={myPlayerId}
              isHost={isHost}
              onQuickMatch={async (diff) => {
                const res = await onQuickMatch(diff);
                if (isLocal || res?.matched) setMobileTab('arena');
              }}
              onCancelQuickMatch={onCancelQuickMatch}
              onChallengePlayer={async (targetPlayer, diff) => {
                const res = await onChallengePlayer(targetPlayer, diff);
                if (res?.immediate) setMobileTab('arena');
              }}
              onStartLocalPairMatch={(xId, oId, diff) => {
                onStartLocalPairMatch(xId, oId, diff);
                setMobileTab('arena');
              }}
              onAddBot={onAddBot}
              onRemovePlayer={onRemovePlayer}
              onAddLocalPlayer={onAddLocalPlayer}
              onOpenMatch={openMatchAndFocus}
            />
          </div>

          {/* Mobile-only Finals Tab */}
          {mobileTab === 'finals' && (
            <div style={{ display: 'grid', gap: '14px' }}>
              <FinalsBracket
                finals={room.finals}
                players={room.players}
                matches={room.matches}
                myPlayerId={myPlayerId}
                isHost={isHost}
                isLocal={isLocal}
                onOpenMatch={openMatchAndFocus}
                onNewSeason={onNewSeason}
              />
              {isHost && room.status !== 'finals' && (
                <button
                  type="button"
                  className="btn btn-gold"
                  disabled={playersList.length < 2}
                  onClick={() => {
                    setFinalsSize(playersList.length >= 4 ? 4 : 2);
                    setFinalsDiffModal(room.settings?.finalsDifficulty || 'expert');
                    setShowFinalsModal(true);
                  }}
                >
                  <Crown size={16} /> Start Championship Finals
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Bottom Tabbar */}
      <nav className="mobile-tabbar" aria-label="Tournament sections">
        <button
          type="button"
          className={`mobile-tab-btn ${mobileTab === 'arena' ? 'active' : ''}`}
          onClick={() => setMobileTab('arena')}
        >
          <Grid3X3 size={18} />
          <span>Arena</span>
        </button>
        <button
          type="button"
          className={`mobile-tab-btn ${mobileTab === 'players' ? 'active' : ''}`}
          onClick={() => setMobileTab('players')}
        >
          <Users size={18} />
          <span>Players</span>
        </button>
        <button
          type="button"
          className={`mobile-tab-btn ${mobileTab === 'standings' ? 'active' : ''}`}
          onClick={() => setMobileTab('standings')}
        >
          <Trophy size={18} />
          <span>Standings</span>
        </button>
        <button
          type="button"
          className={`mobile-tab-btn ${mobileTab === 'finals' ? 'active' : ''}`}
          onClick={() => setMobileTab('finals')}
        >
          <Crown size={18} />
          <span>Finals</span>
        </button>
      </nav>

      {/* Start Championship Finals Modal */}
      {showFinalsModal && (
        <div
          className="modal-backdrop"
          onClick={() => setShowFinalsModal(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Start Championship Finals"
        >
          <div className="panel modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="panel-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Crown size={19} color="var(--gold)" />
                <h2 className="font-display" style={{ fontSize: '1.2rem' }}>
                  Launch Championship Finals
                </h2>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={() => setShowFinalsModal(false)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="panel-body" style={{ display: 'grid', gap: '16px' }}>
              <div>
                <span className="field-label">Bracket Size</span>
                <div className="seg-group" style={{ gridTemplateColumns: '1fr 1fr' }}>
                  <button
                    type="button"
                    className={`seg-btn ${finalsSize === 2 ? 'active gold' : ''}`}
                    onClick={() => setFinalsSize(2)}
                  >
                    Top 2 (Grand Final)
                  </button>
                  <button
                    type="button"
                    className={`seg-btn ${finalsSize === 4 ? 'active gold' : ''}`}
                    disabled={playersList.length < 4}
                    onClick={() => setFinalsSize(4)}
                  >
                    Top 4 (Semis + Final)
                  </button>
                </div>
                {playersList.length < 4 && (
                  <p style={{ margin: '6px 0 0', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                    Need at least 4 players (humans or bots) for Top 4 Semifinals.
                  </p>
                )}
              </div>

              <div>
                <span className="field-label">Championship Round Difficulty</span>
                <div className="seg-group" style={{ gridTemplateColumns: '1fr 1fr' }}>
                  <button
                    type="button"
                    className={`seg-btn ${finalsDiffModal === 'expert' ? 'active gold' : ''}`}
                    onClick={() => setFinalsDiffModal('expert')}
                  >
                    Expert Nested 9×9
                  </button>
                  <button
                    type="button"
                    className={`seg-btn ${finalsDiffModal === 'normal' ? 'active cyan' : ''}`}
                    onClick={() => setFinalsDiffModal('normal')}
                  >
                    Normal 3×3
                  </button>
                </div>
              </div>

              <button
                type="button"
                className="btn btn-gold"
                onClick={async () => {
                  const firstMatchId = await onStartFinals({
                    size: finalsSize,
                    finalsDifficulty: finalsDiffModal,
                  });
                  setShowFinalsModal(false);
                  if (firstMatchId) openMatchAndFocus(firstMatchId);
                }}
              >
                <Crown size={16} /> Seed Top {finalsSize} &amp; Start Finals
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Room Settings Modal */}
      {showSettingsModal && (
        <div
          className="modal-backdrop"
          onClick={() => setShowSettingsModal(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Room Settings"
        >
          <div className="panel modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="panel-header">
              <h2 className="font-display" style={{ fontSize: '1.2rem' }}>
                Tournament Settings
              </h2>
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={() => setShowSettingsModal(false)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="panel-body" style={{ display: 'grid', gap: '15px' }}>
              <div>
                <span className="field-label">League Match Difficulty</span>
                <div className="seg-group" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                  <button
                    type="button"
                    className={`seg-btn ${editLeagueDiff === 'selectable' ? 'active cyan' : ''}`}
                    onClick={() => setEditLeagueDiff('selectable')}
                  >
                    Selectable
                  </button>
                  <button
                    type="button"
                    className={`seg-btn ${editLeagueDiff === 'normal' ? 'active cyan' : ''}`}
                    onClick={() => setEditLeagueDiff('normal')}
                  >
                    All Normal
                  </button>
                  <button
                    type="button"
                    className={`seg-btn ${editLeagueDiff === 'expert' ? 'active gold' : ''}`}
                    onClick={() => setEditLeagueDiff('expert')}
                  >
                    All Expert
                  </button>
                </div>
              </div>

              <div>
                <span className="field-label">Default Championship Finals Difficulty</span>
                <div className="seg-group" style={{ gridTemplateColumns: '1fr 1fr' }}>
                  <button
                    type="button"
                    className={`seg-btn ${editFinalsDiff === 'expert' ? 'active gold' : ''}`}
                    onClick={() => setEditFinalsDiff('expert')}
                  >
                    Expert Nested 9×9
                  </button>
                  <button
                    type="button"
                    className={`seg-btn ${editFinalsDiff === 'normal' ? 'active cyan' : ''}`}
                    onClick={() => setEditFinalsDiff('normal')}
                  >
                    Normal 3×3
                  </button>
                </div>
              </div>

              {!isLocal && (
                <>
                  <div>
                    <span className="field-label">Turn Timer</span>
                    <div className="seg-group" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                      {[0, 15, 30, 60].map((sec) => (
                        <button
                          key={sec}
                          type="button"
                          className={`seg-btn ${editTimer === sec ? 'active cyan' : ''}`}
                          onClick={() => setEditTimer(sec)}
                        >
                          {sec === 0 ? 'Off' : `${sec}s`}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="field-label">Room Visibility</span>
                    <div className="seg-group" style={{ gridTemplateColumns: '1fr 1fr' }}>
                      <button
                        type="button"
                        className={`seg-btn ${editPublic ? 'active cyan' : ''}`}
                        onClick={() => setEditPublic(true)}
                      >
                        Public Lobby
                      </button>
                      <button
                        type="button"
                        className={`seg-btn ${!editPublic ? 'active cyan' : ''}`}
                        onClick={() => setEditPublic(false)}
                      >
                        Private Code Only
                      </button>
                    </div>
                  </div>
                </>
              )}

              <button
                type="button"
                className="btn btn-primary"
                onClick={async () => {
                  await onUpdateSettings({
                    leagueDifficulty: editLeagueDiff,
                    finalsDifficulty: editFinalsDiff,
                    turnTimerSec: isLocal ? 0 : editTimer,
                    isPublic: isLocal ? false : editPublic,
                  });
                  setShowSettingsModal(false);
                }}
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
