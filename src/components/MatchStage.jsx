import React, { useState, useEffect, useRef } from 'react';
import {
  Flag,
  ArrowLeft,
  Clock,
  Bot,
  Eye,
  Swords,
  Crown,
  Flame,
  RotateCcw,
} from 'lucide-react';
import NormalBoard from './NormalBoard.jsx';
import ExpertBoard from './ExpertBoard.jsx';

export default function MatchStage({
  match,
  room,
  myPlayerId,
  onMove,
  onForfeit,
  onBack,
  onRematch,
  onOpenMatch,
  onClaimTimeout,
}) {
  const [secondsLeft, setSecondsLeft] = useState(null);
  const timeoutClaimedRef = useRef('');

  const pX = room.players?.[match.playerXId];
  const pO = room.players?.[match.playerOId];
  const game = match.game;
  const isLocal = room.mode === 'local';
  const currentTurnPlayerId = game.turn === 'X' ? match.playerXId : match.playerOId;
  const currentTurnPlayer = room.players?.[currentTurnPlayerId];
  const isMyTurnOnline = !isLocal && currentTurnPlayerId === myPlayerId;
  const isParticipant =
    isLocal || myPlayerId === match.playerXId || myPlayerId === match.playerOId;

  const canPlay =
    match.status === 'active' &&
    !currentTurnPlayer?.isBot &&
    (isLocal || isMyTurnOnline);

  // Synced countdown timer for online timed rooms
  useEffect(() => {
    if (
      isLocal ||
      match.status !== 'active' ||
      !match.turnTimerSec ||
      !match.turnDeadline
    ) {
      setSecondsLeft(null);
      return;
    }

    const tick = () => {
      const remainingMs = match.turnDeadline - Date.now();
      const secs = Math.max(0, Math.ceil(remainingMs / 1000));
      setSecondsLeft(secs);

      const claimKey = `${match.id}:${game.moveCount}:${match.turnDeadline}`;
      if (remainingMs <= -400 && timeoutClaimedRef.current !== claimKey) {
        timeoutClaimedRef.current = claimKey;
        onClaimTimeout(match.id);
      }
    };

    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [isLocal, match.id, match.status, match.turnTimerSec, match.turnDeadline, game.moveCount, onClaimTimeout]);

  const winnerPlayer = match.winnerId ? room.players?.[match.winnerId] : null;
  const finalsSlot = match.finalsSlotId ? room.finals?.slots?.[match.finalsSlotId] : null;
  const rematchMatchId =
    finalsSlot && finalsSlot.matchId && finalsSlot.matchId !== match.id
      ? finalsSlot.matchId
      : null;
  const nextGrandFinalId =
    match.finalsSlotId &&
    match.finalsSlotId !== 'final' &&
    room.finals?.slots?.final?.status === 'active' &&
    room.finals?.slots?.final?.matchId
      ? room.finals.slots.final.matchId
      : null;

  const timerPct =
    secondsLeft !== null && match.turnTimerSec > 0
      ? Math.max(0, Math.min(100, (secondsLeft / match.turnTimerSec) * 100))
      : 100;

  return (
    <div className="panel">
      <div className="panel-header" style={{ flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-sm btn-ghost" onClick={onBack}>
            <ArrowLeft size={15} /> Lobby
          </button>
          <span className={`badge ${match.difficulty === 'expert' ? 'badge-gold' : 'badge-x'}`}>
            {match.difficulty === 'expert' ? 'Expert 9×9' : 'Normal 3×3'}
          </span>
          {match.stage !== 'league' && (
            <span className="badge badge-gold">
              <Crown size={12} /> {match.stage === 'final' ? 'Grand Final' : 'Semifinal'}
            </span>
          )}
          {match.rematchCount > 0 && (
            <span className="badge badge-amber">
              <Flame size={12} /> Sudden Death #{match.rematchCount}
            </span>
          )}
          {!isParticipant && (
            <span className="badge badge-emerald">
              <Eye size={12} /> Spectating
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {secondsLeft !== null && match.status === 'active' && (
            <span className={`badge font-mono ${secondsLeft <= 5 ? 'badge-o' : 'badge-x'}`}>
              <Clock size={12} /> {secondsLeft}s
            </span>
          )}
          {match.status === 'active' && isParticipant && (
            <button
              type="button"
              className="btn btn-sm btn-danger"
              onClick={() =>
                onForfeit(match.id, isLocal ? currentTurnPlayerId : myPlayerId)
              }
            >
              <Flag size={13} /> Forfeit
            </button>
          )}
        </div>
      </div>

      <div className="panel-body">
        <div className="versus-bar">
          <div
            className={`versus-player ${
              match.status === 'active' && game.turn === 'X' ? 'active-turn-x' : ''
            }`}
          >
            <div className="avatar avatar-sm" style={{ backgroundColor: pX?.color || '#00F0FF' }}>
              {pX?.isBot ? <Bot size={14} /> : (pX?.name || 'X').slice(0, 1).toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {pX?.name || 'Player X'}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--x-color)', fontWeight: 700 }}>
                TEAM X {match.playerXId === myPlayerId && !isLocal ? '· YOU' : ''}
              </div>
            </div>
          </div>

          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            VS
          </div>

          <div
            className={`versus-player right ${
              match.status === 'active' && game.turn === 'O' ? 'active-turn-o' : ''
            }`}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {pO?.name || 'Player O'}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--o-color)', fontWeight: 700 }}>
                {match.playerOId === myPlayerId && !isLocal ? 'YOU · ' : ''}TEAM O
              </div>
            </div>
            <div className="avatar avatar-sm" style={{ backgroundColor: pO?.color || '#FF4D6D' }}>
              {pO?.isBot ? <Bot size={14} /> : (pO?.name || 'O').slice(0, 1).toUpperCase()}
            </div>
          </div>
        </div>

        {secondsLeft !== null && match.status === 'active' && (
          <div className="timer-track">
            <div
              className={`timer-fill ${secondsLeft <= 5 ? 'urgent' : ''}`}
              style={{ width: `${timerPct}%` }}
            />
          </div>
        )}

        {match.status === 'active' && (
          <div style={{ textAlign: 'center', marginBottom: '10px', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
            {currentTurnPlayer?.isBot ? (
              <span>
                <Bot size={14} style={{ verticalAlign: 'middle', marginRight: '5px' }} />
                {currentTurnPlayer.name} is thinking...
              </span>
            ) : isLocal ? (
              <span>
                Pass &amp; Play turn:{' '}
                <strong style={{ color: game.turn === 'X' ? 'var(--x-color)' : 'var(--o-color)' }}>
                  {currentTurnPlayer?.name} ({game.turn})
                </strong>
              </span>
            ) : isMyTurnOnline ? (
              <strong style={{ color: game.turn === 'X' ? 'var(--x-color)' : 'var(--o-color)' }}>
                Your turn ({game.turn}) — make your move!
              </strong>
            ) : (
              <span>Waiting for {currentTurnPlayer?.name || 'opponent'}...</span>
            )}
          </div>
        )}

        {match.status === 'completed' && (
          <div
            style={{
              padding: '14px 16px',
              marginBottom: '14px',
              borderRadius: '14px',
              background: match.isDraw
                ? 'rgba(245, 158, 11, 0.14)'
                : 'rgba(16, 185, 129, 0.14)',
              border: `1px solid ${
                match.isDraw ? 'rgba(245, 158, 11, 0.45)' : 'rgba(16, 185, 129, 0.45)'
              }`,
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <div>
              <div className="font-display" style={{ fontSize: '1.15rem', fontWeight: 800 }}>
                {match.isDraw
                  ? 'Match Drawn!'
                  : `${winnerPlayer?.name || 'Winner'} Wins!`}
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                {match.forfeitBy
                  ? `${room.players?.[match.forfeitBy]?.name || 'Opponent'} forfeited.`
                  : match.isDraw && match.finalsSlotId
                    ? 'Finals cannot end in a tie — Sudden-Death Rematch ready (sides swapped)!'
                    : match.isDraw
                      ? 'Both players earn +1 Draw.'
                      : `+1 ${match.difficulty === 'expert' ? 'Expert' : 'Normal'} Win recorded on the leaderboard.`}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {rematchMatchId && (
                <button
                  type="button"
                  className="btn btn-gold btn-sm"
                  onClick={() => onOpenMatch(rematchMatchId)}
                >
                  <Flame size={14} /> Play Sudden-Death Rematch
                </button>
              )}
              {nextGrandFinalId && (
                <button
                  type="button"
                  className="btn btn-gold btn-sm"
                  onClick={() => onOpenMatch(nextGrandFinalId)}
                >
                  <Crown size={14} /> Go to Grand Final
                </button>
              )}
              {!match.finalsSlotId && isParticipant && (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => onRematch(match)}
                >
                  <RotateCcw size={14} /> Rematch
                </button>
              )}
              <button type="button" className="btn btn-sm" onClick={onBack}>
                <Swords size={14} /> Back to Arena
              </button>
            </div>
          </div>
        )}

        {match.difficulty === 'expert' ? (
          <ExpertBoard
            game={game}
            canPlay={canPlay}
            onMove={(move) => onMove(match.id, move)}
          />
        ) : (
          <NormalBoard
            game={game}
            canPlay={canPlay}
            onMove={(move) => onMove(match.id, move)}
          />
        )}
      </div>
    </div>
  );
}
