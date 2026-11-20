import React, { useState } from 'react';
import {
  Swords,
  Zap,
  Bot,
  Eye,
  UserPlus,
  Trash2,
  XCircle,
} from 'lucide-react';
import {
  AVATAR_COLORS,
  getAllowedMatchDifficulties,
} from '../engine/tournamentLogic.js';

export default function PlayersAndMatchesPanel({
  room,
  myPlayerId,
  isHost,
  onQuickMatch,
  onCancelQuickMatch,
  onChallengePlayer,
  onStartLocalPairMatch,
  onAddBot,
  onRemovePlayer,
  onAddLocalPlayer,
  onOpenMatch,
}) {
  const isLocal = room.mode === 'local';
  const players = Object.values(room.players || {}).sort(
    (a, b) => (a.joinedAt || 0) - (b.joinedAt || 0)
  );
  const me = room.players?.[myPlayerId];
  const allowedDiffs = getAllowedMatchDifficulties(room.settings);

  const [selectedDiff, setSelectedDiff] = useState(allowedDiffs[0]);
  const effectiveDiff = allowedDiffs.includes(selectedDiff) ? selectedDiff : allowedDiffs[0];

  // Local manual pairing state
  const [pairX, setPairX] = useState(players[0]?.id || '');
  const [pairO, setPairO] = useState(players[1]?.id || '');
  const [newHumanName, setNewHumanName] = useState('');
  const [botSkill, setBotSkill] = useState('smart');

  const activeMatches = Object.values(room.matches || {})
    .filter((m) => m.status === 'active')
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  const recentHistory = (room.history || []).slice(0, 6);
  const isQueued = me?.queueStatus === 'queued';
  const canAddMore = players.length < 16;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {/* Matchmaking / Quick Launch */}
      <div className="panel">
        <div className="panel-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap size={18} color="var(--x-color)" />
            <h3 className="font-display" style={{ fontSize: '1.05rem' }}>
              Matchmaking
            </h3>
          </div>
          <span className="badge">
            {room.status === 'finals' ? 'Finals Active' : 'Endless League'}
          </span>
        </div>

        <div className="panel-body" style={{ display: 'grid', gap: '12px' }}>
          <div>
            <span className="field-label">Match Difficulty</span>
            {allowedDiffs.length === 2 ? (
              <div className="seg-group" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <button
                  type="button"
                  className={`seg-btn ${effectiveDiff === 'normal' ? 'active cyan' : ''}`}
                  onClick={() => setSelectedDiff('normal')}
                >
                  Normal 3×3
                </button>
                <button
                  type="button"
                  className={`seg-btn ${effectiveDiff === 'expert' ? 'active gold' : ''}`}
                  onClick={() => setSelectedDiff('expert')}
                >
                  Expert 9×9
                </button>
              </div>
            ) : (
              <div className="badge badge-gold">
                Room Locked: {allowedDiffs[0] === 'expert' ? 'Expert 9×9' : 'Normal 3×3'}
              </div>
            )}
          </div>

          {!isLocal ? (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {isQueued ? (
                <button
                  type="button"
                  className="btn btn-danger"
                  style={{ flex: 1 }}
                  onClick={onCancelQuickMatch}
                >
                  <XCircle size={16} /> Cancel Queue ({me?.queueDifficulty})
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  disabled={players.filter((p) => !p.isBot && p.online).length < 2}
                  onClick={() => onQuickMatch(effectiveDiff)}
                >
                  <Zap size={16} /> Quick Match ({effectiveDiff})
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-primary"
                disabled={players.length < 2}
                onClick={() => onQuickMatch(effectiveDiff)}
              >
                <Zap size={16} /> Random Pair Match ({effectiveDiff})
              </button>

              {players.length >= 2 && (
                <div style={{ display: 'grid', gap: '8px', padding: '10px', borderRadius: '10px', background: 'rgba(7,11,20,0.5)', border: '1px solid var(--border-subtle)' }}>
                  <span className="field-label" style={{ marginBottom: 0 }}>
                    Or Pick Matchup
                  </span>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '6px', alignItems: 'center' }}>
                    <select
                      className="select"
                      value={players.some((p) => p.id === pairX) ? pairX : players[0]?.id}
                      onChange={(e) => setPairX(e.target.value)}
                    >
                      {players.map((p) => (
                        <option key={p.id} value={p.id}>
                          X: {p.name}
                        </option>
                      ))}
                    </select>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}>VS</span>
                    <select
                      className="select"
                      value={players.some((p) => p.id === pairO) ? pairO : players[1]?.id}
                      onChange={(e) => setPairO(e.target.value)}
                    >
                      {players.map((p) => (
                        <option key={p.id} value={p.id}>
                          O: {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm"
                    disabled={
                      (players.some((p) => p.id === pairX) ? pairX : players[0]?.id) ===
                      (players.some((p) => p.id === pairO) ? pairO : players[1]?.id)
                    }
                    onClick={() => {
                      const xId = players.some((p) => p.id === pairX) ? pairX : players[0]?.id;
                      const oId = players.some((p) => p.id === pairO) ? pairO : players[1]?.id;
                      onStartLocalPairMatch(xId, oId, effectiveDiff);
                    }}
                  >
                    <Swords size={14} /> Launch Custom Match
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Players Roster */}
      <div className="panel">
        <div className="panel-header">
          <h3 className="font-display" style={{ fontSize: '1.05rem' }}>
            Players ({players.length}/16)
          </h3>
          {(isHost || isLocal) && canAddMore && (
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <select
                className="select"
                value={botSkill}
                onChange={(e) => setBotSkill(e.target.value)}
                style={{ width: 'auto', padding: '5px 8px', fontSize: '0.76rem' }}
                aria-label="Bot skill level"
              >
                <option value="smart">Smart Bot</option>
                <option value="casual">Casual Bot</option>
              </select>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => onAddBot(botSkill)}
              >
                <Bot size={14} /> +Bot
              </button>
            </div>
          )}
        </div>

        <div className="panel-body" style={{ display: 'grid', gap: '8px' }}>
          {isLocal && canAddMore && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newHumanName.trim()) return;
                onAddLocalPlayer({
                  name: newHumanName.trim(),
                  color: AVATAR_COLORS[players.length % AVATAR_COLORS.length],
                });
                setNewHumanName('');
              }}
              style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}
            >
              <input
                type="text"
                className="input"
                placeholder="Add local player name..."
                value={newHumanName}
                maxLength={18}
                onChange={(e) => setNewHumanName(e.target.value)}
              />
              <button type="submit" className="btn btn-sm btn-primary" disabled={!newHumanName.trim()}>
                <UserPlus size={14} /> Add
              </button>
            </form>
          )}

          {players.map((p) => {
            const isMe = p.id === myPlayerId;
            return (
              <div
                key={p.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                  padding: '8px 10px',
                  borderRadius: '11px',
                  background: 'rgba(7, 11, 20, 0.52)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '9px', minWidth: 0 }}>
                  <div className="avatar avatar-sm" style={{ backgroundColor: p.color }}>
                    {p.isBot ? <Bot size={14} /> : p.name.slice(0, 1).toUpperCase()}
                    {!p.isBot && <span className={`presence-dot ${p.online ? '' : 'offline'}`} />}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.name}
                      </span>
                      {isMe && <span className="badge badge-x" style={{ padding: '1px 6px', fontSize: '0.62rem' }}>YOU</span>}
                      {p.isBot && (
                        <span className="badge" style={{ padding: '1px 6px', fontSize: '0.62rem' }}>
                          {p.botSkill || 'smart'} AI
                        </span>
                      )}
                      {p.queueStatus === 'queued' && (
                        <span className="badge badge-emerald" style={{ padding: '1px 6px', fontSize: '0.62rem' }}>
                          Queued
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>
                      {p.wins}W · {p.draws}D · {p.losses}L
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  {!isLocal && !isMe && (p.isBot || p.online) && (
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => onChallengePlayer(p, effectiveDiff)}
                    >
                      <Swords size={13} /> {p.isBot ? 'Play' : 'Challenge'}
                    </button>
                  )}

                  {(isHost || isLocal) && (p.isBot || (isLocal && players.length > 2)) && (
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost"
                      onClick={() => onRemovePlayer(p.id)}
                      aria-label={`Remove ${p.name}`}
                    >
                      <Trash2 size={14} color="#ff8fa3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Live & Recent Matches */}
      <div className="panel">
        <div className="panel-header">
          <h3 className="font-display" style={{ fontSize: '1.05rem' }}>
            Live &amp; Recent Matches
          </h3>
          <span className="badge badge-emerald">{activeMatches.length} Live</span>
        </div>

        <div className="panel-body" style={{ display: 'grid', gap: '8px' }}>
          {activeMatches.length === 0 && recentHistory.length === 0 && (
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              No matches played yet. Challenge someone or start Quick Match!
            </p>
          )}

          {activeMatches.map((m) => {
            const pX = room.players?.[m.playerXId];
            const pO = room.players?.[m.playerOId];
            const involvesMe = isLocal || m.playerXId === myPlayerId || m.playerOId === myPlayerId;
            return (
              <div
                key={m.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                  padding: '9px 11px',
                  borderRadius: '11px',
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.86rem' }}>
                    <span style={{ color: 'var(--x-color)' }}>{pX?.name || 'X'}</span>
                    {' vs '}
                    <span style={{ color: 'var(--o-color)' }}>{pO?.name || 'O'}</span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'flex', gap: '6px', marginTop: '2px' }}>
                    <span>{m.difficulty === 'expert' ? 'Expert 9×9' : 'Normal 3×3'}</span>
                    {m.stage !== 'league' && <span>· {m.stage.toUpperCase()}</span>}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => onOpenMatch(m.id)}
                >
                  <Eye size={13} /> {involvesMe ? 'Open' : 'Spectate'}
                </button>
              </div>
            );
          })}

          {recentHistory.map((h) => {
            const pX = room.players?.[h.playerXId];
            const pO = room.players?.[h.playerOId];
            const winner = h.winnerId ? room.players?.[h.winnerId] : null;
            return (
              <div
                key={h.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  padding: '7px 10px',
                  borderRadius: '9px',
                  background: 'rgba(7, 11, 20, 0.45)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '0.8rem',
                }}
              >
                <span style={{ color: 'var(--text-secondary)' }}>
                  {pX?.name || 'X'} vs {pO?.name || 'O'}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="badge" style={{ padding: '1px 6px', fontSize: '0.65rem' }}>
                    {h.difficulty === 'expert' ? '9×9' : '3×3'}
                  </span>
                  <strong style={{ color: h.isDraw ? 'var(--amber)' : 'var(--emerald)' }}>
                    {h.isDraw ? 'Draw' : `${winner?.name || 'Winner'} won`}
                  </strong>
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
